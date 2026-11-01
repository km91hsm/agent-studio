/**
 * S7 Step 5 — 스킬 고유 절차 시그니처(EVIDENCE_SPEC §3 공통 행 스키마)와 증거 등급 판정 로직(순수, CI)
 * 시그니처: docs/agent-studio/skill-signatures/<skill>.json — 주도 스킬 9개(Codex 설치 8 + brainstorming)
 * Codex 리뷰(S7 #1·#3·#6) 반영: 시그니처는 "절차" 신호이고 "정체(identity)" 신호(Claude Skill 블록 / Codex 주입 수락·SKILL.md 읽기)와 분리한다.
 *   → 절차만 맞고 정체 신호가 없으면 LOAD_OBSERVED를 주지 않는다(경쟁 스킬·일반 작업 오탐 방지).
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
  it("주도 스킬 9개의 시그니처 파일이 존재하고 스키마를 만족하며 Codex 검토 기록을 가리킨다", () => {
    expect(LEAD_SKILLS).toHaveLength(8);
    for (const name of NINE) {
      const p = join(SIG_DIR, `${name}.json`);
      expect(existsSync(p), p).toBe(true);
      const sig = JSON.parse(readFileSync(p, "utf8")) as SkillSignature;
      expect(validateSignature(sig), name).toEqual([]);
      expect(sig.skill_id.endsWith(`/${name}`), `${name} skill_id`).toBe(true);
      expect(sig.steps.some((s) => s.required), `${name} has required step`).toBe(true);
      expect(sig.reviewed_by, `${name} reviewed_by points at the codex review`).toMatch(/^codex:docs\/reviews\/codex\/S7/);
      expect(sig.version, `${name} version bumped after review`).toBe(2);
    }
  });

  it("시그니처 경로는 스킬 원문의 산출물 규약을 따른다(리뷰 #2: writing-plans → docs/superpowers/plans, brainstorming → docs/superpowers/specs/*-design.md)", () => {
    const plans = JSON.parse(readFileSync(join(SIG_DIR, "writing-plans.json"), "utf8")) as SkillSignature;
    const planObs: Observation[] = [{ seq: 1, kind: "artifact", value: "docs/superpowers/plans/2026-11-02-json-flag.md" }];
    expect(matchSignature(plans, planObs).missingRequired).toEqual([]);
    expect(matchSignature(plans, [{ seq: 1, kind: "artifact", value: "docs/plans/x.md" }]).missingRequired).not.toEqual([]);
    const brainstorming = JSON.parse(readFileSync(join(SIG_DIR, "brainstorming.json"), "utf8")) as SkillSignature;
    expect(matchSignature(brainstorming, [{ seq: 1, kind: "artifact", value: "docs/superpowers/specs/2026-11-02-wall-design.md" }]).missingRequired).toEqual([]);
    const executing = JSON.parse(readFileSync(join(SIG_DIR, "executing-plans.json"), "utf8")) as SkillSignature;
    const onlyStart: Observation[] = [{ seq: 1, kind: "event", value: "command:bash scripts/task-start plan.md 1" }];
    expect(matchSignature(executing, onlyStart).missingRequired, "task-start alone is not enough").not.toEqual([]);
    expect(matchSignature(executing, [...onlyStart, { seq: 2, kind: "event", value: "command:bash scripts/task-done plan.md 1 abc -- npm test" }]).missingRequired).toEqual([]);
  });

  it("validateSignature는 필수 필드·순서·artifact_glob|event_pattern 택일을 검사한다", () => {
    const ok: SkillSignature = { skill_id: "x/y", skill_commit: "abc1234", version: 1, steps: [{ order: 1, event_pattern: "skill_invoked:y", required: true }], author: "claude", reviewed_by: null, created_seq: 0 };
    expect(validateSignature(ok)).toEqual([]);
    expect(validateSignature({ ...ok, steps: [] })).toContain("steps: empty");
    expect(validateSignature({ ...ok, steps: [{ order: 2, event_pattern: "a", required: true }] })).toContain("steps[0].order: expected 1");
    expect(validateSignature({ ...ok, steps: [{ order: 1, required: true }] })).toContain("steps[0]: artifact_glob or event_pattern required");
    expect(validateSignature({ ...ok, steps: [{ order: 1, artifact_glob: "*.ts", event_pattern: "x", required: true }] })).toContain("steps[0]: artifact_glob and event_pattern are exclusive");
    expect(validateSignature({ ...ok, steps: [{ order: 1, event_pattern: "x", exclude_glob: "*.test.ts", required: true }] })).toContain("steps[0]: exclude_glob requires artifact_glob");
    expect(validateSignature({ ...ok, skill_commit: "" })).toContain("skill_commit: required");
  });

  it("gradeClaude: 목록 부재→NOT_FOUND, 목록만→DISCOVERED, 명시 지시 전달→INJECTION_ACCEPTED, Skill 도구 성공→LOAD_OBSERVED, 실패→FAILED", () => {
    const base = { skill: "test-driven-development", initSkills: ["test-driven-development", "tdd"] };
    expect(gradeClaude({ ...base, initSkills: [], explicit: false, toolUses: [] })).toBe("NOT_FOUND");
    expect(gradeClaude({ ...base, explicit: false, toolUses: [] })).toBe("DISCOVERED");
    expect(gradeClaude({ ...base, explicit: true, toolUses: [] })).toBe("INJECTION_ACCEPTED");
    expect(gradeClaude({ ...base, explicit: true, toolUses: [{ name: "Skill", input: { skill: "test-driven-development" }, isError: false }] })).toBe("LOAD_OBSERVED");
    expect(gradeClaude({ ...base, explicit: false, toolUses: [{ name: "Skill", input: { skill: "test-driven-development" }, isError: false }] })).toBe("LOAD_OBSERVED");
    expect(gradeClaude({ ...base, explicit: true, toolUses: [{ name: "Skill", input: { skill: "test-driven-development" }, isError: true }] })).toBe("FAILED");
    expect(gradeClaude({ ...base, explicit: true, toolUses: [{ name: "Skill", input: { skill: "tdd" }, isError: false }] })).toBe("INJECTION_ACCEPTED");
  });

  it("gradeCodex: 정체 신호(주입 수락 또는 SKILL.md 읽기) + 절차 관찰일 때만 LOAD_OBSERVED, 절차만 맞으면 승격하지 않는다(리뷰 #1)", () => {
    expect(gradeCodex({ listed: false, injection: null, skillReadObserved: false, procedureObserved: false })).toBe("NOT_FOUND");
    expect(gradeCodex({ listed: true, injection: null, skillReadObserved: false, procedureObserved: false })).toBe("DISCOVERED");
    expect(gradeCodex({ listed: true, injection: "accepted", skillReadObserved: false, procedureObserved: false })).toBe("INJECTION_ACCEPTED");
    expect(gradeCodex({ listed: true, injection: "rejected", skillReadObserved: false, procedureObserved: true })).toBe("FAILED");
    expect(gradeCodex({ listed: true, injection: "accepted", skillReadObserved: false, procedureObserved: true })).toBe("LOAD_OBSERVED");
    expect(gradeCodex({ listed: true, injection: null, skillReadObserved: true, procedureObserved: true })).toBe("LOAD_OBSERVED");
    // 절차만 일치(경쟁 스킬·일반 작업일 수 있음) → DISCOVERED 유지
    expect(gradeCodex({ listed: true, injection: null, skillReadObserved: false, procedureObserved: true })).toBe("DISCOVERED");
    // 읽기만 하고 절차가 없으면 선택 신호만 있는 것 → INJECTION_ACCEPTED 상한(자율 선택 = 스스로 주입)
    expect(gradeCodex({ listed: true, injection: null, skillReadObserved: true, procedureObserved: false })).toBe("INJECTION_ACCEPTED");
  });

  it("matchSignature: required 단계가 순서대로 관찰되면 inOrder, 순서가 어긋나면 false, 빠진 단계는 missingRequired", () => {
    const sig: SkillSignature = {
      skill_id: "obra/superpowers/test-driven-development",
      skill_commit: "2ce8aa1",
      version: 1,
      steps: [
        { order: 1, artifact_glob: "**/*.test.{js,mjs,ts}", required: true },
        { order: 2, event_pattern: "test_run:fail", required: true },
        { order: 3, artifact_glob: "**/*.{js,mjs,ts}", exclude_glob: "**/*.test.{js,mjs,ts}", required: true },
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
    // 테스트 파일만 있으면 1단계만; 테스트 파일을 다시 편집해도 exclude_glob 때문에 3단계(구현 변경)로 세지 않는다(리뷰 시그니처 표 TDD)
    const testOnly: Observation[] = [{ seq: 1, kind: "artifact", value: "calc.test.mjs" }, { seq: 2, kind: "event", value: "test_run:fail" }, { seq: 3, kind: "artifact", value: "calc.test.mjs" }];
    expect(matchSignature(sig, testOnly)).toEqual({ observed: [1, 2], missingRequired: [3, 4], inOrder: true });
  });

  it("event_pattern은 /regex/flags 형식을 지원한다(code-review 3단계 /…/i — LIVE 3차에서 플래그가 리터럴로 취급돼 미탐)", () => {
    const sig: SkillSignature = { skill_id: "x/y", skill_commit: "a", version: 1, author: "claude", reviewed_by: null, created_seq: 0, steps: [{ order: 1, event_pattern: "/(readme|contributing)/i", required: true }] };
    expect(matchSignature(sig, [{ seq: 1, kind: "event", value: "command:pwsh -Command 'Get-Content README.md'" }]).missingRequired).toEqual([]);
    expect(matchSignature(sig, [{ seq: 1, kind: "event", value: "read:README.md" }]).missingRequired).toEqual([]);
    expect(matchSignature(sig, [{ seq: 1, kind: "event", value: "command:git status" }]).missingRequired).toEqual([1]);
  });

  it("절차 시그니처는 정체를 증명하지 않는다: 경쟁 스킬(tdd)의 관찰도 TDD 절차에 일치한다 — 등급은 정체 신호와 결합해서만 올린다(리뷰 #1 문서화)", () => {
    const tdd = JSON.parse(readFileSync(join(SIG_DIR, "test-driven-development.json"), "utf8")) as SkillSignature;
    const competitorRun: Observation[] = [
      { seq: 1, kind: "event", value: "skill_invoked:tdd" },
      { seq: 2, kind: "artifact", value: "calc.test.mjs" },
      { seq: 3, kind: "event", value: "test_run:fail" },
      { seq: 4, kind: "artifact", value: "calc.js" },
      { seq: 5, kind: "event", value: "test_run:pass" },
    ];
    expect(matchSignature(tdd, competitorRun).missingRequired).toEqual([]);
    expect(gradeClaude({ skill: "test-driven-development", initSkills: ["test-driven-development", "tdd"], explicit: false, toolUses: [{ name: "Skill", input: { skill: "tdd" }, isError: false }] })).toBe("DISCOVERED");
  });
});
