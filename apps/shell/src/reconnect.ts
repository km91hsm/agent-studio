/**
 * Shell main 의 데몬 재접속 루프(최종리뷰I4). 끊기면 성공할 때까지 `RECONNECT_DELAYS_MS` 백오프(마지막 간격 반복)로 재시도하고,
 * 종료 중이면 멈춘다. 동시에 하나만 돈다. Electron 을 import 하지 않는다.
 */
export const RECONNECT_DELAYS_MS: readonly number[] = [1_000, 2_000, 5_000, 10_000, 30_000];

export interface ReconnectLoopOptions {
  /** 한 번의 재접속 시도(락 부재 시 데몬 ensure 포함). 실패는 throw */
  attempt: () => Promise<void>;
  shouldStop: () => boolean;
  delaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

export interface ReconnectLoop {
  /** 끊김 알림에서 호출. 이미 돌고 있으면 무시 */
  trigger(): void;
  running(): boolean;
}

export function createReconnectLoop(o: ReconnectLoopOptions): ReconnectLoop {
  const delays = o.delaysMs ?? RECONNECT_DELAYS_MS;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const log = o.log ?? (() => {});
  let running = false;
  const run = async (): Promise<void> => {
    for (let n = 0; ; n++) {
      if (o.shouldStop()) return;
      try {
        await o.attempt();
        log(`daemon reconnected after ${n + 1} attempt(s)`);
        return;
      } catch (e) {
        const wait = delays[Math.min(n, delays.length - 1)] ?? 0;
        log(`daemon reconnect attempt ${n + 1} failed: ${e instanceof Error ? e.message : String(e)}; retrying in ${wait}ms`);
        await sleep(wait);
      }
    }
  };
  return {
    trigger() {
      if (running) return;
      running = true;
      void run().finally(() => {
        running = false;
      });
    },
    running: () => running,
  };
}
