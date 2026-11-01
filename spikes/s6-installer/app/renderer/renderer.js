// Monaco Diff 렌더 + worker 로드(같은 origin app://bundle) → 결과를 preload 경유로 보고
(function () {
  const t0 = performance.now();
  const report = (extra) =>
    window.s6.report({
      step: "monaco_diff",
      ...extra,
      cspViolations: window.__s6Violations.slice(0, 40),
      cspViolationCount: window.__s6Violations.length,
      cspDirectivesHit: [...new Set(window.__s6Violations.map((v) => v.directive))],
    });

  if (typeof require !== "function" || !require.config) {
    report({ ok: false, error: "monaco loader not available" });
    return;
  }
  require.config({ paths: { vs: "app://bundle/monaco/vs" } });
  // CSP가 blob: worker를 허용하지 않으면 getWorker로 같은 origin Worker를 직접 만든다(getWorkerUrl 경로는 Monaco가 blob: 래퍼를 쓴다 — 실측)
  const cspMeta = (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || "";
  const workerMode = /worker-src[^;]*blob:/.test(cspMeta) ? "getWorkerUrl" : "getWorker-direct";
  self.MonacoEnvironment =
    workerMode === "getWorkerUrl"
      ? { getWorkerUrl: function () { return "app://bundle/monaco/vs/base/worker/workerMain.js"; } }
      : { getWorker: function () { return new Worker("app://bundle/monaco/vs/base/worker/workerMain.js"); } };
  let workerErrors = [];
  window.addEventListener("error", (e) => workerErrors.push(String(e.message).slice(0, 160)));
  window.addEventListener("unhandledrejection", (e) => workerErrors.push(String(e.reason).slice(0, 160)));

  require(["vs/editor/editor.main"], function () {
    const t1 = performance.now();
    const original = monaco.editor.createModel("const a = 1;\nconst b = 2;\nconsole.log(a + b);\n", "javascript");
    const modified = monaco.editor.createModel("const a = 1;\nconst b = 3;\nconst c = 4;\nconsole.log(a + b + c);\n", "javascript");
    const diff = monaco.editor.createDiffEditor(document.getElementById("diff"), { automaticLayout: true, renderSideBySide: true });
    diff.setModel({ original, modified });
    let reported = false;
    const done = (how) => {
      if (reported) return;
      reported = true;
      const t2 = performance.now();
      const changes = diff.getLineChanges();
      report({
        ok: Array.isArray(changes) && changes.length > 0,
        how,
        workerMode,
        csp: cspMeta,
        lineChanges: changes ? changes.length : null,
        monacoLoadMs: Math.round(t1 - t0),
        diffReadyMs: Math.round(t2 - t1),
        workerErrors: workerErrors.slice(0, 10),
        workerCount: typeof navigator !== "undefined" ? "n/a" : null,
      });
    };
    diff.onDidUpdateDiff(() => done("onDidUpdateDiff"));
    setTimeout(() => done("timeout-8s"), 8000);
  }, function (err) {
    report({ ok: false, error: `amd load failed: ${String(err).slice(0, 200)}`, workerErrors });
  });
})();
