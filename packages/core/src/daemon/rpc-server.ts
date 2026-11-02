/**
 * 데몬 WS JSON-RPC 서버 (P01 T2, AC-P01-3·5). 127.0.0.1 전용, S5 HMAC 상호 인증 핸드셰이크(protocol.ts) 뒤 JSON-RPC 2.0.
 * - params 는 `RPC_PARAMS_SCHEMA` 로 검증(-32602), control 메서드는 role=main 연결만(-32001)
 * - `events.subscribe{fromSeq}` → `store.subscribe(fromSeq)` 로 fromSeq 이후 전부를 `events.batch`(≤100건·10ms 코얼레싱, 배치 안 seq 연속)로 전송
 * - 상태 변경은 전부 Scheduler/ApprovalCoordinator/PolicyGate 공개 메서드를 거친다(전이 단일 경로)
 * - `hooks.mutateBatch` 는 테스트 전용(재전송·건너뜀 주입)
 */
import { randomBytes } from "node:crypto";
import type { JournalEvent, RpcId, RpcMethod, RpcResponse } from "@agent-studio/protocol";
import { isRpcMethod, methodClass, RPC_ERRORS, RPC_INTERNAL_ERROR, RPC_INVALID_REQUEST, RPC_PROTOCOL_VERSION, validateParams, validatePolicy } from "@agent-studio/protocol";
import type { ProjectPolicy } from "@agent-studio/protocol";
import { WebSocketServer, type WebSocket } from "ws";
import { ApprovalError, type ApprovalBroker, type Decision } from "../approval-broker.js";
import type { ApprovalCoordinator } from "../approval-coordinator.js";
import { allWarnings, type Combos, type PolicyGate } from "../isolation.js";
import type { EventStore } from "../journal/event-store.js";
import { Scheduler, SchedulerError } from "../scheduler.js";
import { ownCreationTime, removeLock, writeLock, type LockFile } from "./lock.js";
import { CLIENT_ROLES, CLOSE_HELLO_TIMEOUT, CLOSE_PROTOCOL_MISMATCH, CLOSE_UNAUTHORIZED, HELLO_TIMEOUT_MS, PROTOCOL_VERSION, proof, proofEquals, type ClientRole } from "./protocol.js";

export interface RpcServerOptions {
  store: EventStore;
  scheduler: Scheduler;
  broker: ApprovalBroker;
  coordinator: ApprovalCoordinator;
  gate: PolicyGate;
  token: string;
  stateDir: string;
  port?: number;
  tokenRef?: string;
  now?: () => number;
  /** daemon.shutdown 응답 뒤 서버가 닫힌 다음 호출 */
  onShutdown?: () => void;
}

export interface RpcServer {
  port: number;
  lock: LockFile;
  stats(): { connections: number; authFailures: number };
  close(): Promise<void>;
  hooks: { mutateBatch?: (events: JournalEvent[]) => JournalEvent[] };
}

const BATCH_MAX = 100;
const BATCH_DELAY_MS = 10;

interface Conn {
  ws: WebSocket;
  role: ClientRole;
  unsub?: () => void;
  queue: JournalEvent[];
  timer?: NodeJS.Timeout;
}

class RpcFailure extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
  }
}

export async function startRpcServer(opts: RpcServerOptions): Promise<RpcServer> {
  const { store, scheduler, broker, coordinator, gate, token, stateDir } = opts;
  const tokenRef = opts.tokenRef ?? "unknown";
  const nonce = randomBytes(16).toString("hex");
  const wss = new WebSocketServer({ host: "127.0.0.1", port: opts.port ?? 0 });
  await new Promise<void>((resolve, reject) => {
    wss.once("listening", () => resolve());
    wss.once("error", reject);
  });
  const port = (wss.address() as { port: number }).port;
  const lock: LockFile = { pid: process.pid, startedAt: ownCreationTime(), nonce, port, protocolVersion: PROTOCOL_VERSION, tokenRef };
  writeLock(stateDir, lock);

  const conns = new Set<Conn>();
  let authFailures = 0;
  let closed = false;
  const hooks: RpcServer["hooks"] = {};

  // user_input 보류 추적(request_id → kind): UserInputRequested 로 생기고 UserInputAnswered 로 사라진다
  const pendingInputs = new Map<string, string>();
  const unsubInputs = store.subscribe(0, (e) => {
    if (e.type === "UserInputRequested" && typeof e.payload.request_id === "string") pendingInputs.set(e.payload.request_id, String(e.payload.kind));
    else if (e.type === "UserInputAnswered" && typeof e.payload.request_id === "string") pendingInputs.delete(e.payload.request_id);
  });

  const send = (ws: WebSocket, body: unknown) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(body));
  };
  const reject = (ws: WebSocket, code: number, reason: string) => {
    if (code === CLOSE_UNAUTHORIZED) authFailures++;
    ws.close(code, reason);
  };

  function flush(conn: Conn): void {
    conn.timer = undefined;
    if (!conn.queue.length) return;
    let events = conn.queue.splice(0, conn.queue.length);
    if (hooks.mutateBatch) events = hooks.mutateBatch(events);
    send(conn.ws, { jsonrpc: "2.0", method: "events.batch", params: { events } });
  }
  function enqueue(conn: Conn, e: JournalEvent): void {
    conn.queue.push(e);
    if (conn.queue.length >= BATCH_MAX) {
      if (conn.timer) clearTimeout(conn.timer);
      flush(conn);
    } else if (!conn.timer) conn.timer = setTimeout(() => flush(conn), BATCH_DELAY_MS);
  }
  function dropConn(conn: Conn): void {
    conn.unsub?.();
    conn.unsub = undefined;
    if (conn.timer) clearTimeout(conn.timer);
    conn.timer = undefined;
    conn.queue.length = 0;
    conns.delete(conn);
  }

  async function close(): Promise<void> {
    if (closed) return;
    closed = true;
    unsubInputs();
    for (const c of [...conns]) {
      dropConn(c);
      try {
        c.ws.close(1001, "server shutdown");
      } catch {
        /* ignore */
      }
    }
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    removeLock(stateDir);
  }

  const toRpcError = (err: unknown): { code: number; message: string; data?: unknown } => {
    if (err instanceof RpcFailure) return { code: err.code, message: err.message, ...(err.data !== undefined && { data: err.data }) };
    if (err instanceof ApprovalError) return { code: RPC_ERRORS.APPROVAL_ERROR, message: err.message, data: { code: err.code } };
    if (err instanceof SchedulerError) {
      const data = { code: err.code };
      if (err.code === "stale_writer") return { code: RPC_ERRORS.STALE_WRITER, message: err.message, data };
      if (err.code === "not_pending") return { code: RPC_ERRORS.NOT_PENDING, message: err.message, data };
      if (err.code === "unknown_task" || err.code === "invalid_kind" || err.code === "duplicate_task") return { code: RPC_ERRORS.INVALID_PARAMS, message: err.message, data };
      return { code: RPC_ERRORS.PRECONDITION_FAILED, message: err.message, data };
    }
    return { code: RPC_INTERNAL_ERROR, message: err instanceof Error ? err.message : String(err) };
  };

  function dispatch(conn: Conn, method: RpcMethod, params: Record<string, unknown>): unknown {
    switch (method) {
      case "daemon.status":
        return { pid: process.pid, seq: store.lastSeq(), protocolVersion: RPC_PROTOCOL_VERSION, tokenRef, nonce, startedAt: lock.startedAt, connections: conns.size };
      case "events.subscribe": {
        conn.unsub?.();
        if (conn.timer) clearTimeout(conn.timer);
        conn.timer = undefined;
        conn.queue.length = 0;
        const fromSeq = Math.max(1, Number(params.fromSeq));
        conn.unsub = store.subscribe(fromSeq, (e) => enqueue(conn, e));
        return { lastSeq: store.lastSeq() };
      }
      case "task.get":
        return scheduler.state(String(params.taskId));
      case "task.list":
        return scheduler.list();
      case "approval.pending":
        return broker.pending();
      case "policy.get":
        return { policy: gate.policy(), badge: gate.badge() };
      case "capabilities.get":
        return { isolationWarnings: allWarnings(store), tokenRef, protocolVersion: RPC_PROTOCOL_VERSION };
      case "task.submit":
        return { taskId: scheduler.submit({ title: String(params.title), kind: params.kind as never, ...(typeof params.phaseId === "string" && { phaseId: params.phaseId }) }) };
      case "task.cancel":
        return { status: scheduler.transition(String(params.taskId), "cancel", { kind: "user" }) };
      case "task.unblock":
        return { status: scheduler.transition(String(params.taskId), "unblocked", { kind: "user" }) };
      case "task.abandon":
        return { status: scheduler.transition(String(params.taskId), "user_abandon", { kind: "user" }) };
      case "approval.decide":
        coordinator.decide(String(params.requestId), params.decision as Decision, "user", params.scope as never);
        return {};
      case "policy.set": {
        const errors = validatePolicy(params.policy);
        if (errors.length) throw new RpcFailure(RPC_ERRORS.INVALID_PARAMS, "invalid policy", { errors });
        try {
          return gate.setPolicy(params.policy as ProjectPolicy, (params.combos as Combos | undefined) ?? {}, "user");
        } catch (e) {
          if (e instanceof Error && /combo/.test(e.message)) throw new RpcFailure(RPC_ERRORS.INVALID_PARAMS, e.message);
          throw e;
        }
      }
      case "user_input.answer": {
        const requestId = String(params.requestId);
        const kind = pendingInputs.get(requestId);
        if (kind === undefined) throw new RpcFailure(RPC_ERRORS.NOT_PENDING, `no pending user_input request ${requestId}`);
        const answers = params.answers as Record<string, string>;
        if (kind === "isolation_confirm") {
          if (answers.answer !== "confirmed" && answers.answer !== "rejected") throw new RpcFailure(RPC_ERRORS.INVALID_PARAMS, "isolation_confirm answer must be 'confirmed' or 'rejected'");
          return gate.confirm(requestId, answers.answer === "confirmed");
        }
        store.append({ type: "UserInputAnswered", correlationId: requestId, payload: { request_id: requestId, kind, answers } });
        return { status: "answered" };
      }
      case "daemon.shutdown":
        setImmediate(() => {
          void close().then(() => opts.onShutdown?.());
        });
        return { ok: true };
    }
  }

  function handleRpc(conn: Conn, raw: unknown): void {
    type Incoming = { jsonrpc?: unknown; id?: unknown; method?: unknown; params?: unknown };
    let msg: Incoming | null = null;
    try {
      msg = JSON.parse(String(raw)) as Incoming;
    } catch {
      /* fallthrough */
    }
    const id: RpcId | null = msg && (typeof msg.id === "number" || typeof msg.id === "string") ? msg.id : null;
    const reply = (body: RpcResponse) => send(conn.ws, body);
    if (!msg || msg.jsonrpc !== "2.0" || id === null || typeof msg.method !== "string") {
      return reply({ jsonrpc: "2.0", id, error: { code: RPC_INVALID_REQUEST, message: "invalid request" } });
    }
    const method = msg.method;
    if (!isRpcMethod(method)) return reply({ jsonrpc: "2.0", id, error: { code: RPC_ERRORS.METHOD_NOT_FOUND, message: `method not found: ${method}` } });
    if (methodClass(method) === "control" && conn.role !== "main") return reply({ jsonrpc: "2.0", id, error: { code: RPC_ERRORS.UNAUTHORIZED, message: `control method ${method} requires role main (got ${conn.role})` } });
    const errors = validateParams(method, msg.params);
    if (errors.length) return reply({ jsonrpc: "2.0", id, error: { code: RPC_ERRORS.INVALID_PARAMS, message: "invalid params", data: { errors } } });
    try {
      const result = dispatch(conn, method, ((msg.params as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>);
      reply({ jsonrpc: "2.0", id, result: result ?? {} });
    } catch (err) {
      reply({ jsonrpc: "2.0", id, error: toRpcError(err) });
    }
  }

  wss.on("connection", (ws) => {
    const timer = setTimeout(() => ws.close(CLOSE_HELLO_TIMEOUT, "hello timeout"), HELLO_TIMEOUT_MS);
    let stage: "hello" | "auth" | "done" = "hello";
    let serverNonce = "";
    let clientNonce = "";
    let role: ClientRole = "main";
    let conn: Conn | undefined;
    ws.on("message", (raw) => {
      if (stage === "done" && conn) return handleRpc(conn, raw);
      let msg: { type?: unknown; clientNonce?: unknown; protocolVersion?: unknown; role?: unknown; clientProof?: unknown } = {};
      try {
        msg = JSON.parse(String(raw)) as typeof msg;
      } catch {
        /* 형식 오류 → 아래에서 거부 */
      }
      if (stage === "hello") {
        clearTimeout(timer);
        if (msg.type !== "hello" || typeof msg.clientNonce !== "string" || !msg.clientNonce) return reject(ws, CLOSE_UNAUTHORIZED, "unauthorized");
        if (msg.protocolVersion !== PROTOCOL_VERSION) return reject(ws, CLOSE_PROTOCOL_MISMATCH, `protocol mismatch: daemon=${PROTOCOL_VERSION}`);
        if (!(CLIENT_ROLES as readonly unknown[]).includes(msg.role)) return reject(ws, CLOSE_UNAUTHORIZED, "unauthorized");
        role = msg.role as ClientRole;
        clientNonce = msg.clientNonce;
        serverNonce = randomBytes(16).toString("hex");
        stage = "auth";
        send(ws, { type: "challenge", serverNonce, nonce, pid: process.pid, serverProof: proof(token, serverNonce, clientNonce, "server") });
        return;
      }
      if (msg.type !== "auth" || !proofEquals(typeof msg.clientProof === "string" ? msg.clientProof : undefined, proof(token, serverNonce, clientNonce, "client"))) {
        return reject(ws, CLOSE_UNAUTHORIZED, "unauthorized");
      }
      stage = "done";
      conn = { ws, role, queue: [] };
      conns.add(conn);
      send(ws, { type: "welcome", seq: store.lastSeq(), pid: process.pid, nonce, protocolVersion: PROTOCOL_VERSION, role });
    });
    ws.on("close", () => {
      clearTimeout(timer);
      if (conn) dropConn(conn);
    });
    ws.on("error", () => {
      /* close 가 뒤따른다 */
    });
  });

  return { port, lock, stats: () => ({ connections: conns.size, authFailures }), close, hooks };
}
