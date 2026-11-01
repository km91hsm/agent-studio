/**
 * S6 — 설치물 스파이크 Electron main. `--spike-run`이면 단계를 수행하고 userData/s6-steps.json에 기록 후 종료.
 * 단계: electron_start → keyring(V10) → daemon(electron runAsNode) → daemon(bundled node) → monaco_diff(렌더러, CSP 정본) → memory → quit
 */
"use strict";
const { app, BrowserWindow, ipcMain, protocol, net, session } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const SPIKE = process.argv.includes("--spike-run");
/** CSP 변형 실험: --csp=<이름> (canonical | monaco-min). 설치물 테스트가 두 번 실행해 완화 필요 항목을 측정한다 */
const CSP_VARIANT = (process.argv.find((a) => a.startsWith("--csp=")) || "--csp=canonical").slice("--csp=".length);
const steps = [];
const startedAt = Date.now();
let stepsPath = "";
const log = (s) => {
  try {
    fs.appendFileSync(path.join(app.getPath("userData"), "s6.log"), `${new Date().toISOString()} ${s}\n`);
  } catch {}
};
function record(step, data) {
  steps.push({ step, t: Date.now() - startedAt, ...data });
  log(`${step} ${JSON.stringify(data).slice(0, 300)}`);
  flush();
}
function flush(final = false) {
  fs.writeFileSync(stepsPath, JSON.stringify({ final, steps }, null, 2));
}

// SECURITY §7: 앱 전용 scheme(standard, secure). bypassCSP 금지.
protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

// SECURITY_MODEL §7 정본(유일한 정본 문자열) — 변형은 측정용이며 정본 수정 제안의 입력이다
const CSP_CANONICAL = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";
const CSP_VARIANTS = {
  canonical: CSP_CANONICAL,
  // Monaco(AMD min 빌드)가 요구하는 최소 완화 후보: 동적 <style>·style 속성, codicon data: 폰트, blob: worker — 실측으로 좁힌다
  "monaco-min": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",
  "monaco-style-only": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'",
};
const CSP = CSP_VARIANTS[CSP_VARIANT] || CSP_CANONICAL;

app.whenReady().then(async () => {
  // 단계 로그 폴더: --out-dir=<dir>(설치물 테스트가 지정) 또는 userData
  const outDir = (process.argv.find((a) => a.startsWith("--out-dir=")) || "").slice("--out-dir=".length) || app.getPath("userData");
  fs.mkdirSync(outDir, { recursive: true });
  stepsPath = path.join(outDir, `s6-steps-${CSP_VARIANT}.json`);
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  const isPackaged = app.isPackaged;
  const resources = process.resourcesPath;
  record("electron_start", {
    ok: true,
    cspVariant: CSP_VARIANT,
    csp: CSP,
    electron: process.versions.electron,
    node: process.versions.node,
    modulesAbi: process.versions.modules,
    isPackaged,
    execPath: process.execPath,
    resourcesPath: resources,
    userData: app.getPath("userData"),
    fuses: { runAsNodeExpected: true },
  });

  // app://bundle/<path> → app/renderer 또는 node_modules/monaco-editor/min
  const rendererDir = path.join(__dirname, "renderer");
  const monacoDir = path.join(__dirname, "..", "node_modules", "monaco-editor", "min");
  protocol.handle("app", (req) => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "");
    let file;
    if (rel.startsWith("monaco/")) file = path.join(monacoDir, rel.slice("monaco/".length));
    else if (rel.startsWith("renderer/")) file = path.join(rendererDir, rel.slice("renderer/".length));
    else return new Response("not found", { status: 404 });
    if (rel === "renderer/index.html") {
      // CSP meta를 선택한 변형으로 치환(정본 문자열은 CSP_CANONICAL 하나만 유지)
      const html = fs.readFileSync(file, "utf8").replace(/content="default-src[^"]*"/, `content="${CSP}"`);
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    return net.fetch(pathToFileURL(file).toString());
  });
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    if (details.url.startsWith("app://")) cb({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": [CSP] } });
    else cb({});
  });

  if (!SPIKE) return openWindow();

  // 1) keyring (V10 Windows 백엔드)
  try {
    const { Entry } = require("@napi-rs/keyring");
    const e = new Entry("agent-studio-s6-spike", "spike");
    e.setPassword("s6-secret");
    const got = e.getPassword();
    const deleted = e.deletePassword();
    record("keyring", { ok: got === "s6-secret" && deleted === true, backend: "windows credential manager (expected)", roundTrip: got === "s6-secret", deleted });
  } catch (e) {
    record("keyring", { ok: false, error: String(e).slice(0, 300) });
  }

  // 2) 데몬 런타임 두 방식
  const unpackedModules = isPackaged ? path.join(resources, "app.asar.unpacked", "node_modules") : path.join(__dirname, "..", "node_modules");
  const runtimeDir = isPackaged ? path.join(resources, "runtime") : path.join(__dirname, "..", "runtime");
  const daemonJs = path.join(runtimeDir, "daemon.js");
  await runDaemon("daemon_electron_run_as_node", process.execPath, { ELECTRON_RUN_AS_NODE: "1" }, daemonJs, "electron", unpackedModules);
  await runDaemon("daemon_bundled_node", path.join(runtimeDir, "node.exe"), {}, daemonJs, "node", path.join(runtimeDir, "node_modules"));

  // 3) 렌더러: Monaco Diff + CSP
  const win = openWindow();
  const rendered = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "renderer report timeout 20s" }), 20_000);
    ipcMain.handle("s6:report", (_ev, payload) => {
      clearTimeout(timer);
      resolve(payload);
      return true;
    });
  });
  record("monaco_diff", rendered);

  // 4) 메모리(작업 집합 합계, KB → MB)
  const metrics = app.getAppMetrics().map((m) => ({ type: m.type, pid: m.pid, workingSetMB: Math.round((m.memory.workingSetSize || 0) / 1024) }));
  record("memory", { ok: true, processes: metrics, totalWorkingSetMB: metrics.reduce((a, m) => a + m.workingSetMB, 0) });

  flush(true);
  setTimeout(() => {
    win.destroy();
    app.quit();
  }, 500);
});

app.on("window-all-closed", () => {
  if (!SPIKE) app.quit();
});

function openWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      devTools: false,
    },
  });
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.loadURL("app://bundle/renderer/index.html");
  return win;
}

function runDaemon(step, exe, env, daemonJs, runtime, modulesDir) {
  return new Promise((resolve) => {
    const out = path.join(app.getPath("userData"), `daemon-${runtime}.json`);
    const db = path.join(app.getPath("userData"), `journal-${runtime}.sqlite`);
    for (const f of [out, db, `${db}-wal`, `${db}-shm`]) fs.rmSync(f, { force: true });
    const t0 = Date.now();
    let child;
    try {
      child = spawn(exe, [daemonJs, "--runtime", runtime, "--modules", modulesDir, "--db", db, "--out", out], {
        env: { ...process.env, ...env },
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
    } catch (e) {
      record(step, { ok: false, error: `spawn failed: ${String(e).slice(0, 200)}`, exe });
      return resolve();
    }
    const deadline = Date.now() + 30_000;
    const poll = setInterval(() => {
      if (fs.existsSync(out)) {
        clearInterval(poll);
        try {
          const r = JSON.parse(fs.readFileSync(out, "utf8"));
          record(step, { ok: !!(r.sqlite && r.sqlite.ok && r.pty && r.pty.ok), ms: Date.now() - t0, exe, ...r });
        } catch (e) {
          record(step, { ok: false, error: `bad result: ${String(e).slice(0, 200)}`, exe });
        }
        resolve();
      } else if (Date.now() > deadline) {
        clearInterval(poll);
        record(step, { ok: false, error: "daemon result timeout 30s", exe, exists: fs.existsSync(exe), daemonJsExists: fs.existsSync(daemonJs) });
        try { child.kill(); } catch {}
        resolve();
      }
    }, 250);
  });
}
