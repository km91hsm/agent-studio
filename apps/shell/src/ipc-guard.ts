/**
 * IPC 가드(P01 T6, SECURITY_MODEL §7 "좁은 IPC"). 순서: sender(같은 webContents + app://bundle/ + 최상위 frame) → 메서드 분류(read/write 만;
 * control `daemon.shutdown` 과 비노출 `task.transition` 은 둘 다 false) → params 스키마(Task 9 RPC_PARAMS_SCHEMA 공용) → 데몬 호출.
 * 어느 단계든 실패하면 데몬 호출 0회. Electron 을 import 하지 않는다(단위 테스트 가능).
 * - `events.subscribe` 는 데몬 연결(Shell main) 범위의 메서드라 렌더러에 노출하지 않는다 — 렌더러의 이벤트 구독은 `events.subscribe` IPC 채널(릴레이)로만(리뷰C#1)
 * - 렌더러로 가는 응답에서 `tokenRef`(파일 모드면 토큰 경로)·`nonce` 는 제거한다(리뷰C#2)
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

/** 데몬 연결 자체를 바꾸는 메서드 — 렌더러 채널에서 제외(Shell main 내부 전용) */
export const RENDERER_HIDDEN_METHODS: ReadonlySet<string> = new Set(["events.subscribe"]);
/** 렌더러 응답에서 제거하는 키(토큰 참조·락 nonce) */
export const RENDERER_REDACTED_KEYS: readonly string[] = ["tokenRef", "nonce"];

export const isReadMethod = (m: unknown): m is RpcMethod => typeof m === "string" && !RENDERER_HIDDEN_METHODS.has(m) && (RPC_METHODS.read as readonly string[]).includes(m);
export const isWriteMethod = (m: unknown): m is RpcMethod => typeof m === "string" && (RPC_METHODS.write as readonly string[]).includes(m);

/** Task 9 의 공용 스키마로 params 를 검사한다. 모르는 메서드는 오류 1건. */
export function validateParams(method: string, params: unknown): string[] {
  if (!isRpcMethod(method)) return [`unknown method ${method}`];
  return validateRpcParams(method, params);
}

/** 렌더러로 보낼 결과에서 내부 식별자를 제거한다(최상위 키만 — RPC 결과는 평면 객체 또는 배열). */
export function redactForRenderer(result: unknown): unknown {
  if (result === null || typeof result !== "object" || Array.isArray(result)) return result;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(result as Record<string, unknown>)) if (!RENDERER_REDACTED_KEYS.includes(k)) out[k] = v;
  return out;
}

export function createIpcHandlers(daemon: DaemonCaller, win: WindowRef): { read: IpcHandler; write: IpcHandler } {
  const guarded = (cls: "read" | "write", allowed: (m: unknown) => m is RpcMethod): IpcHandler => {
    return async (sender, method, params) => {
      if (!validateSender(sender, win)) throw new Error("ipc rejected: sender is not the app window's top frame");
      if (!allowed(method)) throw new Error(`ipc rejected: ${String(method)} is not a ${cls} method`);
      const errors = validateParams(method, params);
      if (errors.length) throw new Error(`ipc rejected: invalid params (${errors.join("; ")})`);
      return redactForRenderer(await daemon.call(method, params));
    };
  };
  return { read: guarded("read", isReadMethod), write: guarded("write", isWriteMethod) };
}
