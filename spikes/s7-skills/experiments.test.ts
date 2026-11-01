/**
 * S7 — 관찰 추출기·승인 응답의 판정 규칙(CI, Windows·Linux 공통). LIVE 1차 실행과 Codex 리뷰에서 드러난 오판을 고정한다:
 *   (1) Claude: `node --test` 요약 "ℹ fail 0"이 대소문자 무시 FAIL에 걸려 모든 실행이 test_run:fail 로 분류됨
 *   (2) Codex: pwsh -Command 안의 경로는 백슬래시가 두 번 겹쳐(`skills\\writing-plans\\SKILL.md`) SKILL.md 읽기 명령이 skill_invoked 로 잡히지 않음
 *   (3) 리뷰 #4: SKILL.md 경로가 명령에 있어도 실패(exitCode≠0)·출력 없음이면 "읽음"으로 세지 않는다
 *   (4) 리뷰 #7: 승인 요청의 cwd·경로가 실험 저장소 밖이면 거부한다
 *   (5) Read/Glob/Grep 도구 관찰(code-review 스펙·표준 출처 읽기 신호)
 * 경로는 실행 플랫폼의 tmpdir 기준으로 만든다(ubuntu CI에서 Windows 리터럴 경로가 깨졌던 회귀).
 */
import { describe, expect, it } from "vitest";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { approvalDecision, classifyTestRun, observationsFromClaude, observationsFromCodex, type CodexItem, type ToolUse } from "./experiments.js";

const NODE_TEST_PASS = "✔ sum adds every element (0.6ms)\nℹ tests 1\nℹ suites 0\nℹ pass 1\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 90\n";
const NODE_TEST_FAIL = "✖ sum adds every element (1.2ms)\n  AssertionError: Expected values to be strictly equal:\n  5 !== 6\nℹ tests 1\nℹ suites 0\nℹ pass 0\nℹ fail 1\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ duration_ms 95\n";
const SKILL_HEAD = "---\nname: writing-plans\ndescription: Use when you have a spec…\n---\n";
const REPO = resolve(tmpdir(), "s7-extractor-repo");

describe("S7 observation extraction (CI)", () => {
  it("classifyTestRun: node --test 요약 'ℹ fail 0'은 pass, 'ℹ fail 1'은 fail, 요약이 잘린 오류 출력은 isError 로 판정", () => {
    expect(classifyTestRun(false, NODE_TEST_PASS)).toBe("pass");
    expect(classifyTestRun(false, NODE_TEST_FAIL)).toBe("fail");
    expect(classifyTestRun(true, "")).toBe("fail");
    expect(classifyTestRun(false, "✖ x\nnot ok 1 - x\n")).toBe("fail");
    expect(classifyTestRun(false, "# tests 2\n# pass 2\n# fail 0\n")).toBe("pass");
  });

  it("observationsFromClaude: PowerShell 도구의 npm test 결과도 요약 기준으로 pass/fail 을 나눈다", () => {
    const uses: ToolUse[] = [
      { seq: 1, name: "Write", input: { file_path: join(REPO, "calc.test.mjs") }, isError: false, resultText: "" },
      { seq: 2, name: "PowerShell", input: { command: "npm test 2>&1" }, isError: false, resultText: NODE_TEST_FAIL },
      { seq: 3, name: "Edit", input: { file_path: join(REPO, "calc.js") }, isError: false, resultText: "" },
      { seq: 4, name: "PowerShell", input: { command: "npm test 2>&1 | Select-Object -Last 12" }, isError: false, resultText: NODE_TEST_PASS },
    ];
    const events = observationsFromClaude(uses, REPO).filter((o) => o.value.startsWith("test_run:")).map((o) => `${o.seq}:${o.value}`);
    expect(events).toEqual(["2:test_run:fail", "4:test_run:pass"]);
  });

  it("observationsFromClaude: Read 도구는 read:<상대경로>, Glob/Grep은 search:<패턴> 이벤트로 관찰된다(code-review 스펙·표준 출처 읽기 신호)", () => {
    const uses: ToolUse[] = [
      { seq: 1, name: "Read", input: { file_path: join(REPO, "README.md") }, isError: false, resultText: "# readme" },
      { seq: 2, name: "Glob", input: { pattern: "**/CONTRIBUTING.md" }, isError: false, resultText: "" },
      { seq: 3, name: "Grep", input: { pattern: "standards", path: REPO }, isError: false, resultText: "" },
    ];
    expect(observationsFromClaude(uses, REPO).map((o) => `${o.kind}:${o.value}`)).toEqual(["event:read:README.md", "event:search:**/CONTRIBUTING.md", "event:search:standards"]);
  });

  it("observationsFromCodex: pwsh -Command 안의 겹친 백슬래시 경로도 skill_invoked 로 잡되, 실패했거나 출력이 없는 읽기는 세지 않는다(리뷰 #4)", () => {
    const items: CodexItem[] = [
      { seq: 1, type: "commandExecution", command: "\"C:\\\\Program Files\\\\PowerShell\\\\7\\\\pwsh.exe\" -Command \"Get-Content 'C:\\\\Users\\\\u\\\\.codex\\\\skills\\\\writing-plans\\\\SKILL.md'\"", exitCode: 0, output: SKILL_HEAD },
      { seq: 2, type: "commandExecution", command: "pwsh -Command 'Get-Content C:/Users/u/.codex/skills/test-driven-development/SKILL.md'", exitCode: 0, output: "---\nname: test-driven-development\n" },
      { seq: 3, type: "commandExecution", command: "pwsh -Command 'Get-Content README.md'", exitCode: 0, output: "# readme" },
      { seq: 4, type: "commandExecution", command: "pwsh -Command 'Get-Content C:/Users/u/.codex/skills/systematic-debugging/SKILL.md'", exitCode: 1, output: "Get-Content: Cannot find path" },
      { seq: 5, type: "commandExecution", command: "pwsh -Command 'rg --files C:/Users/u/.codex/skills/code-review/SKILL.md'", exitCode: 0, output: "" },
    ];
    const invoked = observationsFromCodex(items, REPO, ["writing-plans", "test-driven-development", "systematic-debugging", "code-review"]).filter((o) => o.value.startsWith("skill_invoked:")).map((o) => o.value);
    expect(invoked).toEqual(["skill_invoked:writing-plans", "skill_invoked:test-driven-development"]);
  });

  it("approvalDecision: 요청의 cwd·경로가 실험 저장소 안이면 accept, 밖이면 decline(리뷰 #7)", () => {
    const cwd = resolve(tmpdir(), "s7-codex-tdd-abc");
    const outsideDir = resolve(tmpdir(), "s7-elsewhere");
    expect(approvalDecision({ cwd, command: "npm test" }, cwd)).toBe("accept");
    expect(approvalDecision({ cwd: join(cwd, "sub"), command: "git status" }, cwd)).toBe("accept");
    expect(approvalDecision({ cwd: outsideDir, command: "Get-Content config.toml" }, cwd)).toBe("decline");
    expect(approvalDecision({ changes: [{ path: join(cwd, "calc.js") }] }, cwd)).toBe("accept");
    expect(approvalDecision({ changes: [{ path: join(outsideDir, "outside.txt") }] }, cwd)).toBe("decline");
    // 명령 문자열 안의 절대 경로도 검사한다(`..`로 빠져나가는 경우 포함)
    expect(approvalDecision({ cwd, command: `Add-Content ${join(cwd, "..", "outside.txt")}` }, cwd)).toBe("decline");
    expect(approvalDecision({ cwd, command: `cat ${join(cwd, "README.md")}` }, cwd)).toBe("accept");
  });
});
