/**
 * S5 — launcher(Shell 역할): 락 파일 발견·검증(pid·startedAt·nonce) → 재접속 또는 detached spawn.
 * CLI: node --import tsx launcher.ts --dir <stateDir> --spawn-and-exit   (spawn 후 즉시 종료 — 앱 종료 시나리오)
 */
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const PROTOCOL_VERSION = 1;
export interface LockFile {
  pid: number;
  startedAt: string;
  nonce: string;
  port: number;
  protocolVersion: number;
}
export type LockAssessment = { verdict: "live" } | { verdict: "connectable" } | { verdict: "stale"; reason: "pid_gone" | "pid_reused" | "nonce_mismatch" };
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

const DAEMON = fileURLToPath(new URL("./daemon.ts", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const START_TOLERANCE_MS = 2_000;

/** 순수 판정: 락 파일 vs OS 관찰(pid 생존·생성 시각)·hello nonce */
export function assessLock(lock: LockFile, probe: { pidAlive: boolean; processStartedAt: string | null; helloNonce: string | null }): LockAssessment {
  if (!probe.pidAlive) return { verdict: "stale", reason: "pid_gone" };
  if (!probe.processStartedAt || Math.abs(Date.parse(probe.processStartedAt) - Date.parse(lock.startedAt)) > START_TOLERANCE_MS) return { verdict: "stale", reason: "pid_reused" };
  if (probe.helloNonce === null) return { verdict: "connectable" };
  if (probe.helloNonce !== lock.nonce) return { verdict: "stale", reason: "nonce_mismatch" };
  return { verdict: "live" };
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

/** WS 접속 + hello 핸드셰이크(토큰·프로토콜 버전). 거부되면 close code로 reject */
export function connectDaemon(stateDir: string, lock: LockFile, opts: { token?: string } = {}): Promise<DaemonClient> {
  const token = opts.token ?? readFileSync(join(stateDir, "token"), "utf8").trim();
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${lock.port}/`);
    const pending = new Map<number, (v: unknown) => void>();
    let nextId = 1;
    let welcomed = false;
    const events: number[] = [];
    ws.onopen = () => ws.send(JSON.stringify({ type: "hello", token, protocolVersion: PROTOCOL_VERSION }));
    ws.onerror = () => reject(new Error("ws error"));
    ws.onclose = (ev) => {
      if (!welcomed) reject(new Error(`closed before welcome: ${ev.code} ${ev.reason}`));
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data)) as { type?: string; id?: number; seq?: number };
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

/** detached spawn: 부모가 종료돼도 데몬은 남는다. 락 파일이 나타날 때까지 기다린 뒤 핸들 반환 */
export async function spawnDaemon(stateDir: string): Promise<DaemonHandle> {
  mkdirSync(stateDir, { recursive: true });
  const tokenRef = join(stateDir, "token");
  if (!existsSync(tokenRef)) writeFileSync(tokenRef, randomBytes(24).toString("hex"));
  rmSync(join(stateDir, "daemon.lock"), { force: true });
  const child = spawn(process.execPath, ["--import", "tsx", DAEMON, "--dir", stateDir], { detached: true, stdio: "ignore", windowsHide: true, cwd: REPO_ROOT });
  child.unref();
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const lock = readLock(stateDir);
    if (lock && lock.pid === child.pid) return { ...lock, tokenRef, spawned: true };
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`daemon lock did not appear within 20s (pid ${child.pid})`);
}

/** Shell의 ensureDaemon: 락 검증 → 재접속(live) 또는 stale 정리 후 spawn */
export async function ensureDaemon(stateDir: string): Promise<DaemonHandle> {
  const lock = readLock(stateDir);
  if (lock) {
    const probe = probeProcess(lock.pid);
    let assessment = assessLock(lock, { ...probe, helloNonce: null });
    if (assessment.verdict === "connectable") {
      try {
        const c = await connectDaemon(stateDir, lock);
        assessment = assessLock(lock, { ...probe, helloNonce: c.welcome.nonce });
        c.close();
      } catch {
        assessment = { verdict: "stale", reason: "nonce_mismatch" };
      }
    }
    if (assessment.verdict === "live") return { ...lock, tokenRef: join(stateDir, "token"), assessment, spawned: false };
    rmSync(join(stateDir, "daemon.lock"), { force: true }); // stale 락 정리(재부팅·PID 재사용·nonce 불일치)
    const h = await spawnDaemon(stateDir);
    return { ...h, assessment };
  }
  return spawnDaemon(stateDir);
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const dir = args[args.indexOf("--dir") + 1];
  if (!dir) throw new Error("--dir required");
  if (args.includes("--spawn-and-exit")) {
    spawnDaemon(dir).then((h) => {
      process.stdout.write(JSON.stringify(h) + "\n");
      process.exit(0); // 앱 종료 시나리오: 부모 즉시 종료
    });
  } else {
    ensureDaemon(dir).then((h) => {
      process.stdout.write(JSON.stringify(h) + "\n");
      process.exit(0);
    });
  }
}
