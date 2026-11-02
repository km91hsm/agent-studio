/**
 * 스킬 관찰자 최소 구현 (P01 T12, SKILL_EXECUTION_EVIDENCE_SPEC §3·§4).
 * - Claude: `assistant.message.content[]` 의 Skill tool_use → `SkillSelected`(AGENT_SELF/implicit), 짝이 맞는 성공 tool_result → `SkillLoadObserved`.
 * - Codex: `turn/start.input` 의 `{type:'skill'}` 항목 + 오류 없는 응답 → `SkillInjectionAccepted`(요청·발견 증거 상한, 사용 증거 아님).
 * implicit 판정(시그니처 매칭)·APPLIED_VERIFIED 승격은 P07 Verifier 소유. 이 모듈은 저널 이벤트만 만들고 append 는 호출자가 한다.
 */
import type { NewEvent } from "@agent-studio/protocol";

export interface ObserveContext {
  taskId: string;
  runId: string;
  /** Router 가 Task 유형에서 산출한 기대 주도 스킬(대조는 P07) */
  expectedLead?: string;
}

type ContentBlock = { type?: unknown; id?: unknown; name?: unknown; input?: unknown; tool_use_id?: unknown; is_error?: unknown };

/** run 별로 아직 result 를 못 본 Skill tool_use(id → skill_id). */
const pendingByRun = new Map<string, Map<string, string>>();

function blocksOf(msg: unknown): ContentBlock[] {
  if (!msg || typeof msg !== "object") return [];
  const message = (msg as { message?: { content?: unknown } }).message;
  const content = message?.content;
  return Array.isArray(content) ? (content as ContentBlock[]) : [];
}

export function observeClaudeMessage(msg: unknown, ctx: ObserveContext): NewEvent[] {
  const out: NewEvent[] = [];
  const type = (msg as { type?: unknown } | null)?.type;
  if (type !== "assistant" && type !== "user") return out;
  let pending = pendingByRun.get(ctx.runId);
  if (!pending) pendingByRun.set(ctx.runId, (pending = new Map()));
  const base = { taskId: ctx.taskId, agentRunId: ctx.runId };
  for (const b of blocksOf(msg)) {
    if (type === "assistant" && b.type === "tool_use" && b.name === "Skill" && typeof b.id === "string") {
      const skillId = (b.input as { skill?: unknown } | undefined)?.skill;
      if (typeof skillId !== "string") continue;
      pending.set(b.id, skillId);
      out.push({
        ...base,
        type: "SkillSelected",
        correlationId: b.id,
        payload: { skill_id: skillId, selection_reason: "AGENT_SELF", invocation_mode: "implicit", ...(ctx.expectedLead !== undefined && { expected_lead: ctx.expectedLead }), tool_use_id: b.id },
      });
    } else if (type === "user" && b.type === "tool_result" && typeof b.tool_use_id === "string") {
      const skillId = pending.get(b.tool_use_id);
      if (skillId === undefined) continue;
      pending.delete(b.tool_use_id);
      if (b.is_error === true) continue;
      out.push({ ...base, type: "SkillLoadObserved", correlationId: b.tool_use_id, payload: { skill_id: skillId, tool_use_id: b.tool_use_id, observed_via: "claude_skill_tool_result" } });
    }
  }
  return out;
}

export type CodexInputItem = { type?: unknown; name?: unknown; path?: unknown; text?: unknown };

/** `turn/start` 입력 항목과 그 응답(JSON-RPC result 또는 error). 오류 응답이면 어떤 이벤트도 내지 않는다. */
export function observeCodexSkillInjection(input: CodexInputItem[], response: { error?: unknown; [k: string]: unknown } | null | undefined, ctx: Pick<ObserveContext, "taskId" | "runId">): NewEvent[] {
  if (!response || typeof response !== "object" || response.error) return [];
  const out: NewEvent[] = [];
  for (const item of input) {
    if (item.type !== "skill" || typeof item.name !== "string") continue;
    out.push({ taskId: ctx.taskId, agentRunId: ctx.runId, type: "SkillInjectionAccepted", payload: { skill_id: item.name, path: typeof item.path === "string" ? item.path : null, invocation_mode: "explicit" } });
  }
  return out;
}
