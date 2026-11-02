/**
 * preload 가 노출하는 API(Task 11 `apps/shell/src/preload.ts` 와 1:1). 세 함수만: 이벤트 구독, 읽기 RPC, 쓰기 RPC.
 * 데몬 토큰·포트·경로는 노출되지 않는다(SECURITY_MODEL §7).
 */
import type { JournalEvent } from "@agent-studio/protocol";

export interface AgentStudioApi {
  events: {
    /** fromSeq 이후 이벤트를 배치로 전달한다. 반환값은 unsubscribe. */
    subscribe(fromSeq: number, cb: (batch: JournalEvent[]) => void): () => void;
  };
  rpc: {
    read(method: string, params?: unknown): Promise<unknown>;
    write(method: string, params?: unknown): Promise<unknown>;
  };
}

declare global {
  interface Window {
    agentStudio?: AgentStudioApi;
  }
}
