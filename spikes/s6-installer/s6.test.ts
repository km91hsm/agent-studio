/**
 * S6 — 설치물 스파이크 (MASTER Phase 00 Task S6, AC-P00-5, V4·V10·V23·V33, ADR-0005 D5)
 * 설치(NSIS /S) → 실행(--spike-run, CSP 변형 5종) → 단계 로그(keyring·데몬 2런타임의 better-sqlite3 WAL·node-pty·S5 데몬 기동/핸드셰이크·Monaco Diff/CSP·메모리) → 제거(/S)
 * 전제: `npm run build`(spikes/s6-installer)로 dist/AgentStudioS6Spike-Setup.exe 생성. 실행: AGENT_STUDIO_LIVE=1, win32.
 * Codex 리뷰 반영: 단계별 성공을 직접 단언(#1), S5 데몬 기동(#2), 로드된 .node 경로·해시 일치(#3), 완화 1개씩 제거 변형(#4), worker 생성 관찰(#5), 실패 경로 정리·환경 잔존 증거(#6)
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
const PKG_NAME = "agent-studio-s6-installer";
const INSTALL_DIR = join(process.env.LOCALAPPDATA ?? "", "Programs", PKG_NAME);
const UPDATER_DIR = join(process.env.LOCALAPPDATA ?? "", `${PKG_NAME}-updater`);
const EXE = join(INSTALL_DIR, `${PRODUCT}.exe`);
const UNINSTALLER = join(INSTALL_DIR, `Uninstall ${PRODUCT}.exe`);
/** 테스트 소유 데이터만 정리한다: 이 스파이크 앱의 userData 후보 2개(리뷰 #6) */
const USER_DATA_CANDIDATES = [join(process.env.APPDATA ?? "", PRODUCT), join(process.env.APPDATA ?? "", PKG_NAME)];
const OUT_DIR = join(tmpdir(), `s6-steps-${process.pid}`);
const RESULTS = fileURLToPath(new URL("../fixtures/s6-installer-results.json", import.meta.url));

/** CSP 변형과 기대 결과(리뷰 #4: 완화를 하나씩 빼서 필요 범위를 좁힌다). ok=null은 단언하지 않고 기록만 */
const VARIANTS = ["canonical", "monaco-min", "monaco-style-only", "monaco-no-style", "monaco-no-font"] as const;
type Variant = (typeof VARIANTS)[number];
const EXPECT: Record<Variant, { ok: boolean | null; directives: string[] }> = {
  canonical: { ok: false, directives: ["style-src-elem", "style-src-attr", "font-src", "worker-src"] },
  "monaco-min": { ok: true, directives: [] },
  "monaco-style-only": { ok: null, directives: ["worker-src"] },
  "monaco-no-style": { ok: null, directives: ["style-src-elem", "style-src-attr"] },
  "monaco-no-font": { ok: null, directives: ["font-src"] },
};
const REQUIRED_STEPS = ["electron_start", "keyring", "daemon_electron_run_as_node", "daemon_bundled_node", "daemon_s5_bundled_node", "monaco_diff", "memory"];

interface DaemonStep {
  ok?: boolean;
  sqlite?: { ok?: boolean; journalMode?: string; walExists?: boolean };
  pty?: { ok?: boolean; exitCode?: number; output?: string };
  loadedNative?: { path: string; sha256: string; module: string }[];
  versions?: { modules?: string };
}
interface MonacoStep {
  ok?: boolean;
  lineChanges?: number | null;
  cspViolationCount?: number;
  cspDirectivesHit?: string[];
  workers?: { scheme: string; messages: number }[];
  workerCount?: number;
}
interface EnvProbe {
  registry: string[];
  shortcuts: string[];
  installDir: boolean;
  updaterDir: boolean;
  userData: boolean[];
}

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

/** 설치가 사용자 환경에 남기는 것(레지스트리 Uninstall 키·바로가기·설치/updater 폴더·userData)을 증거로 남긴다(리뷰 #6) */
function envProbe(): EnvProbe {
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    `$r = Get-ChildItem 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall' | ForEach-Object { $p = $_ | Get-ItemProperty; if ($p.DisplayName -like '${PRODUCT}*') { $_.PSChildName } }`,
    `$s = @(Get-ChildItem "$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs" -Recurse -Filter '*${PRODUCT}*' | ForEach-Object FullName) + @(Get-ChildItem "$env:USERPROFILE\\Desktop" -Filter '*${PRODUCT}*' | ForEach-Object FullName)`,
    "@{registry=@($r); shortcuts=@($s)} | ConvertTo-Json -Compress",
  ].join("; ");
  const out = execFileSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", timeout: 60_000 });
  const parsed = JSON.parse(out) as { registry: string[] | string | null; shortcuts: string[] | string | null };
  const arr = (v: string[] | string | null) => (Array.isArray(v) ? v : v ? [v] : []);
  return { registry: arr(parsed.registry), shortcuts: arr(parsed.shortcuts), installDir: existsSync(INSTALL_DIR), updaterDir: existsSync(UPDATER_DIR), userData: USER_DATA_CANDIDATES.map((d) => existsSync(d)) };
}

async function uninstallIfPresent(label: string) {
  if (!existsSync(UNINSTALLER)) return false;
  execFileSync(UNINSTALLER, ["/S"], { timeout: 120_000 });
  await waitFor(() => !existsSync(EXE), 90_000, label);
  return true;
}

describe.skipIf(!LIVE)("S6 installer spike (LIVE, win32)", () => {
  afterAll(async () => {
    // 실패 경로 정리(리뷰 #6): 설치물이 남아 있으면 제거, 테스트 소유 임시 폴더·updater 캐시 삭제
    const cleanup: Record<string, unknown> = {};
    try {
      cleanup.uninstalledInAfterAll = await uninstallIfPresent("afterAll uninstall");
    } catch (e) {
      cleanup.uninstallError = String(e).slice(0, 200);
    }
    rmSync(OUT_DIR, { recursive: true, force: true });
    rmSync(UPDATER_DIR, { recursive: true, force: true });
    try {
      if (existsSync(INSTALL_DIR) && readdirSync(INSTALL_DIR).length === 0) rmSync(INSTALL_DIR, { recursive: true, force: true });
    } catch (e) {
      cleanup.installDirRemoveError = String(e).slice(0, 200);
    }
    cleanup.after = envProbe();
    observations.cleanup = cleanup;
    writeFileSync(RESULTS, mask(JSON.stringify(observations, null, 2)) + "\n");
  }, 240_000);

  it("(0) 설치 파일이 빌드돼 있다(npm run build)", () => {
    expect(existsSync(SETUP)).toBe(true);
    observations.setup = { path: SETUP, sizeMB: Math.round(statSync(SETUP).size / 1024 / 1024) };
  });

  it("(1) 무인 설치(/S) 후 실행 파일·동봉 런타임·S5 데몬 컴파일본이 존재한다 — 설치 크기·환경 변화 기록(V4)", async () => {
    if (!existsSync(SETUP)) throw new Error("setup missing — run npm run build first");
    await uninstallIfPresent("previous uninstall");
    for (const d of USER_DATA_CANDIDATES) rmSync(d, { recursive: true, force: true });
    mkdirSync(OUT_DIR, { recursive: true });
    const before = envProbe();
    const t0 = Date.now();
    execFileSync(SETUP, ["/S"], { timeout: 180_000 });
    await waitFor(() => existsSync(EXE), 60_000, "installed exe");
    const after = envProbe();
    observations.install = { ms: Date.now() - t0, installDir: INSTALL_DIR, installedSizeMB: dirSizeMB(INSTALL_DIR), resources: readdirSync(join(INSTALL_DIR, "resources")), runtime: readdirSync(join(INSTALL_DIR, "resources", "runtime")), envBefore: before, envAfter: after };
    expect(existsSync(EXE)).toBe(true);
    expect(existsSync(join(INSTALL_DIR, "resources", "runtime", "node.exe"))).toBe(true);
    // electron-builder createFilter는 매처 소스 루트의 `node_modules`를 무조건 제외한다(1차 실측: 동봉 모듈 누락) → extraResources를 node_modules 별도 항목으로 분리
    expect(existsSync(join(INSTALL_DIR, "resources", "runtime", "node_modules", "better-sqlite3", "package.json"))).toBe(true);
    // S5 데몬 컴파일본(리뷰 #2)
    expect(existsSync(join(INSTALL_DIR, "resources", "runtime", "s5", "daemon.js"))).toBe(true);
    expect(after.registry.length).toBeGreaterThan(0);
  }, 300_000);

  for (const variant of VARIANTS) {
    it(`(2) 실행 --spike-run --csp=${variant}: 단계 7종이 기록되고 데몬·S5·CSP 기대 결과가 맞다`, async () => {
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
      const data = JSON.parse(readFileSync(stepsFile, "utf8")) as { steps: ({ step: string } & Record<string, unknown>)[] };
      const byStep = Object.fromEntries(data.steps.map((s) => [s.step, s])) as Record<string, Record<string, unknown>>;
      observations[`run_${variant}`] = { ms: Date.now() - t0, steps: byStep };
      for (const name of REQUIRED_STEPS) {
        expect(byStep[name], name).toBeDefined();
        expect(typeof byStep[name].ok, `${name}.ok`).toBe("boolean");
      }
      expect(byStep.electron_start.ok).toBe(true);
      expect(byStep.keyring.ok, "keyring").toBe(true);

      // 데몬 두 런타임: WAL·PTY 성공과 로드된 .node 경로·해시(리뷰 #1·#3)
      const electronDaemon = byStep.daemon_electron_run_as_node as DaemonStep;
      const nodeDaemon = byStep.daemon_bundled_node as DaemonStep;
      for (const [label, d] of [["electron", electronDaemon], ["node", nodeDaemon]] as const) {
        expect(d.ok, `${label} daemon ok`).toBe(true);
        expect(d.sqlite?.ok, `${label} sqlite`).toBe(true);
        expect(d.sqlite?.journalMode, `${label} wal`).toBe("wal");
        expect(d.sqlite?.walExists, `${label} -wal file`).toBe(true);
        expect(d.pty?.ok, `${label} pty`).toBe(true);
        expect(d.pty?.exitCode, `${label} pty exit`).toBe(0);
        expect(d.pty?.output, `${label} pty output`).toContain("s6-pty-ok");
        expect((d.loadedNative ?? []).length, `${label} loaded .node files`).toBeGreaterThanOrEqual(2);
      }
      expect(electronDaemon.versions?.modules).not.toBe(nodeDaemon.versions?.modules);
      // 같은 N-API prebuild인지: 모듈별 .node 해시가 두 런타임에서 같다
      const hashesBy = (d: DaemonStep) => Object.fromEntries((d.loadedNative ?? []).map((n) => [n.module, n.sha256]));
      const eh = hashesBy(electronDaemon);
      const nh = hashesBy(nodeDaemon);
      for (const m of ["better-sqlite3", "node-pty"]) {
        expect(eh[m], `${m} electron hash`).toBeDefined();
        expect(nh[m], `${m} node hash`).toBe(eh[m]);
      }

      // S5 데몬: 동봉 Node로 기동 → 락 → HMAC 핸드셰이크 → seq 증가 → shutdown → 락 삭제(리뷰 #2)
      const s5 = byStep.daemon_s5_bundled_node as Record<string, unknown>;
      expect(s5.ok, `s5 ${JSON.stringify(s5).slice(0, 300)}`).toBe(true);
      expect(s5.welcome, "s5 welcome").toBeTruthy();
      expect(s5.seqIncreased, "s5 seq").toBe(true);
      expect(s5.lockGoneAfterShutdown, "s5 lock gone").toBe(true);
      expect(s5.pidGoneAfterShutdown, "s5 pid gone").toBe(true);

      // Monaco/CSP: 변형별 기대(리뷰 #4·#5)
      const m = byStep.monaco_diff as MonacoStep;
      const exp = EXPECT[variant];
      const hit = [...(m.cspDirectivesHit ?? [])].sort();
      if (exp.ok !== null) expect(m.ok, `${variant} monaco ok`).toBe(exp.ok);
      if (exp.directives.length === 0) {
        expect(m.cspViolationCount, `${variant} violations`).toBe(0);
        expect(m.lineChanges, `${variant} lineChanges`).toBeGreaterThanOrEqual(1);
      } else {
        expect(m.cspViolationCount ?? 0, `${variant} violations > 0`).toBeGreaterThan(0);
        expect(hit.length, `${variant} directives hit`).toBeGreaterThan(0);
        for (const d of hit) expect(exp.directives, `${variant} unexpected directive ${d}`).toContain(d);
      }
      expect(m.workerCount, `${variant} worker created`).toBeGreaterThanOrEqual(1);
      if (variant === "monaco-min") expect((m.workers ?? []).some((w) => w.messages > 0), "worker answered").toBe(true);

      expect((byStep.memory as { totalWorkingSetMB?: number }).totalWorkingSetMB).toBeGreaterThan(0);
      await sleep(1_500); // 앱 종료 대기
    }, 200_000);
  }

  it("(3) 무인 제거(/S) 후 실행 파일·userData·레지스트리 키·바로가기가 사라진다", async () => {
    execFileSync(UNINSTALLER, ["/S"], { timeout: 120_000 });
    await waitFor(() => !existsSync(EXE), 90_000, "uninstall");
    await sleep(2_000);
    const after = envProbe();
    observations.uninstall = { installDirGone: !existsSync(INSTALL_DIR), installDirEmpty: !existsSync(INSTALL_DIR) || readdirSync(INSTALL_DIR).length === 0, userDataGone: USER_DATA_CANDIDATES.map((d) => ({ dir: d, gone: !existsSync(d) })), env: after };
    expect(existsSync(EXE)).toBe(false);
    expect(after.registry, "registry key removed").toEqual([]);
    expect(after.shortcuts, "shortcuts removed").toEqual([]);
    expect(after.userData.every((x) => !x), "userData removed").toBe(true);
  }, 200_000);
});
