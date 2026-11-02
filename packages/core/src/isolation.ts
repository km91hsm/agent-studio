/**
 * 격리 경고 집행 (P01 T11, AC-P01-6). S4 불합격 조합을 `WorkspaceSettingsChanged{capabilities:{isolation_warning}}` 로 등록하고,
 * 그 조합에서 자동 모드(U8 옵트인)를 켜려면 1회 확인 대화(`UserInputRequested{kind:'isolation_confirm'}`)를 거친다.
 * 정책 변경은 `ProjectPolicyChanged{before,after}` 로만 일어나며, 확인 없이 자동 모드로 바뀐 ProjectPolicyChanged 는 생성되지 않는다.
 * 리뷰A#4: 실행 조합은 공급자별(`combos.claude`/`combos.codex`)로 받고, 자동 모드를 켜는 공급자마다 같은 공급자의 조합이 있어야 한다.
 * 리뷰A#9: `UserInputAnswered{confirmed}` 뒤 `ProjectPolicyChanged` 전에 중단되면 재기동 시 `recover()`(또는 confirm 재호출)로 완성한다.
 */
import type { PermissionMode, ProjectPolicy } from "@agent-studio/protocol";
import { DEFAULT_POLICY, ulid } from "@agent-studio/protocol";
import type { EventStore, JournalEvent } from "./journal/event-store.js";
import isolationWarningsJson from "../isolation-warnings.json" with { type: "json" };

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
export type Provider = "claude" | "codex";
/** 자동 모드를 켜는 공급자별 실행 조합 */
export type Combos = Partial<Record<Provider, Combo | string>>;

export const comboKey = (c: Combo | string): string => (typeof c === "string" ? c : `${c.provider}/${c.os}/${c.sandbox}/${c.variant}`);
/** 조합의 os 항목(문자열 형식은 두 번째 구간) */
export const comboOs = (c: Combo | string): string => (typeof c === "string" ? (c.split("/")[1] ?? "") : c.os);
/** 데몬 호스트 OS — S4 경고 표의 os 값과 같은 어휘(windows | macos | linux) */
export const hostOs = (platform: NodeJS.Platform = process.platform): string => (platform === "win32" ? "windows" : platform === "darwin" ? "macos" : "linux");
const COMBO_SEP = ";";
const splitCombos = (joined: string | undefined): string[] => (joined ?? "").split(COMBO_SEP).filter(Boolean);

/** 번들 픽스처(`packages/core/isolation-warnings.json`, S4 산출물 복사본). */
export function loadBundledWarnings(): IsolationWarning[] {
  return structuredClone(isolationWarningsJson as { warnings: IsolationWarning[] }).warnings;
}

export function registerIsolationWarnings(store: EventStore, warnings: IsolationWarning[]): void {
  store.append({ type: "WorkspaceSettingsChanged", payload: { capabilities: { isolation_warning: warnings } } });
}

/** 저널의 마지막 `isolation_warning` 등록본. */
export function allWarnings(store: EventStore): IsolationWarning[] {
  let latest: IsolationWarning[] = [];
  for (const e of store.read(1)) {
    if (e.type !== "WorkspaceSettingsChanged") continue;
    const caps = e.payload.capabilities as { isolation_warning?: IsolationWarning[] } | undefined;
    if (caps?.isolation_warning) latest = caps.isolation_warning;
  }
  return latest;
}

/** 조합(또는 `;` 로 이어진 여러 조합)에 해당하는 경고. */
export function warningsFor(store: EventStore, combo: Combo | string): IsolationWarning[] {
  const keys = typeof combo === "string" ? splitCombos(combo) : [comboKey(combo)];
  const all = allWarnings(store);
  return keys.flatMap((key) => all.filter((w) => comboKey(w) === key));
}

const AUTO_CLAUDE = new Set<PermissionMode["claude"]>(["acceptEdits", "auto", "bypassPermissions", "dontAsk"]);
/** 자동 모드(U8 옵트인)가 켜지는 공급자 목록 */
export function autoProviders(pm: PermissionMode): Provider[] {
  const out: Provider[] = [];
  if (AUTO_CLAUDE.has(pm.claude)) out.push("claude");
  if (pm.codex.approvalPolicy === "never") out.push("codex");
  return out;
}
export const isAutoMode = (pm: PermissionMode): boolean => autoProviders(pm).length > 0;

/** `superseded`: 요청 뒤 다른 정책 변경이 적용됨 — 확인 시 `next` 전체 대신 permissionMode 만 현재 정책 위에 얹는다(최종리뷰I1) */
type Pending = { requestId: string; combo: string; next: ProjectPolicy; superseded?: boolean };
export type SetPolicyResult = { status: "applied" } | { status: "confirmation_required"; requestId: string; warnings: IsolationWarning[] };

export class PolicyGate {
  private current: ProjectPolicy = DEFAULT_POLICY;
  /** 마지막 정책 변경이 적용된 실행 조합(배지 표시용) */
  private lastCombo: string | undefined;
  private readonly pendingMap = new Map<string, Pending>();
  /** 확인 답변은 기록됐지만 ProjectPolicyChanged 가 아직 없는 요청(리뷰A#9) */
  private readonly answered = new Map<string, Pending>();

  constructor(
    private readonly store: EventStore,
    readonly projectId: string,
    private readonly now: () => number = Date.now,
  ) {
    store.subscribe(0, (e) => this.applyEvent(e));
  }

  private applyEvent(e: JournalEvent): void {
    if (e.projectId !== this.projectId) return;
    if (e.type === "ProjectPolicyChanged" && e.payload.after) {
      this.current = e.payload.after as ProjectPolicy;
      if (typeof e.payload.combo === "string" && e.payload.combo) this.lastCombo = e.payload.combo;
      // 어떤 정책 변경이든 그 이전에 확인된(미적용) 요청의 next_policy 를 대체한다 — 재기동 recover() 가 옛 정책으로 덮지 않는다(리뷰B#10)
      this.answered.clear();
      // 아직 답변 전인 요청은 살려 두되, 확인 시 요청 당시의 정책 전체가 아니라 permissionMode 만 부여한다(최종리뷰I1 — 그 사이의 강화가 풀리지 않는다)
      for (const p of this.pendingMap.values()) p.superseded = true;
    } else if (e.type === "UserInputRequested" && e.payload.kind === "isolation_confirm" && typeof e.payload.request_id === "string") {
      const next = (e.payload.next_policy as ProjectPolicy | undefined) ?? { ...this.current, permissionMode: e.payload.next_permission_mode as PermissionMode };
      this.pendingMap.set(e.payload.request_id, { requestId: e.payload.request_id, combo: String(e.payload.combo), next });
    } else if (e.type === "UserInputAnswered" && typeof e.payload.request_id === "string") {
      const p = this.pendingMap.get(e.payload.request_id);
      this.pendingMap.delete(e.payload.request_id);
      if (p && e.payload.answer === "confirmed") this.answered.set(p.requestId, p);
    }
  }

  policy(): ProjectPolicy {
    return this.current;
  }

  setPermissionMode(next: PermissionMode, combos: Combos, actor: "user"): SetPolicyResult {
    return this.setPolicy({ ...this.current, permissionMode: next }, combos, actor);
  }

  /**
   * 정책 전체를 바꾼다. 자동 모드를 켜는 공급자마다 `combos[provider]` 가 있어야 하고 그 조합의 provider 가 일치해야 한다(리뷰A#4).
   * 경고가 있는 조합이 아직 확인되지 않았으면 확인 요청만 기록한다. `autoModeConfirmed` 는 호출자 입력을 무시하고 저널의 현재 값을 유지한다.
   */
  setPolicy(next: ProjectPolicy, combos: Combos, actor: "user"): SetPolicyResult {
    const keys: string[] = [];
    for (const provider of autoProviders(next.permissionMode)) {
      const c = combos[provider];
      if (!c) throw new Error(`combo required for provider ${provider}: auto mode requested without its execution combo`);
      const key = comboKey(c);
      if (!key.startsWith(`${provider}/`)) throw new Error(`combo provider mismatch: expected ${provider}, got ${key}`);
      keys.push(key);
    }
    keys.sort();
    const joined = keys.join(COMBO_SEP);
    const warnings = keys.flatMap((k) => warningsFor(this.store, k));
    const confirmed = new Set(splitCombos(this.current.autoModeConfirmed?.combo));
    const needsConfirm = warnings.length > 0 && !keys.every((k) => confirmed.has(k));
    const sanitized: ProjectPolicy = { ...next };
    delete (sanitized as Partial<ProjectPolicy>).autoModeConfirmed;
    if (this.current.autoModeConfirmed) sanitized.autoModeConfirmed = this.current.autoModeConfirmed;
    if (needsConfirm) {
      const requestId = ulid(this.now());
      this.store.append({
        type: "UserInputRequested",
        projectId: this.projectId,
        correlationId: requestId,
        payload: { request_id: requestId, kind: "isolation_confirm", combo: joined, warnings, next_permission_mode: next.permissionMode, next_policy: sanitized, requested_by: actor },
      });
      return { status: "confirmation_required", requestId, warnings };
    }
    this.applyPolicy(sanitized, actor, joined);
    return { status: "applied" };
  }

  confirm(requestId: string, confirmed: boolean): { status: "applied" | "rejected" } {
    const p = this.pendingMap.get(requestId);
    if (!p) {
      const a = this.answered.get(requestId);
      if (a && confirmed) {
        this.applyConfirmed(a); // 답변은 이미 기록돼 있고 적용만 누락된 경우(리뷰A#9)
        return { status: "applied" };
      }
      throw new Error(`isolation_confirm request not pending: ${requestId}`);
    }
    this.store.append({
      type: "UserInputAnswered",
      projectId: this.projectId,
      correlationId: requestId,
      payload: { request_id: requestId, kind: "isolation_confirm", answer: confirmed ? "confirmed" : "rejected" },
    });
    if (!confirmed) return { status: "rejected" };
    this.applyConfirmed(p);
    return { status: "applied" };
  }

  /**
   * 재기동 시: 확인됐지만 적용되지 않은 요청을 완성한다. 답변이 둘 이상이면 정상 경로(confirm 순서대로 적용, 마지막이 덮어씀)와 같은 결과가 되도록
   * 마지막 답변의 정책을 적용하고 확인된 조합은 전부 합친다(리뷰C#3). 적용한 requestId 목록(0 또는 1개)을 돌려준다.
   */
  recover(): string[] {
    const all = [...this.answered.values()];
    const last = all.at(-1);
    if (!last) return [];
    const combo = [...new Set(all.flatMap((a) => splitCombos(a.combo)))].sort().join(COMBO_SEP);
    this.applyConfirmed({ ...last, combo });
    return [last.requestId];
  }

  /** 경고 배지: 자동 모드가 켜져 있으면 active + 적용된 조합과 그 조합의 경고 목록. */
  badge(): { active: boolean; combo?: string; warnings: IsolationWarning[] } {
    const active = isAutoMode(this.current.permissionMode);
    const combo = this.lastCombo;
    const warnings = combo ? warningsFor(this.store, combo) : [];
    if (!active) return { active: false, warnings };
    return { active: true, ...(combo !== undefined && { combo }), warnings };
  }

  private applyConfirmed(p: Pending): void {
    const union = new Set([...splitCombos(this.current.autoModeConfirmed?.combo), ...splitCombos(p.combo)]);
    const base: ProjectPolicy = p.superseded ? { ...this.current, permissionMode: p.next.permissionMode } : p.next;
    const after: ProjectPolicy = { ...base, autoModeConfirmed: { combo: [...union].sort().join(COMBO_SEP), at: new Date(this.now()).toISOString() } };
    this.applyPolicy(after, "user", p.combo, p.requestId);
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
