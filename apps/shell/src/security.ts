/**
 * Shell 보안 설정 정본 상수(P01 T6, SECURITY_MODEL §7). 값은 §7 과 바이트 단위로 같아야 한다 — T8 스냅숏 테스트가 문서에서 추출해 대조한다.
 * 이 파일은 Electron 을 import 하지 않는다(순수 상수·경로 함수 → 단위 테스트 가능).
 */
import { isAbsolute, join, normalize, relative } from "node:path";

export const APP_SCHEME = "app";
export const BUNDLE_HOST = "bundle";
export const BUNDLE_ORIGIN = `${APP_SCHEME}://${BUNDLE_HOST}/`;

/** SECURITY_MODEL §7 의 유일한 정본 CSP(renderer index.html meta 와 동일 문자열). 응답 헤더로도 보낸다. */
export const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'";

export const WEB_PREFERENCES = {
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  nodeIntegrationInSubFrames: false,
  webviewTag: false,
  webSecurity: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
} as const;

/** devTools 는 개발 모드에서만 */
export const devTools = (isDev: boolean): boolean => isDev;

/** app 스킴 privileges — bypassCSP 는 절대 켜지 않는다 */
export const APP_SCHEME_PRIVILEGES = { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false, bypassCSP: false } as const;

/**
 * `root` 아래의 파일 경로로 해석한다. `..`·절대 경로·드라이브 탈출은 null(경로 탈출 차단). URL 경로 `/` 는 index.html.
 */
export function resolveInside(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const rel = decoded === "/" || decoded === "" ? "index.html" : decoded.replace(/^\/+/, "");
  if (isAbsolute(rel) || /^[A-Za-z]:/.test(rel)) return null;
  const abs = normalize(join(root, rel));
  const back = relative(root, abs);
  if (!back || back.startsWith("..") || isAbsolute(back)) return null;
  return abs;
}
