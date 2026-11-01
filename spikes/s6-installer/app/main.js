/**
 * S6 — 설치물 스파이크 Electron main. `--spike-run`이면 단계를 수행하고 <out-dir>/s6-steps-<variant>.json에 기록 후 종료.
 * 단계: electron_start → keyring(V10) → daemon(electron runAsNode) → daemon(bundled node) → daemon_s5(bundled node, S5 데몬 기동·HMAC 핸드셰이크·shutdown)
 *       → monaco_diff(렌더러, CSP 변형) → memory → quit
 * Codex 리뷰 반영: app:// 경로를 허용 루트 안으로 제한(#7), IPC 발신 frame·창 검사(#7), S5 데몬 기동(#2), CSP 완화 1개씩 제거 변형(#4)
 */
"use strict";
const { app, BrowserWindow, ipcMain, protocol, net, session } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const SPIKE = process.argv.includes("--spike-run");
/** CSP 변형 실험: --csp=<이름>. 설치물 테스트가 변형마다 실행해 완화 필요 항목을 측정한다 */
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
const TAIL = "img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";
const CSP_VARIANTS = {
  canonical: CSP_CANONICAL,
  // Monaco(AMD min 빌드)가 요구하는 완화 후보 3종 전부
  "monaco-min": `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; worker-src 'self' blob:; ${TAIL}`,
  // 완화를 하나씩 뺀 변형(리뷰 #4): 어느 완화가 어떤 위반을 없애는지 분리 측정
  "monaco-style-only": `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; worker-src 'self'; ${TAIL}`,
  "monaco-no-style": `default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self' data:; worker-src 'self' blob:; ${TAIL}`,
  "monaco-no-font": `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; worker-src 'self' blob:; ${TAIL}`,
};
const CSP = CSP_VARIANTS[CSP_VARIANT] || CSP_CANONICAL;

/** 디코딩된 상대 경로를 허용 루트 안으로 제한한다(리뷰 #7: `..`·절대 경로 탈출 차단) */
function resolveInside(base, rel) {
  const root = path.resolve(base);
  const file = path.resolve(root, rel);
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

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

  // app://bundle/<path> → app/renderer 또는 node_modules/monaco-editor/min (허용 루트 2개, 그 밖은 404)
  const rendererDir = path.join(__dirname, "renderer");
  const monacoDir = path.join(__dirname, "..", "node_modules", "monaco-editor", "min");
  let rejectedPaths = 0;
  protocol.handle("app", (req) => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "");
    let file = null;
    if (rel.startsWith("monaco/")) file = resolveInside(monacoDir, rel.slice("monaco/".length));
    else if (rel.startsWith("renderer/")) file = resolveInside(rendererDir, rel.slice("renderer/".length));
    if (!file) {
      rejectedPaths++;
      return new Response("not found", { status: 404 });
    }
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
    record("keyring", { ok: got === "s6-secret" && deleted === true, backend: "windows credential manager (library doc, not observed)", roundTrip: got === "s6-secret", deleted });
  } catch (e) {
    record("keyring", { ok: false, error: String(e).slice(0, 300) });
  }

  // 2) 데몬 런타임 두 방식(같은 daemon.js·같은 단계)
  const unpackedModules = isPackaged ? path.join(resources, "app.asar.unpacked", "node_modules") : path.join(__dirname, "..", "node_modules");
  const runtimeDir = isPackaged ? path.join(resources, "runtime") : path.join(__dirname, "..", "runtime");
  const daemonJs = path.join(runtimeDir, "daemon.js");
  await runDaemon("daemon_electron_run_as_node", process.execPath, { ELECTRON_RUN_AS_NODE: "1" }, daemonJs, "electron", unpackedModules);
  await runDaemon("daemon_bundled_node", path.join(runtimeDir, "node.exe"), {}, daemonJs, "node", path.join(runtimeDir, "node_modules"));

  // 2b) S5 데몬(컴파일본)을 동봉 Node로 기동 → 락 → HMAC 핸드셰이크 → seq → shutdown (리뷰 #2)
  await runS5Daemon("daemon_s5_bundled_node", path.join(runtimeDir, "node.exe"), path.join(runtimeDir, "s5"));

  // 3) 렌더러: Monaco Diff + CSP
  const win = openWindow();
  let ipcRejected = 0;
  const rendered = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "renderer report timeout 20s" }), 20_000);
    ipcMain.handle("s6:report", (ev, payload) => {
      // 발신 검증(리뷰 #7): 이 창의 webContents + app://bundle/ 최상위 frame만 수용
      const frameUrl = ev.senderFrame ? String(ev.senderFrame.url) : "";
      if (ev.sender.id !== win.webContents.id || !frameUrl.startsWith("app://bundle/") || (ev.senderFrame && ev.senderFrame.parent)) {
        ipcRejected++;
        return false;
      }
      clearTimeout(timer);
      resolve({ ...payload, ipcSender: { webContentsId: ev.sender.id, frameUrl, rejectedBefore: ipcRejected } });
      return true;
    });
  });
  record("monaco_diff", { ...rendered, protocolRejectedPaths: rejectedPaths });

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

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code === "EPERM";
  }
}

/** S5 데몬(spikes/s5-daemon 컴파일본)을 동봉 Node로 detached 기동하고 S5 프로토콜(hello→challenge→auth→welcome→status→shutdown)을 수행한다 */
function runS5Daemon(step, nodeExe, s5Dir) {
  return new Promise((resolve) => {
    let done = false;
    const result = { ok: false, exe: nodeExe };
    const finish = (extra) => {
      if (done) return;
      done = true;
      Object.assign(result, extra);
      record(step, result);
      resolve();
    };
    const stateDir = path.join(app.getPath("userData"), "s5-state");
    fs.rmSync(stateDir, { recursive: true, force: true });
    fs.mkdirSync(stateDir, { recursive: true });
    const token = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(path.join(stateDir, "token"), token);
    const daemonJs = path.join(s5Dir, "daemon.js");
    const lockPath = path.join(stateDir, "daemon.lock");
    const t0 = Date.now();
    let child;
    try {
      child = spawn(nodeExe, [daemonJs, "--dir", stateDir], { detached: true, stdio: "ignore", windowsHide: true });
      child.unref();
    } catch (e) {
      return finish({ error: `spawn failed: ${String(e).slice(0, 200)}`, daemonJsExists: fs.existsSync(daemonJs) });
    }
    const deadline = Date.now() + 15_000;
    const poll = setInterval(() => {
      let lock = null;
      try {
        lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      } catch {}
      if (lock && lock.port) {
        clearInterval(poll);
        handshake(lock);
      } else if (Date.now() > deadline) {
        clearInterval(poll);
        finish({ error: "lock timeout 15s", daemonJsExists: fs.existsSync(daemonJs), childPid: child.pid, childAlive: isAlive(child.pid) });
      }
    }, 250);

    function handshake(lock) {
      const WebSocket = require("ws");
      const ws = new WebSocket(`ws://127.0.0.1:${lock.port}`);
      const clientNonce = crypto.randomBytes(16).toString("hex");
      const hmac = (role, serverNonce) => crypto.createHmac("sha256", token).update(`${role}|${serverNonce}|${clientNonce}`).digest("hex");
      const obs = { lock: { pid: lock.pid, port: lock.port, protocolVersion: lock.protocolVersion, startedAt: lock.startedAt }, lockAfterMs: Date.now() - t0, pidAliveAfterLock: isAlive(lock.pid) };
      let welcome = null;
      let statusSeq = null;
      let shutdownReply = null;
      const timer = setTimeout(() => {
        try { ws.terminate(); } catch {}
        finish({ ...obs, error: "handshake timeout 10s", welcome, statusSeq });
      }, 10_000);
      ws.on("open", () => ws.send(JSON.stringify({ type: "hello", clientNonce, protocolVersion: lock.protocolVersion })));
      ws.on("message", (raw) => {
        let msg = {};
        try { msg = JSON.parse(String(raw)); } catch {}
        if (msg.type === "challenge") {
          obs.serverProofValid = msg.serverProof === hmac("server", msg.serverNonce) && msg.pid === lock.pid && msg.nonce === lock.nonce;
          if (!obs.serverProofValid) {
            clearTimeout(timer);
            ws.close();
            return finish({ ...obs, error: "server proof invalid" });
          }
          ws.send(JSON.stringify({ type: "auth", clientProof: hmac("client", msg.serverNonce) }));
        } else if (msg.type === "welcome") {
          welcome = { seq: msg.seq, pid: msg.pid, protocolVersion: msg.protocolVersion };
          setTimeout(() => ws.send(JSON.stringify({ id: 1, type: "status" })), 1_500);
        } else if (msg.id === 1) {
          statusSeq = msg.seq;
          ws.send(JSON.stringify({ id: 2, type: "shutdown" }));
        } else if (msg.id === 2) {
          shutdownReply = msg;
          setTimeout(() => {
            clearTimeout(timer);
            const lockGone = !fs.existsSync(lockPath);
            const pidGone = !isAlive(lock.pid);
            try { ws.terminate(); } catch {}
            const seqIncreased = !!welcome && typeof statusSeq === "number" && statusSeq > welcome.seq;
            finish({ ...obs, ok: !!welcome && seqIncreased && lockGone && pidGone && !!shutdownReply.ok, welcome, statusSeq, seqIncreased, shutdownOk: !!shutdownReply.ok, lockGoneAfterShutdown: lockGone, pidGoneAfterShutdown: pidGone, ms: Date.now() - t0 });
          }, 1_500);
        }
      });
      ws.on("close", (code, reason) => {
        if (!shutdownReply) {
          clearTimeout(timer);
          finish({ ...obs, error: `closed ${code} ${String(reason)}`, welcome });
        }
      });
      ws.on("error", (e) => {
        clearTimeout(timer);
        finish({ ...obs, error: `ws error ${String(e && e.message)}`.slice(0, 200) });
      });
    }
  });
}
