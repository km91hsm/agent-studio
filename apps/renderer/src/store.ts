/**
 * Renderer 외부 store (P01 T7, AC-P01-3 E4 의 Renderer 측). 저널 이벤트 배치를 seq 순으로 적용해 불변 스냅숏을 교체한다.
 * 규칙: seq ≤ lastAppliedSeq 는 폐기(dropped), seq > lastAppliedSeq+1(갭)은 GapError(Shell 릴레이가 재구독), 배치 1회당 listener 1회.
 * `useSyncExternalStore(subscribe, getSnapshot)` 호환: 변경이 없으면 getSnapshot() 참조가 그대로다.
 */
import type { JournalEvent } from "@agent-studio/protocol";

export interface TaskRow {
  id: string;
  title: string;
  status: string;
}
export interface PendingApprovalRow {
  requestId: string;
  taskId: string;
  category: string;
  kind: string;
}
export interface Snapshot {
  lastAppliedSeq: number;
  tasks: Record<string, TaskRow>;
  pendingApprovals: Record<string, PendingApprovalRow>;
}
export interface AppStore {
  getSnapshot(): Snapshot;
  subscribe(listener: () => void): () => void;
  /** 배치를 적용하고 {applied, dropped} 를 돌려준다. 갭을 만나면 그 앞까지 적용·통지한 뒤 GapError. */
  applyBatch(events: JournalEvent[]): { applied: number; dropped: number };
  readonly lastAppliedSeq: number;
}

export class GapError extends Error {
  constructor(
    readonly expected: number,
    readonly got: number,
  ) {
    super(`seq gap: expected ${expected}, got ${got}`);
    this.name = "GapError";
  }
}

const EMPTY: Snapshot = Object.freeze({ lastAppliedSeq: 0, tasks: {}, pendingApprovals: {} });

/** 이벤트 1건을 스냅숏에 반영한 새 스냅숏(변경 없으면 같은 tasks/pendingApprovals 참조 재사용). */
function reduce(s: Snapshot, e: JournalEvent): Snapshot {
  let tasks = s.tasks;
  let pending = s.pendingApprovals;
  const rid = typeof e.payload.request_id === "string" ? e.payload.request_id : undefined;
  switch (e.type) {
    case "TaskCreated":
      if (e.taskId) tasks = { ...tasks, [e.taskId]: { id: e.taskId, title: String(e.payload.title ?? ""), status: "QUEUED" } };
      break;
    case "TaskTransition":
      if (e.taskId && typeof e.payload.to === "string") {
        const prev = tasks[e.taskId] ?? { id: e.taskId, title: "", status: "QUEUED" };
        tasks = { ...tasks, [e.taskId]: { ...prev, status: e.payload.to } };
      }
      break;
    case "ApprovalRequested":
      if (rid && e.taskId && (e.payload.verdict === "ASK" || e.payload.verdict === "ALWAYS_ASK")) {
        pending = { ...pending, [rid]: { requestId: rid, taskId: e.taskId, category: String(e.payload.category ?? ""), kind: String(e.payload.kind ?? "approval") } };
      }
      break;
    case "ApprovalDecided":
    case "ApprovalExpired":
      if (rid && rid in pending) {
        const { [rid]: _gone, ...rest } = pending;
        pending = rest;
      }
      break;
  }
  return { lastAppliedSeq: e.seq, tasks, pendingApprovals: pending };
}

export function createStore(): AppStore {
  let snapshot: Snapshot = EMPTY;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const l of [...listeners]) l();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get lastAppliedSeq() {
      return snapshot.lastAppliedSeq;
    },
    applyBatch(events) {
      let applied = 0;
      let dropped = 0;
      let next = snapshot;
      let gap: GapError | undefined;
      for (const e of events) {
        if (e.seq <= next.lastAppliedSeq) {
          dropped++;
          continue;
        }
        if (e.seq !== next.lastAppliedSeq + 1) {
          gap = new GapError(next.lastAppliedSeq + 1, e.seq);
          break;
        }
        next = reduce(next, e);
        applied++;
      }
      if (applied > 0) {
        snapshot = next;
        notify();
      }
      if (gap) throw gap;
      return { applied, dropped };
    },
  };
}
