/**
 * ApprovalCoordinator — Broker 결정·만료를 Scheduler 의 DAEMON 전이로 잇는 유일한 경로(검토 #3).
 * lease 만료(91s) 중에도 WAITING_APPROVAL 은 유지되고, 요청 시각 기준 15분이 지나면 BLOCKED(approval_expired).
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY } from "@agent-studio/protocol";
import { DefaultPolicyBroker } from "./approval-broker.js";
import { ApprovalCoordinator } from "./approval-coordinator.js";
import { MemoryEventStore } from "./journal/memory-store.js";
import { Scheduler, StaleWriterError } from "./scheduler.js";

const clock = (start = 1_762_041_600_000) => {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
};

function setup() {
  const c = clock();
  const store = new MemoryEventStore(c.now);
  const scheduler = new Scheduler(store, { now: c.now });
  const broker = new DefaultPolicyBroker(store, DEFAULT_POLICY, { now: c.now });
  const coord = new ApprovalCoordinator(scheduler, broker, store);
  const id = scheduler.submit({ title: "t", kind: "impl" });
  const { fencingToken: token } = scheduler.acquireLease(id, "run-1");
  scheduler.transition(id, "lease_acquired", { kind: "lease", token });
  store.append({ type: "PlanArtifact", taskId: id, payload: {} });
  store.append({ type: "SkillSelected", taskId: id, payload: {} });
  scheduler.transition(id, "plan_accepted", { kind: "lease", token });
  return { c, store, scheduler, broker, coord, id, token };
}
const types = (store: MemoryEventStore, from = 1) => store.read(from).map((e) => (e.type === "TaskTransition" ? `TaskTransition(→${e.payload.to})` : e.type));

describe("ApprovalCoordinator", () => {
  it("(1) ASK 요청 → WAITING_APPROVAL + pendingRequestId; decide(accept) → 원 상태 복귀, 저널 순서 고정", () => {
    const { store, scheduler, coord, id, token } = setup();
    const mark = store.lastSeq() + 1;
    const r = coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "exec", request: { command: "npm test" } }, token);
    expect(r.verdict).toBe("ASK");
    expect(scheduler.state(id)).toMatchObject({ status: "WAITING_APPROVAL", pendingRequestId: r.requestId, resumeFrom: "IMPLEMENTING" });
    coord.decide(r.requestId, "accept", "user");
    expect(scheduler.state(id)).toMatchObject({ status: "IMPLEMENTING", pendingRequestId: undefined });
    expect(types(store, mark)).toEqual(["ApprovalRequested", "TaskTransition(→WAITING_APPROVAL)", "ApprovalDecided", "TaskTransition(→IMPLEMENTING)"]);
  });

  it("(1b) AUTO 요청은 전이 없이 즉시 accept, DENY 는 즉시 decline(상태 유지)", () => {
    const { store, scheduler, coord, id, token } = setup();
    const a = coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "fs_write", request: {} }, token);
    expect(a.verdict).toBe("AUTO");
    const d = coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "git_remote", request: {} }, token);
    expect(d.verdict).toBe("DENY");
    expect(scheduler.state(id).status).toBe("IMPLEMENTING");
    expect(store.read(1).filter((e) => e.type === "TaskTransition" && e.payload.to === "WAITING_APPROVAL")).toHaveLength(0);
  });

  it("(2) decide(decline) → CANCELLED(denied_terminal)", () => {
    const { scheduler, coord, id, token } = setup();
    const r = coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "exec", request: {} }, token);
    coord.decide(r.requestId, "decline", "user");
    expect(scheduler.state(id).status).toBe("CANCELLED");
  });

  it("(3) lease 만료(91s) 뒤에도 WAITING_APPROVAL·pending 유지, 15분 경과 tick() → BLOCKED(approval_expired), 이후 decide 는 오류", () => {
    const { c, store, scheduler, broker, coord, id, token } = setup();
    const r = coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "exec", request: {} }, token);
    c.advance(91_000);
    expect(scheduler.expireLeases()).toEqual([id]);
    expect(store.read(1).filter((e) => e.type === "LeaseExpired")).toHaveLength(1);
    expect(scheduler.state(id)).toMatchObject({ status: "WAITING_APPROVAL", lease: undefined });
    expect(broker.pending()).toHaveLength(1);
    expect(coord.tick()).toEqual([]);
    c.advance(15 * 60_000);
    expect(coord.tick()).toEqual([r.requestId]);
    expect(store.read(1).filter((e) => e.type === "ApprovalExpired")).toHaveLength(1);
    const last = store.read(1).filter((e) => e.type === "TaskTransition").at(-1)!;
    expect(last.payload).toMatchObject({ to: "BLOCKED", reason: "approval_expired", request_id: r.requestId });
    expect(broker.pending()).toEqual([]);
    expect(() => coord.decide(r.requestId, "accept", "user")).toThrow(/approval_expired/);
    expect(scheduler.state(id).status).toBe("BLOCKED");
    expect(coord.tick()).toEqual([]);
  });

  it("(4) Scheduler 에 직접 approved(daemon) 를 넣으면 저널 근거가 없어 거부된다", () => {
    const { scheduler, coord, id, token } = setup();
    coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "exec", request: {} }, token);
    expect(() => scheduler.transition(id, "approved", { kind: "daemon", requestId: "없는 ID" })).toThrow(/approval_decided/);
    expect(scheduler.state(id).status).toBe("WAITING_APPROVAL");
  });

  it("(5) 결정된 요청이 다른 Task 의 것이면 전이하지 않는다", () => {
    const { store, scheduler, coord, id, token } = setup();
    const other = scheduler.submit({ title: "other", kind: "impl" });
    const r = coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "exec", request: {} }, token);
    // 저널을 직접 조작해 다른 Task 로 결정 이벤트를 넣어도 Scheduler 가 request→task 대조로 막는다
    store.append({ type: "ApprovalDecided", taskId: other, correlationId: r.requestId, payload: { request_id: r.requestId, decision: "accept", by: "user", scope: "once", decided_at: "t" } });
    expect(() => scheduler.transition(other, "approved", { kind: "daemon", requestId: r.requestId })).toThrow();
    expect(scheduler.state(other).status).toBe("QUEUED");
  });

  it("(6) 리뷰A#3 옛 토큰으로 request 하면 ApprovalRequested 를 기록하지 않는다(보류 승인과 상태가 갈라지지 않음)", () => {
    const { store, scheduler, broker, coord, id, token } = setup();
    const n = store.lastSeq();
    expect(() => coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "exec", request: {} }, token + 1)).toThrow(StaleWriterError);
    expect(broker.pending()).toHaveLength(0);
    expect(store.lastSeq()).toBe(n);
    expect(scheduler.state(id).status).toBe("IMPLEMENTING");
  });

  it("(7) 리뷰A#6 WAITING_APPROVAL 에서 cancel → 보류 승인은 decline 으로 해소, 이후 accept 는 already_decided", () => {
    const { store, scheduler, broker, coord, id, token } = setup();
    const r = coord.request({ taskId: id, runId: "run-1", kind: "approval", category: "exec", request: {} }, token);
    expect(scheduler.transition(id, "cancel", { kind: "user" })).toBe("CANCELLED");
    expect(broker.pending()).toHaveLength(0);
    const decided = store.read(1).filter((e) => e.type === "ApprovalDecided");
    expect(decided).toHaveLength(1);
    expect(decided[0]!.payload).toMatchObject({ request_id: r.requestId, decision: "decline", by: "user" });
    expect(() => coord.decide(r.requestId, "accept", "user")).toThrow(/already_decided/);
    expect(scheduler.state(id).status).toBe("CANCELLED");
  });

  it("(8) 리뷰A#3 decide 는 Task 가 그 요청으로 대기 중일 때만 결정을 기록한다", () => {
    const { store, scheduler, broker, coord, id } = setup();
    const rid = broker.request({ taskId: id, runId: "run-1", kind: "approval", category: "exec", request: {} }); // Coordinator 를 거치지 않은 보류 요청
    const n = store.lastSeq();
    expect(() => coord.decide(rid, "accept", "user")).toThrow(/not pending/i);
    expect(store.lastSeq()).toBe(n);
    expect(broker.pending().map((p) => p.requestId)).toEqual([rid]);
    expect(scheduler.state(id).status).toBe("IMPLEMENTING");
  });

  it("(9) 리뷰A#7 git_conflict·recovery_review·compare_blocked 도 request(…, event) 로 대기·결정·복귀한다", () => {
    const { store, scheduler, coord, id, token } = setup();
    const r = coord.request({ taskId: id, runId: "run-1", kind: "user_input", category: "project_trust", request: { conflict: "a.ts" } }, token, "git_conflict");
    expect(r.verdict).toBe("ASK");
    expect(scheduler.state(id)).toMatchObject({ status: "WAITING_APPROVAL", pendingRequestId: r.requestId, resumeFrom: "IMPLEMENTING" });
    const last = store.read(1).filter((e) => e.type === "TaskTransition").pop()!;
    expect(last.payload).toMatchObject({ to: "WAITING_APPROVAL", reason: "git_conflict", request_id: r.requestId });
    coord.decide(r.requestId, "accept", "user");
    expect(scheduler.state(id).status).toBe("IMPLEMENTING");
    const r2 = coord.request({ taskId: id, runId: "run-1", kind: "user_input", category: "project_trust", request: {} }, token, "compare_blocked");
    coord.decide(r2.requestId, "decline", "user");
    expect(scheduler.state(id).status).toBe("CANCELLED");
    expect(() => coord.request({ taskId: id, runId: "run-1", kind: "user_input", category: "project_trust", request: {} }, token, "recovery_review")).toThrow();
  });
});
