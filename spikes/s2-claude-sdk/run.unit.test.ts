/**
 * S2 러너 단위 테스트(CI 실행, 프로세스 기동 없음) — Codex S2 리뷰 #7 반영
 */
import { describe, expect, it } from "vitest";
import { ClaudeRun, PushIterable } from "./run.js";

describe("S2 run.ts unit", () => {
  it("PushIterable: close 후 push 는 거부된다", async () => {
    const q = new PushIterable<number>();
    q.push(1);
    q.close();
    expect(() => q.push(2)).toThrow(/push after close/);
    const it = q[Symbol.asyncIterator]();
    expect(await it.next()).toEqual({ value: 1, done: false });
    expect((await it.next()).done).toBe(true);
  });

  it("ClaudeRun: close 후 send 는 거부된다(프로세스 미기동)", async () => {
    const run = new ClaudeRun({ label: "unit", cwd: process.cwd() });
    await run.close();
    expect(() => run.send("x")).toThrow(/send after close/);
  });
});
