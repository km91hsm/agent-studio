/**
 * S8 크래시 재현 worker — 테스트가 자식 프로세스로 띄운다.
 *   node --import tsx worker.ts <scenario> <repoDir> <ledgerFile> <file>
 * 모든 시나리오는 EffectLedger.commit() 호출 **전에** SIGKILL 로 자신을 죽인다(정상 종료 경로 없음).
 *   patch-then-crash    : intend → 파일에 패치 적용 → 크래시           (재기동 기대: done)
 *   crash-before-apply  : intend → 크래시                              (재기동 기대: reapply_with_approval / 그 사이 변경 시 conflict)
 *   commit-then-crash   : intend(git_commit) → git commit → SHA 를 outbox 에 기록 → 크래시 (재기동 기대: done, 재커밋 없음)
 *   crash-before-commit : intend(git_commit) → 변경 스테이징 → 크래시   (재기동 기대: reapply_with_approval / HEAD 이동 시 conflict)
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EffectLedger, blobOf } from "./effects.js";

const [scenario, repoDir, ledgerFile, file] = process.argv.slice(2);
if (!scenario || !repoDir || !ledgerFile || !file) {
  console.error("usage: worker.ts <scenario> <repoDir> <ledgerFile> <file>");
  process.exit(2);
}
const TARGET_CONTENT = "export function add(a, b) {\n  return a + b; // patched by s8\n}\n";
const git = (...args: string[]) => execFileSync("git", args, { cwd: repoDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function crash(): never {
  console.log(`[worker] ${scenario}: crashing before ledger.commit()`);
  process.kill(process.pid, "SIGKILL");
  // SIGKILL 전달이 비동기일 수 있으므로 정상 종료 경로로 빠지지 않게 붙잡는다
  setTimeout(() => process.exit(99), 10_000);
  throw new Error("unreachable: SIGKILL pending");
}

const ledger = new EffectLedger(ledgerFile);
const base = blobOf(readFileSync(join(repoDir, file)));
const target = blobOf(Buffer.from(TARGET_CONTENT));
const filePatch = { kind: "file_patch" as const, path: file, baseBlob: base, targetBlob: target, patchHash: blobOf(Buffer.from(`${base}->${target}`)), fileMode: "100644" };

switch (scenario) {
  case "patch-then-crash": {
    ledger.intend("fp-crash", filePatch);
    writeFileSync(join(repoDir, file), TARGET_CONTENT);
    crash();
  }
  case "crash-before-apply": {
    ledger.intend("fp-crash", filePatch);
    crash();
  }
  case "commit-then-crash": {
    ledger.intend("gc-crash", { kind: "git_commit", parentSha: git("rev-parse", "HEAD"), message: "s8: outbox commit" });
    writeFileSync(join(repoDir, "CHANGELOG.md"), "- s8 outbox commit\n");
    git("add", "-A");
    git("commit", "-q", "-m", "s8: outbox commit");
    ledger.recordResult("gc-crash", { sha: git("rev-parse", "HEAD") });
    crash();
  }
  case "crash-before-commit": {
    ledger.intend("gc-crash", { kind: "git_commit", parentSha: git("rev-parse", "HEAD"), message: "s8: outbox commit" });
    writeFileSync(join(repoDir, "CHANGELOG.md"), "- s8 outbox commit\n");
    git("add", "-A");
    crash();
  }
  default:
    console.error(`unknown scenario: ${scenario}`);
    process.exit(2);
}
