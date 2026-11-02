/** 메모리 EventStore — 테스트 전용(투영 없음). */
import type { EventStore, JournalEvent, NewEvent } from "./event-store.js";
import { prepareEvent, Subscribers } from "./event-store.js";

export class MemoryEventStore implements EventStore {
  private readonly events: JournalEvent[] = [];
  private readonly subs = new Subscribers();
  constructor(private readonly now: () => number = Date.now) {}

  append(e: NewEvent): JournalEvent {
    const stored = prepareEvent(e, this.events.length + 1, this.now);
    // 저장본은 외부 변경에서 격리한다
    const frozen: JournalEvent = { ...stored, payload: JSON.parse(JSON.stringify(stored.payload)) };
    this.events.push(frozen);
    this.subs.emit(frozen);
    return frozen;
  }

  read(fromSeq: number, toSeq?: number): JournalEvent[] {
    const from = Math.max(1, fromSeq);
    const to = toSeq ?? this.events.length;
    return this.events.slice(from - 1, Math.max(from - 1, to));
  }

  lastSeq(): number {
    return this.events.length;
  }

  subscribe(fromSeq: number, cb: (e: JournalEvent) => void): () => void {
    for (const e of this.read(fromSeq)) cb(e);
    return this.subs.add(cb);
  }

  close(): void {}
}
