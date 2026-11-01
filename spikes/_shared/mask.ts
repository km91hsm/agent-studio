import { homedir, hostname, userInfo } from "node:os";

const THREAD_ID = /\b01[0-9a-f]{6}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;
const INSTALLATION_ID = /("installationId"\s*:\s*")[^"]+(")/g;
const TOKENS = /\b(ghp_[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9]{32,}|xox[abp]-[A-Za-z0-9-]{8,}|AKIA[0-9A-Z]{16})\b/g;

/** 녹화 픽스처 커밋 전 마스킹: 홈 경로·사용자명·thread id·토큰 패턴. */
export function mask(text: string): string {
  const user = userInfo().username;
  const home = homedir();
  let out = text;
  const bs = String.fromCharCode(92);
  for (const h of [home, home.split(bs).join(bs + bs), home.split(bs).join("/")]) {
    out = out.split(h).join("<home>");
  }
  if (user) out = out.split(user).join("<user>");
  const host = hostname();
  if (host) out = out.split(host).join("<host>");
  return out.replace(THREAD_ID, "<thread-id>").replace(TOKENS, "<secret>").replace(INSTALLATION_ID, "$1<installation-id>$2");
}

/** 녹화 이벤트 정화: MCP 기동 상태 알림의 긴 error 본문(HTML 챌린지·토큰성 질의 문자열)을 잘라낸다. */
export function sanitizeEvents<T extends { msg: unknown }>(events: T[], maxErrorLen = 200): T[] {
  return events.map((e) => {
    const msg = e.msg as { method?: string; params?: { error?: unknown } } | undefined;
    if (msg?.method === "mcpServer/startupStatus/updated" && typeof msg.params?.error === "string" && msg.params.error.length > maxErrorLen) {
      const err = msg.params.error;
      const cut = err.slice(0, maxErrorLen).replace(/<[^>]*$/, "");
      return { ...e, msg: { ...msg, params: { ...msg.params, error: `${cut} <error-body-removed len=${err.length}>` } } };
    }
    return e;
  });
}
