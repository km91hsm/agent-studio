/**
 * 데몬 락 파일(`<stateDir>/daemon.lock`)과 순수 판정(S5 launcher 순수부 이식, P01 T2).
 * 락 = { pid, startedAt(OS 프로세스 생성 시각, UTC ISO), nonce, port, protocolVersion, tokenRef }. 원자 교체로 쓴다.
 * 판정: pid 생존 + 생성 시각 일치(±2s, PID 재사용 감지) + hello nonce 일치 → live. 그 외는 stale 사유별.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface LockFile {
  pid: number;
  startedAt: string;
  nonce: string;
  port: number;
  protocolVersion: number;
  /** 토큰 저장 위치 참조(비밀 아님) — `keyring:…` 또는 `file:…` */
  tokenRef: string;
}
export type LockAssessment = { verdict: "live" } | { verdict: "connectable" } | { verdict: "stale"; reason: "pid_gone" | "pid_reused" | "nonce_mismatch" | "bad_timestamp" };
export type ConnectErrorKind = { kind: "incompatible" | "unauthorized" | "forged" | "unreachable"; code: number | null };
export interface ProcessInfo {
  pid: number;
  ppid: number;
  startedAt: string;
  name: string;
}

/** 같은 출처(CIM CreationDate / ps lstart)를 데몬·launcher 가 각각 조회하므로 정상이면 같다. 2초는 직렬화·반올림 여유 */
const START_TOLERANCE_MS = 2_000;
export const LOCK_FILE = "daemon.lock";

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
  const p = join(stateDir, LOCK_FILE);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as LockFile;
  } catch {
    return null;
  }
}

/** 임시 파일 + rename — launcher 가 반쯤 쓰인 락을 읽지 않게 */
export function writeLock(stateDir: string, lock: LockFile): void {
  mkdirSync(stateDir, { recursive: true });
  const p = join(stateDir, LOCK_FILE);
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(lock), "utf8");
  try {
    renameSync(tmp, p);
  } catch (e) {
    rmSync(tmp, { force: true });
    throw e;
  }
}

export function removeLock(stateDir: string): void {
  rmSync(join(stateDir, LOCK_FILE), { force: true });
}

/** 프로세스 목록(pid, ppid, OS 생성 시각). win32: CIM. 그 외: ps. */
export function listProcesses(): ProcessInfo[] {
  if (process.platform === "win32") {
    const out = execFileSync(
      "pwsh",
      ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | Select-Object @{n='pid';e={$_.ProcessId}},@{n='ppid';e={$_.ParentProcessId}},@{n='startedAt';e={if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')}else{''}}},@{n='name';e={$_.Name}} | ConvertTo-Json -Compress"],
      { encoding: "utf8", timeout: 30_000, maxBuffer: 16 * 1024 * 1024 },
    );
    return JSON.parse(out) as ProcessInfo[];
  }
  const out = execFileSync("ps", ["-eo", "pid=,ppid=,lstart=,comm="], { encoding: "utf8", timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = /^(\d+)\s+(\d+)\s+(.+?\d{4})\s+(\S+)$/.exec(l);
      if (!m) return null;
      const started = new Date(m[3]!);
      return { pid: Number(m[1]), ppid: Number(m[2]), startedAt: Number.isNaN(started.getTime()) ? "" : started.toISOString(), name: m[4]! };
    })
    .filter((x): x is ProcessInfo => x !== null);
}

export function probeProcess(pid: number): { pidAlive: boolean; processStartedAt: string | null } {
  const p = listProcesses().find((x) => x.pid === pid);
  return { pidAlive: !!p, processStartedAt: p?.startedAt ?? null };
}

let ownStart: string | undefined;
/** 자기 프로세스의 OS 생성 시각 — 락 파일의 startedAt. launcher 가 같은 출처로 대조한다(PID 재사용 감지). 프로세스당 1회 조회. */
export function ownCreationTime(): string {
  if (ownStart) return ownStart;
  try {
    ownStart = probeProcess(process.pid).processStartedAt || new Date(Date.now() - process.uptime() * 1000).toISOString();
  } catch {
    ownStart = new Date(Date.now() - process.uptime() * 1000).toISOString();
  }
  return ownStart;
}
