/**
 * EventStore(= Journal 모듈 인터페이스, SYSTEM_ARCHITECTURE §2). 어댑터: 메모리(테스트)·SQLite(실).
 * 계약 변경 기록(P01 계획 검토 #10): `append` 는 seq 를 포함한 JournalEvent 를 돌려주고(§2 `append→seq` 의 상위 집합),
 * `projections()` 는 SQLite 어댑터 전용이다.
 */
import type { JournalEvent, NewEvent } from "@agent-studio/protocol";
import { isEventType, ulid } from "@agent-studio/protocol";

export type { JournalEvent, NewEvent };

export interface EventStore {
  /** 이벤트 1건을 원자적으로 추가하고 저장된 행(seq 포함)을 돌려준다. 모르는 type·직렬화 불가 payload 는 throw. */
  append(e: NewEvent): JournalEvent;
  /** seq ∈ [fromSeq, toSeq] 를 오름차순으로. */
  read(fromSeq: number, toSeq?: number): JournalEvent[];
  lastSeq(): number;
  /** fromSeq 부터 기존 이벤트를 먼저 cb 로 재생한 뒤, 이후 append 되는 이벤트를 전달한다. 반환값은 unsubscribe. */
  subscribe(fromSeq: number, cb: (e: JournalEvent) => void): () => void;
  close(): void;
}

/** append 전 공통 검증·보강(두 어댑터가 공유). */
export function prepareEvent(e: NewEvent, seq: number, now: () => number = Date.now): JournalEvent {
  if (!isEventType(e.type)) throw new Error(`unknown event type: ${e.type}`);
  JSON.stringify(e.payload); // 순환 참조 등 직렬화 불가 → throw
  const ms = now();
  return {
    seq,
    eventId: e.eventId ?? ulid(ms),
    ts: e.ts ?? new Date(ms).toISOString(),
    type: e.type,
    ...(e.workspaceId !== undefined && { workspaceId: e.workspaceId }),
    ...(e.projectId !== undefined && { projectId: e.projectId }),
    ...(e.phaseId !== undefined && { phaseId: e.phaseId }),
    ...(e.taskId !== undefined && { taskId: e.taskId }),
    ...(e.agentRunId !== undefined && { agentRunId: e.agentRunId }),
    ...(e.sessionRef !== undefined && { sessionRef: e.sessionRef }),
    ...(e.correlationId !== undefined && { correlationId: e.correlationId }),
    ...(e.causationSeq !== undefined && { causationSeq: e.causationSeq }),
    ...(e.fencingToken !== undefined && { fencingToken: e.fencingToken }),
    payload: e.payload,
    redacted: e.redacted ?? 0,
  };
}

/**
 * 구독자 목록(재생 후 실시간) — 두 어댑터가 공유.
 * 전달 계약(최종리뷰C1): 구독자 콜백 안에서 append 된 이벤트는 현재 이벤트가 모든 구독자에게 전달된 뒤에 전달된다 — 어떤 구독자도
 * seq 를 역순으로 받지 않는다. 따라서 콜백 안의 중첩 append 가 돌아왔을 때 저널에서 파생되는 상태(Scheduler 등)는 아직 그 이벤트를
 * 반영하지 않았을 수 있다(저널 자체는 이미 기록됐다).
 */
export class Subscribers {
  private readonly subs = new Set<(e: JournalEvent) => void>();
  private readonly queue: JournalEvent[] = [];
  private draining = false;
  add(cb: (e: JournalEvent) => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  emit(e: JournalEvent): void {
    this.queue.push(e);
    if (this.draining) return; // 콜백 안의 중첩 append — 바깥 순회가 끝난 뒤 순서대로 전달된다
    this.draining = true;
    try {
      while (this.queue.length) {
        const next = this.queue.shift()!;
        for (const cb of [...this.subs]) cb(next);
      }
    } finally {
      this.draining = false;
    }
  }
}
