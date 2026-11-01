/**
 * S4 — 격리 판정 로직(순수). AC-P00-7b: 조합별 판정값을 기록하고, `bypassed` 조합만
 * `capabilities.isolation_warning` 등록 입력과 SECURITY §2.1 보장 수준 하향 입력으로 산출한다.
 */
export type Verdict = "blocked" | "approval_requested" | "bypassed";

export interface Observation {
  /** 승인 요청 수(모두 decline 처리됨) */
  approvalRequests: number;
  /** 실제 효과 발생 여부(외부 파일 존재 / 수신 서버 요청 기록) */
  effect: boolean;
}

export function judge(o: Observation): Verdict {
  if (o.effect) return "bypassed";
  if (o.approvalRequests > 0) return "approval_requested";
  return "blocked";
}

export interface IsolationRow {
  provider: "codex" | "claude";
  os: "windows" | "wsl2" | "linux" | "macos";
  sandbox: string; // codex: readOnly|workspaceWrite, claude: native|sandbox
  variant: string; // codex windows: elevated|unelevated|mxc, claude: default
  approvalPolicy: string; // codex: on-request|never, claude: canUseTool 정책명
  /** fs_outside: 작업 공간·TEMP 밖 경로 / fs_tmp_parent: 임시 작업 공간의 상위(=TEMP, Codex 기본 쓰기 허용 루트) / network: 로컬 수신 서버 / network_external: example.com */
  area: "fs_outside" | "fs_tmp_parent" | "network" | "network_external";
  verdict: Verdict;
  evidence: string;
}

export interface IsolationWarning {
  provider: IsolationRow["provider"];
  os: IsolationRow["os"];
  sandbox: string;
  variant: string;
  approvalPolicy: string;
  area: IsolationRow["area"];
}

export interface GuaranteeDowngrade {
  column: string;
  area: IsolationRow["area"];
  /** 관찰 신호가 있는 공급자(codex: 사후 감사·수신 로그)는 DETECTED, 집행자가 없는 Claude native는 POLICY_ONLY */
  level: "DETECTED" | "POLICY_ONLY";
}

export function deriveIsolationInputs(rows: IsolationRow[]): { isolationWarnings: IsolationWarning[]; guaranteeDowngrades: GuaranteeDowngrade[] } {
  const bypassed = rows.filter((r) => r.verdict === "bypassed");
  return {
    isolationWarnings: bypassed.map(({ provider, os, sandbox, variant, approvalPolicy, area }) => ({ provider, os, sandbox, variant, approvalPolicy, area })),
    guaranteeDowngrades: bypassed.map((r) => ({
      column: `${r.provider}/${r.os}/${r.sandbox}/${r.variant}`,
      area: r.area,
      level: r.provider === "claude" && r.sandbox === "native" ? "POLICY_ONLY" : "DETECTED",
    })),
  };
}
