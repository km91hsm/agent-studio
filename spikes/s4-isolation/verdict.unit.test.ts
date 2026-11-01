/**
 * S4 — 격리 판정 로직 단위 테스트(CI에서 실행). 실호출 결과(승인 요청·효과·명령 출력)를
 * `blocked | approval_requested | bypassed` 판정값으로 바꾸고, `bypassed` 조합을
 * isolation_warning 등록 입력·보장 수준 하향 입력으로 도출한다(AC-P00-7b).
 */
import { describe, expect, it } from "vitest";
import { deriveIsolationInputs, judge, type IsolationRow } from "./verdict.js";

const base = { provider: "codex", os: "windows", sandbox: "workspaceWrite", variant: "elevated", approvalPolicy: "on-request", area: "fs_outside" } as const;

describe("S4 verdict", () => {
  it("승인 요청이 있고 효과가 없으면 approval_requested", () => {
    expect(judge({ approvalRequests: 1, effect: false })).toBe("approval_requested");
  });
  it("승인 요청 없이 효과가 있으면 bypassed (승인 요청이 있어도 효과가 있으면 bypassed — 거절했는데 효과가 난 경우)", () => {
    expect(judge({ approvalRequests: 0, effect: true })).toBe("bypassed");
    expect(judge({ approvalRequests: 1, effect: true })).toBe("bypassed");
  });
  it("승인 요청도 효과도 없으면 blocked", () => {
    expect(judge({ approvalRequests: 0, effect: false })).toBe("blocked");
  });
  it("bypassed 조합만 isolation_warning·보장 수준 하향 입력으로 산출된다", () => {
    const rows: IsolationRow[] = [
      { ...base, verdict: "blocked", evidence: "" },
      { ...base, area: "network", verdict: "bypassed", evidence: "listener hit" },
      { ...base, provider: "claude", sandbox: "native", variant: "default", verdict: "bypassed", evidence: "file exists" },
    ];
    const out = deriveIsolationInputs(rows);
    expect(out.isolationWarnings).toEqual([
      { provider: "codex", os: "windows", sandbox: "workspaceWrite", variant: "elevated", approvalPolicy: "on-request", area: "network" },
      { provider: "claude", os: "windows", sandbox: "native", variant: "default", approvalPolicy: "on-request", area: "fs_outside" },
    ]);
    expect(out.guaranteeDowngrades).toEqual([
      { column: "codex/windows/workspaceWrite/elevated", area: "network", level: "DETECTED" },
      { column: "claude/windows/native/default", area: "fs_outside", level: "POLICY_ONLY" },
    ]);
  });
});
