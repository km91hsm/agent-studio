/**
 * S6 — 설치물 스파이크 (MASTER Phase 00 Task S6, AC-P00-5, V4·V10·V23·V33, ADR-0005 D5)
 * 설치(NSIS /S) → 실행(--spike-run, CSP 변형 3종) → 단계 로그(keyring·데몬 2런타임의 better-sqlite3 WAL·node-pty·Monaco Diff/CSP·메모리) → 제거(/S)
 * 전제: `npm run build`(spikes/s6-installer)로 dist/AgentStudioS6Spike-Setup.exe 생성. 실행: AGENT_STUDIO_LIVE=1, win32.
 */
import { afterAll, describe, expect, it } from "vitest";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mask } from "../_shared/mask.js";

const LIVE = !!process.env.AGENT_STUDIO_LIVE && process.platform === "win32";
const ROOT = fileURLToPath(new URL("./", import.meta.url));
const SETUP = join(ROOT, "dist", "AgentStudioS6Spike-Setup.exe");
const PRODUCT = "AgentStudioS6Spike";
/** electron-builder NSIS perMachine=false 기본 설치 폴더는 package.json name 기준(productName 아님 — 실측) */
const INSTALL_DIR = join(process.env.LOCALAPPDATA ?? "", "Programs", "agent-studio-s6-installer");
const EXE = join(INSTALL_DIR, `${PRODUCT}.exe`);
const UNINSTALLER = join(INSTALL_DIR, `Uninstall ${PRODUCT}.exe`);
const USER_DATA_CANDIDATES = [join(process.env.APPDATA ?? "", PRODUCT), join(process.env.APPDATA ?? "", "agent-studio-s6-installer")];
const OUT_DIR = join(tmpdir(), `s6-steps-${process.pid}`);
const RESULTS = fileURLToPath(new URL("../fixtures/s6-installer-results.json", import.meta.url));
const VARIANTS = ["canonical", "monaco-min", "monaco-style-only"] as const;
const REQUIRED_STEPS = ["electron_start", "keyring", "daemon_electron_run_as_node", "daemon_bundled_node", "monaco_diff", "memory"];
const observations: Record<string, unknown> = {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function dirSizeMB(dir: string): number {
  let bytes = 0;
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else bytes += st.size;
    }
  };
  if (existsSync(dir)) walk(dir);
  return Math.round(bytes / 1024 / 1024);
}

async function waitFor(pred: () => boolean, ms: number, label: string) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (pred()) return;
    await sleep(500);
  }
  throw new Error(`timeout ${ms}ms waiting for ${label}`);
}

describe.skipIf(!LIVE)("S6 installer spike (LIVE, win32)", () => {
  afterAll(() => {
    writeFileSync(RESULTS, mask(JSON.stringify(observations, null, 2)) + "\n");
  });

  it("(0) 설치 파일이 빌드돼 있다(npm run build)", () => {
    expect(existsSync(SETUP)).toBe(true);
    observations.setup = { path: SETUP, sizeMB: Math.round(statSync(SETUP).size / 1024 / 1024) };
  });

  it("(1) 무인 설치(/S) 후 실행 파일이 존재한다 — 설치 크기 기록(V4)", async () => {
    if (!existsSync(SETUP)) throw new Error("setup missing — run npm run build first");
    if (existsSync(UNINSTALLER)) {
      execFileSync(UNINSTALLER, ["/S"], { timeout: 120_000 });
      await waitFor(() => !existsSync(EXE), 60_000, "previous uninstall");
    }
    for (const d of USER_DATA_CANDIDATES) rmSync(d, { recursive: true, force: true });
    mkdirSync(OUT_DIR, { recursive: true });
    const t0 = Date.now();
    execFileSync(SETUP, ["/S"], { timeout: 180_000 });
    await waitFor(() => existsSync(EXE), 60_000, "installed exe");
    observations.install = { ms: Date.now() - t0, installDir: INSTALL_DIR, installedSizeMB: dirSizeMB(INSTALL_DIR), resources: readdirSync(join(INSTALL_DIR, "resources")), runtime: readdirSync(join(INSTALL_DIR, "resources", "runtime")) };
    expect(existsSync(EXE)).toBe(true);
    expect(existsSync(join(INSTALL_DIR, "resources", "runtime", "node.exe"))).toBe(true);
    // electron-builder createFilter는 매처 소스 루트의 `node_modules`를 무조건 제외한다(1차 실측: 동봉 모듈 누락) → extraResources를 node_modules 별도 항목으로 분리
    expect(existsSync(join(INSTALL_DIR, "resources", "runtime", "node_modules", "better-sqlite3", "package.json"))).toBe(true);
  }, 300_000);

  for (const variant of VARIANTS) {
    it(`(2) 실행 --spike-run --csp=${variant}: 단계 로그 6종이 모두 기록된다`, async () => {
      const stepsFile = join(OUT_DIR, `s6-steps-${variant}.json`);
      if (!existsSync(EXE)) throw new Error("installed exe missing — install step failed");
      rmSync(stepsFile, { force: true });
      const t0 = Date.now();
      const child = spawn(EXE, ["--spike-run", `--csp=${variant}`, `--out-dir=${OUT_DIR}`], { detached: true, stdio: "ignore", windowsHide: false });
      child.unref();
      await waitFor(() => {
        try {
          return existsSync(stepsFile) && (JSON.parse(readFileSync(stepsFile, "utf8")) as { final: boolean }).final === true;
        } catch {
          return false;
        }
      }, 120_000, `steps ${variant}`);
      const data = JSON.parse(readFileSync(stepsFile, "utf8")) as { steps: { step: string; ok?: boolean }[] };
      const byStep = Object.fromEntries(data.steps.map((s) => [s.step, s]));
      observations[`run_${variant}`] = { ms: Date.now() - t0, steps: byStep };
      for (const name of REQUIRED_STEPS) {
        expect(byStep[name], name).toBeDefined();
        expect(typeof byStep[name].ok, `${name}.ok`).toBe("boolean");
      }
      expect(byStep.electron_start.ok).toBe(true);
      await sleep(1_500); // 앱 종료 대기
    }, 200_000);
  }

  it("(3) 무인 제거(/S) 후 설치 디렉터리·userData가 사라진다", async () => {
    execFileSync(UNINSTALLER, ["/S"], { timeout: 120_000 });
    await waitFor(() => !existsSync(EXE), 90_000, "uninstall");
    await sleep(2_000);
    observations.uninstall = { installDirGone: !existsSync(INSTALL_DIR) || readdirSync(INSTALL_DIR).length === 0, userDataGone: USER_DATA_CANDIDATES.map((d) => ({ dir: d, gone: !existsSync(d) })) };
    rmSync(OUT_DIR, { recursive: true, force: true });
    expect(existsSync(EXE)).toBe(false);
  }, 200_000);
});
