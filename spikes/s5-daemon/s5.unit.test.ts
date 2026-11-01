/**
 * S5 — 락 파일 판정 로직 단위 테스트(CI). 재부팅·PID 재사용·nonce 불일치를 stale로 판정한다(RC-03 모의, V7).
 */
import { describe, expect, it } from "vitest";
import { assessLock, type LockFile } from "./launcher.js";

const lock: LockFile = { pid: 4242, startedAt: "2026-11-02T04:30:00.000Z", nonce: "abc", port: 50000, protocolVersion: 1 };

describe("S5 assessLock", () => {
  it("pid 살아 있음 + 시작 시각 일치(±2s) + nonce 일치 → live", () => {
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.800Z", helloNonce: "abc" })).toEqual({ verdict: "live" });
  });
  it("pid 없음 → stale(reason pid_gone) — 재부팅·크래시 공통", () => {
    expect(assessLock(lock, { pidAlive: false, processStartedAt: null, helloNonce: null })).toEqual({ verdict: "stale", reason: "pid_gone" });
  });
  it("pid 살아 있지만 시작 시각이 다름 → stale(pid_reused) — 재부팅 후 PID 재사용", () => {
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T05:10:00.000Z", helloNonce: null })).toEqual({ verdict: "stale", reason: "pid_reused" });
  });
  it("pid·시작 시각은 맞지만 nonce 불일치 → stale(nonce_mismatch) — 다른 데몬이 같은 포트/pid를 차지", () => {
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.000Z", helloNonce: "zzz" })).toEqual({ verdict: "stale", reason: "nonce_mismatch" });
  });
  it("hello 전(nonce 미확인)이라도 pid·시작 시각이 맞으면 connectable — 접속 뒤 nonce로 최종 판정", () => {
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.000Z", helloNonce: null })).toEqual({ verdict: "connectable" });
  });
});
