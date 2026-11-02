/**
 * `--security-probe`(T8, AC-P01-5): 렌더러 안에서 실행할 검사 스크립트. main 이 `webContents.executeJavaScript` 로 주입한다.
 * 렌더러가 데몬 포트에 fetch/WebSocket 을 시도하면 CSP `connect-src 'none'` 이 막아야 하며(connection refused 가 아니라 CSP 위반으로),
 * preload 노출 키는 {events, rpc} 뿐이고 Node `process` 는 없어야 한다. 결과는 JSON 직렬화 가능한 객체 하나.
 */
export interface SecurityProbeResult {
  violations: { directive: string; blockedURI: string }[];
  fetch: string;
  ws: string;
  keys: string[];
  processUndefined: boolean;
  requireUndefined: boolean;
}

export function securityProbeScript(port: number): string {
  const p = Math.floor(Number(port));
  if (!Number.isFinite(p) || p <= 0) throw new Error(`invalid port ${port}`);
  return `(async () => {
  const violations = [];
  document.addEventListener("securitypolicyviolation", (e) => violations.push({ directive: e.violatedDirective, blockedURI: e.blockedURI }));
  let fetchResult;
  try { await fetch("http://127.0.0.1:${p}/"); fetchResult = "resolved"; } catch (e) { fetchResult = "rejected: " + (e && e.message); }
  const wsResult = await new Promise((res) => {
    try {
      const ws = new WebSocket("ws://127.0.0.1:${p}/");
      ws.onopen = () => res("open");
      ws.onerror = () => res("error");
      ws.onclose = () => res("closed");
      setTimeout(() => res("timeout"), 3000);
    } catch (e) { res("throw: " + (e && e.message)); }
  });
  await new Promise((r) => setTimeout(r, 300));
  return {
    violations,
    fetch: fetchResult,
    ws: wsResult,
    keys: Object.keys(window.agentStudio || {}),
    processUndefined: typeof process === "undefined",
    requireUndefined: typeof require === "undefined",
  };
})()`;
}
