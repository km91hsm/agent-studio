/**
 * S7 Step 5 — 스킬 고유 절차 시그니처(EVIDENCE_SPEC §3 공통 행 스키마)와 증거 등급 판정 로직(순수, CI)
 * 시그니처: docs/agent-studio/skill-signatures/<skill>.json — 주도 스킬 9개(Codex 설치 8 + brainstorming)
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeClaude, gradeCodex, matchSignature, validateSignature, type Observation, type SkillSignature } from "./evidence.js";
import { LEAD_SKILLS } from "./install-codex-skills.js";

const SIG_DIR = fileURLToPath(new URL("../../docs/agent-studio/skill-signatures/", import.meta.url));
const NINE = [...LEAD_SKILLS, "brainstorming"];

describe("S7 skill signatures (CI)", () => {
  it("주도 스킬 9개의 시그니처 파일이 존재하고 스키마를 만족한다", () => {
    expect(LEAD_SKILLS).toHaveLength(8);
    for (const name of NINE) {
      const p = join(SIG_DIR, `${name}.json`);
      expect(existsSync(p), p).toBe(true);
      const sig = JSON.parse(readFileSync(p, "utf8")) as SkillSignature;
      expect(validateSignature(sig), name).toEqual([]);
      expect(sig.skill_id.endsWith(`/${name}`), `${name} skill_id`).toBe(true);
      expect(sig.steps.some((s) => s.required), `${name} has required step`).toBe(true);
      expect(sig.reviewed_by, `${name} reviewed_by is pending codex review`).toBeNull();
    }
  });

  it("validateSignature는 필수 필드·순서·artifact_glob|event_pattern 택일을 검사한다", () => {
    const ok: SkillSignature = { skill_id: "x/y", skill_commit: "abc1234", version: 1, steps: [{ order: 1, event_pattern: "skill_invoked:y", required: true }], author: "claude", reviewed_by: null, created_seq: 0 };
    expect(validateSignature(ok)).toEqual([]);
    expect(validateSignature({ ...ok, steps: [] })).toContain("steps: empty");
    expect(validateSignature({ ...ok, steps: [{ order: 2, event_pattern: "a", required: true }] })).toContain("steps[0].order: expected 1");
    expect(validateSignature({ ...ok, steps: [{ order: 1, required: true }] })).toContain("steps[0]: artifact_glob or event_pattern required");
    expect(validateSignature({ ...ok, steps: [{ order: 1, artifact_glob: "*.ts", event_pattern: "x", required: true }] })).toContain("steps[0]: artifact_glob and event_pattern are exclusive");
    expect(validateSignature({ ...ok, skill_commit: "" })).toContain("skill_commit: required");
  });

  it("gradeClaude: 목록 부재→NOT_FOUND, 목록만→DISCOVERED, 명시 호출→INJECTION_ACCEPTED, Skill 도구 성공→LOAD_OBSERVED, 실패→FAILED", () => {
    const base = { skill: "test-driven-development", initSkills: ["test-driven-development", "tdd"] };
    expect(gradeClaude({ ...base, initSkills: [], explicit: false, toolUses: [] })).toBe("NOT_FOUND");
    expect(gradeClaude({ ...base, explicit: false, toolUses: [] })).toBe("DISCOVERED");
    expect(gradeClaude({ ...base, explicit: true, toolUses: [] })).toBe("INJECTION_ACCEPTED");
    expect(gradeClaude({ ...base, explicit: true, toolUses: [{ name: "Skill", input: { skill: "test-driven-development" }, isError: false }] })).toBe("LOAD_OBSERVED");
    expect(gradeClaude({ ...base, explicit: false, toolUses: [{ name: "Skill", input: { skill: "test-driven-development" }, isError: false }] })).toBe("LOAD_OBSERVED");
    expect(gradeClaude({ ...base, explicit: true, toolUses: [{ name: "Skill", input: { skill: "test-driven-development" }, isError: true }] })).toBe("FAILED");
    expect(gradeClaude({ ...base, explicit: true, toolUses: [{ name: "Skill", input: { skill: "tdd" }, isError: false }] })).toBe("INJECTION_ACCEPTED");
  });

  it("gradeCodex: 목록 부재→NOT_FOUND, 목록만→DISCOVERED, skill 입력 수락→INJECTION_ACCEPTED, 거부→FAILED, 절차 관찰→LOAD_OBSERVED", () => {
    expect(gradeCodex({ listed: false, injection: null, procedureObserved: false })).toBe("NOT_FOUND");
    expect(gradeCodex({ listed: true, injection: null, procedureObserved: false })).toBe("DISCOVERED");
    expect(gradeCodex({ listed: true, injection: "accepted", procedureObserved: false })).toBe("INJECTION_ACCEPTED");
    expect(gradeCodex({ listed: true, injection: "rejected", procedureObserved: false })).toBe("FAILED");
    expect(gradeCodex({ listed: true, injection: "accepted", procedureObserved: true })).toBe("LOAD_OBSERVED");
    expect(gradeCodex({ listed: true, injection: null, procedureObserved: true })).toBe("LOAD_OBSERVED");
  });

  it("matchSignature: required 단계가 순서대로 관찰되면 inOrder, 순서가 어긋나면 false, 빠진 단계는 missingRequired", () => {
    const sig: SkillSignature = {
      skill_id: "obra/superpowers/test-driven-development",
      skill_commit: "2ce8aa1",
      version: 1,
      steps: [
        { order: 1, artifact_glob: "**/*.test.{js,mjs,ts}", required: true },
        { order: 2, event_pattern: "test_run:fail", required: true },
        { order: 3, artifact_glob: "**/*.{js,mjs,ts}", required: true },
        { order: 4, event_pattern: "test_run:pass", required: true },
      ],
      author: "claude",
      reviewed_by: null,
      created_seq: 0,
    };
    const good: Observation[] = [
      { seq: 1, kind: "artifact", value: "calc.test.mjs" },
      { seq: 2, kind: "event", value: "test_run:fail" },
      { seq: 3, kind: "artifact", value: "calc.js" },
      { seq: 4, kind: "event", value: "test_run:pass" },
    ];
    expect(matchSignature(sig, good)).toEqual({ observed: [1, 2, 3, 4], missingRequired: [], inOrder: true });
    const swapped: Observation[] = [
      { seq: 1, kind: "artifact", value: "calc.js" },
      { seq: 2, kind: "artifact", value: "calc.test.mjs" },
      { seq: 3, kind: "event", value: "test_run:pass" },
    ];
    const r = matchSignature(sig, swapped);
    expect(r.inOrder).toBe(false);
    expect(r.missingRequired).toEqual([2]);
    // 테스트 파일은 artifact_glob "**/*.{js,mjs,ts}"에도 걸리지만 1단계 뒤에 나타난 구현 파일만 3단계로 센다
    const testOnly: Observation[] = [{ seq: 1, kind: "artifact", value: "calc.test.mjs" }];
    expect(matchSignature(sig, testOnly).observed).toEqual([1]);
  });
});
