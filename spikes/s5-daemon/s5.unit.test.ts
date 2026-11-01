/**
 * S5 — 락 파일 판정·접속 오류 분류·HMAC 증명 단위 테스트(CI). 재부팅·PID 재사용·nonce 불일치를 stale로 판정한다(RC-03 모의, V7).
 * Codex 리뷰 반영: 잘못된 타임스탬프(NaN) 방어(#8), 접속 실패 원인 분류(#3), 토큰 전송 전 서버 신원 증명(#1).
 */
import { describe, expect, it } from "vitest";
import { assessLock, classifyConnectError, proof, type LockFile } from "./launcher.js";

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
  it("락 또는 관찰 타임스탬프가 날짜가 아니면(NaN) 통과시키지 않고 stale(bad_timestamp) (리뷰 #8)", () => {
    expect(assessLock({ ...lock, startedAt: "garbage" }, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.000Z", helloNonce: null })).toEqual({ verdict: "stale", reason: "bad_timestamp" });
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "", helloNonce: null })).toEqual({ verdict: "stale", reason: "bad_timestamp" });
  });
  it("pid·시작 시각은 맞지만 nonce 불일치 → stale(nonce_mismatch) — 다른 데몬이 같은 포트/pid를 차지", () => {
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.000Z", helloNonce: "zzz" })).toEqual({ verdict: "stale", reason: "nonce_mismatch" });
  });
  it("hello 전(nonce 미확인)이라도 pid·시작 시각이 맞으면 connectable — 접속 뒤 nonce로 최종 판정", () => {
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.000Z", helloNonce: null })).toEqual({ verdict: "connectable" });
  });
});

describe("S5 classifyConnectError (리뷰 #3: 접속 실패를 모두 nonce_mismatch로 보지 않는다)", () => {
  it("프로토콜 불일치(4003) → incompatible — 기존 데몬 보존, 새 데몬 금지", () => {
    expect(classifyConnectError(new Error("closed before welcome: 4003 protocol mismatch: daemon=2"))).toEqual({ kind: "incompatible", code: 4003 });
  });
  it("인증 거부(4001) → unauthorized — 토큰 불일치(다른 stateDir의 데몬 또는 위조) ", () => {
    expect(classifyConnectError(new Error("closed before welcome: 4001 unauthorized"))).toEqual({ kind: "unauthorized", code: 4001 });
  });
  it("서버 증명 실패 → forged — 토큰을 보내기 전에 중단", () => {
    expect(classifyConnectError(new Error("server proof invalid"))).toEqual({ kind: "forged", code: null });
  });
  it("TCP 오류·연결 전 종료 → unreachable — 일시 장애로 보고 재시도 후 명시적 오류", () => {
    expect(classifyConnectError(new Error("ws error"))).toEqual({ kind: "unreachable", code: null });
    expect(classifyConnectError(new Error("closed before welcome: 1006 "))).toEqual({ kind: "unreachable", code: 1006 });
  });
});

describe("S5 proof (리뷰 #1: 토큰 자체를 보내지 않고 HMAC 증명으로 상호 인증)", () => {
  it("같은 토큰·같은 nonce 쌍이면 증명이 일치하고, 토큰이나 nonce가 다르면 불일치", () => {
    const a = proof("tok", "server-nonce", "client-nonce", "server");
    expect(a).toBe(proof("tok", "server-nonce", "client-nonce", "server"));
    expect(a).not.toBe(proof("tok2", "server-nonce", "client-nonce", "server"));
    expect(a).not.toBe(proof("tok", "server-nonce", "other", "server"));
    expect(a).not.toBe(proof("tok", "server-nonce", "client-nonce", "client")); // 역할 분리: 서버 증명을 클라이언트 증명으로 재사용 불가
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
