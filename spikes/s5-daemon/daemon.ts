/**
 * S5 — detached 데몬(스파이크). 127.0.0.1 WS JSON 서버 + HMAC 상호 인증 핸드셰이크(protocol.ts) + seq 틱 + 더미 자식 프로세스 + shutdown 시 트리 정리.
 * 기동: node --import tsx daemon.ts --dir <stateDir>   (launcher가 detached/stdio:'ignore'/windowsHide로 띄운다)
 * 락 파일 `<stateDir>/daemon.lock` = { pid, startedAt(OS 프로세스 생성 시각, UTC ISO), nonce, port, protocolVersion }
 * 토큰 `<stateDir>/token` — launcher가 기동 전에 쓴다(제품에서는 키링; 여기서는 tokenRef = 파일 경로). 토큰은 네트워크로 전송되지 않는다.
 */
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";
import { HELLO_TIMEOUT_MS, PROTOCOL_VERSION, proof, proofEquals } from "./protocol.js";

export interface LockFile {
  pid: number;
  startedAt: string;
  nonce: string;
  port: number;
  protocolVersion: number;
}

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
if (dirIdx < 0) throw new Error("--dir <stateDir> required");
const stateDir = args[dirIdx + 1];
const LOCK = join(stateDir, "daemon.lock");
const LOG = join(stateDir, "daemon.log");
const token = readFileSync(join(stateDir, "token"), "utf8").trim();
const nonce = randomBytes(16).toString("hex");
const log = (s: string) => {
  try {
    appendFileSync(LOG, `${new Date().toISOString()} ${s}\n`);
  } catch {}
};

/** 자기 프로세스의 OS 생성 시각(CIM) — 락 파일의 startedAt. launcher가 같은 출처로 대조한다(PID 재사용 감지). */
function ownCreationTime(): string {
  if (process.platform !== "win32") return new Date().toISOString();
  const out = execFileSync("pwsh", ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter 'ProcessId=${process.pid}').CreationDate.ToUniversalTime().ToString('o')`], { encoding: "utf8", timeout: 20_000 });
  return out.trim();
}

let seq = 0;
const children: ChildProcess[] = [];
const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
const authed = new Set<WebSocket>();

wss.on("listening", () => {
  const port = (wss.address() as { port: number }).port;
  const lock: LockFile = { pid: process.pid, startedAt: ownCreationTime(), nonce, port, protocolVersion: PROTOCOL_VERSION };
  writeFileSync(`${LOCK}.tmp`, JSON.stringify(lock));
  renameSync(`${LOCK}.tmp`, LOCK); // 원자적 교체 — 반쯤 쓰인 락을 launcher가 읽지 않게
  log(`listening pid=${process.pid} port=${port} nonce=${nonce} startedAt=${lock.startedAt}`);
});

setInterval(() => {
  seq++;
  const msg = JSON.stringify({ type: "event", seq });
  for (const ws of authed) if (ws.readyState === ws.OPEN) ws.send(msg);
}, 250);

wss.on("connection", (ws) => {
  const timer = setTimeout(() => ws.close(4002, "hello timeout"), HELLO_TIMEOUT_MS);
  let stage: "hello" | "auth" | "done" = "hello";
  let serverNonce = "";
  let clientNonce = "";
  ws.on("message", (raw) => {
    if (stage === "done") return handle(ws, JSON.parse(String(raw)));
    let msg: { type?: string; clientNonce?: string; protocolVersion?: number; clientProof?: string } = {};
    try {
      msg = JSON.parse(String(raw));
    } catch {}
    if (stage === "hello") {
      clearTimeout(timer);
      if (msg.type !== "hello" || typeof msg.clientNonce !== "string" || !msg.clientNonce) return reject(ws, 4001, "unauthorized");
      if (msg.protocolVersion !== PROTOCOL_VERSION) return reject(ws, 4003, `protocol mismatch: daemon=${PROTOCOL_VERSION}`);
      clientNonce = msg.clientNonce;
      serverNonce = randomBytes(16).toString("hex");
      stage = "auth";
      ws.send(JSON.stringify({ type: "challenge", serverNonce, nonce, pid: process.pid, serverProof: proof(token, serverNonce, clientNonce, "server") }));
      return;
    }
    // stage === "auth"
    if (msg.type !== "auth" || !proofEquals(msg.clientProof, proof(token, serverNonce, clientNonce, "client"))) return reject(ws, 4001, "unauthorized");
    stage = "done";
    authed.add(ws);
    ws.send(JSON.stringify({ type: "welcome", seq, pid: process.pid, nonce, protocolVersion: PROTOCOL_VERSION }));
    ws.on("close", () => authed.delete(ws));
  });
});

function reject(ws: WebSocket, code: number, reason: string) {
  log(`reject ${code} ${reason}`);
  ws.close(code, reason);
}

function handle(ws: WebSocket, msg: { id?: number; type: string; count?: number; withGrandchild?: boolean }) {
  const reply = (body: Record<string, unknown>) => ws.send(JSON.stringify({ id: msg.id, ok: true, ...body }));
  switch (msg.type) {
    case "status":
      return reply({ seq, children: children.map((c) => c.pid) });
    case "spawnChildren": {
      const n = msg.count ?? 1;
      const childScript = msg.withGrandchild
        ? "require('child_process').spawn(process.execPath,['-e','setTimeout(()=>{},600000)'],{stdio:'ignore'});setTimeout(()=>{},600000)"
        : "setTimeout(()=>{},600000)";
      const pids: number[] = [];
      for (let i = 0; i < n; i++) {
        const c = spawn(process.execPath, ["-e", childScript], { stdio: "ignore", windowsHide: true });
        children.push(c);
        pids.push(c.pid!);
      }
      log(`spawned children ${pids.join(",")} grandchild=${!!msg.withGrandchild}`);
      return reply({ children: pids });
    }
    case "shutdown": {
      const killed = children.map((c) => killTree(c));
      log(`shutdown killed=${JSON.stringify(killed)}`);
      reply({ killed });
      setTimeout(() => {
        try {
          rmSync(LOCK, { force: true });
        } catch {}
        wss.close();
        process.exit(0);
      }, 200);
      return;
    }
    default:
      return ws.send(JSON.stringify({ id: msg.id, ok: false, error: `unknown type ${msg.type}` }));
  }
}

/** 1차: 명시 kill. Windows는 `taskkill /T /F`(트리), 그 외는 SIGKILL(손자는 못 잡음 — 보고서에 기록). */
function killTree(c: ChildProcess): { pid: number | undefined; method: string; ok: boolean; detail?: string } {
  if (!c.pid) return { pid: undefined, method: "none", ok: false };
  if (process.platform === "win32") {
    try {
      const out = execFileSync("taskkill", ["/T", "/F", "/PID", String(c.pid)], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      // taskkill 메시지는 OS 로캘(cp949 등)이라 본문 대신 "PID <n>" 토큰만 뽑는다(로캘 무관)
      const pids = [...out.matchAll(/PID (\d+)/g)].map((m) => Number(m[1]));
      return { pid: c.pid, method: "taskkill /T /F", ok: true, detail: `terminated PIDs: ${[...new Set(pids)].join(",")}` };
    } catch (e) {
      return { pid: c.pid, method: "taskkill /T /F", ok: false, detail: String(e).slice(0, 200) };
    }
  }
  return { pid: c.pid, method: "SIGKILL", ok: c.kill("SIGKILL") };
}

process.on("uncaughtException", (e) => log(`uncaught ${String(e)}`));
