/**
 * EventStore 공통 계약(메모리·SQLite) + SQLite 전용(재오픈·append-only 트리거).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { EventStore, JournalEvent } from "./event-store.js";
import { MemoryEventStore } from "./memory-store.js";
import { openSqliteStore, SqliteEventStore } from "./sqlite-store.js";

const tmp = () => mkdtempSync(join(tmpdir(), "as-journal-"));
const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

const factories: [string, () => EventStore][] = [
  ["memory", () => new MemoryEventStore()],
  [
    "sqlite",
    () => {
      const dir = tmp();
      const s = openSqliteStore(join(dir, "journal.sqlite"));
      cleanups.push(() => {
        s.close();
        rmSync(dir, { recursive: true, force: true });
      });
      return s;
    },
  ],
];

const ev = (type: string, payload: Record<string, unknown> = {}, extra: Partial<JournalEvent> = {}) =>
  ({ type, payload, ...extra }) as Parameters<EventStore["append"]>[0];

describe.each(factories)("EventStore contract (%s)", (_name, make) => {
  it("리뷰A#12 append/read/subscribe 가 돌려준 객체를 바꿔도 저널 기록은 변하지 않는다", () => {
    const s = make();
    const a = s.append(ev("AgentEvent", { nested: { v: 1 } }, { taskId: "t1" }));
    (a.payload.nested as { v: number }).v = 99;
    (a as { type: string }).type = "Hacked";
    expect(s.read(1)[0]!.payload).toEqual({ nested: { v: 1 } });
    expect(s.read(1)[0]!.type).toBe("AgentEvent");
    const r = s.read(1)[0]!;
    (r.payload.nested as { v: number }).v = 77;
    expect(s.read(1)[0]!.payload).toEqual({ nested: { v: 1 } });
    const seen: JournalEvent[] = [];
    s.subscribe(1, (e) => seen.push(e));
    (seen[0]!.payload.nested as { v: number }).v = 55;
    expect(s.read(1)[0]!.payload).toEqual({ nested: { v: 1 } });
  });

  it("append 가 seq 1,2,3 과 ULID·ts 를 채운다", () => {
    const s = make();
    const a = s.append(ev("TaskCreated", { title: "t" }, { taskId: "t1" }));
    const b = s.append(ev("TaskTransition", { from: "QUEUED", to: "PLANNING" }, { taskId: "t1" }));
    const c = s.append(ev("LeaseAcquired", { run_id: "r", token: 1, ttl: 90000 }, { taskId: "t1" }));
    expect([a.seq, b.seq, c.seq]).toEqual([1, 2, 3]);
    expect(a.eventId).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(new Date(a.ts).toISOString()).toBe(a.ts);
    expect(a.redacted).toBe(0);
    expect(s.lastSeq()).toBe(3);
  });

  it("read(from, to) 는 seq 범위를 돌려준다", () => {
    const s = make();
    for (let i = 0; i < 4; i++) s.append(ev("AgentEvent", { i }));
    expect(s.read(2).map((e) => e.seq)).toEqual([2, 3, 4]);
    expect(s.read(2, 3).map((e) => e.seq)).toEqual([2, 3]);
    expect(s.read(9)).toEqual([]);
    expect(s.read(3)[0]!.payload).toEqual({ i: 2 });
  });

  it("subscribe(fromSeq) 는 기존 이벤트 재생 후 신규를 전달하고 unsubscribe 뒤에는 보내지 않는다", () => {
    const s = make();
    s.append(ev("AgentEvent", { n: 1 }));
    s.append(ev("AgentEvent", { n: 2 }));
    s.append(ev("AgentEvent", { n: 3 }));
    const got: number[] = [];
    const off = s.subscribe(2, (e) => got.push(e.seq));
    expect(got).toEqual([2, 3]);
    s.append(ev("AgentEvent", { n: 4 }));
    expect(got).toEqual([2, 3, 4]);
    off();
    s.append(ev("AgentEvent", { n: 5 }));
    expect(got).toEqual([2, 3, 4]);
  });

  it("모르는 type 은 throw 하고 저널은 비어 있다", () => {
    const s = make();
    expect(() => s.append(ev("Bogus"))).toThrow(/unknown event type/i);
    expect(s.lastSeq()).toBe(0);
  });

  it("payload 는 JSON 직렬화 가능해야 한다(순환 참조 throw)", () => {
    const s = make();
    const cyc: Record<string, unknown> = {};
    cyc.self = cyc;
    expect(() => s.append(ev("AgentEvent", cyc))).toThrow();
    expect(s.lastSeq()).toBe(0);
  });

  it("envelope 필드(taskId, correlationId, fencingToken)가 보존된다", () => {
    const s = make();
    const e = s.append(ev("ApprovalRequested", { request_id: "r1" }, { taskId: "t1", correlationId: "r1", fencingToken: 7, agentRunId: "run1" }));
    const back = s.read(1)[0]!;
    expect(back).toEqual(e);
    expect(back.taskId).toBe("t1");
    expect(back.fencingToken).toBe(7);
    expect(back.agentRunId).toBe("run1");
  });
});

describe("SqliteEventStore only", () => {
  it("재오픈 후 lastSeq·내용 유지, WAL 모드", () => {
    const dir = tmp();
    const path = join(dir, "journal.sqlite");
    const s1 = openSqliteStore(path);
    s1.append(ev("TaskCreated", { title: "x" }, { taskId: "t1" }));
    s1.append(ev("TaskTransition", { from: "QUEUED", to: "PLANNING" }, { taskId: "t1" }));
    expect(s1.pragma("journal_mode")).toBe("wal");
    s1.close();
    const s2 = openSqliteStore(path);
    expect(s2.lastSeq()).toBe(2);
    expect(s2.read(1).map((e) => e.type)).toEqual(["TaskCreated", "TaskTransition"]);
    expect(s2.schemaVersion()).toBe(1);
    s2.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("events 는 append-only: UPDATE/DELETE 가 트리거로 거부된다", () => {
    const dir = tmp();
    const s = openSqliteStore(join(dir, "journal.sqlite"));
    s.append(ev("TaskCreated", { title: "x" }, { taskId: "t1" }));
    expect(() => s.rawExec("UPDATE events SET type='AgentEvent' WHERE seq=1")).toThrow(/append-only/);
    expect(() => s.rawExec("DELETE FROM events WHERE seq=1")).toThrow(/append-only/);
    expect(s.read(1)[0]!.type).toBe("TaskCreated");
    expect(s).toBeInstanceOf(SqliteEventStore);
    s.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
