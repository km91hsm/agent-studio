// CSP 위반 수집 + Worker 생성 관찰(렌더러 전역, Monaco 로더보다 먼저 실행) — renderer.js가 보고에 포함한다
window.__s6Violations = [];
document.addEventListener("securitypolicyviolation", (e) => {
  window.__s6Violations.push({ directive: e.effectiveDirective, blocked: String(e.blockedURI).slice(0, 120), source: `${e.sourceFile || ""}:${e.lineNumber || 0}`.slice(0, 120), sample: (e.sample || "").slice(0, 80) });
});

// Worker 생성·응답·오류를 계측(Codex 리뷰 #5): 누가 어떤 URL(app:// vs blob:)로 워커를 만들고, 워커가 메시지를 돌려주는지
window.__s6Workers = [];
(function () {
  const OrigWorker = window.Worker;
  function ObservedWorker(url, opts) {
    const u = String(url);
    const rec = { url: u.slice(0, 120), scheme: u.split(":")[0], messages: 0, error: null, createdAtMs: Math.round(performance.now()) };
    window.__s6Workers.push(rec);
    const w = new OrigWorker(url, opts);
    w.addEventListener("message", () => rec.messages++);
    w.addEventListener("error", (e) => (rec.error = String((e && e.message) || e).slice(0, 120)));
    return w;
  }
  ObservedWorker.prototype = OrigWorker.prototype;
  window.Worker = ObservedWorker;
})();
