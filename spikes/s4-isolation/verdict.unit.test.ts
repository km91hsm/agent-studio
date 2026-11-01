/**
 * S4 — 격리 판정 로직 단위 테스트(CI에서 실행). 실호출 결과(승인 요청·효과·명령 출력)를
 * `blocked | approval_requested | bypassed | inconclusive` 판정값으로 바꾸고, `bypassed` 조합을
 * isolation_warning 등록 입력·보장 수준 하향 입력으로 도출한다(AC-P00-7b).
 * Codex 리뷰 반영: 경고는 행별 승인 여부가 아니라 격리 경계(provider/os/sandbox/variant/area) 단위,
 * 적용 미검증 변형은 보장값에서 제외, 외부 HTTP 효과는 전체 명령·출력으로 판독.
 */
import { describe, expect, it } from "vitest";
import { deriveIsolationInputs, externalHttpEffect, judge, type IsolationRow } from "./verdict.js";

const base = { provider: "codex", os: "windows", sandbox: "workspaceWrite", variant: "elevated", approvalPolicy: "on-request", area: "fs_outside" } as const;

describe("S4 verdict", () => {
  it("승인 요청이 있고 효과가 없으면 approval_requested", () => {
    expect(judge({ approvalRequests: 1, effect: false, attempted: true })).toBe("approval_requested");
  });
  it("승인 요청 없이 효과가 있으면 bypassed (승인 요청이 있어도 효과가 있으면 bypassed — 거절했는데 효과가 난 경우)", () => {
    expect(judge({ approvalRequests: 0, effect: true, attempted: true })).toBe("bypassed");
    expect(judge({ approvalRequests: 1, effect: true, attempted: true })).toBe("bypassed");
  });
  it("승인 요청도 효과도 없으면 시도 기록이 있을 때만 blocked, 시도 기록이 없으면 inconclusive(최종 리뷰 #3)", () => {
    expect(judge({ approvalRequests: 0, effect: false, attempted: true })).toBe("blocked");
    expect(judge({ approvalRequests: 0, effect: false, attempted: false })).toBe("inconclusive");
  });

  it("경고는 격리 경계 단위로 1건 — 같은 경계에서 한 정책만 bypassed여도 경고가 되고, 어느 정책이 통과했는지 기록한다(리뷰 #3)", () => {
    const rows: IsolationRow[] = [
      { ...base, verdict: "blocked", evidence: "" },
      { ...base, area: "fs_tmp_parent", approvalPolicy: "on-request", verdict: "approval_requested", evidence: "model asked voluntarily" },
      { ...base, area: "fs_tmp_parent", approvalPolicy: "never", verdict: "bypassed", evidence: "file exists" },
      { ...base, area: "network_loopback", approvalPolicy: "on-request", verdict: "bypassed", evidence: "listener hit" },
      { ...base, area: "network_loopback", approvalPolicy: "never", verdict: "bypassed", evidence: "listener hit" },
      { ...base, provider: "claude", sandbox: "native", variant: "default", approvalPolicy: "allow-all", verdict: "bypassed", evidence: "file exists" },
    ];
    const out = deriveIsolationInputs(rows);
    expect(out.isolationWarnings).toEqual([
      { provider: "codex", os: "windows", sandbox: "workspaceWrite", variant: "elevated", variantApplied: "verified", area: "fs_tmp_parent", bypassedPolicies: ["never"] },
      { provider: "codex", os: "windows", sandbox: "workspaceWrite", variant: "elevated", variantApplied: "verified", area: "network_loopback", bypassedPolicies: ["on-request", "never"] },
      { provider: "claude", os: "windows", sandbox: "native", variant: "default", variantApplied: "verified", area: "fs_outside", bypassedPolicies: ["allow-all"] },
    ]);
    expect(out.guaranteeDowngrades).toEqual([
      { column: "codex/windows/workspaceWrite/elevated", area: "fs_tmp_parent", level: "DETECTED" },
      { column: "codex/windows/workspaceWrite/elevated", area: "network_loopback", level: "DETECTED" },
      { column: "claude/windows/native/default", area: "fs_outside", level: "POLICY_ONLY" },
    ]);
  });

  it("적용이 검증되지 않은 변형(unelevated)은 경고에는 남기되 보장 수준 하향 입력에서는 제외한다(리뷰 #4)", () => {
    const rows: IsolationRow[] = [
      { ...base, approvalPolicy: "never", area: "network_loopback", verdict: "bypassed", evidence: "" },
      { ...base, variant: "unelevated", variantApplied: "unverified", approvalPolicy: "never", area: "network_loopback", verdict: "bypassed", evidence: "" },
    ];
    const out = deriveIsolationInputs(rows);
    expect(out.isolationWarnings.map((w) => [w.variant, w.variantApplied])).toEqual([
      ["elevated", "verified"],
      ["unelevated", "unverified"],
    ]);
    expect(out.guaranteeDowngrades).toEqual([{ column: "codex/windows/workspaceWrite/elevated", area: "network_loopback", level: "DETECTED" }]);
  });

  it("외부 HTTP 효과는 전체 명령 문자열에서 호스트를 찾고 전체 출력에서 000이 아닌 상태 코드를 찾는다(리뷰 #1)", () => {
    const longPrefix = `"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -Command 'Set-Location (Get-Location); $ProgressPreference="SilentlyContinue"; `;
    expect(longPrefix.length).toBeGreaterThan(100);
    const cmd = `${longPrefix}curl.exe -s -o NUL -w "%{http_code}" https://example.com'`;
    expect(externalHttpEffect([{ command: cmd, output: "200", exitCode: 0 }], "example.com")).toBe(true);
    expect(externalHttpEffect([{ command: cmd, output: "000", exitCode: 1 }], "example.com")).toBe(false);
    expect(externalHttpEffect([{ command: cmd, output: "", exitCode: null }], "example.com")).toBe(false);
    expect(externalHttpEffect([{ command: "curl.exe -s http://127.0.0.1:1/ping", output: "200", exitCode: 0 }], "example.com")).toBe(false);
    expect(externalHttpEffect([{ command: cmd, output: "HTTP/1.1 404 Not Found", exitCode: 0 }], "example.com")).toBe(true);
  });
});
