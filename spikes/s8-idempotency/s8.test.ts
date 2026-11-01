/**
 * S8 — 중복 적용 방지 스파이크 (MASTER Task S8, AC-P00-8, DATABASE_SCHEMA §3 Idempotency Key, D16, RC-S13)
 * 순수 로직 + 자식 프로세스 크래시 재현(에이전트 호출 없음) → CI에서 실행된다.
 *   file_patch: (경로, base blob, target blob, patch 해시) 3분기 — 현재 blob=target → done / =base → reapply_with_approval / 그 외 → conflict
 *   git_commit: intent 에 예상 parent·tree, outbox 에 생성 SHA. 기록 SHA 가 존재하고 parent·tree 가 일치 → done(재커밋 금지);
 *               SHA 미기록이지만 HEAD 의 parent·tree 가 일치 → done(SHA 복구); parent=HEAD → reapply_with_approval; 그 외 conflict
 *   net/mcp/external_service: external_ref 없으면 unverifiable — 자동 건너뛰기·자동 재시도 금지, 사용자 대조(resolveUnverifiable)로만 해소
 * Codex 리뷰(docs/reviews/codex/S8) 반영: #1 unverifiable 전이 봉쇄, #2 committed 라도 SHA 존재 확인, #3 tree 대조, #4 크래시 단언(플랫폼별), #5 분기마다 파일·원장 사후 상태
 */
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSampleRepo, type SampleRepo } from "../_shared/sampleRepo.js";
import { EffectLedger, blobOf, type Decision, type GitCommitSpec } from "./effects.js";

const WORKER = fileURLToPath(new URL("./worker.ts", import.meta.url));
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FILE = "index.js";
const TARGET_CONTENT = "export function add(a, b) {\n  return a + b; // patched by s8\n}\n";

let repo: SampleRepo | null = null;
let scratch: string | null = null;
afterEach(() => {
  repo?.cleanup();
  repo = null;
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  scratch = null;
});

function setup() {
  repo = createSampleRepo("s8-");
  scratch = mkdtempSync(join(tmpdir(), "s8-ledger-"));
  const ledgerFile = join(scratch, "effects.json");
  const base = repo.blob(FILE);
  const target = blobOf(Buffer.from(TARGET_CONTENT));
  return { repo, ledgerFile, base, target, patchHash: blobOf(Buffer.from(`${base}->${target}`)) };
}

const git = (dir: string, ...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
/** `assessGitCommit` 에 주입하는 저장소 조회: 커밋 SHA → { parents, tree } (없으면 null) */
function gitInspector(dir: string) {
  return (sha: string) => {
    try {
      const [tree, ...parents] = git(dir, "show", "-s", "--format=%T %P", sha).split(/\s+/).filter(Boolean);
      return { parents, tree };
    } catch {
      return null;
    }
  };
}
const headOf = (dir: string) => git(dir, "rev-parse", "HEAD");
const treeOf = (dir: string, rev = "HEAD") => git(dir, "rev-parse", `${rev}^{tree}`);
const commitCount = (dir: string) => git(dir, "rev-list", "--count", "HEAD");

type Crash = SpawnSyncReturns<string>;
/** 자식 프로세스에서 시나리오를 수행하고 commit() 전에 SIGKILL — 비정상 종료 코드를 반환해야 한다 */
function runWorker(scenario: string, repoDir: string, ledgerFile: string): Crash {
  return spawnSync(process.execPath, ["--import", "tsx", WORKER, scenario, repoDir, ledgerFile, FILE], { cwd: REPO_ROOT, encoding: "utf8", timeout: 60_000 });
}
/** 리뷰 #4: spawn 오류·타임아웃이 아니라 SIGKILL 로 죽었음을 플랫폼별로 단언 (Windows TerminateProcess → status 1, POSIX → signal SIGKILL) */
function expectCrashed(r: Crash) {
  expect(r.error, "spawn error").toBeUndefined();
  expect(r.stdout).toContain("crashing before ledger.commit()");
  if (process.platform === "win32") {
    expect(r.status).toBe(1);
    expect(r.signal).toBeNull();
  } else {
    expect(r.signal).toBe("SIGKILL");
    expect(r.status).toBeNull();
  }
}
const lastDecision = (ledgerFile: string, key: string) => {
  const e = EffectLedger.load(ledgerFile).get(key);
  return { state: e?.state, decision: e?.assessments.at(-1)?.decision, result: e?.result };
};

describe("S8 EffectLedger — 원장 영속·동일 키 거부 (CI)", () => {
  it("intend 는 파일에 즉시 영속되고 다른 인스턴스가 intended 로 읽는다; 같은 키의 intend 는 거부된다", () => {
    const { ledgerFile, base, target, patchHash } = setup();
    const a = new EffectLedger(ledgerFile);
    a.intend("fp-1", { kind: "file_patch", path: FILE, baseBlob: base, targetBlob: target, patchHash, fileMode: "100644" });
    const b = EffectLedger.load(ledgerFile);
    expect(b.get("fp-1")?.state).toBe("intended");
    expect(() => b.intend("fp-1", { kind: "file_patch", path: FILE, baseBlob: base, targetBlob: target, patchHash, fileMode: "100644" })).toThrow(/duplicate idempotency key/);
    b.commit("fp-1");
    expect(EffectLedger.load(ledgerFile).get("fp-1")?.state).toBe("committed");
  });

  it("file_patch assess 3분기: blob=target → done(원장은 committed 로), =base → reapply_with_approval, 그 외 → conflict (순수)", () => {
    const { ledgerFile, base, target, patchHash } = setup();
    const mk = (key: string) => {
      const l = new EffectLedger(ledgerFile);
      l.intend(key, { kind: "file_patch", path: FILE, baseBlob: base, targetBlob: target, patchHash, fileMode: "100644" });
      return l;
    };
    const l = mk("k-done");
    expect(l.assess("k-done", target)).toBe<Decision>("done");
    expect(l.get("k-done")?.state).toBe("committed");
    mk("k-base");
    expect(EffectLedger.load(ledgerFile).assess("k-base", base)).toBe<Decision>("reapply_with_approval");
    expect(lastDecision(ledgerFile, "k-base")).toMatchObject({ state: "intended", decision: "reapply_with_approval" });
    mk("k-other");
    expect(EffectLedger.load(ledgerFile).assess("k-other", blobOf(Buffer.from("someone else edited\n")))).toBe<Decision>("conflict");
    expect(lastDecision(ledgerFile, "k-other")).toMatchObject({ state: "intended", decision: "conflict" });
  });

  it("external 효과(net/mcp/external_service)는 external_ref 가 없으면 unverifiable — 자동 처리 금지", () => {
    const { ledgerFile } = setup();
    const l = new EffectLedger(ledgerFile);
    l.intend("net-1", { kind: "net", target: "https://example.invalid/api", externalRef: null });
    expect(l.assessExternal("net-1")).toBe<Decision>("unverifiable");
    expect(l.get("net-1")?.state).toBe("unverifiable");
    l.intend("net-2", { kind: "external_service", target: "provider", externalRef: "idem-abc" });
    expect(l.assessExternal("net-2", (ref) => ref === "idem-abc")).toBe<Decision>("done");
  });

  it("리뷰 #1: unverifiable 이 된 효과는 검증기를 나중에 줘도·commit() 으로도 자동 전이되지 않고, 사용자 대조(resolveUnverifiable)로만 해소된다", () => {
    const { ledgerFile } = setup();
    const l = new EffectLedger(ledgerFile);
    l.intend("mcp-1", { kind: "mcp", target: "server/tool", externalRef: "ref-1" });
    expect(l.assessExternal("mcp-1")).toBe<Decision>("unverifiable"); // 검증기 없음
    expect(EffectLedger.load(ledgerFile).assessExternal("mcp-1", () => true)).toBe<Decision>("unverifiable"); // 재평가 금지
    expect(EffectLedger.load(ledgerFile).get("mcp-1")?.state).toBe("unverifiable");
    expect(() => EffectLedger.load(ledgerFile).commit("mcp-1")).toThrow(/unverifiable/);
    const r = EffectLedger.load(ledgerFile);
    r.resolveUnverifiable("mcp-1", { outcome: "done", by: "user" });
    expect(lastDecision(ledgerFile, "mcp-1")).toMatchObject({ state: "committed", decision: "done" });
    expect(() => r.resolveUnverifiable("mcp-1", { outcome: "failed", by: "user" })).toThrow(/not unverifiable/);
  });
});

describe("S8 크래시 재현 — 자식 프로세스가 commit() 전에 죽는다 (CI, git 필요)", () => {
  it("(A) 패치 적용 후 크래시 → 재기동 assess = done, 파일은 재적용되지 않는다(내용·mtime 불변, 중복 적용 0)", () => {
    const { repo, ledgerFile, target } = setup();
    expectCrashed(runWorker("patch-then-crash", repo.dir, ledgerFile));
    expect(readFileSync(join(repo.dir, FILE), "utf8")).toBe(TARGET_CONTENT);
    const before = statSync(join(repo.dir, FILE)).mtimeMs;
    const ledger = EffectLedger.load(ledgerFile);
    expect(ledger.get("fp-crash")?.state).toBe("intended");
    expect(ledger.assess("fp-crash", repo.blob(FILE))).toBe<Decision>("done");
    expect(repo.blob(FILE)).toBe(target);
    expect(statSync(join(repo.dir, FILE)).mtimeMs).toBe(before);
    expect(lastDecision(ledgerFile, "fp-crash")).toMatchObject({ state: "committed", decision: "done" });
  });

  it("(B) 적용 전 크래시 → assess = reapply_with_approval (자동 재적용 없음, 파일은 base 그대로, 원장 intended 유지)", () => {
    const { repo, ledgerFile, base } = setup();
    expectCrashed(runWorker("crash-before-apply", repo.dir, ledgerFile));
    expect(repo.blob(FILE)).toBe(base);
    expect(EffectLedger.load(ledgerFile).get("fp-crash")?.state).toBe("intended");
    expect(EffectLedger.load(ledgerFile).assess("fp-crash", repo.blob(FILE))).toBe<Decision>("reapply_with_approval");
    expect(repo.blob(FILE)).toBe(base);
    expect(lastDecision(ledgerFile, "fp-crash")).toMatchObject({ state: "intended", decision: "reapply_with_approval" });
  });

  it("(C) 적용 전 크래시 + 그 사이 다른 변경 → assess = conflict (보류, 파일·원장 불변)", () => {
    const { repo, ledgerFile } = setup();
    expectCrashed(runWorker("crash-before-apply", repo.dir, ledgerFile));
    writeFileSync(join(repo.dir, FILE), "export const add = (a, b) => a - b; // concurrent edit\n");
    const foreign = repo.blob(FILE);
    expect(EffectLedger.load(ledgerFile).get("fp-crash")?.state).toBe("intended");
    expect(EffectLedger.load(ledgerFile).assess("fp-crash", foreign)).toBe<Decision>("conflict");
    expect(repo.blob(FILE)).toBe(foreign);
    expect(lastDecision(ledgerFile, "fp-crash")).toMatchObject({ state: "intended", decision: "conflict" });
  });

  it("(D) git_commit outbox: 커밋 생성·SHA 기록 후 크래시 → 재기동 시 SHA 존재 + parent·tree 일치 → done, 재커밋하지 않는다(HEAD·커밋 수 불변)", () => {
    const { repo, ledgerFile } = setup();
    const parent = headOf(repo.dir);
    expectCrashed(runWorker("commit-then-crash", repo.dir, ledgerFile));
    expect(commitCount(repo.dir)).toBe("2");
    const ledger = EffectLedger.load(ledgerFile);
    const entry = ledger.get("gc-crash");
    expect(entry?.state).toBe("intended");
    const spec = entry?.spec as GitCommitSpec;
    expect(spec.parentSha).toBe(parent);
    expect(spec.treeSha).toBe(treeOf(repo.dir)); // 리뷰 #3: 예상 tree 가 intent 필수값
    const sha = (entry?.result as { sha?: string } | undefined)?.sha;
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
    expect(ledger.assessGitCommit("gc-crash", { headSha: headOf(repo.dir), inspect: gitInspector(repo.dir) })).toBe<Decision>("done");
    expect(commitCount(repo.dir)).toBe("2");
    expect(headOf(repo.dir)).toBe(sha);
    expect(lastDecision(ledgerFile, "gc-crash")).toMatchObject({ state: "committed", decision: "done" });
  });

  it("(D2) 리뷰 #2: 원장이 committed 라도 기록 SHA 가 저장소에 없으면 done 이 아니라 conflict(보류)", () => {
    const { repo, ledgerFile } = setup();
    expectCrashed(runWorker("commit-then-crash", repo.dir, ledgerFile));
    const l = EffectLedger.load(ledgerFile);
    l.commit("gc-crash");
    expect(EffectLedger.load(ledgerFile).assessGitCommit("gc-crash", { headSha: headOf(repo.dir), inspect: gitInspector(repo.dir) })).toBe<Decision>("done");
    // SHA 소실(예: 저장소 교체·gc) — 조회가 null 을 돌려주면 자동 done 금지
    expect(EffectLedger.load(ledgerFile).assessGitCommit("gc-crash", { headSha: headOf(repo.dir), inspect: () => null })).toBe<Decision>("conflict");
    expect(lastDecision(ledgerFile, "gc-crash")).toMatchObject({ decision: "conflict" });
    expect(commitCount(repo.dir)).toBe("2");
  });

  it("(E) git_commit outbox: 커밋 전 크래시(SHA 없음) → parent=HEAD 면 reapply_with_approval, HEAD 가 움직였으면 conflict — 원장 intended 유지", () => {
    const { repo, ledgerFile } = setup();
    expectCrashed(runWorker("crash-before-commit", repo.dir, ledgerFile));
    expect(commitCount(repo.dir)).toBe("1");
    expect(EffectLedger.load(ledgerFile).get("gc-crash")).toMatchObject({ state: "intended", result: null });
    expect(EffectLedger.load(ledgerFile).assessGitCommit("gc-crash", { headSha: headOf(repo.dir), inspect: gitInspector(repo.dir) })).toBe<Decision>("reapply_with_approval");
    expect(lastDecision(ledgerFile, "gc-crash")).toMatchObject({ state: "intended", decision: "reapply_with_approval" });
    writeFileSync(join(repo.dir, "README.md"), "moved\n");
    git(repo.dir, "add", "-A");
    git(repo.dir, "commit", "-q", "-m", "someone else");
    expect(EffectLedger.load(ledgerFile).assessGitCommit("gc-crash", { headSha: headOf(repo.dir), inspect: gitInspector(repo.dir) })).toBe<Decision>("conflict");
    expect(lastDecision(ledgerFile, "gc-crash")).toMatchObject({ state: "intended", decision: "conflict" });
    expect(commitCount(repo.dir)).toBe("2");
  });

  it("(F) git_commit outbox: 커밋은 됐는데 SHA 기록 전 크래시 → HEAD 의 parent·tree 가 intent 와 일치 → done(SHA 복구), 재커밋하지 않는다", () => {
    const { repo, ledgerFile } = setup();
    expectCrashed(runWorker("commit-then-crash-before-record", repo.dir, ledgerFile));
    expect(commitCount(repo.dir)).toBe("2");
    expect(EffectLedger.load(ledgerFile).get("gc-crash")).toMatchObject({ state: "intended", result: null });
    expect(EffectLedger.load(ledgerFile).assessGitCommit("gc-crash", { headSha: headOf(repo.dir), inspect: gitInspector(repo.dir) })).toBe<Decision>("done");
    expect(commitCount(repo.dir)).toBe("2");
    expect(lastDecision(ledgerFile, "gc-crash")).toMatchObject({ state: "committed", decision: "done", result: { sha: headOf(repo.dir) } });
  });

  it("원장 파일은 tmp+rename 으로 쓰인다(정상 쓰기 후 임시 파일 잔재 없음 — 쓰기 도중 크래시는 시험하지 않음, 보고서 §5)", () => {
    const { ledgerFile, base, target, patchHash } = setup();
    new EffectLedger(ledgerFile).intend("x", { kind: "file_patch", path: FILE, baseBlob: base, targetBlob: target, patchHash, fileMode: "100644" });
    expect(existsSync(ledgerFile)).toBe(true);
    expect(existsSync(`${ledgerFile}.tmp`)).toBe(false);
  });
});
