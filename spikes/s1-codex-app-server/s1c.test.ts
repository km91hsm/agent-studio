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
  commandItems: { command: string; exitCode: number | null; status?: string; output?: string }[];
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

async function runInstruction(o: RunOpts): Promise<Row & { repo: SampleRepo; client: AppServerClient; turn: Turn; threadId: string; requestIds: (number | string)[] }> {
  const repo = createSampleRepo(`s1c-${o.label}-`);
  repos.push(repo);
  const client = new AppServerClient({ label: `s1c-${o.label}` });
  const approvalRequests: Row["approvalRequests"] = [];
  const commandItems: Row["commandItems"] = [];
  const requestIds: (number | string)[] = [];
  client.onServerRequest((req) => {
    const p = req.params as { kind?: string; reason?: string | null; command?: string | null };
    requestIds.push(req.id);
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
    if (item.type === "commandExecution") commandItems.push({ command: item.command ?? "", exitCode: item.exitCode ?? null, status: item.status, output: ((item as { aggregatedOutput?: string | null }).aggregatedOutput ?? "").slice(0, 300) });
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
  return { ...row, repo, client, turn: done.turn, threadId, requestIds };
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
    // 리뷰 #1: 승인된 경로가 없으므로(모두 decline) README 변경은 사후 감사에서 unapproved_write 로 잡혀야 한다
    const audit1 = auditUnapprovedWrites(r1.repo.status(), new Set());
    observations.auditFileWrite = audit1;
    expect(audit1.map((a) => [a.path, a.verdict])).toEqual([["README.md", "unapproved_write"]]);
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
        const staged = git(repo.dir, "diff", "--cached", "--name-only").split(/\r?\n/).filter(Boolean);
        const fileChanged = repo.status().some((l) => l.endsWith("README.md"));
        return { effect: count > 1, evidence: `fileChanged=${fileChanged} staged=${JSON.stringify(staged)} committed=${count > 1} (commit count ${count}, log: ${git(repo.dir, "log", "--oneline", "-3").replace(/\n/g, " | ")})` };
      },
    });
    // 리뷰 #5: 효과를 파일 변경 / 스테이징 / 커밋으로 분리해 기록하고, README 변경은 감사에서 unapproved_write
    observations.gitCommitEffects = {
      fileChanged: r3.repo.status().some((l) => l.endsWith("README.md")),
      staged: git(r3.repo.dir, "diff", "--cached", "--name-only").split(/\r?\n/).filter(Boolean),
      committed: Number(git(r3.repo.dir, "rev-list", "--count", "HEAD")) > 1,
      gitAddOutputs: r3.commandItems.filter((c) => /git add/.test(c.command)).map((c) => ({ status: c.status, exitCode: c.exitCode, output: c.output })),
      audit: auditUnapprovedWrites(r3.repo.status(), new Set()),
    };
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

    expect(rows.map((r) => r.instruction)).toEqual(["file-write", "shell-command", "git-commit", "network", "outside-path"]);
    for (const row of rows) {
      expect(["approval_requested", "no_request"]).toContain(row.verdict);
      expect(typeof row.effect).toBe("boolean");
      expect(["completed", "interrupted", "failed"]).toContain(row.turnStatus);
      expect(row.effectEvidence.length).toBeGreaterThan(0);
    }
    // 리뷰 #4: 승인 요청은 모두 응답(decline)되어 서버 측 resolved 와 짝지어졌다
    for (const r of [r1, r2, r3, r4, r5]) {
      const requested = r.requestIds;
      const resolved = r.client.resolvedRequestIds();
      for (const id of requested) expect(resolved).toContain(id);
      expect(r.approvalRequests.length).toBe(requested.length);
    }
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
    // 리뷰 #4: V30 결론을 단언으로 — 읽기 명령(git log, Get-Content)은 승인 없이 완료, 쓰기 명령(Add-Content)은 승인 요청 후 거절
    const readCmds = r.commandItems.filter((c) => /git log|Get-Content/.test(c.command));
    const writeCmds = r.commandItems.filter((c) => /Add-Content|Set-Content|Out-File/.test(c.command));
    expect(readCmds.length).toBeGreaterThanOrEqual(1);
    for (const c of readCmds) expect(c.status).toBe("completed");
    expect(writeCmds.some((c) => c.status === "declined")).toBe(true);
    expect(r.approvalRequests.length).toBeGreaterThanOrEqual(1);
    // 3차 실측: 모델이 먼저 apply_patch 를 시도해 item/fileChange/requestApproval 이 올 수 있다(기록) — 명령 승인 요청만 쓰기 명령과 대조
    for (const a of r.approvalRequests.filter((x) => x.method === "item/commandExecution/requestApproval")) expect(a.command ?? "").toMatch(/Add-Content|Set-Content|Out-File/);
    expect(r.approvalRequests.some((x) => x.method === "item/commandExecution/requestApproval")).toBe(true);
  });

  it(`(3) 승인 요청 보류 ${TTL_MS}ms 후 decline 응답이 여전히 수락된다`, async () => {
    let held: { req: ServerRequest; client: AppServerClient; at: number; declinedAt?: number } | undefined;
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
          held!.declinedAt = Date.now();
          client.respond(req.id, { decision: "decline" });
        }, TTL_MS);
        return "handled";
      },
    });
    const resolved = r.client.resolvedRequestIds();
    // 리뷰 #6: 보류 구간(요청 수신~decline 전송)에 수신된 모든 알림 메서드를 녹화에서 집계
    const rec = r.client.recording() as { t: number; dir: string; msg: { method?: string } }[];
    const allDuringHold = held ? rec.filter((e) => e.dir === "in" && e.t > held!.at && e.t < (held!.declinedAt ?? Infinity) && e.msg.method).map((e) => e.msg.method as string) : [];
    const turnOrStatusDuringHold = allDuringHold.filter((m) => /^(turn\/|thread\/status|item\/|thread\/tokenUsage)/.test(m));
    observations.hold = {
      ttlMs: TTL_MS,
      requestMethod: held?.req.method ?? null,
      heldForMs: held?.declinedAt ? held.declinedAt - held.at : null,
      requestToTurnCompletedMs: held ? Date.now() - held.at : null,
      notificationsDuringHold,
      allNotificationsDuringHold: allDuringHold,
      turnOrStatusNotificationsDuringHold: turnOrStatusDuringHold,
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
    expect(turnOrStatusDuringHold).toEqual([]); // 보류 중 턴·상태·아이템 알림 없음(V11 범위)
    expect((observations.hold as { exitedDuringHold: unknown }).exitedDuringHold).toBeNull(); // 보류 중 연결 끊김 없음(close 전 캡처값)
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
    const reflected = /\[steered\]/.test(r.agentMessage ?? "");
    observations.steerReflected = { reflected, tail: (r.agentMessage ?? "").slice(-120), turnStatus: r.turnStatus };
    expect(r.turnStatus).toBe("completed");
    expect(reflected).toBe(true); // 리뷰 #4: 관찰값을 단언으로(1회 실측 기준)
  });
});
