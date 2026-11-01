import { describe, expect, it } from "vitest";
import { createSampleRepo } from "./sampleRepo.js";
import { mask } from "./mask.js";
import { addUsage, emptyUsage } from "./usage.js";

describe("_shared", () => {
  it("sample repo: 복사·git init·blob 해시·clean status", () => {
    const repo = createSampleRepo();
    try {
      expect(repo.status()).toEqual([]);
      expect(repo.blob("README.md")).toMatch(/^[0-9a-f]{40}$/);
    } finally {
      repo.cleanup();
    }
  });
  it("mask: thread id·토큰 패턴 치환", () => {
    const fakeToken = "ghp_" + "x".repeat(30);
    const s = mask(`id=01a197bc-b84f-77f3-8427-72e616b485e8 tok=${fakeToken}`);
    expect(s).toBe("id=<thread-id> tok=<secret>");
  });
  it("usage: 누적", () => {
    const u = addUsage(emptyUsage("codex"), { calls: 1, inputTokens: 10 });
    expect(addUsage(u, { calls: 1, outputTokens: 5 })).toMatchObject({ calls: 2, inputTokens: 10, outputTokens: 5 });
  });
});

describe("sanitizeEvents", () => {
  it("MCP 기동 실패 알림의 긴 error 본문(HTML 챌린지 등)을 잘라낸다", async () => {
    const { sanitizeEvents } = await import("./mask.js");
    const big = "HTTP 403: <html>" + "x".repeat(5000) + "</html>";
    const events = [
      { t: 1, dir: "in", msg: { method: "mcpServer/startupStatus/updated", params: { name: "s", status: "failed", error: big } } },
      { t: 2, dir: "in", msg: { method: "item/completed", params: { item: { type: "agentMessage", text: "x".repeat(5000) } } } },
    ];
    const out = sanitizeEvents(events);
    const err = (out[0].msg as { params: { error: string } }).params.error;
    expect(err.length).toBeLessThan(400);
    expect(err).toContain("<error-body-removed");
    expect(err).not.toContain("</html>");
    // 다른 알림은 손대지 않는다
    expect((out[1].msg as { params: { item: { text: string } } }).params.item.text.length).toBe(5000);
  });
});
