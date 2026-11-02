/**
 * P01 T9 — Gateway 정식 서명 + FakeGateway(녹화 이벤트 재생).
 * 타입 단언(§1 10 kind·필수 필드)은 컴파일 시 검사되며 `npm run lint`(tsc)가 이 파일을 포함한다.
 */
import { describe, expect, it } from "vitest";
import { GATEWAY_EVENT_KINDS } from "@agent-studio/protocol";
import type { GatewayEvent, RunSpec } from "@agent-studio/protocol";
import { FakeGateway } from "./fake-gateway.js";
import { SAMPLE_EVENTS, SAMPLE_LIST } from "./fixtures.js";

const spec: RunSpec = {
  agent: "codex",
  projectDir: "D:/tmp/p",
  worktreeDir: "D:/tmp/p",
  mode: "new",
  prompt: [{ type: "text", text: "hi" }],
  policy: { codex: { approvalPolicy: "on-request", sandbox: "workspaceWrite" } },
  skills: [],
  mcp: { servers: [] },
  authMode: "cli_login",
};

const collect = async (it: AsyncIterable<GatewayEvent>) => {
  const out: GatewayEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
};

describe("Gateway canonical signature (types)", () => {
  it("10 kind 샘플이 전부 GatewayEvent 를 만족하고 kind 집합이 GATEWAY_EVENT_KINDS 와 같다", () => {
    const kinds = SAMPLE_LIST.map((e) => e.kind).sort();
    expect(kinds).toEqual([...GATEWAY_EVENT_KINDS].sort());
    SAMPLE_LIST.forEach((e) => {
      expect(e.native.schemaVersion).toBe("v2");
      expect(typeof e.seq).toBe("number");
    });
  });

  it("잘못된 이벤트 객체는 컴파일 오류다(@ts-expect-error 3종)", () => {
    // @ts-expect-error — 10 kind 밖의 값
    const bogus: GatewayEvent = { ...SAMPLE_EVENTS.message_delta, kind: "bogus" };
    // @ts-expect-error — approval_requested 에 requestId 누락
    const noRequestId: GatewayEvent = { ...SAMPLE_EVENTS.item_started, kind: "approval_requested", category: "exec", request: {}, itemKey: "x" };
    // @ts-expect-error — usage_updated 의 tokens 에 cached_input 누락
    const noCached: GatewayEvent = { ...SAMPLE_EVENTS.usage_updated, tokens: { input: 1, cache_write: 0, output: 1, reasoning: 0 } };
    expect([bogus, noRequestId, noCached].length).toBe(3);
  });
});

describe("FakeGateway", () => {
  it("(a) 스크립트를 events() 로 전부 재생하고 seq 가 1..N 으로 증가한다", async () => {
    const script = [SAMPLE_EVENTS.item_started, SAMPLE_EVENTS.approval_requested, SAMPLE_EVENTS.turn_finished];
    const gw = new FakeGateway([script]);
    const run = await gw.startRun(spec);
    const got = await collect(run.events());
    expect(got.map((e) => e.kind)).toEqual(["item_started", "approval_requested", "turn_finished"]);
    expect(got.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(got.every((e) => e.runId === run.runId)).toBe(true);
  });

  it("(b) respond() 호출이 responses 에 기록된다", async () => {
    const gw = new FakeGateway([[SAMPLE_EVENTS.approval_requested]]);
    const run = await gw.startRun(spec);
    await run.respond("r1", { kind: "approval", decision: "decline" });
    expect(gw.responses).toEqual([{ runId: run.runId, requestId: "r1", answer: { kind: "approval", decision: "decline" } }]);
  });

  it("(c) steer() 는 'queued_next_turn', startRun 마다 다음 스크립트를 쓴다", async () => {
    const gw = new FakeGateway([[SAMPLE_EVENTS.turn_finished], [SAMPLE_EVENTS.fault]]);
    const r1 = await gw.startRun(spec);
    const r2 = await gw.startRun(spec);
    expect(await r1.steer("more")).toBe("queued_next_turn");
    expect((await collect(r1.events())).map((e) => e.kind)).toEqual(["turn_finished"]);
    expect((await collect(r2.events())).map((e) => e.kind)).toEqual(["fault"]);
    expect(r1.runId).not.toBe(r2.runId);
    await expect(gw.startRun(spec)).rejects.toThrow(/no script/);
  });

  it("(d) capabilities/listSessions/readSession 은 비어 있는 안전값을 돌려준다", async () => {
    const gw = new FakeGateway([]);
    expect((await gw.capabilities("claude")).agent).toBe("claude");
    expect(await gw.listSessions("codex", {})).toEqual([]);
    expect((await gw.readSession("codex:thread-1")).items).toEqual([]);
  });
});
