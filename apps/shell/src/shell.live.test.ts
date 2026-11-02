/**
 * T6 LIVE(win32) Electron 스모크: renderer·shell 번들 → `electron apps/shell --smoke` 기동 → 데몬 ensure → 창 로드 → renderer
 * lastAppliedSeq ≥ 1 → `daemon.status` 1회 → stdout JSON {ok:true} → daemon.shutdown → 종료. 데몬 락이 남지 않는다.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readLock } from "@agent-studio/core";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe.skipIf(!process.env.AGENT_STUDIO_LIVE || process.platform !== "win32")("shell smoke (LIVE win32)", () => {
  it("--smoke → ok:true, renderer seq ≥ 1, daemon.status 성공, 종료 후 락 없음", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-shell-"));
    dirs.push(dir);
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    execFileSync(npm, ["run", "renderer:build"], { cwd: REPO_ROOT, stdio: "ignore", shell: true, timeout: 120_000 });
    execFileSync(npm, ["run", "shell:build"], { cwd: REPO_ROOT, stdio: "ignore", shell: true, timeout: 120_000 });
    const electron = createRequire(import.meta.url)("electron") as string;
    const r = spawnSync(electron, [join(REPO_ROOT, "apps/shell"), "--smoke"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 120_000,
      env: { ...process.env, AGENT_STUDIO_STATE_DIR: dir, AGENT_STUDIO_TOKEN_STORE: "file", ELECTRON_RUN_AS_NODE: undefined, ELECTRON_ENABLE_LOGGING: undefined },
    });
    const line = r.stdout
      .split(/\r?\n/)
      .filter((l) => l.startsWith("{"))
      .pop();
    expect(line, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBeTruthy();
    const out = JSON.parse(line!) as { ok: boolean; status: { seq: number; tokenRef: string }; rendererSeq: number; preloadKeys: string[] };
    expect(out.ok).toBe(true);
    expect(out.status.seq).toBeGreaterThanOrEqual(1);
    expect(out.status.tokenRef).toMatch(/^file:/);
    expect(out.rendererSeq).toBeGreaterThanOrEqual(1);
    expect(out.preloadKeys.sort()).toEqual(["events", "rpc"]);
    expect(r.status).toBe(0);
    expect(readLock(dir)).toBeNull();
  });
});
