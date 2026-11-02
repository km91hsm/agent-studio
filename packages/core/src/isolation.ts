/**
 * 격리 경고 집행 (P01 T11, AC-P01-6). S4 불합격 조합을 `WorkspaceSettingsChanged{capabilities:{isolation_warning}}` 로 등록하고,
 * 그 조합에서 자동 모드(U8 옵트인)를 켜려면 1회 확인 대화(`UserInputRequested{kind:'isolation_confirm'}`)를 거친다.
 * 정책 변경은 `ProjectPolicyChanged{before,after}` 로만 일어나며, 확인 없이 자동 모드로 바뀐 ProjectPolicyChanged 는 생성되지 않는다.
 */
import { readFileSync } from "node:fs";
import type { PermissionMode, ProjectPolicy } from "@agent-studio/protocol";
import { DEFAULT_POLICY, ulid } from "@agent-studio/protocol";
import type { EventStore, JournalEvent } from "./journal/event-store.js";

export interface IsolationWarning {
  provider: string;
  os: string;
  sandbox: string;
  variant: string;
  variantApplied: "verified" | "unverified" | string;
  area: string;
  bypassedPolicies: string[];
}
export type Combo = Pick<IsolationWarning, "provider" | "os" | "sandbox" | "variant">;

export const comboKey = (c: Combo | string): string => (typeof c === "string" ? c : `${c.provider}/${c.os}/${c.sandbox}/${c.variant}`);

/** 번들 픽스처(`packages/core/isolation-warnings.json`, S4 산출물 복사본). */
export function loadBundledWarnings(): IsolationWarning[] {
  return (JSON.parse(readFileSync(new URL("../isolation-warnings.json", import.meta.url), "utf8")) as { warnings: IsolationWarning[] }).warnings;
}

export function registerIsolationWarnings(store: EventStore, warnings: IsolationWarning[]): void {
  store.append({ type: "WorkspaceSettingsChanged", payload: { capabilities: { isolation_warning: warnings } } });
}

/** 저널의 마지막 `isolation_warning` 등록본에서 조합에 해당하는 경고. */
export function allWarnings(store: EventStore): IsolationWarning[] {
  let latest: IsolationWarning[] = [];
  for (const e of store.read(1)) {
    if (e.type !== "WorkspaceSettingsChanged") continue;
    const caps = e.payload.capabilities as { isolation_warning?: IsolationWarning[] } | undefined;
    if (caps?.isolation_warning) latest = caps.isolation_warning;
  }
  return latest;
}

export function warningsFor(store: EventStore, combo: Combo | string): IsolationWarning[] {
  const key = comboKey(combo);
  return allWarnings(store).filter((w) => comboKey(w) === key);
}

const AUTO_CLAUDE = new Set<PermissionMode["claude"]>(["acceptEdits", "auto", "bypassPermissions", "dontAsk"]);
export const isAutoMode = (pm: PermissionMode): boolean => AUTO_CLAUDE.has(pm.claude) || pm.codex.approvalPolicy === "never";

type Pending = { requestId: string; combo: string; next: PermissionMode };

export class PolicyGate {
  private current: ProjectPolicy = DEFAULT_POLICY;
  /** 마지막 정책 변경이 적용된 실행 조합(배지 표시용) */
  private lastCombo: string | undefined;
  private readonly pendingMap = new Map<string, Pending>();

  constructor(
    private readonly store: EventStore,
    private readonly projectId: string,
    private readonly now: () => number = Date.now,
  ) {
    store.subscribe(0, (e) => this.applyEvent(e));
  }

  private applyEvent(e: JournalEvent): void {
    if (e.projectId !== this.projectId) return;
    if (e.type === "ProjectPolicyChanged" && e.payload.after) {
      this.current = e.payload.after as ProjectPolicy;
      if (typeof e.payload.combo === "string") this.lastCombo = e.payload.combo;
    } else if (e.type === "UserInputRequested" && e.payload.kind === "isolation_confirm" && typeof e.payload.request_id === "string") {
      this.pendingMap.set(e.payload.request_id, { requestId: e.payload.request_id, combo: String(e.payload.combo), next: e.payload.next_permission_mode as PermissionMode });
    } else if (e.type === "UserInputAnswered" && typeof e.payload.request_id === "string") {
      this.pendingMap.delete(e.payload.request_id);
    }
  }

  policy(): ProjectPolicy {
    return this.current;
  }

  setPermissionMode(next: PermissionMode, combo: Combo | string, actor: "user"): { status: "applied" } | { status: "confirmation_required"; requestId: string; warnings: IsolationWarning[] } {
    const key = comboKey(combo);
    const warnings = warningsFor(this.store, key);
    const needsConfirm = isAutoMode(next) && warnings.length > 0 && this.current.autoModeConfirmed?.combo !== key;
    if (needsConfirm) {
      const requestId = ulid(this.now());
      this.store.append({
        type: "UserInputRequested",
        projectId: this.projectId,
        correlationId: requestId,
        payload: { request_id: requestId, kind: "isolation_confirm", combo: key, warnings, next_permission_mode: next, requested_by: actor },
      });
      return { status: "confirmation_required", requestId, warnings };
    }
    this.applyPolicy({ ...this.current, permissionMode: next }, actor, key);
    return { status: "applied" };
  }

  confirm(requestId: string, confirmed: boolean): { status: "applied" | "rejected" } {
    const p = this.pendingMap.get(requestId);
    if (!p) throw new Error(`isolation_confirm request not pending: ${requestId}`);
    this.store.append({
      type: "UserInputAnswered",
      projectId: this.projectId,
      correlationId: requestId,
      payload: { request_id: requestId, kind: "isolation_confirm", answer: confirmed ? "confirmed" : "rejected" },
    });
    if (!confirmed) return { status: "rejected" };
    this.applyPolicy({ ...this.current, permissionMode: p.next, autoModeConfirmed: { combo: p.combo, at: new Date(this.now()).toISOString() } }, "user", p.combo, requestId);
    return { status: "applied" };
  }

  /** 경고 배지: 자동 모드가 켜져 있으면 active + 적용된 조합과 그 조합의 경고 목록. */
  badge(): { active: boolean; combo?: string; warnings: IsolationWarning[] } {
    const active = isAutoMode(this.current.permissionMode);
    const combo = this.lastCombo;
    const warnings = combo ? warningsFor(this.store, combo) : [];
    if (!active) return { active: false, warnings };
    return { active: true, ...(combo !== undefined && { combo }), warnings };
  }

  private applyPolicy(after: ProjectPolicy, by: string, combo: string, confirmedByRequest?: string): void {
    this.store.append({
      type: "ProjectPolicyChanged",
      projectId: this.projectId,
      ...(confirmedByRequest && { correlationId: confirmedByRequest }),
      payload: { before: this.current, after, by, combo, ...(confirmedByRequest && { confirmed_by_request: confirmedByRequest }) },
    });
  }
}
