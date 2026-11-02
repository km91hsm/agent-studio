/**
 * launcher 단위 테스트(리뷰B#6): 토큰 저장소는 Shell 설정 모드가 기준이고, 락의 tokenRef 는 그 모드의 예상 참조와 일치해야 한다.
 * 조작된 락이 저장소 선택을 바꾸지 못한다(닫힌 실패).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DefaultPolicyBroker } from "../approval-broker.js";
import { ApprovalCoordinator } from "../approval-coordinator.js";
import { PolicyGate } from "../isolation.js";
import { MemoryEventStore } from "../journal/memory-store.js";
import { Scheduler } from "../scheduler.js";
import { FileTokenStore } from "../token-store.js";
import { ensureDaemon, tokenStoreFor } from "./launcher.js";
import { listProcesses, readLock, writeLock } from "./lock.js";
import { PROTOCOL_VERSION } from "./protocol.js";
import { startRpcServer } from "./rpc-server.js";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("tokenStoreFor (리뷰B#6)", () => {
  it("file 모드 + 일치하는 file: 참조 → FileTokenStore, keyring 모드 + 기본 키링 참조 → 키링", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-launcher-"));
    dirs.push(dir);
    const expected = new FileTokenStore(dir).ref();
    const s = tokenStoreFor(dir, "file", { tokenRef: expected });
    expect(s).toBeInstanceOf(FileTokenStore);
    expect(s.ref()).toBe(expected);
    expect(tokenStoreFor(dir, "keyring", { tokenRef: "keyring:agent-studio/daemon-token" }).ref()).toBe("keyring:agent-studio/daemon-token");
  });

  it("락의 tokenRef 가 설정 모드와 다르면 throw — 저장소를 바꾸지 않는다", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-launcher-"));
    dirs.push(dir);
    expect(() => tokenStoreFor(dir, "keyring", { tokenRef: new FileTokenStore(dir).ref() })).toThrow(/tokenRef/);
    expect(() => tokenStoreFor(dir, "file", { tokenRef: "keyring:agent-studio/daemon-token" })).toThrow(/tokenRef/);
    expect(() => tokenStoreFor(dir, "file", { tokenRef: `file:${join(dir, "elsewhere", "token")}` })).toThrow(/tokenRef/);
    expect(() => tokenStoreFor(dir, "keyring", { tokenRef: "keyring:other-service/daemon-token" })).toThrow(/tokenRef/);
  });

describe.skipIf(process.platform !== "win32")("listProcesses 셸 폴백 (최종리뷰I3)", () => {
  it("첫 셸(pwsh)이 없으면 다음 셸(powershell.exe)로 넘어가 자기 pid 를 찾는다", () => {
    const list = listProcesses({ shells: ["agent-studio-missing-shell.exe", "powershell.exe"] });
    expect(list.some((p) => p.pid === process.pid && p.startedAt !== "")).toBe(true);
  });
  it("모든 셸이 없으면 throw — 조용한 빈 목록(pid_gone 오판)은 금지", () => {
    expect(() => listProcesses({ shells: ["agent-studio-missing-1.exe", "agent-studio-missing-2.exe"] })).toThrow(/process list unavailable/);
  });
});

describe("ensureDaemon 프로세스 조회 실패 (최종리뷰I3)", () => {
  it("조회가 실패해도 접속이 되고 nonce 가 맞으면 live — 살아 있는 데몬 옆에 두 번째를 띄우지 않는다", async () => {
    const dir = mkdtempSync(join(tmpdir(), "as-ensure-"));
    dirs.push(dir);
    const store = new MemoryEventStore();
    store.append({ type: "ProjectRegistered", projectId: "default", payload: { id: "default", path: dir } });
    const scheduler = new Scheduler(store);
    const gate = new PolicyGate(store, "default");
    const broker = new DefaultPolicyBroker(store, () => gate.policy());
    const coordinator = new ApprovalCoordinator(scheduler, broker, store);
    const tokens = new FileTokenStore(dir);
    tokens.set("tok-ensure");
    const server = await startRpcServer({ store, scheduler, broker, coordinator, gate, token: "tok-ensure", stateDir: dir, tokenRef: tokens.ref() });
    try {
      const probe = () => {
        throw new Error("spawn pwsh ENOENT");
      };
      const h = await ensureDaemon(dir, { tokenStore: "file", probe });
      expect(h.spawned).toBe(false);
      expect(h.assessment).toEqual({ verdict: "live" });
      expect(h.nonce).toBe(server.lock.nonce);
    } finally {
      await server.close();
    }
  });
  it("조회도 접속도 실패하면 락을 보존하고 명시적 오류(stale 로 오판해 spawn 하지 않는다)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "as-ensure-"));
    dirs.push(dir);
    const tokens = new FileTokenStore(dir);
    tokens.set("tok-ensure");
    const port = await new Promise<number>((resolve) => {
      const srv = createServer();
      srv.listen(0, "127.0.0.1", () => {
        const p = (srv.address() as { port: number }).port;
        srv.close(() => resolve(p)); // 아무도 듣지 않는 포트
      });
    });
    const lock = { pid: process.pid, startedAt: new Date().toISOString(), nonce: "nonce-x", port, protocolVersion: PROTOCOL_VERSION, tokenRef: tokens.ref() };
    writeLock(dir, lock);
    const probe = () => {
      throw new Error("spawn pwsh ENOENT");
    };
    await expect(ensureDaemon(dir, { tokenStore: "file", probe })).rejects.toThrow(/process list unavailable/);
    expect(readLock(dir)).toEqual(lock);
  });
});
});
