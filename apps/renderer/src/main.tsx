/**
 * Renderer 진입(P01 T7). preload(`window.agentStudio`)의 `events.subscribe(lastAppliedSeq+1)` 로 배치를 받아 store 에 적용한다.
 * GapError 가 나면 구독을 끊고 `lastAppliedSeq+1` 부터 다시 구독한다(Shell 릴레이의 재구독 경로).
 */
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { createStore, GapError } from "./store.js";

const store = createStore();
const api = window.agentStudio;

function subscribeFrom(seq: number): void {
  if (!api) return;
  const off = api.events.subscribe(seq, (batch) => {
    try {
      store.applyBatch(batch);
    } catch (e) {
      if (e instanceof GapError) {
        off();
        subscribeFrom(store.lastAppliedSeq + 1);
        return;
      }
      throw e;
    }
  });
}
subscribeFrom(store.lastAppliedSeq + 1);

createRoot(document.getElementById("root")!).render(<App store={store} api={api} />);
