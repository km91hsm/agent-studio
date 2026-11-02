/**
 * T8 LIVE(win32, AC-P01-5): `electron apps/shell --security-probe` — main 이 먼저 daemon.status 로 데몬 접속 가능을 증명하고 연결 수 c0 을 읽은 뒤
 * 렌더러에서 데몬 포트로 fetch/WebSocket 을 시도한다. 둘 다 실패하고 `securitypolicyviolation` 2건의 directive 가 `connect-src`(CSP 차단),
 * 데몬 연결 수는 c0 그대로(렌더러 접속 0건), 노출 키 {events, rpc}, `process`·`require` 없음.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { readLock } from "@agent-studio/core";
import type { SecurityProbeResult } from "./smoke-security.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop()!;
    const lock = readLock(dir);
    if (lock) {
      try {
        process.kill(lock.pid); // RED/실패 시 남은 데몬 정리
      } catch {
        /* 이미 없음 */
      }
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

interface ProbeOutput {
  ok: boolean;
  c0: number;
  c1: number;
  port: number;
  probe: SecurityProbeResult;
}

describe.skipIf(!process.env.AGENT_STUDIO_LIVE || process.platform !== "win32")("security probe (LIVE win32, AC-P01-5)", () => {
  it("--security-probe → fetch/WebSocket 모두 CSP connect-src 위반으로 차단, 데몬 연결 수 불변, 노출 키 {events, rpc}, process 없음", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-secprobe-"));
    dirs.push(dir);
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    execFileSync(npm, ["run", "renderer:build"], { cwd: REPO_ROOT, stdio: "ignore", shell: true, timeout: 120_000 });
    execFileSync(npm, ["run", "shell:build"], { cwd: REPO_ROOT, stdio: "ignore", shell: true, timeout: 120_000 });
    const electron = createRequire(import.meta.url)("electron") as string;
    const r = spawnSync(electron, [join(REPO_ROOT, "apps/shell"), "--security-probe"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 60_000,
      env: { ...process.env, AGENT_STUDIO_STATE_DIR: dir, AGENT_STUDIO_TOKEN_STORE: "file", ELECTRON_RUN_AS_NODE: undefined },
    });
    const line = r.stdout
      .split(/\r?\n/)
      .filter((l) => l.startsWith("{"))
      .pop();
    expect(line, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBeTruthy();
    const out = JSON.parse(line!) as ProbeOutput;
    expect(out.ok).toBe(true);
    expect(out.c0).toBeGreaterThanOrEqual(1); // main 자신의 연결 — 데몬 접속 가능 증명
    expect(out.c1).toBe(out.c0); // 렌더러 접속 0건
    expect(out.probe.fetch).toMatch(/^rejected/);
    expect(out.probe.ws).not.toBe("open");
    expect(out.probe.violations.length).toBeGreaterThanOrEqual(2);
    expect(out.probe.violations.every((v) => v.directive === "connect-src")).toBe(true);
    expect(out.probe.violations.some((v) => v.blockedURI.startsWith(`http://127.0.0.1:${out.port}`))).toBe(true);
    expect(out.probe.violations.some((v) => v.blockedURI.startsWith(`ws://127.0.0.1:${out.port}`))).toBe(true);
    expect([...out.probe.keys].sort()).toEqual(["events", "rpc"]);
    expect(out.probe.processUndefined).toBe(true);
    expect(out.probe.requireUndefined).toBe(true);
    expect(r.status).toBe(0);
    expect(readLock(dir)).toBeNull();
  });
});
