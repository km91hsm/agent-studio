/**
 * S7 — 관찰 추출기의 판정 규칙(CI). LIVE 1차 실행에서 드러난 오판 2건을 고정한다:
 *   (1) Claude: `node --test` 요약 "ℹ fail 0"이 대소문자 무시 FAIL에 걸려 모든 실행이 test_run:fail 로 분류됨
 *   (2) Codex: pwsh -Command 안의 경로는 백슬래시가 두 번 겹쳐(`skills\\writing-plans\\SKILL.md`) SKILL.md 읽기 명령이 skill_invoked 로 잡히지 않음
 */
import { describe, expect, it } from "vitest";
import { classifyTestRun, observationsFromClaude, observationsFromCodex, type CodexItem, type ToolUse } from "./experiments.js";

const NODE_TEST_PASS = "✔ sum adds every element (0.6ms)\nℹ tests 1\nℹ suites 0\nℹ pass 1\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 90\n";
const NODE_TEST_FAIL = "✖ sum adds every element (1.2ms)\n  AssertionError: Expected values to be strictly equal:\n  5 !== 6\nℹ tests 1\nℹ suites 0\nℹ pass 0\nℹ fail 1\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 95\n";

describe("S7 observation extraction (CI)", () => {
  it("classifyTestRun: node --test 요약 'ℹ fail 0'은 pass, 'ℹ fail 1'은 fail, 요약이 잘린 오류 출력은 isError 로 판정", () => {
    expect(classifyTestRun(false, NODE_TEST_PASS)).toBe("pass");
    expect(classifyTestRun(false, NODE_TEST_FAIL)).toBe("fail");
    expect(classifyTestRun(true, "")).toBe("fail");
    expect(classifyTestRun(false, "✖ x\nnot ok 1 - x\n")).toBe("fail");
    expect(classifyTestRun(false, "# tests 2\n# pass 2\n# fail 0\n")).toBe("pass");
  });

  it("observationsFromClaude: PowerShell 도구의 npm test 결과도 요약 기준으로 pass/fail 을 나눈다", () => {
    const cwd = "C:\\tmp\\repo";
    const uses: ToolUse[] = [
      { seq: 1, name: "Write", input: { file_path: "C:\\tmp\\repo\\calc.test.mjs" }, isError: false, resultText: "" },
      { seq: 2, name: "PowerShell", input: { command: "npm test 2>&1" }, isError: false, resultText: NODE_TEST_FAIL },
      { seq: 3, name: "Edit", input: { file_path: "C:\\tmp\\repo\\calc.js" }, isError: false, resultText: "" },
      { seq: 4, name: "PowerShell", input: { command: "npm test 2>&1 | Select-Object -Last 12" }, isError: false, resultText: NODE_TEST_PASS },
    ];
    const events = observationsFromClaude(uses, cwd).filter((o) => o.value.startsWith("test_run:")).map((o) => `${o.seq}:${o.value}`);
    expect(events).toEqual(["2:test_run:fail", "4:test_run:pass"]);
  });

  it("observationsFromCodex: pwsh -Command 안의 겹친 백슬래시 경로(skills\\\\writing-plans\\\\SKILL.md)도 skill_invoked 로 잡는다", () => {
    const items: CodexItem[] = [
      { seq: 1, type: "commandExecution", command: "\"C:\\\\Program Files\\\\PowerShell\\\\7\\\\pwsh.exe\" -Command \"Get-Content 'C:\\\\Users\\\\u\\\\.codex\\\\skills\\\\writing-plans\\\\SKILL.md'\"", exitCode: 0 },
      { seq: 2, type: "commandExecution", command: "pwsh -Command 'Get-Content C:/Users/u/.codex/skills/test-driven-development/SKILL.md'", exitCode: 0 },
      { seq: 3, type: "commandExecution", command: "pwsh -Command 'Get-Content README.md'", exitCode: 0 },
    ];
    const invoked = observationsFromCodex(items, "C:\\tmp\\repo", ["writing-plans", "test-driven-development"]).filter((o) => o.value.startsWith("skill_invoked:")).map((o) => o.value);
    expect(invoked).toEqual(["skill_invoked:writing-plans", "skill_invoked:test-driven-development"]);
  });
});
