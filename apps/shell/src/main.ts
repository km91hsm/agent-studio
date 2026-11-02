/**
 * Electron Shell main(P01 T6): `app://bundle/` 로 renderer dist 서빙(경로 탈출 차단 + CSP 헤더) → 데몬 ensure(락 검증·재접속 또는 detached spawn)
 * → DaemonClient 접속 → EventRelay → 창(WEB_PREFERENCES) + 트레이(열기/종료). 창 닫기는 hide, 트레이 종료는 `daemon.shutdown` 뒤 quit.
 * 렌더러 ↔ main 은 ipc-guard 를 거친 read/write RPC 와 events 배치만.
 * 환경변수: AGENT_STUDIO_STATE_DIR(기본 userData/daemon), AGENT_STUDIO_TOKEN_STORE(file|keyring, 기본 keyring), AGENT_STUDIO_DEV(devTools).
 * `--smoke`: 창 로드 → 렌더러 seq ≥ 1 대기 → daemon.status → stdout JSON → daemon.shutdown → 종료(LIVE 테스트 계약).
 */
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { app, BrowserWindow, ipcMain, Menu, nativeImage, net, protocol, session, Tray, type IpcMainInvokeEvent } from "electron";
import { DaemonClient, ensureDaemon, tokenStoreFor } from "@agent-studio/core";
import type { JournalEvent } from "@agent-studio/protocol";
import { createIpcHandlers, validateSender, type SenderInfo } from "./ipc-guard.js";
import { EventRelay } from "./relay.js";
import { APP_SCHEME, APP_SCHEME_PRIVILEGES, BUNDLE_HOST, BUNDLE_ORIGIN, CSP, devTools, resolveInside, WEB_PREFERENCES } from "./security.js";

const SMOKE = process.argv.includes("--smoke");
const IS_DEV = process.env.AGENT_STUDIO_DEV === "1";
const APP_PATH = app.getAppPath(); // apps/shell
const REPO_ROOT = resolve(APP_PATH, "..", "..");
const RENDERER_DIST = resolve(REPO_ROOT, "apps", "renderer", "dist");
const PRELOAD = join(APP_PATH, "dist", "preload.cjs");

function tokenStoreMode(): "file" | "keyring" {
  const v = process.env.AGENT_STUDIO_TOKEN_STORE ?? "keyring";
  if (v !== "file" && v !== "keyring") throw new Error(`AGENT_STUDIO_TOKEN_STORE must be file|keyring (got ${v})`);
  return v;
}

protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: { ...APP_SCHEME_PRIVILEGES } }]);

let win: BrowserWindow | undefined;
let tray: Tray | undefined;
let quitting = false;

function senderOf(ev: IpcMainInvokeEvent): SenderInfo {
  const frame = ev.senderFrame;
  return { senderId: ev.sender.id, frameUrl: frame?.url ?? "", isTopFrame: !!frame && frame === ev.sender.mainFrame };
}

function trayIcon() {
  const size = 16;
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) px.set([0x2f, 0x6f, 0xeb, 0xff], i * 4); // BGRA
  return nativeImage.createFromBitmap(px, { width: size, height: size });
}

async function start(): Promise<void> {
  const stateDir = process.env.AGENT_STUDIO_STATE_DIR ?? join(app.getPath("userData"), "daemon");
  const mode = tokenStoreMode();

  // 1) app://bundle/ → renderer dist (경로 탈출 차단, CSP 헤더)
  protocol.handle(APP_SCHEME, async (req) => {
    const url = new URL(req.url);
    if (url.host !== BUNDLE_HOST) return new Response("not found", { status: 404 });
    const file = resolveInside(RENDERER_DIST, url.pathname);
    if (!file) return new Response("forbidden", { status: 403 });
    const res = await net.fetch(pathToFileURL(file).href);
    const headers = new Headers(res.headers);
    headers.set("Content-Security-Policy", CSP);
    return new Response(res.body, { status: res.status, headers });
  });
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, cb) => cb(false));

  // 2) 데몬 ensure + 접속 (토큰은 저장소에서 읽는다 — 렌더러로 가지 않는다)
  const handle = await ensureDaemon(stateDir, { tokenStore: mode, entry: join(REPO_ROOT, "apps", "daemon", "src", "main.ts"), nodePath: "node", cwd: REPO_ROOT });
  const token = tokenStoreFor(stateDir, mode, handle).get();
  if (!token) throw new Error("daemon token missing in token store");
  const relay = new EventRelay();
  const daemon = await DaemonClient.connect({
    stateDir,
    token,
    onEvent: (e: JournalEvent) => relay.push(e),
    onDisconnect: () => {
      if (!quitting) process.stderr.write("daemon connection lost; retrying\n");
      if (!quitting) setTimeout(() => void daemon.reconnect().catch(() => {}), 1000);
    },
  });

  // 3) 창
  win = new BrowserWindow({ width: 1100, height: 760, show: !SMOKE, webPreferences: { ...WEB_PREFERENCES, preload: PRELOAD, devTools: devTools(IS_DEV) } });
  const wc = win.webContents;
  wc.on("will-navigate", (e) => e.preventDefault());
  wc.setWindowOpenHandler(() => ({ action: "deny" }));
  wc.on("will-attach-webview", (e) => e.preventDefault());
  win.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      win?.hide();
    }
  });
  const winRef = { webContentsId: wc.id };
  const handlers = createIpcHandlers(daemon, winRef);
  const subs = new Map<number, () => void>();
  ipcMain.handle("rpc.read", (ev, method: unknown, params: unknown) => handlers.read(senderOf(ev), method, params));
  ipcMain.handle("rpc.write", (ev, method: unknown, params: unknown) => handlers.write(senderOf(ev), method, params));
  ipcMain.handle("events.subscribe", (ev, fromSeq: unknown) => {
    if (!validateSender(senderOf(ev), winRef)) throw new Error("ipc rejected: sender is not the app window's top frame");
    const from = Math.max(1, Math.floor(Number(fromSeq)) || 1);
    subs.get(ev.sender.id)?.();
    const sender = ev.sender;
    const off = relay.subscribe(
      from,
      (batch) => {
        if (!sender.isDestroyed()) sender.send("events.batch", batch);
      },
      (f) => relay.buffered(f),
    );
    subs.set(sender.id, off);
    return true;
  });
  wc.on("destroyed", () => subs.get(wc.id)?.());

  // 4) 트레이
  const shutdownAndQuit = async () => {
    quitting = true;
    try {
      await daemon.call("daemon.shutdown");
    } catch {
      /* 이미 종료됐거나 접속 불가 */
    }
    daemon.close();
    app.quit();
  };
  tray = new Tray(trayIcon());
  tray.setToolTip("Agent Studio");
  tray.setContextMenu(Menu.buildFromTemplate([{ label: "열기", click: () => win?.show() }, { type: "separator" }, { label: "종료", click: () => void shutdownAndQuit() }]));
  tray.on("double-click", () => win?.show());

  await win.loadURL(`${BUNDLE_ORIGIN}index.html`);

  if (SMOKE) {
    const deadline = Date.now() + 15_000;
    let rendererSeq = 0;
    while (Date.now() < deadline) {
      rendererSeq = Number(await wc.executeJavaScript(`document.querySelector('[data-testid="last-seq"]')?.textContent ?? "0"`));
      if (rendererSeq >= 1) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    const preloadKeys = (await wc.executeJavaScript("Object.keys(window.agentStudio ?? {})")) as string[];
    const status = await daemon.call("daemon.status");
    process.stdout.write(`${JSON.stringify({ ok: rendererSeq >= 1, status, rendererSeq, preloadKeys, spawned: handle.spawned })}\n`);
    await shutdownAndQuit();
  }
}

app.on("window-all-closed", () => {
  /* 트레이 상주: 창이 닫혀도 종료하지 않는다 */
});
app.on("before-quit", () => {
  quitting = true;
});

void app.whenReady().then(() =>
  start().catch((e: unknown) => {
    process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
    app.exit(1);
  }),
);
