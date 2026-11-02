/**
 * FakeGateway (P01 T9) — 녹화·픽스처 이벤트를 재생하는 AgentGateway 구현. Scheduler·RPC 테스트 전용(실 어댑터는 P02).
 * `startRun` 호출 순서대로 스크립트를 하나씩 소비하고, 각 이벤트의 `runId`·`seq`를 run 기준으로 다시 매긴다.
 */
import type {
  AgentGateway,
  AgentKind,
  ApprovalAnswer,
  Capabilities,
  ElicitationAnswer,
  GatewayEvent,
  RunHandle,
  RunSpec,
  SessionInfo,
  SessionRef,
  SessionTranscript,
  SteerResult,
  UserInputAnswer,
} from "@agent-studio/protocol";

export type FakeResponse = { runId: string; requestId: string; answer: ApprovalAnswer | UserInputAnswer | ElicitationAnswer };

export class FakeGateway implements AgentGateway {
  readonly responses: FakeResponse[] = [];
  readonly steers: { runId: string; text: string }[] = [];
  private runCount = 0;

  constructor(private readonly scripts: GatewayEvent[][]) {}

  async capabilities(agent: AgentKind): Promise<Capabilities> {
    return { agent, version: "fake", features: {} };
  }

  async startRun(spec: RunSpec): Promise<RunHandle> {
    const script = this.scripts[this.runCount];
    if (!script) throw new Error(`FakeGateway: no script for run #${this.runCount + 1}`);
    this.runCount += 1;
    const runId = `fake-run-${this.runCount}`;
    const sessionRef: SessionRef = spec.sessionRef ?? `${spec.agent}:fake-session-${this.runCount}`;
    const replay = script.map((e, i) => ({ ...e, runId, seq: i + 1, agent: spec.agent }) as GatewayEvent);
    const self = this;
    return {
      runId,
      sessionRef,
      async *events() {
        for (const e of replay) yield e;
      },
      async steer(text: string): Promise<SteerResult> {
        self.steers.push({ runId, text });
        return "queued_next_turn";
      },
      async interrupt() {},
      async respond(requestId, answer) {
        self.responses.push({ runId, requestId, answer });
      },
      async close() {},
    };
  }

  async listSessions(_agent: AgentKind, _filter: { projectDir?: string; includeArchived?: boolean }): Promise<SessionInfo[]> {
    return [];
  }

  async readSession(ref: SessionRef): Promise<SessionTranscript> {
    return { ref, items: [] };
  }
}
