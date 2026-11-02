/**
 * ApprovalCoordinator (P01 T5, 검토 #3) — Broker 의 요청/결정/만료를 Scheduler 의 DAEMON 전이로 잇는 **유일한** 경로.
 * - request: ASK/ALWAYS_ASK 면 `scheduler.check()` 로 전이 가능성을 먼저 확인한 뒤 요청을 기록하고 대기 전이(리뷰A#3);
 *   대기 사유는 `approval_needed`(기본)·`git_conflict`·`recovery_review`·`compare_blocked`(리뷰A#7). AUTO/DENY 는 전이 없음.
 * - decide: 요청이 보류 중이면 Task 가 그 요청으로 WAITING_APPROVAL 인지 확인한 뒤 기록(아니면 not_pending, 기록 없음);
 *   accept → `approved`, decline/cancel → `denied_terminal`
 * - tick: 만료된 요청마다 `approval_expired`
 * - WAITING_APPROVAL 에서 사용자 `cancel` 이 기록되면 보류 승인을 `decline` 으로 해소한다(PHASE_MANAGEMENT §2 취소 규칙, 리뷰A#6)
 * RPC `approval.decide` 와 데몬 타이머는 이 객체만 호출한다(Scheduler 의 daemon 전이를 직접 부르지 않음).
 */
import type { ApprovalScope, Verdict } from "@agent-studio/protocol";
import { ApprovalError, type ApprovalBroker, type ApprovalRequest, type Decision } from "./approval-broker.js";
import type { EventStore, JournalEvent } from "./journal/event-store.js";
import { Scheduler, SchedulerError } from "./scheduler.js";

export type WaitingEvent = "approval_needed" | "git_conflict" | "recovery_review" | "compare_blocked";

export class ApprovalCoordinator {
  /** requestId → taskId */
  private readonly taskOf = new Map<string, string>();
  /** taskId → 아직 결정·만료되지 않은 ASK/ALWAYS_ASK 요청 */
  private readonly pendingOf = new Map<string, string>();

  constructor(
    private readonly scheduler: Scheduler,
    private readonly broker: ApprovalBroker,
    store: EventStore,
  ) {
    store.subscribe(0, (e: JournalEvent) => this.applyEvent(e));
  }

  private applyEvent(e: JournalEvent): void {
    const rid = typeof e.payload.request_id === "string" ? e.payload.request_id : undefined;
    if (e.type === "ApprovalRequested" && rid && e.taskId) {
      this.taskOf.set(rid, e.taskId);
      if (e.payload.verdict === "ASK" || e.payload.verdict === "ALWAYS_ASK") this.pendingOf.set(e.taskId, rid);
    } else if ((e.type === "ApprovalDecided" || e.type === "ApprovalExpired") && rid) {
      const taskId = this.taskOf.get(rid);
      if (taskId && this.pendingOf.get(taskId) === rid) this.pendingOf.delete(taskId);
    } else if (e.type === "TaskTransition" && e.taskId && e.payload.from === "WAITING_APPROVAL" && e.payload.reason === "cancel") {
      const pending = this.pendingOf.get(e.taskId);
      if (!pending) return;
      try {
        this.broker.decide(pending, "decline", "user");
      } catch (err) {
        if (!(err instanceof ApprovalError)) throw err; // 이미 결정·만료된 요청은 그대로 둔다
      }
    }
  }

  /** run(lease 보유자)이 승인·사용자 결정이 필요한 동작을 만났을 때. */
  request(req: ApprovalRequest, fencingToken: number, event: WaitingEvent = "approval_needed"): { requestId: string; verdict: Verdict } {
    const verdict = this.broker.evaluate(req);
    const waits = verdict === "ASK" || verdict === "ALWAYS_ASK";
    const auth = { kind: "lease", token: fencingToken } as const;
    if (waits) this.scheduler.check(req.taskId, event, auth); // 리뷰A#3: 기록 전에 전이 가능성 확인(옛 토큰·부적합 상태면 여기서 throw, 저널 불변)
    const requestId = this.broker.request(req);
    if (waits) this.scheduler.transition(req.taskId, event, auth, { requestId });
    return { requestId, verdict };
  }

  decide(requestId: string, decision: Decision, by: "user" | "policy", scope?: ApprovalScope): void {
    const taskId = this.taskOf.get(requestId);
    if (this.broker.pending().some((p) => p.requestId === requestId)) {
      const st = taskId ? this.scheduler.state(taskId) : undefined;
      if (!st || st.status !== "WAITING_APPROVAL" || st.pendingRequestId !== requestId) {
        throw new SchedulerError("not_pending", `request ${requestId} is not pending on task ${taskId ?? "?"} (status ${st?.status ?? "unknown"})`);
      }
    }
    this.broker.decide(requestId, decision, by, scope); // 보류가 아니면 Broker 가 정확한 오류(not_found/approval_expired/already_decided)를 낸다
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
