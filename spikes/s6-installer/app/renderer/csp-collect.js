// CSP 위반 수집(렌더러 전역) — renderer.js가 보고에 포함한다
window.__s6Violations = [];
document.addEventListener("securitypolicyviolation", (e) => {
  window.__s6Violations.push({ directive: e.effectiveDirective, blocked: String(e.blockedURI).slice(0, 120), source: `${e.sourceFile || ""}:${e.lineNumber || 0}`.slice(0, 120), sample: (e.sample || "").slice(0, 80) });
});
