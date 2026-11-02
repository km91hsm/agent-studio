/**
 * 승인 정책 계약 (P01 T5). 14 category = SECURITY_MODEL §2.2 enum(P10a `categories.ts` 의 선행 정본),
 * 기본 verdict = §2 "기본" 열, 조건부 규칙은 `exceptions[]`(신호 → verdict)로 데이터화한다(검토 #11).
 * 신호를 공급자 이벤트에서 **추출**하는 것은 P10a 범위이고, P01 은 스키마·판정만 제공한다.
 */
import { readFileSync } from "node:fs";
import { Ajv } from "ajv";

export const APPROVAL_CATEGORIES = [
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
] as const;
export type ApprovalCategory = (typeof APPROVAL_CATEGORIES)[number];

export type Verdict = "AUTO" | "ASK" | "ALWAYS_ASK" | "DENY";
export type ApprovalScope = "once" | "project" | "until_expiry";

/** 요청에 붙는 분류 신호(P10a 가 추출). */
export interface Signals {
  pathOutsideWorktree?: boolean;
  readOnlyVerified?: boolean;
  unregisteredHost?: boolean;
  explicitUserAction?: boolean;
  trustedProject?: boolean;
  readOnlyBrowse?: boolean;
  readOnlyAuditTool?: boolean;
  action?: "capture" | "input";
}

export interface PolicyException {
  when: Signals;
  verdict: Verdict;
  scope?: ApprovalScope;
}

export interface PolicyRule {
  default: Verdict;
  scope: ApprovalScope;
  ttlMinutes?: number;
  exceptions?: PolicyException[];
  separateApproval?: Array<"capture" | "input">;
  note?: string;
}

export type ClaudePermissionMode = "plan" | "default" | "acceptEdits" | "auto" | "bypassPermissions" | "dontAsk";
export interface PermissionMode {
  claude: ClaudePermissionMode;
  codex: { approvalPolicy: "untrusted" | "on-request" | "never"; sandbox: "readOnly" | "workspaceWrite" };
}

export interface ProjectPolicy {
  v: 1;
  permissionMode: PermissionMode;
  autoModeConfirmed?: { combo: string; at: string };
  rules: Record<ApprovalCategory, PolicyRule>;
}

const explicitAsk = (scope: ApprovalScope = "once"): PolicyException => ({ when: { explicitUserAction: true }, verdict: "ALWAYS_ASK", scope });

export const DEFAULT_POLICY: ProjectPolicy = {
  v: 1,
  permissionMode: { claude: "default", codex: { approvalPolicy: "on-request", sandbox: "workspaceWrite" } },
  rules: {
    project_trust: { default: "ASK", scope: "project", note: "경로·remote·지침 파일 해시 변경 시 만료" },
    fs_write: { default: "AUTO", scope: "project", exceptions: [{ when: { pathOutsideWorktree: true }, verdict: "DENY", scope: "once" }], note: "worktree 내 AUTO / 외부 DENY(once 예외)" },
    exec: { default: "ASK", scope: "once", exceptions: [{ when: { readOnlyVerified: true }, verdict: "AUTO" }], note: "검증된 읽기 전용만 AUTO; 반복은 짧은 until-expiry" },
    network: { default: "ASK", scope: "once", exceptions: [{ when: { unregisteredHost: true }, verdict: "DENY" }], note: "호스트·프로토콜·포트 once" },
    git_remote: { default: "DENY", scope: "once", exceptions: [explicitAsk("once")], note: "push·force·remote 변경 DENY; 사용자가 push 액션을 명시 선택하면 그 1회만 ALWAYS_ASK(SE-01b)" },
    db_change: { default: "ALWAYS_ASK", scope: "once", note: "대상 DB·migration 해시" },
    dep_install: { default: "ALWAYS_ASK", scope: "once", note: "lockfile·패키지 목록" },
    hook_enable: { default: "DENY", scope: "project", exceptions: [explicitAsk("project")], note: "Hook 해시 변경 시 만료" },
    mcp_call: { default: "ASK", scope: "until_expiry", ttlMinutes: 60, exceptions: [{ when: { readOnlyAuditTool: true }, verdict: "AUTO" }], note: "도구·서버별 once/until-expiry" },
    external_service: { default: "DENY", scope: "once", exceptions: [explicitAsk("once")], note: "대상·작업·요청 once" },
    deploy: { default: "DENY", scope: "once", exceptions: [explicitAsk("once")], note: "환경·artifact 해시" },
    browser: { default: "ASK", scope: "once", exceptions: [{ when: { readOnlyBrowse: true, trustedProject: true }, verdict: "AUTO" }], note: "호스트·탭 once; 읽기 전용 열람은 신뢰 프로젝트에서 AUTO" },
    computer_use: { default: "ALWAYS_ASK", scope: "once", separateApproval: ["capture", "input"], note: "자동 모드에서도 ALWAYS_ASK; 캡처와 입력은 분리 승인, 동작 ID·대상 창 기록" },
    doc_export: { default: "DENY", scope: "once", exceptions: [explicitAsk("once")], note: "대상 문서 once" },
  },
};

/** 예외는 순서대로 보고 `when` 의 모든 키가 신호와 같을 때 첫 일치의 verdict; 없으면 default. */
export function evaluateRule(rule: PolicyRule, signals: Signals = {}): Verdict {
  return matchException(rule, signals)?.verdict ?? rule.default;
}

export function matchException(rule: PolicyRule, signals: Signals = {}): PolicyException | undefined {
  const sig = signals as Record<string, unknown>;
  return rule.exceptions?.find((ex) => Object.entries(ex.when).every(([k, v]) => sig[k] === v));
}

let validator: ((x: unknown) => boolean) & { errors?: { instancePath: string; message?: string; params?: Record<string, unknown> }[] | null };

export function validatePolicy(input: unknown): string[] {
  if (!validator) {
    const schema = JSON.parse(readFileSync(new URL("./policy.schema.json", import.meta.url), "utf8")) as object;
    const ajv = new Ajv({ allErrors: true, strict: true });
    validator = ajv.compile(schema) as typeof validator;
  }
  if (validator(input)) return [];
  return (validator.errors ?? []).map((e) => {
    const extra = e.params && "additionalProperty" in e.params ? ` (${String(e.params.additionalProperty)})` : "";
    return `${e.instancePath || "/"}: ${e.message ?? "invalid"}${extra}`;
  });
}
