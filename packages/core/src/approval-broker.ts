/**
 * ApprovalBroker (P01 T5) — 정책 매트릭스 판정 + 요청/결정/만료 저널 기록. 상태는 저널(`subscribe(0)`)에서만 복원된다.
 * 상태 전이는 하지 않는다 — Scheduler 와의 연결은 ApprovalCoordinator 가 유일한 경로(검토 #3).
 */
import type { ApprovalCategory, ApprovalScope, PolicyRule, ProjectPolicy, Signals, Verdict } from "@agent-studio/protocol";
import { evaluateRule, matchException, ulid } from "@agent-studio/protocol";
import type { EventStore, JournalEvent } from "./journal/event-store.js";

export type ApprovalKind = "approval" | "user_input" | "mcp_elicitation";
export type Decision = "accept" | "decline" | "cancel";

export interface ApprovalRequest {
  taskId: string;
  runId: string;
  kind: ApprovalKind;
  category: ApprovalCategory;
  request: Record<string, unknown>;
  signals?: Signals;
}

export interface PendingApproval {
  requestId: string;
  taskId: string;
  runId: string;
  kind: ApprovalKind;
  category: ApprovalCategory;
  request: Record<string, unknown>;
  requestedAt: string;
  expiresAt: string;
}

export interface ApprovalBroker {
  evaluate(req: ApprovalRequest): Verdict;
  /** 요청을 저널에 기록하고 requestId 를 돌려준다. AUTO/DENY 는 즉시 `ApprovalDecided{by:'policy'}` 까지 기록. */
  request(req: ApprovalRequest): string;
  decide(requestId: string, decision: Decision, by: "user" | "policy", scope?: ApprovalScope): void;
  pending(): PendingApproval[];
  /** TTL 이 지난 보류 요청에 `ApprovalExpired` 를 기록하고 그 ID 들을 돌려준다. */
  expire(): string[];
}

export class ApprovalError extends Error {
  constructor(readonly code: "approval_expired" | "not_found" | "already_decided") {
    super(code);
    this.name = "ApprovalError";
  }
}

type Rec = PendingApproval & { status: "pending" | "decided" | "expired"; scope: ApprovalScope };

export class DefaultPolicyBroker implements ApprovalBroker {
  private readonly recs = new Map<string, Rec>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  /** 정책 출처: 고정 객체 또는 현재 정책을 돌려주는 함수(PolicyGate.policy). 함수를 주면 policy.set 변경이 다음 판정부터 반영된다(리뷰B#2). */
  private readonly policySource: () => ProjectPolicy;

  constructor(
    private readonly store: EventStore,
    policy: ProjectPolicy | (() => ProjectPolicy),
    opts: { ttlMs?: number; now?: () => number } = {},
  ) {
    this.policySource = typeof policy === "function" ? policy : () => policy;
    this.ttlMs = opts.ttlMs ?? 15 * 60_000;
    this.now = opts.now ?? Date.now;
    store.subscribe(0, (e) => this.applyEvent(e));
  }

  private applyEvent(e: JournalEvent): void {
    const rid = e.payload.request_id;
    if (typeof rid !== "string") return;
    if (e.type === "ApprovalRequested") {
      this.recs.set(rid, {
        requestId: rid,
        taskId: e.taskId ?? "",
        runId: e.agentRunId ?? "",
        kind: e.payload.kind as ApprovalKind,
        category: e.payload.category as ApprovalCategory,
        request: (e.payload.request ?? {}) as Record<string, unknown>,
        requestedAt: String(e.payload.requested_at ?? e.ts),
        expiresAt: String(e.payload.expires_at),
        scope: (e.payload.scope as ApprovalScope | undefined) ?? "once",
        status: "pending",
      });
    } else if (e.type === "ApprovalDecided") {
      const r = this.recs.get(rid);
      if (r) r.status = "decided";
    } else if (e.type === "ApprovalExpired") {
      const r = this.recs.get(rid);
      if (r) r.status = "expired";
    }
  }

  private rule(category: ApprovalCategory): PolicyRule {
    return this.policySource().rules[category];
  }

  evaluate(req: ApprovalRequest): Verdict {
    return evaluateRule(this.rule(req.category), req.signals);
  }

  request(req: ApprovalRequest): string {
    const rule = this.rule(req.category);
    const ex = matchException(rule, req.signals);
    const verdict = ex?.verdict ?? rule.default;
    const scope = ex?.scope ?? rule.scope;
    const id = ulid(this.now());
    const requestedAt = new Date(this.now()).toISOString();
    const expiresAt = new Date(this.now() + this.ttlMs).toISOString();
    this.store.append({
      type: "ApprovalRequested",
      taskId: req.taskId,
      agentRunId: req.runId,
      correlationId: id,
      payload: { request_id: id, kind: req.kind, category: req.category, request: req.request, requested_at: requestedAt, expires_at: expiresAt, verdict, scope, ...(req.signals && { signals: req.signals }) },
    });
    if (verdict === "AUTO") this.appendDecision(id, req.taskId, "accept", "policy", scope);
    else if (verdict === "DENY") this.appendDecision(id, req.taskId, "decline", "policy", scope);
    return id;
  }

  decide(requestId: string, decision: Decision, by: "user" | "policy", scope?: ApprovalScope): void {
    const r = this.recs.get(requestId);
    if (!r) throw new ApprovalError("not_found");
    if (r.status === "expired" || (r.status === "pending" && this.isExpired(r))) throw new ApprovalError("approval_expired");
    if (r.status === "decided") throw new ApprovalError("already_decided");
    this.appendDecision(requestId, r.taskId, decision, by, scope ?? r.scope);
  }

  pending(): PendingApproval[] {
    return [...this.recs.values()]
      .filter((r) => r.status === "pending")
      .map(({ status: _s, scope: _sc, ...p }) => p);
  }

  expire(): string[] {
    const out: string[] = [];
    for (const r of this.recs.values()) {
      if (r.status === "pending" && this.isExpired(r)) {
        this.store.append({ type: "ApprovalExpired", taskId: r.taskId, agentRunId: r.runId || undefined, correlationId: r.requestId, payload: { request_id: r.requestId } });
        out.push(r.requestId);
      }
    }
    return out;
  }

  private isExpired(r: Rec): boolean {
    return Date.parse(r.expiresAt) <= this.now();
  }

  private appendDecision(requestId: string, taskId: string, decision: Decision, by: "user" | "policy", scope: ApprovalScope): void {
    this.store.append({
      type: "ApprovalDecided",
      taskId,
      correlationId: requestId,
      payload: { request_id: requestId, decision, scope, by, decided_at: new Date(this.now()).toISOString() },
    });
  }
}
