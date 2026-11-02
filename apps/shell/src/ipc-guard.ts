/**
 * IPC 가드(P01 T6, SECURITY_MODEL §7 "좁은 IPC"). 순서: sender(같은 webContents + app://bundle/ + 최상위 frame) → 메서드 분류(read/write 만;
 * control `daemon.shutdown` 과 비노출 `task.transition` 은 둘 다 false) → params 스키마(Task 9 RPC_PARAMS_SCHEMA 공용) → 데몬 호출.
 * 어느 단계든 실패하면 데몬 호출 0회. Electron 을 import 하지 않는다(단위 테스트 가능).
 */
import { isRpcMethod, RPC_METHODS, validateParams as validateRpcParams, type RpcMethod } from "@agent-studio/protocol";
import { BUNDLE_ORIGIN } from "./security.js";

export interface SenderInfo {
  senderId: number;
  frameUrl: string;
  isTopFrame: boolean;
}
export interface WindowRef {
  webContentsId: number;
}
export interface DaemonCaller {
  call(method: string, params?: unknown): Promise<unknown>;
}
export type IpcHandler = (sender: SenderInfo, method: unknown, params: unknown) => Promise<unknown>;

export function validateSender(ev: SenderInfo, win: WindowRef): boolean {
  return ev.senderId === win.webContentsId && ev.isTopFrame === true && typeof ev.frameUrl === "string" && ev.frameUrl.startsWith(BUNDLE_ORIGIN);
}

export const isReadMethod = (m: unknown): m is RpcMethod => typeof m === "string" && (RPC_METHODS.read as readonly string[]).includes(m);
export const isWriteMethod = (m: unknown): m is RpcMethod => typeof m === "string" && (RPC_METHODS.write as readonly string[]).includes(m);

/** Task 9 의 공용 스키마로 params 를 검사한다. 모르는 메서드는 오류 1건. */
export function validateParams(method: string, params: unknown): string[] {
  if (!isRpcMethod(method)) return [`unknown method ${method}`];
  return validateRpcParams(method, params);
}

export function createIpcHandlers(daemon: DaemonCaller, win: WindowRef): { read: IpcHandler; write: IpcHandler } {
  const guarded = (cls: "read" | "write", allowed: (m: unknown) => m is RpcMethod): IpcHandler => {
    return async (sender, method, params) => {
      if (!validateSender(sender, win)) throw new Error("ipc rejected: sender is not the app window's top frame");
      if (!allowed(method)) throw new Error(`ipc rejected: ${String(method)} is not a ${cls} method`);
      const errors = validateParams(method, params);
      if (errors.length) throw new Error(`ipc rejected: invalid params (${errors.join("; ")})`);
      return daemon.call(method, params);
    };
  };
  return { read: guarded("read", isReadMethod), write: guarded("write", isWriteMethod) };
}
