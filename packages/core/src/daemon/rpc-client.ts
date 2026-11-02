/**
 * 데몬 RPC 클라이언트 (P01 T2, E4 seq 재구독). 락 파일에서 포트·pid·nonce 를 읽고 HMAC 상호 인증 뒤 JSON-RPC 를 보낸다.
 * - `onEvent` 는 `lastSeq+1` 인 이벤트만 전달: seq ≤ lastSeq 는 폐기(`dropped`), seq > lastSeq+1(갭)이면 그 배치를 버리고
 *   `gaps++` → `onGap` → 자동 `reconnect()`(락 재판정 후 `events.subscribe{fromSeq: lastSeq+1}`)(검토 #5)
 * - 서버 증명이 틀리면(위조 서버·다른 토큰) 클라이언트 증명을 보내지 않고 거부한다
 */
import { randomBytes } from "node:crypto";
import type { JournalEvent, RpcId, RpcMethod } from "@agent-studio/protocol";
import WebSocket from "ws";
import { readLock, type LockFile } from "./lock.js";
import { PROTOCOL_VERSION, proof, proofEquals, type ClientRole, type WelcomeMessage } from "./protocol.js";

export class RpcCallError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "RpcCallError";
  }
}

export interface ConnectOptions {
  stateDir: string;
  token: string;
  lastSeq?: number;
  onEvent: (e: JournalEvent) => void;
  onDisconnect?: () => void;
  onGap?: (expected: number, got: number) => void;
  role?: ClientRole;
  protocolVersion?: number;
  /** 지정하면 stateDir 의 락 파일을 읽지 않는다 */
  lock?: LockFile;
}

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

export class DaemonClient {
  lastSeq: number;
  dropped = 0;
  gaps = 0;
  connected = false;
  welcome?: WelcomeMessage;
  private ws?: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<RpcId, Pending>();
  private reconnecting?: Promise<void>;
  private closedByUser = false;

  private constructor(private readonly opts: ConnectOptions) {
    this.lastSeq = opts.lastSeq ?? 0;
  }

  static async connect(opts: ConnectOptions): Promise<DaemonClient> {
    const c = new DaemonClient(opts);
    await c.open();
    return c;
  }

  /** 락 재판정 + 핸드셰이크 + `events.subscribe{fromSeq: lastSeq+1}` */
  private async open(): Promise<void> {
    const lock = this.opts.lock ?? readLock(this.opts.stateDir);
    if (!lock) throw new Error(`daemon lock not found in ${this.opts.stateDir}`);
    const welcome = await this.handshake(lock);
    this.welcome = welcome;
    this.connected = true;
    await this.call("events.subscribe", { fromSeq: this.lastSeq + 1 });
  }

  private handshake(lock: LockFile): Promise<WelcomeMessage> {
    const { token } = this.opts;
    const protocolVersion = this.opts.protocolVersion ?? PROTOCOL_VERSION;
    const role = this.opts.role ?? "main";
    const clientNonce = randomBytes(16).toString("hex");
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${lock.port}/`);
      this.ws = ws;
      let welcomed = false;
      let failed = false;
      const fail = (e: Error) => {
        if (failed) return;
        failed = true;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(e);
      };
      ws.on("open", () => ws.send(JSON.stringify({ type: "hello", clientNonce, protocolVersion, role })));
      ws.on("error", () => {
        if (!welcomed) fail(new Error("ws error"));
      });
      ws.on("close", (code, reason) => {
        if (!welcomed) return fail(new Error(`closed before welcome: ${code} ${String(reason)}`));
        if (this.ws !== ws) return; // 재접속으로 교체된 옛 소켓
        this.connected = false;
        this.ws = undefined;
        for (const p of this.pending.values()) p.reject(new RpcCallError(-32000, `connection closed (${code})`));
        this.pending.clear();
        if (!this.closedByUser) this.opts.onDisconnect?.();
      });
      ws.on("message", (raw) => {
        if (this.ws !== ws) return; // 교체된 소켓의 늦은 메시지는 무시(갭 처리 중 중복 집계 방지)
        const msg = JSON.parse(String(raw)) as Record<string, unknown>;
        if (!welcomed) {
          if (msg.type === "challenge") {
            const expected = proof(token, String(msg.serverNonce ?? ""), clientNonce, "server");
            if (!proofEquals(typeof msg.serverProof === "string" ? msg.serverProof : undefined, expected) || msg.pid !== lock.pid || msg.nonce !== lock.nonce) {
              return fail(new Error("server proof invalid (daemon identity could not be verified — forged lock or wrong token)"));
            }
            ws.send(JSON.stringify({ type: "auth", clientProof: proof(token, String(msg.serverNonce ?? ""), clientNonce, "client") }));
            return;
          }
          if (msg.type === "welcome") {
            welcomed = true;
            resolve(msg as unknown as WelcomeMessage);
          }
          return;
        }
        if (msg.method === "events.batch") return this.handleBatch(ws, ((msg.params as { events?: JournalEvent[] } | undefined)?.events ?? []) as JournalEvent[]);
        if (msg.id !== undefined && msg.id !== null) {
          const p = this.pending.get(msg.id as RpcId);
          if (!p) return;
          this.pending.delete(msg.id as RpcId);
          if ("error" in msg && msg.error) {
            const e = msg.error as { code: number; message: string; data?: unknown };
            p.reject(new RpcCallError(e.code, e.message, e.data));
          } else p.resolve(msg.result);
        }
      });
    });
  }

  private handleBatch(ws: WebSocket, events: JournalEvent[]): void {
    for (const e of events) {
      if (e.seq <= this.lastSeq) {
        this.dropped++;
        continue;
      }
      if (e.seq !== this.lastSeq + 1) {
        this.gaps++;
        this.opts.onGap?.(this.lastSeq + 1, e.seq);
        // 이 소켓은 더 믿지 않는다: 나머지 배치를 버리고 재구독
        if (this.ws === ws) {
          this.ws = undefined;
          this.connected = false;
          for (const p of this.pending.values()) p.reject(new RpcCallError(-32000, "resubscribing after seq gap"));
          this.pending.clear();
        }
        try {
          ws.terminate();
        } catch {
          /* ignore */
        }
        void this.reconnect().catch(() => {
          /* 재접속 실패는 connected=false 로 드러난다 */
        });
        return;
      }
      this.lastSeq = e.seq;
      this.opts.onEvent(e);
    }
  }

  call<T = unknown>(method: RpcMethod | string, params?: unknown): Promise<T> {
    const ws = this.ws;
    if (!ws || !this.connected || ws.readyState !== WebSocket.OPEN) return Promise.reject(new RpcCallError(-32000, "not connected"));
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, ...(params !== undefined && { params }) }));
    });
  }

  /** 현재 소켓을 버리고 락을 다시 읽어 접속·재구독한다(동시 호출은 하나로 합친다). */
  reconnect(): Promise<void> {
    if (this.reconnecting) return this.reconnecting;
    const old = this.ws;
    this.ws = undefined;
    this.connected = false;
    if (old) {
      try {
        old.terminate();
      } catch {
        /* ignore */
      }
    }
    this.reconnecting = this.open().finally(() => {
      this.reconnecting = undefined;
    });
    return this.reconnecting;
  }

  /** 강제 종료(Shell 크래시 모사 — close 프레임 없이 소켓을 끊는다) */
  terminate(): void {
    this.ws?.terminate();
  }

  close(): void {
    this.closedByUser = true;
    const ws = this.ws;
    this.ws = undefined;
    this.connected = false;
    try {
      ws?.close(1000, "client close");
    } catch {
      /* ignore */
    }
  }
}
