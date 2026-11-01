/**
 * S5 — launcher(Shell 역할): 락 파일 발견·검증(pid·startedAt·nonce) → 재접속 또는 detached spawn.
 * CLI: node --import tsx launcher.ts --dir <stateDir> --spawn-and-exit   (spawn 후 즉시 종료 — 앱 종료 시나리오)
 *      node --import tsx launcher.ts --dir <stateDir> --ensure           (ensureDaemon 후 핸들 출력)
 * Codex 리뷰 반영: HMAC 상호 인증(토큰 미전송, #1) · spawn 배타 락(동시 기동, #2) · 접속 오류 분류(incompatible/unreachable/forged는 기존 락 보존, #3) · 타임스탬프 검증(#8)
 */
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PROTOCOL_VERSION, proof, proofEquals } from "./protocol.js";

export { PROTOCOL_VERSION, proof } from "./protocol.js";

export interface LockFile {
  pid: number;
  startedAt: string;
  nonce: string;
  port: number;
  protocolVersion: number;
}
export type LockAssessment =
  | { verdict: "live" }
  | { verdict: "connectable" }
  | { verdict: "stale"; reason: "pid_gone" | "pid_reused" | "nonce_mismatch" | "bad_timestamp" };
export interface DaemonHandle {
  pid: number;
  startedAt: string;
  nonce: string;
  port: number;
  /** 토큰 참조(제품: 키링 항목 id; 스파이크: 토큰 파일 경로) */
  tokenRef: string;
  assessment?: LockAssessment;
  spawned: boolean;
}
export interface ProcessInfo {
  pid: number;
  ppid: number;
  startedAt: string;
  name: string;
}
export type ConnectErrorKind = { kind: "incompatible" | "unauthorized" | "forged" | "unreachable"; code: number | null };

const DAEMON = fileURLToPath(new URL("./daemon.ts", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
/** 같은 CIM 출처(CreationDate)를 데몬·launcher가 각각 조회하므로 정상이면 문자열이 같다. 2초는 직렬화·시계 반올림 여유이며, PID 재사용은 분 단위 이상 차이가 난다 */
const START_TOLERANCE_MS = 2_000;
const SPAWN_LOCK_STALE_MS = 60_000;

/** 순수 판정: 락 파일 vs OS 관찰(pid 생존·생성 시각)·hello nonce */
export function assessLock(lock: LockFile, probe: { pidAlive: boolean; processStartedAt: string | null; helloNonce: string | null }): LockAssessment {
  if (!probe.pidAlive) return { verdict: "stale", reason: "pid_gone" };
  const a = Date.parse(lock.startedAt);
  const b = probe.processStartedAt ? Date.parse(probe.processStartedAt) : NaN;
  if (Number.isNaN(a) || Number.isNaN(b)) return { verdict: "stale", reason: "bad_timestamp" };
  if (Math.abs(a - b) > START_TOLERANCE_MS) return { verdict: "stale", reason: "pid_reused" };
  if (probe.helloNonce === null) return { verdict: "connectable" };
  if (probe.helloNonce !== lock.nonce) return { verdict: "stale", reason: "nonce_mismatch" };
  return { verdict: "live" };
}

/** 접속 실패 분류(순수): 어느 경우에 기존 락을 보존해야 하는지 결정한다 */
export function classifyConnectError(err: unknown): ConnectErrorKind {
  const msg = String(err instanceof Error ? err.message : err);
  if (/server proof invalid|identity/i.test(msg)) return { kind: "forged", code: null };
  const m = /closed before welcome: (\d+)/.exec(msg);
  const code = m ? Number(m[1]) : null;
  if (code === 4003) return { kind: "incompatible", code };
  if (code === 4001) return { kind: "unauthorized", code };
  return { kind: "unreachable", code };
}

export function readLock(stateDir: string): LockFile | null {
  const p = join(stateDir, "daemon.lock");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as LockFile;
  } catch {
    return null;
  }
}

/** 프로세스 목록(pid, ppid, OS 생성 시각) — Windows CIM. 자손 0 단언·PID 재사용 감지의 관찰 출처 */
export function listProcesses(): ProcessInfo[] {
  if (process.platform !== "win32") throw new Error("listProcesses: win32 only in this spike");
  const out = execFileSync(
    "pwsh",
    ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | Select-Object @{n='pid';e={$_.ProcessId}},@{n='ppid';e={$_.ParentProcessId}},@{n='startedAt';e={if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')}else{''}}},@{n='name';e={$_.Name}} | ConvertTo-Json -Compress"],
    { encoding: "utf8", timeout: 30_000, maxBuffer: 16 * 1024 * 1024 },
  );
  return JSON.parse(out) as ProcessInfo[];
}

export function probeProcess(pid: number): { pidAlive: boolean; processStartedAt: string | null } {
  const p = listProcesses().find((x) => x.pid === pid);
  return { pidAlive: !!p, processStartedAt: p?.startedAt ?? null };
}

export interface DaemonClient {
  welcome: { seq: number; pid: number; nonce: string; protocolVersion: number };
  request<T = Record<string, unknown>>(msg: Record<string, unknown>): Promise<T>;
  events: number[];
  close(): void;
}

/** WS 접속 + HMAC 상호 인증. 서버 증명이 틀리면(위조 서버·다른 토큰) 클라이언트 증명을 보내지 않고 reject */
export function connectDaemon(stateDir: string, lock: LockFile, opts: { token?: string; protocolVersion?: number } = {}): Promise<DaemonClient> {
  const token = opts.token ?? readFileSync(join(stateDir, "token"), "utf8").trim();
  const protocolVersion = opts.protocolVersion ?? PROTOCOL_VERSION;
  const clientNonce = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${lock.port}/`);
    const pending = new Map<number, (v: unknown) => void>();
    let nextId = 1;
    let welcomed = false;
    let failed: Error | null = null;
    const events: number[] = [];
    const fail = (e: Error) => {
      failed = failed ?? e;
      try {
        ws.close();
      } catch {}
      reject(failed);
    };
    ws.onopen = () => ws.send(JSON.stringify({ type: "hello", clientNonce, protocolVersion }));
    ws.onerror = () => fail(new Error("ws error"));
    ws.onclose = (ev) => {
      if (!welcomed) fail(new Error(`closed before welcome: ${ev.code} ${ev.reason}`));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data)) as { type?: string; id?: number; seq?: number; serverNonce?: string; serverProof?: string; pid?: number; nonce?: string };
      if (msg.type === "challenge" && !welcomed) {
        const expected = proof(token, msg.serverNonce ?? "", clientNonce, "server");
        if (!proofEquals(msg.serverProof, expected) || msg.pid !== lock.pid || msg.nonce !== lock.nonce) return fail(new Error("server proof invalid (daemon identity could not be verified — forged lock or wrong token)"));
        ws.send(JSON.stringify({ type: "auth", clientProof: proof(token, msg.serverNonce ?? "", clientNonce, "client") }));
        return;
      }
      if (msg.type === "welcome" && !welcomed) {
        welcomed = true;
        resolve({
          welcome: msg as DaemonClient["welcome"],
          events,
          request<T>(body: Record<string, unknown>) {
            const id = nextId++;
            return new Promise<T>((res) => {
              pending.set(id, res as (v: unknown) => void);
              ws.send(JSON.stringify({ id, ...body }));
            });
          },
          close: () => ws.close(),
        });
        return;
      }
      if (msg.type === "event") events.push(msg.seq!);
      else if (msg.id !== undefined) pending.get(msg.id)?.(msg), pending.delete(msg.id);
    };
  });
}

/** spawn 배타 락(리뷰 #2): `spawn.lock`을 O_EXCL로 만든 쪽만 데몬을 띄운다. 오래된(60s) 것은 stale로 보고 치운다 */
function acquireSpawnLock(stateDir: string): boolean {
  const p = join(stateDir, "spawn.lock");
  try {
    if (existsSync(p) && Date.now() - statSync(p).mtimeMs > SPAWN_LOCK_STALE_MS) rmSync(p, { force: true });
    closeSync(openSync(p, "wx"));
    writeFileSync(p, String(process.pid));
    return true;
  } catch {
    return false;
  }
}

/** detached spawn: 부모가 종료돼도 데몬은 남는다. 락 파일이 나타날 때까지 기다린 뒤 핸들 반환 */
export async function spawnDaemon(stateDir: string): Promise<DaemonHandle> {
  mkdirSync(stateDir, { recursive: true });
  const tokenRef = join(stateDir, "token");
  if (!existsSync(tokenRef)) writeFileSync(tokenRef, randomBytes(24).toString("hex"));
  if (!acquireSpawnLock(stateDir)) {
    // 다른 launcher가 띄우는 중 → 그쪽 데몬의 락을 기다렸다가 접속
    const lock = await waitForLock(stateDir, null, 20_000);
    return { ...lock, tokenRef, spawned: false };
  }
  try {
    rmSync(join(stateDir, "daemon.lock"), { force: true });
    const child = spawn(process.execPath, ["--import", "tsx", DAEMON, "--dir", stateDir], { detached: true, stdio: "ignore", windowsHide: true, cwd: REPO_ROOT });
    child.unref();
    const lock = await waitForLock(stateDir, child.pid ?? null, 20_000);
    return { ...lock, tokenRef, spawned: true };
  } finally {
    rmSync(join(stateDir, "spawn.lock"), { force: true });
  }
}

async function waitForLock(stateDir: string, pid: number | null, timeoutMs: number): Promise<LockFile> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lock = readLock(stateDir);
    if (lock && (pid === null || lock.pid === pid)) return lock;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`daemon lock did not appear within ${timeoutMs}ms (pid ${pid})`);
}

/** Shell의 ensureDaemon: 락 검증 → 재접속(live) / stale 정리 후 spawn / incompatible·unreachable·forged는 락 보존 + 명시적 오류 */
export async function ensureDaemon(stateDir: string): Promise<DaemonHandle> {
  const lock = readLock(stateDir);
  if (!lock) return spawnDaemon(stateDir);
  const probe = probeProcess(lock.pid);
  let assessment = assessLock(lock, { ...probe, helloNonce: null });
  if (assessment.verdict === "connectable") {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const c = await connectDaemon(stateDir, lock);
        assessment = assessLock(lock, { ...probe, helloNonce: c.welcome.nonce });
        c.close();
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        const kind = classifyConnectError(e);
        if (kind.kind !== "unreachable") break; // 일시 장애만 재시도
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (lastErr !== undefined) {
      const kind = classifyConnectError(lastErr);
      // 살아 있는 pid·일치하는 시작 시각인데 접속·인증이 안 되면 기존 데몬을 보존하고 명시적으로 실패한다(리뷰 #3·#1)
      throw new Error(`daemon ${kind.kind}${kind.code ? ` (close ${kind.code})` : ""}: ${String(lastErr instanceof Error ? lastErr.message : lastErr)} — lock kept at ${join(stateDir, "daemon.lock")}`);
    }
  }
  if (assessment.verdict === "live") return { ...lock, tokenRef: join(stateDir, "token"), assessment, spawned: false };
  rmSync(join(stateDir, "daemon.lock"), { force: true }); // stale 락 정리(pid 없음·PID 재사용·nonce 불일치·잘못된 타임스탬프)
  const h = await spawnDaemon(stateDir);
  return { ...h, assessment };
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const dir = args[args.indexOf("--dir") + 1];
  if (!dir) throw new Error("--dir required");
  const run = args.includes("--spawn-and-exit") ? spawnDaemon(dir) : ensureDaemon(dir);
  run.then(
    (h) => {
      process.stdout.write(JSON.stringify(h) + "\n");
      process.exit(0); // 앱 종료 시나리오: 부모 즉시 종료
    },
    (e) => {
      process.stderr.write(String(e) + "\n");
      process.exit(2);
    },
  );
}
