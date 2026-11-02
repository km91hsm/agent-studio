/** T2 RPC 계약: 메서드 분류(read/write/control), task.transition 비노출, params 스키마 양측 공용 검증(-32602 입력). */
import { describe, expect, it } from "vitest";
import { isRpcMethod, methodClass, RPC_ERRORS, RPC_METHODS, RPC_PARAMS_SCHEMA, RPC_PROTOCOL_VERSION, validateParams } from "./rpc.js";

describe("RPC_METHODS", () => {
  it("read/write/control 분류가 계획과 같고 task.transition 은 어디에도 없다", () => {
    expect(RPC_PROTOCOL_VERSION).toBe(1);
    expect([...RPC_METHODS.read]).toEqual(["daemon.status", "events.subscribe", "task.get", "task.list", "approval.pending", "policy.get", "capabilities.get"]);
    expect([...RPC_METHODS.write]).toEqual(["task.submit", "task.cancel", "task.unblock", "task.abandon", "approval.decide", "policy.set", "user_input.answer"]);
    expect([...RPC_METHODS.control]).toEqual(["daemon.shutdown"]);
    expect(methodClass("task.transition")).toBeNull();
    expect(isRpcMethod("task.transition")).toBe(false);
    expect(methodClass("task.submit")).toBe("write");
    expect(methodClass("daemon.shutdown")).toBe("control");
    expect(methodClass("daemon.status")).toBe("read");
    expect(RPC_ERRORS).toEqual({ METHOD_NOT_FOUND: -32601, INVALID_PARAMS: -32602, UNAUTHORIZED: -32001, STALE_WRITER: -32003, PRECONDITION_FAILED: -32004, APPROVAL_ERROR: -32005, NOT_PENDING: -32006 });
  });
  it("모든 메서드에 params 스키마가 있고 additionalProperties:false 다", () => {
    const all = [...RPC_METHODS.read, ...RPC_METHODS.write, ...RPC_METHODS.control];
    for (const m of all) {
      const s = RPC_PARAMS_SCHEMA[m];
      expect(s, m).toBeDefined();
      expect(s.additionalProperties, m).toBe(false);
    }
  });
  it("validateParams: 정상은 [], 빈 title·추가 속성·잘못된 enum·음수 fromSeq 는 오류", () => {
    expect(validateParams("task.submit", { title: "t", kind: "impl" })).toEqual([]);
    expect(validateParams("task.submit", { title: "", kind: "impl" }).length).toBeGreaterThan(0);
    expect(validateParams("task.submit", { title: "t", kind: "impl", extra: 1 }).length).toBeGreaterThan(0);
    expect(validateParams("task.submit", { title: "t", kind: "bogus" }).length).toBeGreaterThan(0);
    expect(validateParams("events.subscribe", { fromSeq: 0 })).toEqual([]);
    expect(validateParams("events.subscribe", { fromSeq: -1 }).length).toBeGreaterThan(0);
    expect(validateParams("approval.decide", { requestId: "r", decision: "accept" })).toEqual([]);
    expect(validateParams("approval.decide", { requestId: "r", decision: "maybe" }).length).toBeGreaterThan(0);
    expect(validateParams("user_input.answer", { requestId: "r", answers: { answer: "confirmed" } })).toEqual([]);
    expect(validateParams("daemon.status", undefined)).toEqual([]);
    expect(validateParams("daemon.status", {})).toEqual([]);
    expect(validateParams("daemon.status", { x: 1 }).length).toBeGreaterThan(0);
  });
});
