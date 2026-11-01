/**
 * S1b — Codex 제어·세션 스파이크 (MASTER Phase 00 Task S1b, S1a 통과 후)
 *
 * 1. turn/steer: expectedTurnId 일치 → 수락(turnId 반환), 불일치 → 거부(오류 코드 기록)
 * 2. turn/interrupt → turn/completed.turn.status === 'interrupted'
 * 3. thread/resume → 이전 아이템(userMessage·agentMessage) 재수신
 * 4. thread/fork{lastTurnId} → 새 thread id(≠ 원본), forkedFromId = 원본
 * 5. stdio 재시작 후 thread/resume 재구독 → 새 턴 알림 수신
 * 6. thread/queue/add 가 experimentalApi 미설정 시 거부됨(오류 코드 기록)
 * 관찰(V14): Windows에서 proc.kill('SIGINT') 동작
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
const TMP_DIR = fileURLToPath(new URL("./.tmp/", import.meta.url));
const RO = { approvalPolicy: "on-request" as const, sandboxPolicy: { type: "readOnly" as const } };
const LONG_TASK =
  "이 저장소의 파일(README.md, package.json, index.js)을 하나씩 읽고, 각 파일마다 내용을 세 문장으로 설명해 주세요. 파일은 수정하지 마세요.";

const observations: Record<string, unknown> = {};
let repo: SampleRepo | undefined;

function saveFixture(name: string, client: AppServerClient) {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(join(FIXTURE_DIR, `s1b-${name}.jsonl`), mask(sanitizeEvents(client.recording()).map((e) => JSON.stringify(e)).join("\n") + "\n"));
}

describe.skipIf(!LIVE)("S1b codex app-server steer/interrupt/resume/fork (LIVE)", () => {
  afterAll(() => {
    repo?.cleanup();
    mkdirSync(TMP_DIR, { recursive: true });
    writeFileSync(join(TMP_DIR, "s1b-results.json"), mask(JSON.stringify(observations, null, 2)));
  });

  it("steer: expectedTurnId 일치 시 수락, 불일치 시 거부; interrupt → interrupted", async () => {
    repo = createSampleRepo("s1b-");
    const client = new AppServerClient({ label: "s1b-steer" });
    try {
      await client.initialize();
      const { threadId } = await client.threadStart(repo.dir);
      const turn = await client.turnStart(threadId, [{ type: "text", text: LONG_TASK }], { ...RO, cwd: repo.dir });
      await client.waitForNotification("item/started", (n) => n.params.threadId === threadId, 60_000);

      // 불일치 → 거부
      let mismatchError: RpcError | undefined;
      try {
        await client.turnSteer(threadId, "turn-id-that-does-not-exist", "무시해도 되는 메시지");
      } catch (e) {
        mismatchError = e as RpcError;
      }
      expect(mismatchError).toBeInstanceOf(RpcError);
      observations.steerMismatch = { code: mismatchError?.code, message: mismatchError?.message };

      // 일치 → 수락
      const steered = (await client.turnSteer(threadId, turn.id, "추가 지시: 설명 마지막에 '[steered]'라는 단어를 붙여 주세요.")) as { turnId: string };
      expect(steered.turnId).toBe(turn.id);
      observations.steerAccepted = steered;

      // interrupt → interrupted
      await client.turnInterrupt(threadId, turn.id);
      const done = await client.waitForTurnCompleted(threadId, turn.id, 60_000);
      expect(done.turn.status).toBe("interrupted");
      observations.interrupt = { status: done.turn.status, error: done.turn.error ?? null };
      observations.threadId = threadId;
      observations.turn1Id = turn.id;
      saveFixture("steer-interrupt", client);
    } finally {
      await client.close();
    }
  });

  it("resume(새 프로세스): 이전 아이템 재수신; fork{lastTurnId}: 새 thread id; queue/add: opt-in 없이 거부", async () => {
    const threadId = observations.threadId as string;
    const client = new AppServerClient({ label: "s1b-resume" });
    try {
      await client.initialize();
      const resumed = (await client.threadResume(threadId)) as {
        thread: { id: string; status: unknown; historyMode?: string; turns?: Turn[] };
        initialTurnsPage: { data: Turn[]; nextCursor: string | null } | null;
      };
      expect(resumed.thread.id).toBe(threadId);
      // 실측(0.166.0): 기본 resume은 `thread.turns`에 이전 턴·아이템을 담고 `initialTurnsPage`는 null
      const turns = resumed.thread.turns ?? resumed.initialTurnsPage?.data ?? [];
      observations.resumeShape = { historyMode: resumed.thread.historyMode, hasThreadTurns: !!resumed.thread.turns, initialTurnsPage: resumed.initialTurnsPage };
      const items = turns.flatMap((t) => t.items as { type: string }[]);
      expect(items.map((i) => i.type)).toContain("userMessage");
      observations.resumeItemTypes = items.map((i) => i.type);
      observations.resumeTurnCount = turns.length;
      observations.resumeTurnStatuses = turns.map((t) => t.status);

      const forked = (await client.threadFork(threadId, observations.turn1Id as string)) as { thread: { id: string; forkedFromId: string | null } };
      expect(forked.thread.id).not.toBe(threadId);
      expect(forked.thread.forkedFromId).toBe(threadId);
      observations.fork = { newThreadId: forked.thread.id, forkedFromId: forked.thread.forkedFromId };

      let queueError: RpcError | undefined;
      try {
        await client.threadQueueAdd(threadId, "queued-1", "큐에 넣는 메시지");
      } catch (e) {
        queueError = e as RpcError;
      }
      expect(queueError).toBeInstanceOf(RpcError);
      observations.queueAddWithoutOptIn = { code: queueError?.code, message: queueError?.message };
      saveFixture("resume-fork-queue", client);
    } finally {
      await client.close();
    }
  });

  it("stdio 재시작 후 resume 재구독: 새 턴의 알림을 수신한다", async () => {
    const threadId = observations.threadId as string;
    const client = new AppServerClient({ label: "s1b-restart" });
    try {
      await client.initialize();
      await client.threadResume(threadId, { excludeTurns: true });
      const turn = await client.turnStart(threadId, [{ type: "text", text: "방금 전 대화에서 내가 요청한 작업을 한 문장으로 요약해 주세요. 파일은 읽지 마세요." }], {
        ...RO,
        cwd: repo!.dir,
      });
      const done = await client.waitForTurnCompleted(threadId, turn.id, 120_000);
      expect(["completed", "interrupted"]).toContain(done.turn.status);
      const agentMsg = (done.turn.items as { type: string; text?: string }[]).find((i) => i.type === "agentMessage");
      observations.restartResume = { status: done.turn.status, agentMessage: agentMsg?.text ?? null, pid: client.pid };
      saveFixture("restart-resume", client);
    } finally {
      await client.close();
    }
  });

  it("관찰(V14): Windows proc.kill('SIGINT') 결과를 기록한다", async () => {
    const client = new AppServerClient({ label: "s1b-sigint" });
    await client.initialize();
    const exit = await client.killAndWait("SIGINT", 5000);
    observations.sigint = { platform: process.platform, exit };
    expect(exit).not.toBeNull();
  });
});
