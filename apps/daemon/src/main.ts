/**
 * Orchestrator 데몬 엔트리 (P01 T2). detached Node 프로세스로 실행된다(launcher 가 spawn).
 *   node --import tsx apps/daemon/src/main.ts --dir <stateDir> [--token-store file|keyring] [--port N] [--self-test]
 * 구성: SQLite 저널(`<stateDir>/journal.sqlite`) + Scheduler + DefaultPolicyBroker(PolicyGate 현재 정책) + ApprovalCoordinator(tick 5초)
 *     + PolicyGate(기본 프로젝트 `default`) + 격리 경고 등록(최초 1회) + RPC 서버 + 락 파일.
 * `--self-test`: 기동 → 락 기록 → 자기 접속(daemon.status) → 종료, exit 0 (CI 실행 계약).
 */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ApprovalCoordinator, DaemonClient, DefaultPolicyBroker, allWarnings, ensureToken, loadBundledWarnings, openSqliteStore, PolicyGate, registerIsolationWarnings, Scheduler, selectTokenStore, startRpcServer, type RpcServer } from "@agent-studio/core";

export const DEFAULT_PROJECT_ID = "default";

export interface DaemonOptions {
  stateDir: string;
  tokenStore: "file" | "keyring";
  port?: number;
  tickMs?: number;
}

export interface RunningDaemon {
  server: RpcServer;
  token: string;
  tokenRef: string;
  shutdown(): Promise<void>;
}

export async function startDaemon(o: DaemonOptions): Promise<RunningDaemon> {
  mkdirSync(o.stateDir, { recursive: true });
  const tokenStore = selectTokenStore({ AGENT_STUDIO_TOKEN_STORE: o.tokenStore }, { dir: o.stateDir });
  const token = ensureToken(tokenStore);
  const store = openSqliteStore(join(o.stateDir, "journal.sqlite"));
  const scheduler = new Scheduler(store);
  if (!store.read(1).some((e) => e.type === "ProjectRegistered" && e.projectId === DEFAULT_PROJECT_ID)) {
    store.append({ type: "ProjectRegistered", projectId: DEFAULT_PROJECT_ID, payload: { id: DEFAULT_PROJECT_ID, path: o.stateDir, name: DEFAULT_PROJECT_ID } });
  }
  if (allWarnings(store).length === 0) registerIsolationWarnings(store, loadBundledWarnings());
  const gate = new PolicyGate(store, DEFAULT_PROJECT_ID);
  gate.recover();
  // Broker 는 Gate 의 현재 정책을 매 판정마다 조회한다 — policy.set 변경이 승인 판정에 반영된다(리뷰B#2)
  const broker = new DefaultPolicyBroker(store, () => gate.policy());
  const coordinator = new ApprovalCoordinator(scheduler, broker, store);
  let shuttingDown: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    if (shuttingDown) return shuttingDown;
    shuttingDown = (async () => {
      clearInterval(tick);
      await server.close();
      store.close();
    })();
    return shuttingDown;
  };
  const server = await startRpcServer({ store, scheduler, broker, coordinator, gate, token, stateDir: o.stateDir, tokenRef: tokenStore.ref(), ...(o.port !== undefined && { port: o.port }), onShutdown: () => void shutdown() });
  const tick = setInterval(() => {
    try {
      scheduler.expireLeases();
      coordinator.tick();
    } catch {
      /* 다음 tick 에서 재시도 */
    }
  }, o.tickMs ?? 5_000);
  return { server, token, tokenRef: tokenStore.ref(), shutdown };
}

function parseArgs(argv: string[]): DaemonOptions & { selfTest: boolean } {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const stateDir = get("--dir");
  if (!stateDir) throw new Error("--dir <stateDir> required");
  const ts = get("--token-store") ?? process.env.AGENT_STUDIO_TOKEN_STORE ?? "keyring";
  if (ts !== "file" && ts !== "keyring") throw new Error(`--token-store must be file|keyring (got ${ts})`);
  const port = get("--port");
  return { stateDir: resolve(stateDir), tokenStore: ts, ...(port !== undefined && { port: Number(port) }), selfTest: argv.includes("--self-test") };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const d = await startDaemon(args);
  if (args.selfTest) {
    const client = await DaemonClient.connect({ stateDir: args.stateDir, token: d.token, onEvent: () => {} });
    const status = await client.call<Record<string, unknown>>("daemon.status");
    client.close();
    await d.shutdown();
    process.stdout.write(`${JSON.stringify({ selfTest: "ok", status })}\n`);
    process.exit(0);
  }
  process.stdout.write(`${JSON.stringify({ daemon: "listening", port: d.server.port, pid: process.pid, tokenRef: d.tokenRef })}\n`);
  const stop = () => {
    void d.shutdown().then(() => process.exit(0));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // daemon.shutdown RPC → onShutdown → shutdown() 완료 후 종료
  const origOnShutdown = d.shutdown;
  void origOnShutdown;
  const poll = setInterval(() => {
    /* server.close() 가 끝나면 이벤트 루프에 남는 핸들이 없어 자연 종료된다 */
  }, 60_000);
  poll.unref();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
    process.exit(1);
  });
}
