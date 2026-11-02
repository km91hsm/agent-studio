/**
 * Task 상태 머신 타입 + `task-transitions.json` 로더 (P01 T4). JSON 이 단일 출처이고 이 파일은 타입·조회만 제공한다.
 * 이벤트 분류(검토 #1): USER(사용자 조작, 토큰 없음) / DAEMON(승인 결과, ApprovalCoordinator 전용) / LEASE(현재 lease 토큰 필수).
 */
import transitionsJson from "./task-transitions.json" with { type: "json" };

export const TASK_STATES = ["QUEUED", "PLANNING", "IMPLEMENTING", "REVIEWING", "REWORK", "VERIFYING", "WAITING_APPROVAL", "BLOCKED", "COMPLETED", "FAILED", "CANCELLED"] as const;
export type TaskState = (typeof TASK_STATES)[number];
export const TERMINAL_STATES: readonly TaskState[] = ["COMPLETED", "FAILED", "CANCELLED"];

export const USER_EVENTS: ReadonlySet<string> = new Set(["cancel", "unblocked", "user_abandon"]);
export const DAEMON_EVENTS: ReadonlySet<string> = new Set(["approved", "denied_terminal", "approval_expired"]);
export const LEASE_EVENTS: ReadonlySet<string> = new Set([
  "lease_acquired",
  "plan_accepted",
  "impl_done",
  "review_skipped",
  "review_passed",
  "review_failed",
  "rework_started",
  "evidence_ok",
  "evidence_missing",
  "approval_needed",
  "git_conflict",
  "recovery_review",
  "compare_blocked",
  "auth",
  "quota",
  "network",
  "skill_missing",
  "recovery_uncertain",
  "session_unavailable",
  "iteration_exhausted",
]);

export type TaskEvent =
  | "lease_acquired"
  | "plan_accepted"
  | "impl_done"
  | "review_skipped"
  | "review_passed"
  | "review_failed"
  | "rework_started"
  | "evidence_ok"
  | "evidence_missing"
  | "approval_needed"
  | "git_conflict"
  | "recovery_review"
  | "compare_blocked"
  | "approved"
  | "denied_terminal"
  | "approval_expired"
  | "auth"
  | "quota"
  | "network"
  | "skill_missing"
  | "recovery_uncertain"
  | "session_unavailable"
  | "unblocked"
  | "user_abandon"
  | "iteration_exhausted"
  | "cancel";

/** 전이 사전 조건 ID. 모든 ID 는 Scheduler 에 검사기가 등록돼야 한다(미등록 → PreconditionUnenforced). */
export const PRECONDITION_IDS = [
  "deps_completed",
  "slot_available",
  "lease_valid",
  "plan_artifact",
  "skill_selected",
  "run_artifacts",
  "review_skip_policy",
  "reviewer_distinct",
  "evidence_present",
  "iteration_lt_max",
  "iteration_ge_max",
  "user_actor",
  "approval_decided",
] as const;
export type PreconditionId = (typeof PRECONDITION_IDS)[number];

export interface Transition {
  from: TaskState;
  event: TaskEvent;
  /** 다음 상태 또는 `$resume`(approval_needed 당시 상태로 복귀) */
  to: TaskState | "$resume";
  preconditions: string[];
}

export interface TransitionTable {
  v: number;
  states: TaskState[];
  terminal: TaskState[];
  transitions: Transition[];
}

export function loadTransitions(): TransitionTable {
  const raw = structuredClone(transitionsJson) as TransitionTable & { $comment?: string };
  const { $comment: _c, ...table } = raw;
  return table;
}

export function nextState(table: TransitionTable, from: TaskState, event: TaskEvent | string): { to: TaskState | "$resume"; preconditions: string[] } | null {
  const t = table.transitions.find((x) => x.from === from && x.event === event);
  return t ? { to: t.to, preconditions: t.preconditions } : null;
}

export function isTerminal(table: TransitionTable, s: TaskState): boolean {
  return table.terminal.includes(s);
}
