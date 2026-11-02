/**
 * Scheduler — AC-P01-1: 전이는 transition() 단일 경로, fencing token 불일치 거부, 저널 이벤트 1:1.
 * 검토 #1(승인 결과는 daemon 전용), #2(precondition 전부 등록·미등록 throw), #3(승인 대기 중 lease 만료는 상태 불변).
 */
import { describe, expect, it } from "vitest";
import { loadTransitions } from "@agent-studio/protocol";
import { FakeGateway } from "./gateway/fake-gateway.js";
import { SAMPLE_EVENTS } from "./gateway/fixtures.js";
import { MemoryEventStore } from "./journal/memory-store.js";
import { AuthKindMismatch, PreconditionFailed, PreconditionUnenforced, Scheduler, StaleWriterError } from "./scheduler.js";

const clock = (start = 1_762_041_600_000) => {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
};

function setup() {
  const c = clock();
  const store = new MemoryEventStore(c.now);
  const s = new Scheduler(store, { now: c.now });
  const id = s.submit({ title: "empty task", kind: "impl" });
  return { c, store, s, id };
}

/** QUEUED → PLANNING(lease) 까지 진행한 상태 */
function toPlanning() {
  const ctx = setup();
  const lease = ctx.s.acquireLease(ctx.id, "run-1");
  ctx.s.transition(ctx.id, "lease_acquired", { kind: "lease", token: lease.fencingToken });
  return { ...ctx, token: lease.fencingToken };
}

const transitions = (store: MemoryEventStore, taskId: string) => store.read(1).filter((e) => e.type === "TaskTransition" && e.taskId === taskId);

describe("Scheduler (AC-P01-1)", () => {
  it("(1) 빈 Task 가 QUEUED → … → COMPLETED 를 왕복하고 전이마다 TaskTransition 1건", async () => {
    const { store, s, id, token } = toPlanning();
    expect(s.state(id).status).toBe("PLANNING");
    store.append({ type: "PlanArtifact", taskId: id, payload: { task_id: id, path: "plan.md", hash: "h" } });
    store.append({ type: "SkillSelected", taskId: id, payload: { skill_id: "executing-plans", selection_reason: "USER_EXPLICIT", invocation_mode: "explicit", expected_lead: "executing-plans" } });
    expect(s.transition(id, "plan_accepted", { kind: "lease", token })).toBe("IMPLEMENTING");

    const gw = new FakeGateway([[SAMPLE_EVENTS.item_started, SAMPLE_EVENTS.item_finished, SAMPLE_EVENTS.turn_finished]]);
    const run = await gw.startRun({ agent: "codex", projectDir: "x", worktreeDir: "x", mode: "new", prompt: [], policy: {}, skills: [], mcp: { servers: [] }, authMode: "cli_login" });
    let n = 0;
    for await (const _e of run.events()) n++;
    expect(n).toBe(3);
    store.append({ type: "RunArtifacts", taskId: id, agentRunId: run.runId, payload: { files: [], tests: "n/a" } });

    expect(s.transition(id, "impl_done", { kind: "lease", token }, { implementer_agent: "claude" })).toBe("REVIEWING");
    expect(s.transition(id, "review_passed", { kind: "lease", token }, { reviewer_agent: "codex" })).toBe("VERIFYING");
    expect(s.transition(id, "evidence_ok", { kind: "lease", token }, { evidenceIds: ["e1"] })).toBe("COMPLETED");

    const tt = transitions(store, id);
    expect(tt.map((e) => [e.payload.from, e.payload.to])).toEqual([
      [null, "QUEUED"],
      ["QUEUED", "PLANNING"],
      ["PLANNING", "IMPLEMENTING"],
      ["IMPLEMENTING", "REVIEWING"],
      ["REVIEWING", "VERIFYING"],
      ["VERIFYING", "COMPLETED"],
    ]);
    expect(tt.slice(1).every((e) => e.fencingToken === token)).toBe(true);
    expect(store.read(1).filter((e) => e.type === "TaskCreated")).toHaveLength(1);
    expect(s.state(id)).toMatchObject({ status: "COMPLETED", iteration: 0 });
  });

  it("(2) precondition 미충족은 PreconditionFailed 이고 상태·저널이 불변", () => {
    const { store, s, id, token } = toPlanning();
    const before = store.lastSeq();
    expect(() => s.transition(id, "plan_accepted", { kind: "lease", token })).toThrow(PreconditionFailed);
    expect(() => s.transition(id, "plan_accepted", { kind: "lease", token })).toThrow(/plan_artifact/);
    store.append({ type: "PlanArtifact", taskId: id, payload: { task_id: id, path: "p", hash: "h" } });
    expect(() => s.transition(id, "plan_accepted", { kind: "lease", token })).toThrow(/skill_selected/);
    store.append({ type: "SkillSelected", taskId: id, payload: { skill_id: "x" } });
    s.transition(id, "plan_accepted", { kind: "lease", token });
    store.append({ type: "RunArtifacts", taskId: id, payload: { files: [], tests: "n/a" } });
    s.transition(id, "impl_done", { kind: "lease", token }, { implementer_agent: "claude" });
    expect(() => s.transition(id, "review_passed", { kind: "lease", token }, { reviewer_agent: "claude" })).toThrow(/reviewer_distinct/);
    s.transition(id, "review_passed", { kind: "lease", token }, { reviewer_agent: "codex" });
    expect(() => s.transition(id, "evidence_ok", { kind: "lease", token })).toThrow(/evidence_present/);
    expect(s.state(id).status).toBe("VERIFYING");
    expect(transitions(store, id).map((e) => e.payload.to)).toEqual(["QUEUED", "PLANNING", "IMPLEMENTING", "REVIEWING", "VERIFYING"]);
    expect(store.lastSeq()).toBeGreaterThan(before);
  });

  it("(3) 옛 fencing token 전이 → StaleWriterError + StaleWriterRejected 1건, 상태 불변 (Review Focus 3)", () => {
    const { store, s, id, token } = toPlanning();
    expect(() => s.transition(id, "approval_needed", { kind: "lease", token: token + 100 }, { requestId: "r" })).toThrow(StaleWriterError);
    const rejected = store.read(1).filter((e) => e.type === "StaleWriterRejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.payload).toMatchObject({ task_id: id, token: token + 100, current: token });
    expect(s.state(id).status).toBe("PLANNING");
  });

  it("(3b) 승인 결과 이벤트는 daemon 전용: user 권한이면 AuthKindMismatch, 저널 근거 없는 daemon 은 approval_decided 실패", () => {
    const { store, s, id, token } = toPlanning();
    store.append({ type: "ApprovalRequested", taskId: id, correlationId: "req-1", payload: { request_id: "req-1", kind: "approval", category: "exec", request: {}, requested_at: "t", expires_at: "t" } });
    s.transition(id, "approval_needed", { kind: "lease", token }, { requestId: "req-1" });
    expect(s.state(id)).toMatchObject({ status: "WAITING_APPROVAL", resumeFrom: "PLANNING", pendingRequestId: "req-1" });
    expect(() => s.transition(id, "approved", { kind: "user" })).toThrow(AuthKindMismatch);
    expect(() => s.transition(id, "approved", { kind: "lease", token })).toThrow(AuthKindMismatch);
    expect(() => s.transition(id, "approved", { kind: "daemon", requestId: "req-1" })).toThrow(/approval_decided/);
    expect(() => s.transition(id, "approved", { kind: "daemon", requestId: "req-other" })).toThrow(/approval_decided/);
    expect(() => s.transition(id, "cancel", { kind: "lease", token })).toThrow(AuthKindMismatch);
    expect(s.state(id).status).toBe("WAITING_APPROVAL");
  });

  it("(4) approval_needed(REWORK 포함) → WAITING_APPROVAL, ApprovalDecided 뒤 approved(daemon) → resumeFrom 복귀(payload.from 무시)", () => {
    const { store, s, id, token } = toPlanning();
    store.append({ type: "PlanArtifact", taskId: id, payload: {} });
    store.append({ type: "SkillSelected", taskId: id, payload: {} });
    s.transition(id, "plan_accepted", { kind: "lease", token });
    store.append({ type: "RunArtifacts", taskId: id, payload: {} });
    s.transition(id, "impl_done", { kind: "lease", token }, { implementer_agent: "claude" });
    s.transition(id, "review_failed", { kind: "lease", token }, { reviewer_agent: "codex" });
    expect(s.state(id)).toMatchObject({ status: "REWORK", iteration: 1 });
    store.append({ type: "ApprovalRequested", taskId: id, correlationId: "req-1", payload: { request_id: "req-1", kind: "approval", category: "exec", request: {}, requested_at: "t", expires_at: "t" } });
    expect(s.transition(id, "approval_needed", { kind: "lease", token }, { requestId: "req-1" })).toBe("WAITING_APPROVAL");
    store.append({ type: "ApprovalDecided", taskId: id, correlationId: "req-1", payload: { request_id: "req-1", decision: "accept", scope: "once", by: "user", decided_at: "t" } });
    expect(s.transition(id, "approved", { kind: "daemon", requestId: "req-1" }, { from: "COMPLETED" })).toBe("REWORK");
    expect(s.state(id)).toMatchObject({ status: "REWORK", pendingRequestId: undefined, resumeFrom: undefined });
    const last = transitions(store, id).at(-1)!;
    expect(last.payload).toMatchObject({ from: "WAITING_APPROVAL", to: "REWORK", reason: "approved", request_id: "req-1" });
    expect(last.correlationId).toBe("req-1");
  });

  it("(5) ApprovalExpired 뒤 approval_expired(daemon) → BLOCKED, unblocked(user) → QUEUED", () => {
    const { store, s, id, token } = toPlanning();
    store.append({ type: "ApprovalRequested", taskId: id, correlationId: "req-1", payload: { request_id: "req-1", kind: "approval", category: "exec", request: {}, requested_at: "t", expires_at: "t" } });
    s.transition(id, "approval_needed", { kind: "lease", token }, { requestId: "req-1" });
    expect(() => s.transition(id, "approval_expired", { kind: "daemon", requestId: "req-1" })).toThrow(/approval_decided/);
    store.append({ type: "ApprovalExpired", taskId: id, correlationId: "req-1", payload: { request_id: "req-1" } });
    expect(s.transition(id, "approval_expired", { kind: "daemon", requestId: "req-1" })).toBe("BLOCKED");
    expect(transitions(store, id).at(-1)!.payload).toMatchObject({ to: "BLOCKED", reason: "approval_expired" });
    expect(s.transition(id, "unblocked", { kind: "user" })).toBe("QUEUED");
    expect(s.state(id).lease).toBeUndefined();
  });

  it("(6) expireLeases: TTL 지난 lease 는 LeaseExpired 로 회수, WAITING_APPROVAL 은 불변, 복귀 뒤 같은 run 이 재획득(TaskTransition 0건)", () => {
    const { c, store, s, id, token } = toPlanning();
    store.append({ type: "ApprovalRequested", taskId: id, correlationId: "req-1", payload: { request_id: "req-1", kind: "approval", category: "exec", request: {}, requested_at: "t", expires_at: "t" } });
    s.transition(id, "approval_needed", { kind: "lease", token }, { requestId: "req-1" });
    expect(s.expireLeases()).toEqual([]);
    c.advance(91_000);
    expect(s.expireLeases()).toEqual([id]);
    expect(store.read(1).filter((e) => e.type === "LeaseExpired")).toHaveLength(1);
    expect(s.state(id)).toMatchObject({ status: "WAITING_APPROVAL", lease: undefined });
    store.append({ type: "ApprovalDecided", taskId: id, correlationId: "req-1", payload: { request_id: "req-1", decision: "accept", scope: "once", by: "user", decided_at: "t" } });
    expect(s.transition(id, "approved", { kind: "daemon", requestId: "req-1" })).toBe("PLANNING");
    const n = transitions(store, id).length;
    const lease2 = s.acquireLease(id, "run-1");
    expect(lease2.fencingToken).toBeGreaterThan(token);
    expect(transitions(store, id)).toHaveLength(n);
    expect(store.read(1).filter((e) => e.type === "LeaseAcquired")).toHaveLength(2);
    // 옛 토큰은 더 이상 유효하지 않다
    expect(() => s.transition(id, "approval_needed", { kind: "lease", token }, { requestId: "r2" })).toThrow(StaleWriterError);
    // heartbeat 가 만료를 미룬다
    s.heartbeat(id, lease2.fencingToken);
    c.advance(80_000);
    expect(s.expireLeases()).toEqual([]);
    expect(store.read(1).filter((e) => e.type === "LeaseRenewed")).toHaveLength(1);
  });

  it("(7) review_failed 3회째 뒤에는 rework_started 가 거부되고 iteration_exhausted 만 FAILED 로 간다", () => {
    const { store, s, id, token } = toPlanning();
    store.append({ type: "PlanArtifact", taskId: id, payload: {} });
    store.append({ type: "SkillSelected", taskId: id, payload: {} });
    s.transition(id, "plan_accepted", { kind: "lease", token });
    for (let i = 1; i <= 3; i++) {
      store.append({ type: "RunArtifacts", taskId: id, payload: {} });
      s.transition(id, "impl_done", { kind: "lease", token }, { implementer_agent: "claude" });
      s.transition(id, "review_failed", { kind: "lease", token }, { reviewer_agent: "codex" });
      expect(s.state(id)).toMatchObject({ status: "REWORK", iteration: i });
      if (i < 3) s.transition(id, "rework_started", { kind: "lease", token });
    }
    expect(() => s.transition(id, "rework_started", { kind: "lease", token })).toThrow(/iteration_lt_max/);
    expect(s.transition(id, "iteration_exhausted", { kind: "lease", token })).toBe("FAILED");
    expect(() => s.transition(id, "cancel", { kind: "user" })).toThrow(/invalid transition/i);
  });

  it("(8) 미등록 precondition ID 가 테이블에 있으면 Scheduler 생성 시 PreconditionUnenforced", () => {
    const table = loadTransitions();
    const broken = { ...table, transitions: table.transitions.map((t, i) => (i === 0 ? { ...t, preconditions: [...t.preconditions, "owner_phase_check"] } : t)) };
    expect(() => new Scheduler(new MemoryEventStore(), { table: broken })).toThrow(PreconditionUnenforced);
    expect(() => new Scheduler(new MemoryEventStore(), { table: broken })).toThrow(/owner_phase_check/);
  });

  it("(9) 재기동: 같은 저널로 새 Scheduler 를 만들면 상태·lease·pending 이 복원된다", () => {
    const { c, store, s, id, token } = toPlanning();
    store.append({ type: "ApprovalRequested", taskId: id, correlationId: "req-1", payload: { request_id: "req-1", kind: "approval", category: "exec", request: {}, requested_at: "t", expires_at: "t" } });
    s.transition(id, "approval_needed", { kind: "lease", token }, { requestId: "req-1" });
    const s2 = new Scheduler(store, { now: c.now });
    expect(s2.state(id)).toMatchObject({ status: "WAITING_APPROVAL", resumeFrom: "PLANNING", pendingRequestId: "req-1", lease: { runId: "run-1", fencingToken: token } });
    expect(() => s2.acquireLease(id, "run-2")).toThrow(/lease held/i);
  });
});
