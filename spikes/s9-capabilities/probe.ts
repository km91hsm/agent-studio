/**
 * S9 — 기능 상속 탐침 (REQ-CAP-01~09 × {claude, codex}) — MASTER Task S9, AGENT_INTEGRATION §7, PRODUCT §13A, V31, R18.
 * 산출: `CapabilityProbeResult[]`(18행) — 각 행은 status(supported/conditional/unsupported) + reached(발견→기동→실행→산출물 4단계 중 도달점) + evidence.
 * 원칙: 사용자 CODEX_HOME 은 읽기 전용(`-c` 오버라이드·임시 CODEX_HOME 만), 실호출은 임시 샘플 저장소에서만, 승인 요청은 **전부 거부**(Codex 리뷰 #6 — 경로 추출 기반 자동 허용은 보장이 아님),
 *       computer-use 는 캡처·입력을 **금지**한 상태로 기동만 시도한다. 결과 값(status)은 테스트가 단언하지 않는다 — S9 는 결정 게이트 입력이다.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AppServerClient, type ApprovalPolicy, type SandboxPolicy, type ServerRequest, type UserInput } from "../s1-codex-app-server/client.js";
import { ClaudeRun, type ClaudeRunOpts } from "../s2-claude-sdk/run.js";
import { createSampleRepo } from "../_shared/sampleRepo.js";
import { mask, truncateErrorBody } from "../_shared/mask.js";

export const CAPS = ["CAP-01", "CAP-02", "CAP-03", "CAP-04", "CAP-05", "CAP-06", "CAP-07", "CAP-08", "CAP-09"] as const;
export const AGENTS = ["claude", "codex"] as const;
export type Cap = (typeof CAPS)[number];
export type Agent = (typeof AGENTS)[number];
export const STATUSES = ["supported", "conditional", "unsupported"] as const;
export const REACHED = ["discovered", "started", "executed", "artifact"] as const;
export type Status = (typeof STATUSES)[number];
export type Reached = (typeof REACHED)[number];

export interface CapabilityProbeResult {
  cap: Cap;
  agent: Agent;
  status: Status;
  reached: Reached;
  condition?: string;
  evidence: string;
}

/** 결과 계약 검증(CI): 빈 배열, 필드 누락·잘못된 값, conditional 의 condition 누락, 중복, 빠진 (cap, agent) 조합 */
export function validateResults(results: CapabilityProbeResult[]): string[] {
  if (!Array.isArray(results) || results.length === 0) return ["results: empty"];
  const errors: string[] = [];
  const seen = new Map<string, number>();
  for (const r of results) {
    const id = `${r.cap}/${r.agent}`;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    if (!(CAPS as readonly string[]).includes(r.cap)) errors.push(`${id}: cap '${r.cap}' not in ${CAPS.join("|")}`);
    if (!(AGENTS as readonly string[]).includes(r.agent)) errors.push(`${id}: agent '${r.agent}' not in ${AGENTS.join("|")}`);
    if (!(STATUSES as readonly string[]).includes(r.status)) errors.push(`${id}: status '${r.status}' not in ${STATUSES.join("|")}`);
    if (!(REACHED as readonly string[]).includes(r.reached)) errors.push(`${id}: reached '${r.reached}' not in ${REACHED.join("|")}`);
    if (typeof r.evidence !== "string" || r.evidence.trim() === "") errors.push(`${id}: evidence empty`);
    if (r.status === "conditional" && (typeof r.condition !== "string" || r.condition.trim() === "")) errors.push(`${id}: conditional requires condition`);
  }
  for (const [id, n] of seen) if (n > 1) errors.push(`${id}: duplicate`);
  for (const cap of CAPS) for (const agent of AGENTS) if (!seen.has(`${cap}/${agent}`)) errors.push(`${cap}/${agent}: missing`);
  return errors;
}

/** 최소 MCP stdio 서버(탐침 전용) — `-c mcp_servers.s9_probe` 로 주입해 핸드셰이크·도구 노출을 관찰한다 */
export const MCP_PROBE_SERVER = fileURLToPath(new URL("./mcp-probe-server.mjs", import.meta.url));

/** CAP-08 reached 도출 규칙(Codex 리뷰 #3): 목록에 이름이 있는 것은 '발견'이고, 핸드셰이크가 끝나 도구가 노출되고 오류가 없어야 '기동'이다 */
export function mcpReached(row: { tools: number; toolsError: unknown } | null | undefined): "started" | "discovered" {
  return row && row.tools > 0 && (row.toolsError === null || row.toolsError === undefined) ? "started" : "discovered";
}

/** 탐침의 승인 정책(Codex 리뷰 #6): 저장소 안 경로·읽기 명령이라도 **전부 거부** — 탐침은 가용성만 보며 효과를 내지 않는다 */
export function decideApproval(_params: unknown, _cwd: string): "decline" {
  void _params;
  void _cwd;
  return "decline";
}

/** 유효 설정 상속 비교(Codex 리뷰 #4, AGENT_INTEGRATION §7 CAP-09 `notify`/hooks): 값(경로·명령)은 남기지 않고 형태와 동일 여부만 기록한다 */
export function configInheritance(shared: Record<string, unknown>, isolated: Record<string, unknown>, keys: string[] = ["notify", "hooks", "mcp_servers", "plugins", "marketplaces", "model_provider", "sandbox_mode", "approval_policy"]): Record<string, { shared: string; isolated: string; inherited: boolean }> {
  const shape = (v: unknown): string => {
    if (v === undefined) return "absent";
    if (v === null) return "null";
    if (Array.isArray(v)) return `array(${v.length})`;
    if (typeof v === "object") return `object(${Object.keys(v as object).length})`;
    return typeof v;
  };
  const out: Record<string, { shared: string; isolated: string; inherited: boolean }> = {};
  for (const k of keys) out[k] = { shared: shape(shared[k]), isolated: shape(isolated[k]), inherited: JSON.stringify(shared[k] ?? null) === JSON.stringify(isolated[k] ?? null) };
  return out;
}

// ───────────────────────────── LIVE 탐침 ─────────────────────────────

export interface ProbeUsage {
  claude: { calls: number; costUsd: number; inputTokens: number; outputTokens: number };
  codex: { calls: number; inputTokens: number; outputTokens: number };
}
export interface ProbeOutput {
  meta: { claudeVersion: string; codexVersion: string; startedAt: string; finishedAt: string; platform: string; node: string; openaiApiKeyPresent: boolean; anthropicApiKeyPresent: boolean; codexDesktopProcesses: string[] };
  results: CapabilityProbeResult[];
  usage: ProbeUsage;
  raw: Record<string, unknown>;
}

const FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));
type Json = Record<string, unknown>;
type Safe<T> = { ok: true; value: T } | { ok: false; error: string };
interface McpRow { name: string; pluginId: unknown; authStatus: unknown; toolsError: unknown; runtimeStatus: Json; tools: number }
interface PluginRow { marketplace: string; id: string; installed: boolean; enabled: boolean; version: unknown; disabledReason: unknown }
/** Codex 발견 요약 — 각 호출은 성공 요약 또는 { error } 중 하나 */
interface DiscoverySummary {
  durationMs: number;
  initialize: Json;
  skills: { count: number; byScope: Record<string, number>; names: string[]; errors: number } | { error: string };
  plugins: { count: number; rows: PluginRow[]; loadErrors: unknown[] } | { error: string };
  mcp: { count: number; rows: McpRow[]; snapshots: number; settledAfterMs: number; snapshotSizes: number[] } | { error: string };
  config: { keys: string[]; computer_use: unknown; browser_use: unknown; apps: unknown; layers: Json[] } | { error: string };
  features: { count: number; enabled: string[] } | { error: string };
  /** config/read 의 유효 설정 원본 — 값에 경로가 있으므로 raw 에는 싣지 않고(strip) 형태 비교(configInheritance)에만 쓴다 */
  effective: Json;
  skillPath: (name: string) => string | undefined;
}
async function safe<T>(fn: () => Promise<T>): Promise<Safe<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, error: String((e as Error).message ?? e).slice(0, 300) };
  }
}
const pick = (o: unknown, keys: string[]): Json => {
  const r: Json = {};
  if (o && typeof o === "object") for (const k of keys) if (k in (o as Json)) r[k] = (o as Json)[k];
  return r;
};
const versionOf = (bin: string, re: RegExp): string => {
  try {
    const out = execFileSync(bin, ["--version"], { encoding: "utf8", shell: process.platform === "win32", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    return out.match(re)?.[1] ?? out.trim();
  } catch {
    return "unknown";
  }
};
/** Codex Desktop 앱 프로세스 목록(이름만) — computer-use 기동 조건 기록용 */
function codexDesktopProcesses(): string[] {
  if (process.platform !== "win32") return [];
  const r = spawnSync("tasklist", ["/FO", "CSV", "/NH"], { encoding: "utf8", windowsHide: true });
  const names = new Set<string>();
  for (const line of (r.stdout ?? "").split(/\r?\n/)) {
    const m = line.match(/^"([^"]+)"/);
    if (m && /codex/i.test(m[1])) names.add(m[1]);
  }
  return [...names].sort();
}

export async function probeAll(opts: { recordingsDir?: string } = {}): Promise<ProbeOutput> {
  const recordingsDir = opts.recordingsDir ?? FIXTURES;
  const startedAt = new Date().toISOString();
  const usage: ProbeUsage = { claude: { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 }, codex: { calls: 0, inputTokens: 0, outputTokens: 0 } };
  const raw: Record<string, unknown> = {};
  const repo = createSampleRepo("s9-");
  const scratchHome = mkdtempSync(join(tmpdir(), "s9-codex-home-"));
  const writeRecording = (rel: string, lines: unknown[]) => {
    const p = join(recordingsDir, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    // 발견 응답(MCP 도구 스키마·플러그인 목록)과 이미지 생성 아이템은 수백 KB 가 넘으므로 줄당 상한을 두고 잘린 길이를 표시한다
    const CAP = 30_000;
    const capped = lines.map((e) => {
      const s = JSON.stringify(e);
      return s.length > CAP ? `${s.slice(0, CAP)}…[truncated ${s.length - CAP} chars]` : s;
    });
    writeFileSync(p, mask(capped.join("\n") + "\n"));
  };

  // ── Claude: Agent SDK 세션 1턴(도구 사용 금지 지시, canUseTool 전부 deny) → system/init 관찰 ──
  async function claudeInit(label: string, extra: Partial<ClaudeRunOpts>) {
    const run = new ClaudeRun({ label, cwd: repo.dir, permissionMode: "default", maxTurns: 1, persistSession: false, includePartialMessages: false, ...extra });
    run.onCanUseTool(async () => ({ behavior: "deny", message: "s9 probe: discovery only" }));
    const t0 = Date.now();
    await run.start("Reply with exactly the word OK and nothing else. Do not use any tools.");
    const res = await run.result();
    const init = run.init();
    writeRecording(`claude-${versions.claude}/s9-claude-${label}.jsonl`, run.recording());
    await run.close();
    usage.claude.calls++;
    usage.claude.costUsd += res.total_cost_usd ?? 0;
    usage.claude.inputTokens += (res.usage?.input_tokens ?? 0) + (res.usage?.cache_read_input_tokens ?? 0) + (res.usage?.cache_creation_input_tokens ?? 0);
    usage.claude.outputTokens += res.usage?.output_tokens ?? 0;
    const i = init as unknown as Json | undefined;
    return {
      durationMs: Date.now() - t0,
      resultSubtype: res.subtype,
      tools: (i?.tools as string[] | undefined) ?? [],
      skills: (i?.skills as string[] | undefined) ?? [],
      mcpServers: ((i?.mcp_servers as Json[] | undefined) ?? []).map((m) => pick(m, ["name", "status", "source"])),
      plugins: ((i?.plugins as Json[] | undefined) ?? []).map((m) => `${m.name}@${m.source ?? "?"}`),
      permissionMode: i?.permissionMode,
      apiKeySource: i?.apiKeySource,
    };
  }

  // ── Codex: 발견(initialize → skills/list, plugin/installed, mcpServerStatus/list, config/read) ──
  async function codexDiscovery(label: string, o: { env?: NodeJS.ProcessEnv; overrides?: string[] }) {
    const client = new AppServerClient({ label, configOverrides: ["features.memories=false", ...(o.overrides ?? [])], env: o.env, requestTimeoutMs: 120_000 });
    const t0 = Date.now();
    try {
      const init = await safe(() => client.initialize({ experimentalApi: true }));
      const skills = await safe(() => client.skillsList([repo.dir], true));
      const plugins = await safe(() => client.request("plugin/installed", { cwds: [repo.dir] }));
      // MCP 서버는 initialize 뒤 비동기로 등록된다(원격 apps 서버는 수 초 뒤 나타남) — 이름 집합이 3회 연속 같을 때까지 1초 간격으로 폴링(최대 20초)
      const mcpSnapshots: string[][] = [];
      let mcp: Safe<unknown> = { ok: false, error: "not polled" };
      const mcpT0 = Date.now();
      while (Date.now() - mcpT0 < 20_000) {
        mcp = await safe(() => client.request("mcpServerStatus/list", { limit: 100 }));
        const names = mcp.ok ? (((mcp.value as Json).data as Json[]) ?? []).map((m) => String(m.name)).sort() : [];
        mcpSnapshots.push(names);
        const n = mcpSnapshots.length;
        if (n >= 3 && JSON.stringify(mcpSnapshots[n - 1]) === JSON.stringify(mcpSnapshots[n - 2]) && JSON.stringify(mcpSnapshots[n - 2]) === JSON.stringify(mcpSnapshots[n - 3])) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      const config = await safe(() => client.request("config/read", { cwd: repo.dir, includeLayers: true }));
      const features = await safe(() => client.request("experimentalFeature/list", { limit: 200 }));
      usage.codex.calls++;
      const skillRows = skills.ok ? ((((skills.value as Json).data as Json[]) ?? []).flatMap((d) => (d.skills as Json[]) ?? [])) : [];
      const pluginRows: PluginRow[] = plugins.ok ? (((plugins.value as Json).marketplaces as Json[]) ?? []).flatMap((m) => ((m.plugins as Json[]) ?? []).map((p) => ({ marketplace: String(m.name), id: String(p.id), installed: !!p.installed, enabled: !!p.enabled, version: p.version ?? null, disabledReason: p.disabledReason ?? null }))) : [];
      const mcpRows: McpRow[] = mcp.ok ? (((mcp.value as Json).data as Json[]) ?? []).map((m) => ({ name: String(m.name), pluginId: m.pluginId ?? null, authStatus: m.authStatus ?? null, toolsError: typeof m.toolsError === "string" ? truncateErrorBody(m.toolsError) : (m.toolsError ?? null), runtimeStatus: pick(m.runtimeStatus, ["state", "reason"]), tools: Object.keys((m.tools as Json) ?? {}).length })) : [];
      const cfg = config.ok ? (config.value as Json) : {};
      const cfgObj = (cfg.config as Json) ?? {};
      const summary: DiscoverySummary = {
        durationMs: Date.now() - t0,
        initialize: init.ok ? pick(init.value, ["codexHome", "platformOs", "userAgent"]) : { error: init.error },
        skills: skills.ok ? { count: skillRows.length, byScope: countBy(skillRows, (s) => `${s.scope}${s.pluginId ? `/${s.pluginId}` : ""}`), names: skillRows.map((s) => String(s.name)).sort(), errors: ((skills.value as Json).data as Json[]).flatMap((d) => (d.errors as unknown[]) ?? []).length } : { error: skills.error },
        plugins: plugins.ok ? { count: pluginRows.length, rows: pluginRows, loadErrors: ((plugins.value as Json).marketplaceLoadErrors as unknown[]) ?? [] } : { error: plugins.error },
        mcp: mcp.ok ? { count: mcpRows.length, rows: mcpRows, snapshots: mcpSnapshots.length, settledAfterMs: Date.now() - mcpT0, snapshotSizes: mcpSnapshots.map((s) => s.length) } : { error: mcp.error },
        config: config.ok ? { keys: Object.keys(cfgObj).sort(), computer_use: cfgObj.computer_use ?? null, browser_use: cfgObj.browser_use ?? null, apps: cfgObj.apps ?? null, layers: ((cfg.layers as Json[]) ?? []).map((l) => pick(l, ["name", "source", "version"])) } : { error: config.error },
        features: features.ok ? { count: (((features.value as Json).data as Json[]) ?? []).length, enabled: (((features.value as Json).data as Json[]) ?? []).filter((f) => f.enabled).map((f) => String(f.name)).sort() } : { error: features.error },
        effective: cfgObj,
        skillPath: (name: string) => skillRows.find((s) => s.name === name)?.path as string | undefined,
      };
      writeRecording(`codex-${versions.codex}/s9-codex-${label}.jsonl`, client.recording());
      return summary;
    } finally {
      await client.close();
    }
  }

  // ── Codex: 1턴 실행(스킬 주입, 샌드박스·승인 정책 지정, 승인 요청은 전부 거부) ──
  async function codexTurn(label: string, o: { input: UserInput[]; sandboxPolicy: SandboxPolicy; approvalPolicy: ApprovalPolicy; timeoutMs?: number }) {
    const client = new AppServerClient({ label, configOverrides: ["features.memories=false"], requestTimeoutMs: 120_000 });
    const items: Json[] = [];
    const serverRequests: Json[] = [];
    const t0 = Date.now();
    try {
      client.onServerRequest((req: ServerRequest) => {
        serverRequests.push({ method: req.method, params: JSON.stringify(req.params).slice(0, 400) });
        if (req.method.endsWith("/requestApproval")) client.respond(req.id, { decision: decideApproval(req.params, repo.dir) });
        else client.respondError(req.id, -32601, `s9 probe does not handle ${req.method}`);
      });
      client.onNotification("item/completed", (n) => {
        const item = (n.params as Json).item as Json;
        const rec: Json = { ...pick(item, ["type", "status", "command", "exitCode", "server", "tool", "name", "error", "phase", "path"]) };
        if (typeof item.aggregatedOutput === "string") rec.output = item.aggregatedOutput.slice(0, 500);
        if (typeof item.text === "string" && item.phase !== "commentary") rec.text = item.text.slice(0, 1500);
        if (Array.isArray(item.changes)) rec.changes = (item.changes as Json[]).map((c) => c.path);
        if (item.type !== "agentMessage" && item.type !== "commandExecution" && item.type !== "fileChange" && item.type !== "reasoning") rec.rawItem = JSON.stringify(item).slice(0, 1500);
        items.push(rec);
      });
      await client.initialize({ experimentalApi: true });
      const { threadId } = await client.threadStart(repo.dir);
      const turn = await client.turnStart(threadId, o.input, { approvalPolicy: o.approvalPolicy, sandboxPolicy: o.sandboxPolicy, cwd: repo.dir });
      const done = await client.waitForTurnCompleted(threadId, turn.id, o.timeoutMs ?? 5 * 60_000);
      const u = client.tokenUsage(threadId).total as Json | undefined;
      usage.codex.calls++;
      usage.codex.inputTokens += Number((u?.inputTokens as number) ?? (u?.input_tokens as number) ?? 0);
      usage.codex.outputTokens += Number((u?.outputTokens as number) ?? (u?.output_tokens as number) ?? 0);
      writeRecording(`codex-${versions.codex}/s9-codex-${label}.jsonl`, client.recording());
      const finalText = [...items].reverse().find((i) => i.type === "agentMessage" && typeof i.text === "string")?.text ?? "";
      return { durationMs: Date.now() - t0, turnStatus: done.turn.status, turnError: done.turn.error?.message ?? null, itemTypes: countBy(items, (i) => String(i.type)), items, serverRequests, finalText: String(finalText).slice(0, 1500), usage: u ?? null, status: repo.status() };
    } finally {
      await client.close();
    }
  }

  const versions = { claude: versionOf("claude", /(\d+\.\d+\.\d+)/), codex: versionOf("codex", /(\d+\.\d+\.\d+)/) };
  const results: CapabilityProbeResult[] = [];
  const push = (r: CapabilityProbeResult) => results.push({ ...r, evidence: mask(r.evidence), ...(r.condition ? { condition: mask(r.condition) } : {}) });

  try {
    raw.codexDesktopProcesses = codexDesktopProcesses();

    // ── (a)(b) Claude 발견: 기본 설정 소스 / 격리([]) / --chrome ──
    const cDefault = await claudeInit("default", {});
    const cIsolated = await claudeInit("isolated", { settingSources: [] });
    const cChrome = await claudeInit("chrome", { extraArgs: { chrome: null } });
    raw.claude = { default: cDefault, isolated: cIsolated, chrome: cChrome };
    const synced = (skills: string[]) => skills.filter((s) => /^anthropic-skills:|^(pdf|docx|xlsx|pptx|docs|computer-use|chrome-browser|built-in-browser)$/.test(s));
    const chromeTools = cChrome.tools.filter((t) => /chrome|browser/i.test(t)).concat(cChrome.mcpServers.filter((m) => /chrome|browser/i.test(String(m.name))).map((m) => `mcp:${m.name}(${m.status})`));
    const chromeToolsDefault = cDefault.tools.filter((t) => /chrome|browser/i.test(t));

    // ── (f) S2 결과 재사용(플랜/자동 권한 모드) ──
    const s2 = JSON.parse(readFileSync(join(FIXTURES, "claude-2.1.316", "s2-results.json"), "utf8")) as Json;
    const s2plan = s2.plan as Json, s2accept = s2.acceptEdits as Json, s2deny = s2.deny as Json, s2mcp = (s2.mcp as Json) ?? {};
    const s1c = JSON.parse(readFileSync(join(FIXTURES, "codex-0.166.0", "s1c-results.json"), "utf8")) as Json;
    const s1cRows = (s1c.rows as Json[]) ?? [];
    const s1aReadOnly = readFileSync(join(FIXTURES, "codex-0.166.0", "s1a-readOnly.jsonl"), "utf8");
    const s1aFileChanges = (s1aReadOnly.match(/"type":"fileChange"/g) ?? []).length;
    const s1aCommands = (s1aReadOnly.match(/"type":"commandExecution"/g) ?? []).length;
    const s1aApprovals = (s1aReadOnly.match(/requestApproval/g) ?? []).length;
    const s4 = JSON.parse(readFileSync(join(FIXTURES, "s4-isolation-results.json"), "utf8")) as Json;
    const s4rows = (s4.rows as Json[]) ?? [];
    /** S4 격리 매트릭스 요약: provider 별 `area:approvalPolicy=verdict` (검증된 variant 만) */
    const s4summary = (provider: string) => s4rows.filter((r) => r.provider === provider && r.variantApplied !== "unverified").map((r) => `${r.area}:${r.approvalPolicy}=${r.verdict}`).sort();
    const s4downgrades = ((s4.guaranteeDowngrades as Json[]) ?? []).map((d) => `${d.column}/${d.area}→${d.level}`);

    push({ cap: "CAP-01", agent: "claude", status: "supported", reached: "executed", evidence: `S2 plan(permissionMode:'plan'): hookedTools=${JSON.stringify(s2plan.hookedTools)}, askedTools=${JSON.stringify(s2plan.askedTools)}, 저장소 변경=${JSON.stringify(s2plan.status)}(없음), planFileWritesWithoutCanUseTool=${s2plan.planFileWritesWithoutCanUseTool}(플랜 파일은 ~/.claude/plans); 종료 허용 시 쓰기 재개(planExitAllowed.writesInCwdAfterExit=${JSON.stringify((s2.planExitAllowed as Json).writesInCwdAfterExit)}). 픽스처 s2-plan.jsonl·s2-plan-exit-allowed.jsonl` });
    push({ cap: "CAP-02", agent: "claude", status: "conditional", reached: "executed", condition: "모드 자체는 동작(acceptEdits 에서 Edit 가 canUseTool 없이 실행). 격리 보장 수준은 SECURITY §2.1(S4: Claude native 는 '정책만' — 샌드박스 아님) → 옵트인 시 경고 배지(U8)", evidence: `S2 acceptEdits: writeToolsWithoutCanUseTool=${JSON.stringify(s2accept.writeToolsWithoutCanUseTool)}, unverifiedWriteTools=${JSON.stringify(s2accept.unverifiedWriteTools)}, status=${JSON.stringify(s2accept.status)}; S2 deny: permissionDenials=${((s2deny.permissionDenials as unknown[]) ?? []).length}건(Edit 거부 → 무변경); S4 claude native 격리 실측=${JSON.stringify(s4summary("claude"))}, 보장 수준 하향=${JSON.stringify(s4downgrades.filter((d) => d.startsWith("claude")))}` });
    push({ cap: "CAP-03", agent: "claude", status: "conditional", reached: "executed", condition: "일반 파일 읽기·편집은 내장 도구로 실행 확인(S2). 요구에 포함된 PDF(Read `pages`)·이미지 읽기는 **미실측** → V1(AC-V1-6)에서 판정(리뷰 #5)", evidence: `init.tools(${cDefault.tools.length})에 Read/Edit/Write/NotebookEdit/Glob/Grep 포함=${["Read", "Edit", "Write", "NotebookEdit", "Glob", "Grep"].every((t) => cDefault.tools.includes(t))}; S2 deny/acceptEdits 에서 Read→Edit 실행(assistantToolUseNames=${JSON.stringify(s2deny.assistantToolUseNames)}). PDF/이미지 읽기는 Read 도구 내장(pages 인자) — 실측은 V1` });
    push({ cap: "CAP-04", agent: "claude", status: "conditional", reached: "discovered", condition: "synced 스킬(anthropic-skills:docx/xlsx/pptx/pdf/docs)이 init.skills 에 노출됨(사용자 설정 소스). 문서 생성 실행·산출물 재열기 검증은 V1(AC-V1-7); settingSources:[] 격리 모드에서는 노출 여부가 아래 수치대로 바뀜", evidence: `init.skills default=${cDefault.skills.length}개(synced 문서 스킬: ${JSON.stringify(synced(cDefault.skills))}); settingSources:[] → ${cIsolated.skills.length}개(synced: ${JSON.stringify(synced(cIsolated.skills))}); Skill 도구 노출=${cDefault.tools.includes("Skill")}` });
    push({ cap: "CAP-05", agent: "claude", status: "unsupported", reached: "discovered", evidence: `init.tools(${cDefault.tools.length})·skills(${cDefault.skills.length})·mcp_servers(${cDefault.mcpServers.length}) 어디에도 이미지 생성 도구/스킬 없음(/imag/ 일치: tools=${JSON.stringify(cDefault.tools.filter((t) => /imag/i.test(t)))}, skills=${JSON.stringify(cDefault.skills.filter((s) => /imag/i.test(s)))}). 1단 불가 → Codex 라우팅 또는 2단 API(CAP-08)` });
    push({ cap: "CAP-06", agent: "claude", status: "conditional", reached: chromeTools.length ? "started" : "discovered", condition: "CLI --chrome 플래그는 SDK Options.extraArgs {chrome:null} 로 전달 가능. 실제 브라우저 조작은 Chrome 확장(Claude in Chrome) 설치·연결 전제 — 이 탐침은 브라우저를 조작하지 않음(노출만 관찰)", evidence: `extraArgs {chrome:null} 세션: 브라우저 관련 tools/mcp=${JSON.stringify(chromeTools)} (기본 세션: ${JSON.stringify(chromeToolsDefault)}); synced 스킬 chrome-browser/built-in-browser=${JSON.stringify(cDefault.skills.filter((s) => /browser/.test(s)))}; agent-browser 스킬 노출=${cDefault.skills.includes("agent-browser")}; resultSubtype=${cChrome.resultSubtype}` });
    push({ cap: "CAP-07", agent: "claude", status: "conditional", reached: "discovered", condition: "synced computer-use 스킬은 Desktop 앱의 mcp__computer-use__* 도구 전제 — 헤드리스 init.tools 에 computer-use 도구 없음(실측). '2단(Agent Studio MCP 도구 서버) 전용'은 실측 결론이 아니라 제품 정책 제안(리뷰 #2)", evidence: `init.skills 에 anthropic-skills:computer-use=${cDefault.skills.includes("anthropic-skills:computer-use")}; init.tools 중 /computer|screen|mouse|keyboard/=${JSON.stringify(cDefault.tools.filter((t) => /computer|screen|mouse|keyboard/i.test(t)))}; mcp_servers=${JSON.stringify(cDefault.mcpServers.map((m) => m.name))}` });
    push({ cap: "CAP-08", agent: "claude", status: "conditional", reached: /connected/.test(JSON.stringify(s2mcp)) ? "started" : "discovered", condition: "SDK Options.mcpServers 로 앱 MCP 서버 주입 가능(S2 실측); 도구 서버 자체는 V1 P10b T9 구현·TEST-SE-10", evidence: `S2 mcp: default=${JSON.stringify(pick(s2mcp.default, ["toolCount", "skills"]))} mcpServers=${((s2mcp.default as Json)?.mcpServers as unknown[] | undefined)?.length ?? 0}개(plugin 출처), strict=${JSON.stringify(pick(s2mcp.strict, ["toolCount", "mcpServers"]))}; 이번 세션 mcp_servers=${JSON.stringify(cDefault.mcpServers.map((m) => `${m.name}:${m.status}`))}` });
    push({ cap: "CAP-09", agent: "claude", status: "conditional", reached: "discovered", condition: "Codex 전용 요구(CODEX_HOME). Claude 대응물 = settingSources('user')로 ~/.claude 공유 — 기본은 전부 로드, [] 로 격리", evidence: `settingSources 생략: skills=${cDefault.skills.length}, plugins=${cDefault.plugins.length}, mcp=${cDefault.mcpServers.length}; settingSources:[]: skills=${cIsolated.skills.length}, plugins=${cIsolated.plugins.length}, mcp=${cIsolated.mcpServers.length}` });

    // ── (c)(g) Codex 발견: 공유 CODEX_HOME / 공유 + -c mcp_servers 오버라이드(V31) / 임시 분리 CODEX_HOME ──
    const shared = await codexDiscovery("shared", {});
    // 실제 핸드셰이크가 되는 최소 MCP 서버를 주입한다(리뷰 #3) — TOML basic string 이므로 경로는 슬래시로
    const overridden = await codexDiscovery("shared-mcp-override", { overrides: [`mcp_servers.s9_probe={command="node",args=[${JSON.stringify(MCP_PROBE_SERVER.replace(/\\/g, "/"))}]}`] });
    const isolated = await codexDiscovery("isolated-home", { env: { CODEX_HOME: scratchHome } });
    raw.codex = { shared: strip(shared), sharedMcpOverride: strip(overridden), isolatedHome: strip(isolated) };
    const names = (d: typeof shared) => ("rows" in d.mcp ? d.mcp.rows.map((r) => String(r.name)).sort() : []);
    const pluginIds = (d: typeof shared) => ("rows" in d.plugins ? d.plugins.rows.filter((p) => p.installed).map((p) => `${p.id}${p.enabled ? "" : "(disabled)"}`).sort() : []);
    const skillNames = (d: typeof shared) => ("names" in d.skills ? d.skills.names : []);
    const v31Removed = names(shared).filter((n) => !names(overridden).includes(n));
    // V31 의 핵심 질문은 "사용자 config.toml 의 [mcp_servers.*] 항목이 -c 오버라이드 뒤에도 남는가" — 섹션 이름만 읽는다(값은 읽지 않음, 읽기 전용)
    const userMcpNames = readUserMcpServerNames();
    const v31ConfigRetained = userMcpNames.filter((n) => names(overridden).includes(n));
    const mcpSettle = (d: typeof shared) => ("snapshots" in d.mcp ? `${d.mcp.snapshots}회/${d.mcp.settledAfterMs}ms 크기 ${JSON.stringify(d.mcp.snapshotSizes)}` : "n/a");
    const probeRow = "rows" in overridden.mcp ? overridden.mcp.rows.find((r) => r.name === "s9_probe") : undefined;
    const inheritance = configInheritance(shared.effective, isolated.effective);
    raw.v31 = { userMcpNames, sharedNames: names(shared), overriddenNames: names(overridden), removed: v31Removed, configRetained: v31ConfigRetained, probeRow: probeRow ?? null, settle: { shared: mcpSettle(shared), overridden: mcpSettle(overridden) } };
    raw.codexInheritance = inheritance;

    // ── (c-exec) CAP-04 Codex: documents 스킬 주입 → hello.docx 산출 ──
    const docSkill = shared.skillPath("documents:documents");
    const docx = docSkill
      ? await codexTurn("documents", { input: [{ type: "skill", name: "documents:documents", path: docSkill }, { type: "text", text: "Using the documents skill, create a Word document named hello.docx in the current directory containing exactly one paragraph: 'S9 probe'. Do not modify any other file. Finish with a one-line report." }], sandboxPolicy: { type: "workspaceWrite", writableRoots: [repo.dir] }, approvalPolicy: "on-request" })
      : null;
    const docxPath = join(repo.dir, "hello.docx");
    const docxBuf = existsSync(docxPath) ? readFileSync(docxPath) : null;
    const docxValid = !!docxBuf && docxBuf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && docxBuf.includes("word/document.xml");
    raw.codexDocuments = { skillPath: docSkill ? mask(docSkill) : null, turn: docx, docxExists: !!docxBuf, docxBytes: docxBuf?.length ?? 0, docxValid };
    if (docxBuf) rmSync(docxPath, { force: true });

    // ── (d) CAP-05 Codex: imagegen 스킬 주입 → circle.png (API key 모드는 키가 없으면 미실측) ──
    const imgSkill = shared.skillPath("imagegen");
    const img = imgSkill
      ? await codexTurn("imagegen", { input: [{ type: "skill", name: "imagegen", path: imgSkill }, { type: "text", text: "Using the image generation tool, generate a small 64x64 PNG image of a red circle on a white background and save it as circle.png in the current directory. Do not draw it with code or libraries — use the image generation tool. If the tool is unavailable, say so in one line and stop." }], sandboxPolicy: { type: "workspaceWrite", writableRoots: [repo.dir] }, approvalPolicy: "on-request" })
      : null;
    const pngPath = join(repo.dir, "circle.png");
    const pngBuf = existsSync(pngPath) ? readFileSync(pngPath) : null;
    const pngValid = !!pngBuf && pngBuf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    raw.codexImagegen = { skillPath: imgSkill ? mask(imgSkill) : null, turn: img, pngExists: !!pngBuf, pngBytes: pngBuf?.length ?? 0, pngValid, openaiApiKeyPresent: !!process.env.OPENAI_API_KEY };
    if (pngBuf) rmSync(pngPath, { force: true });

    // ── (e) CAP-07 Codex: computer-use 스킬 주입, readOnly, 캡처·입력 금지 지시, 승인 전부 거부 ──
    const cuSkill = shared.skillPath("computer-use:computer-use");
    const cu = cuSkill
      ? await codexTurn("computer-use", { input: [{ type: "skill", name: "computer-use:computer-use", path: cuSkill }, { type: "text", text: "Report whether the computer-use capability is available in this session: which tool or plugin provides it and its current status. Do NOT take any screenshot, do NOT click, type, move the mouse, open or focus any application, or control the computer in any way. If checking availability requires any of those actions, do not do it — just report that. Reply in one short paragraph." }], sandboxPolicy: { type: "readOnly" }, approvalPolicy: "on-request", timeoutMs: 4 * 60_000 })
      : null;
    raw.codexComputerUse = { skillPath: cuSkill ? mask(cuSkill) : null, turn: cu, desktopProcesses: raw.codexDesktopProcesses };

    const mcpCalls = (t: typeof cu) => (t?.items ?? []).filter((i) => /mcp|tool/i.test(String(i.type)) && i.type !== "commandExecution");
    const codexPlugins = pluginIds(shared);
    const readOnlyFx = s1cRows.filter((r) => r.sandbox === "readOnly").map((r) => `${r.instruction}:${r.verdict}/effect=${r.effect}`);
    const neverFx = s1cRows.filter((r) => r.sandbox === "workspaceWrite").map((r) => `${r.instruction}:${r.verdict}/effect=${r.effect}`);

    push({ cap: "CAP-01", agent: "codex", status: "supported", reached: "executed", evidence: `S1a readOnly 녹화(s1a-readOnly.jsonl): fileChange=${s1aFileChanges}건, commandExecution=${s1aCommands}건, requestApproval=${s1aApprovals}건 → 무단 변경 0; S1c readOnly 행: ${JSON.stringify(readOnlyFx)}; sandboxPolicy{type:"readOnly"} 는 turn/start 에서 수락됨(이번 computer-use 턴 status=${cu?.turnStatus ?? "n/a"})` });
    push({ cap: "CAP-02", agent: "codex", status: "supported", reached: "executed", evidence: `S1c workspaceWrite+approvalPolicy never: ${JSON.stringify(neverFx)}; S4 codex 격리 실측(workspaceWrite elevated, 검증된 variant): ${JSON.stringify(s4summary("codex"))}, 보장 수준 하향=${JSON.stringify(s4downgrades.filter((d) => d.startsWith("codex")))}; 이번 documents 턴 approvalPolicy on-request 서버 요청=${docx?.serverRequests.length ?? 0}건` });
    push({ cap: "CAP-03", agent: "codex", status: "conditional", reached: "executed", condition: "일반 파일·명령은 내장 도구로 실행 확인(S1c·documents 턴). PDF 읽기 플러그인(pdf@openai-primary-runtime)은 노출만 확인, 실행 **미실측** → V1(리뷰 #5)", evidence: `내장 파일·명령 도구: S1c file-write/shell-command 실행(위 CAP-02 행), 이번 documents 턴 itemTypes=${JSON.stringify(docx?.itemTypes ?? {})}; 플러그인 pdf@openai-primary-runtime 노출=${codexPlugins.some((p) => p.startsWith("pdf@"))}, skills/list 에 pdf:pdf=${skillNames(shared).includes("pdf:pdf")} (플러그인 경로는 conditional — 실행 미실측)` });
    push({ cap: "CAP-04", agent: "codex", status: "conditional", reached: docxValid ? "artifact" : docx && docx.items.length ? "executed" : docSkill ? "started" : "discovered", condition: "documents@openai-primary-runtime 플러그인(공유 CODEX_HOME 에 설치·활성)과 ChatGPT 로그인 전제; 분리 CODEX_HOME 에서는 노출되지 않음(아래 CAP-09)", evidence: `documents:documents 스킬 주입 턴: status=${docx?.turnStatus ?? "skill-not-listed"}, error=${docx?.turnError ?? null}, itemTypes=${JSON.stringify(docx?.itemTypes ?? {})}, ${docx?.durationMs ?? 0}ms; hello.docx exists=${!!docxBuf} bytes=${docxBuf?.length ?? 0} zip+word/document.xml=${docxValid}; 최종 메시지: ${(docx?.finalText ?? "").slice(0, 200)}` });
    push({ cap: "CAP-05", agent: "codex", status: "conditional", reached: pngValid ? "artifact" : img && img.items.length ? "executed" : imgSkill ? "started" : "discovered", condition: `ChatGPT 로그인 모드 실측(아래). OPENAI_API_KEY 모드는 키 미보유로 미실측(openaiApiKeyPresent=${!!process.env.OPENAI_API_KEY}); image_generation 피처 플래그 stable`, evidence: `imagegen 스킬 주입 턴: status=${img?.turnStatus ?? "skill-not-listed"}, error=${img?.turnError ?? null}, itemTypes=${JSON.stringify(img?.itemTypes ?? {})}, ${img?.durationMs ?? 0}ms; circle.png exists=${!!pngBuf} bytes=${pngBuf?.length ?? 0} PNG 헤더=${pngValid}; 최종 메시지: ${(img?.finalText ?? "").slice(0, 200)}` });
    push({ cap: "CAP-06", agent: "codex", status: "conditional", reached: "discovered", condition: "browser@openai-bundled·chrome@openai-bundled 플러그인은 공유 CODEX_HOME 에 설치·활성(Desktop 앱 번들); 헤드리스 도구 호출은 미실측(브라우저 조작 금지 원칙) → V1 P10b T9 에서 agent-browser 2단과 비교", evidence: `plugin/installed: ${JSON.stringify(codexPlugins.filter((p) => /browser|chrome/.test(p)))}; config.browser_use=${JSON.stringify("browser_use" in shared.config ? shared.config.browser_use : null)}; features enabled 중 browser_*=${JSON.stringify("enabled" in shared.features ? shared.features.enabled.filter((f) => /browser/.test(f)) : [])}; 분리 CODEX_HOME 플러그인=${JSON.stringify(pluginIds(isolated).filter((p) => /browser|chrome/.test(p)))}` });
    push({ cap: "CAP-07", agent: "codex", status: "conditional", reached: cu && mcpCalls(cu).length ? "started" : cuSkill ? "discovered" : "discovered", condition: `computer-use@openai-bundled 는 node_repl MCP 훅 + Desktop 앱 전제(Desktop 프로세스 ${(raw.codexDesktopProcesses as string[]).length ? "실행 중: " + JSON.stringify(raw.codexDesktopProcesses) : "미실행"}); 캡처·입력 금지 지시 하에 기동만 시도. MASTER (e) 'Desktop 앱 미실행' 조건은 ${(raw.codexDesktopProcesses as string[]).length ? "**미충족**(앱 실행 중) → 헤드리스 1단 가용성은 미판정, 앱 종료 후 재실측 필요" : "충족"}; '2단 전용'은 실측 결론이 아니라 제품 정책 제안(3단 스크립트 금지, 리뷰 #2)`, evidence: `computer-use:computer-use 스킬 주입(readOnly, 승인 전부 거부): status=${cu?.turnStatus ?? "skill-not-listed"}, error=${cu?.turnError ?? null}, itemTypes=${JSON.stringify(cu?.itemTypes ?? {})}, MCP/tool 아이템=${JSON.stringify(mcpCalls(cu).map((i) => pick(i, ["type", "server", "tool", "status", "error"]))).slice(0, 300)}, 승인요청=${cu?.serverRequests.length ?? 0}; config.computer_use=${JSON.stringify("computer_use" in shared.config ? shared.config.computer_use : null).slice(0, 120)}; 최종 메시지: ${(cu?.finalText ?? "").slice(0, 200)}` });
    push({ cap: "CAP-08", agent: "codex", status: "conditional", reached: mcpReached(probeRow), condition: "-c mcp_servers.<name> 오버라이드로 앱 MCP 도구 서버 주입 가능(config.toml 무수정); 기동 판정은 핸드셰이크 기준(도구 노출 >0·toolsError 없음, 리뷰 #3); 도구 서버 자체는 V1 P10b T9", evidence: `-c 'mcp_servers.s9_probe={command="node",args=[mcp-probe-server.mjs]}' → mcpServerStatus/list 에 s9_probe 등장=${names(overridden).includes("s9_probe")} (rows=${JSON.stringify(names(overridden))}); s9_probe 행: tools=${probeRow?.tools ?? 0}, toolsError=${JSON.stringify(probeRow?.toolsError ?? null)}, authStatus=${JSON.stringify(probeRow?.authStatus ?? null)}, runtimeStatus=${JSON.stringify(probeRow?.runtimeStatus ?? {})}; V31: config.toml [mcp_servers.*] ${userMcpNames.length}개 중 오버라이드 뒤 유지=${v31ConfigRetained.length}개(${JSON.stringify(v31ConfigRetained)}); 전체 집합 차이(공유−오버라이드)=${JSON.stringify(v31Removed)} — 목록은 ${mcpSettle(shared)} / ${mcpSettle(overridden)} 폴링으로 안정화한 스냅숏` });
    push({ cap: "CAP-09", agent: "codex", status: "conditional", reached: "executed", condition: "상속 범위 실측 = 로그인(공유 홈 documents·imagegen 턴 실행으로 간접 확인)·system/user/플러그인 스킬·플러그인·MCP·config layers·notify/hooks(형태 비교). **미실측**: 세션 목록(thread/list) 비교, 분리 홈에서 로그인 필요 작업(턴) 실행(리뷰 #4)", evidence: `유효 설정 상속(공유→분리, 형태만): ${JSON.stringify(inheritance)}; 공유 CODEX_HOME: skills=${skillNames(shared).length}(${JSON.stringify("byScope" in shared.skills ? shared.skills.byScope : {})}), plugins installed=${codexPlugins.length}, mcp=${JSON.stringify(names(shared))}, config layers=${JSON.stringify("layers" in shared.config ? shared.config.layers.map((l) => l.name ?? l.source) : [])}; 분리 CODEX_HOME(빈 디렉터리): initialize=${isolated.initialize.error ? "error:" + String(isolated.initialize.error) : "ok"}, skills=${skillNames(isolated).length}(${JSON.stringify("byScope" in isolated.skills ? isolated.skills.byScope : isolated.skills)}), plugins=${pluginIds(isolated).length}, mcp=${JSON.stringify(names(isolated))}; V31: config.toml 정의 MCP ${JSON.stringify(userMcpNames)} 오버라이드 뒤 유지=${JSON.stringify(v31ConfigRetained)}, 집합 차이=${JSON.stringify(v31Removed)}` });
  } finally {
    repo.cleanup();
    rmSync(scratchHome, { recursive: true, force: true });
  }

  const out: ProbeOutput = {
    meta: { claudeVersion: versions.claude, codexVersion: versions.codex, startedAt, finishedAt: new Date().toISOString(), platform: process.platform, node: process.version, openaiApiKeyPresent: !!process.env.OPENAI_API_KEY, anthropicApiKeyPresent: !!process.env.ANTHROPIC_API_KEY, codexDesktopProcesses: raw.codexDesktopProcesses as string[] },
    results,
    usage,
    raw,
  };
  return JSON.parse(mask(JSON.stringify(out))) as ProbeOutput;
}

/** 사용자 `$CODEX_HOME/config.toml` 의 `[mcp_servers.<name>]` 섹션 이름만 읽는다(값·자격 증명은 읽지 않음) */
function readUserMcpServerNames(): string[] {
  const home = process.env.CODEX_HOME ?? join(process.env.USERPROFILE ?? process.env.HOME ?? "", ".codex");
  const p = join(home, "config.toml");
  if (!existsSync(p)) return [];
  const names = new Set<string>();
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*\[mcp_servers\.("?)([^\].".]+)\1\]/);
    if (m) names.add(m[2]);
  }
  return [...names].sort();
}

function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] ?? 0) + 1;
  return out;
}
/** 함수 필드(skillPath)와 유효 설정 원본(effective — 경로 포함)을 떼어낸 직렬화 가능한 요약 */
function strip<T extends { skillPath: unknown; effective: unknown }>(d: T): Omit<T, "skillPath" | "effective"> {
  const { skillPath: _omit, effective: _omit2, ...rest } = d;
  void _omit;
  void _omit2;
  return rest;
}
