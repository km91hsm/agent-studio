/**
 * S7 — 스킬 증거·자동 선택·충돌 실험 공용 러너(S2 ClaudeRun·S1 AppServerClient 재사용) + 관찰 정규화(시그니처 매칭 입력).
 * 모든 실호출은 sample-node-repo 임시 복사본에서만. 녹화는 호출 측이 저장한다.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { AppServerClient, type ServerRequest, type UserInput } from "../s1-codex-app-server/client.js";
import { ClaudeRun, type ClaudeRunOpts } from "../s2-claude-sdk/run.js";
import type { Observation } from "./evidence.js";

export const TEST_RUNNER_RE = /(npm|pnpm|yarn)\s+(run\s+)?test|node\s+--test|vitest|pytest|jest/;
export const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

/** 재현 가능한 버그 2종을 임시 저장소에 심는다(픽스처 자체는 바꾸지 않는다) */
export function writeBugScenario(dir: string): void {
  writeFileSync(
    join(dir, "calc.js"),
    [
      "// sum skips the first element (bug): sum([1,2,3]) returns 5, expected 6",
      "export function sum(nums) {",
      "  let total = 0;",
      "  for (let i = 1; i < nums.length; i++) total += nums[i];",
      "  return total;",
      "}",
      "",
      "export function average(nums) {",
      "  return sum(nums) / nums.length;",
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(dir, "stats.js"),
    [
      "export function median(nums) {",
      "  const s = [...nums].sort((a, b) => a - b);",
      "  const mid = Math.floor(s.length / 2);",
      "  return s[mid];",
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(dir, "README.md"),
    [
      "# sample-node-repo",
      "",
      "Tiny ESM project. Tests run with `npm test` (node --test).",
      "",
      "## Bug",
      "",
      "- `sum([1, 2, 3])` in calc.js returns 5 but must return 6.",
      "- `median([1, 2, 3, 4])` in stats.js returns 3 but must return 2.5 (mean of the two middle values).",
      "",
    ].join("\n"),
  );
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-q", "-m", "scenario: bugs"], { cwd: dir, stdio: "ignore" });
}

export function gitCommitAll(dir: string, message: string): string {
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["commit", "-q", "--allow-empty", "-m", message], { cwd: dir, stdio: "ignore" });
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
}

export function gitDiffStat(dir: string, from = "HEAD~1"): string {
  return execFileSync("git", ["diff", "--stat", `${from}..HEAD`], { cwd: dir, encoding: "utf8" }).trim();
}

export function runTests(dir: string): { exitCode: number; output: string } {
  try {
    const out = execFileSync("node", ["--test"], { cwd: dir, encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"] });
    return { exitCode: 0, output: out.slice(-400) };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { exitCode: err.status ?? 1, output: `${err.stdout ?? ""}${err.stderr ?? ""}`.slice(-400) };
  }
}

// ---------------- Claude ----------------

export interface ToolUse {
  seq: number;
  name: string;
  input: Record<string, unknown>;
  isError: boolean | null;
  resultText: string;
}

export interface ClaudeSummary {
  label: string;
  initSkills: string[];
  toolUses: ToolUse[];
  skillCalls: string[];
  finalText: string;
  resultSubtype: string;
  numTurns: number;
  durationMs: number;
  usage: unknown;
  costUsd: number | null;
  sessionId: string | undefined;
  recording: { t: number; msg: SDKMessage }[];
}

export async function runClaude(opts: Omit<ClaudeRunOpts, "permissionMode"> & { prompt: string; permissionMode?: ClaudeRunOpts["permissionMode"]; timeoutMs?: number }): Promise<ClaudeSummary> {
  const run = new ClaudeRun({ ...opts, permissionMode: opts.permissionMode ?? "acceptEdits", persistSession: opts.persistSession ?? false, maxTurns: opts.maxTurns ?? 60 });
  run.onCanUseTool(() => ({ behavior: "allow" }));
  const t0 = Date.now();
  try {
    await run.start(opts.prompt);
    const result = await run.nthResult(1, opts.timeoutMs ?? 10 * 60_000);
    const toolUses = claudeToolUses(run.recording());
    const r = result as { subtype: string; num_turns: number; usage?: unknown; total_cost_usd?: number };
    return {
      label: opts.label,
      initSkills: ((run.init() as { skills?: string[] } | undefined)?.skills ?? []).slice(),
      toolUses,
      skillCalls: toolUses.filter((t) => t.name === "Skill").map((t) => String(t.input.skill ?? "")),
      finalText: run.finalText() ?? "",
      resultSubtype: r.subtype,
      numTurns: r.num_turns,
      durationMs: Date.now() - t0,
      usage: r.usage ?? null,
      costUsd: r.total_cost_usd ?? null,
      sessionId: run.sessionId,
      recording: run.recording(),
    };
  } finally {
    await run.close();
  }
}

/** assistant.tool_use 블록을 user.tool_result 블록과 id로 연결해 순서대로 돌려준다 */
export function claudeToolUses(recording: { msg: SDKMessage }[]): ToolUse[] {
  const uses: ToolUse[] = [];
  const byId = new Map<string, ToolUse>();
  let seq = 0;
  for (const { msg } of recording) {
    if (msg.type === "assistant") {
      for (const b of msg.message.content as { type: string; id?: string; name?: string; input?: Record<string, unknown> }[]) {
        if (b.type === "tool_use" && b.id && b.name) {
          const u: ToolUse = { seq: ++seq, name: b.name, input: b.input ?? {}, isError: null, resultText: "" };
          uses.push(u);
          byId.set(b.id, u);
        }
      }
    } else if (msg.type === "user") {
      const content = (msg as { message?: { content?: unknown } }).message?.content;
      if (!Array.isArray(content)) continue;
      for (const b of content as { type: string; tool_use_id?: string; is_error?: boolean; content?: unknown }[]) {
        if (b.type !== "tool_result" || !b.tool_use_id) continue;
        const u = byId.get(b.tool_use_id);
        if (!u) continue;
        u.isError = !!b.is_error;
        u.resultText = typeof b.content === "string" ? b.content.slice(0, 20000) : JSON.stringify(b.content ?? "").slice(0, 20000);
      }
    }
  }
  return uses;
}

/**
 * 테스트 실행 결과 분류. 우선순위: 러너 요약 줄(node --test `ℹ fail N` / TAP `# fail N`) → 실패 표식(`not ok`, `✖`, `FAILED`, `N failed`) → 도구 오류 플래그 → pass.
 * (1차 LIVE 오판: 대소문자 무시 `FAIL`이 "ℹ fail 0"에 걸려 전부 fail 로 분류됐다)
 */
export function classifyTestRun(isError: boolean, resultText: string): "pass" | "fail" {
  const summary = /(?:ℹ|#)\s*fail\s+(\d+)/.exec(resultText);
  if (summary) return Number(summary[1]) > 0 ? "fail" : "pass";
  if (/\bnot ok\b|✖|\bFAILED\b|\b[1-9]\d* failed\b|\bfailing\b/.test(resultText)) return "fail";
  return isError ? "fail" : "pass";
}

export function observationsFromClaude(toolUses: ToolUse[], cwd: string): Observation[] {
  const obs: Observation[] = [];
  for (const u of toolUses) {
    if (u.name === "Skill") obs.push({ seq: u.seq, kind: "event", value: `skill_invoked:${String(u.input.skill ?? "")}` });
    else if (WRITE_TOOLS.has(u.name)) {
      const p = String(u.input.file_path ?? u.input.notebook_path ?? "");
      if (p) obs.push({ seq: u.seq, kind: "artifact", value: toRel(cwd, p) });
    } else if (u.name === "Bash" || u.name === "PowerShell") {
      const cmd = String(u.input.command ?? "");
      obs.push({ seq: u.seq, kind: "event", value: `command:${cmd.slice(0, 200)}` });
      if (TEST_RUNNER_RE.test(cmd)) obs.push({ seq: u.seq, kind: "event", value: `test_run:${classifyTestRun(u.isError === true, u.resultText)}` });
    }
  }
  return obs;
}

// ---------------- Codex ----------------

export interface CodexItem {
  seq: number;
  type: string;
  command?: string;
  exitCode?: number | null;
  status?: string;
  output?: string;
  paths?: string[];
  text?: string;
}

export interface CodexSummary {
  label: string;
  threadId: string;
  turnId: string;
  turnStatus: string;
  turnError: string | null;
  items: CodexItem[];
  finalText: string;
  serverRequests: { method: string; itemId?: string }[];
  durationMs: number;
  usage: unknown;
  recording: unknown[];
}

export interface CodexRunOpts {
  label: string;
  cwd: string;
  input: UserInput[];
  approvalPolicy?: "untrusted" | "on-request" | "never";
  timeoutMs?: number;
  client?: AppServerClient;
}

export async function runCodex(opts: CodexRunOpts): Promise<CodexSummary> {
  const client = opts.client ?? new AppServerClient({ label: opts.label, configOverrides: ["features.memories=false"] });
  const own = !opts.client;
  const items: CodexItem[] = [];
  const serverRequests: CodexSummary["serverRequests"] = [];
  let seq = 0;
  const t0 = Date.now();
  try {
    client.onServerRequest((req: ServerRequest) => {
      serverRequests.push({ method: req.method, itemId: (req.params as { itemId?: string }).itemId });
      if (req.method === "item/fileChange/requestApproval" || req.method === "item/commandExecution/requestApproval") client.respond(req.id, { decision: "accept" });
      else client.respondError(req.id, -32601, `spike does not handle ${req.method}`);
    });
    client.onNotification("item/completed", (n) => {
      const item = n.params.item as { type: string; command?: string; exitCode?: number | null; status?: string; aggregatedOutput?: string | null; changes?: { path?: string }[]; path?: string; text?: string; phase?: string };
      const rec: CodexItem = { seq: ++seq, type: item.type, status: item.status };
      if (item.type === "commandExecution") Object.assign(rec, { command: item.command ?? "", exitCode: item.exitCode ?? null, output: (item.aggregatedOutput ?? "").slice(0, 600) });
      else if (item.type === "fileChange") rec.paths = (item.changes ?? []).map((c) => c.path ?? "").filter(Boolean).concat(item.path ? [item.path] : []);
      else if (item.type === "agentMessage" && item.phase !== "commentary") rec.text = (item.text ?? "").slice(0, 4000);
      items.push(rec);
    });
    if (own) await client.initialize();
    const { threadId } = await client.threadStart(opts.cwd);
    const turn = await client.turnStart(threadId, opts.input, { approvalPolicy: opts.approvalPolicy ?? "never", sandboxPolicy: { type: "workspaceWrite", writableRoots: [opts.cwd] }, cwd: opts.cwd });
    const done = await client.waitForTurnCompleted(threadId, turn.id, opts.timeoutMs ?? 10 * 60_000);
    const agentMsgs = (done.turn.items as { type: string; text?: string; phase?: string }[]).filter((i) => i.type === "agentMessage" && i.phase !== "commentary");
    const lastFromItems = [...items].reverse().find((i) => i.type === "agentMessage" && i.text)?.text ?? "";
    return {
      label: opts.label,
      threadId,
      turnId: turn.id,
      turnStatus: done.turn.status,
      turnError: done.turn.error?.message ?? null,
      items,
      finalText: agentMsgs.length ? (agentMsgs[agentMsgs.length - 1].text ?? "") : lastFromItems,
      serverRequests,
      durationMs: Date.now() - t0,
      usage: client.tokenUsage(threadId).total,
      recording: client.recording(),
    };
  } finally {
    if (own) await client.close();
  }
}

export function observationsFromCodex(items: CodexItem[], cwd: string, skillNames: readonly string[]): Observation[] {
  const obs: Observation[] = [];
  for (const it of items) {
    if (it.type === "commandExecution") {
      const cmd = it.command ?? "";
      for (const s of skillNames) if (new RegExp(`skills[\\\\/]+${s}[\\\\/]+SKILL\\.md`).test(cmd)) obs.push({ seq: it.seq, kind: "event", value: `skill_invoked:${s}` });
      obs.push({ seq: it.seq, kind: "event", value: `command:${cmd.slice(0, 200)}` });
      if (TEST_RUNNER_RE.test(cmd)) obs.push({ seq: it.seq, kind: "event", value: `test_run:${it.exitCode === 0 ? "pass" : "fail"}` });
    } else if (it.type === "fileChange") {
      for (const p of it.paths ?? []) obs.push({ seq: it.seq, kind: "artifact", value: toRel(cwd, p) });
    }
  }
  return obs;
}

export function toRel(cwd: string, p: string): string {
  const r = relative(cwd, p);
  const out = r && !r.startsWith("..") ? r : p;
  return out.split(sep).join("/");
}

/** skills/list 응답에서 이름 목록과 특정 스킬의 path를 뽑는다(응답 구조는 실측 — 알려진 후보 필드를 모두 훑는다) */
export function parseSkillsList(raw: unknown): { names: string[]; byName: Map<string, { path: string; enabled: unknown }> } {
  const found: { name: string; path: string; enabled: unknown }[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== "object") return;
    const o = v as Record<string, unknown>;
    if (typeof o.name === "string" && typeof o.path === "string") found.push({ name: o.name, path: o.path, enabled: o.enabled });
    for (const k of Object.keys(o)) visit(o[k]);
  };
  visit(raw);
  const byName = new Map<string, { path: string; enabled: unknown }>();
  for (const f of found) if (!byName.has(f.name)) byName.set(f.name, { path: f.path, enabled: f.enabled });
  return { names: [...byName.keys()], byName };
}
