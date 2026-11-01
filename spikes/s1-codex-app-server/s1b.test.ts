/**
 * S1b — Codex 제어·세션 스파이크 (MASTER Phase 00 Task S1b, S1a 통과 후)
 *
 * 1. turn/steer RPC: expectedTurnId 일치 → 수락(turnId 반환), 불일치 → 거부(-32600)
 * 2. turn/interrupt → turn/completed.turn.status === 'interrupted'
 * 3. thread/resume(새 프로세스) → 이전 아이템 재수신
 * 4. thread/fork{lastTurnId} → 새 thread id(≠ 원본), forkedFromId = 원본
 * 5. 유휴 스레드: stdio 재시작 후 thread/resume → 새 턴 알림 수신
 * 6. 실행 중 연결 종료(프로세스 kill) → 재접속 resume → 스레드 상태·중단된 턴 상태 관찰, 새 턴 가능
 * 7. thread/queue/add 가 experimentalApi 미설정 시 -32600 거부
 * 관찰(V14): Windows에서 proc.kill('SIGINT') 동작
 *
 * 각 테스트는 자기 스레드를 스스로 만든다(테스트 간 상태 공유 없음 — Codex S1b 리뷰 #6).
 */
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSampleRepo, type SampleRepo } from "../_shared/sampleRepo.js";
import { mask, sanitizeEvents } from "../_shared/mask.js";
import { AppServerClient, RpcError, type Turn } from "./client.js";

const LIVE = !!process.env.AGENT_STUDIO_LIVE;
const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/codex-0.166.0/", import.meta.url));
const RO = { approvalPolicy: "on-request" as const, sandboxPolicy: { type: "readOnly" as const } };
const LONG_TASK =
  "이 저장소의 파일(README.md, package.json, index.js)을 하나씩 읽고, 각 파일마다 내용을 세 문장으로 설명해 주세요. 파일은 수정하지 마세요.";

const observations: Record<string, unknown> = {};
const repos: SampleRepo[] = [];

function newRepo(): SampleRepo {
  const r = createSampleRepo("s1b-");
  repos.push(r);
  return r;
}

function saveFixture(name: string, client: AppServerClient) {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(join(FIXTURE_DIR, `s1b-${name}.jsonl`), mask(sanitizeEvents(client.recording()).map((e) => JSON.stringify(e)).join("\n") + "\n"));
}

/** 새 프로세스에서 스레드를 만들고 긴 턴을 시작한 뒤 첫 item/started까지 기다린다. */
async function startLongTurn(label: string, repo: SampleRepo) {
  const client = new AppServerClient({ label });
  await client.initialize();
  const { threadId } = await client.threadStart(repo.dir);
  // 알림 대기는 요청 전에 등록한다(빠른 알림 유실 방지 — 리뷰 #6)
  const started = client.waitForNotification("item/started", (n) => n.params.threadId === threadId, 60_000);
  const turn = await client.turnStart(threadId, [{ type: "text", text: LONG_TASK }], { ...RO, cwd: repo.dir });
  await started;
  return { client, threadId, turn };
}

/** 짧은 턴 1개를 완료한 유휴 스레드를 만든다(프로세스는 종료). */
async function makeIdleThread(label: string, repo: SampleRepo) {
  const client = new AppServerClient({ label });
  await client.initialize();
  const { threadId } = await client.threadStart(repo.dir);
  const turn = await client.turnStart(threadId, [{ type: "text", text: "한 단어로만 대답하세요: 안녕" }], { ...RO, cwd: repo.dir });
  const done = await client.waitForTurnCompleted(threadId, turn.id, 120_000);
  await client.close();
  return { threadId, turnId: turn.id, status: done.turn.status };
}

describe.skipIf(!LIVE)("S1b codex app-server steer/interrupt/resume/fork (LIVE)", () => {
  afterAll(() => {
    for (const r of repos) r.cleanup();
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(join(FIXTURE_DIR, "s1b-results.json"), mask(JSON.stringify(observations, null, 2)) + "\n");
  });

  it("steer RPC: expectedTurnId 일치 시 수락, 불일치 시 -32600; interrupt → interrupted", async () => {
    const repo = newRepo();
    const { client, threadId, turn } = await startLongTurn("s1b-steer", repo);
    try {
      let mismatchError: RpcError | undefined;
      try {
        await client.turnSteer(threadId, "turn-id-that-does-not-exist", "무시해도 되는 메시지");
      } catch (e) {
        mismatchError = e as RpcError;
      }
      expect(mismatchError).toBeInstanceOf(RpcError);
      expect(mismatchError?.code).toBe(-32600);
      observations.steerMismatch = { code: mismatchError?.code, message: mismatchError?.message };

      const steered = (await client.turnSteer(threadId, turn.id, "추가 지시: 설명 마지막에 '[steered]'라는 단어를 붙여 주세요.")) as { turnId: string };
      expect(steered.turnId).toBe(turn.id);
      observations.steerAccepted = steered;

      await client.turnInterrupt(threadId, turn.id);
      const done = await client.waitForTurnCompleted(threadId, turn.id, 60_000);
      expect(done.turn.status).toBe("interrupted");
      observations.interrupt = { status: done.turn.status, error: done.turn.error ?? null, itemsAtInterrupt: (done.turn.items as { type: string }[]).map((i) => i.type) };
      saveFixture("steer-interrupt", client);
    } finally {
      await client.close();
    }
  });

  it("resume(새 프로세스): 이전 턴·아이템 재수신; fork{lastTurnId}: 새 thread id + forkedFromId", async () => {
    const repo = newRepo();
    const idle = await makeIdleThread("s1b-idle-1", repo);
    const client = new AppServerClient({ label: "s1b-resume" });
    try {
      await client.initialize();
      const resumed = (await client.threadResume(idle.threadId)) as {
        thread: { id: string; status: unknown; historyMode?: string; turns?: Turn[] };
        initialTurnsPage: { data: Turn[]; nextCursor: string | null } | null;
        turnsBackwardsCursor: unknown;
        itemsBackwardsCursor: unknown;
      };
      expect(resumed.thread.id).toBe(idle.threadId);
      // 실측(0.166.0): 기본 resume은 `thread.turns`에 이전 턴·아이템을 담고 `initialTurnsPage`는 null
      const turns = resumed.thread.turns ?? resumed.initialTurnsPage?.data ?? [];
      const items = turns.flatMap((t) => t.items as { type: string }[]);
      expect(turns.map((t) => t.id)).toContain(idle.turnId);
      expect(items.map((i) => i.type)).toContain("userMessage");
      expect(items.map((i) => i.type)).toContain("agentMessage");
      observations.resume = {
        historyMode: resumed.thread.historyMode,
        hasThreadTurns: !!resumed.thread.turns,
        initialTurnsPage: resumed.initialTurnsPage,
        cursorTypes: [typeof resumed.turnsBackwardsCursor, typeof resumed.itemsBackwardsCursor],
        turnCount: turns.length,
        turnStatuses: turns.map((t) => t.status),
        itemTypes: items.map((i) => i.type),
        threadStatus: resumed.thread.status,
      };

      const forked = (await client.threadFork(idle.threadId, idle.turnId)) as { thread: { id: string; forkedFromId: string | null } };
      expect(forked.thread.id).not.toBe(idle.threadId);
      expect(forked.thread.forkedFromId).toBe(idle.threadId);
      observations.fork = { differentId: forked.thread.id !== idle.threadId, forkedFromMatches: forked.thread.forkedFromId === idle.threadId };
      saveFixture("resume-fork", client);
    } finally {
      await client.close();
    }
  });

  it("유휴 스레드: stdio 재시작 후 resume → 새 턴의 알림을 수신한다(V8 범위: 유휴 세션 재접속)", async () => {
    const repo = newRepo();
    const idle = await makeIdleThread("s1b-idle-2", repo);
    const client = new AppServerClient({ label: "s1b-restart" });
    try {
      await client.initialize();
      await client.threadResume(idle.threadId, { excludeTurns: true });
      const turn = await client.turnStart(idle.threadId, [{ type: "text", text: "방금 전 대화에서 내가 한 말을 그대로 한 줄로 인용해 주세요. 파일은 읽지 마세요." }], { ...RO, cwd: repo.dir });
      const done = await client.waitForTurnCompleted(idle.threadId, turn.id, 120_000);
      expect(done.turn.status).toBe("completed");
      const agentMsg = (done.turn.items as { type: string; text?: string }[]).find((i) => i.type === "agentMessage");
      observations.idleRestartResume = { status: done.turn.status, agentMessage: agentMsg?.text ?? null };
      saveFixture("restart-resume-idle", client);
    } finally {
      await client.close();
    }
  });

  it("실행 중 연결 종료 → 재접속: resume 가능, 중단된 턴 상태를 관찰하고 새 턴이 동작한다(V8 범위: 활성 턴 중 단절)", async () => {
    const repo = newRepo();
    const { client, threadId, turn } = await startLongTurn("s1b-active-kill", repo);
    const exit = await client.killAndWait("SIGTERM", 5000);
    observations.activeKill = { exit };

    const client2 = new AppServerClient({ label: "s1b-active-resume" });
    try {
      await client2.initialize();
      const resumed = (await client2.threadResume(threadId)) as { thread: { id: string; status: unknown; turns?: Turn[] } };
      expect(resumed.thread.id).toBe(threadId);
      const prev = (resumed.thread.turns ?? []).find((t) => t.id === turn.id);
      observations.activeResume = {
        threadStatus: resumed.thread.status,
        interruptedTurnFound: !!prev,
        interruptedTurnStatus: prev?.status ?? null,
        interruptedTurnItems: (prev?.items as { type: string }[] | undefined)?.map((i) => i.type) ?? null,
      };
      const turn2 = await client2.turnStart(threadId, [{ type: "text", text: "한 단어로만 대답하세요: 재접속" }], { ...RO, cwd: repo.dir });
      const done = await client2.waitForTurnCompleted(threadId, turn2.id, 120_000);
      expect(done.turn.status).toBe("completed");
      observations.activeResumeNewTurn = { status: done.turn.status };
      saveFixture("restart-resume-active", client2);
    } finally {
      await client2.close();
    }
  });

  it("thread/queue/add: experimentalApi 미설정 시 -32600 'requires experimentalApi capability'", async () => {
    const repo = newRepo();
    const client = new AppServerClient({ label: "s1b-queue" });
    try {
      await client.initialize();
      const { threadId } = await client.threadStart(repo.dir);
      let queueError: RpcError | undefined;
      try {
        await client.threadQueueAdd(threadId, "queued-1", "큐에 넣는 메시지");
      } catch (e) {
        queueError = e as RpcError;
      }
      expect(queueError).toBeInstanceOf(RpcError);
      expect(queueError?.code).toBe(-32600);
      expect(queueError?.message).toContain("requires experimentalApi capability");
      observations.queueAddWithoutOptIn = { code: queueError?.code, message: queueError?.message };
      saveFixture("queue-optin", client);
    } finally {
      await client.close();
    }
  });

  it("관찰(V14): Windows proc.kill('SIGINT') → 즉시 종료(signal=SIGINT, killed=true)", async () => {
    const client = new AppServerClient({ label: "s1b-sigint" });
    await client.initialize();
    const exit = await client.killAndWait("SIGINT", 5000);
    observations.sigint = { platform: process.platform, exit };
    expect(exit).not.toBeNull();
    if (process.platform === "win32") {
      expect(exit?.killed).toBe(true);
      expect(exit?.signal).toBe("SIGINT");
      expect(exit?.code).toBeNull();
    }
  });
});
