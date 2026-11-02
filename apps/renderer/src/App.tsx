/** 최소 UI(P01 T7): Task 목록·lastAppliedSeq·보류 승인 수 + "빈 Task 제출" 버튼(`rpc.write('task.submit')`). */
import { useCallback, useState, useSyncExternalStore } from "react";
import type { AppStore } from "./store.js";

export function App({ store, api }: { store: AppStore; api: Window["agentStudio"] }) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [error, setError] = useState<string | null>(null);
  const tasks = Object.values(snap.tasks);
  const pendingCount = Object.keys(snap.pendingApprovals).length;
  const submit = useCallback(() => {
    if (!api) return setError("preload API 없음");
    api.rpc.write("task.submit", { title: `empty task ${tasks.length + 1}`, kind: "impl" }).then(
      () => setError(null),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    );
  }, [api, tasks.length]);
  return (
    <main>
      <header>
        <h1>Agent Studio</h1>
        <p className="meta">
          seq <strong data-testid="last-seq">{snap.lastAppliedSeq}</strong> · 보류 승인 <strong data-testid="pending-count">{pendingCount}</strong> · preload {api ? "연결" : "없음"}
        </p>
      </header>
      <section>
        <button type="button" onClick={submit} data-testid="submit-empty-task">
          빈 Task 제출
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section>
        <h2>Tasks ({tasks.length})</h2>
        <ul data-testid="task-list">
          {tasks.map((t) => (
            <li key={t.id}>
              <code>{t.id}</code> {t.title} — <span className={`status status-${t.status.toLowerCase()}`}>{t.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
