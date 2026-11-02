/**
 * 데몬 WS 핸드셰이크 공용 정의(S5 `spikes/s5-daemon/protocol.ts` 이식, P01 T2). 토큰 자체는 전송하지 않는다:
 * 서버가 먼저 토큰 소유를 증명(serverProof)하고, 클라이언트는 검증 뒤에만 자기 증명(clientProof)을 보낸다.
 *   client → hello{clientNonce, protocolVersion, role}
 *   server → challenge{serverNonce, nonce(락 nonce), pid, serverProof = HMAC(token, "server|serverNonce|clientNonce")}
 *   client → auth{clientProof = HMAC(token, "client|serverNonce|clientNonce")}
 *   server → welcome{seq, pid, nonce, protocolVersion, role}
 * close code: 4001 unauthorized(증명 불일치·형식 오류) / 4002 handshake timeout(hello→auth 전체 3s) / 4003 protocol mismatch
 * role: `main`(Shell main 프로세스 — control 메서드 허용) / `renderer`(P01 에서는 사용하지 않음; control 거부 검증용)
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const PROTOCOL_VERSION = 1;
export const HELLO_TIMEOUT_MS = 3_000;
export const CLOSE_UNAUTHORIZED = 4001;
export const CLOSE_HELLO_TIMEOUT = 4002;
export const CLOSE_PROTOCOL_MISMATCH = 4003;

export type ClientRole = "main" | "renderer";
export const CLIENT_ROLES: readonly ClientRole[] = ["main", "renderer"];

export interface HelloMessage {
  type: "hello";
  clientNonce: string;
  protocolVersion: number;
  role: ClientRole;
}
export interface ChallengeMessage {
  type: "challenge";
  serverNonce: string;
  nonce: string;
  pid: number;
  serverProof: string;
}
export interface AuthMessage {
  type: "auth";
  clientProof: string;
}
export interface WelcomeMessage {
  type: "welcome";
  seq: number;
  pid: number;
  nonce: string;
  protocolVersion: number;
  role: ClientRole;
}

export function proof(token: string, serverNonce: string, clientNonce: string, role: "server" | "client"): string {
  return createHmac("sha256", token).update(`${role}|${serverNonce}|${clientNonce}`).digest("hex");
}

export function proofEquals(a: string | undefined, b: string): boolean {
  if (typeof a !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}
