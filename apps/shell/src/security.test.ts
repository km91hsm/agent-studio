/**
 * T8 보안 설정 스냅숏(AC-P01-4, CI). 정본은 SECURITY_MODEL §7 하나뿐이다:
 * (a) `CSP` == §7 "유일한 정본" 문장의 백틱 문자열(바이트 일치; 문서 전체에서 `default-src 'self';` 블록은 §7 의 1개뿐)
 * (b) `WEB_PREFERENCES` == MASTER Global Constraints 8개 키·값(추가·누락 금지)
 * (c) renderer index.html meta CSP == `CSP`
 * (d) preload.ts: exposeInMainWorld 1회, 노출 키 {events, rpc}, `token`·`port`·`127.0.0.1` 문자열 없음
 * (e) main.ts·security.ts: `bypassCSP: true`·`unsafe-eval`·`nodeIntegration: true` 없음, app 스킴 privileges 에 bypassCSP 가 켜져 있지 않음
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APP_SCHEME, APP_SCHEME_PRIVILEGES, CSP, devTools, resolveInside, WEB_PREFERENCES } from "./security.js";

const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel: string) => readFileSync(here(rel), "utf8");

/** §7 절(`## 7.` ~ 다음 `## `) 안에서 "유일한 정본" 문구가 있는 줄의, 그 문구 뒤 첫 백틱 블록 */
function extractCanonicalCsp(doc: string): string[] {
  const lines = doc.split(/\r?\n/);
  const start = lines.findIndex((l) => /^## 7\./.test(l));
  if (start < 0) return [];
  let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  if (end < 0) end = lines.length;
  const out: string[] = [];
  for (const line of lines.slice(start, end)) {
    const at = line.indexOf("유일한 정본");
    if (at < 0) continue;
    const m = /`([^`]+)`/.exec(line.slice(at));
    if (m) out.push(m[1]!);
  }
  return out;
}

describe("security snapshot (AC-P01-4)", () => {
  it("(a) CSP 는 SECURITY_MODEL §7 정본과 바이트 일치하고, 문서 전체에 default-src 블록은 그 1개뿐", () => {
    const doc = read("../../../docs/planning/04_security_test/SECURITY_MODEL.md");
    const canonical = extractCanonicalCsp(doc);
    expect(canonical).toHaveLength(1);
    expect(Buffer.from(CSP, "utf8").equals(Buffer.from(canonical[0]!, "utf8"))).toBe(true);
    const allCspBlocks = [...doc.matchAll(/`(default-src 'self';[^`]*)`/g)].map((m) => m[1]);
    expect(allCspBlocks).toEqual([CSP]);
  });

  it("(b) WEB_PREFERENCES 는 Global Constraints 의 8개 키·값과 정확히 일치", () => {
    expect(WEB_PREFERENCES).toEqual({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    });
    expect(Object.keys(WEB_PREFERENCES)).toHaveLength(8);
    expect(devTools(false)).toBe(false);
    expect(devTools(true)).toBe(true);
  });

  it("(c) renderer index.html 의 meta CSP == CSP", () => {
    const html = read("../../renderer/index.html");
    const metas = [...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/g)].map((m) => m[1]);
    expect(metas).toEqual([CSP]);
  });

  it("(d) preload 는 agentStudio {events, rpc} 만 노출하고 token·port·127.0.0.1 문자열이 없다", () => {
    const src = read("./preload.ts");
    expect(src.match(/exposeInMainWorld\(/g)).toHaveLength(1);
    expect(/exposeInMainWorld\("agentStudio", api\)/.test(src)).toBe(true);
    const apiBody = /const api = \{([\s\S]*?)\n\};/.exec(src)?.[1] ?? "";
    const keys = [...apiBody.matchAll(/^  (\w+): \{/gm)].map((m) => m[1]).sort();
    expect(keys).toEqual(["events", "rpc"]);
    expect(/\btoken\b/i.test(src)).toBe(false);
    expect(/\bport\b/i.test(src)).toBe(false);
    expect(src.includes("127.0.0.1")).toBe(false);
    expect(/require\(/.test(src)).toBe(false);
    // IPC 채널 집합(리뷰C#5: 구독 해지가 main 까지 전달돼야 하므로 events.unsubscribe 포함)
    const preloadChannels = [...new Set([...src.matchAll(/ipcRenderer\.(?:invoke|on|removeListener)\("([^"]+)"/g)].map((m) => m[1]))].sort();
    expect(preloadChannels).toEqual(["events.batch", "events.subscribe", "events.unsubscribe", "rpc.read", "rpc.write"]);
    const mainChannels = [...new Set([...read("./main.ts").matchAll(/ipcMain\.handle\("([^"]+)"/g)].map((m) => m[1]))].sort();
    expect(mainChannels).toEqual(["events.subscribe", "events.unsubscribe", "rpc.read", "rpc.write"]);
  });

  it("(e) main.ts·security.ts 에 bypassCSP 활성·unsafe-eval·nodeIntegration:true 가 없고 app 스킴은 standard+secure", () => {
    for (const f of ["./main.ts", "./security.ts"]) {
      const src = read(f);
      expect(src.includes("unsafe-eval")).toBe(false);
      expect(/nodeIntegration:\s*true/.test(src)).toBe(false);
      expect(/bypassCSP:\s*true/.test(src)).toBe(false);
    }
    expect(read("./main.ts").includes("bypassCSP")).toBe(false);
    expect(APP_SCHEME).toBe("app");
    expect(APP_SCHEME_PRIVILEGES).toMatchObject({ standard: true, secure: true, bypassCSP: false });
    expect(CSP.includes("app:")).toBe(false);
  });

  it("resolveInside 는 루트 밖(.., 절대 경로, 드라이브, NUL)을 null 로 막고 / 는 index.html", () => {
    const root = here("../../renderer/dist");
    expect(resolveInside(root, "/")).toBe(here("../../renderer/dist/index.html"));
    expect(resolveInside(root, "/assets/a.js")).toBe(here("../../renderer/dist/assets/a.js"));
    expect(resolveInside(root, "/../package.json")).toBeNull();
    expect(resolveInside(root, "/..%2F..%2Fpackage.json")).toBeNull();
    expect(resolveInside(root, "/C:/Windows/win.ini")).toBeNull();
    expect(resolveInside(root, "//server/share")).toBe(here("../../renderer/dist/server/share")); // 앞 슬래시는 벗겨져 루트 안에 머문다(UNC 아님)
    expect(resolveInside(root, "/a%00.html")).toBeNull();
    expect(resolveInside(root, "/%ZZ")).toBeNull();
  });
});
