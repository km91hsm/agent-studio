/**
 * S7 — C4: Codex 주도 스킬 8종 설치(폴더 전체 복사, `agents/openai.yaml` 생략) + 해시표 + 환경 불변 증명(.system/config.toml/AGENTS.md 전후 해시).
 * CLI: npx tsx spikes/s7-skills/install-codex-skills.ts [--dry-run]   → spikes/fixtures/s7-c4-install.json
 * 규칙: 대상 폴더가 이미 있으면 설치하지 않는다(사용자 설치본 덮어쓰기 금지). 삭제는 하지 않는다(CONFLICT §4 2항).
 */
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const LEAD_SKILLS = ["writing-plans", "executing-plans", "test-driven-development", "systematic-debugging", "code-review", "writing-skills", "frontend-design", "ui-ux-pro-max"] as const;
export type LeadSkill = (typeof LEAD_SKILLS)[number];

/** 출처(D:\LLM\claude-skills\SOURCES.md 2026-11-01) — skill_id = <repo>/<name>, skill_commit = 출처 커밋 */
export const SKILL_SOURCE: Record<string, { repo: string; commit: string }> = {
  "writing-plans": { repo: "obra/superpowers", commit: "2ce8aa1" },
  "executing-plans": { repo: "obra/superpowers", commit: "2ce8aa1" },
  "test-driven-development": { repo: "obra/superpowers", commit: "2ce8aa1" },
  "systematic-debugging": { repo: "obra/superpowers", commit: "2ce8aa1" },
  "writing-skills": { repo: "obra/superpowers", commit: "2ce8aa1" },
  brainstorming: { repo: "obra/superpowers", commit: "2ce8aa1" },
  "code-review": { repo: "mattpocock/skills", commit: "4ae2317" },
  "frontend-design": { repo: "anthropics/skills", commit: "ca45fc4" },
  "ui-ux-pro-max": { repo: "nextlevelbuilder/ui-ux-pro-max-skill", commit: "3a13158" },
};

export const SOURCE_ROOT = process.env.AGENT_STUDIO_SKILLS_SOURCE ?? "D:/LLM/claude-skills/skills";
export const CODEX_HOME = process.env.CODEX_HOME ?? join(homedir(), ".codex");
export const CODEX_SKILLS_DIR = join(CODEX_HOME, "skills");
/** 복사하지 않는 파일(C4: `agents/openai.yaml` 생략) */
export const SKIP_REL = new Set(["agents/openai.yaml"]);
const FIXTURE = fileURLToPath(new URL("../fixtures/s7-c4-install.json", import.meta.url));

export interface TreeHash {
  files: { rel: string; sha256: string; bytes: number }[];
  treeSha256: string;
}

export function hashTree(dir: string, skip: Set<string> = new Set()): TreeHash {
  const files: TreeHash["files"] = [];
  const walk = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      const rel = relative(dir, p).split(sep).join("/");
      if (statSync(p).isDirectory()) walk(p);
      else if (!skip.has(rel)) files.push({ rel, sha256: createHash("sha256").update(readFileSync(p)).digest("hex"), bytes: statSync(p).size });
    }
  };
  if (existsSync(dir)) walk(dir);
  const treeSha256 = createHash("sha256").update(files.map((f) => `${f.sha256}  ${f.rel}\n`).join("")).digest("hex");
  return { files, treeSha256 };
}

const fileSha = (p: string) => (existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : null);

/** 환경 불변 증명 대상: ~/.codex/config.toml, ~/.codex/AGENTS.md, ~/.codex/skills/.system 트리 */
export function invarianceHashes(): Record<string, string | null> {
  return {
    "config.toml": fileSha(join(CODEX_HOME, "config.toml")),
    "AGENTS.md": fileSha(join(CODEX_HOME, "AGENTS.md")),
    ".system": hashTree(join(CODEX_SKILLS_DIR, ".system")).treeSha256,
  };
}

export interface InstallFixture {
  installedAt: string;
  sourceRoot: string;
  codexSkillsDir: string;
  skippedRel: string[];
  skills: Record<string, { source: { repo: string; commit: string }; treeSha256: string; files: TreeHash["files"]; skippedFiles: string[] }>;
  invariance: { before: Record<string, string | null>; after: Record<string, string | null> };
}

export function installCodexSkills(opts: { dryRun?: boolean } = {}): InstallFixture {
  const before = invarianceHashes();
  for (const name of LEAD_SKILLS) {
    if (!existsSync(join(SOURCE_ROOT, name, "SKILL.md"))) throw new Error(`source missing: ${join(SOURCE_ROOT, name)}`);
    if (existsSync(join(CODEX_SKILLS_DIR, name))) throw new Error(`destination exists, refusing to overwrite: ${join(CODEX_SKILLS_DIR, name)}`);
  }
  const skills: InstallFixture["skills"] = {};
  for (const name of LEAD_SKILLS) {
    const src = join(SOURCE_ROOT, name);
    const dst = join(CODEX_SKILLS_DIR, name);
    const skippedFiles = hashTree(src).files.map((f) => f.rel).filter((r) => SKIP_REL.has(r));
    if (!opts.dryRun) {
      mkdirSync(dst, { recursive: true });
      cpSync(src, dst, { recursive: true, filter: (s) => !SKIP_REL.has(relative(src, s).split(sep).join("/")) });
    }
    const tree = hashTree(opts.dryRun ? src : dst, SKIP_REL);
    skills[name] = { source: SKILL_SOURCE[name], treeSha256: tree.treeSha256, files: tree.files, skippedFiles };
  }
  const after = invarianceHashes();
  return { installedAt: new Date().toISOString(), sourceRoot: SOURCE_ROOT, codexSkillsDir: CODEX_SKILLS_DIR, skippedRel: [...SKIP_REL], skills, invariance: { before, after } };
}

export interface VerifyResult {
  skills: Record<string, { installed: boolean; treeSha256: string | null; treeMatchesSource: boolean; treeMatchesFixture: boolean; fileCount: number }>;
  invariance: { now: Record<string, string | null> };
  openaiYamlSkipped: boolean;
}

export function verifyInstalled(): VerifyResult {
  const fixture = existsSync(FIXTURE) ? (JSON.parse(readFileSync(FIXTURE, "utf8")) as InstallFixture) : null;
  const skills: VerifyResult["skills"] = {};
  let openaiYamlSkipped = true;
  for (const name of LEAD_SKILLS) {
    const dst = join(CODEX_SKILLS_DIR, name);
    const installed = existsSync(join(dst, "SKILL.md"));
    const dstTree = installed ? hashTree(dst) : null;
    const srcTree = hashTree(join(SOURCE_ROOT, name), SKIP_REL);
    for (const r of SKIP_REL) if (existsSync(join(dst, r))) openaiYamlSkipped = false;
    skills[name] = { installed, treeSha256: dstTree?.treeSha256 ?? null, treeMatchesSource: !!dstTree && dstTree.treeSha256 === srcTree.treeSha256, treeMatchesFixture: !!dstTree && !!fixture && fixture.skills[name]?.treeSha256 === dstTree.treeSha256, fileCount: dstTree?.files.length ?? 0 };
  }
  return { skills, invariance: { now: invarianceHashes() }, openaiYamlSkipped };
}

/** JSON 문자열 안의 홈 경로(JSON 이스케이프 `C:\\Users\\<u>`·슬래시형·원형) → `<home>` */
export function maskHome(jsonText: string): string {
  const h = homedir();
  const forms = [JSON.stringify(h).slice(1, -1), h.replace(/\\/g, "/"), h];
  let out = jsonText;
  for (const f of forms) out = out.split(f).join("<home>");
  return out;
}

// ---- CLI ----
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dryRun = process.argv.includes("--dry-run");
  const fx = installCodexSkills({ dryRun });
  if (!dryRun) writeFileSync(FIXTURE, maskHome(JSON.stringify(fx, null, 2)) + "\n");
  console.log(`| 스킬 | 출처 | 파일 수 | treeSha256 | 생략 |`);
  console.log(`|---|---|---|---|---|`);
  for (const [n, s] of Object.entries(fx.skills)) console.log(`| ${n} | ${s.source.repo}@${s.source.commit} | ${s.files.length} | \`${s.treeSha256.slice(0, 16)}…\` | ${s.skippedFiles.join(", ") || "—"} |`);
  console.log(`invariance before==after: ${JSON.stringify(fx.invariance.before) === JSON.stringify(fx.invariance.after)}`);
  console.log(dryRun ? "(dry-run: nothing copied)" : `installed → ${CODEX_SKILLS_DIR}; fixture → ${FIXTURE}`);
}
