/**
 * ApprovalBroker — 14행 대표 입력(SECURITY_MODEL §2 기본·예외), 요청/결정/만료 저널 기록, 재기동 복원.
 */
import { describe, expect, it } from "vitest";
import type { ApprovalCategory, Signals, Verdict } from "@agent-studio/protocol";
import { DEFAULT_POLICY } from "@agent-studio/protocol";
import { ApprovalError, DefaultPolicyBroker } from "./approval-broker.js";
import { MemoryEventStore } from "./journal/memory-store.js";

const clock = (start = 1_762_041_600_000) => {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
};
const setup = () => {
  const c = clock();
  const store = new MemoryEventStore(c.now);
  const broker = new DefaultPolicyBroker(store, DEFAULT_POLICY, { now: c.now });
  return { c, store, broker };
};
const req = (category: ApprovalCategory, signals: Signals = {}, kind: "approval" | "user_input" | "mcp_elicitation" = "approval") => ({
  taskId: "t1",
  runId: "run-1",
  kind,
  category,
  request: { category },
  signals,
});
const ofType = (store: MemoryEventStore, type: string) => store.read(1).filter((e) => e.type === type);

describe("DefaultPolicyBroker.evaluate — 14행 대표 입력", () => {
  const rows: [ApprovalCategory, Signals, Verdict][] = [
    ["project_trust", {}, "ASK"],
    ["fs_write", {}, "AUTO"],
    ["fs_write", { pathOutsideWorktree: true }, "DENY"],
    ["exec", {}, "ASK"],
    ["exec", { readOnlyVerified: true }, "AUTO"],
    ["network", {}, "ASK"],
    ["network", { unregisteredHost: true }, "DENY"],
    ["git_remote", {}, "DENY"],
    ["git_remote", { explicitUserAction: true }, "ALWAYS_ASK"],
    ["db_change", {}, "ALWAYS_ASK"],
    ["dep_install", {}, "ALWAYS_ASK"],
    ["hook_enable", {}, "DENY"],
    ["hook_enable", { explicitUserAction: true }, "ALWAYS_ASK"],
    ["mcp_call", {}, "ASK"],
    ["mcp_call", { readOnlyAuditTool: true }, "AUTO"],
    ["external_service", {}, "DENY"],
    ["external_service", { explicitUserAction: true }, "ALWAYS_ASK"],
    ["deploy", {}, "DENY"],
    ["deploy", { explicitUserAction: true }, "ALWAYS_ASK"],
    ["browser", {}, "ASK"],
    ["browser", { readOnlyBrowse: true }, "ASK"],
    ["browser", { readOnlyBrowse: true, trustedProject: true }, "AUTO"],
    ["computer_use", { action: "capture" }, "ALWAYS_ASK"],
    ["computer_use", { action: "input" }, "ALWAYS_ASK"],
    ["doc_export", {}, "DENY"],
    ["doc_export", { explicitUserAction: true }, "ALWAYS_ASK"],
  ];
  it.each(rows)("%s %j → %s", (category, signals, verdict) => {
    const { broker } = setup();
    expect(broker.evaluate(req(category, signals))).toBe(verdict);
  });

  it("computer_use 의 capture 와 input 은 별도 요청 ID 로 각각 보류된다(분리 승인)", () => {
    const { broker } = setup();
    const a = broker.request(req("computer_use", { action: "capture" }));
    const b = broker.request(req("computer_use", { action: "input" }));
    expect(a).not.toBe(b);
    expect(broker.pending().map((p) => p.requestId).sort()).toEqual([a, b].sort());
  });
});

describe("DefaultPolicyBroker request/decide/expire", () => {
  it("AUTO 는 ApprovalRequested + ApprovalDecided{by:'policy', accept} 를 즉시 기록하고 pending 에 없다", () => {
    const { store, broker } = setup();
    const id = broker.request(req("fs_write"));
    expect(ofType(store, "ApprovalRequested")).toHaveLength(1);
    const decided = ofType(store, "ApprovalDecided");
    expect(decided).toHaveLength(1);
    expect(decided[0]!.payload).toMatchObject({ request_id: id, decision: "accept", by: "policy", scope: "project" });
    expect(decided[0]!.correlationId).toBe(id);
    expect(broker.pending()).toEqual([]);
  });

  it("DENY 는 ApprovalDecided{by:'policy', decline} 를 즉시 기록한다", () => {
    const { store, broker } = setup();
    broker.request(req("git_remote"));
    expect(ofType(store, "ApprovalDecided")[0]!.payload).toMatchObject({ decision: "decline", by: "policy" });
    expect(broker.pending()).toEqual([]);
  });

  it("ASK 는 pending 1건(요청 원문·만료 시각 포함), decide(accept,user) → ApprovalDecided, pending 0", () => {
    const { c, store, broker } = setup();
    const id = broker.request(req("exec"));
    const p = broker.pending();
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ requestId: id, taskId: "t1", runId: "run-1", kind: "approval", category: "exec", request: { category: "exec" } });
    expect(Date.parse(p[0]!.expiresAt) - Date.parse(p[0]!.requestedAt)).toBe(15 * 60_000);
    const reqEv = ofType(store, "ApprovalRequested")[0]!;
    expect(reqEv.payload).toMatchObject({ request_id: id, kind: "approval", category: "exec", requested_at: new Date(c.now()).toISOString() });
    expect(reqEv.taskId).toBe("t1");
    expect(reqEv.agentRunId).toBe("run-1");
    broker.decide(id, "accept", "user");
    expect(ofType(store, "ApprovalDecided")[0]!.payload).toMatchObject({ request_id: id, decision: "accept", by: "user", scope: "once" });
    expect(broker.pending()).toEqual([]);
  });

  it("16분 뒤 expire() → ApprovalExpired, 이후 decide → approval_expired (Review Focus 4)", () => {
    const { c, store, broker } = setup();
    const id = broker.request(req("exec"));
    c.advance(14 * 60_000);
    expect(broker.expire()).toEqual([]);
    c.advance(2 * 60_000);
    expect(broker.expire()).toEqual([id]);
    expect(ofType(store, "ApprovalExpired")).toHaveLength(1);
    expect(ofType(store, "ApprovalExpired")[0]!.payload).toEqual({ request_id: id });
    expect(broker.pending()).toEqual([]);
    expect(() => broker.decide(id, "accept", "user")).toThrow(ApprovalError);
    expect(() => broker.decide(id, "accept", "user")).toThrow(/approval_expired/);
    expect(broker.expire()).toEqual([]);
  });

  it("decide 두 번 → already_decided, 없는 ID → not_found", () => {
    const { broker } = setup();
    const id = broker.request(req("exec"));
    broker.decide(id, "decline", "user");
    expect(() => broker.decide(id, "accept", "user")).toThrow(/already_decided/);
    expect(() => broker.decide("nope", "accept", "user")).toThrow(/not_found/);
  });

  it("재기동: 같은 저널로 새 Broker 를 만들면 pending 과 만료 시각이 유지된다(요청 시각 기준)", () => {
    const { c, store, broker } = setup();
    const id = broker.request(req("exec"));
    c.advance(10 * 60_000);
    const broker2 = new DefaultPolicyBroker(store, DEFAULT_POLICY, { now: c.now });
    expect(broker2.pending().map((p) => p.requestId)).toEqual([id]);
    c.advance(6 * 60_000);
    expect(broker2.expire()).toEqual([id]);
  });

  it("user_input / mcp_elicitation 요청은 kind 가 보존된다", () => {
    const { broker } = setup();
    broker.request(req("exec", {}, "user_input"));
    expect(broker.pending()[0]!.kind).toBe("user_input");
  });
});
