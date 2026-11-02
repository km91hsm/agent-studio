/**
 * Scheduler (P01 T4) — Task 전이의 유일한 경로 `transition()`. 상태는 저널(`store.subscribe(0)`)에서만 파생된다.
 * - LEASE 이벤트: 현재 lease 토큰과 같아야 하며 다르면 `StaleWriterRejected` 기록 후 StaleWriterError(상태 불변)
 * - USER 이벤트: `auth.kind='user'`(토큰 없음)
 * - DAEMON 이벤트(approved/denied_terminal/approval_expired): ApprovalCoordinator 만, 저널의 ApprovalDecided/Expired 와 pendingRequestId 대조
 * - 모든 precondition ID 는 검사기를 가진다(미등록 → 생성 시 PreconditionUnenforced). P01 최소 검사 ↔ 소유 Phase 는 projections.md §3.
 */
import type { EventType, JournalEvent, TaskEvent, TaskKind, TaskState, TransitionTable } from "@agent-studio/protocol";
import { DAEMON_EVENTS, LEASE_EVENTS, loadTransitions, nextState, PRECONDITION_IDS, TASK_KINDS, ulid, USER_EVENTS } from "@agent-studio/protocol";
import type { EventStore } from "./journal/event-store.js";

export type TransitionAuth = { kind: "lease"; token: number } | { kind: "user" } | { kind: "daemon"; requestId: string };

export interface TaskView {
  id: string;
  status: TaskState;
  paused: boolean;
  iteration: number;
  implementerAgent?: string;
  lease?: { runId: string; fencingToken: number; expiresAt: string };
  resumeFrom?: TaskState;
  pendingRequestId?: string;
}

export class SchedulerError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class InvalidTransition extends SchedulerError {
  constructor(from: string, event: string) {
    super("invalid_transition", `invalid transition: ${from} --${event}-->`);
  }
}
export class AuthKindMismatch extends SchedulerError {
  constructor(event: string, got: string) {
    super("auth_kind_mismatch", `event ${event} requires a different auth kind (got ${got})`);
  }
}
export class StaleWriterError extends SchedulerError {
  constructor(token: number, current: number | null) {
    super("stale_writer", `stale fencing token ${token} (current ${current ?? "none"})`);
  }
}
export class PreconditionFailed extends SchedulerError {
  constructor(readonly precondition: string) {
    super("precondition_failed", `precondition failed: ${precondition}`);
  }
}
export class PreconditionUnenforced extends SchedulerError {
  constructor(ids: string[]) {
    super("precondition_unenforced", `transition table uses precondition(s) with no registered checker: ${ids.join(", ")}`);
  }
}
export class LeaseHeld extends SchedulerError {
  constructor(taskId: string) {
    super("lease_held", `lease held: task ${taskId} already has a live lease`);
  }
}
export class LeaseSuspended extends SchedulerError {
  constructor(taskId: string) {
    super("lease_suspended", `lease suspended: task ${taskId} is WAITING_APPROVAL — heartbeat does not extend the lease (reacquire after resume)`);
  }
}
export class SlotUnavailable extends SchedulerError {
  constructor(max: number) {
    super("slot_unavailable", `slot unavailable: ${max} live lease(s) already held by other tasks`);
  }
}
export class UnknownTask extends SchedulerError {
  constructor(taskId: string) {
    super("unknown_task", `unknown task: ${taskId}`);
  }
}

interface TaskRecord extends TaskView {
  seen: Set<EventType>;
}
type ApprovalRecord = { taskId?: string; outcome?: "accept" | "decline" | "cancel" | "expired" };

export interface PreconditionCtx {
  task: TaskView;
  event: TaskEvent;
  auth: TransitionAuth;
  payload: Record<string, unknown>;
  has(type: EventType): boolean;
  approval(requestId: string): ApprovalRecord | undefined;
  /** 이 Task 를 제외한 다른 Task 들의 살아 있는 lease 수(리뷰A#1: 자기 lease 를 다시 세지 않음) */
  liveLeases(): number;
}

export interface SchedulerOptions {
  leaseTtlMs?: number;
  maxIterations?: number;
  maxSlots?: number;
  now?: () => number;
  table?: TransitionTable;
}

const USER_PAYLOAD_KEYS = ["implementer_agent", "reviewer_agent", "policy", "evidenceIds"] as const;

export class Scheduler {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly approvals = new Map<string, ApprovalRecord>();
  private readonly table: TransitionTable;
  private readonly leaseTtlMs: number;
  private readonly maxIterations: number;
  private readonly maxSlots: number | undefined;
  private readonly now: () => number;
  private tokenCounter = 0;
  private readonly checkers: Record<string, (ctx: PreconditionCtx) => boolean>;

  constructor(
    private readonly store: EventStore,
    opts: SchedulerOptions = {},
  ) {
    this.table = opts.table ?? loadTransitions();
    this.leaseTtlMs = opts.leaseTtlMs ?? 90_000;
    this.maxIterations = opts.maxIterations ?? 3;
    this.maxSlots = opts.maxSlots;
    this.now = opts.now ?? Date.now;
    this.checkers = {
      deps_completed: () => true, // Task 의존성은 P03(Phase DAG) — P01 Task 는 deps 없음
      slot_available: (c) => this.maxSlots === undefined || c.liveLeases() < this.maxSlots,
      lease_valid: (c) => c.auth.kind === "lease" && c.task.lease?.fencingToken === c.auth.token,
      plan_artifact: (c) => c.has("PlanArtifact"),
      skill_selected: (c) => c.has("SkillSelected"),
      run_artifacts: (c) => c.has("RunArtifacts"),
      review_skip_policy: (c) => typeof c.payload.policy === "string" && c.payload.policy.length > 0,
      reviewer_distinct: (c) => typeof c.payload.reviewer_agent === "string" && c.task.implementerAgent !== undefined && c.payload.reviewer_agent !== c.task.implementerAgent,
      evidence_present: (c) => Array.isArray(c.payload.evidenceIds) && c.payload.evidenceIds.length > 0,
      iteration_lt_max: (c) => c.task.iteration < this.maxIterations,
      iteration_ge_max: (c) => c.task.iteration >= this.maxIterations,
      user_actor: (c) => c.auth.kind === "user",
      approval_decided: (c) => {
        if (c.auth.kind !== "daemon") return false;
        const rec = c.approval(c.auth.requestId);
        if (!rec || rec.taskId !== c.task.id || c.task.pendingRequestId !== c.auth.requestId) return false;
        if (c.event === "approved") return rec.outcome === "accept";
        if (c.event === "denied_terminal") return rec.outcome === "decline" || rec.outcome === "cancel";
        if (c.event === "approval_expired") return rec.outcome === "expired";
        return false;
      },
    };
    const used = new Set(this.table.transitions.flatMap((t) => t.preconditions));
    const missing = [...used].filter((id) => !(id in this.checkers));
    if (missing.length) throw new PreconditionUnenforced(missing);
    const unknownIds = (PRECONDITION_IDS as readonly string[]).filter((id) => !(id in this.checkers));
    if (unknownIds.length) throw new PreconditionUnenforced(unknownIds);
    store.subscribe(0, (e) => this.applyEvent(e));
  }

  // ---------- 저널 → 뷰 ----------
  private applyEvent(e: JournalEvent): void {
    if (e.type === "LeaseAcquired" && typeof e.payload.token === "number") this.tokenCounter = Math.max(this.tokenCounter, e.payload.token);
    if (e.type === "ApprovalRequested" && typeof e.payload.request_id === "string") {
      this.approvals.set(e.payload.request_id, { ...(this.approvals.get(e.payload.request_id) ?? {}), taskId: e.taskId });
    } else if ((e.type === "ApprovalDecided" || e.type === "ApprovalExpired") && typeof e.payload.request_id === "string") {
      // 리뷰A#2: 결정·만료는 ApprovalRequested 와 같은 Task 로 기록된 것만 결과로 인정한다(다른 Task 로 기록된 동일 request_id 는 무시)
      const rec = this.approvals.get(e.payload.request_id);
      if (rec && rec.taskId === e.taskId) rec.outcome = e.type === "ApprovalExpired" ? "expired" : (e.payload.decision as ApprovalRecord["outcome"]);
    }
    if (!e.taskId) return;
    let t = this.tasks.get(e.taskId);
    if (e.type === "TaskCreated") {
      t = { id: e.taskId, status: "QUEUED", paused: false, iteration: 0, seen: new Set() };
      this.tasks.set(e.taskId, t);
      return;
    }
    if (!t) return;
    t.seen.add(e.type);
    switch (e.type) {
      case "TaskTransition": {
        const to = e.payload.to as TaskState;
        const from = e.payload.from as TaskState | null;
        t.status = to;
        if (typeof e.payload.iteration === "number") t.iteration = e.payload.iteration;
        if (typeof e.payload.implementer_agent === "string") t.implementerAgent = e.payload.implementer_agent;
        if (to === "WAITING_APPROVAL") {
          t.resumeFrom = from ?? undefined;
          t.pendingRequestId = typeof e.payload.request_id === "string" ? e.payload.request_id : undefined;
        } else if (from === "WAITING_APPROVAL") {
          t.resumeFrom = undefined;
          t.pendingRequestId = undefined;
        }
        break;
      }
      case "LeaseAcquired":
        t.lease = { runId: String(e.payload.run_id ?? e.agentRunId), fencingToken: Number(e.payload.token), expiresAt: String(e.payload.expires_at) };
        break;
      case "LeaseRenewed":
        if (t.lease && t.lease.fencingToken === e.payload.token && typeof e.payload.expires_at === "string") t.lease.expiresAt = e.payload.expires_at;
        break;
      case "LeaseExpired":
        if (t.lease && t.lease.fencingToken === e.payload.token) t.lease = undefined;
        break;
      case "Paused":
        t.paused = true;
        break;
      case "ResumeRequested":
        t.paused = false;
        break;
    }
  }

  // ---------- 공개 API ----------
  submit(t: { id?: string; phaseId?: string; title: string; kind: TaskKind }): string {
    if (!(TASK_KINDS as readonly string[]).includes(t.kind)) throw new SchedulerError("invalid_kind", `invalid task kind: ${t.kind}`);
    const id = t.id ?? ulid(this.now());
    if (this.tasks.has(id)) throw new SchedulerError("duplicate_task", `task exists: ${id}`);
    this.store.append({ type: "TaskCreated", taskId: id, phaseId: t.phaseId, payload: { title: t.title, kind: t.kind, ...(t.phaseId && { phase_id: t.phaseId }) } });
    this.store.append({ type: "TaskTransition", taskId: id, payload: { from: null, to: "QUEUED", reason: "submit" } });
    return id;
  }

  state(taskId: string): TaskView {
    const t = this.get(taskId);
    const { seen: _s, ...view } = t;
    return { ...view, lease: t.lease ? { ...t.lease } : undefined };
  }

  acquireLease(taskId: string, runId: string): { fencingToken: number; expiresAt: string } {
    const t = this.get(taskId);
    if (this.table.terminal.includes(t.status)) throw new InvalidTransition(t.status, "acquireLease");
    if (t.lease && !this.isExpired(t.lease.expiresAt)) throw new LeaseHeld(taskId);
    if (this.maxSlots !== undefined && this.liveLeaseCount(taskId) >= this.maxSlots) throw new SlotUnavailable(this.maxSlots);
    const fencingToken = ++this.tokenCounter;
    const expiresAt = new Date(this.now() + this.leaseTtlMs).toISOString();
    this.store.append({ type: "LeaseAcquired", taskId, agentRunId: runId, fencingToken, payload: { run_id: runId, token: fencingToken, ttl: this.leaseTtlMs, expires_at: expiresAt } });
    return { fencingToken, expiresAt };
  }

  heartbeat(taskId: string, fencingToken: number): void {
    const t = this.get(taskId);
    if (!t.lease || t.lease.fencingToken !== fencingToken || this.isExpired(t.lease.expiresAt)) {
      this.rejectStale(t, fencingToken);
    }
    if (t.status === "WAITING_APPROVAL") throw new LeaseSuspended(taskId); // 리뷰A#5: 승인 대기 중 lease 는 만료되게 두고 복귀 후 재획득
    const expiresAt = new Date(this.now() + this.leaseTtlMs).toISOString();
    this.store.append({
      type: "LeaseRenewed",
      taskId,
      agentRunId: t.lease!.runId,
      fencingToken,
      payload: { run_id: t.lease!.runId, token: fencingToken, heartbeat_at: new Date(this.now()).toISOString(), expires_at: expiresAt },
    });
  }

  /** TTL 이 지난 lease 를 LeaseExpired 로 회수한다. 상태는 바꾸지 않는다(WAITING_APPROVAL 유지 — 복귀 후 재획득). */
  expireLeases(): string[] {
    const out: string[] = [];
    for (const t of this.tasks.values()) {
      if (t.lease && this.isExpired(t.lease.expiresAt)) {
        this.store.append({ type: "LeaseExpired", taskId: t.id, agentRunId: t.lease.runId, payload: { run_id: t.lease.runId, token: t.lease.fencingToken, reason: "ttl" } });
        out.push(t.id);
      }
    }
    return out;
  }

  /** 모든 Task 의 현재 뷰(RPC task.list). */
  list(): TaskView[] {
    return [...this.tasks.keys()].map((id) => this.state(id));
  }

  /**
   * transition() 과 같은 규칙(전이표·auth 종류·fencing·precondition)으로 판정만 하고 아무것도 기록하지 않는다(리뷰A#3).
   * 호출자가 저널에 선행 기록(승인 요청 등)을 남기기 전에 전이 가능성을 확인하는 용도. 실패는 transition() 과 같은 오류.
   */
  check(taskId: string, event: TaskEvent, auth: TransitionAuth, payload: Record<string, unknown> = {}): TaskState {
    return this.resolve(taskId, event, auth, payload, false).to;
  }

  transition(taskId: string, event: TaskEvent, auth: TransitionAuth, payload: Record<string, unknown> = {}): TaskState {
    const { t, to } = this.resolve(taskId, event, auth, payload, true);

    const body: Record<string, unknown> = { from: t.status, to, reason: event };
    for (const k of USER_PAYLOAD_KEYS) if (k in payload && k !== "evidenceIds") body[k] = payload[k];
    if (event === "approval_needed" || event === "git_conflict" || event === "recovery_review" || event === "compare_blocked") {
      if (typeof payload.requestId === "string") body.request_id = payload.requestId;
    }
    if (auth.kind === "daemon") body.request_id = auth.requestId;
    if (to === "REWORK" && (event === "review_failed" || event === "evidence_missing")) body.iteration = t.iteration + 1;
    if (event === "evidence_ok") body.evidence_ids = payload.evidenceIds;

    this.store.append({
      type: "TaskTransition",
      taskId,
      ...(auth.kind === "lease" && { fencingToken: auth.token, agentRunId: t.lease?.runId }),
      ...(auth.kind === "daemon" && { correlationId: auth.requestId }),
      payload: body,
    });
    // BLOCKED·종결·QUEUED 로 가면 현재 run 의 lease 는 재사용 금지 → 해제
    if (t.lease && (to === "BLOCKED" || to === "QUEUED" || this.table.terminal.includes(to))) {
      this.store.append({ type: "LeaseExpired", taskId, agentRunId: t.lease.runId, payload: { run_id: t.lease.runId, token: t.lease.fencingToken, reason: "released" } });
    }
    return to;
  }

  // ---------- 내부 ----------
  /** 전이 판정 공통부. record=true 면 stale 시도를 StaleWriterRejected 로 기록한다(check 는 기록하지 않음). */
  private resolve(taskId: string, event: TaskEvent, auth: TransitionAuth, payload: Record<string, unknown>, record: boolean): { t: TaskRecord; to: TaskState } {
    const t = this.get(taskId);
    const edge = nextState(this.table, t.status, event);
    if (!edge) throw new InvalidTransition(t.status, event);
    const expectedKind = USER_EVENTS.has(event) ? "user" : DAEMON_EVENTS.has(event) ? "daemon" : LEASE_EVENTS.has(event) ? "lease" : null;
    if (expectedKind === null || auth.kind !== expectedKind) throw new AuthKindMismatch(event, auth.kind);
    if (auth.kind === "lease" && (!t.lease || t.lease.fencingToken !== auth.token || this.isExpired(t.lease.expiresAt))) {
      if (record) this.rejectStale(t, auth.token);
      throw new StaleWriterError(auth.token, t.lease && !this.isExpired(t.lease.expiresAt) ? t.lease.fencingToken : null);
    }
    const ctx: PreconditionCtx = {
      task: this.state(taskId),
      event,
      auth,
      payload,
      has: (type) => t.seen.has(type),
      approval: (id) => this.approvals.get(id),
      liveLeases: () => this.liveLeaseCount(taskId),
    };
    for (const id of edge.preconditions) {
      if (!this.checkers[id]!(ctx)) throw new PreconditionFailed(id);
    }
    let to: TaskState;
    if (edge.to === "$resume") {
      if (!t.resumeFrom) throw new PreconditionFailed("approval_decided");
      to = t.resumeFrom;
    } else to = edge.to;
    return { t, to };
  }
  /** except 를 제외한 Task 들의 살아 있는 lease 수 */
  private liveLeaseCount(except?: string): number {
    return [...this.tasks.values()].filter((x) => x.id !== except && x.lease && !this.isExpired(x.lease.expiresAt)).length;
  }
  private get(taskId: string): TaskRecord {
    const t = this.tasks.get(taskId);
    if (!t) throw new UnknownTask(taskId);
    return t;
  }
  private isExpired(expiresAt: string): boolean {
    return Date.parse(expiresAt) <= this.now();
  }
  private rejectStale(t: TaskRecord, token: number): never {
    const current = t.lease && !this.isExpired(t.lease.expiresAt) ? t.lease.fencingToken : null;
    this.store.append({ type: "StaleWriterRejected", taskId: t.id, fencingToken: token, payload: { task_id: t.id, token, current } });
    throw new StaleWriterError(token, current);
  }
}
