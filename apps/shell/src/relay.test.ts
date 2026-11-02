/**
 * T6 EventRelay: 데몬 이벤트를 구독자별 fromSeq 백로그 재생 후 코얼레싱 배치로 전달한다. 구독자별 마지막 seq 추적으로 중복 전송 0,
 * 배치 안 seq 연속, unsubscribe 뒤 전달 없음.
 */
import { describe, expect, it } from "vitest";
import type { JournalEvent } from "@agent-studio/protocol";
import { EventRelay } from "./relay.js";

const ev = (seq: number): JournalEvent => ({ seq, eventId: `E${seq}`, ts: "t", type: "AgentEvent", payload: { seq }, redacted: 0 });
const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));
const flat = (batches: JournalEvent[][]) => batches.flat().map((e) => e.seq);
const contiguous = (batches: JournalEvent[][]) => batches.every((b) => b.every((e, i) => i === 0 || e.seq === b[i - 1]!.seq + 1));

describe("EventRelay", () => {
  it("백로그 3건 + 실시간 5건을 구독자 2명(fromSeq 1, fromSeq 3)이 빠짐·중복 없이 받고 배치 안 seq 는 연속", async () => {
    const relay = new EventRelay({ flushMs: 5 });
    const backlog = [ev(1), ev(2), ev(3)];
    for (const e of backlog) relay.push(e);
    const a: JournalEvent[][] = [];
    const b: JournalEvent[][] = [];
    relay.subscribe(1, (batch) => a.push(batch), (from) => backlog.filter((e) => e.seq >= from));
    relay.subscribe(3, (batch) => b.push(batch), (from) => backlog.filter((e) => e.seq >= from));
    await tick(20);
    expect(flat(a)).toEqual([1, 2, 3]);
    expect(flat(b)).toEqual([3]);
    for (let s = 4; s <= 8; s++) relay.push(ev(s));
    await tick(20);
    expect(flat(a)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(flat(b)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(contiguous(a)).toBe(true);
    expect(contiguous(b)).toBe(true);
    expect(a.length).toBeLessThan(8); // 코얼레싱: 5건이 배치 1~2개로
  });

  it("백로그와 겹치는 실시간 push(이미 보낸 seq)는 중복 전송하지 않는다", async () => {
    const relay = new EventRelay({ flushMs: 5 });
    const got: JournalEvent[][] = [];
    relay.subscribe(1, (batch) => got.push(batch), () => [ev(1), ev(2)]);
    relay.push(ev(2));
    relay.push(ev(3));
    await tick(20);
    expect(flat(got)).toEqual([1, 2, 3]);
  });

  it("unsubscribe 뒤에는 전달하지 않고, 빈 백로그 구독은 즉시 보내지 않는다", async () => {
    const relay = new EventRelay({ flushMs: 5 });
    const got: JournalEvent[][] = [];
    const off = relay.subscribe(1, (batch) => got.push(batch), () => []);
    await tick(15);
    expect(got).toEqual([]);
    relay.push(ev(1));
    await tick(15);
    expect(flat(got)).toEqual([1]);
    off();
    relay.push(ev(2));
    await tick(15);
    expect(flat(got)).toEqual([1]);
  });

  it("relay 가 받은 이벤트를 buffered(from) 로 되돌려준다(main.ts 의 기본 백로그)", () => {
    const relay = new EventRelay();
    for (let s = 1; s <= 4; s++) relay.push(ev(s));
    expect(relay.buffered(3).map((e) => e.seq)).toEqual([3, 4]);
    expect(relay.buffered(9)).toEqual([]);
    expect(relay.lastSeq).toBe(4);
  });
});
