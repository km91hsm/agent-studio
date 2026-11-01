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
