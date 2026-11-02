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
}

const DEFAULT_ENTRY = fileURLToPath(new URL("../../../../apps/daemon/src/main.ts", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
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
    const args = ["--import", "tsx", opts.entry ?? DEFAULT_ENTRY, "--dir", stateDir, "--token-store", opts.tokenStore ?? "keyring"];
    const child = spawn(process.execPath, args, { detached: true, stdio: "ignore", windowsHide: true, cwd: REPO_ROOT });
    child.unref();
    const lock = await waitForLock(stateDir, child.pid ?? null, 20_000);
    return { ...lock, spawned: true };
  } finally {
    rmSync(join(stateDir, "spawn.lock"), { force: true });
  }
}

/** Shell 의 ensureDaemon: 락 검증 → 재접속(live) / stale 정리 후 spawn / incompatible·unreachable·forged 는 락 보존 + 명시적 오류 */
export async function ensureDaemon(stateDir: string, opts: LaunchOptions = {}): Promise<DaemonHandle> {
  const lock = readLock(stateDir);
  if (!lock) return spawnDaemon(stateDir, opts);
  const probe = probeProcess(lock.pid);
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
      throw new Error(`daemon ${kind.kind}${kind.code ? ` (close ${kind.code})` : ""}: ${String(lastErr instanceof Error ? lastErr.message : lastErr)} — lock kept at ${join(stateDir, "daemon.lock")}`);
    }
  }
  if (assessment.verdict === "live") return { ...lock, assessment, spawned: false };
  removeLock(stateDir); // stale 락 정리(pid 없음·PID 재사용·nonce 불일치·잘못된 타임스탬프)
  const h = await spawnDaemon(stateDir, opts);
  return { ...h, assessment };
}
