/**
 * Shell main 의 데몬 재접속 루프(최종리뷰I4): 끊기면 성공할 때까지 백오프로 재시도하고, 종료 중이면 멈춘다.
 * Electron 을 import 하지 않는다(단위 테스트 가능).
 */
import { describe, expect, it } from "vitest";
import { createReconnectLoop, RECONNECT_DELAYS_MS } from "./reconnect.js";

const flush = () => new Promise((r) => setTimeout(r, 0));

function harness(failures: number, opts: { stop?: () => boolean; realSleep?: boolean } = {}) {
  let attempts = 0;
  const sleeps: number[] = [];
  const logs: string[] = [];
  const loop = createReconnectLoop({
    attempt: async () => {
      attempts++;
      if (attempts <= failures) throw new Error(`fail ${attempts}`);
    },
    shouldStop: opts.stop ?? (() => false),
    sleep: async (ms) => {
      sleeps.push(ms);
      if (opts.realSleep) await new Promise((r) => setTimeout(r, 1)); // 매크로태스크 경계 — 바깥에서 상태를 바꿀 틈
    },
    log: (m) => logs.push(m),
  });
  return { loop, sleeps, logs, attempts: () => attempts };
}

describe("createReconnectLoop (최종리뷰I4)", () => {
  it("실패가 이어지면 백오프 표대로 쉬고 성공하면 멈춘다(1회 재시도 뒤 침묵하지 않는다)", async () => {
    const h = harness(3);
    h.loop.trigger();
    for (let i = 0; i < 10; i++) await flush();
    expect(h.attempts()).toBe(4);
    expect(h.sleeps).toEqual(RECONNECT_DELAYS_MS.slice(0, 3));
    expect(h.loop.running()).toBe(false);
  });
  it("백오프 표를 넘어서면 마지막 간격을 반복한다(상한 없음)", async () => {
    const h = harness(RECONNECT_DELAYS_MS.length + 2);
    h.loop.trigger();
    for (let i = 0; i < 40; i++) await flush();
    expect(h.attempts()).toBe(RECONNECT_DELAYS_MS.length + 3);
    const last = RECONNECT_DELAYS_MS.at(-1)!;
    expect(h.sleeps.slice(RECONNECT_DELAYS_MS.length)).toEqual([last, last]);
  });
  it("실행 중 trigger 는 중복 루프를 만들지 않는다", async () => {
    const h = harness(2);
    h.loop.trigger();
    h.loop.trigger();
    h.loop.trigger();
    for (let i = 0; i < 10; i++) await flush();
    expect(h.attempts()).toBe(3);
  });
  it("shouldStop 이 true 면 더 시도하지 않는다", async () => {
    let stop = false;
    const h = harness(100, { stop: () => stop, realSleep: true });
    h.loop.trigger();
    await flush();
    stop = true;
    await new Promise((r) => setTimeout(r, 30));
    expect(h.attempts()).toBeLessThanOrEqual(2);
    expect(h.loop.running()).toBe(false);
  });
});
