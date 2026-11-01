/**
 * S8 — 중복 적용 방지 스파이크 (MASTER Task S8, AC-P00-8, DATABASE_SCHEMA §3 Idempotency Key, D16, RC-S13)
 * 순수 로직 + 자식 프로세스 크래시 재현(에이전트 호출 없음) → CI에서 실행된다.
 *   file_patch: (경로, base blob, target blob, patch 해시) 3분기 — 현재 blob=target → done / =base → reapply_with_approval / 그 외 → conflict
 *   git_commit: outbox에 생성 SHA가 있고 저장소에 존재하면 재커밋 금지(done); SHA 없고 parent=HEAD면 reapply_with_approval; HEAD 이동이면 conflict
 *   net/mcp/external_service: external_ref 없으면 unverifiable — 자동 건너뛰기·자동 재시도 금지
 */
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSampleRepo, type SampleRepo } from "../_shared/sampleRepo.js";
import { EffectLedger, blobOf, type Decision } from "./effects.js";

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

/** 자식 프로세스에서 시나리오를 수행하고 commit() 전에 SIGKILL — 비정상 종료 코드를 반환해야 한다 */
function runWorkerAndCrash(scenario: string, repoDir: string, ledgerFile: string): { status: number | null; signal: string | null; stdout: string } {
  const r = spawnSync(process.execPath, ["--import", "tsx", WORKER, scenario, repoDir, ledgerFile, FILE], { cwd: REPO_ROOT, encoding: "utf8", timeout: 60_000 });
  return { status: r.status, signal: r.signal, stdout: r.stdout };
}

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
    expect(EffectLedger.load(ledgerFile).get("k-base")?.state).toBe("intended");
    mk("k-other");
    expect(EffectLedger.load(ledgerFile).assess("k-other", blobOf(Buffer.from("someone else edited\n")))).toBe<Decision>("conflict");
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
});

describe("S8 크래시 재현 — 자식 프로세스가 commit() 전에 죽는다 (CI, git 필요)", () => {
  it("(A) 패치 적용 후 크래시 → 재기동 assess = done, 파일은 재적용되지 않는다(내용·mtime 불변, 중복 적용 0)", () => {
    const { repo, ledgerFile, target } = setup();
    const r = runWorkerAndCrash("patch-then-crash", repo.dir, ledgerFile);
    expect(r.status, r.stdout).not.toBe(0);
    expect(readFileSync(join(repo.dir, FILE), "utf8")).toBe(TARGET_CONTENT);
    const before = statSync(join(repo.dir, FILE)).mtimeMs;
    const ledger = EffectLedger.load(ledgerFile);
    expect(ledger.get("fp-crash")?.state).toBe("intended");
    expect(ledger.assess("fp-crash", repo.blob(FILE))).toBe<Decision>("done");
    expect(repo.blob(FILE)).toBe(target);
    expect(statSync(join(repo.dir, FILE)).mtimeMs).toBe(before);
    expect(EffectLedger.load(ledgerFile).get("fp-crash")?.state).toBe("committed");
  });

  it("(B) 적용 전 크래시 → assess = reapply_with_approval (자동 재적용 없음, 파일은 base 그대로)", () => {
    const { repo, ledgerFile, base } = setup();
    const r = runWorkerAndCrash("crash-before-apply", repo.dir, ledgerFile);
    expect(r.status, r.stdout).not.toBe(0);
    expect(repo.blob(FILE)).toBe(base);
    expect(EffectLedger.load(ledgerFile).assess("fp-crash", repo.blob(FILE))).toBe<Decision>("reapply_with_approval");
    expect(repo.blob(FILE)).toBe(base);
  });

  it("(C) 적용 전 크래시 + 그 사이 다른 변경 → assess = conflict (보류)", () => {
    const { repo, ledgerFile } = setup();
    runWorkerAndCrash("crash-before-apply", repo.dir, ledgerFile);
    writeFileSync(join(repo.dir, FILE), "export const add = (a, b) => a - b; // concurrent edit\n");
    expect(EffectLedger.load(ledgerFile).assess("fp-crash", repo.blob(FILE))).toBe<Decision>("conflict");
  });

  it("(D) git_commit outbox: 커밋 생성·SHA 기록 후 크래시 → 재기동 시 SHA 존재 → done, 재커밋하지 않는다(커밋 수 불변)", () => {
    const { repo, ledgerFile } = setup();
    const r = runWorkerAndCrash("commit-then-crash", repo.dir, ledgerFile);
    expect(r.status, r.stdout).not.toBe(0);
    const count = git(repo.dir, "rev-list", "--count", "HEAD");
    expect(count).toBe("2");
    const ledger = EffectLedger.load(ledgerFile);
    const entry = ledger.get("gc-crash");
    expect(entry?.state).toBe("intended");
    const sha = (entry?.result as { sha?: string } | undefined)?.sha;
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
    expect(ledger.assessGitCommit("gc-crash", { headSha: git(repo.dir, "rev-parse", "HEAD"), shaExists: (s) => git(repo.dir, "cat-file", "-t", s) === "commit" })).toBe<Decision>("done");
    expect(git(repo.dir, "rev-list", "--count", "HEAD")).toBe("2");
    expect(git(repo.dir, "rev-parse", "HEAD")).toBe(sha);
  });

  it("(E) git_commit outbox: 커밋 전 크래시(SHA 없음) → parent=HEAD 면 reapply_with_approval, HEAD 가 움직였으면 conflict", () => {
    const { repo, ledgerFile } = setup();
    runWorkerAndCrash("crash-before-commit", repo.dir, ledgerFile);
    expect(git(repo.dir, "rev-list", "--count", "HEAD")).toBe("1");
    const head = git(repo.dir, "rev-parse", "HEAD");
    const exists = (s: string) => { try { return git(repo.dir, "cat-file", "-t", s) === "commit"; } catch { return false; } };
    expect(EffectLedger.load(ledgerFile).assessGitCommit("gc-crash", { headSha: head, shaExists: exists })).toBe<Decision>("reapply_with_approval");
    writeFileSync(join(repo.dir, "README.md"), "moved\n");
    git(repo.dir, "add", "-A");
    git(repo.dir, "commit", "-q", "-m", "someone else");
    expect(EffectLedger.load(ledgerFile).assessGitCommit("gc-crash", { headSha: git(repo.dir, "rev-parse", "HEAD"), shaExists: exists })).toBe<Decision>("conflict");
  });

  it("원장 파일은 원자적으로 쓰인다(임시 파일 잔재 없음)", () => {
    const { ledgerFile, base, target, patchHash } = setup();
    new EffectLedger(ledgerFile).intend("x", { kind: "file_patch", path: FILE, baseBlob: base, targetBlob: target, patchHash, fileMode: "100644" });
    expect(existsSync(ledgerFile)).toBe(true);
    expect(existsSync(`${ledgerFile}.tmp`)).toBe(false);
  });
});
