/**
 * Shell↔데몬 JSON-RPC 2.0 계약 (P01 T2, SYSTEM_ARCHITECTURE §1 RPC 접속 계약).
 * - 메서드는 read/write/control 로 분류한다. `task.transition` 은 노출하지 않는다(검토 #1·#7): lease 전이는 데몬 내부 run 경로,
 *   승인 결과 전이는 ApprovalCoordinator, 사용자 조작은 task.cancel/unblock/abandon. control(`daemon.shutdown`)은 main↔데몬 전용.
 * - params 스키마(`RPC_PARAMS_SCHEMA`)는 데몬(-32602)과 Shell ipc-guard 양쪽이 같은 것으로 검증한다(검토 #6).
 *   `policy.set.policy` 는 형태만 여기서 보고 내용은 `validatePolicy`(policy.schema.json)가 본다.
 * - 서버→클라이언트 알림: `{jsonrpc:'2.0', method:'events.batch', params:{events: JournalEvent[]}}`.
 */
import { Ajv } from "ajv";
import type { JournalEvent } from "./events.js";
import { TASK_KINDS } from "./events.js";

export const RPC_PROTOCOL_VERSION = 1;

export const RPC_METHODS = {
  read: ["daemon.status", "events.subscribe", "task.get", "task.list", "approval.pending", "policy.get", "capabilities.get"],
  write: ["task.submit", "task.cancel", "task.unblock", "task.abandon", "approval.decide", "policy.set", "user_input.answer"],
  control: ["daemon.shutdown"],
} as const;
export type RpcMethodClass = keyof typeof RPC_METHODS;
export type RpcReadMethod = (typeof RPC_METHODS.read)[number];
export type RpcWriteMethod = (typeof RPC_METHODS.write)[number];
export type RpcControlMethod = (typeof RPC_METHODS.control)[number];
export type RpcMethod = RpcReadMethod | RpcWriteMethod | RpcControlMethod;

export const RPC_ERRORS = {
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  UNAUTHORIZED: -32001,
  STALE_WRITER: -32003,
  PRECONDITION_FAILED: -32004,
  APPROVAL_ERROR: -32005,
  NOT_PENDING: -32006,
} as const;
/** JSON-RPC 표준: 요청 형식 오류·내부 오류 */
export const RPC_INVALID_REQUEST = -32600;
export const RPC_INTERNAL_ERROR = -32000;

export type RpcId = number | string;
export interface RpcRequest {
  jsonrpc: "2.0";
  id: RpcId;
  method: string;
  params?: unknown;
}
export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}
export type RpcResponse = { jsonrpc: "2.0"; id: RpcId | null; result: unknown } | { jsonrpc: "2.0"; id: RpcId | null; error: RpcError };
export interface RpcEventsBatch {
  jsonrpc: "2.0";
  method: "events.batch";
  params: { events: JournalEvent[] };
}

export type JsonSchema = Record<string, unknown>;

const obj = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({ type: "object", additionalProperties: false, required, properties });
const EMPTY = obj({});
const ID = { type: "string", minLength: 1 } as const;
const COMBO = obj({ provider: { enum: ["claude", "codex"] }, os: { type: "string", minLength: 1 }, sandbox: { type: "string", minLength: 1 }, variant: { type: "string", minLength: 1 } }, ["provider", "os", "sandbox", "variant"]);

export const RPC_PARAMS_SCHEMA: Record<RpcMethod, JsonSchema> = {
  "daemon.status": EMPTY,
  "events.subscribe": obj({ fromSeq: { type: "integer", minimum: 0 } }, ["fromSeq"]),
  "task.get": obj({ taskId: ID }, ["taskId"]),
  "task.list": EMPTY,
  "approval.pending": EMPTY,
  "policy.get": obj({ projectId: ID }),
  "capabilities.get": EMPTY,
  "task.submit": obj({ title: { type: "string", minLength: 1, maxLength: 200 }, kind: { enum: [...TASK_KINDS] }, phaseId: ID }, ["title", "kind"]),
  "task.cancel": obj({ taskId: ID }, ["taskId"]),
  "task.unblock": obj({ taskId: ID }, ["taskId"]),
  "task.abandon": obj({ taskId: ID }, ["taskId"]),
  "approval.decide": obj({ requestId: ID, decision: { enum: ["accept", "decline", "cancel"] }, scope: { enum: ["once", "project", "until_expiry"] } }, ["requestId", "decision"]),
  "policy.set": obj({ projectId: ID, policy: { type: "object" }, combos: obj({ claude: COMBO, codex: COMBO }) }, ["projectId", "policy"]),
  "user_input.answer": obj({ requestId: ID, answers: { type: "object", additionalProperties: { type: "string" } } }, ["requestId", "answers"]),
  "daemon.shutdown": EMPTY,
};

export function methodClass(method: string): RpcMethodClass | null {
  for (const cls of Object.keys(RPC_METHODS) as RpcMethodClass[]) {
    if ((RPC_METHODS[cls] as readonly string[]).includes(method)) return cls;
  }
  return null;
}
export const isRpcMethod = (method: string): method is RpcMethod => methodClass(method) !== null;

type Validator = ((x: unknown) => boolean) & { errors?: { instancePath: string; message?: string; params?: Record<string, unknown> }[] | null };
const validators = new Map<RpcMethod, Validator>();
let ajv: Ajv | undefined;

/** params(생략 시 `{}`)를 메서드 스키마로 검증해 오류 문자열 목록을 돌려준다(빈 배열 = 정상). */
export function validateParams(method: RpcMethod, params: unknown): string[] {
  let v = validators.get(method);
  if (!v) {
    ajv ??= new Ajv({ allErrors: true, strict: true });
    v = ajv.compile(RPC_PARAMS_SCHEMA[method]) as Validator;
    validators.set(method, v);
  }
  const input = params === undefined ? {} : params;
  if (v(input)) return [];
  return (v.errors ?? []).map((e) => {
    const extra = e.params && "additionalProperty" in e.params ? ` (${String(e.params.additionalProperty)})` : "";
    return `${e.instancePath || "/"}: ${e.message ?? "invalid"}${extra}`;
  });
}
