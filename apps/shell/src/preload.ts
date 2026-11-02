/**
 * preload(P01 T6, sandbox:true + contextIsolation:true). `window.agentStudio = { events.subscribe, rpc.read, rpc.write }` 만 노출한다.
 * 채널은 `events.subscribe` / `events.unsubscribe` / `events.batch` / `rpc.read` / `rpc.write` 다섯뿐이고 토큰·포트·경로는 렌더러로 가지 않는다(SECURITY_MODEL §7).
 * renderer 측 타입은 `apps/renderer/src/agent-studio.d.ts`.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type { JournalEvent } from "@agent-studio/protocol";

const api = {
  events: {
    subscribe(fromSeq: number, cb: (batch: JournalEvent[]) => void): () => void {
      // Electron 45: ipcRenderer 로 오는 메시지는 main 프로세스에서만 온다(renderer 간 sendTo 는 제거됨)
      const listener = (_ev: IpcRendererEvent, batch: unknown) => {
        if (Array.isArray(batch)) cb(batch as JournalEvent[]);
      };
      ipcRenderer.on("events.batch", listener);
      void ipcRenderer.invoke("events.subscribe", Number(fromSeq));
      return () => {
        ipcRenderer.removeListener("events.batch", listener);
        void ipcRenderer.invoke("events.unsubscribe"); // main 의 릴레이 구독도 끊는다(리뷰C#5)
      };
    },
  },
  rpc: {
    read: (method: string, params?: unknown): Promise<unknown> => ipcRenderer.invoke("rpc.read", method, params),
    write: (method: string, params?: unknown): Promise<unknown> => ipcRenderer.invoke("rpc.write", method, params),
  },
};

contextBridge.exposeInMainWorld("agentStudio", api);
