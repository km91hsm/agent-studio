/**
 * T12 스킬 관찰자 최소 구현 — Claude SDK 메시지의 Skill tool_use/tool_result → SkillSelected/SkillLoadObserved,
 * Codex explicit `{type:'skill'}` 입력 + 정상 응답 → SkillInjectionAccepted 만(implicit 판정은 P07 시그니처 매칭 소유).
 * 녹화: spikes/fixtures/claude-2.1.316/s7-claude-explicit-tdd.jsonl (줄 형식 `{t, msg}`; 9행 Skill tool_use, 11행 tool_result).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { observeClaudeMessage, observeCodexSkillInjection } from "./observer.js";

const REC = fileURLToPath(new URL("../../../../spikes/fixtures/claude-2.1.316/s7-claude-explicit-tdd.jsonl", import.meta.url));
const lines = readFileSync(REC, "utf8").split("\n").filter(Boolean).map((l) => (JSON.parse(l) as { msg: unknown }).msg);
const ctx = { taskId: "t1", runId: "run-1", expectedLead: "test-driven-development" };

describe("observeClaudeMessage", () => {
  it("녹화 전체를 훑으면 SkillSelected 1건 + SkillLoadObserved 1건이고 skill_id 는 녹화의 스킬명", () => {
    const out = lines.flatMap((m) => observeClaudeMessage(m, ctx));
    expect(out.map((e) => e.type)).toEqual(["SkillSelected", "SkillLoadObserved"]);
    const [sel, load] = out;
    expect(sel!.taskId).toBe("t1");
    expect(sel!.agentRunId).toBe("run-1");
    expect(sel!.payload).toMatchObject({ skill_id: "test-driven-development", selection_reason: "AGENT_SELF", invocation_mode: "implicit", expected_lead: "test-driven-development", tool_use_id: "toolu_01E6swQMJziaJf1vM2Py5VoM" });
    expect(load!.payload).toMatchObject({ skill_id: "test-driven-development", tool_use_id: "toolu_01E6swQMJziaJf1vM2Py5VoM" });
    expect(load!.correlationId).toBe("toolu_01E6swQMJziaJf1vM2Py5VoM");
  });

  it("Skill 이 아닌 tool_use(Read/Bash 등)·시스템 메시지 → 0건", () => {
    const read = { type: "assistant", message: { content: [{ type: "tool_use", id: "x1", name: "Read", input: { file_path: "a" } }] } };
    expect(observeClaudeMessage(read, ctx)).toEqual([]);
    expect(observeClaudeMessage({ type: "system", subtype: "init" }, ctx)).toEqual([]);
    expect(observeClaudeMessage(null, ctx)).toEqual([]);
    expect(observeClaudeMessage("nonsense", ctx)).toEqual([]);
  });

  it("Skill tool_result 가 is_error 면 SkillLoadObserved 를 내지 않고, 모르는 tool_use_id 의 result 도 무시한다", () => {
    const use = { type: "assistant", message: { content: [{ type: "tool_use", id: "s1", name: "Skill", input: { skill: "ponytail" } }] } };
    const errResult = { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "s1", is_error: true, content: "Unknown skill" }] } };
    const okUnknown = { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "zzz", content: "ok" }] } };
    expect(observeClaudeMessage(use, ctx).map((e) => e.type)).toEqual(["SkillSelected"]);
    expect(observeClaudeMessage(errResult, ctx)).toEqual([]);
    expect(observeClaudeMessage(okUnknown, ctx)).toEqual([]);
  });

  it("관찰자는 run 마다 상태를 가지므로 다른 ctx 의 result 는 짝이 맞지 않는다", () => {
    const use = { type: "assistant", message: { content: [{ type: "tool_use", id: "s2", name: "Skill", input: { skill: "ponytail" } }] } };
    const res = { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "s2", content: "Launching skill: ponytail" }] } };
    observeClaudeMessage(use, ctx);
    expect(observeClaudeMessage(res, { taskId: "t9", runId: "run-9" })).toEqual([]);
    expect(observeClaudeMessage(res, ctx).map((e) => e.type)).toEqual(["SkillLoadObserved"]);
  });
});

describe("observeCodexSkillInjection", () => {
  const codexCtx = { taskId: "t1", runId: "run-c" };
  it("skill 입력 + 정상 응답 → SkillInjectionAccepted 1건만", () => {
    const out = observeCodexSkillInjection([{ type: "text", text: "do it" }, { type: "skill", name: "tdd", path: "D:/skills/tdd/SKILL.md" }], { threadId: "th", turnId: "tu" }, codexCtx);
    expect(out.map((e) => e.type)).toEqual(["SkillInjectionAccepted"]);
    expect(out[0]!.payload).toEqual({ skill_id: "tdd", path: "D:/skills/tdd/SKILL.md", invocation_mode: "explicit" });
    expect(out[0]!.taskId).toBe("t1");
    expect(out[0]!.agentRunId).toBe("run-c");
  });
  it("skill 입력 없음 → 0건, 응답 오류 → 0건, skill 2개 → 2건", () => {
    expect(observeCodexSkillInjection([{ type: "text", text: "x" }], {}, codexCtx)).toEqual([]);
    expect(observeCodexSkillInjection([{ type: "skill", name: "tdd", path: "p" }], { error: { code: -32602, message: "bad" } }, codexCtx)).toEqual([]);
    expect(observeCodexSkillInjection([{ type: "skill", name: "a", path: "pa" }, { type: "skill", name: "b", path: "pb" }], {}, codexCtx).map((e) => e.payload.skill_id)).toEqual(["a", "b"]);
  });
});
