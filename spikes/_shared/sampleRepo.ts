import { cpSync, mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const FIXTURE = fileURLToPath(new URL("../fixtures/sample-node-repo/", import.meta.url));

export interface SampleRepo {
  dir: string;
  /** git blob 해시(sha1)로 파일 내용 식별 */
  blob(relPath: string): string;
  /** 추적 파일 + 미추적 파일의 변경 목록 (`git status --porcelain`) */
  status(): string[];
  cleanup(): void;
}

/** 픽스처를 임시 디렉터리로 복사하고 git init + 첫 커밋까지 만든다. */
export function createSampleRepo(prefix = "agent-studio-spike-"): SampleRepo {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cpSync(FIXTURE, dir, { recursive: true });
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "spike@agent-studio.local");
  git("config", "user.name", "Agent Studio Spike");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture: sample-node-repo");
  return {
    dir,
    blob(relPath) {
      const data = readFileSync(join(dir, relPath));
      return createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
    },
    status() {
      return git("status", "--porcelain", "--untracked-files=all").split(/\r?\n/).filter(Boolean);
    },
    cleanup() {
      if (existsSync(dir)) rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}
