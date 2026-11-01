/**
 * S2 — Claude Agent SDK 왕복 스파이크 (MASTER Phase 00 Task S2)
 *
 * (a) streaming input + canUseTool deny → 파일 무변경; PreToolUse hook이 Read 포함 모든 도구 호출을 관찰
 * (b) permissionMode:'plan' → 쓰기 도구 미호출
 * (c) permissionMode:'acceptEdits' → canUseTool 없이 변경되는 도구 목록 기록(REQ-CAP-01·02 입력)
 * (d) interrupt() receipt
 * (e) listSessions(dir)에 방금 세션 포함 + forkSession(sessionId,{upToMessageId}) 실호출 1회(V16)
 * (f) mcpServers 지정(strictMcpConfig) 시 system/init.mcp_servers·tools에 사용자 MCP 노출 여부(V13)
 * (g) 인증 모드: system/init.apiKeySource 기록(API key env 유무)
 * 모든 실호출은 샘플 저장소 임시 복사본에서만. 녹화 → spikes/fixtures/claude-2.1.316/s2-<label>.jsonl
 */
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSampleRepo, type SampleRepo } from "../_shared/sampleRepo.js";
import { mask } from "../_shared/mask.js";
import { ClaudeRun, detectClaudeExecutable, forkSession, getSessionMessages, listSessions, projectSessionDir, WRITE_TOOLS } from "./run.js";

const LIVE = !!process.env.AGENT_STUDIO_LIVE;
const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/claude-2.1.316/", import.meta.url));
const observations: Record<string, unknown> = {};
const repos: SampleRepo[] = [];
const sessionDirsToRemove: string[] = [];
const PLANS_DIR = join(homedir(), ".claude", "plans");
/** plan 모드 테스트 전 스냅숏 — 테스트가 새로 만든 plan 파일만 삭제한다(리뷰 #8) */
let plansBefore = new Set<string>();
const planFilesToRemove: string[] = [];
function snapshotPlans() {
  plansBefore = new Set(existsSync(PLANS_DIR) ? readdirSync(PLANS_DIR) : []);
}
function newPlanFiles(): string[] {
  return (existsSync(PLANS_DIR) ? readdirSync(PLANS_DIR) : []).filter((f) => !plansBefore.has(f)).map((f) => join(PLANS_DIR, f));
}

function newRepo(label: string): SampleRepo {
  const r = createSampleRepo(`s2-${label}-`);
  repos.push(r);
  return r;
}

function saveFixture(name: string, run: ClaudeRun) {
  mkdirSync(FIXTURE_DIR, { recursive: true });
  writeFileSync(join(FIXTURE_DIR, `s2-${name}.jsonl`), mask(run.recording().map((e) => JSON.stringify(e)).join("\n") + "\n"));
}

const ADD_LINE = "먼저 README.md 파일을 읽고, 그 다음 README.md 끝에 'spike-s2' 한 줄을 추가해 주세요. 다른 파일은 건드리지 마세요. 작업이 끝나면 한 줄로 보고하세요.";

describe.skipIf(!LIVE)("S2 claude agent sdk round trip (LIVE)", () => {
  afterAll(() => {
    for (const r of repos) r.cleanup();
    // 임시 저장소용 세션 전사(~/.claude/projects/<encoded temp dir>/)는 스파이크 부산물이므로 제거한다
    for (const d of sessionDirsToRemove) if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    // plan 모드가 ~/.claude/plans/ 에 만든 계획 파일(스냅숏 이후 생긴 것만)도 스파이크 부산물이므로 제거한다(환경 불변)
    for (const f of planFilesToRemove) if (f.startsWith(PLANS_DIR) && existsSync(f)) rmSync(f, { force: true });
    observations.cleanup = { removedPlanFiles: planFilesToRemove.length, removedSessionDirs: sessionDirsToRemove.length, leftoverTempSessionDirs: existsSync(join(homedir(), ".claude", "projects")) ? readdirSync(join(homedir(), ".claude", "projects")).filter((d) => /Temp-s2-/.test(d)) : [] };
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(join(FIXTURE_DIR, "s2-results.json"), mask(JSON.stringify(observations, null, 2)) + "\n");
  });

  it("(a) canUseTool deny → 파일 무변경; PreToolUse가 Read 포함 모든 도구 호출을 관찰한다", async () => {
    const repo = newRepo("deny");
    const run = new ClaudeRun({ label: "deny", cwd: repo.dir, permissionMode: "default", persistSession: false });
    run.onCanUseTool((tool) => (WRITE_TOOLS.has(tool) ? { behavior: "deny", message: "spike: write denied" } : { behavior: "allow" }));
    try {
      await run.start(ADD_LINE);
      const result = await run.result();
      const askedTools = run.canUseToolCalls.map((c) => c.tool);
      const hookedTools = run.preToolUse.map((h) => h.tool_name);
      const toolUses = run.assistantToolUses();
      observations.deny = {
        executable: detectClaudeExecutable(),
        resultSubtype: result.subtype,
        askedTools,
        hookedTools,
        assistantToolUseNames: toolUses.map((t) => t.name),
        permissionDenials: (result as { permission_denials?: unknown }).permission_denials ?? null,
        status: repo.status(),
      };
      expect(askedTools.some((t) => WRITE_TOOLS.has(t))).toBe(true);
      expect(repo.status()).toEqual([]);
      expect(hookedTools).toContain("Read");
      // 리뷰 #2: 거부 결과가 result.permission_denials 에 기록된다
      const denials = ((result as { permission_denials?: { tool_name: string }[] }).permission_denials ?? []).map((d) => d.tool_name);
      expect(denials).toEqual(["Edit"]);
      // 리뷰 #3: PreToolUse 관찰 = 모델이 요청한 tool_use 와 **양방향 다중집합** 일치(주 스레드 내장 도구 범위)
      const hookedIds = run.preToolUse.map((h) => h.tool_use_id).sort();
      const requestedIds = toolUses.map((t) => t.id).sort();
      (observations.deny as Record<string, unknown>).hookedIds = hookedIds;
      (observations.deny as Record<string, unknown>).requestedIds = requestedIds;
      expect(hookedIds).toEqual(requestedIds);
    } finally {
      await run.close();
      saveFixture("deny", run);
    }
  });

  it("(b0) permissionMode:'plan' 원 조건(ExitPlanMode allow): 쓰기 도구 미호출이 성립하는지 기록한다(리뷰 #1 — 녹화 보존)", async () => {
    const repo = newRepo("plan-exit-allowed");
    snapshotPlans();
    const run = new ClaudeRun({ label: "plan-exit-allowed", cwd: repo.dir, permissionMode: "plan", persistSession: false });
    run.onCanUseTool(() => ({ behavior: "allow" }));
    try {
      await run.start(ADD_LINE);
      const result = await run.result();
      const writesInCwd = run.preToolUse.filter((h) => WRITE_TOOLS.has(h.tool_name) && String((h.tool_input as { file_path?: string })?.file_path ?? "").startsWith(repo.dir));
      const seq = run.preToolUse.map((h) => h.tool_name);
      planFilesToRemove.push(...newPlanFiles());
      observations.planExitAllowed = {
        resultSubtype: result.subtype,
        toolSequence: seq,
        askedTools: run.canUseToolCalls.map((c) => `${c.tool}:${c.decision}`),
        exitPlanModeIndex: seq.indexOf("ExitPlanMode"),
        writesInCwdAfterExit: writesInCwd.map((h) => h.tool_name),
        status: repo.status(),
        originalConditionHolds: writesInCwd.length === 0 && repo.status().length === 0,
      };
      expect(typeof (observations.planExitAllowed as { originalConditionHolds: boolean }).originalConditionHolds).toBe("boolean");
    } finally {
      await run.close();
      saveFixture("plan-exit-allowed", run);
    }
  });

  it("(b) permissionMode:'plan' → 앱이 ExitPlanMode를 거부하는 한 cwd 안 쓰기 도구가 실행되지 않는다(plan 파일 쓰기는 기록)", async () => {
    const repo = newRepo("plan");
    snapshotPlans();
    const run = new ClaudeRun({ label: "plan", cwd: repo.dir, permissionMode: "plan", persistSession: false });
    // 1차 실측: ExitPlanMode를 allow 하면 "User has approved your plan" 후 plan 모드를 벗어나 Edit이 실행됐다(README 변경).
    // plan 모드는 앱이 ExitPlanMode를 canUseTool에서 거부해야만 유지되는 "정책"이다 → 여기서는 거부하고 그 상태의 쓰기 도구 동작을 단언한다.
    run.onCanUseTool((tool) => (tool === "ExitPlanMode" ? { behavior: "deny", message: "spike: stay in plan mode" } : { behavior: "allow" }));
    try {
      await run.start(ADD_LINE);
      const result = await run.result();
      const hookedTools = run.preToolUse.map((h) => h.tool_name);
      const writesInCwd = run.preToolUse.filter((h) => WRITE_TOOLS.has(h.tool_name) && typeof (h.tool_input as { file_path?: string })?.file_path === "string" && (h.tool_input as { file_path: string }).file_path.startsWith(repo.dir));
      const planFileWrites = run.preToolUse.filter((h) => h.tool_name === "Write" && /[\\/]\.claude[\\/]plans[\\/]/.test(String((h.tool_input as { file_path?: string })?.file_path ?? "")));
      planFilesToRemove.push(...newPlanFiles());
      observations.plan = {
        resultSubtype: result.subtype,
        hookedTools,
        askedTools: run.canUseToolCalls.map((c) => `${c.tool}:${c.decision}`),
        planFileWritesWithoutCanUseTool: planFileWrites.length - run.canUseToolCalls.filter((c) => c.tool === "Write").length,
        planFileWriteCount: planFileWrites.length,
        shellCommandsHooked: run.preToolUse.filter((h) => h.tool_name === "Bash" || h.tool_name === "PowerShell").map((h) => String((h.tool_input as { command?: string })?.command ?? "").slice(0, 80)),
        status: repo.status(),
        finalText: run.finalText()?.slice(0, 300) ?? null,
      };
      expect(repo.status()).toEqual([]);
      expect(writesInCwd.filter((h) => h.tool_name !== "Bash" && h.tool_name !== "PowerShell")).toEqual([]);
    } finally {
      await run.close();
      saveFixture("plan", run);
    }
  });

  it("(c) permissionMode:'acceptEdits' → canUseTool 없이 변경되는 도구 목록을 기록한다", async () => {
    const repo = newRepo("accept-edits");
    const run = new ClaudeRun({ label: "accept-edits", cwd: repo.dir, permissionMode: "acceptEdits", persistSession: false });
    run.onCanUseTool((tool) => ({ behavior: "allow", _spikeNote: `asked:${tool}` }) as never);
    try {
      await run.start(ADD_LINE);
      const result = await run.result();
      const asked = new Set(run.canUseToolCalls.map((c) => c.tool));
      const hooked = run.preToolUse.map((h) => h.tool_name);
      const bypassed = [...new Set(hooked.filter((t) => !asked.has(t)))];
      const writeToolsWithoutCanUseTool = bypassed.filter((t) => WRITE_TOOLS.has(t));
      observations.acceptEdits = {
        resultSubtype: result.subtype,
        hookedTools: hooked,
        askedTools: [...asked],
        toolsWithoutCanUseTool: bypassed,
        writeToolsWithoutCanUseTool,
        unverifiedWriteTools: [...WRITE_TOOLS].filter((t) => !hooked.includes(t)),
        status: repo.status(),
      };
      expect(result.subtype).toBe("success");
      // 리뷰 #2·#4: Edit 이 canUseTool 없이 실행되어 README 가 바뀌었다(REQ-CAP-02 입력). Write·셸은 호출되지 않아 미검증으로 기록
      expect(writeToolsWithoutCanUseTool).toContain("Edit");
      expect(repo.status()).toEqual([" M README.md"]);
    } finally {
      await run.close();
      saveFixture("accept-edits", run);
    }
  });

  it("(d) interrupt() → receipt를 받고 결과 메시지가 도착한다", async () => {
    const repo = newRepo("interrupt");
    const run = new ClaudeRun({ label: "interrupt", cwd: repo.dir, permissionMode: "default", persistSession: false });
    run.onCanUseTool(() => ({ behavior: "allow" }));
    try {
      await run.start("이 저장소의 파일(README.md, package.json, index.js)을 하나씩 읽고, 각 파일마다 내용을 다섯 문장으로 설명해 주세요. 파일은 수정하지 마세요.");
      await run.waitFor((m) => m.type === "assistant", 120_000);
      const t0 = Date.now();
      const receipt = await run.interrupt();
      const result = await run.result();
      observations.interrupt = { receipt: receipt ?? null, interruptMs: Date.now() - t0, resultSubtype: result.subtype, isError: result.is_error, numTurns: result.num_turns, messagesAfterInterrupt: run.recording().filter((e) => e.t >= t0).map((e) => (e.msg as { type: string }).type) };
      // 리뷰 #2: AC-P00-3 interrupt 성공 = receipt 수신 + 턴이 오류 결과로 종료(중단)
      expect(receipt).toBeDefined();
      expect(Array.isArray(receipt?.still_queued)).toBe(true);
      expect(result.is_error).toBe(true);
      expect(result.subtype).toBe("error_during_execution");
    } finally {
      await run.close();
      saveFixture("interrupt", run);
    }
  });

  it("(e) listSessions(dir)에 방금 세션이 포함되고 forkSession(sessionId,{upToMessageId})가 동작한다(V16)", async () => {
    const repo = newRepo("sessions");
    sessionDirsToRemove.push(projectSessionDir(repo.dir));
    const run = new ClaudeRun({ label: "sessions", cwd: repo.dir, permissionMode: "default", persistSession: true, maxTurns: 2 });
    run.onCanUseTool(() => ({ behavior: "allow" }));
    try {
      await run.start("한 단어로만 대답하세요: 안녕");
      const result = await run.result();
      const sessionId = result.session_id;
      // 2턴째를 보내 분기 경계(upToMessageId = 1턴째 assistant)를 검증할 수 있게 한다(리뷰 #5)
      run.send("한 단어로만 대답하세요: 두번째");
      const result2 = await run.nthResult(2, 120_000);
      const sessions = await listSessions({ dir: repo.dir });
      const firstAssistant = run.recording().map((e) => e.msg).find((m) => (m as { type: string }).type === "assistant") as { uuid?: string } | undefined;
      const forked = await forkSession(sessionId, { dir: repo.dir, upToMessageId: firstAssistant?.uuid });
      const originalMsgs = await getSessionMessages(sessionId, { dir: repo.dir });
      const forkedMsgs = await getSessionMessages(forked.sessionId, { dir: repo.dir });
      const text = (m: { message: unknown }) => {
        const c = (m.message as { content?: unknown }).content;
        return typeof c === "string" ? c : JSON.stringify(c ?? "").slice(0, 60);
      };
      observations.sessions = {
        projectDir: projectSessionDir(repo.dir),
        listed: sessions.map((s) => ({ sessionId: s.sessionId, summary: s.summary?.slice(0, 60) })),
        containsCurrent: sessions.some((s) => s.sessionId === sessionId),
        secondTurn: result2.subtype,
        forkedIsNew: forked.sessionId !== sessionId,
        forkedListed: (await listSessions({ dir: repo.dir })).some((s) => s.sessionId === forked.sessionId),
        originalMessages: originalMsgs.map((m) => `${m.type}:${text(m)}`),
        forkedMessages: forkedMsgs.map((m) => `${m.type}:${text(m)}`),
      };
      expect(sessions.some((s) => s.sessionId === sessionId)).toBe(true);
      expect(forked.sessionId).not.toBe(sessionId);
      // 분기 경계: 분기본은 1턴째까지만 담고(2턴째 "두번째" 없음), 원본은 2턴 모두 담는다
      expect(originalMsgs.length).toBeGreaterThan(forkedMsgs.length);
      expect(forkedMsgs.length).toBeGreaterThanOrEqual(2);
      expect(forkedMsgs.some((m) => text(m).includes("두번째"))).toBe(false);
      expect(originalMsgs.some((m) => text(m).includes("두번째"))).toBe(true);
    } finally {
      await run.close();
      saveFixture("sessions", run);
    }
  });

  it("(f) mcpServers:{} + strictMcpConfig → system/init의 사용자 MCP 노출 여부를 기록한다(V13)", async () => {
    const repo = newRepo("mcp");
    const strict = new ClaudeRun({ label: "mcp-strict", cwd: repo.dir, permissionMode: "default", persistSession: false, maxTurns: 1, mcpServers: {}, strictMcpConfig: true });
    const loose = new ClaudeRun({ label: "mcp-default", cwd: repo.dir, permissionMode: "default", persistSession: false, maxTurns: 1 });
    try {
      await strict.start("한 단어로만 대답하세요: ok");
      await strict.result();
      await loose.start("한 단어로만 대답하세요: ok");
      await loose.result();
      const summarize = (r: ClaudeRun) => {
        const init = r.init();
        return { mcpServers: init?.mcp_servers ?? null, mcpTools: (init?.tools ?? []).filter((t) => t.startsWith("mcp__")), toolCount: init?.tools.length ?? 0, plugins: init?.plugins?.map((p) => p.name) ?? null, skills: init?.skills?.length ?? null };
      };
      observations.mcp = { strict: summarize(strict), default: summarize(loose) };
      expect(strict.init()).toBeDefined();
      expect(loose.init()).toBeDefined();
      // 리뷰 #2·#5: strict 실행은 MCP 서버 0개(단, 기본 실행의 서버가 모두 needs-auth/failed 라 "호출 가능한 MCP 배제"는 미검증 → 부분 해소)
      expect(strict.init()?.mcp_servers.length).toBe(0);
      expect((strict.init()?.tools ?? []).filter((t) => t.startsWith("mcp__"))).toEqual([]);
    } finally {
      await strict.close();
      await loose.close();
      saveFixture("mcp-strict", strict);
      saveFixture("mcp-default", loose);
    }
  });

  it("(g) 인증 모드: system/init.apiKeySource를 기록한다(API key env 없으면 CLI 로그인 재사용)", async () => {
    const repo = newRepo("auth");
    const run = new ClaudeRun({ label: "auth", cwd: repo.dir, permissionMode: "default", persistSession: false, maxTurns: 1 });
    try {
      await run.start("한 단어로만 대답하세요: ok");
      const result = await run.result();
      const init = run.init();
      observations.auth = { apiKeyEnvPresent: !!process.env.ANTHROPIC_API_KEY, apiKeySource: init?.apiKeySource ?? null, claudeCodeVersion: init?.claude_code_version ?? null, model: init?.model ?? null, resultSubtype: result.subtype, homeClaudeDirExists: existsSync(join(homedir(), ".claude")) };
      expect(init?.claude_code_version).toBe("2.1.316");
      expect(result.subtype).toBe("success");
      expect(typeof init?.apiKeySource).toBe("string"); // CLI 로그인 경로: "none" (API key env 없음). API key 경로는 미보유·미실측(S3 §2)
    } finally {
      await run.close();
      saveFixture("auth", run);
    }
  });
});
