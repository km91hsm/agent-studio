/** T2 락 파일 판정·접속 오류 분류·HMAC 증명(S5 unit 이식) + 원자적 락 쓰기. */
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assessLock, classifyConnectError, readLock, writeLock, type LockFile } from "./lock.js";
import { HELLO_TIMEOUT_MS, PROTOCOL_VERSION, proof, proofEquals } from "./protocol.js";

const lock: LockFile = { pid: 4242, startedAt: "2026-11-02T04:30:00.000Z", nonce: "abc", port: 50000, protocolVersion: 1, tokenRef: "file:/x/token" };
const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("assessLock", () => {
  it("live / pid_gone / pid_reused / nonce_mismatch / bad_timestamp / connectable", () => {
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.800Z", helloNonce: "abc" })).toEqual({ verdict: "live" });
    expect(assessLock(lock, { pidAlive: false, processStartedAt: null, helloNonce: null })).toEqual({ verdict: "stale", reason: "pid_gone" });
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T05:10:00.000Z", helloNonce: null })).toEqual({ verdict: "stale", reason: "pid_reused" });
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.000Z", helloNonce: "zzz" })).toEqual({ verdict: "stale", reason: "nonce_mismatch" });
    expect(assessLock({ ...lock, startedAt: "garbage" }, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.000Z", helloNonce: null })).toEqual({ verdict: "stale", reason: "bad_timestamp" });
    expect(assessLock(lock, { pidAlive: true, processStartedAt: "2026-11-02T04:30:00.000Z", helloNonce: null })).toEqual({ verdict: "connectable" });
  });
});

describe("classifyConnectError", () => {
  it("4003 incompatible / 4001 unauthorized / proof invalid forged / 그 외 unreachable", () => {
    expect(classifyConnectError(new Error("closed before welcome: 4003 protocol mismatch: daemon=2"))).toEqual({ kind: "incompatible", code: 4003 });
    expect(classifyConnectError(new Error("closed before welcome: 4001 unauthorized"))).toEqual({ kind: "unauthorized", code: 4001 });
    expect(classifyConnectError(new Error("server proof invalid"))).toEqual({ kind: "forged", code: null });
    expect(classifyConnectError(new Error("ws error"))).toEqual({ kind: "unreachable", code: null });
    expect(classifyConnectError(new Error("closed before welcome: 1006 "))).toEqual({ kind: "unreachable", code: 1006 });
  });
});

describe("proof", () => {
  it("토큰·nonce·역할 중 하나라도 다르면 불일치, 상수 시간 비교", () => {
    const a = proof("tok", "sn", "cn", "server");
    expect(proofEquals(a, proof("tok", "sn", "cn", "server"))).toBe(true);
    expect(proofEquals(a, proof("tok2", "sn", "cn", "server"))).toBe(false);
    expect(proofEquals(a, proof("tok", "sn", "cn", "client"))).toBe(false);
    expect(proofEquals(undefined, a)).toBe(false);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(PROTOCOL_VERSION).toBe(1);
    expect(HELLO_TIMEOUT_MS).toBe(3000);
  });
});

describe("lock file", () => {
  it("writeLock 은 원자 교체(임시 파일 잔존 0), readLock 은 없으면 null", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-lock-"));
    dirs.push(dir);
    expect(readLock(dir)).toBeNull();
    writeLock(dir, lock);
    expect(readLock(dir)).toEqual(lock);
    expect(readdirSync(dir)).toEqual(["daemon.lock"]);
  });
});
