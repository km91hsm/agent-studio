/**
 * 스킬 관찰자 최소 구현 (P01 T12, SKILL_EXECUTION_EVIDENCE_SPEC §3·§4).
 * - Claude: `assistant.message.content[]` 의 Skill tool_use → `SkillSelected`(AGENT_SELF/implicit), 짝이 맞는 성공 tool_result → `SkillLoadObserved`.
 * - Codex: `turn/start.input` 의 `{type:'skill'}` 항목 + 오류 없는 응답 → `SkillInjectionAccepted`. 이 이벤트는 EVIDENCE_SPEC §3 의
 *   **INJECTION_ACCEPTED 상한(요청·발견 증거)** 이며 사용 증거가 아니다. 판정자가 과대평가하지 않도록 payload 에
 *   `mentioned`(같은 입력에 `$name` 텍스트 동반 — (b))·`discovered`(호출자가 준 `skills/list` 결과에 존재 — (a); 모르면 null)를 함께 적는다(리뷰A#10).
 * implicit 판정(시그니처 매칭)·APPLIED_VERIFIED 승격은 P07 Verifier 소유. 이 모듈은 저널 이벤트만 만들고 append 는 호출자가 한다.
 * run 별 pending 상태는 result 처리 후 비면 제거되고, run 종료 시 `forgetRun()` 으로 정리한다(리뷰A#11).
 */
import type { NewEvent } from "@agent-studio/protocol";

export interface ObserveContext {
  taskId: string;
  runId: string;
  /** Router 가 Task 유형에서 산출한 기대 주도 스킬(대조는 P07) */
  expectedLead?: string;
  /** Codex: 이 run 의 `skills/list` 가 돌려준 스킬 이름(발견 증거 (a)); 없으면 판정 보류(null) */
  discovered?: string[];
}

type ContentBlock = { type?: unknown; id?: unknown; name?: unknown; input?: unknown; tool_use_id?: unknown; is_error?: unknown };

/** run 별로 아직 result 를 못 본 Skill tool_use(id → skill_id). */
const pendingByRun = new Map<string, Map<string, string>>();

/** 테스트·진단용: pending 상태가 남아 있는 run 목록 */
export const pendingRuns = (): string[] => [...pendingByRun.keys()];
/** run 종료 시 호출: 짝을 못 찾은 Skill tool_use 를 버린다. */
export function forgetRun(runId: string): void {
  pendingByRun.delete(runId);
}

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
  const base = { taskId: ctx.taskId, agentRunId: ctx.runId };
  for (const b of blocksOf(msg)) {
    if (type === "assistant" && b.type === "tool_use" && b.name === "Skill" && typeof b.id === "string") {
      const skillId = (b.input as { skill?: unknown } | undefined)?.skill;
      if (typeof skillId !== "string") continue;
      let pending = pendingByRun.get(ctx.runId);
      if (!pending) pendingByRun.set(ctx.runId, (pending = new Map()));
      pending.set(b.id, skillId);
      out.push({
        ...base,
        type: "SkillSelected",
        correlationId: b.id,
        payload: { skill_id: skillId, selection_reason: "AGENT_SELF", invocation_mode: "implicit", ...(ctx.expectedLead !== undefined && { expected_lead: ctx.expectedLead }), tool_use_id: b.id },
      });
    } else if (type === "user" && b.type === "tool_result" && typeof b.tool_use_id === "string") {
      const pending = pendingByRun.get(ctx.runId);
      const skillId = pending?.get(b.tool_use_id);
      if (!pending || skillId === undefined) continue;
      pending.delete(b.tool_use_id);
      if (pending.size === 0) pendingByRun.delete(ctx.runId);
      if (b.is_error === true) continue;
      out.push({ ...base, type: "SkillLoadObserved", correlationId: b.tool_use_id, payload: { skill_id: skillId, tool_use_id: b.tool_use_id, observed_via: "claude_skill_tool_result" } });
    }
  }
  return out;
}

export type CodexInputItem = { type?: unknown; name?: unknown; path?: unknown; text?: unknown };

/** `turn/start` 입력 항목과 그 응답(JSON-RPC result 또는 error). 오류 응답이면 어떤 이벤트도 내지 않는다. */
export function observeCodexSkillInjection(input: CodexInputItem[], response: { error?: unknown; [k: string]: unknown } | null | undefined, ctx: Pick<ObserveContext, "taskId" | "runId" | "discovered">): NewEvent[] {
  if (!response || typeof response !== "object" || response.error) return [];
  const texts = input.filter((i) => i.type === "text" && typeof i.text === "string").map((i) => i.text as string);
  const out: NewEvent[] = [];
  for (const item of input) {
    if (item.type !== "skill" || typeof item.name !== "string") continue;
    const name = item.name;
    const mentioned = texts.some((t) => t.includes(`$${name}`));
    const discovered = ctx.discovered ? ctx.discovered.includes(name) : null;
    out.push({ taskId: ctx.taskId, agentRunId: ctx.runId, type: "SkillInjectionAccepted", payload: { skill_id: name, path: typeof item.path === "string" ? item.path : null, invocation_mode: "explicit", mentioned, discovered } });
  }
  return out;
}
