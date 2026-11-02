/**
 * T6 IPC 가드: 발신 frame 검증(같은 webContents + app://bundle/ + 최상위 frame) → 메서드 분류(read/write 만, control 거부)
 * → params 스키마(Task 9 RPC_PARAMS_SCHEMA 공용) → 데몬 호출. 어느 단계든 실패하면 데몬 호출 0회.
 */
import { describe, expect, it } from "vitest";
import { createIpcHandlers, isReadMethod, isWriteMethod, validateParams, validateSender } from "./ipc-guard.js";

const win = { webContentsId: 7 };
const good = { senderId: 7, frameUrl: "app://bundle/index.html", isTopFrame: true };

describe("validateSender", () => {
  it("같은 webContents + app://bundle/ + 최상위 frame 만 true", () => {
    expect(validateSender(good, win)).toBe(true);
    expect(validateSender({ ...good, senderId: 8 }, win)).toBe(false);
    expect(validateSender({ ...good, frameUrl: "file:///D:/x/index.html" }, win)).toBe(false);
    expect(validateSender({ ...good, frameUrl: "https://bundle/index.html" }, win)).toBe(false);
    expect(validateSender({ ...good, frameUrl: "app://other/index.html" }, win)).toBe(false);
    expect(validateSender({ ...good, isTopFrame: false }, win)).toBe(false);
  });
});

describe("method classification", () => {
  it("task.submit 은 write, daemon.status 는 read, daemon.shutdown·task.transition 은 둘 다 false", () => {
    expect(isWriteMethod("task.submit")).toBe(true);
    expect(isReadMethod("task.submit")).toBe(false);
    expect(isReadMethod("daemon.status")).toBe(true);
    expect(isWriteMethod("daemon.status")).toBe(false);
    expect(isReadMethod("daemon.shutdown")).toBe(false);
    expect(isWriteMethod("daemon.shutdown")).toBe(false);
    expect(isReadMethod("task.transition")).toBe(false);
    expect(isWriteMethod("task.transition")).toBe(false);
    // 리뷰C#1: events.subscribe 는 데몬 연결(Shell main) 범위의 메서드 — 렌더러가 호출하면 Shell 의 구독을 교체하므로 비노출
    expect(isReadMethod("events.subscribe")).toBe(false);
    expect(isWriteMethod("events.subscribe")).toBe(false);
  });
  it("validateParams 는 Task 9 스키마와 같은 판정", () => {
    expect(validateParams("task.submit", { title: "x", kind: "impl" })).toEqual([]);
    expect(validateParams("task.submit", { title: "x", kind: "impl", extra: 1 }).length).toBeGreaterThan(0);
    expect(validateParams("task.submit", { kind: "impl" }).length).toBeGreaterThan(0);
    expect(validateParams("approval.decide", { requestId: "r", decision: "maybe" }).length).toBeGreaterThan(0);
  });
});

describe("createIpcHandlers (가짜 DaemonClient)", () => {
  const fake = () => {
    const calls: { method: string; params: unknown }[] = [];
    const daemon = {
      call: async (method: string, params?: unknown) => {
        calls.push({ method, params });
        return { ok: method };
      },
    };
    return { calls, handlers: createIpcHandlers(daemon, win) };
  };
  it("정상 read/write 는 데몬을 1회 호출하고 결과를 돌려준다", async () => {
    const { calls, handlers } = fake();
    expect(await handlers.read(good, "daemon.status", undefined)).toEqual({ ok: "daemon.status" });
    expect(await handlers.write(good, "task.submit", { title: "x", kind: "impl" })).toEqual({ ok: "task.submit" });
    expect(calls).toEqual([
      { method: "daemon.status", params: undefined },
      { method: "task.submit", params: { title: "x", kind: "impl" } },
    ]);
  });
  it("sender 위조 → 거부, 호출 0회", async () => {
    const { calls, handlers } = fake();
    await expect(handlers.read({ ...good, senderId: 99 }, "daemon.status", undefined)).rejects.toThrow(/sender/i);
    await expect(handlers.write({ ...good, isTopFrame: false }, "task.submit", { title: "x", kind: "impl" })).rejects.toThrow(/sender/i);
    expect(calls).toHaveLength(0);
  });
  it("control·비노출·분류 불일치 메서드 → 거부, 호출 0회", async () => {
    const { calls, handlers } = fake();
    await expect(handlers.write(good, "daemon.shutdown", undefined)).rejects.toThrow(/method/i);
    await expect(handlers.read(good, "daemon.shutdown", undefined)).rejects.toThrow(/method/i);
    await expect(handlers.read(good, "task.transition", { taskId: "t", event: "cancel" })).rejects.toThrow(/method/i);
    await expect(handlers.read(good, "task.submit", { title: "x", kind: "impl" })).rejects.toThrow(/method/i); // write 를 read 채널로
    await expect(handlers.write(good, "daemon.status", undefined)).rejects.toThrow(/method/i); // read 를 write 채널로
    expect(calls).toHaveLength(0);
  });
  it("리뷰C#1 events.subscribe 를 read 채널로 → 거부, 호출 0회", async () => {
    const { calls, handlers } = fake();
    await expect(handlers.read(good, "events.subscribe", { fromSeq: 999_999 })).rejects.toThrow(/method/i);
    expect(calls).toHaveLength(0);
  });
  it("리뷰C#2 렌더러로 가는 응답에서 tokenRef·nonce 는 제거된다(daemon.status, capabilities.get)", async () => {
    const calls: string[] = [];
    const daemon = {
      call: async (method: string) => {
        calls.push(method);
        if (method === "daemon.status") return { pid: 1, seq: 3, protocolVersion: 1, tokenRef: "file:D:/state/token", nonce: "abc", startedAt: "t", connections: 1 };
        return { isolationWarnings: [], tokenRef: "keyring:agent-studio/daemon-token", protocolVersion: 1 };
      },
    };
    const handlers = createIpcHandlers(daemon, win);
    expect(await handlers.read(good, "daemon.status", undefined)).toEqual({ pid: 1, seq: 3, protocolVersion: 1, startedAt: "t", connections: 1 });
    expect(await handlers.read(good, "capabilities.get", undefined)).toEqual({ isolationWarnings: [], protocolVersion: 1 });
    expect(calls).toEqual(["daemon.status", "capabilities.get"]);
  });
  it("스키마 위반 → 거부, 호출 0회", async () => {
    const { calls, handlers } = fake();
    await expect(handlers.write(good, "task.submit", { title: "", kind: "impl" })).rejects.toThrow(/params/i);
    await expect(handlers.write(good, "task.submit", { title: "x", kind: "impl", extra: 1 })).rejects.toThrow(/params/i);
    await expect(handlers.read(good, "task.get", {})).rejects.toThrow(/params/i);
    expect(calls).toHaveLength(0);
  });
});
