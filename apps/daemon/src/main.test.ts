/**
 * T2 데몬 엔트리: `--self-test` 계약(모든 OS, CI 가 같은 명령을 실행) + LIVE win32 detached 기동·재접속·종료(AC-P01-5 데몬 생명주기).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { DaemonClient, FileTokenStore, probeProcess, readLock, spawnDaemon } from "@agent-studio/core";

const MAIN = fileURLToPath(new URL("./main.ts", import.meta.url));
const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "as-daemon-"));
  dirs.push(d);
  return d;
};

describe("daemon --self-test", () => {
  it("기동 → 락 → 자기 접속(daemon.status) → 종료, exit 0, 락·임시 파일 없음", () => {
    const dir = tmp();
    const r = spawnSync(process.execPath, ["--import", "tsx", MAIN, "--dir", dir, "--token-store", "file", "--self-test"], { encoding: "utf8", timeout: 120_000, env: { ...process.env, AGENT_STUDIO_TOKEN_STORE: undefined } });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    const line = r.stdout.trim().split("\n").pop()!;
    const out = JSON.parse(line) as { selfTest: string; status: { seq: number; tokenRef: string } };
    expect(out.selfTest).toBe("ok");
    expect(out.status.tokenRef).toMatch(/^file:/);
    expect(out.status.seq).toBeGreaterThanOrEqual(1); // 최초 기동 시 WorkspaceSettingsChanged(격리 경고 등록)
    expect(existsSync(join(dir, "daemon.lock"))).toBe(false);
    expect(existsSync(join(dir, "journal.sqlite"))).toBe(true);
  });
});

describe.skipIf(!process.env.AGENT_STUDIO_LIVE || process.platform !== "win32")("daemon detached (LIVE win32)", () => {
  it("spawnDaemon → 5초 뒤 접속·seq 증가 → 두 번째 접속 → shutdown → 락·프로세스 없음", async () => {
    const dir = tmp();
    const h = await spawnDaemon(dir, { tokenStore: "file" });
    expect(h.spawned).toBe(true);
    await new Promise((r) => setTimeout(r, 5_000));
    const token = new FileTokenStore(dir).get()!;
    expect(token).toBeTruthy();
    const c1 = await DaemonClient.connect({ stateDir: dir, token, onEvent: () => {} });
    const s1 = await c1.call<{ seq: number; pid: number }>("daemon.status");
    expect(s1.pid).toBe(h.pid);
    await c1.call("task.submit", { title: "live", kind: "impl" });
    const s2 = await c1.call<{ seq: number }>("daemon.status");
    expect(s2.seq).toBeGreaterThan(s1.seq);
    c1.close();
    const c2 = await DaemonClient.connect({ stateDir: dir, token, onEvent: () => {} });
    expect((await c2.call<{ seq: number }>("daemon.status")).seq).toBe(s2.seq);
    await c2.call("daemon.shutdown");
    c2.close();
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline && (readLock(dir) || probeProcess(h.pid).pidAlive)) await new Promise((r) => setTimeout(r, 250));
    expect(readLock(dir)).toBeNull();
    expect(probeProcess(h.pid).pidAlive).toBe(false);
  });
});
