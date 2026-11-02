/**
 * launcher(Shell 역할, P01 T2): 락 파일 발견·검증(pid·startedAt·nonce) → 재접속 또는 detached spawn(S5 이식).
 * 데몬 엔트리는 `apps/daemon/src/main.ts`(`node --import tsx … --dir <stateDir> --token-store <mode>`).
 * 토큰은 데몬이 저장소에 만들고, launcher 는 접속 시 같은 저장소에서 읽는다(네트워크로 전송되지 않음).
 */
import { spawn } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FileTokenStore, KeyringTokenStore, type TokenStore } from "../token-store.js";
import { assessLock, classifyConnectError, probeProcess, readLock, removeLock, type LockAssessment, type LockFile } from "./lock.js";
import { DaemonClient } from "./rpc-client.js";

export interface DaemonHandle extends LockFile {
  assessment?: LockAssessment;
  spawned: boolean;
}
export interface LaunchOptions {
  tokenStore?: "file" | "keyring";
  /** 데몬 엔트리 .ts 경로(기본 apps/daemon/src/main.ts) */
  entry?: string;
  /** 데몬을 띄울 Node 실행 파일(기본 process.execPath). Electron Shell 은 ABI 가 다른 자기 런타임 대신 시스템 `node` 를 지정한다. */
  nodePath?: string;
  /** spawn cwd(기본 저장소 루트) — `--import tsx` 가 여기서 해석된다 */
  cwd?: string;
  /** 락의 pid 조회(기본 `probeProcess`). 조회가 throw 하면 접속으로 판정한다(최종리뷰I3) */
  probe?: (pid: number) => { pidAlive: boolean; processStartedAt: string | null };
}

/** 소스 트리 기준 기본값. 번들된 Shell 에서는 경로가 맞지 않으므로 Shell 은 entry·cwd 를 명시한다. */
const defaultEntry = (): string => fileURLToPath(new URL("../../../../apps/daemon/src/main.ts", import.meta.url));
const defaultRepoRoot = (): string => fileURLToPath(new URL("../../../../", import.meta.url));
const SPAWN_LOCK_STALE_MS = 60_000;

/**
 * Shell 설정 모드로 토큰 저장소를 고르고, 락의 `tokenRef` 가 그 저장소의 참조와 일치하는지 확인한다(리뷰B#6).
 * 락은 검증되지 않은 입력이므로 저장소 선택의 근거가 아니다 — 불일치는 throw(다른 모드로 띄운 데몬 또는 조작된 락).
 */
export function tokenStoreFor(stateDir: string, mode: "file" | "keyring", lock: Pick<LockFile, "tokenRef">): TokenStore {
  const store: TokenStore = mode === "file" ? new FileTokenStore(stateDir) : new KeyringTokenStore();
  if (lock.tokenRef !== store.ref()) throw new Error(`lock tokenRef ${lock.tokenRef} does not match configured ${mode} store ${store.ref()} — refusing to pick a token store from the lock`);
  return store;
}

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

async function waitForLock(stateDir: string, pid: number | null, timeoutMs: number): Promise<LockFile> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lock = readLock(stateDir);
    if (lock && (pid === null || lock.pid === pid)) return lock;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`daemon lock did not appear within ${timeoutMs}ms (pid ${pid})`);
}

/** detached spawn: 부모가 종료돼도 데몬은 남는다. 락 파일이 나타날 때까지 기다린 뒤 핸들 반환 */
export async function spawnDaemon(stateDir: string, opts: LaunchOptions = {}): Promise<DaemonHandle> {
  mkdirSync(stateDir, { recursive: true });
  if (!acquireSpawnLock(stateDir)) {
    const lock = await waitForLock(stateDir, null, 20_000); // 다른 launcher 가 띄우는 중 → 그쪽 데몬의 락을 기다렸다가 접속
    return { ...lock, spawned: false };
  }
  try {
    removeLock(stateDir);
    const args = ["--import", "tsx", opts.entry ?? defaultEntry(), "--dir", stateDir, "--token-store", opts.tokenStore ?? "keyring"];
    const child = spawn(opts.nodePath ?? process.execPath, args, { detached: true, stdio: "ignore", windowsHide: true, cwd: opts.cwd ?? defaultRepoRoot() });
    child.unref();
    const lock = await waitForLock(stateDir, child.pid ?? null, 20_000);
    return { ...lock, spawned: true };
  } finally {
    rmSync(join(stateDir, "spawn.lock"), { force: true });
  }
}

/**
 * Shell 의 ensureDaemon: 락 검증 → 재접속(live) / stale 정리 후 spawn / incompatible·unreachable·forged 는 락 보존 + 명시적 오류.
 * 프로세스 조회가 불가능하면(셸 없음 등) stale 로 오판하지 않고 접속으로 판정한다: 접속·nonce 일치 → live, 실패 → 락 보존 + 오류(최종리뷰I3).
 */
export async function ensureDaemon(stateDir: string, opts: LaunchOptions = {}): Promise<DaemonHandle> {
  const lock = readLock(stateDir);
  if (!lock) return spawnDaemon(stateDir, opts);
  let probe: { pidAlive: boolean; processStartedAt: string | null };
  let probeError: string | undefined;
  try {
    probe = (opts.probe ?? probeProcess)(lock.pid);
  } catch (e) {
    probeError = e instanceof Error ? e.message : String(e);
    probe = { pidAlive: true, processStartedAt: lock.startedAt }; // 조회 불가 — 접속 결과만으로 판정
  }
  let assessment = assessLock(lock, { ...probe, helloNonce: null });
  if (assessment.verdict === "connectable") {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const token = tokenStoreFor(stateDir, opts.tokenStore ?? "keyring", lock).get();
        if (!token) throw new Error("closed before welcome: 4001 token missing in token store");
        const c = await DaemonClient.connect({ stateDir, token, lock, onEvent: () => {} });
        assessment = assessLock(lock, { ...probe, helloNonce: c.welcome?.nonce ?? null });
        c.close();
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        if (classifyConnectError(e).kind !== "unreachable") break; // 일시 장애만 재시도
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (lastErr !== undefined) {
      const kind = classifyConnectError(lastErr);
      const prefix = probeError ? `cannot verify daemon (process list unavailable: ${probeError}); ` : "";
      throw new Error(`${prefix}daemon ${kind.kind}${kind.code ? ` (close ${kind.code})` : ""}: ${String(lastErr instanceof Error ? lastErr.message : lastErr)} — lock kept at ${join(stateDir, "daemon.lock")}`);
    }
  }
  if (probeError && assessment.verdict !== "live") throw new Error(`cannot verify daemon (process list unavailable: ${probeError}) — lock kept at ${join(stateDir, "daemon.lock")}`);
  if (assessment.verdict === "live") return { ...lock, assessment, spawned: false };
  removeLock(stateDir); // stale 락 정리(pid 없음·PID 재사용·nonce 불일치·잘못된 타임스탬프)
  const h = await spawnDaemon(stateDir, opts);
  return { ...h, assessment };
}
