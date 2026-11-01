import { homedir, hostname, userInfo } from "node:os";

const THREAD_ID = /\b01[0-9a-f]{6}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;
const INSTALLATION_ID = /("installationId"\s*:\s*")[^"]+(")/g;
const TOKENS = /\b(ghp_[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9]{32,}|xox[abp]-[A-Za-z0-9-]{8,}|AKIA[0-9A-Z]{16})\b/g;
/** Claude Code 세션 ID(UUID v4)가 담기는 필드 — 값이 등장하는 모든 자리(resume 인자·전사 경로 등)를 치환하기 위해 먼저 수집한다 */
const SESSION_ID_FIELD = /"session(?:_id|Id)"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/g;
/** `C:\Users\<이름>` 형태의 모든 사용자 세그먼트(스트리밍 델타가 사용자명을 토큰 경계에서 잘라 남긴 조각 포함) — 이미 `<user>`인 것은 제외 */
const USERS_SEGMENT = /(\bUsers(?:\\{1,4}|\/)+)(?!<user>)[^\\/"'\s<]+/g;

/** 녹화 픽스처 커밋 전 마스킹: 홈 경로(1·2·4중 백슬래시, 슬래시)·사용자명·호스트명·thread id·Claude session id·토큰 패턴. */
export function mask(text: string): string {
  const user = userInfo().username;
  const home = homedir();
  let out = text;
  const bs = String.fromCharCode(92);
  // 4중(이중 JSON 인코딩) → 2중(JSON) → 1중 → 슬래시 순: 긴 변형부터 치환해야 짧은 변형이 중간을 끊지 않는다
  for (const h of [home.split(bs).join(bs + bs + bs + bs), home.split(bs).join(bs + bs), home, home.split(bs).join("/")]) {
    out = out.split(h).join("<home>");
  }
  if (user) out = out.split(user).join("<user>");
  out = out.replace(USERS_SEGMENT, "$1<user>");
  const host = hostname();
  if (host) out = out.split(host).join("<host>");
  const sessionIds = new Set<string>();
  for (const m of out.matchAll(SESSION_ID_FIELD)) sessionIds.add(m[1]);
  for (const id of sessionIds) out = out.split(id).join("<session-id>");
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
