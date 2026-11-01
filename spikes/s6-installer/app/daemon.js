/**
 * S6 — 데몬 런타임 비교용 최소 데몬(두 런타임에서 같은 파일을 실행).
 *   runtime=electron : ELECTRON_RUN_AS_NODE=1 <App.exe> daemon.js ... (Electron ABI 모듈: app.asar.unpacked/node_modules)
 *   runtime=node     : <resources>/runtime/node.exe daemon.js ...      (Node ABI 모듈: <resources>/runtime/node_modules)
 * 단계: better-sqlite3 로드 → WAL 쓰기 → node-pty 셸 spawn → 실제 로드된 .node 경로·sha256 기록(Codex 리뷰 #3) → 결과 JSON(--out) 기록 후 종료.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const args = process.argv.slice(2);
const arg = (k) => args[args.indexOf(k) + 1];
const runtime = arg("--runtime");
const modulesDir = arg("--modules");
const dbPath = arg("--db");
const outPath = arg("--out");

const result = {
  runtime,
  execPath: process.execPath,
  pid: process.pid,
  versions: { node: process.versions.node, electron: process.versions.electron ?? null, modules: process.versions.modules, napi: process.versions.napi },
  env: { ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE ?? null },
  modulesDir,
  sqlite: { ok: false },
  pty: { ok: false },
  loadedNative: [],
};

/** require 캐시에 들어온 .node 파일 = 실제로 로드된 네이티브 바이너리(경로·해시·소속 모듈) */
function loadedNative() {
  return Object.keys(require.cache)
    .filter((k) => k.endsWith(".node"))
    .map((p) => ({
      path: p.replace(/\\/g, "/"),
      module: (p.match(/node_modules[\\/](?:@[^\\/]+[\\/])?([^\\/]+)[\\/]/) || [])[1] || null,
      sha256: crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"),
      bytes: fs.statSync(p).size,
    }));
}

function finish() {
  try {
    result.loadedNative = loadedNative();
  } catch (e) {
    result.loadedNativeError = String(e).slice(0, 200);
  }
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  process.exit(0);
}

// 1) better-sqlite3 + WAL
try {
  const Database = require(path.join(modulesDir, "better-sqlite3"));
  const db = new Database(dbPath);
  const mode = db.pragma("journal_mode = WAL", { simple: true });
  db.exec("CREATE TABLE IF NOT EXISTS journal (seq INTEGER PRIMARY KEY, body TEXT)");
  const info = db.prepare("INSERT INTO journal (body) VALUES (?)").run(`s6-${runtime}-${Date.now()}`);
  const row = db.prepare("SELECT seq, body FROM journal WHERE seq = ?").get(info.lastInsertRowid);
  result.sqlite = { ok: !!row && mode === "wal", journalMode: mode, walExists: fs.existsSync(`${dbPath}-wal`), row };
  db.close();
} catch (e) {
  result.sqlite = { ok: false, error: String(e && e.stack ? e.stack : e).slice(0, 600) };
}

// 2) node-pty
let ptyDone = false;
try {
  const pty = require(path.join(modulesDir, "node-pty"));
  const shell = process.platform === "win32" ? "cmd.exe" : "sh";
  const p = pty.spawn(shell, process.platform === "win32" ? ["/c", "echo s6-pty-ok"] : ["-c", "echo s6-pty-ok"], { cols: 80, rows: 24, cwd: process.cwd(), env: process.env });
  let out = "";
  p.onData((d) => (out += d));
  p.onExit(({ exitCode }) => {
    result.pty = { ok: /s6-pty-ok/.test(out), exitCode, output: out.replace(/\u001b\][^\u0007]*\u0007|\u001b\[[0-9;?]*[A-Za-z]/g, "").trim().slice(0, 200) };
    ptyDone = true;
    finish();
  });
  setTimeout(() => {
    if (!ptyDone) {
      result.pty = { ok: false, error: "timeout 15s", output: out.slice(0, 200) };
      try { p.kill(); } catch {}
      finish();
    }
  }, 15_000);
} catch (e) {
  result.pty = { ok: false, error: String(e && e.stack ? e.stack : e).slice(0, 600) };
  finish();
}
