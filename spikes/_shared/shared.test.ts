import { describe, expect, it } from "vitest";
import { createSampleRepo } from "./sampleRepo.js";
import { mask, truncateErrorBody } from "./mask.js";
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
  it("mask: Claude session_id UUID는 등장하는 모든 자리에서 치환되고, 이중 JSON 인코딩(4중 백슬래시) 홈 경로도 치환된다(S4 리뷰 #6)", async () => {
    const { homedir } = await import("node:os");
    const sid = "6592d309-5eed-4923-93d2-1748d4f3e6ae";
    const bs = String.fromCharCode(92);
    const home4 = homedir().split(bs).join(bs + bs + bs + bs);
    const s = mask(`{"session_id":"${sid}","x":"resume ${sid}","p":"${home4}${bs}${bs}${bs}${bs}a.txt","sessionId":"${sid}"}`);
    expect(s).not.toContain(sid);
    expect(s).toContain('"session_id":"<session-id>"');
    expect(s).toContain("resume <session-id>");
    expect(s).not.toMatch(/Users/);
    expect(s).toContain("<home>");
  });
  it("mask: 스트리밍 델타가 사용자명을 토큰 경계에서 자른 경우에도 Users 다음 경로 세그먼트를 가린다(S4 리뷰 #6 잔존 1건)", async () => {
    const { userInfo } = await import("node:os");
    const bs = String.fromCharCode(92);
    const partial = userInfo().username.slice(0, 2);
    const s = mask(`{"text":"C:${bs}${bs}Users${bs}${bs}${partial}"},{"text":"C:/Users/someoneelse/x"},{"partial_json":"Users${bs}${bs}${bs}${bs}${partial}"}`);
    expect(s).toBe(`{"text":"C:${bs}${bs}Users${bs}${bs}<user>"},{"text":"C:/Users/<user>/x"},{"partial_json":"Users${bs}${bs}${bs}${bs}<user>"}`);
  });
  it("mask: Cloudflare 챌린지 토큰(__cf_chl_tk 질의값, cH/cRay/md 등 챌린지 옵션 값)을 치환한다(최종 리뷰 #2)", () => {
    const s = mask(`u=/mcp?__cf_chl_tk=YzaZTI8-1793572841-1.0.1.1-_24Q&x=1 opt={cFPWv: 'g',cH: '_T5TJeBdx9njK',cRay: 'a53e67158fb13e86',cUPMDTk:"/backend/x?__cf_chl_tk=abc.def-1",md: 'lUo5tYi.175Gb'} keep="md":"ok"`);
    expect(s).not.toMatch(/YzaZ|_T5TJ|a53e67158fb13e86|lUo5|abc\.def/);
    expect(s).toContain("__cf_chl_tk=<cf-token>&x=1");
    expect(s).toContain("cRay: '<cf-token>'");
    expect(s).toContain('"md":"ok"'); // JSON 키 형태는 건드리지 않는다
  });
  it("mask: Cloudflare 키 규칙은 파일명 `.md:` 나 JSON 이스케이프된 값(\\\")을 건드리지 않는다 — JSON 녹화를 깨지 않는다(fix pass 회귀)", () => {
    const line = 'README.md: IO error: "},"emittedAtMs":1793572861077}}';
    expect(mask(line)).toBe(line);
    const s = JSON.stringify({ e: 'opt={cUPMDTk:"/x?__cf_chl_tk=abc.def-1",cFPWv:"g",md: "lUo5tYi"}' });
    const m = mask(s);
    expect(() => JSON.parse(m)).not.toThrow();
    expect(m).not.toMatch(/abc\.def|lUo5/);
    expect(JSON.parse(m).e).toBe('opt={cUPMDTk:"<cf-token>",cFPWv:"<cf-token>",md: "<cf-token>"}'); // 이스케이프된 값도 통째로 가리고 따옴표 이스케이프는 보존
  });
  it("truncateErrorBody: 긴 오류 본문(HTML 챌린지)을 상한에서 잘라 길이만 남긴다", () => {
    const long = "MCP startup failed: " + "<html><body>" + "x".repeat(5000) + "</body></html>";
    const t = truncateErrorBody(long, 200);
    expect(t.length).toBeLessThan(300);
    expect(t).toMatch(/<error-body-removed len=\d+>$/);
    expect(truncateErrorBody("short", 200)).toBe("short");
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
