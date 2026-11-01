/**
 * S5 — detached 데몬 생명주기 (MASTER Phase 00 Task S5, AC-P00-4, V7·R16)
 *
 * (1) launcher 프로세스가 `spawn(node, [daemon], {detached, stdio:'ignore', windowsHide}).unref()` 후 **종료**돼도
 *     5초 뒤 데몬 WS(127.0.0.1, HMAC 상호 인증)에 접속되고 seq가 증가한다(수신 이벤트 seq는 연속).
 * (2) 두 번째 launcher **프로세스**가 락 파일의 pid·startedAt·nonce를 검증해 **같은** 데몬에 재접속한다(새로 띄우지 않음, seq 역행 없음).
 * (2b~2e) 핸드셰이크 거부: 잘못된 토큰(4001)·증명 없는 auth(4001)·hello 타임아웃(4002)·프로토콜 불일치(4003).
 * (2f) 위조 락(진짜 pid·startedAt·nonce + 공격자 포트): launcher는 토큰·클라이언트 증명을 보내기 전에 서버 증명 검증에서 중단한다.
 * (2g) launcher 두 개 동시 기동 → 데몬 1개, 같은 pid.
 * (3) 데몬이 자식(더미 `node` sleep)과 손자까지 띄운 상태에서 shutdown → 데몬·자손 프로세스 0개(명시 kill 1차, R16).
 * (4) 재부팅 stale 락은 수동 절차 + `assessLock` 단위 테스트(s5.unit.test.ts)로 대체.
 * 실행: AGENT_STUDIO_LIVE=1, Windows 전용(detached·windowsHide·taskkill 의미가 OS별로 다름 — V1 게이트에서 반복).
 */
import { afterAll, describe, expect, it } from "vitest";
import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { mask } from "../_shared/mask.js";
import { connectDaemon, ensureDaemon, listProcesses, readLock, PROTOCOL_VERSION, type DaemonHandle, type DaemonClient, type LockFile } from "./launcher.js";

const LIVE = !!process.env.AGENT_STUDIO_LIVE && process.platform === "win32";
const LAUNCHER = fileURLToPath(new URL("./launcher.ts", import.meta.url));
const RESULTS = fileURLToPath(new URL("../fixtures/s5-daemon-results.json", import.meta.url));
const observations: Record<string, unknown> = {};
let stateDir = "";
let client: DaemonClient | undefined;
/** 정리 대상: 기동 직후 보관한 pid·startedAt — afterAll에서 신원 재검증 후에만 kill(리뷰 #6) */
const cleanupTargets: { pid: number; startedAt: string }[] = [];
const extraDirs: string[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function runLauncher(dir: string, mode: "--spawn-and-exit" | "--ensure"): DaemonHandle {
  const out = execFileSync(process.execPath, ["--import", "tsx", LAUNCHER, "--dir", dir, mode], { encoding: "utf8", timeout: 40_000 });
  return JSON.parse(out.trim().split(/\r?\n/).pop()!) as DaemonHandle;
}

describe.skipIf(!LIVE)("S5 detached daemon lifecycle (LIVE, win32)", () => {
  afterAll(async () => {
    try {
      client?.close();
    } catch {}
    const procs = listProcesses();
    for (const t of cleanupTargets) {
      const p = procs.find((x) => x.pid === t.pid);
      if (p && p.startedAt === t.startedAt) {
        try {
          execFileSync("taskkill", ["/T", "/F", "/PID", String(t.pid)], { stdio: "ignore" });
        } catch {}
      }
    }
    writeFileSync(RESULTS, mask(JSON.stringify(observations, null, 2)) + "\n");
    for (const d of [stateDir, ...extraDirs]) if (d && existsSync(d)) rmSync(d, { recursive: true, force: true });
  });

  it("(1) launcher 프로세스 종료 후 5초 뒤 데몬 WS에 접속되고 seq가 증가한다(수신 이벤트 연속)", async () => {
    stateDir = mkdtempSync(join(tmpdir(), "s5-daemon-"));
    const launched = runLauncher(stateDir, "--spawn-and-exit"); // spawn 직후 process.exit(0) — 앱 종료 시나리오
    cleanupTargets.push({ pid: launched.pid, startedAt: launched.startedAt });
    observations.firstLaunch = launched;
    expect(launched.pid).toBeGreaterThan(0);
    await sleep(5_000);
    const lock = readLock(stateDir);
    expect(lock?.pid).toBe(launched.pid);
    client = await connectDaemon(stateDir, lock!);
    const first = client.welcome.seq;
    await sleep(1_500);
    const later = await client.request<{ seq: number }>({ type: "status" });
    const gaps = client.events.filter((s, i) => i > 0 && s !== client!.events[i - 1] + 1);
    observations.seqAfterLauncherExit = { first, later: later.seq, daemonPid: client.welcome.pid, nonce: client.welcome.nonce, eventsReceived: client.events.length, gaps };
    expect(client.welcome.nonce).toBe(lock!.nonce);
    expect(client.welcome.pid).toBe(lock!.pid);
    expect(later.seq).toBeGreaterThan(first);
    expect(client.events.length).toBeGreaterThan(3);
    expect(gaps).toEqual([]); // 한 연결 안에서 seq 누락 없음
    const procs = listProcesses();
    const me = procs.find((p) => p.pid === launched.pid);
    observations.daemonProcess = me ?? null;
    expect(me).toBeDefined();
    expect(procs.some((p) => p.pid === me!.ppid)).toBe(false); // 부모(launcher)는 이미 종료
  }, 60_000);

  it("(2) 두 번째 launcher 프로세스가 락 파일(pid·startedAt·nonce)을 검증해 같은 데몬에 재접속한다(seq 역행 없음)", async () => {
    const before = await client!.request<{ seq: number }>({ type: "status" });
    const handle = runLauncher(stateDir, "--ensure");
    observations.secondLaunch = handle;
    expect(handle.pid).toBe(client!.welcome.pid);
    expect(handle.nonce).toBe(client!.welcome.nonce);
    expect(handle.spawned).toBe(false);
    expect(handle.assessment).toEqual({ verdict: "live" });
    const second = await connectDaemon(stateDir, readLock(stateDir)!);
    expect(second.welcome.seq).toBeGreaterThanOrEqual(before.seq); // 재접속 후 역행 없음(누락 복구는 P01 Journal 재구독 범위)
    second.close();
  }, 60_000);

  it("(2b) 잘못된 토큰 → 서버 증명 검증 실패(forged로 분류, 클라이언트 증명 미전송)", async () => {
    const lock = readLock(stateDir)!;
    await expect(connectDaemon(stateDir, lock, { token: "wrong-token" })).rejects.toThrow(/server proof invalid/);
  }, 15_000);

  it("(2c) 증명 없는 auth → 4001 unauthorized, welcome 없음", async () => {
    const lock = readLock(stateDir)!;
    const code = await rawHandshake(lock.port, [{ type: "hello", clientNonce: "x", protocolVersion: PROTOCOL_VERSION }, { type: "auth" }]);
    observations.rejectNoProof = code;
    expect(code.closeCode).toBe(4001);
    expect(code.sawWelcome).toBe(false);
  }, 15_000);

  it("(2d) hello 없이 3초 → 4002 hello timeout", async () => {
    const lock = readLock(stateDir)!;
    const code = await rawHandshake(lock.port, []);
    observations.rejectHelloTimeout = code;
    expect(code.closeCode).toBe(4002);
  }, 15_000);

  it("(2e) 프로토콜 버전 불일치 → 4003, 기존 데몬은 보존(incompatible)", async () => {
    const lock = readLock(stateDir)!;
    const code = await rawHandshake(lock.port, [{ type: "hello", clientNonce: "x", protocolVersion: 99 }]);
    observations.rejectProtocol = code;
    expect(code.closeCode).toBe(4003);
    expect(readLock(stateDir)?.pid).toBe(lock.pid);
  }, 15_000);

  it("(2f) 위조 락(진짜 pid·startedAt·nonce + 공격자 포트): 토큰·클라이언트 증명을 보내기 전에 중단하고 새 데몬을 띄우지 않는다", async () => {
    const real = readLock(stateDir)!;
    const received: string[] = [];
    const fake = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    fake.on("connection", (ws) => {
      ws.on("message", (m) => {
        received.push(String(m));
        // 공격자: 토큰을 모르므로 아무 증명이나 보낸다
        ws.send(JSON.stringify({ type: "challenge", serverNonce: "evil", nonce: real.nonce, pid: real.pid, serverProof: "00".repeat(32) }));
      });
    });
    await new Promise<void>((r) => fake.on("listening", r));
    const fakePort = (fake.address() as { port: number }).port;
    const forgedDir = mkdtempSync(join(tmpdir(), "s5-forged-"));
    extraDirs.push(forgedDir);
    copyFileSync(join(stateDir, "token"), join(forgedDir, "token"));
    const forged: LockFile = { ...real, port: fakePort };
    writeFileSync(join(forgedDir, "daemon.lock"), JSON.stringify(forged));
    const token = readFileSync(join(stateDir, "token"), "utf8").trim();
    const procsBefore = listProcesses().filter((p) => p.name === "node.exe").length;
    let err: unknown;
    try {
      await ensureDaemon(forgedDir);
    } catch (e) {
      err = e;
    }
    await new Promise<void>((r) => fake.close(() => r()));
    observations.forgedLock = { received, error: String(err).slice(0, 200), lockKept: readLock(forgedDir)?.port === fakePort };
    expect(String(err)).toMatch(/forged|identity/i);
    expect(received.length).toBeGreaterThan(0);
    for (const m of received) {
      expect(m).not.toContain(token);
      expect(JSON.parse(m).type).toBe("hello"); // auth(클라이언트 증명)는 전송되지 않음
    }
    expect(listProcesses().filter((p) => p.name === "node.exe").length).toBeLessThanOrEqual(procsBefore); // 새 데몬 없음
  }, 30_000);

  it("(2g) launcher 두 개 동시 기동 → 데몬 1개, 두 핸들의 pid 동일", async () => {
    const dir = mkdtempSync(join(tmpdir(), "s5-concurrent-"));
    extraDirs.push(dir);
    const run = () =>
      new Promise<DaemonHandle>((resolve, reject) => {
        const c = spawn(process.execPath, ["--import", "tsx", LAUNCHER, "--dir", dir, "--ensure"], { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        c.stdout.on("data", (d) => (out += d));
        c.on("exit", (code) => (code === 0 ? resolve(JSON.parse(out.trim().split(/\r?\n/).pop()!)) : reject(new Error(`launcher exit ${code}: ${out.slice(-300)}`))));
      });
    const [a, b] = await Promise.all([run(), run()]);
    cleanupTargets.push({ pid: a.pid, startedAt: a.startedAt });
    const daemons = listProcesses().filter((p) => p.pid === a.pid || p.pid === b.pid);
    observations.concurrentLaunch = { a: { pid: a.pid, spawned: a.spawned, assessment: a.assessment }, b: { pid: b.pid, spawned: b.spawned, assessment: b.assessment }, daemonProcesses: daemons.length };
    expect(a.pid).toBe(b.pid);
    expect([a.spawned, b.spawned].filter(Boolean).length).toBe(1);
    expect(daemons.length).toBe(1);
    const c = await connectDaemon(dir, readLock(dir)!);
    await c.request({ type: "shutdown" });
    c.close();
  }, 60_000);

  it("(3) 자식·손자 프로세스가 있는 상태에서 shutdown → 데몬·자손 0개", async () => {
    const spawned = await client!.request<{ children: number[] }>({ type: "spawnChildren", count: 2, withGrandchild: true });
    expect(spawned.children.length).toBe(2);
    await sleep(1_500);
    const beforeTree = descendants(client!.welcome.pid);
    observations.treeBeforeShutdown = beforeTree;
    expect(beforeTree.length).toBeGreaterThanOrEqual(4); // 자식 2 + 손자 2(+ 숨김 conhost)
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

/** 원시 핸드셰이크: 주어진 메시지를 순서대로 보내고 close code·welcome 수신 여부를 돌려준다 */
function rawHandshake(port: number, messages: object[]): Promise<{ closeCode: number; reason: string; sawWelcome: boolean; got: string[] }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    const got: string[] = [];
    let sawWelcome = false;
    ws.onopen = () => {
      for (const m of messages) ws.send(JSON.stringify(m));
    };
    ws.onmessage = (ev) => {
      const s = String(ev.data);
      got.push(s.slice(0, 120));
      if (s.includes('"welcome"')) sawWelcome = true;
    };
    ws.onclose = (ev) => resolve({ closeCode: ev.code, reason: ev.reason, sawWelcome, got });
    setTimeout(() => {
      try {
        ws.close();
      } catch {}
    }, 8_000);
  });
}
