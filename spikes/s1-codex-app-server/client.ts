/**
 * S1a — `codex app-server` stdio JSONL JSON-RPC 클라이언트 (P02 CodexAppServerAdapter 초안 인터페이스).
 *
 * 프레이밍(실측 0.166.0): 한 줄 = 한 메시지. `jsonrpc` 필드 없음.
 *   클라이언트→서버 요청  {id, method, params}
 *   서버→클라이언트 응답  {id, result} | {id, error}
 *   서버→클라이언트 요청  {id, method, params}   (item/fileChange/requestApproval 등)
 *   알림                 {method, params, emittedAtMs?}
 * 바이너리: 환경변수 CODEX_BIN(기본 "codex"). 사용자 config.toml은 수정하지 않고 -c 오버라이드만 쓴다.
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";

export type ApprovalPolicy =
  | "untrusted"
  | "on-request"
  | "never"
  | { granular: { mcp_elicitations: boolean; rules: boolean; sandbox_approval: boolean; request_permissions?: boolean; skill_approval?: boolean } };

export type SandboxPolicy =
  | { type: "readOnly"; networkAccess?: boolean }
  | { type: "workspaceWrite"; writableRoots?: string[]; networkAccess?: boolean; excludeTmpdirEnvVar?: boolean; excludeSlashTmp?: boolean };

export type UserInput = { type: "text"; text: string } | { type: "skill"; name: string; path: string } | { type: "localImage"; path: string };

export interface Turn {
  id: string;
  status: "completed" | "interrupted" | "failed" | "inProgress";
  items: unknown[];
  error?: { message: string } | null;
}

export interface ServerRequest {
  id: number | string;
  method: string;
  params: Record<string, unknown>;
}

export interface Notification {
  method: string;
  params: Record<string, unknown>;
  emittedAtMs?: number;
}

export interface TurnStartOptions {
  approvalPolicy?: ApprovalPolicy;
  sandboxPolicy?: SandboxPolicy;
  cwd?: string;
  model?: string;
  config?: Record<string, unknown>;
}

export interface RecordedEvent {
  t: number;
  dir: "out" | "in";
  msg: unknown;
}

export class RpcError extends Error {
  constructor(public readonly code: number, message: string, public readonly data?: unknown) {
    super(message);
  }
}

export interface ClientOptions {
  label?: string;
  codexBin?: string;
  /** `-c key=value` 오버라이드(사용자 config.toml 무수정 원칙) */
  configOverrides?: string[];
  /** 테스트용: ["app-server", ...] 대신 쓸 인자(가짜 서버 주입 심) */
  spawnArgs?: string[];
  env?: NodeJS.ProcessEnv;
  requestTimeoutMs?: number;
}

export class AppServerClient {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; method: string }>();
  private events = new EventEmitter();
  private serverRequestHandlers: ((req: ServerRequest) => void)[] = [];
  private recorded: RecordedEvent[] = [];
  private usage = new Map<string, { count: number; last: unknown; total: unknown }>();
  private usageByTurn = new Map<string, number>();
  private completedTurns = new Map<string, Turn>();
  private resolvedRequests: (number | string)[] = [];
  private protocolErrors: { line: string; error: string }[] = [];
  private stderrBuf = "";
  private exitInfo: { code: number | null; signal: string | null } | null = null;
  readonly label: string;

  constructor(private readonly opts: ClientOptions = {}) {
    this.label = opts.label ?? "codex-app-server";
    this.events.setMaxListeners(100);
  }

  /** 프로세스 기동 + `initialize` → `initialized` */
  async initialize(capabilities?: { experimentalApi?: boolean }): Promise<unknown> {
    this.start();
    const result = await this.request("initialize", {
      clientInfo: { name: "agent-studio-spike", title: "Agent Studio P00 spike", version: "0.0.0" },
      ...(capabilities ? { capabilities } : {}),
    });
    this.notify("initialized", {});
    return result;
  }

  start(): void {
    if (this.proc) return;
    const bin = this.opts.codexBin ?? process.env.CODEX_BIN ?? "codex";
    const args = this.opts.spawnArgs ? [...this.opts.spawnArgs] : ["app-server"];
    if (!this.opts.spawnArgs) for (const o of this.opts.configOverrides ?? []) args.push("-c", o);
    this.proc = spawn(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this.opts.env },
      windowsHide: true,
    });
    this.proc.on("exit", (code, signal) => {
      this.exitInfo = { code, signal };
      for (const [id, p] of this.pending) {
        p.reject(new Error(`[${this.label}] app-server exited (code=${code}, signal=${signal}) before response to ${p.method}#${id}`));
      }
      this.pending.clear();
      this.events.emit("exit", this.exitInfo);
    });
    this.proc.stderr.setEncoding("utf8");
    this.proc.stderr.on("data", (d: string) => {
      this.stderrBuf += d;
      if (this.stderrBuf.length > 200_000) this.stderrBuf = this.stderrBuf.slice(-100_000);
    });
    const rl = createInterface({ input: this.proc.stdout });
    rl.on("line", (line) => this.onLine(line));
  }

  private onLine(line: string): void {
    if (!line.trim()) return;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(line) as Record<string, unknown>;
    } catch (e) {
      this.recorded.push({ t: Date.now(), dir: "in", msg: { unparsed: line } });
      this.protocolErrors.push({ line: line.slice(0, 500), error: String(e) });
      this.events.emit("protocolError", this.protocolErrors.at(-1));
      return;
    }
    this.recorded.push({ t: Date.now(), dir: "in", msg });
    const hasId = msg.id !== undefined && msg.id !== null;
    if (hasId && typeof msg.method === "string") {
      const req: ServerRequest = { id: msg.id as number | string, method: msg.method, params: (msg.params as Record<string, unknown>) ?? {} };
      this.events.emit("serverRequest", req);
      for (const h of this.serverRequestHandlers) h(req);
      return;
    }
    if (hasId) {
      const p = this.pending.get(msg.id as number);
      if (!p) return;
      this.pending.delete(msg.id as number);
      if (msg.error) {
        const e = msg.error as { code?: number; message?: string; data?: unknown };
        p.reject(new RpcError(e.code ?? -1, `[${this.label}] ${p.method}: ${e.message ?? "error"}`, e.data));
      } else {
        p.resolve(msg.result);
      }
      return;
    }
    if (typeof msg.method === "string") {
      const n: Notification = { method: msg.method, params: (msg.params as Record<string, unknown>) ?? {}, emittedAtMs: msg.emittedAtMs as number | undefined };
      if (n.method === "thread/tokenUsage/updated") {
        const tid = n.params.threadId as string;
        const tu = n.params.tokenUsage as { last: unknown; total: unknown };
        const cur = this.usage.get(tid) ?? { count: 0, last: undefined, total: undefined };
        this.usage.set(tid, { count: cur.count + 1, last: tu?.last, total: tu?.total });
        const tk = `${tid}:${n.params.turnId as string}`;
        this.usageByTurn.set(tk, (this.usageByTurn.get(tk) ?? 0) + 1);
      } else if (n.method === "turn/completed") {
        const turn = n.params.turn as Turn;
        this.completedTurns.set(`${n.params.threadId as string}:${turn.id}`, turn);
      } else if (n.method === "serverRequest/resolved") {
        this.resolvedRequests.push(n.params.requestId as number | string);
      }
      this.events.emit("notification", n);
      this.events.emit(`notification:${n.method}`, n);
    }
  }

  private send(msg: Record<string, unknown>): void {
    if (!this.proc) throw new Error(`[${this.label}] not started`);
    this.recorded.push({ t: Date.now(), dir: "out", msg });
    this.proc.stdin.write(JSON.stringify(msg) + "\n");
  }

  request<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs = this.opts.requestTimeoutMs ?? 120_000): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`[${this.label}] ${method}#${id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        method,
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v as T);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.send({ id, method, params });
    });
  }

  notify(method: string, params: Record<string, unknown> = {}): void {
    this.send({ method, params });
  }

  // ---- 서버→클라이언트 요청 ----
  onServerRequest(cb: (req: ServerRequest) => void): () => void {
    this.serverRequestHandlers.push(cb);
    return () => {
      this.serverRequestHandlers = this.serverRequestHandlers.filter((h) => h !== cb);
    };
  }

  respond(requestId: number | string, result: Record<string, unknown>): void {
    this.send({ id: requestId, result });
  }

  respondError(requestId: number | string, code: number, message: string): void {
    this.send({ id: requestId, error: { code, message } });
  }

  // ---- 알림 구독 ----
  onNotification(method: string, cb: (n: Notification) => void): () => void {
    const ev = `notification:${method}`;
    this.events.on(ev, cb);
    return () => this.events.off(ev, cb);
  }

  waitForNotification(method: string, pred: (n: Notification) => boolean, timeoutMs = 10 * 60_000): Promise<Notification> {
    return new Promise((resolve, reject) => {
      const off = this.onNotification(method, (n) => {
        if (pred(n)) {
          clearTimeout(timer);
          off();
          offExit();
          resolve(n);
        }
      });
      const onExit = () => {
        clearTimeout(timer);
        off();
        reject(new Error(`[${this.label}] app-server exited while waiting for ${method}\n--- stderr tail ---\n${this.stderrTail()}`));
      };
      const offExit = () => this.events.off("exit", onExit);
      this.events.once("exit", onExit);
      const timer = setTimeout(() => {
        off();
        offExit();
        reject(new Error(`[${this.label}] waiting for ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  // ---- 스레드·턴 ----
  async threadStart(cwd: string, extra: Record<string, unknown> = {}): Promise<{ threadId: string; raw: unknown }> {
    const res = await this.request<{ thread: { id: string } }>("thread/start", { cwd, ...extra });
    return { threadId: res.thread.id, raw: res };
  }

  async turnStart(threadId: string, input: UserInput[], opts: TurnStartOptions = {}): Promise<Turn> {
    const res = await this.request<{ turn: Turn }>("turn/start", { threadId, input, ...opts });
    return res.turn;
  }

  waitForTurnCompleted(threadId: string, turnId: string, timeoutMs?: number): Promise<{ turn: Turn }> {
    // 구독 전에 이미 도착한 완료 알림(turn/start 응답과 같은 청크에 올 수 있음)
    const buffered = this.completedTurns.get(`${threadId}:${turnId}`);
    if (buffered) return Promise.resolve({ turn: buffered });
    return this.waitForNotification(
      "turn/completed",
      (n) => n.params.threadId === threadId && (n.params.turn as Turn)?.id === turnId,
      timeoutMs,
    ).then((n) => ({ turn: n.params.turn as Turn }));
  }

  async turnSteer(threadId: string, expectedTurnId: string, text: string): Promise<unknown> {
    return this.request("turn/steer", { threadId, expectedTurnId, input: [{ type: "text", text }] });
  }

  async turnInterrupt(threadId: string, turnId: string): Promise<unknown> {
    return this.request("turn/interrupt", { threadId, turnId });
  }

  async threadResume(threadId: string, extra: Record<string, unknown> = {}): Promise<unknown> {
    return this.request("thread/resume", { threadId, ...extra });
  }

  async threadFork(threadId: string, lastTurnId?: string, extra: Record<string, unknown> = {}): Promise<unknown> {
    return this.request("thread/fork", { threadId, ...(lastTurnId ? { lastTurnId } : {}), ...extra });
  }

  async skillsList(cwds: string[] = [], forceReload = false): Promise<unknown> {
    return this.request("skills/list", { cwds, forceReload });
  }

  /** experimental(`initialize.capabilities.experimentalApi`) — opt-in 없이는 거부되는지 S1b에서 실측 */
  async threadQueueAdd(threadId: string, clientUserMessageId: string, text: string): Promise<unknown> {
    return this.request("thread/queue/add", { threadId, clientUserMessageId, input: [{ type: "text", text }] });
  }

  /** 시그널 전송 후 종료 대기(V14 관찰용). Windows에서는 Node가 모든 시그널을 TerminateProcess로 처리한다. */
  killAndWait(signal: NodeJS.Signals, timeoutMs = 5000): Promise<{ code: number | null; signal: string | null; killed: boolean; elapsedMs: number } | null> {
    const p = this.proc;
    if (!p) return Promise.resolve(this.exitInfo ? { ...this.exitInfo, killed: false, elapsedMs: 0 } : null);
    this.proc = null;
    const t0 = Date.now();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        p.kill();
        resolve(null);
      }, timeoutMs);
      p.once("exit", (code, sig) => {
        clearTimeout(timer);
        resolve({ code, signal: sig, killed: p.killed, elapsedMs: Date.now() - t0 });
      });
      p.kill(signal);
    });
  }

  // ---- 관찰 ----
  /** turnId를 주면 그 턴에 상관된 알림 수만 센다(AC-P00-2 "tokenUsage 상관"). */
  tokenUsage(threadId: string, turnId?: string): { count: number; last: unknown; total: unknown } {
    const u = this.usage.get(threadId) ?? { count: 0, last: undefined, total: undefined };
    if (turnId === undefined) return u;
    return { ...u, count: this.usageByTurn.get(`${threadId}:${turnId}`) ?? 0 };
  }

  resolvedRequestIds(): (number | string)[] {
    return [...this.resolvedRequests];
  }

  protocolErrorList(): { line: string; error: string }[] {
    return [...this.protocolErrors];
  }

  recording(): RecordedEvent[] {
    return this.recorded;
  }

  stderrTail(n = 4000): string {
    return this.stderrBuf.slice(-n);
  }

  get exited(): { code: number | null; signal: string | null } | null {
    return this.exitInfo;
  }

  get pid(): number | undefined {
    return this.proc?.pid;
  }

  /** stdin 종료 → 정상 종료 대기 → 미종료 시 kill */
  async close(graceMs = 3000): Promise<void> {
    const p = this.proc;
    if (!p) return;
    this.proc = null;
    if (this.exitInfo) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        p.kill();
        resolve();
      }, graceMs);
      p.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      p.stdin.end();
    });
  }
}
