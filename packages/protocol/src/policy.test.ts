/**
 * 정책 JSON 스키마·기본값 (P01 T5). 14 category = SECURITY_MODEL §2.2 enum, 기본 verdict = §2 "기본" 열,
 * 조건부 규칙은 `exceptions[]`(검토 #11)로 데이터화.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APPROVAL_CATEGORIES, DEFAULT_POLICY, evaluateRule, validatePolicy } from "./policy.js";

const DEFAULT_JSON = fileURLToPath(new URL("./default-policy.json", import.meta.url));

describe("policy schema", () => {
  it("DEFAULT_POLICY 는 스키마를 통과하고 default-policy.json 과 deepEqual", () => {
    expect(validatePolicy(DEFAULT_POLICY)).toEqual([]);
    expect(JSON.parse(readFileSync(DEFAULT_JSON, "utf8"))).toEqual(DEFAULT_POLICY);
  });

  it("14개 category 전부 rules 에 있고 순서는 SECURITY §2.2 표와 같다", () => {
    expect([...APPROVAL_CATEGORIES]).toEqual([
      "project_trust",
      "fs_write",
      "exec",
      "network",
      "git_remote",
      "db_change",
      "dep_install",
      "hook_enable",
      "mcp_call",
      "external_service",
      "deploy",
      "browser",
      "computer_use",
      "doc_export",
    ]);
    expect(Object.keys(DEFAULT_POLICY.rules).sort()).toEqual([...APPROVAL_CATEGORIES].sort());
  });

  it("카테고리 누락·미지 카테고리·위험 값·추가 속성은 오류 문자열을 돌려준다", () => {
    const { fs_write: _drop, ...rest } = DEFAULT_POLICY.rules;
    expect(validatePolicy({ ...DEFAULT_POLICY, rules: rest }).join("\n")).toMatch(/fs_write/);
    expect(validatePolicy({ ...DEFAULT_POLICY, rules: { ...DEFAULT_POLICY.rules, bogus: DEFAULT_POLICY.rules.exec } }).join("\n")).toMatch(/bogus|additional/i);
    expect(validatePolicy({ ...DEFAULT_POLICY, permissionMode: { ...DEFAULT_POLICY.permissionMode, codex: { approvalPolicy: "on-request", sandbox: "dangerFullAccess" } } }).join("\n")).toMatch(/sandbox/);
    expect(validatePolicy({ ...DEFAULT_POLICY, extra: 1 }).join("\n")).toMatch(/extra|additional/i);
    expect(validatePolicy({ ...DEFAULT_POLICY, v: 2 }).join("\n")).toMatch(/v/);
    expect(validatePolicy(null).length).toBeGreaterThan(0);
    expect(validatePolicy({ ...DEFAULT_POLICY, rules: { ...DEFAULT_POLICY.rules, exec: { ...DEFAULT_POLICY.rules.exec, default: "ALLOW" } } }).join("\n")).toMatch(/default/);
  });

  it("evaluateRule: 예외는 when 의 모든 키가 신호와 일치할 때만, 순서대로 첫 일치", () => {
    const rule = DEFAULT_POLICY.rules.browser;
    expect(evaluateRule(rule, {})).toBe("ASK");
    expect(evaluateRule(rule, { readOnlyBrowse: true })).toBe("ASK");
    expect(evaluateRule(rule, { readOnlyBrowse: true, trustedProject: true })).toBe("AUTO");
    expect(evaluateRule(DEFAULT_POLICY.rules.fs_write, { pathOutsideWorktree: true })).toBe("DENY");
    expect(evaluateRule(DEFAULT_POLICY.rules.fs_write, { pathOutsideWorktree: false })).toBe("AUTO");
    // 리뷰A#8: SECURITY §2 원격 Git 행 "fetch ASK"
    expect(evaluateRule(DEFAULT_POLICY.rules.git_remote, { gitOperation: "fetch" })).toBe("ASK");
    expect(evaluateRule(DEFAULT_POLICY.rules.git_remote, { gitOperation: "push" })).toBe("DENY");
    expect(evaluateRule(DEFAULT_POLICY.rules.git_remote, { gitOperation: "force_push" })).toBe("DENY");
    expect(validatePolicy({ ...DEFAULT_POLICY, rules: { ...DEFAULT_POLICY.rules, git_remote: { default: "DENY", scope: "once", exceptions: [{ when: { gitOperation: "fetch" }, verdict: "ASK" }] } } })).toEqual([]);
    expect(validatePolicy({ ...DEFAULT_POLICY, rules: { ...DEFAULT_POLICY.rules, git_remote: { default: "DENY", scope: "once", exceptions: [{ when: { gitOperation: "clone" }, verdict: "ASK" }] } } }).join("\n")).toMatch(/gitOperation/);
  });
});
