/**
 * GatewayEvent 10종의 올바른 샘플(§1 표의 필수 필드를 전부 채움). 타입 테스트(`satisfies`)와 FakeGateway 스크립트가 공유한다.
 * `native`는 임의 포인터(실 어댑터는 P02 이후).
 */
import type { GatewayEvent, GatewayEventKind } from "@agent-studio/protocol";

const base = (seq: number) => ({
  runId: "run-fixture",
  seq,
  ts: `2026-11-02T00:00:0${seq % 10}.000Z`,
  agent: "codex" as const,
  native: { schemaVersion: "v2", payloadRef: `fixture:${seq}` },
});

export const SAMPLE_EVENTS: { [K in GatewayEventKind]: Extract<GatewayEvent, { kind: K }> } = {
  message_delta: { ...base(1), kind: "message_delta", itemKey: "msg-1", text: "hello" },
  item_started: { ...base(2), kind: "item_started", itemKind: "tool", itemKey: "tool-1", summary: "ls" },
  item_updated: { ...base(3), kind: "item_updated", itemKey: "tool-1", progress: { line: 1 } },
  item_finished: { ...base(4), kind: "item_finished", itemKey: "tool-1", status: "completed", result: "ok" },
  approval_requested: {
    ...base(5),
    kind: "approval_requested",
    requestId: "r1",
    category: "exec",
    request: { command: "npm test" },
    itemKey: "tool-2",
  },
  user_input_requested: { ...base(6), kind: "user_input_requested", requestId: "q1", questions: [{ id: "q", text: "?" }], itemKey: "ask-1" },
  mcp_elicitation_requested: { ...base(7), kind: "mcp_elicitation_requested", requestId: "e1", serverName: "probe", mode: "form", schema: {} },
  usage_updated: {
    ...base(8),
    kind: "usage_updated",
    tokens: { input: 10, cached_input: 0, cache_write: 0, output: 5, reasoning: 0 },
    turnKey: "turn-1",
  },
  turn_finished: { ...base(9), kind: "turn_finished", status: "completed", turnKey: "turn-1" },
  fault: { ...base(10), kind: "fault", class: "transport", retryable: true, native: { schemaVersion: "v2", payloadRef: "fixture:10" } },
};

export const SAMPLE_LIST: GatewayEvent[] = Object.values(SAMPLE_EVENTS);
