/**
 * S5 — detached 데몬 생명주기 (MASTER Phase 00 Task S5, AC-P00-4, V7·R16)
 *
 * (1) launcher 프로세스가 `spawn(node, [daemon], {detached, stdio:'ignore', windowsHide}).unref()` 후 **종료**돼도
 *     5초 뒤 데몬 WS(127.0.0.1, 토큰 핸드셰이크)에 접속되고 seq가 증가한다.
 * (2) 두 번째 launcher가 락 파일의 pid·startedAt·nonce를 검증해 **같은** 데몬에 재접속한다(새로 띄우지 않음, seq 연속).
 * (3) 데몬이 자식(더미 `node` sleep)과 손자까지 띄운 상태에서 shutdown → 데몬·자손 프로세스 0개(명시 kill 1차, R16 Job Object 필요성 판정).
 * (4) 재부팅 stale 락은 수동 절차 + `assessLock` 단위 테스트(s5.unit.test.ts)로 대체.
 * 실행: AGENT_STUDIO_LIVE=1, Windows 전용(detached·windowsHide·taskkill 의미가 OS별로 다름 — V1 게이트에서 반복).
 */
import { afterAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mask } from "../_shared/mask.js";
import { connectDaemon, ensureDaemon, listProcesses, readLock, type DaemonHandle, type DaemonClient } from "./launcher.js";

const LIVE = !!process.env.AGENT_STUDIO_LIVE && process.platform === "win32";
const LAUNCHER = fileURLToPath(new URL("./launcher.ts", import.meta.url));
const RESULTS = fileURLToPath(new URL("../fixtures/s5-daemon-results.json", import.meta.url));
const observations: Record<string, unknown> = {};
let stateDir = "";
let handle: DaemonHandle | undefined;
let client: DaemonClient | undefined;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!LIVE)("S5 detached daemon lifecycle (LIVE, win32)", () => {
  afterAll(async () => {
    try {
      client?.close();
    } catch {}
    // 혹시 남아 있으면 강제 정리(테스트 실패 경로)
    if (handle) {
      try {
        execFileSync("taskkill", ["/T", "/F", "/PID", String(handle.pid)], { stdio: "ignore" });
      } catch {}
    }
    writeFileSync(RESULTS, mask(JSON.stringify(observations, null, 2)) + "\n");
    if (stateDir && existsSync(stateDir)) rmSync(stateDir, { recursive: true, force: true });
  });

  it("(1) launcher 프로세스 종료 후 5초 뒤 데몬 WS에 접속되고 seq가 증가한다", async () => {
    stateDir = mkdtempSync(join(tmpdir(), "s5-daemon-"));
    // 별도 프로세스로 launcher 실행 → spawn(detached) 후 즉시 종료(앱 종료 시나리오)
    const out = execFileSync(process.execPath, ["--import", "tsx", LAUNCHER, "--dir", stateDir, "--spawn-and-exit"], { encoding: "utf8", timeout: 30_000 });
    const launched = JSON.parse(out.trim().split(/\r?\n/).pop()!) as DaemonHandle;
    observations.firstLaunch = launched;
    expect(launched.pid).toBeGreaterThan(0);
    await sleep(5_000);
    const lock = readLock(stateDir);
    expect(lock?.pid).toBe(launched.pid);
    client = await connectDaemon(stateDir, lock!);
    const first = client.welcome.seq;
    await sleep(1_000);
    const later = await client.request<{ seq: number }>({ type: "status" });
    observations.seqAfterLauncherExit = { first, later: later.seq, daemonPid: client.welcome.pid, nonce: client.welcome.nonce };
    expect(client.welcome.nonce).toBe(lock!.nonce);
    expect(later.seq).toBeGreaterThan(first);
    // 데몬 프로세스에 콘솔 창이 없는지는 수동 관찰(보고서) — 여기서는 프로세스 존재·부모 pid 기록
    const procs = listProcesses();
    const me = procs.find((p) => p.pid === launched.pid);
    observations.daemonProcess = me ?? null;
    expect(me).toBeDefined();
    expect(procs.some((p) => p.pid === me!.ppid)).toBe(false); // 부모(launcher)는 이미 종료
  }, 60_000);

  it("(2) 두 번째 launcher가 락 파일(pid·startedAt·nonce)을 검증해 같은 데몬에 재접속한다(seq 연속)", async () => {
    const before = await client!.request<{ seq: number }>({ type: "status" });
    handle = await ensureDaemon(stateDir);
    observations.secondLaunch = { ...handle, assessment: handle.assessment };
    expect(handle.pid).toBe(client!.welcome.pid);
    expect(handle.nonce).toBe(client!.welcome.nonce);
    expect(handle.assessment).toEqual({ verdict: "live" });
    const second = await connectDaemon(stateDir, readLock(stateDir)!);
    expect(second.welcome.seq).toBeGreaterThanOrEqual(before.seq);
    second.close();
  }, 30_000);

  it("(2b) 잘못된 토큰은 핸드셰이크에서 거부된다(S4 loopback 허용 실측에 따른 설계 입력)", async () => {
    const lock = readLock(stateDir)!;
    await expect(connectDaemon(stateDir, lock, { token: "wrong-token" })).rejects.toThrow(/4001|unauthorized/i);
  }, 15_000);

  it("(3) 자식·손자 프로세스가 있는 상태에서 shutdown → 데몬·자손 0개", async () => {
    const spawned = await client!.request<{ children: number[] }>({ type: "spawnChildren", count: 2, withGrandchild: true });
    expect(spawned.children.length).toBe(2);
    await sleep(1_500);
    const beforeTree = descendants(client!.welcome.pid);
    observations.treeBeforeShutdown = beforeTree;
    expect(beforeTree.length).toBeGreaterThanOrEqual(4); // 자식 2 + 손자 2
    const daemonPid = client!.welcome.pid;
    const res = await client!.request<{ killed: unknown[] }>({ type: "shutdown" });
    observations.shutdownReply = res;
    client!.close();
    client = undefined;
    let alive: number[] = [];
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const procs = listProcesses();
      alive = [daemonPid, ...beforeTree.map((p) => p.pid)].filter((pid) => procs.some((p) => p.pid === pid));
      if (alive.length === 0) break;
    }
    observations.aliveAfterShutdown = alive;
    observations.lockAfterShutdown = readLock(stateDir);
    expect(alive).toEqual([]);
    expect(readLock(stateDir)).toBeNull();
    handle = undefined;
  }, 60_000);
});

function descendants(root: number) {
  const procs = listProcesses();
  const out: typeof procs = [];
  const walk = (pid: number) => {
    for (const p of procs) if (p.ppid === pid) { out.push(p); walk(p.pid); }
  };
  walk(root);
  return out;
}
