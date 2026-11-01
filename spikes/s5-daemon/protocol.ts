/**
 * S5 — 데몬 WS 핸드셰이크 공용 정의(daemon.ts·launcher.ts 공유).
 * 토큰 자체는 전송하지 않는다(Codex 리뷰 #1): 서버가 먼저 토큰 소유를 증명(serverProof)하고, 클라이언트는 검증 뒤에만 자기 증명(clientProof)을 보낸다.
 *   client → hello{clientNonce, protocolVersion}
 *   server → challenge{serverNonce, nonce(락 nonce), pid, serverProof = HMAC(token, "server|serverNonce|clientNonce")}
 *   client → auth{clientProof = HMAC(token, "client|serverNonce|clientNonce")}
 *   server → welcome{seq, pid, nonce, protocolVersion}
 * close code: 4001 unauthorized(증명 불일치·형식 오류) / 4002 hello timeout(3s) / 4003 protocol mismatch
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const PROTOCOL_VERSION = 1;
export const HELLO_TIMEOUT_MS = 3_000;

export function proof(token: string, serverNonce: string, clientNonce: string, role: "server" | "client"): string {
  return createHmac("sha256", token).update(`${role}|${serverNonce}|${clientNonce}`).digest("hex");
}

export function proofEquals(a: string | undefined, b: string): boolean {
  if (typeof a !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}
