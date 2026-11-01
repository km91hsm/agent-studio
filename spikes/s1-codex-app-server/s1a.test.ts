/**
 * S1a — Codex app-server 기본 왕복 스파이크 (MASTER_IMPLEMENTATION_PLAN Phase 00 Task S1a)
 *
 * (a) readOnly + on-request: 무단 변경 0(필수), 승인 요청 수신 횟수는 관찰값, decline 후 turn.status ∈ {completed, interrupted}
 * (b) workspaceWrite + on-request: 승인 요청 유무 × 파일 변경 유무 2×2 기록, 변경 발생 시 사후 diff 감사가 unapproved_write 포착
 * (c) thread/tokenUsage/updated 수신 ≥ 1
 *
 * 실호출(LIVE) 테스트: AGENT_STUDIO_LIVE=1 에서만 실행. 결과는 .tmp/s1a-results.json, 녹화는 fixtures/codex-0.166.0/.
 */
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSampleRepo, type SampleRepo } from "../_shared/sampleRepo.js";
import { mask } from "../_shared/mask.js";
import { AppServerClient, type ServerRequest } from "./client.js";
import { auditUnapprovedWrites } from "./audit.js";

const LIVE = !!process.env.AGENT_STUDIO_LIVE;
const INSTRUCTION = "현재 디렉터리의 README.md 파일 끝에 'spike-s1a' 한 줄을 추가해 주세요. 다른 파일은 건드리지 마세요.";
const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/codex-0.166.0/", import.meta.url));
const TMP_DIR = fileURLToPath(new URL("./.tmp/", import.meta.url));

interface CaseResult {
  case: string;
  sandbox: "readOnly" | "workspaceWrite";
  approvalRequests: { method: string; itemId?: string; reason?: string | null }[];
  turnStatus: string;
  readmeChanged: boolean;
  dirtyPaths: string[];
  tokenUsageNotifications: number;
  usageLast?: unknown;
  usageTotal?: unknown;
  audit: ReturnType<typeof auditUnapprovedWrites>;
  durationMs: number;
}

const results: CaseResult[] = [];

async function runCase(name: string, sandbox: "readOnly" | "workspaceWrite"): Promise<CaseResult> {
  const repo: SampleRepo = createSampleRepo(`s1a-${sandbox}-`);
  const client = new AppServerClient({ label: name });
  const approvalRequests: CaseResult["approvalRequests"] = [];
  const approvedPaths = new Set<string>();
  const started = Date.now();
  try {
    client.onServerRequest((req: ServerRequest) => {
      approvalRequests.push({
        method: req.method,
        itemId: (req.params as { itemId?: string }).itemId,
        reason: (req.params as { reason?: string | null }).reason ?? null,
      });
      // 모든 승인 요청은 decline — "승인 없이 바뀐 파일"만 관찰하기 위함
      if (req.method.endsWith("/requestApproval")) {
        client.respond(req.id, { decision: "decline" });
      } else {
        client.respondError(req.id, -32601, `spike declines ${req.method}`);
      }
    });
    await client.initialize();
    const before = repo.blob("README.md");
    const { threadId } = await client.threadStart(repo.dir);
    const sandboxPolicy =
      sandbox === "readOnly" ? { type: "readOnly" as const } : { type: "workspaceWrite" as const, writableRoots: [repo.dir] };
    const turn = await client.turnStart(threadId, [{ type: "text", text: INSTRUCTION }], {
      approvalPolicy: "on-request",
      sandboxPolicy,
      cwd: repo.dir,
    });
    const completed = await client.waitForTurnCompleted(threadId, turn.id);
    const after = repo.blob("README.md");
    const dirty = repo.status();
    const usage = client.tokenUsage(threadId);
    const result: CaseResult = {
      case: name,
      sandbox,
      approvalRequests,
      turnStatus: completed.turn.status,
      readmeChanged: before !== after,
      dirtyPaths: dirty,
      tokenUsageNotifications: usage.count,
      usageLast: usage.last,
      usageTotal: usage.total,
      audit: auditUnapprovedWrites(dirty, approvedPaths),
      durationMs: Date.now() - started,
    };
    results.push(result);
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(join(FIXTURE_DIR, `s1a-${sandbox}.jsonl`), mask(client.recording().map((e) => JSON.stringify(e)).join("\n") + "\n"));
    return result;
  } finally {
    await client.close();
    repo.cleanup();
  }
}

describe.skipIf(!LIVE)("S1a codex app-server basic round trip (LIVE)", () => {
  afterAll(() => {
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(join(TMP_DIR, "s1a-results.json"), mask(JSON.stringify(results, null, 2)));
  });

  it("(a) readOnly + on-request: 작업 트리 무단 변경 0, decline 후 turn.status ∈ {completed, interrupted}", async () => {
    const r = await runCase("a-readOnly", "readOnly");
    // 필수 단언: 무단 변경 0
    expect(r.readmeChanged).toBe(false);
    expect(r.dirtyPaths).toEqual([]);
    // 관찰값: 승인 요청 수신 여부·횟수 (단언하지 않음, 기록만)
    expect(Array.isArray(r.approvalRequests)).toBe(true);
    expect(["completed", "interrupted"]).toContain(r.turnStatus);
  });

  it("(b) workspaceWrite + on-request: 2×2 기록, 변경 발생 시 사후 diff 감사가 unapproved_write 포착", async () => {
    const r = await runCase("b-workspaceWrite", "workspaceWrite");
    expect(["completed", "interrupted", "failed"]).toContain(r.turnStatus);
    if (r.readmeChanged) {
      // 승인 요청은 전부 decline 했으므로, 변경이 있었다면 승인 없는 쓰기다 → 감사가 포착해야 한다
      const flagged = r.audit.filter((a) => a.path === "README.md" && a.verdict === "unapproved_write");
      expect(flagged).toHaveLength(1);
    } else {
      expect(r.audit).toEqual([]);
    }
  });

  it("(c) thread/tokenUsage/updated 수신 ≥ 1 (turn/completed에는 usage 없음)", () => {
    const total = results.reduce((n, r) => n + r.tokenUsageNotifications, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });
});

describe("S1a audit (unit)", () => {
  it("승인 목록에 없는 변경 경로를 unapproved_write로 판정한다", () => {
    const audit = auditUnapprovedWrites([" M README.md", "?? new.txt", " M src/ok.ts"], new Set(["src/ok.ts"]));
    expect(audit).toEqual([
      { path: "README.md", status: "M", verdict: "unapproved_write" },
      { path: "new.txt", status: "??", verdict: "unapproved_write" },
      { path: "src/ok.ts", status: "M", verdict: "approved" },
    ]);
  });
});
