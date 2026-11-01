/**
 * S2 — Claude Agent SDK(0.3.316) 러너 (MASTER Interfaces: ClaudeRun { start, onCanUseTool, interrupt, listSessions })
 *
 * - streaming input: push 기반 AsyncIterable<SDKUserMessage> (close() 전까지 열려 있음)
 * - canUseTool 콜백, PreToolUse hook(모든 도구 호출 관찰), permissionMode, includePartialMessages
 * - pathToClaudeCodeExecutable = 감지된 CLI(CLAUDE_BIN → PATH의 claude). SDK는 CLI를 동봉하지 않는다(0.3.316 패키지에 cli 파일 없음).
 * - 모든 수신 메시지를 {t, msg}로 녹화(픽스처)
 */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  getSessionMessages,
  forkSession,
  listSessions,
  query,
  type CanUseTool,
  type HookCallback,
  type Options,
  type PermissionMode,
  type PermissionResult,
  type PreToolUseHookInput,
  type Query,
  type SDKControlInterruptResponse,
  type SDKMessage,
  type SDKResultMessage,
  type SDKSystemMessage,
  type SDKUserMessage,
  type McpServerConfig,
} from "@anthropic-ai/claude-agent-sdk";

export { forkSession, getSessionMessages, listSessions };

/** Claude Code 내장 도구 중 파일·셸 부작용을 내는 것(REQ-CAP-02 판정용) */
export const WRITE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit", "Bash", "PowerShell"]);

export function detectClaudeExecutable(): string {
  // 리뷰 #10: CLAUDE_BIN 은 존재할 때만 신뢰한다(없으면 다음 후보로)
  if (process.env.CLAUDE_BIN && existsSync(process.env.CLAUDE_BIN)) return process.env.CLAUDE_BIN;
  const local = join(homedir(), ".local", "bin", process.platform === "win32" ? "claude.exe" : "claude");
  if (existsSync(local)) return local;
  try {
    const out = execFileSync(process.platform === "win32" ? "where" : "which", ["claude"], { encoding: "utf8" });
    const first = out.split(/\r?\n/).map((s) => s.trim()).find((s) => s && (process.platform !== "win32" || /\.(exe|cmd)$/i.test(s)));
    if (first) return first;
  } catch {
    /* fallthrough */
  }
  return "claude";
}

/** `~/.claude/projects/<encoded cwd>/` — Claude Code가 세션 전사를 두는 폴더(경로의 비영숫자 → '-') */
export function projectSessionDir(cwd: string): string {
  return join(homedir(), ".claude", "projects", cwd.replace(/[^A-Za-z0-9]/g, "-"));
}

export interface ClaudeRunOpts {
  label: string;
  cwd: string;
  permissionMode?: PermissionMode;
  persistSession?: boolean;
  maxTurns?: number;
  mcpServers?: Record<string, McpServerConfig>;
  strictMcpConfig?: boolean;
  env?: Record<string, string>;
  includePartialMessages?: boolean;
  resume?: string;
  executable?: string;
  /** S9: 설정 소스(생략 = CLI 기본 전부, [] = SDK 격리) */
  settingSources?: ("user" | "project" | "local")[];
  /** S9: 추가 CLI 플래그(예: `{ chrome: null }` = `--chrome`) */
  extraArgs?: Record<string, string | null>;
  /** S9: 스킬 컨텍스트 필터 */
  skills?: string[] | "all";
}

export interface Recorded {
  t: number;
  msg: SDKMessage;
}

export interface CanUseToolCall {
  t: number;
  tool: string;
  input: Record<string, unknown>;
  decision: PermissionResult["behavior"];
}

export interface PreToolUseSeen {
  t: number;
  tool_name: string;
  tool_input: unknown;
  tool_use_id: string;
}

export class PushIterable<T> implements AsyncIterable<T> {
  private queue: T[] = [];
  private waiters: ((r: IteratorResult<T>) => void)[] = [];
  private closed = false;
  get isClosed() {
    return this.closed;
  }
  push(v: T) {
    if (this.closed) throw new Error("PushIterable: push after close"); // 리뷰 #7
    const w = this.waiters.shift();
    if (w) w({ value: v, done: false });
    else this.queue.push(v);
  }
  close() {
    this.closed = true;
    for (const w of this.waiters.splice(0)) w({ value: undefined as T, done: true });
  }
  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        if (this.queue.length) return Promise.resolve({ value: this.queue.shift() as T, done: false });
        if (this.closed) return Promise.resolve({ value: undefined as T, done: true });
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}

export class ClaudeRun {
  readonly label: string;
  readonly canUseToolCalls: CanUseToolCall[] = [];
  readonly preToolUse: PreToolUseSeen[] = [];
  readonly stderrLines: string[] = [];
  private readonly events: Recorded[] = [];
  private readonly input = new PushIterable<SDKUserMessage>();
  private canUseTool?: (tool: string, input: Record<string, unknown>, options: { signal: AbortSignal; toolUseID: string }) => PermissionResult | Promise<PermissionResult>;
  private q?: Query;
  private loop?: Promise<void>;
  private resultPromise: Promise<SDKResultMessage>;
  private resolveResult!: (r: SDKResultMessage) => void;
  private rejectResult!: (e: unknown) => void;
  private listeners: { pred: (m: SDKMessage) => boolean; resolve: (m: SDKMessage) => void; reject: (e: unknown) => void }[] = [];
  private sessionIdValue?: string;
  /** 턴별 결과(리뷰 #7: 첫 결과 Promise 하나로 여러 턴을 표현하지 않는다) */
  readonly results: SDKResultMessage[] = [];

  constructor(private readonly opts: ClaudeRunOpts) {
    this.label = opts.label;
    this.resultPromise = new Promise((res, rej) => {
      this.resolveResult = res;
      this.rejectResult = rej;
    });
    this.resultPromise.catch(() => undefined);
  }

  onCanUseTool(cb: NonNullable<typeof this.canUseTool>) {
    this.canUseTool = cb;
  }

  /** 첫 사용자 메시지를 보내고 수신 루프를 시작한다(streaming input 모드). */
  async start(text: string): Promise<void> {
    if (this.q) throw new Error(`[${this.label}] already started`);
    const canUseTool: CanUseTool = async (toolName, input, options) => {
      const r = this.canUseTool ? await this.canUseTool(toolName, input, options) : ({ behavior: "deny", message: "spike: no canUseTool registered" } as PermissionResult);
      this.canUseToolCalls.push({ t: Date.now(), tool: toolName, input, decision: r.behavior });
      return r;
    };
    const preToolUse: HookCallback = async (input) => {
      const i = input as PreToolUseHookInput;
      this.preToolUse.push({ t: Date.now(), tool_name: i.tool_name, tool_input: i.tool_input, tool_use_id: i.tool_use_id });
      return {};
    };
    const options: Options = {
      cwd: this.opts.cwd,
      pathToClaudeCodeExecutable: this.opts.executable ?? detectClaudeExecutable(),
      permissionMode: this.opts.permissionMode ?? "default",
      includePartialMessages: this.opts.includePartialMessages ?? true,
      canUseTool,
      hooks: { PreToolUse: [{ hooks: [preToolUse] }] },
      persistSession: this.opts.persistSession,
      maxTurns: this.opts.maxTurns,
      mcpServers: this.opts.mcpServers,
      strictMcpConfig: this.opts.strictMcpConfig,
      env: this.opts.env,
      resume: this.opts.resume,
      stderr: (d) => this.stderrLines.push(d),
      ...(this.opts.settingSources ? { settingSources: this.opts.settingSources } : {}),
      ...(this.opts.extraArgs ? { extraArgs: this.opts.extraArgs } : {}),
      ...(this.opts.skills ? { skills: this.opts.skills } : {}),
    };
    this.q = query({ prompt: this.input, options });
    this.send(text);
    this.loop = this.consume();
  }

  send(text: string) {
    if (this.input.isClosed) throw new Error(`[${this.label}] send after close`);
    this.input.push({ type: "user", message: { role: "user", content: text }, parent_tool_use_id: null, session_id: this.sessionIdValue ?? "" } as SDKUserMessage);
  }

  private async consume() {
    try {
      for await (const msg of this.q as Query) {
        this.events.push({ t: Date.now(), msg });
        if (msg.type === "system" && msg.subtype === "init") this.sessionIdValue = msg.session_id;
        if (msg.type === "result") {
          this.results.push(msg);
          this.resolveResult(msg);
        }
        for (const l of this.listeners.splice(0)) {
          if (l.pred(msg)) l.resolve(msg);
          else this.listeners.push(l);
        }
      }
      // 리뷰 #7: 결과 없이 스트림이 끝나면 대기자를 확정한다
      const ended = new Error(`[${this.label}] stream ended (results=${this.results.length})`);
      if (this.results.length === 0) this.rejectResult(ended);
      for (const l of this.listeners.splice(0)) l.reject(ended);
    } catch (e) {
      this.rejectResult(e);
      for (const l of this.listeners.splice(0)) l.reject(e);
    }
  }

  /** n번째(1부터) 턴 결과를 기다린다. */
  nthResult(n: number, timeoutMs = 120_000): Promise<SDKResultMessage> {
    if (this.results.length >= n) return Promise.resolve(this.results[n - 1]);
    return this.waitFor((m) => m.type === "result" && this.results.length >= n, timeoutMs) as Promise<SDKResultMessage>;
  }

  result(): Promise<SDKResultMessage> {
    return this.resultPromise;
  }

  waitFor(pred: (m: SDKMessage) => boolean, timeoutMs = 60_000): Promise<SDKMessage> {
    const hit = this.events.find((e) => pred(e.msg));
    if (hit) return Promise.resolve(hit.msg);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`[${this.label}] waitFor timed out after ${timeoutMs}ms`)), timeoutMs);
      this.listeners.push({
        pred,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
    });
  }

  interrupt(): Promise<SDKControlInterruptResponse | undefined> {
    if (!this.q) throw new Error(`[${this.label}] not started`);
    return this.q.interrupt();
  }

  init(): (SDKSystemMessage & { subtype: "init" }) | undefined {
    return this.events.map((e) => e.msg).find((m): m is SDKSystemMessage & { subtype: "init" } => m.type === "system" && m.subtype === "init");
  }

  get sessionId(): string | undefined {
    return this.sessionIdValue;
  }

  recording(): Recorded[] {
    return this.events;
  }

  /** assistant 메시지의 tool_use 블록(id, name) */
  assistantToolUses(): { id: string; name: string }[] {
    const out: { id: string; name: string }[] = [];
    for (const e of this.events) {
      if (e.msg.type !== "assistant") continue;
      for (const b of e.msg.message.content as { type: string; id?: string; name?: string }[]) {
        if (b.type === "tool_use" && b.id && b.name) out.push({ id: b.id, name: b.name });
      }
    }
    return out;
  }

  /** 마지막 assistant 텍스트 */
  finalText(): string | undefined {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const m = this.events[i].msg;
      if (m.type === "assistant") {
        const t = (m.message.content as { type: string; text?: string }[]).filter((b) => b.type === "text").map((b) => b.text).join("\n");
        if (t) return t;
      }
    }
    return undefined;
  }

  /** 입력을 닫고 프로세스 종료를 기다린다. */
  async close(): Promise<void> {
    this.input.close();
    if (!this.q) return;
    const done = (this.loop ?? Promise.resolve()).catch(() => undefined);
    const after = (ms: number) => new Promise<"timeout">((r) => setTimeout(() => r("timeout"), ms));
    if ((await Promise.race([done, after(15_000)])) === "timeout") {
      this.q.close();
      // 리뷰 #7: 강제 종료 뒤에도 대기 상한을 둔다
      await Promise.race([done, after(5_000)]);
    }
  }
}
