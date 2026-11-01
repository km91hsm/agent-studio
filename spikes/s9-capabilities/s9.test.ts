/**
 * S9 — 기능 상속 탐침 (MASTER Task S9, AC-P00-9 결정 게이트, AGENT_INTEGRATION §7 REQ-CAP-01~09, PRODUCT §13A, V31, R18, C9)
 * 단언 대상은 **결과 계약**이다: 9 CAP × 2 에이전트 = 18행, 모든 행에 status ∈ {supported, conditional, unsupported}·
 * reached ∈ {discovered, started, executed, artifact}·evidence(이벤트 인용/명령 출력)가 있다. **status 값 자체는 단언하지 않는다** —
 * S9는 CAP별 1/2/3단 경로를 결정하는 게이트이며 기능 실현 게이트는 V1 AC(AC-V1-5~10)다.
 *   CI  : 커밋된 픽스처 `spikes/fixtures/s9-capabilities-results.json` 이 계약을 만족하는지 + validateResults 자체의 판정 규칙
 *         + Codex 리뷰 반영 규칙(reached 도출 `mcpReached`, 승인 전부 거부 `decideApproval`, notify/hooks 형태 비교 `configInheritance`, MCP 탐침 서버 핸드셰이크)
 *   LIVE: probeAll 로 실제 Claude(Agent SDK)·Codex(app-server) 탐침을 실행해 픽스처·녹화를 갱신한다(사용자 CODEX_HOME 읽기 전용, -c 오버라이드만)
 */
import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS, CAPS, MCP_PROBE_SERVER, configInheritance, decideApproval, mcpReached, probeAll, validateResults, type CapabilityProbeResult } from "./probe.js";

const FIXTURE = fileURLToPath(new URL("../fixtures/s9-capabilities-results.json", import.meta.url));
const RECORDINGS = fileURLToPath(new URL("../fixtures/", import.meta.url));

const row = (over: Partial<CapabilityProbeResult> = {}): CapabilityProbeResult => ({ cap: "CAP-01", agent: "claude", status: "conditional", reached: "discovered", condition: "x", evidence: "e", ...over });
const fullSet = (): CapabilityProbeResult[] => CAPS.flatMap((cap) => AGENTS.map((agent) => row({ cap, agent, status: "supported", reached: "executed", condition: undefined, evidence: `${cap}/${agent}: ok` })));

describe("S9 capability probe — 결과 계약 (CI)", () => {
  it("CAPS 는 CAP-01..CAP-09, AGENTS 는 claude·codex", () => {
    expect(CAPS).toEqual(["CAP-01", "CAP-02", "CAP-03", "CAP-04", "CAP-05", "CAP-06", "CAP-07", "CAP-08", "CAP-09"]);
    expect(AGENTS).toEqual(["claude", "codex"]);
  });

  it("validateResults: 빈 배열·필드 누락·잘못된 값·중복·빠진 (cap, agent) 조합을 모두 잡고, 완전한 18행은 오류 0", () => {
    expect(validateResults([])).toEqual(["results: empty"]);
    expect(validateResults(fullSet())).toEqual([]);
    const bad = fullSet();
    bad[0] = row({ cap: "CAP-01", agent: "claude", status: "maybe" as never, reached: "executed", evidence: "" });
    const errs = validateResults(bad);
    expect(errs).toContain("CAP-01/claude: status 'maybe' not in supported|conditional|unsupported");
    expect(errs).toContain("CAP-01/claude: evidence empty");
    // conditional 은 condition 문구가 필요하다
    const cond = fullSet();
    cond[3] = { ...cond[3], status: "conditional", condition: undefined };
    expect(validateResults(cond)).toEqual([`${cond[3].cap}/${cond[3].agent}: conditional requires condition`]);
    // 중복·누락
    const dup = fullSet();
    dup[1] = { ...dup[0] };
    const dupErrs = validateResults(dup);
    expect(dupErrs).toContain("CAP-01/claude: duplicate");
    expect(dupErrs).toContain("CAP-01/codex: missing");
    expect(validateResults([row({ reached: "flying" as never })])).toContain("CAP-01/claude: reached 'flying' not in discovered|started|executed|artifact");
  });

  // LIVE 첫 실행에서는 픽스처가 아직 없으므로(같은 파일의 LIVE 테스트가 뒤에 만든다) 그 경우만 건너뛴다 — CI 에서는 항상 실행
  it.skipIf(!!process.env.AGENT_STUDIO_LIVE && !existsSync(FIXTURE))("커밋된 픽스처가 계약을 만족한다: 18행, 오류 0, 환경(버전·시각) 메타 포함, 홈 경로·사용자명 없음, reached 도출 규칙 일치", () => {
    expect(existsSync(FIXTURE), "fixture missing — run `AGENT_STUDIO_LIVE=1 npx vitest run spikes/s9-capabilities`").toBe(true);
    const raw = readFileSync(FIXTURE, "utf8");
    const j = JSON.parse(raw) as { meta: { claudeVersion: string; codexVersion: string; startedAt: string; platform: string }; results: CapabilityProbeResult[]; raw: { codex: { sharedMcpOverride: { mcp: { rows: { name: string; tools: number; toolsError: unknown }[] } } } } };
    expect(validateResults(j.results)).toEqual([]);
    expect(j.results).toHaveLength(18);
    expect(j.meta.claudeVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(j.meta.codexVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(j.meta.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(raw).not.toMatch(/[A-Za-z]:[\\/]+Users[\\/]+(?!<user>)[A-Za-z0-9_.-]+/);
    // Codex 리뷰 #3: CAP-08 codex 의 reached 는 s9_probe 행(핸드셰이크·도구 수)에서 도출된 값이어야 한다(이름 등장만으로 started 금지)
    const probeRow = j.raw.codex.sharedMcpOverride.mcp.rows.find((r) => r.name === "s9_probe");
    const cap08 = j.results.find((r) => r.cap === "CAP-08" && r.agent === "codex")!;
    expect(cap08.reached).toBe(mcpReached(probeRow));
    expect(cap08.evidence).toMatch(/s9_probe.*(tools|도구)=\d+/);
    // Codex 리뷰 #4: CAP-09 codex 증거는 notify·hooks 유효값(형태) 비교를 포함한다
    const cap09 = j.results.find((r) => r.cap === "CAP-09" && r.agent === "codex")!;
    expect(cap09.evidence).toMatch(/notify/);
    expect(cap09.evidence).toMatch(/hooks/);
  });
});

describe("S9 capability probe — Codex 리뷰 반영 규칙 (CI, 순수 함수·로컬 프로세스)", () => {
  it("mcpReached: 목록에 이름이 있어도 도구 0·toolsError 면 discovered, 도구가 있고 오류 없을 때만 started", () => {
    expect(mcpReached(undefined)).toBe("discovered");
    expect(mcpReached(null)).toBe("discovered");
    expect(mcpReached({ tools: 0, toolsError: null })).toBe("discovered");
    expect(mcpReached({ tools: 2, toolsError: "handshake failed" })).toBe("discovered");
    expect(mcpReached({ tools: 1, toolsError: null })).toBe("started");
  });

  it("decideApproval: 탐침은 저장소 안 경로·읽기 명령이라도 모든 승인 요청을 거부한다", () => {
    expect(decideApproval({ changes: [{ path: "D:/repo/README.md" }] }, "D:/repo")).toBe("decline");
    expect(decideApproval({ command: ["git", "status"], cwd: "D:/repo" }, "D:/repo")).toBe("decline");
    expect(decideApproval({}, "D:/repo")).toBe("decline");
  });

  it("configInheritance: notify·hooks 등 유효값의 공유/분리 형태만 비교하고 값(경로)은 남기지 않는다", () => {
    const d = configInheritance({ notify: ["C:/secret/notify.exe", "--x"], hooks: null, mcp_servers: { a: {} }, model: "m" }, { notify: null, hooks: null, mcp_servers: {}, model: "m" }, ["notify", "hooks", "mcp_servers", "model", "absent_key"]);
    expect(d.notify).toEqual({ shared: "array(2)", isolated: "null", inherited: false });
    expect(d.hooks).toEqual({ shared: "null", isolated: "null", inherited: true });
    expect(d.mcp_servers).toEqual({ shared: "object(1)", isolated: "object(0)", inherited: false });
    expect(d.model).toEqual({ shared: "string", isolated: "string", inherited: true });
    expect(d.absent_key).toEqual({ shared: "absent", isolated: "absent", inherited: true });
    expect(JSON.stringify(d)).not.toMatch(/secret|notify\.exe/);
  });

  it("MCP 탐침 서버: initialize → tools/list 핸드셰이크에 응답한다(stdio JSON-RPC, 도구 s9_echo 1개)", async () => {
    const child = spawn(process.execPath, [MCP_PROBE_SERVER], { stdio: ["pipe", "pipe", "ignore"] });
    const lines: string[] = [];
    let buf = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d: string) => {
      buf += d;
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        lines.push(buf.slice(0, i));
        buf = buf.slice(i + 1);
      }
    });
    const waitFor = (n: number) =>
      new Promise<void>((res, rej) => {
        const t = setTimeout(() => rej(new Error(`timeout waiting for ${n} lines, got ${lines.length}`)), 8000);
        const tick = () => (lines.length >= n ? (clearTimeout(t), res()) : void setTimeout(tick, 20));
        tick();
      });
    try {
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "s9-test", version: "0" } } }) + "\n");
      await waitFor(1);
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n");
      await waitFor(2);
    } finally {
      child.kill();
    }
    const init = JSON.parse(lines[0]) as { id: number; result: { serverInfo: { name: string }; protocolVersion: string } };
    const tools = JSON.parse(lines[1]) as { id: number; result: { tools: { name: string }[] } };
    expect(init.id).toBe(1);
    expect(init.result.serverInfo.name).toBe("s9_probe");
    expect(tools.id).toBe(2);
    expect(tools.result.tools.map((t) => t.name)).toEqual(["s9_echo"]);
  });
});

describe.skipIf(!process.env.AGENT_STUDIO_LIVE)("S9 capability probe — LIVE (Claude Agent SDK + Codex app-server)", () => {
  it("probeAll 이 18행을 산출해 계약을 만족하고, 픽스처·녹화·사용량을 기록한다", async () => {
    const out = await probeAll({ recordingsDir: RECORDINGS });
    mkdirSync(dirname(FIXTURE), { recursive: true });
    writeFileSync(FIXTURE, JSON.stringify(out, null, 2) + "\n");
    expect(validateResults(out.results)).toEqual([]);
    expect(out.results).toHaveLength(18);
    for (const agent of AGENTS) expect(out.results.filter((r) => r.agent === agent)).toHaveLength(9);
    expect(out.usage.claude.calls + out.usage.codex.calls).toBeGreaterThan(0);
  }, 25 * 60_000);
});
