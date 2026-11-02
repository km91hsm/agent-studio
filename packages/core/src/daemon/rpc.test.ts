/**
 * T2 WS JSON-RPC 서버/클라이언트 in-proc 테스트(메모리 저널, port 0).
 * (a) SE-06a 인증 실패 → 4001/4003, 저널 불변 (b) 메서드 노출·스키마 검증·사용자 전이 (c) E4 재구독 누락·중복 0
 * (d) 재전송 → dropped (d2) 건너뜀 → gaps + 자동 재구독 (e) 오류 코드 (f) REC-04 기초(재접속이 승인 타이머를 연장하지 않음) (g) shutdown 은 main 만.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket, { WebSocketServer } from "ws";
import { DEFAULT_POLICY } from "@agent-studio/protocol";
import type { JournalEvent } from "@agent-studio/protocol";
import { DefaultPolicyBroker } from "../approval-broker.js";
import { ApprovalCoordinator } from "../approval-coordinator.js";
import { loadBundledWarnings, PolicyGate, registerIsolationWarnings } from "../isolation.js";
import { MemoryEventStore } from "../journal/memory-store.js";
import { Scheduler } from "../scheduler.js";
import { PROTOCOL_VERSION, proof } from "./protocol.js";
import { DaemonClient, RpcCallError } from "./rpc-client.js";
import { removeLock, writeLock } from "./lock.js";
import { startRpcServer, type RpcServer } from "./rpc-server.js";

const TOKEN = "test-token-0123456789";
const dirs: string[] = [];
const servers: RpcServer[] = [];
const clients: DaemonClient[] = [];
afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  for (const s of servers.splice(0)) await s.close();
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

async function boot(opts: { onShutdown?: () => void; handshakeTimeoutMs?: number } = {}) {
  const stateDir = mkdtempSync(join(tmpdir(), "as-rpc-"));
  dirs.push(stateDir);
  const store = new MemoryEventStore();
  const clock = { t: Date.parse("2026-11-02T00:00:00.000Z") };
  const now = () => clock.t;
  const scheduler = new Scheduler(store, { now });
  store.append({ type: "ProjectRegistered", projectId: "p1", payload: { id: "p1", path: stateDir } });
  registerIsolationWarnings(store, loadBundledWarnings());
  const gate = new PolicyGate(store, "p1", now);
  const broker = new DefaultPolicyBroker(store, () => gate.policy(), { now }); // 리뷰B#2: 현재 정책을 매번 조회
  const coordinator = new ApprovalCoordinator(scheduler, broker, store);
  const server = await startRpcServer({ store, scheduler, broker, coordinator, gate, token: TOKEN, stateDir, tokenRef: "file:test", now, ...(opts.onShutdown && { onShutdown: opts.onShutdown }), ...(opts.handshakeTimeoutMs !== undefined && { handshakeTimeoutMs: opts.handshakeTimeoutMs }) });
  servers.push(server);
  return { stateDir, store, clock, now, scheduler, broker, coordinator, gate, server };
}

async function connect(stateDir: string, extra: Partial<Parameters<typeof DaemonClient.connect>[0]> = {}) {
  const received: number[] = [];
  const events: JournalEvent[] = [];
  const client = await DaemonClient.connect({
    stateDir,
    token: TOKEN,
    onEvent: (e) => {
      received.push(e.seq);
      events.push(e);
    },
    ...extra,
  });
  clients.push(client);
  return { client, received, events };
}

const until = async (pred: () => boolean, ms = 10_000) => {
  const deadline = Date.now() + ms;
  while (!pred()) {
    if (Date.now() > deadline) throw new Error("timeout waiting for condition");
    await new Promise((r) => setTimeout(r, 10));
  }
};
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** 핸드셰이크를 손으로 진행하는 원시 클라이언트 — 서버 측 거부 코드를 관찰한다. */
function rawHandshake(port: number, hello: Record<string, unknown>, authOf?: (challenge: { serverNonce: string }) => Record<string, unknown>): Promise<{ code: number; reason: string }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
    ws.on("open", () => ws.send(JSON.stringify(hello)));
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw)) as { type?: string; serverNonce?: string };
      if (msg.type === "challenge" && authOf) ws.send(JSON.stringify(authOf({ serverNonce: msg.serverNonce ?? "" })));
      if (msg.type === "welcome") ws.close(1000, "done");
    });
    ws.on("close", (code, reason) => resolve({ code, reason: String(reason) }));
    ws.on("error", reject);
  });
}

async function toWaitingApproval(b: Awaited<ReturnType<typeof boot>>, runId = "run-1") {
  const taskId = b.scheduler.submit({ title: "exec task", kind: "impl" });
  const { fencingToken } = b.scheduler.acquireLease(taskId, runId);
  b.scheduler.transition(taskId, "lease_acquired", { kind: "lease", token: fencingToken });
  const r = b.coordinator.request({ taskId, runId, kind: "approval", category: "exec", request: { command: "npm test" } }, fencingToken);
  expect(r.verdict).toBe("ASK");
  expect(b.scheduler.state(taskId).status).toBe("WAITING_APPROVAL");
  return { taskId, requestId: r.requestId };
}

describe("rpc (a) SE-06a 인증", () => {
  it("틀린 증명 → 4001·authFailures 증가·저널 불변, 프로토콜 2 → 4003, hello 형식 오류 → 4001, 틀린 토큰 클라이언트는 auth 를 보내지 않는다", async () => {
    const b = await boot();
    const before = b.store.lastSeq();
    const bad = await rawHandshake(b.server.port, { type: "hello", clientNonce: "cn", protocolVersion: PROTOCOL_VERSION, role: "main" }, () => ({ type: "auth", clientProof: "00".repeat(32) }));
    expect(bad.code).toBe(4001);
    expect(b.server.stats().authFailures).toBe(1);
    const v2 = await rawHandshake(b.server.port, { type: "hello", clientNonce: "cn", protocolVersion: 2, role: "main" });
    expect(v2.code).toBe(4003);
    const noNonce = await rawHandshake(b.server.port, { type: "hello", protocolVersion: PROTOCOL_VERSION, role: "main" });
    expect(noNonce.code).toBe(4001);
    expect(b.server.stats().authFailures).toBe(2);
    expect(b.store.lastSeq()).toBe(before);
    expect(b.server.stats().connections).toBe(0);
    await expect(DaemonClient.connect({ stateDir: b.stateDir, token: "wrong-token", onEvent: () => {} })).rejects.toThrow(/server proof invalid/);
    expect(b.server.stats().authFailures).toBe(2); // 클라이언트가 증명을 보내기 전에 중단
    // 올바른 증명은 welcome
    const ok = await rawHandshake(b.server.port, { type: "hello", clientNonce: "cn2", protocolVersion: PROTOCOL_VERSION, role: "main" }, ({ serverNonce }) => ({ type: "auth", clientProof: proof(TOKEN, serverNonce, "cn2", "client") }));
    expect(ok.code).toBe(1000);
  });
});

describe("rpc (b) 메서드·스키마·사용자 전이", () => {
  it("task.submit → task.get QUEUED → task.cancel CANCELLED(TaskTransition +1), 모르는/비노출 메서드 -32601, 스키마 위반 -32602", async () => {
    const b = await boot();
    const { client } = await connect(b.stateDir);
    const status = await client.call<{ pid: number; seq: number; protocolVersion: number; tokenRef: string }>("daemon.status");
    expect(status.pid).toBe(process.pid);
    expect(status.seq).toBe(b.store.lastSeq());
    expect(status.tokenRef).toBe("file:test");
    const { taskId } = await client.call<{ taskId: string }>("task.submit", { title: "hello", kind: "impl" });
    expect(await client.call("task.get", { taskId })).toMatchObject({ id: taskId, status: "QUEUED", iteration: 0 });
    expect((await client.call<{ id: string }[]>("task.list")).map((t) => t.id)).toEqual([taskId]);
    const e1 = await client.call("bogus.method").catch((e: unknown) => e);
    expect(e1).toBeInstanceOf(RpcCallError);
    expect((e1 as RpcCallError).code).toBe(-32601);
    const e2 = await client.call("task.transition", { taskId, event: "cancel" }).catch((e: unknown) => e);
    expect((e2 as RpcCallError).code).toBe(-32601);
    const e3 = await client.call("task.submit", { title: "", kind: "impl" }).catch((e: unknown) => e);
    expect((e3 as RpcCallError).code).toBe(-32602);
    const e4 = await client.call("task.submit", { title: "x", kind: "impl", extra: true }).catch((e: unknown) => e);
    expect((e4 as RpcCallError).code).toBe(-32602);
    const e5 = await client.call("task.get", { taskId: "nope" }).catch((e: unknown) => e);
    expect((e5 as RpcCallError).code).toBe(-32602);
    const transitionsBefore = b.store.read(1).filter((e) => e.type === "TaskTransition" && e.taskId === taskId).length;
    expect(await client.call("task.cancel", { taskId })).toEqual({ status: "CANCELLED" });
    expect(b.store.read(1).filter((e) => e.type === "TaskTransition" && e.taskId === taskId).length).toBe(transitionsBefore + 1);
    expect(b.scheduler.state(taskId).status).toBe("CANCELLED");
    const e6 = await client.call("task.cancel", { taskId }).catch((e: unknown) => e);
    expect((e6 as RpcCallError).code).toBe(-32004);
    const caps = await client.call<{ isolationWarnings: unknown[]; tokenRef: string }>("capabilities.get");
    expect(caps.isolationWarnings).toHaveLength(6);
    expect(await client.call("policy.get")).toMatchObject({ policy: { permissionMode: DEFAULT_POLICY.permissionMode }, badge: { active: false } });
  });
});

describe("rpc (c)(d) E4 seq 재구독", () => {
  it("(c) 25번째 수신 뒤 강제 종료 → 끊긴 동안 10건 append → reconnect → 최종 [1..N], dropped 0, gaps 0", async () => {
    const b = await boot();
    const { client, received } = await connect(b.stateDir);
    // 서버가 이벤트를 만든다(submit 당 2건). 배치가 섞이도록 비동기로 흘린다.
    const produce = async (n: number) => {
      for (let i = 0; i < n; i++) {
        b.scheduler.submit({ title: `t${i}`, kind: "impl" });
        if (i % 3 === 0) await new Promise((r) => setTimeout(r, 1));
      }
    };
    await produce(15);
    await until(() => received.length >= 25);
    client.terminate();
    await until(() => !client.connected);
    const lastBefore = client.lastSeq;
    await produce(5); // 끊긴 동안 10건
    expect(b.store.lastSeq()).toBeGreaterThanOrEqual(lastBefore + 10);
    await client.reconnect();
    await produce(10);
    const N = b.store.lastSeq();
    await until(() => received.length >= N);
    expect(received).toEqual(range(N));
    expect(client.dropped).toBe(0);
    expect(client.gaps).toBe(0);
    expect(client.lastSeq).toBe(N);
  });

  it("(d) 서버가 보낸 seq 를 재전송해도 onEvent 중복 없음·dropped 증가", async () => {
    const b = await boot();
    b.server.hooks.mutateBatch = (evs) => (evs.length ? [...evs, evs[0]!] : evs);
    const { client, received } = await connect(b.stateDir);
    for (let i = 0; i < 10; i++) b.scheduler.submit({ title: `t${i}`, kind: "impl" });
    const N = b.store.lastSeq();
    await until(() => received.length >= N);
    await new Promise((r) => setTimeout(r, 50));
    expect(received).toEqual(range(N));
    expect(client.dropped).toBeGreaterThan(0);
    expect(client.gaps).toBe(0);
  });

  it("(d2) 서버가 seq 하나를 건너뛰면 gaps 1 + onGap 호출 + 자동 재구독 뒤 최종 [1..N]", async () => {
    const b = await boot();
    let skipped = false;
    b.server.hooks.mutateBatch = (evs) => {
      if (!skipped && evs.length > 1) {
        skipped = true;
        return [evs[0]!, ...evs.slice(2)];
      }
      return evs;
    };
    const gapsSeen: [number, number][] = [];
    const { client, received } = await connect(b.stateDir, { onGap: (expected, got) => gapsSeen.push([expected, got]) });
    for (let i = 0; i < 10; i++) b.scheduler.submit({ title: `t${i}`, kind: "impl" });
    const N = b.store.lastSeq();
    await until(() => received.length >= N);
    expect(received).toEqual(range(N));
    expect(client.gaps).toBe(1);
    expect(gapsSeen).toHaveLength(1);
    expect(gapsSeen[0]![1]).toBe(gapsSeen[0]![0] + 1);
    expect(client.dropped).toBe(0);
  });
});

describe("rpc (e) 오류 코드", () => {
  it("approval.decide 만료 -32005, user_input.answer 없는 요청 -32006, policy.set 스키마 위반 -32602 / 정상 applied, daemon.shutdown renderer -32001", async () => {
    const b = await boot();
    const { requestId } = await toWaitingApproval(b);
    const { client } = await connect(b.stateDir);
    expect(await client.call("approval.pending")).toHaveLength(1);
    b.clock.t += 16 * 60_000;
    const e1 = await client.call("approval.decide", { requestId, decision: "accept" }).catch((e: unknown) => e);
    expect((e1 as RpcCallError).code).toBe(-32005);
    expect((e1 as RpcCallError).data).toMatchObject({ code: "approval_expired" });
    const e2 = await client.call("user_input.answer", { requestId: "nope", answers: { answer: "confirmed" } }).catch((e: unknown) => e);
    expect((e2 as RpcCallError).code).toBe(-32006);
    const e3 = await client.call("policy.set", { projectId: "p1", policy: { ...DEFAULT_POLICY, v: 2 } }).catch((e: unknown) => e);
    expect((e3 as RpcCallError).code).toBe(-32602);
    const e4 = await client.call("policy.set", { projectId: "p1", policy: { ...DEFAULT_POLICY, rules: { ...DEFAULT_POLICY.rules, exec: { default: "WHATEVER", scope: "once" } } } }).catch((e: unknown) => e);
    expect((e4 as RpcCallError).code).toBe(-32602);
    const planMode = { ...DEFAULT_POLICY, permissionMode: { ...DEFAULT_POLICY.permissionMode, claude: "plan" as const } };
    expect(await client.call("policy.set", { projectId: "p1", policy: planMode })).toEqual({ status: "applied" });
    expect(b.gate.policy().permissionMode.claude).toBe("plan");
    // 경고 조합에서 자동 모드 → confirmation_required → user_input.answer 로 확인
    const auto = { ...DEFAULT_POLICY, permissionMode: { claude: "default" as const, codex: { approvalPolicy: "never" as const, sandbox: "workspaceWrite" as const } } };
    const r = await client.call<{ status: string; requestId: string; warnings: unknown[] }>("policy.set", { projectId: "p1", policy: auto, combos: { codex: { provider: "codex", os: "windows", sandbox: "workspaceWrite", variant: "elevated" } } });
    expect(r.status).toBe("confirmation_required");
    expect(r.warnings).toHaveLength(2);
    const e5 = await client.call("user_input.answer", { requestId: r.requestId, answers: { answer: "maybe" } }).catch((e: unknown) => e);
    expect((e5 as RpcCallError).code).toBe(-32602);
    expect(await client.call("user_input.answer", { requestId: r.requestId, answers: { answer: "confirmed" } })).toEqual({ status: "applied" });
    expect(b.gate.policy().permissionMode.codex.approvalPolicy).toBe("never");
    const e6 = await client.call("user_input.answer", { requestId: r.requestId, answers: { answer: "confirmed" } }).catch((e: unknown) => e);
    expect((e6 as RpcCallError).code).toBe(-32006);
    // renderer 역할의 연결에서 control 메서드
    const { client: renderer } = await connect(b.stateDir, { role: "renderer" });
    const e7 = await renderer.call("daemon.shutdown").catch((e: unknown) => e);
    expect((e7 as RpcCallError).code).toBe(-32001);
  });
});

describe("rpc (f) REC-04 기초", () => {
  it("Shell 강제 종료 뒤 재접속해도 승인 타이머는 요청 시각 기준으로 만료된다", async () => {
    const b = await boot();
    const a = await connect(b.stateDir);
    await until(() => a.client.lastSeq === b.store.lastSeq());
    const seqBeforeRequest = a.client.lastSeq;
    a.client.terminate();
    await until(() => !a.client.connected);
    const { taskId, requestId } = await toWaitingApproval(b);
    expect(b.broker.pending()).toHaveLength(1);
    b.clock.t += 5 * 60_000;
    expect(b.coordinator.tick()).toEqual([]);
    expect(b.broker.pending()).toHaveLength(1);
    expect(b.scheduler.state(taskId).status).toBe("WAITING_APPROVAL");
    const bClient = await connect(b.stateDir, { lastSeq: seqBeforeRequest });
    await until(() => bClient.client.lastSeq === b.store.lastSeq());
    expect(bClient.received[0]).toBe(seqBeforeRequest + 1);
    expect(bClient.events.some((e) => e.type === "ApprovalRequested" && e.payload.request_id === requestId)).toBe(true);
    expect(await bClient.client.call("approval.pending")).toHaveLength(1);
    b.clock.t += 11 * 60_000; // 요청 기준 16분
    expect(b.coordinator.tick()).toEqual([requestId]);
    expect(b.scheduler.state(taskId).status).toBe("BLOCKED");
    expect(await bClient.client.call("approval.pending")).toHaveLength(0);
  });
});

describe("rpc (g) shutdown", () => {
  it("main 역할의 daemon.shutdown → onShutdown 호출·락 삭제·연결 종료", async () => {
    let called = 0;
    const b = await boot({ onShutdown: () => void called++ });
    expect(existsSync(join(b.stateDir, "daemon.lock"))).toBe(true);
    const { client } = await connect(b.stateDir);
    expect(await client.call("daemon.shutdown")).toEqual({ ok: true });
    await until(() => called === 1 && !client.connected);
    expect(existsSync(join(b.stateDir, "daemon.lock"))).toBe(false);
  });
});

describe("rpc (h) 리뷰B 핸드셰이크 강화", () => {
  it("#1 challenge 없이 welcome 만 보내는 위조 서버 → 클라이언트 거부(auth 전송 0), 깨진 JSON 프레임 → 거부", async () => {
    const seen: string[] = [];
    const forged = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    await new Promise<void>((r) => forged.once("listening", () => r()));
    const port = (forged.address() as { port: number }).port;
    forged.on("connection", (ws) => {
      ws.on("message", (raw) => {
        const m = JSON.parse(String(raw)) as { type: string };
        seen.push(m.type);
        if (m.type === "hello") ws.send(JSON.stringify({ type: "welcome", seq: 0, pid: 4242, nonce: "n", protocolVersion: PROTOCOL_VERSION, role: "main" }));
      });
    });
    const lock = { pid: 4242, startedAt: "2026-11-02T00:00:00.000Z", nonce: "n", port, protocolVersion: PROTOCOL_VERSION, tokenRef: "file:x" };
    try {
      await expect(DaemonClient.connect({ stateDir: "unused", token: TOKEN, lock, onEvent: () => {} })).rejects.toThrow(/challenge/);
      expect(seen).toEqual(["hello"]);
      forged.removeAllListeners("connection");
      forged.on("connection", (ws) => ws.on("message", () => ws.send("{not json")));
      await expect(DaemonClient.connect({ stateDir: "unused", token: TOKEN, lock, onEvent: () => {} })).rejects.toThrow(/frame/);
    } finally {
      await new Promise<void>((r) => forged.close(() => r()));
    }
  });

  it("#5 hello 만 보내고 auth 를 보내지 않는 연결은 handshakeTimeoutMs 뒤 4002 로 닫힌다", async () => {
    const b = await boot({ handshakeTimeoutMs: 200 });
    const t0 = Date.now();
    const r = await rawHandshake(b.server.port, { type: "hello", clientNonce: "cn", protocolVersion: PROTOCOL_VERSION, role: "main" });
    expect(r.code).toBe(4002);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(b.server.stats().connections).toBe(0);
  });
});

describe("rpc (i) 리뷰B 정책·프로젝트", () => {
  it("#2 policy.set 으로 바뀐 정책이 Broker 판정에 반영된다(exec DENY)", async () => {
    const b = await boot();
    const { client } = await connect(b.stateDir);
    const req = { taskId: "t", runId: "r", kind: "approval" as const, category: "exec" as const, request: { command: "npm test" } };
    expect(b.broker.evaluate(req)).toBe("ASK");
    const deny = { ...DEFAULT_POLICY, rules: { ...DEFAULT_POLICY.rules, exec: { ...DEFAULT_POLICY.rules.exec, default: "DENY" as const } } };
    expect(await client.call("policy.set", { projectId: "p1", policy: deny })).toEqual({ status: "applied" });
    expect(b.broker.evaluate(req)).toBe("DENY");
  });

  it("#7 다른 projectId 의 policy.get/policy.set 은 -32602 이고 정책은 불변", async () => {
    const b = await boot();
    const { client } = await connect(b.stateDir);
    const e1 = await client.call("policy.get", { projectId: "other" }).catch((e: unknown) => e);
    expect((e1 as RpcCallError).code).toBe(-32602);
    const before = b.store.lastSeq();
    const plan = { ...DEFAULT_POLICY, permissionMode: { ...DEFAULT_POLICY.permissionMode, claude: "plan" as const } };
    const e2 = await client.call("policy.set", { projectId: "other", policy: plan }).catch((e: unknown) => e);
    expect((e2 as RpcCallError).code).toBe(-32602);
    expect(b.store.lastSeq()).toBe(before);
    expect(await client.call("policy.get", { projectId: "p1" })).toMatchObject({ policy: { permissionMode: DEFAULT_POLICY.permissionMode } });
  });
});

describe("rpc (j) 리뷰B 재구독 복구", () => {
  it("#3 백로그 100건 초과의 첫 배치에 갭이 있어도 connect() 는 성공하고 최종 [1..N]", async () => {
    const b = await boot();
    for (let i = 0; i < 60; i++) b.scheduler.submit({ title: `t${i}`, kind: "impl" });
    const N = b.store.lastSeq();
    expect(N).toBeGreaterThan(100);
    let skipped = false;
    b.server.hooks.mutateBatch = (evs) => {
      if (!skipped && evs.length > 2) {
        skipped = true;
        return [evs[0]!, ...evs.slice(2)];
      }
      return evs;
    };
    const { client, received } = await connect(b.stateDir);
    expect(client.connected).toBe(true);
    await until(() => received.length >= N);
    expect(received).toEqual(range(N));
    expect(client.gaps).toBe(1);
  });

  it("#4 갭 뒤 자동 재접속이 실패하면(락 없음) onDisconnect 1회·connected=false", async () => {
    const b = await boot();
    let disconnects = 0;
    const { client, received } = await connect(b.stateDir, { onDisconnect: () => void disconnects++ });
    await until(() => client.lastSeq === b.store.lastSeq());
    removeLock(b.stateDir);
    let skipped = false;
    b.server.hooks.mutateBatch = (evs) => {
      if (!skipped && evs.length > 1) {
        skipped = true;
        return [evs[0]!, ...evs.slice(2)];
      }
      return evs;
    };
    for (let i = 0; i < 5; i++) b.scheduler.submit({ title: `t${i}`, kind: "impl" });
    await until(() => disconnects === 1, 15_000);
    expect(client.connected).toBe(false);
    expect(client.gaps).toBe(1);
    expect(received.length).toBeLessThan(b.store.lastSeq());
    await expect(client.reconnect()).rejects.toThrow(/lock/);
  });

describe("rpc (k) 리뷰C#4 자동 재접속 vs 수동 reconnect", () => {
  it("자동 재시도 대기 중 수동 reconnect() 가 성공하면 남은 자동 시도는 정상 소켓을 끊지 않는다(welcome 동일·onDisconnect 0)", async () => {
    const b = await boot();
    let disconnects = 0;
    const { client, received } = await connect(b.stateDir, { onDisconnect: () => void disconnects++ });
    await until(() => client.lastSeq === b.store.lastSeq());
    removeLock(b.stateDir); // 자동 재접속 1차는 실패한다
    let skipped = false;
    b.server.hooks.mutateBatch = (evs) => {
      if (!skipped && evs.length > 1) {
        skipped = true;
        return [evs[0]!, ...evs.slice(2)];
      }
      return evs;
    };
    for (let i = 0; i < 3; i++) b.scheduler.submit({ title: `t${i}`, kind: "impl" });
    await until(() => client.gaps === 1 && !client.connected);
    writeLock(b.stateDir, b.server.lock); // 락 복구 → 수동 재접속(자동 2차 시도 전에)
    await client.reconnect();
    expect(client.connected).toBe(true);
    const welcome = client.welcome;
    await new Promise((r) => setTimeout(r, 900)); // 자동 재시도 창(200ms × 2)이 지나간다
    expect(client.connected).toBe(true);
    expect(client.welcome).toBe(welcome);
    expect(disconnects).toBe(0);
    for (let i = 0; i < 2; i++) b.scheduler.submit({ title: `u${i}`, kind: "impl" });
    const N = b.store.lastSeq();
    await until(() => received.length >= N);
    expect(received).toEqual(range(N));
  });
});

describe("rpc (l) 최종리뷰C1 중첩 append 와 seq 순서", () => {
  it("WAITING_APPROVAL 에서 task.cancel(→ Coordinator 가 콜백 안에서 decline 기록) 뒤에도 클라이언트는 갭 없이 오름차순으로 받는다", async () => {
    const b = await boot();
    const { client, received } = await connect(b.stateDir);
    const { taskId } = await toWaitingApproval(b);
    await until(() => client.lastSeq === b.store.lastSeq());
    expect(await client.call("task.cancel", { taskId })).toEqual({ status: "CANCELLED" });
    const N = b.store.lastSeq();
    expect(b.store.read(1).filter((e) => e.type === "ApprovalDecided")).toHaveLength(1);
    await until(() => received.length >= N);
    expect(received).toEqual(range(N));
    expect(client.gaps).toBe(0);
    expect(client.dropped).toBe(0);
    expect(client.connected).toBe(true);
  });
});

describe("rpc (m) 최종리뷰I2 combos 호스트 OS 대조", () => {
  it("combos[*].os 가 데몬 호스트 OS 와 다르면 -32602 이고 정책·저널은 불변(렌더러가 경고 없는 조합을 자칭할 수 없다)", async () => {
    const b = await boot();
    const { client } = await connect(b.stateDir);
    const hostOs = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
    const foreign = hostOs === "linux" ? "windows" : "linux";
    const auto = { ...DEFAULT_POLICY, permissionMode: { claude: "default", codex: { approvalPolicy: "never", sandbox: "workspaceWrite" } } };
    const before = b.store.lastSeq();
    const e = await client.call("policy.set", { projectId: "p1", policy: auto, combos: { codex: { provider: "codex", os: foreign, sandbox: "workspaceWrite", variant: "elevated" } } }).catch((err: unknown) => err);
    expect(e).toBeInstanceOf(RpcCallError);
    expect((e as RpcCallError).code).toBe(-32602);
    expect((e as RpcCallError).message).toMatch(new RegExp(`${foreign}.*${hostOs}|${hostOs}.*${foreign}`));
    expect(b.gate.policy().permissionMode).toEqual(DEFAULT_POLICY.permissionMode);
    expect(b.store.lastSeq()).toBe(before);
  });
});
});
