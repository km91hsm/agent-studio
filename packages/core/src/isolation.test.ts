/**
 * AC-P01-6 격리 경고 집행: S4 불합격 조합을 `capabilities.isolation_warning` 으로 등록하면 그 조합에서 자동 모드 활성 요청이
 * 1회 확인 대화를 거치고, 경고 배지가 투영되며, 확인 없이는 활성화되지 않는다(단위 + SQLite 투영 통합).
 * 리뷰A#4: 조합은 공급자별(`combos.claude/codex`)로 받고 자동 모드를 켜는 공급자의 조합이 없으면 거부한다.
 * 리뷰A#9: UserInputAnswered{confirmed} 뒤 ProjectPolicyChanged 전에 중단돼도 재기동 시 복구된다.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_POLICY } from "@agent-studio/protocol";
import type { PermissionMode } from "@agent-studio/protocol";
import type { IsolationWarning } from "./isolation.js";
import { autoProviders, comboKey, isAutoMode, loadBundledWarnings, PolicyGate, registerIsolationWarnings, warningsFor } from "./isolation.js";
import { MemoryEventStore } from "./journal/memory-store.js";
import { openSqliteStore } from "./journal/sqlite-store.js";

const FIXTURE = fileURLToPath(new URL("../isolation-warnings.json", import.meta.url));
const fixture = (): IsolationWarning[] => (JSON.parse(readFileSync(FIXTURE, "utf8")) as { warnings: IsolationWarning[] }).warnings;

const CODEX_ELEVATED = { provider: "codex", os: "windows", sandbox: "workspaceWrite", variant: "elevated" };
const CODEX_LINUX = { provider: "codex", os: "linux", sandbox: "workspaceWrite", variant: "default" };
const CLAUDE_NATIVE = { provider: "claude", os: "windows", sandbox: "native", variant: "default" };
const CODEX_NEVER: PermissionMode = { claude: "default", codex: { approvalPolicy: "never", sandbox: "workspaceWrite" } };
const CLAUDE_AUTO: PermissionMode = { claude: "auto", codex: { approvalPolicy: "on-request", sandbox: "workspaceWrite" } };
const BOTH_AUTO: PermissionMode = { claude: "auto", codex: { approvalPolicy: "never", sandbox: "workspaceWrite" } };
const PLAN_ONLY: PermissionMode = { claude: "plan", codex: DEFAULT_POLICY.permissionMode.codex };

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function setup() {
  const store = new MemoryEventStore();
  store.append({ type: "ProjectRegistered", projectId: "p1", payload: { id: "p1", path: "D:/tmp/p1" } });
  registerIsolationWarnings(store, fixture());
  const gate = new PolicyGate(store, "p1");
  return { store, gate };
}
const ofType = (store: MemoryEventStore, type: string) => store.read(1).filter((e) => e.type === type);

describe("isolation warnings (AC-P01-6)", () => {
  it("(a) 픽스처 6건 등록 → 조합별 조회, 번들 로더, unverified 유지, 자동 모드 공급자 집합", () => {
    const { store } = setup();
    expect(ofType(store, "WorkspaceSettingsChanged")).toHaveLength(1);
    expect(ofType(store, "WorkspaceSettingsChanged")[0]!.payload).toEqual({ capabilities: { isolation_warning: fixture() } });
    expect(warningsFor(store, CODEX_ELEVATED).map((w) => w.area).sort()).toEqual(["fs_tmp_parent", "network_loopback"]);
    expect(warningsFor(store, CLAUDE_NATIVE).map((w) => w.area).sort()).toEqual(["fs_outside", "network_loopback"]);
    const unelevated = warningsFor(store, { ...CODEX_ELEVATED, variant: "unelevated" });
    expect(unelevated).toHaveLength(2);
    expect(unelevated.every((w) => w.variantApplied === "unverified")).toBe(true);
    expect(warningsFor(store, CODEX_LINUX)).toEqual([]);
    expect(comboKey(CODEX_ELEVATED)).toBe("codex/windows/workspaceWrite/elevated");
    expect(loadBundledWarnings()).toEqual(fixture());
    expect(isAutoMode(DEFAULT_POLICY.permissionMode)).toBe(false);
    expect(isAutoMode(CODEX_NEVER)).toBe(true);
    expect(isAutoMode(CLAUDE_AUTO)).toBe(true);
    expect(isAutoMode({ claude: "acceptEdits", codex: DEFAULT_POLICY.permissionMode.codex })).toBe(true);
    expect(isAutoMode(PLAN_ONLY)).toBe(false);
    expect(autoProviders(DEFAULT_POLICY.permissionMode)).toEqual([]);
    expect(autoProviders(CODEX_NEVER)).toEqual(["codex"]);
    expect(autoProviders(CLAUDE_AUTO)).toEqual(["claude"]);
    expect(autoProviders(BOTH_AUTO)).toEqual(["claude", "codex"]);
  });

  it("(b) 경고 없는 조합에서 자동 모드 → applied, ProjectPolicyChanged 1건", () => {
    const { store, gate } = setup();
    expect(gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_LINUX }, "user")).toEqual({ status: "applied" });
    const changed = ofType(store, "ProjectPolicyChanged");
    expect(changed).toHaveLength(1);
    expect(changed[0]!.projectId).toBe("p1");
    expect(changed[0]!.payload).toMatchObject({ before: { permissionMode: DEFAULT_POLICY.permissionMode }, after: { permissionMode: CODEX_NEVER } });
    expect(gate.policy().permissionMode).toEqual(CODEX_NEVER);
    expect(gate.badge()).toEqual({ active: true, combo: "codex/linux/workspaceWrite/default", warnings: [] });
  });

  it("(c) 경고 조합에서 자동 모드 → confirmation_required + UserInputRequested 1건, 배지 비활성, 정책 불변", () => {
    const { store, gate } = setup();
    const r = gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    expect(r.status).toBe("confirmation_required");
    if (r.status !== "confirmation_required") return;
    expect(r.warnings.map((w) => w.area).sort()).toEqual(["fs_tmp_parent", "network_loopback"]);
    const asked = ofType(store, "UserInputRequested");
    expect(asked).toHaveLength(1);
    expect(asked[0]!.payload).toMatchObject({ request_id: r.requestId, kind: "isolation_confirm", combo: "codex/windows/workspaceWrite/elevated" });
    expect((asked[0]!.payload.warnings as unknown[]).length).toBe(2);
    expect(ofType(store, "ProjectPolicyChanged")).toHaveLength(0);
    expect(gate.policy().permissionMode).toEqual(DEFAULT_POLICY.permissionMode);
    expect(gate.badge().active).toBe(false);
    // 비자동 모드 변경은 경고 조합에서도 확인 없이 적용(조합 불필요)
    expect(gate.setPermissionMode(PLAN_ONLY, {}, "user")).toEqual({ status: "applied" });
  });

  it("(d) confirm(true) → UserInputAnswered + ProjectPolicyChanged(autoModeConfirmed), 배지 활성, 같은 조합 재설정은 applied", () => {
    const { store, gate } = setup();
    const r = gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    if (r.status !== "confirmation_required") throw new Error("expected confirmation");
    expect(gate.confirm(r.requestId, true)).toEqual({ status: "applied" });
    expect(ofType(store, "UserInputAnswered")[0]!.payload).toMatchObject({ request_id: r.requestId, answer: "confirmed" });
    const changed = ofType(store, "ProjectPolicyChanged");
    expect(changed).toHaveLength(1);
    expect(changed[0]!.payload).toMatchObject({ after: { permissionMode: CODEX_NEVER, autoModeConfirmed: { combo: "codex/windows/workspaceWrite/elevated" } }, confirmed_by_request: r.requestId });
    expect(gate.badge()).toMatchObject({ active: true, combo: "codex/windows/workspaceWrite/elevated" });
    expect(gate.badge().warnings.map((w) => w.area).sort()).toEqual(["fs_tmp_parent", "network_loopback"]);
    // 같은 조합에서 codex 자동 모드를 유지한 채 claude 값만 바꿔도 재확인 없음
    expect(gate.setPermissionMode({ ...CODEX_NEVER, claude: "plan" }, { codex: CODEX_ELEVATED }, "user")).toEqual({ status: "applied" });
    expect(ofType(store, "UserInputRequested")).toHaveLength(1);
    // 다른 공급자의 경고 조합은 다시 확인 필요
    expect(gate.setPermissionMode(CLAUDE_AUTO, { claude: CLAUDE_NATIVE }, "user").status).toBe("confirmation_required");
    expect(() => gate.confirm(r.requestId, true)).toThrow(/not pending/);
  });

  it("(e) confirm(false) → rejected, UserInputAnswered 만 기록, 정책 불변", () => {
    const { store, gate } = setup();
    const r = gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    if (r.status !== "confirmation_required") throw new Error("expected confirmation");
    expect(gate.confirm(r.requestId, false)).toEqual({ status: "rejected" });
    expect(ofType(store, "UserInputAnswered")[0]!.payload).toMatchObject({ request_id: r.requestId, answer: "rejected" });
    expect(ofType(store, "ProjectPolicyChanged")).toHaveLength(0);
    expect(gate.policy().permissionMode).toEqual(DEFAULT_POLICY.permissionMode);
    expect(gate.badge().active).toBe(false);
    expect(() => gate.confirm("nope", true)).toThrow(/not pending/);
  });

  it("(f) 통합(SQLite): 확인 없이 자동 모드가 된 ProjectPolicyChanged 는 없고 projects.policy_json 에 autoModeConfirmed 가 투영된다", () => {
    const dir = mkdtempSync(join(tmpdir(), "as-iso-"));
    dirs.push(dir);
    const store = openSqliteStore(join(dir, "journal.sqlite"));
    store.append({ type: "ProjectRegistered", projectId: "p1", payload: { id: "p1", path: "D:/tmp/p1" } });
    registerIsolationWarnings(store, fixture());
    const gate = new PolicyGate(store, "p1");
    expect(gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user").status).toBe("confirmation_required");
    expect(gate.setPermissionMode(CLAUDE_AUTO, { claude: CLAUDE_NATIVE }, "user").status).toBe("confirmation_required");
    const r = gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    if (r.status !== "confirmation_required") throw new Error("expected confirmation");
    gate.confirm(r.requestId, true);

    // 저널 불변식: 경고 조합에서 자동 모드로 바뀐 ProjectPolicyChanged 마다 앞선 UserInputAnswered{confirmed} 가 있다
    const journal = store.read(1);
    const confirmedIds = new Set(journal.filter((e) => e.type === "UserInputAnswered" && e.payload.answer === "confirmed").map((e) => e.payload.request_id));
    const autoChanges = journal.filter((e) => e.type === "ProjectPolicyChanged" && isAutoMode((e.payload.after as { permissionMode: PermissionMode }).permissionMode));
    expect(autoChanges).toHaveLength(1);
    for (const e of autoChanges) {
      const after = e.payload.after as { autoModeConfirmed?: { combo: string } };
      expect(warningsFor(store, after.autoModeConfirmed!.combo).length).toBeGreaterThan(0);
      expect(confirmedIds.has(e.payload.confirmed_by_request as string)).toBe(true);
    }
    const row = store.projections().query("projects")[0]!;
    const policy = JSON.parse(row.policy_json as string) as { permissionMode: PermissionMode; autoModeConfirmed?: { combo: string } };
    expect(policy.permissionMode).toEqual(CODEX_NEVER);
    expect(policy.autoModeConfirmed?.combo).toBe("codex/windows/workspaceWrite/elevated");
    expect(store.projections().query("capabilities")).toEqual([{ key: "isolation_warning", value_json: JSON.stringify(fixture()) }]);
    // 재기동: 새 Gate 가 저널에서 확인 상태를 복원한다
    const gate2 = new PolicyGate(store, "p1");
    expect(gate2.badge()).toMatchObject({ active: true, combo: "codex/windows/workspaceWrite/elevated" });
    expect(gate2.setPermissionMode({ ...CODEX_NEVER, claude: "plan" }, { codex: CODEX_ELEVATED }, "user")).toEqual({ status: "applied" });
    store.close();
  });

  it("(g) 리뷰A#4 자동 모드를 켜는 공급자의 조합이 없거나 공급자가 다르면 거부(ProjectPolicyChanged 0건)", () => {
    const { store, gate } = setup();
    expect(() => gate.setPermissionMode(CLAUDE_AUTO, { codex: CODEX_LINUX }, "user")).toThrow(/combo.*claude/i);
    expect(() => gate.setPermissionMode(CLAUDE_AUTO, { claude: CODEX_LINUX }, "user")).toThrow(/provider/i);
    expect(() => gate.setPermissionMode(BOTH_AUTO, { claude: CLAUDE_NATIVE }, "user")).toThrow(/combo.*codex/i);
    expect(ofType(store, "ProjectPolicyChanged")).toHaveLength(0);
    expect(ofType(store, "UserInputRequested")).toHaveLength(0);
    // 두 공급자 모두 자동: 경고는 두 조합의 합집합, 확인 1회로 두 조합이 함께 기록된다
    const r = gate.setPermissionMode(BOTH_AUTO, { claude: CLAUDE_NATIVE, codex: CODEX_ELEVATED }, "user");
    if (r.status !== "confirmation_required") throw new Error("expected confirmation");
    expect(r.warnings.map((w) => w.area).sort()).toEqual(["fs_outside", "fs_tmp_parent", "network_loopback", "network_loopback"]);
    expect(gate.confirm(r.requestId, true)).toEqual({ status: "applied" });
    const combo = gate.policy().autoModeConfirmed!.combo;
    expect(combo.split(";").sort()).toEqual(["claude/windows/native/default", "codex/windows/workspaceWrite/elevated"]);
    expect(gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user")).toEqual({ status: "applied" });
    expect(gate.setPermissionMode(CLAUDE_AUTO, { claude: CLAUDE_NATIVE }, "user")).toEqual({ status: "applied" });
    expect(gate.setPermissionMode(CLAUDE_AUTO, { claude: { ...CLAUDE_NATIVE, os: "linux" } }, "user")).toEqual({ status: "applied" }); // 경고 없는 조합
    expect(gate.badge().combo).toBe("claude/linux/native/default");
  });

  it("(h) 리뷰A#9 UserInputAnswered{confirmed} 뒤 정책 기록 전에 중단되면 재기동 recover() 가 적용을 완성한다(재확인 없이)", () => {
    const { store, gate } = setup();
    const r = gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    if (r.status !== "confirmation_required") throw new Error("expected confirmation");
    // 크래시 모사: 답변만 저널에 남고 ProjectPolicyChanged 가 없다
    store.append({ type: "UserInputAnswered", projectId: "p1", correlationId: r.requestId, payload: { request_id: r.requestId, kind: "isolation_confirm", answer: "confirmed" } });
    expect(ofType(store, "ProjectPolicyChanged")).toHaveLength(0);
    const gate2 = new PolicyGate(store, "p1");
    expect(gate2.recover()).toEqual([r.requestId]);
    expect(ofType(store, "UserInputAnswered")).toHaveLength(1);
    const changed = ofType(store, "ProjectPolicyChanged");
    expect(changed).toHaveLength(1);
    expect(changed[0]!.payload).toMatchObject({ after: { permissionMode: CODEX_NEVER, autoModeConfirmed: { combo: "codex/windows/workspaceWrite/elevated" } }, confirmed_by_request: r.requestId });
    expect(gate2.recover()).toEqual([]);
    // 같은 경로를 confirm() 재호출로도 완성할 수 있다(답변 중복 기록 없음)
    const gate3 = new PolicyGate(new MemoryEventStore(), "p1");
    void gate3;
    const { store: s2, gate: g2 } = setup();
    const r2 = g2.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    if (r2.status !== "confirmation_required") throw new Error("expected confirmation");
    s2.append({ type: "UserInputAnswered", projectId: "p1", correlationId: r2.requestId, payload: { request_id: r2.requestId, kind: "isolation_confirm", answer: "confirmed" } });
    expect(g2.confirm(r2.requestId, true)).toEqual({ status: "applied" });
    expect(ofType(s2, "UserInputAnswered")).toHaveLength(1);
    expect(ofType(s2, "ProjectPolicyChanged")).toHaveLength(1);
    expect(() => g2.confirm(r2.requestId, true)).toThrow(/not pending/);
  });

  it("(i) 리뷰B#10 답변 뒤 다른 정책 변경이 기록되면 재기동 recover() 는 옛 next_policy 로 덮지 않는다", () => {
    const { store, gate } = setup();
    const r = gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    if (r.status !== "confirmation_required") throw new Error("expected confirmation");
    store.append({ type: "UserInputAnswered", projectId: "p1", correlationId: r.requestId, payload: { request_id: r.requestId, kind: "isolation_confirm", answer: "confirmed" } });
    // 그 뒤의 명시적 정책 변경(확인 불필요)이 확인 대기 중이던 변경을 대체한다
    expect(gate.setPermissionMode(PLAN_ONLY, {}, "user")).toEqual({ status: "applied" });
    expect(ofType(store, "ProjectPolicyChanged")).toHaveLength(1);
    const gate2 = new PolicyGate(store, "p1");
    expect(gate2.recover()).toEqual([]);
    expect(ofType(store, "ProjectPolicyChanged")).toHaveLength(1);
    expect(gate2.policy().permissionMode).toEqual(PLAN_ONLY);
  });

  it("(j) 리뷰C#3 확인 답변이 둘 이상 미적용이면 recover() 는 마지막 답변의 정책을 적용하고 확인 조합은 모두 합친다(정상 경로와 같은 결과)", () => {
    const { store, gate } = setup();
    const r1 = gate.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    const r2 = gate.setPermissionMode(CLAUDE_AUTO, { claude: CLAUDE_NATIVE }, "user");
    if (r1.status !== "confirmation_required" || r2.status !== "confirmation_required") throw new Error("expected confirmations");
    for (const r of [r1, r2]) store.append({ type: "UserInputAnswered", projectId: "p1", correlationId: r.requestId, payload: { request_id: r.requestId, kind: "isolation_confirm", answer: "confirmed" } });
    expect(ofType(store, "ProjectPolicyChanged")).toHaveLength(0);
    const gate2 = new PolicyGate(store, "p1");
    expect(gate2.recover()).toEqual([r2.requestId]);
    const changed = ofType(store, "ProjectPolicyChanged");
    expect(changed).toHaveLength(1);
    expect(gate2.policy().permissionMode).toEqual(CLAUDE_AUTO);
    expect(gate2.policy().autoModeConfirmed!.combo.split(";").sort()).toEqual(["claude/windows/native/default", "codex/windows/workspaceWrite/elevated"]);
    expect(gate2.recover()).toEqual([]);
    // 정상 경로(confirm r1 → confirm r2)와 같은 최종 정책
    const { store: s2, gate: g2 } = setup();
    const a1 = g2.setPermissionMode(CODEX_NEVER, { codex: CODEX_ELEVATED }, "user");
    const a2 = g2.setPermissionMode(CLAUDE_AUTO, { claude: CLAUDE_NATIVE }, "user");
    if (a1.status !== "confirmation_required" || a2.status !== "confirmation_required") throw new Error("expected confirmations");
    g2.confirm(a1.requestId, true);
    g2.confirm(a2.requestId, true);
    expect(g2.policy().permissionMode).toEqual(gate2.policy().permissionMode);
    expect(g2.policy().autoModeConfirmed!.combo.split(";").sort()).toEqual(gate2.policy().autoModeConfirmed!.combo.split(";").sort());
    void s2;
  });
});
