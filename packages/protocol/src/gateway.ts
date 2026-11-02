/**
 * AgentGateway 정식 서명 (P01 T9) — AGENT_INTEGRATION_DESIGN §1 코드 블록이 정본이며 이 파일은 그것을 타입으로 옮긴 것.
 * SYSTEM_ARCHITECTURE §2 표는 요약일 뿐이다. 런타임 값은 `GATEWAY_EVENT_KINDS` 하나만 export 한다.
 */

export type AgentKind = "claude" | "codex";

/** `claude:<uuid>` / `codex:<thread_id>` (DATABASE_SCHEMA `sessions.ref`) */
export type SessionRef = `claude:${string}` | `codex:${string}`;

export type SteerResult = "applied_to_turn" | "queued_next_turn";

export interface Capabilities {
  agent: AgentKind;
  version: string;
  features: Record<string, boolean>;
}

export interface SessionInfo {
  ref: SessionRef;
  agent: AgentKind;
  projectDir?: string;
  createdAt: string;
  lastSeenAt?: string;
  title?: string;
  archived?: boolean;
}

export interface SessionTranscript {
  ref: SessionRef;
  items: unknown[];
}

export type PromptInput =
  | { type: "text"; text: string }
  | { type: "image"; path: string }
  | { type: "skill"; name: string; path?: string };

export interface AgentPolicy {
  claude?: { permissionMode: "plan" | "default" | "acceptEdits" | "auto" | "bypassPermissions" | "dontAsk" };
  codex?: { approvalPolicy: "untrusted" | "on-request" | "never"; sandbox: "readOnly" | "workspaceWrite" };
}

export interface SkillRef {
  id: string;
  path: string;
  mode: "implicit" | "explicit";
}

export interface McpAllowlist {
  servers: string[];
}

export interface RunSpec {
  agent: AgentKind;
  projectDir: string;
  worktreeDir: string;
  mode: "new" | "resume" | "fork";
  sessionRef?: SessionRef;
  forkAt?: string;
  prompt: PromptInput[];
  policy: AgentPolicy;
  skills: SkillRef[];
  mcp: McpAllowlist;
  authMode: "cli_login" | "api_key";
}

export type ApprovalAnswer = {
  kind: "approval";
  decision: "accept" | "decline" | "cancel";
  permissions?: Record<string, unknown>;
};
export type UserInputAnswer = { kind: "user_input"; answers: Record<string, string> };
export type ElicitationAnswer = {
  kind: "elicitation";
  action: "accept" | "decline" | "cancel";
  content?: Record<string, unknown>;
};

export const GATEWAY_EVENT_KINDS = [
  "message_delta",
  "item_started",
  "item_updated",
  "item_finished",
  "approval_requested",
  "user_input_requested",
  "mcp_elicitation_requested",
  "usage_updated",
  "turn_finished",
  "fault",
] as const;
export type GatewayEventKind = (typeof GATEWAY_EVENT_KINDS)[number];

/** 모든 이벤트 공통 필드 + 원본 보존 포인터(§1 "모든 이벤트에 native") */
interface GatewayEventBase {
  runId: string;
  seq: number;
  ts: string;
  agent: AgentKind;
  native: { schemaVersion: string; payloadRef: string };
}

export type ItemKind =
  | "message"
  | "tool"
  | "file_change"
  | "mcp"
  | "web_search"
  | "plan"
  | "reasoning"
  | "compaction"
  | "review";

export interface TokenUsage {
  input: number;
  cached_input: number;
  cache_write: number;
  output: number;
  reasoning: number;
}

export type GatewayEvent =
  | (GatewayEventBase & { kind: "message_delta"; itemKey: string; text: string })
  | (GatewayEventBase & { kind: "item_started"; itemKind: ItemKind; itemKey: string; summary: string })
  | (GatewayEventBase & { kind: "item_updated"; itemKey: string; progress: unknown })
  | (GatewayEventBase & { kind: "item_finished"; itemKey: string; status: string; result: string })
  | (GatewayEventBase & {
      kind: "approval_requested";
      requestId: string;
      category: string;
      request: unknown;
      itemKey: string;
      permissions?: unknown;
      scope?: unknown;
    })
  | (GatewayEventBase & { kind: "user_input_requested"; requestId: string; questions: unknown[]; itemKey: string })
  | (GatewayEventBase & {
      kind: "mcp_elicitation_requested";
      requestId: string;
      serverName: string;
      mode: "form" | "url";
      schema: unknown;
    })
  | (GatewayEventBase & { kind: "usage_updated"; tokens: TokenUsage; cost_estimate_usd?: number; turnKey: string })
  | (GatewayEventBase & { kind: "turn_finished"; status: "completed" | "failed" | "interrupted" | "denied"; turnKey: string })
  | (GatewayEventBase & {
      kind: "fault";
      class: "auth" | "quota" | "transport" | "upstream_http" | "overload" | "protocol" | "internal";
      retryable: boolean;
      native: { schemaVersion: string; payloadRef: string };
    });

export interface RunHandle {
  readonly runId: string;
  readonly sessionRef: SessionRef;
  events(): AsyncIterable<GatewayEvent>;
  steer(text: string): Promise<SteerResult>;
  interrupt(): Promise<void>;
  respond(requestId: string, answer: ApprovalAnswer | UserInputAnswer | ElicitationAnswer): Promise<void>;
  close(): Promise<void>;
}

export interface AgentGateway {
  capabilities(agent: AgentKind): Promise<Capabilities>;
  startRun(spec: RunSpec): Promise<RunHandle>;
  listSessions(agent: AgentKind, filter: { projectDir?: string; includeArchived?: boolean }): Promise<SessionInfo[]>;
  readSession(ref: SessionRef): Promise<SessionTranscript>;
}
