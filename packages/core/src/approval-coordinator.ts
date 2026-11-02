/**
 * ApprovalCoordinator (P01 T5, 검토 #3) — Broker 의 요청/결정/만료를 Scheduler 의 DAEMON 전이로 잇는 **유일한** 경로.
 * - request: ASK/ALWAYS_ASK 면 `approval_needed`(lease) 전이, AUTO/DENY 는 전이 없음
 * - decide: accept → `approved`, decline/cancel → `denied_terminal`
 * - tick: 만료된 요청마다 `approval_expired`
 * RPC `approval.decide` 와 데몬 타이머는 이 객체만 호출한다(Scheduler 의 daemon 전이를 직접 부르지 않음).
 */
import type { Verdict } from "@agent-studio/protocol";
import type { ApprovalBroker, ApprovalRequest, Decision } from "./approval-broker.js";
import type { EventStore, JournalEvent } from "./journal/event-store.js";
import type { ApprovalScope } from "@agent-studio/protocol";
import { Scheduler, SchedulerError } from "./scheduler.js";

export class ApprovalCoordinator {
  private readonly taskOf = new Map<string, string>();

  constructor(
    private readonly scheduler: Scheduler,
    private readonly broker: ApprovalBroker,
    store: EventStore,
  ) {
    store.subscribe(0, (e: JournalEvent) => {
      if (e.type === "ApprovalRequested" && typeof e.payload.request_id === "string" && e.taskId) this.taskOf.set(e.payload.request_id, e.taskId);
    });
  }

  /** run(lease 보유자)이 승인이 필요한 동작을 만났을 때. */
  request(req: ApprovalRequest, fencingToken: number): { requestId: string; verdict: Verdict } {
    const verdict = this.broker.evaluate(req);
    const requestId = this.broker.request(req);
    if (verdict === "ASK" || verdict === "ALWAYS_ASK") {
      this.scheduler.transition(req.taskId, "approval_needed", { kind: "lease", token: fencingToken }, { requestId });
    }
    return { requestId, verdict };
  }

  decide(requestId: string, decision: Decision, by: "user" | "policy", scope?: ApprovalScope): void {
    this.broker.decide(requestId, decision, by, scope);
    const taskId = this.taskOf.get(requestId);
    if (!taskId) return;
    this.scheduler.transition(taskId, decision === "accept" ? "approved" : "denied_terminal", { kind: "daemon", requestId });
  }

  /** 주기 호출: 만료 요청 → BLOCKED(approval_expired). 이미 다른 경로로 떠난 Task(취소 등)는 건너뛴다. */
  tick(): string[] {
    const expired = this.broker.expire();
    for (const requestId of expired) {
      const taskId = this.taskOf.get(requestId);
      if (!taskId) continue;
      try {
        this.scheduler.transition(taskId, "approval_expired", { kind: "daemon", requestId });
      } catch (err) {
        if (err instanceof SchedulerError && err.code === "invalid_transition") continue;
        throw err;
      }
    }
    return expired;
  }
}
