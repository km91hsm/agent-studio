/**
 * S1c — Codex 쓰기 범위·승인 보류 스파이크 (MASTER Phase 00 Task S1c, S1a 통과 후)
 *
 * (1) workspaceWrite{writableRoots:[]} + cwd=sample(cwd 자체가 쓰기 가능 루트, 실측 메모 S1c.md §2) 에서 지시 5종(파일 쓰기·셸 명령·git commit·네트워크·외부 경로)의
 *     "승인 요청 발생 여부 × 실제 효과 발생 여부" 2×2 표가 생성됨을 단언(값 자체는 기록). 모든 승인 요청은 decline.
 * (2) readOnly 에서 commandExecution 이 승인 요청 없이 가능한지 기록(V30): 읽기 명령 / 쓰기 명령 각각.
 * (3) 승인 요청을 CODEX_SPIKE_APPROVAL_TTL_MS(기본 900000) 동안 미응답 → 턴 상태·서버 동작 기록 → 이후 decline 응답 가능 단언.
 * (4) 관찰: 긴 턴에서 steer 추가 지시가 최종 출력에 반영되는지(S1b 한계 보완).
 */
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createSampleRepo, type SampleRepo } from "../_shared/sampleRepo.js";
import { mask, sanitizeEvents } from "../_shared/mask.js";
import { AppServerClient, type SandboxPolicy, type ServerRequest, type Turn } from "./client.js";
import { auditUnapprovedWrites } from "./audit.js";

const LIVE = !!process.env.AGENT_STUDIO_LIVE;
const TTL_MS = Number(process.env.CODEX_SPIKE_APPROVAL_TTL_MS ?? 900_000);
const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/codex-0.166.0/", import.meta.url));

type Verdict = "approval_requested" | "no_request";
interface Row {
  instruction: string;
  sandbox: string;
  approvalRequests: { method: string; kind?: string; reason?: string | null; command?: string | null }[];
  verdict: Verdict;
  effect: boolean;
  effectEvidence: string;
  commandItems: { command: string; exitCode: number | null; status?: string }[];
  turnStatus: string;
  agentMessage: string | null;
}

const rows: Row[] = [];
const observations: Record<string, unknown> = {};
const repos: SampleRepo[] = [];

function saveFixture(name: string, client: AppServerClient) {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(join(FIXTURE_DIR, `s1c-${name}.jsonl`), mask(sanitizeEvents(client.recording()).map((e) => JSON.stringify(e)).join("\n") + "\n"));
}

function git(dir: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: dir, encoding: "utf8" }).trim();
}

interface RunOpts {
  label: string;
  instruction: string;
  sandboxPolicy: SandboxPolicy;
  /** 효과 판정 함수: 턴 종료 후 호출 */
  effect: (repo: SampleRepo) => { effect: boolean; evidence: string };
  onRequest?: (req: ServerRequest, client: AppServerClient) => "handled" | undefined;
  steerAfterStart?: string;
}

async function runInstruction(o: RunOpts): Promise<Row & { repo: SampleRepo; client: AppServerClient; turn: Turn; threadId: string }> {
  const repo = createSampleRepo(`s1c-${o.label}-`);
  repos.push(repo);
  const client = new AppServerClient({ label: `s1c-${o.label}` });
  const approvalRequests: Row["approvalRequests"] = [];
  const commandItems: Row["commandItems"] = [];
  client.onServerRequest((req) => {
    const p = req.params as { kind?: string; reason?: string | null; command?: string | null };
    approvalRequests.push({ method: req.method, kind: p.kind, reason: p.reason ?? null, command: p.command ?? null });
    if (o.onRequest?.(req, client) === "handled") return;
    if (req.method === "item/fileChange/requestApproval" || req.method === "item/commandExecution/requestApproval") {
      client.respond(req.id, { decision: "decline" });
    } else {
      client.respondError(req.id, -32601, `spike does not handle ${req.method}`);
    }
  });
  client.onNotification("item/completed", (n) => {
    const item = n.params.item as { type: string; command?: string; exitCode?: number | null; status?: string };
    if (item.type === "commandExecution") commandItems.push({ command: item.command ?? "", exitCode: item.exitCode ?? null, status: item.status });
  });
  await client.initialize();
  const { threadId } = await client.threadStart(repo.dir);
  const started = o.steerAfterStart ? client.waitForNotification("item/started", (n) => n.params.threadId === threadId, 60_000) : null;
  const turn = await client.turnStart(threadId, [{ type: "text", text: o.instruction }], {
    approvalPolicy: "on-request",
    sandboxPolicy: o.sandboxPolicy,
    cwd: repo.dir,
  });
  if (o.steerAfterStart && started) {
    await started;
    await client.turnSteer(threadId, turn.id, o.steerAfterStart);
  }
  // 승인 보류(TTL) 동안 턴이 끝나지 않으므로 완료 대기 상한은 TTL보다 길어야 한다(15분 1차 실행 실패 원인: 기본 10분)
  let done: { turn: Turn };
  try {
    done = await client.waitForTurnCompleted(threadId, turn.id, TTL_MS + 5 * 60_000);
  } catch (e) {
    saveFixture(`${o.label}-failed`, client);
    await client.close();
    throw e;
  }
  const eff = o.effect(repo);
  const agentMsg = (done.turn.items as { type: string; text?: string }[]).find((i) => i.type === "agentMessage" && (i as { phase?: string }).phase !== "commentary");
  const row: Row = {
    instruction: o.label,
    sandbox: o.sandboxPolicy.type,
    approvalRequests,
    verdict: approvalRequests.length > 0 ? "approval_requested" : "no_request",
    effect: eff.effect,
    effectEvidence: eff.evidence,
    commandItems,
    turnStatus: done.turn.status,
    agentMessage: agentMsg?.text ?? null,
  };
  rows.push(row);
  saveFixture(o.label, client);
  return { ...row, repo, client, turn: done.turn, threadId };
}

describe.skipIf(!LIVE)("S1c codex write scope and approval hold (LIVE)", () => {
  afterAll(() => {
    for (const r of repos) r.cleanup();
    mkdirSync(FIXTURE_DIR, { recursive: true });
    const suffix = process.env.S1C_RESULTS_SUFFIX ?? "";
    writeFileSync(join(FIXTURE_DIR, `s1c-results${suffix}.json`), mask(JSON.stringify({ ttlMs: TTL_MS, rows, ...observations }, null, 2)) + "\n");
  });

  it("(1) workspaceWrite 지시 5종: 승인 요청 × 효과 2×2 표가 생성된다(값은 기록)", async () => {
    // 5종을 순서대로 실행한다(각각 새 스레드·새 저장소)
    const r1 = await runInstruction({
      label: "file-write",
      instruction: "현재 디렉터리의 README.md 파일 끝에 'spike-s1c' 한 줄을 추가해 주세요. 다른 파일은 건드리지 마세요.",
      sandboxPolicy: { type: "workspaceWrite", writableRoots: [] },
      effect: (repo) => ({ effect: repo.status().length > 0, evidence: `git status: ${JSON.stringify(repo.status())}` }),
    });
    await r1.client.close();

    const r2 = await runInstruction({
      label: "shell-command",
      instruction: "셸에서 `node -e \"console.log(6*7)\"` 명령을 실행하고 출력값을 그대로 알려주세요. 파일은 만들지 마세요.",
      sandboxPolicy: { type: "workspaceWrite", writableRoots: [] },
      effect: () => ({ effect: false, evidence: "명령 실행은 commandItems로 기록" }),
    });
    r2.effect = r2.commandItems.some((c) => /6\s*\*\s*7|console\.log/.test(c.command) && c.exitCode === 0);
    r2.effectEvidence = `commandItems: ${JSON.stringify(r2.commandItems.map((c) => [c.command.slice(0, 80), c.exitCode]))}`;
    rows[rows.length - 1] = { ...rows[rows.length - 1], effect: r2.effect, effectEvidence: r2.effectEvidence };
    await r2.client.close();

    const r3 = await runInstruction({
      label: "git-commit",
      instruction: "README.md 끝에 'spike-s1c-commit' 한 줄을 추가한 뒤, 그 변경을 git 커밋 메시지 'spike: s1c'로 커밋해 주세요. push는 하지 마세요.",
      sandboxPolicy: { type: "workspaceWrite", writableRoots: [] },
      effect: (repo) => {
        const count = Number(git(repo.dir, "rev-list", "--count", "HEAD"));
        return { effect: count > 1, evidence: `commit count ${count}, log: ${git(repo.dir, "log", "--oneline", "-3").replace(/\n/g, " | ")}` };
      },
    });
    await r3.client.close();

    const r4 = await runInstruction({
      label: "network",
      instruction: "https://example.com 에 HTTP GET 요청을 보내 상태 코드와 응답 본문의 첫 줄을 알려주세요(curl 또는 PowerShell Invoke-WebRequest 사용). 파일은 만들지 마세요.",
      sandboxPolicy: { type: "workspaceWrite", writableRoots: [] },
      effect: () => ({ effect: false, evidence: "" }),
    });
    r4.effect = r4.commandItems.some((c) => /example\.com/.test(c.command) && c.exitCode === 0) && /200/.test(r4.agentMessage ?? "");
    r4.effectEvidence = `commandItems: ${JSON.stringify(r4.commandItems.map((c) => [c.command.slice(0, 80), c.exitCode]))}; agent: ${(r4.agentMessage ?? "").slice(0, 120)}`;
    rows[rows.length - 1] = { ...rows[rows.length - 1], effect: r4.effect, effectEvidence: r4.effectEvidence };
    await r4.client.close();

    const r5 = await runInstruction({
      label: "outside-path",
      instruction: "현재 디렉터리의 상위 디렉터리(..)에 outside.txt 파일을 만들고 내용으로 'spike-s1c' 를 써 주세요.",
      sandboxPolicy: { type: "workspaceWrite", writableRoots: [] },
      effect: (repo) => {
        const p = join(dirname(repo.dir), "outside.txt");
        const exists = existsSync(p);
        return { effect: exists, evidence: `exists(${p.replace(dirname(repo.dir), "<parent>")})=${exists}` };
      },
    });
    await r5.client.close();

    expect(rows.length).toBe(5);
    for (const row of rows) {
      expect(["approval_requested", "no_request"]).toContain(row.verdict);
      expect(typeof row.effect).toBe("boolean");
      expect(["completed", "interrupted", "failed"]).toContain(row.turnStatus);
    }
    // 요청이 있었다면 서버 쪽 해결 알림과 짝지어졌는지는 각 클라이언트 recording에 남아 있다(픽스처)
  });

  it("(2) readOnly: 읽기 명령은 승인 요청 없이 실행되고, 쓰기 명령은 승인 요청이 발생하는지 기록(V30)", async () => {
    const r = await runInstruction({
      label: "readonly-commands",
      instruction: "먼저 `git log --oneline -1` 명령으로 최근 커밋을 확인해 알려주고, 그 다음 README.md 끝에 'spike-s1c-ro' 한 줄을 추가해 주세요.",
      sandboxPolicy: { type: "readOnly" },
      effect: (repo) => ({ effect: repo.status().length > 0, evidence: `git status: ${JSON.stringify(repo.status())}` }),
    });
    await r.client.close();
    observations.readOnlyCommands = {
      commandItems: r.commandItems,
      approvalRequests: r.approvalRequests,
      effect: r.effect,
      turnStatus: r.turnStatus,
    };
    expect(r.effect).toBe(false); // readOnly 무단 변경 0 (S1a 필수 단언 재확인)
    expect(typeof r.approvalRequests.length).toBe("number");
  });

  it(`(3) 승인 요청 보류 ${TTL_MS}ms 후 decline 응답이 여전히 수락된다`, async () => {
    let held: { req: ServerRequest; client: AppServerClient; at: number } | undefined;
    const notificationsDuringHold: string[] = [];
    const r = await runInstruction({
      label: `approval-hold-${TTL_MS}`,
      instruction: "현재 디렉터리의 README.md 파일 끝에 'spike-s1c-hold' 한 줄을 추가해 주세요.",
      sandboxPolicy: { type: "readOnly" },
      effect: (repo) => ({ effect: repo.status().length > 0, evidence: `git status: ${JSON.stringify(repo.status())}` }),
      onRequest: (req, client) => {
        if (held) return undefined; // 두 번째 요청부터는 기본 처리(decline)
        held = { req, client, at: Date.now() };
        const off = client.onNotification("thread/status/changed", (n) => notificationsDuringHold.push(`status:${JSON.stringify(n.params.status)}`));
        client.onNotification("turn/completed", () => notificationsDuringHold.push("turn/completed"));
        setTimeout(() => {
          off();
          client.respond(req.id, { decision: "decline" });
        }, TTL_MS);
        return "handled";
      },
    });
    const resolved = r.client.resolvedRequestIds();
    observations.hold = {
      ttlMs: TTL_MS,
      requestMethod: held?.req.method ?? null,
      heldForMs: held ? Date.now() - held.at : null,
      notificationsDuringHold,
      resolvedAfterDecline: held ? resolved.includes(held.req.id) : null,
      turnStatus: r.turnStatus,
      exitedDuringHold: r.client.exited,
      effect: r.effect,
    };
    await r.client.close();
    expect(held).toBeDefined();
    expect(resolved).toContain(held!.req.id);
    expect(["completed", "interrupted"]).toContain(r.turnStatus);
    expect(r.effect).toBe(false);
  }, TTL_MS + 5 * 60_000);

  it("(4) 관찰: 긴 턴에서 steer 추가 지시가 최종 출력에 반영되는가", async () => {
    const r = await runInstruction({
      label: "steer-reflect",
      instruction: "이 저장소의 파일(README.md, package.json, index.js)을 하나씩 읽고, 각 파일마다 내용을 세 문장으로 설명해 주세요. 파일은 수정하지 마세요.",
      sandboxPolicy: { type: "readOnly" },
      effect: () => ({ effect: false, evidence: "" }),
      steerAfterStart: "추가 지시: 최종 답변의 마지막 줄에 정확히 '[steered]' 라고 써 주세요.",
    });
    await r.client.close();
    observations.steerReflected = { reflected: /\[steered\]/.test(r.agentMessage ?? ""), tail: (r.agentMessage ?? "").slice(-120), turnStatus: r.turnStatus };
    expect(["completed", "interrupted", "failed"]).toContain(r.turnStatus);
  });
});
