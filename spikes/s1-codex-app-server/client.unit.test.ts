/**
 * client.ts 단위 테스트 — 가짜 app-server(node -e 스크립트)로 프로토콜 경계 조건을 재현한다.
 * (Codex S1a 리뷰 #5: turn/start 응답 직후 도착하는 turn/completed를 놓치는 경쟁, #6: 승인 요청-해결 짝)
 */
import { describe, expect, it } from "vitest";
import { AppServerClient } from "./client.js";

/** 가짜 서버: initialize/thread/turn 요청에 즉시 응답하고, turn/start 응답과 같은 청크에 완료 알림까지 보낸다. */
const FAKE_SERVER = `
const rl = require("node:readline").createInterface({ input: process.stdin });
const out = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
rl.on("line", (line) => {
  const m = JSON.parse(line);
  if (m.method === "initialize") out({ id: m.id, result: { userAgent: "fake" } });
  if (m.method === "thread/start") out({ id: m.id, result: { thread: { id: "t1" } } });
  if (m.method === "turn/start") {
    const turn = { id: "turn1", status: "inProgress", items: [] };
    process.stdout.write(
      JSON.stringify({ id: m.id, result: { turn } }) + "\\n" +
      JSON.stringify({ method: "item/commandExecution/requestApproval", id: 0, params: { threadId: "t1", turnId: "turn1", itemId: "exec-1" } }) + "\\n" +
      JSON.stringify({ method: "thread/tokenUsage/updated", params: { threadId: "t1", turnId: "turn1", tokenUsage: { last: { totalTokens: 1 }, total: { totalTokens: 1 } } } }) + "\\n"
    );
  }
  if (m.id === 0 && m.result) {
    out({ method: "serverRequest/resolved", params: { threadId: "t1", requestId: 0 } });
    out({ method: "turn/completed", params: { threadId: "t1", turn: { id: "turn1", status: "completed", items: [] } } });
  }
  if (m.method === "shutdown") process.exit(0);
});
`;

function fakeClient() {
  return new AppServerClient({ label: "fake", codexBin: process.execPath, spawnArgs: ["-e", FAKE_SERVER] });
}

describe("AppServerClient (fake server)", () => {
  it("turn/start 응답과 같은 청크에 온 turn/completed도 waitForTurnCompleted가 받는다", async () => {
    const c = fakeClient();
    try {
      c.onServerRequest((req) => c.respond(req.id, { decision: "decline" }));
      await c.initialize();
      const { threadId } = await c.threadStart("C:/tmp");
      const turn = await c.turnStart(threadId, [{ type: "text", text: "x" }]);
      const done = await c.waitForTurnCompleted(threadId, turn.id, 2000);
      expect(done.turn.status).toBe("completed");
    } finally {
      await c.close();
    }
  });

  it("tokenUsage를 (threadId, turnId)별로 집계하고, 서버 요청의 해결 알림을 requestId별로 기록한다", async () => {
    const c = fakeClient();
    try {
      c.onServerRequest((req) => c.respond(req.id, { decision: "decline" }));
      await c.initialize();
      const { threadId } = await c.threadStart("C:/tmp");
      const turn = await c.turnStart(threadId, [{ type: "text", text: "x" }]);
      await c.waitForTurnCompleted(threadId, turn.id, 2000);
      expect(c.tokenUsage(threadId, turn.id).count).toBe(1);
      expect(c.tokenUsage(threadId, "other-turn").count).toBe(0);
      expect(c.resolvedRequestIds()).toEqual([0]);
    } finally {
      await c.close();
    }
  });
});
