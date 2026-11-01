/**
 * S7 Step 2~3 — 스킬 로드 증거 3등급 · 자동 선택 재현(U10) · 충돌 실험 4건 (MASTER Phase 00 Task S7, AC-P00-6, V12·V24·V27·V34·V35)
 * (a) C4 설치 검증: 8개 스킬이 ~/.codex/skills 에 원본과 같은 해시로 존재, .system/config.toml/AGENTS.md 불변
 * (b) Codex skills/list{forceReload} → 8개 DISCOVERED (응답 구조 기록)
 * (c) Claude 명시 호출(test-driven-development) → Skill 도구 블록 = LOAD_OBSERVED, 시그니처 매칭
 * (d) Codex 명시 호출({type:"skill"} 입력) → INJECTION_ACCEPTED, 고유 절차 관찰 시 LOAD_OBSERVED
 * (e) 자동 선택: "Fix this bug" / "Plan this feature" × {claude, codex} — 고른 스킬 기록(값은 단언하지 않음)
 * (f) 충돌 실험: TDD(test-driven-development vs tdd) / 디버깅(systematic-debugging vs diagnosing-bugs) / 코드 리뷰(code-review: Codex 단일 패스, Claude 역방향) / 횡단(자동 선택 결과 재사용)
 * 실호출(LIVE)만. 녹화 → spikes/fixtures/{claude-2.1.316,codex-0.166.0}/s7-*.jsonl, 관찰값 → spikes/fixtures/s7-skills-results.json
 */
import { afterAll, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSampleRepo, type SampleRepo } from "../_shared/sampleRepo.js";
import { mask, sanitizeEvents } from "../_shared/mask.js";
import { AppServerClient } from "../s1-codex-app-server/client.js";
import { projectSessionDir } from "../s2-claude-sdk/run.js";
import { gradeClaude, gradeCodex, loadSignature, matchSignature, type Grade } from "./evidence.js";
import { gitCommitAll, gitDiffStat, observationsFromClaude, observationsFromCodex, parseSkillsList, runClaude, runCodex, runTests, writeBugScenario, type ClaudeSummary, type CodexSummary } from "./experiments.js";
import { LEAD_SKILLS, verifyInstalled } from "./install-codex-skills.js";

const LIVE = !!process.env.AGENT_STUDIO_LIVE;
const CLAUDE_FIX = fileURLToPath(new URL("../fixtures/claude-2.1.316/", import.meta.url));
const CODEX_FIX = fileURLToPath(new URL("../fixtures/codex-0.166.0/", import.meta.url));
const RESULTS = fileURLToPath(new URL("../fixtures/s7-skills-results.json", import.meta.url));
const C4_FIXTURE = fileURLToPath(new URL("../fixtures/s7-c4-install.json", import.meta.url));
const CODEX_SKILLS_DIR = join(homedir(), ".codex", "skills");

const observations: Record<string, unknown> = {};
const repos: SampleRepo[] = [];
const sessionDirs: string[] = [];
let codexSkillPaths = new Map<string, { path: string; enabled: unknown }>();
const claudeRepos: Record<string, SampleRepo> = {};
const codexRepos: Record<string, SampleRepo> = {};

function newRepo(label: string): SampleRepo {
  const r = createSampleRepo(`s7-${label}-`);
  writeBugScenario(r.dir);
  repos.push(r);
  sessionDirs.push(projectSessionDir(r.dir));
  return r;
}
function saveClaude(name: string, s: ClaudeSummary) {
  mkdirSync(CLAUDE_FIX, { recursive: true });
  writeFileSync(join(CLAUDE_FIX, `s7-${name}.jsonl`), mask(s.recording.map((e) => JSON.stringify(e)).join("\n") + "\n"));
}
function saveCodex(name: string, s: CodexSummary) {
  mkdirSync(CODEX_FIX, { recursive: true });
  writeFileSync(join(CODEX_FIX, `s7-${name}.jsonl`), mask(sanitizeEvents(s.recording as { msg: unknown }[]).map((e) => JSON.stringify(e)).join("\n") + "\n"));
}
const summarizeClaude = (s: ClaudeSummary) => ({ skillCalls: s.skillCalls, tools: s.toolUses.map((t) => `${t.name}${t.name === "Skill" ? `(${String(t.input.skill ?? "")})` : WRITE_TOOL(t) ? `(${String(t.input.file_path ?? "")})` : t.name === "Bash" ? `(${String(t.input.command ?? "").slice(0, 60)})` : ""}`), numTurns: s.numTurns, durationMs: s.durationMs, resultSubtype: s.resultSubtype, costUsd: s.costUsd, usage: s.usage, finalText: s.finalText.slice(0, 1200) });
const WRITE_TOOL = (t: { name: string }) => ["Write", "Edit", "MultiEdit"].includes(t.name);
const summarizeCodex = (s: CodexSummary) => ({ turnStatus: s.turnStatus, turnError: s.turnError, items: s.items.map((i) => (i.type === "commandExecution" ? `cmd(${(i.command ?? "").slice(0, 70)})=${i.exitCode}` : i.type === "fileChange" ? `fileChange(${(i.paths ?? []).join(",")})` : i.type)), serverRequests: s.serverRequests, durationMs: s.durationMs, usage: s.usage, finalText: s.finalText.slice(0, 1200) });
const skillInput = (name: string) => ({ type: "skill" as const, name, path: codexSkillPaths.get(name)?.path ?? join(CODEX_SKILLS_DIR, name, "SKILL.md") });

const SUM_BUG = "Bug: in calc.js, `sum([1, 2, 3])` returns 5 but must return 6 (see README.md 'Bug'). Tests run with `npm test` (node --test; put tests in *.test.mjs files). Do not touch stats.js. Finish with a one-line report.";
const MEDIAN_BUG = "Bug: in stats.js, `median([1, 2, 3, 4])` returns 3 but must return 2.5 (see README.md 'Bug'). Tests run with `npm test` (node --test; put tests in *.test.mjs files). Do not touch calc.js. Finish with a short report that names the root cause.";
const PLAN_FEATURE = "Plan this feature (planning only — do not implement, do not edit index.js): add a `--json` flag so that `node index.js --json 2 3` prints {\"result\":5}. Write the plan as a markdown file inside this repository and finish with a one-line report naming the file.";

describe.skipIf(!LIVE)("S7 skills evidence / auto-selection / conflict experiments (LIVE)", () => {
  afterAll(async () => {
    for (const r of repos) r.cleanup();
    for (const d of sessionDirs) if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    observations.cleanup = { repos: repos.length, sessionDirsRemoved: sessionDirs.length };
    writeFileSync(RESULTS, mask(JSON.stringify(observations, null, 2)) + "\n");
  }, 120_000);

  it("(a) C4: 주도 스킬 8종이 ~/.codex/skills 에 원본 해시 그대로 설치돼 있고 .system/config.toml/AGENTS.md는 불변이다(V35)", () => {
    expect(existsSync(C4_FIXTURE), "install fixture — run `npx tsx spikes/s7-skills/install-codex-skills.ts` first").toBe(true);
    const fixture = JSON.parse(readFileSync(C4_FIXTURE, "utf8")) as { invariance: { before: Record<string, string>; after: Record<string, string> } };
    const v = verifyInstalled();
    observations.c4 = { verified: v, fixtureInvariance: fixture.invariance };
    for (const name of LEAD_SKILLS) {
      expect(v.skills[name]?.installed, `${name} installed`).toBe(true);
      expect(v.skills[name]?.treeMatchesSource, `${name} tree == source`).toBe(true);
      expect(v.skills[name]?.treeMatchesFixture, `${name} tree == fixture`).toBe(true);
    }
    expect(v.invariance.now, "invariance now == before install").toEqual(fixture.invariance.before);
    expect(fixture.invariance.after).toEqual(fixture.invariance.before);
    expect(v.openaiYamlSkipped, "agents/openai.yaml not copied").toBe(true);
  });

  it("(b) Codex skills/list{forceReload:true}에 8개가 모두 나타난다 → DISCOVERED", async () => {
    const client = new AppServerClient({ label: "s7-skills-list", configOverrides: ["features.memories=false"] });
    try {
      await client.initialize();
      const raw = await client.skillsList([], true);
      const parsed = parseSkillsList(raw);
      codexSkillPaths = parsed.byName;
      const sample = JSON.stringify(raw).slice(0, 1500);
      observations.skillsList = { names: parsed.names, responseSample: sample, grades: Object.fromEntries(LEAD_SKILLS.map((n) => [n, gradeCodex({ listed: parsed.names.includes(n), injection: null, skillReadObserved: false, procedureObserved: false })])) };
      mkdirSync(CODEX_FIX, { recursive: true });
      writeFileSync(join(CODEX_FIX, "s7-skills-list.json"), mask(JSON.stringify(raw, null, 2)) + "\n");
      for (const n of LEAD_SKILLS) expect(parsed.names, n).toContain(n);
      expect(parsed.names.some((n) => n === "brainstorming"), "brainstorming is not installed for codex").toBe(false);
    } finally {
      await client.close();
    }
  }, 120_000);

  it("(c) Claude 명시 호출: test-driven-development → Skill 도구 블록 관찰(LOAD_OBSERVED), 시그니처 매칭", async () => {
    const repo = newRepo("claude-tdd");
    claudeRepos.tdd = repo;
    const s = await runClaude({ label: "claude-explicit-tdd", cwd: repo.dir, prompt: `Use the test-driven-development skill (invoke it with the Skill tool before doing anything else) and follow it strictly. ${SUM_BUG}` });
    saveClaude("claude-explicit-tdd", s);
    const grade: Grade = gradeClaude({ skill: "test-driven-development", initSkills: s.initSkills, explicit: true, toolUses: s.toolUses.map((t) => ({ name: t.name, input: t.input, isError: t.isError })) });
    const obs = observationsFromClaude(s.toolUses, repo.dir);
    const sig = loadSignature("test-driven-development");
    const match = matchSignature(sig, obs);
    const tests = runTests(repo.dir);
    const commit = gitCommitAll(repo.dir, "fix: sum (claude, test-driven-development)");
    observations.claudeExplicitTdd = { grade, discoveredInInit: s.initSkills.includes("test-driven-development"), observations: obs, signatureMatch: match, testsAfter: tests, commit, diffStat: gitDiffStat(repo.dir), ...summarizeClaude(s) };
    expect(s.initSkills).toContain("test-driven-development");
    expect(grade).toBe("LOAD_OBSERVED");
    expect(tests.exitCode, tests.output).toBe(0);
  }, 12 * 60_000);

  it("(d) Codex 명시 호출: {type:\"skill\"} 입력 수락(INJECTION_ACCEPTED) → 고유 절차 관찰 시 LOAD_OBSERVED", async () => {
    const repo = newRepo("codex-tdd");
    codexRepos.tdd = repo;
    const s = await runCodex({ label: "codex-explicit-tdd", cwd: repo.dir, input: [{ type: "text", text: `$test-driven-development Follow the test-driven-development skill strictly (failing test first, watch it fail, minimal fix, watch it pass). ${SUM_BUG}` }, skillInput("test-driven-development")] });
    saveCodex("codex-explicit-tdd", s);
    const obs = observationsFromCodex(s.items, repo.dir, LEAD_SKILLS);
    const sig = loadSignature("test-driven-development");
    const match = matchSignature(sig, obs);
    const injection = s.turnError ? "rejected" : "accepted";
    const skillReadObserved = obs.some((o) => o.value === "skill_invoked:test-driven-development");
    const grade = gradeCodex({ listed: codexSkillPaths.has("test-driven-development"), injection, skillReadObserved, procedureObserved: match.inOrder && match.missingRequired.length === 0 });
    const tests = runTests(repo.dir);
    const commit = gitCommitAll(repo.dir, "fix: sum (codex, test-driven-development)");
    observations.codexExplicitTdd = { grade, injection, skillReadObserved, observations: obs, signatureMatch: match, testsAfter: tests, commit, diffStat: gitDiffStat(repo.dir), skillPath: skillInput("test-driven-development").path, ...summarizeCodex(s) };
    expect(s.turnStatus).toBe("completed");
    expect(["INJECTION_ACCEPTED", "LOAD_OBSERVED"]).toContain(grade);
    expect(tests.exitCode, tests.output).toBe(0);
  }, 12 * 60_000);

  it("(e) 자동 선택(U10): 스킬 이름 없는 프롬프트 2종 × 2 에이전트 — 고른 스킬을 기록한다", async () => {
    const rows: Record<string, unknown>[] = [];
    for (const [kind, prompt, expected] of [["fix", SUM_BUG, "systematic-debugging|test-driven-development"], ["plan", PLAN_FEATURE, "writing-plans"]] as const) {
      const cr = newRepo(`claude-auto-${kind}`);
      const cs = await runClaude({ label: `claude-auto-${kind}`, cwd: cr.dir, prompt });
      saveClaude(`claude-auto-${kind}`, cs);
      rows.push({ agent: "claude", kind, expectedLead: expected, chosen: cs.skillCalls, matchesExpected: cs.skillCalls.some((c) => new RegExp(`^(${expected})$`).test(c)), dirty: cr.status(), ...summarizeClaude(cs) });
      const xr = newRepo(`codex-auto-${kind}`);
      const xs = await runCodex({ label: `codex-auto-${kind}`, cwd: xr.dir, input: [{ type: "text", text: prompt }] });
      saveCodex(`codex-auto-${kind}`, xs);
      const obs = observationsFromCodex(xs.items, xr.dir, LEAD_SKILLS);
      const chosen = [...new Set(obs.filter((o) => o.value.startsWith("skill_invoked:")).map((o) => o.value.slice("skill_invoked:".length)))];
      const mentioned = LEAD_SKILLS.filter((n) => xs.finalText.includes(n) || xs.items.some((i) => (i.text ?? "").includes(n)));
      rows.push({ agent: "codex", kind, expectedLead: expected, chosen, mentionedSkills: mentioned, matchesExpected: chosen.some((c) => new RegExp(`^(${expected})$`).test(c)), dirty: xr.status(), ...summarizeCodex(xs) });
    }
    observations.autoSelection = rows;
    for (const r of rows) {
      expect(Array.isArray(r.chosen)).toBe(true);
      expect(typeof r.matchesExpected).toBe("boolean");
    }
  }, 40 * 60_000);

  it("(f1) 충돌 실험 TDD: 같은 버그를 Claude가 tdd(mattpocock) 스킬로 수정 — (c)와 테스트 선행·재작업 비교", async () => {
    const repo = newRepo("claude-mp-tdd");
    const s = await runClaude({ label: "claude-explicit-mp-tdd", cwd: repo.dir, prompt: `Use the tdd skill (invoke it with the Skill tool before doing anything else) and follow it strictly. ${SUM_BUG}` });
    saveClaude("claude-explicit-mp-tdd", s);
    const obs = observationsFromClaude(s.toolUses, repo.dir);
    const grade = gradeClaude({ skill: "tdd", initSkills: s.initSkills, explicit: true, toolUses: s.toolUses.map((t) => ({ name: t.name, input: t.input, isError: t.isError })) });
    const tests = runTests(repo.dir);
    observations.conflictTdd = { grade, observations: obs, signatureMatchWithSuperpowersSignature: matchSignature(loadSignature("test-driven-development"), obs), testsAfter: tests, diffStat: (gitCommitAll(repo.dir, "fix: sum (claude, tdd)"), gitDiffStat(repo.dir)), ...summarizeClaude(s) };
    expect(["LOAD_OBSERVED", "INJECTION_ACCEPTED", "FAILED"]).toContain(grade);
  }, 12 * 60_000);

  it("(f2) 충돌 실험 디버깅: 재현 가능한 버그 1건을 systematic-debugging / diagnosing-bugs 로 각각 수정", async () => {
    const rows: Record<string, unknown>[] = [];
    for (const skill of ["systematic-debugging", "diagnosing-bugs"] as const) {
      const repo = newRepo(`claude-${skill}`);
      const s = await runClaude({ label: `claude-explicit-${skill}`, cwd: repo.dir, prompt: `Use the ${skill} skill (invoke it with the Skill tool before doing anything else) and follow it strictly. ${MEDIAN_BUG}` });
      saveClaude(`claude-explicit-${skill}`, s);
      const obs = observationsFromClaude(s.toolUses, repo.dir);
      const grade = gradeClaude({ skill, initSkills: s.initSkills, explicit: true, toolUses: s.toolUses.map((t) => ({ name: t.name, input: t.input, isError: t.isError })) });
      const firstTestWrite = obs.find((o) => o.kind === "artifact" && /\.test\./.test(o.value))?.seq ?? null;
      const firstEdit = obs.find((o) => o.kind === "artifact" && !/\.test\./.test(o.value))?.seq ?? null; // 구현 파일 첫 편집(테스트 파일 제외)
      const firstRepro = obs.find((o) => o.kind === "event" && /^command:.*(node|npm)/.test(o.value))?.seq ?? null;
      const tests = runTests(repo.dir);
      gitCommitAll(repo.dir, `fix: median (claude, ${skill})`);
      rows.push({ skill, grade, reproducedBeforeSourceEdit: firstRepro !== null && firstEdit !== null && firstRepro < firstEdit, firstRepro, firstTestWrite, firstSourceEdit: firstEdit, rootCauseNamed: /root cause|mid|middle|even/i.test(s.finalText), signatureMatch: matchSignature(loadSignature(skill === "systematic-debugging" ? "systematic-debugging" : "systematic-debugging"), obs), testsAfter: tests, diffStat: gitDiffStat(repo.dir), observations: obs, ...summarizeClaude(s) });
    }
    observations.conflictDebug = rows;
    for (const r of rows) expect(["LOAD_OBSERVED", "INJECTION_ACCEPTED", "FAILED"]).toContain(r.grade as string);
  }, 25 * 60_000);

  it("(f3) 충돌 실험 코드 리뷰: Codex가 code-review 스킬로 Claude 구현을 단일 패스 리뷰 / Claude가 code-review 스킬로 Codex 구현을 리뷰", async () => {
    const reviewPrompt = (who: string) => `Review the changes since HEAD~1 in this repository along the two axes of the code-review skill: Standards and Spec. The spec is the 'Bug' section of README.md. ${who} Present the result under '## Standards' and '## Spec' headings. Do not modify any file.`;
    const cRepo = claudeRepos.tdd;
    const xRepo = codexRepos.tdd;
    expect(cRepo && xRepo, "(c)·(d) repos").toBeTruthy();
    const xs = await runCodex({ label: "codex-code-review", cwd: cRepo.dir, input: [{ type: "text", text: `$code-review ${reviewPrompt("No sub-agents are available in this session: run both axes yourself, sequentially.")}` }, skillInput("code-review")] });
    saveCodex("codex-code-review", xs);
    const xObs = observationsFromCodex(xs.items, cRepo.dir, LEAD_SKILLS);
    const xReviewMatch = matchSignature(loadSignature("code-review"), xObs); // 리뷰 #3: 헤딩은 프롬프트가 요구했으므로 독립 신호가 아님
    const cs = await runClaude({ label: "claude-code-review", cwd: xRepo.dir, prompt: `Use the code-review skill (invoke it with the Skill tool first). ${reviewPrompt("")}` });
    saveClaude("claude-code-review", cs);
    const subagentTools = cs.toolUses.filter((t) => t.name === "Task" || t.name === "Agent").length;
    observations.conflictReview = {
      codex: { grade: gradeCodex({ listed: codexSkillPaths.has("code-review"), injection: xs.turnError ? "rejected" : "accepted", skillReadObserved: xObs.some((o) => o.value === "skill_invoked:code-review"), procedureObserved: xReviewMatch.inOrder && xReviewMatch.missingRequired.length === 0 }), signatureMatch: xReviewMatch, headingsRequestedByPrompt: true, hasStandards: /## Standards/.test(xs.finalText), hasSpec: /## Spec/.test(xs.finalText), observations: xObs, dirty: cRepo.status(), ...summarizeCodex(xs) },
      claude: { grade: gradeClaude({ skill: "code-review", initSkills: cs.initSkills, explicit: true, toolUses: cs.toolUses.map((t) => ({ name: t.name, input: t.input, isError: t.isError })) }), signatureMatch: matchSignature(loadSignature("code-review"), observationsFromClaude(cs.toolUses, xRepo.dir)), hasStandards: /## Standards/.test(cs.finalText), hasSpec: /## Spec/.test(cs.finalText), subagentCalls: subagentTools, dirty: xRepo.status(), ...summarizeClaude(cs) },
    };
    expect(xs.turnStatus).toBe("completed");
    expect(cRepo.status(), "codex review must not modify files").toEqual([]);
    expect(xRepo.status(), "claude review must not modify files").toEqual([]);
  }, 25 * 60_000);
});
