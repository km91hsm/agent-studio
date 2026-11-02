/**
 * EventRelay(P01 T6): 데몬에서 받은 저널 이벤트를 구독자(렌더러)별 `fromSeq` 백로그 재생 뒤 코얼레싱 배치로 전달한다.
 * - 구독자별 마지막 seq 를 추적해 같은 seq 를 두 번 보내지 않는다(백로그와 실시간이 겹쳐도 중복 0)
 * - 배치 안 seq 는 연속: 연속이 끊기면 지금까지 모은 것을 먼저 보내고 새 배치를 시작한다
 * - relay 자체도 받은 이벤트를 보관(`buffered(from)`)해 백로그 함수가 비워 둔 구간을 메운다
 */
import type { JournalEvent } from "@agent-studio/protocol";

type Sink = (batch: JournalEvent[]) => void;
interface Sub {
  sink: Sink;
  last: number;
  queue: JournalEvent[];
  timer?: ReturnType<typeof setTimeout>;
}

export class EventRelay {
  lastSeq = 0;
  private readonly buffer: JournalEvent[] = [];
  private readonly subs = new Set<Sub>();
  private readonly flushMs: number;

  constructor(opts: { flushMs?: number } = {}) {
    this.flushMs = opts.flushMs ?? 16;
  }

  push(e: JournalEvent): void {
    if (e.seq <= this.lastSeq) return;
    this.buffer.push(e);
    this.lastSeq = e.seq;
    for (const sub of this.subs) this.enqueue(sub, e);
  }

  /** relay 가 보관한 이벤트 중 seq ≥ from */
  buffered(from: number): JournalEvent[] {
    return this.buffer.filter((e) => e.seq >= from);
  }

  subscribe(fromSeq: number, sink: Sink, backlog: (from: number) => JournalEvent[]): () => void {
    const sub: Sub = { sink, last: Math.max(0, fromSeq - 1), queue: [] };
    this.subs.add(sub);
    for (const e of backlog(fromSeq)) this.enqueue(sub, e);
    for (const e of this.buffered(sub.last + 1)) this.enqueue(sub, e);
    return () => {
      this.subs.delete(sub);
      if (sub.timer) clearTimeout(sub.timer);
      sub.timer = undefined;
      sub.queue.length = 0;
    };
  }

  private enqueue(sub: Sub, e: JournalEvent): void {
    if (e.seq <= sub.last) return;
    const tail = sub.queue[sub.queue.length - 1];
    if (tail && e.seq !== tail.seq + 1) this.flush(sub);
    sub.queue.push(e);
    sub.last = e.seq;
    if (!sub.timer) sub.timer = setTimeout(() => this.flush(sub), this.flushMs);
  }

  private flush(sub: Sub): void {
    if (sub.timer) clearTimeout(sub.timer);
    sub.timer = undefined;
    if (!sub.queue.length) return;
    const batch = sub.queue.splice(0, sub.queue.length);
    sub.sink(batch);
  }
}
