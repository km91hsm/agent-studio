/**
 * T7 Renderer 외부 store: seq 배치 적용 규칙 — seq ≤ lastAppliedSeq 폐기(dropped), 갭은 GapError(Shell 릴레이가 재구독),
 * 배치 1회당 listener 1회, 변경 없으면 getSnapshot() 참조 안정(useSyncExternalStore 호환).
 */
import { describe, expect, it } from "vitest";
import type { JournalEvent } from "@agent-studio/protocol";
import { createStore, GapError } from "./store.js";

const ev = (seq: number, type: string, payload: Record<string, unknown>, extra: Partial<JournalEvent> = {}): JournalEvent => ({
  seq,
  eventId: `E${seq}`,
  ts: new Date(1_762_041_600_000 + seq).toISOString(),
  type: type as JournalEvent["type"],
  payload,
  redacted: 0,
  ...extra,
});

describe("renderer store", () => {
  it("TaskCreated + TaskTransition 배치 → tasks[id].status PLANNING, lastAppliedSeq 2, listener 1회", () => {
    const store = createStore();
    let calls = 0;
    store.subscribe(() => calls++);
    const before = store.getSnapshot();
    const r = store.applyBatch([ev(1, "TaskCreated", { title: "t", kind: "impl" }, { taskId: "t1" }), ev(2, "TaskTransition", { from: "QUEUED", to: "PLANNING", reason: "lease_acquired" }, { taskId: "t1" })]);
    expect(r).toEqual({ applied: 2, dropped: 0 });
    expect(calls).toBe(1);
    const snap = store.getSnapshot();
    expect(snap).not.toBe(before);
    expect(snap.lastAppliedSeq).toBe(2);
    expect(store.lastAppliedSeq).toBe(2);
    expect(snap.tasks).toEqual({ t1: { id: "t1", title: "t", status: "PLANNING" } });
    expect(store.getSnapshot()).toBe(snap); // 변경 없으면 참조 동일
  });

  it("seq ≤ lastAppliedSeq 재전송은 dropped, listener 0회, 스냅숏 참조 동일 (Review Focus 2)", () => {
    const store = createStore();
    store.applyBatch([ev(1, "TaskCreated", { title: "t", kind: "impl" }, { taskId: "t1" }), ev(2, "TaskTransition", { from: "QUEUED", to: "PLANNING" }, { taskId: "t1" })]);
    let calls = 0;
    store.subscribe(() => calls++);
    const snap = store.getSnapshot();
    expect(store.applyBatch([ev(2, "TaskTransition", { from: "PLANNING", to: "IMPLEMENTING" }, { taskId: "t1" })])).toEqual({ applied: 0, dropped: 1 });
    expect(calls).toBe(0);
    expect(store.getSnapshot()).toBe(snap);
    expect(store.getSnapshot().tasks.t1!.status).toBe("PLANNING");
    expect(store.applyBatch([])).toEqual({ applied: 0, dropped: 0 });
    expect(calls).toBe(0);
  });

  it("갭(seq > lastAppliedSeq+1) → GapError, 상태 불변, 배치 안의 앞 이벤트는 적용", () => {
    const store = createStore();
    store.applyBatch([ev(1, "TaskCreated", { title: "t", kind: "impl" }, { taskId: "t1" })]);
    let calls = 0;
    store.subscribe(() => calls++);
    expect(() => store.applyBatch([ev(4, "TaskTransition", { from: "QUEUED", to: "PLANNING" }, { taskId: "t1" })])).toThrow(GapError);
    expect(store.lastAppliedSeq).toBe(1);
    expect(calls).toBe(0);
    let err: unknown;
    try {
      store.applyBatch([ev(2, "TaskTransition", { from: "QUEUED", to: "PLANNING" }, { taskId: "t1" }), ev(5, "AgentEvent", {}, { taskId: "t1" })]);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(GapError);
    expect((err as GapError).expected).toBe(3);
    expect((err as GapError).got).toBe(5);
    expect(store.lastAppliedSeq).toBe(2);
    expect(store.getSnapshot().tasks.t1!.status).toBe("PLANNING");
    expect(calls).toBe(1);
  });

  it("ApprovalRequested → pendingApprovals 추가(ASK만), ApprovalDecided/Expired → 제거", () => {
    const store = createStore();
    store.applyBatch([
      ev(1, "TaskCreated", { title: "t", kind: "impl" }, { taskId: "t1" }),
      ev(2, "ApprovalRequested", { request_id: "r1", kind: "approval", category: "exec", verdict: "ASK", request: { command: "x" } }, { taskId: "t1" }),
      ev(3, "ApprovalRequested", { request_id: "r2", kind: "approval", category: "fs_write", verdict: "AUTO", request: {} }, { taskId: "t1" }),
      ev(4, "ApprovalDecided", { request_id: "r2", decision: "accept", by: "policy" }, { taskId: "t1" }),
    ]);
    expect(store.getSnapshot().pendingApprovals).toEqual({ r1: { requestId: "r1", taskId: "t1", category: "exec", kind: "approval" } });
    store.applyBatch([ev(5, "ApprovalExpired", { request_id: "r1" }, { taskId: "t1" })]);
    expect(store.getSnapshot().pendingApprovals).toEqual({});
    store.applyBatch([ev(6, "ApprovalRequested", { request_id: "r3", kind: "approval", category: "network", verdict: "ALWAYS_ASK", request: {} }, { taskId: "t1" }), ev(7, "ApprovalDecided", { request_id: "r3", decision: "decline", by: "user" }, { taskId: "t1" })]);
    expect(store.getSnapshot().pendingApprovals).toEqual({});
    expect(store.getSnapshot().lastAppliedSeq).toBe(7);
  });

  it("unsubscribe 뒤에는 listener 가 불리지 않고, 모르는 이벤트는 seq 만 올린다", () => {
    const store = createStore();
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.applyBatch([ev(1, "WorkspaceSettingsChanged", { capabilities: {} })]);
    expect(calls).toBe(1);
    expect(store.getSnapshot().lastAppliedSeq).toBe(1);
    off();
    store.applyBatch([ev(2, "AgentEvent", {})]);
    expect(calls).toBe(1);
    expect(store.getSnapshot().lastAppliedSeq).toBe(2);
  });
});
