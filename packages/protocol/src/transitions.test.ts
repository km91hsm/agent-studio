/**
 * task-transitions.json(단일 출처) ↔ PHASE_MANAGEMENT_DESIGN §2 mermaid 다이어그램 대조 (불변식 4: CI 차단).
 * - 다이어그램 간선 ∪ DIAGRAM_OMITS == JSON 간선 (양방향 차집합 비어 있음)
 * - approved(from=X) 는 `$resume` 로 정규화, `iteration>=max` 라벨은 표의 `iteration_exhausted` 로 정규화
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DAEMON_EVENTS,
  LEASE_EVENTS,
  loadTransitions,
  nextState,
  PRECONDITION_IDS,
  TERMINAL_STATES,
  USER_EVENTS,
} from "./transitions.js";

const DOC = fileURLToPath(new URL("../../../docs/planning/02_agents_state/PHASE_MANAGEMENT_DESIGN.md", import.meta.url));

/** 상세 규칙표에는 있으나 다이어그램에 없는 간선(보고서에 다이어그램 추가 제안). */
const DIAGRAM_OMITS = new Set(["PLANNING|compare_blocked|WAITING_APPROVAL", "IMPLEMENTING|compare_blocked|WAITING_APPROVAL", "REVIEWING|compare_blocked|WAITING_APPROVAL", "VERIFYING|compare_blocked|WAITING_APPROVAL"]);
const EVENT_ALIASES: Record<string, string> = { "iteration>=max": "iteration_exhausted" };

export function parseDiagramEdges(md: string): Set<string> {
  const block = md.match(/```mermaid\s*\nstateDiagram-v2([\s\S]*?)```/);
  if (!block) throw new Error("PHASE_MANAGEMENT_DESIGN: stateDiagram-v2 블록 없음");
  const edges = new Set<string>();
  for (const line of block[1]!.split("\n")) {
    const m = line.match(/^\s*(\w+) --> (\w+): (.+)$/);
    if (!m) continue;
    const [, from, to, label] = m;
    for (const raw of label!.split("|")) {
      const ev = raw.replace(/\(.*$/, "").trim();
      if (!ev) continue;
      const event = EVENT_ALIASES[ev] ?? ev;
      edges.add(`${from}|${event}|${event === "approved" ? "$resume" : to}`);
    }
  }
  return edges;
}

describe("task-transitions.json ↔ PHASE_MANAGEMENT §2 diagram", () => {
  const table = loadTransitions();
  const json = new Set(table.transitions.map((t) => `${t.from}|${t.event}|${t.to}`));
  const diagram = parseDiagramEdges(readFileSync(DOC, "utf8"));

  it("(a) 간선 집합이 양방향으로 같다(DIAGRAM_OMITS 제외)", () => {
    const expected = new Set([...diagram, ...DIAGRAM_OMITS]);
    const onlyDiagram = [...expected].filter((e) => !json.has(e));
    const onlyJson = [...json].filter((e) => !expected.has(e));
    expect(onlyDiagram, "다이어그램에만 있음").toEqual([]);
    expect(onlyJson, "JSON에만 있음").toEqual([]);
    expect(diagram.size).toBeGreaterThan(40);
  });

  it("(b) nextState 기본 동작", () => {
    expect(nextState(table, "QUEUED", "lease_acquired")?.to).toBe("PLANNING");
    expect(nextState(table, "QUEUED", "lease_acquired")?.preconditions).toEqual(["deps_completed", "slot_available", "lease_valid"]);
    expect(nextState(table, "COMPLETED", "cancel")).toBeNull();
    expect(nextState(table, "WAITING_APPROVAL", "approved")?.to).toBe("$resume");
    expect(nextState(table, "REVIEWING", "compare_blocked")?.to).toBe("WAITING_APPROVAL");
  });

  it("(c) cancel 은 모든 비종결 상태에서, approval_needed 는 다이어그램의 5개 상태에서만", () => {
    const nonTerminal = table.states.filter((s) => !table.terminal.includes(s));
    for (const s of nonTerminal) expect(nextState(table, s, "cancel")?.to, `cancel from ${s}`).toBe("CANCELLED");
    const approvalFrom = table.transitions.filter((t) => t.event === "approval_needed").map((t) => t.from).sort();
    expect(approvalFrom).toEqual(["IMPLEMENTING", "PLANNING", "REVIEWING", "REWORK", "VERIFYING"]);
    expect(TERMINAL_STATES).toEqual(["COMPLETED", "FAILED", "CANCELLED"]);
  });

  it("(d) USER/DAEMON/LEASE 이벤트 집합은 서로소이고 합집합이 JSON 이벤트 전체와 같다", () => {
    const all = new Set<string>(table.transitions.map((t) => t.event));
    const union = new Set([...USER_EVENTS, ...DAEMON_EVENTS, ...LEASE_EVENTS]);
    expect([...all].filter((e) => !union.has(e))).toEqual([]);
    expect([...union].filter((e) => !all.has(e))).toEqual([]);
    for (const u of USER_EVENTS) {
      expect(DAEMON_EVENTS.has(u)).toBe(false);
      expect(LEASE_EVENTS.has(u)).toBe(false);
    }
    for (const d of DAEMON_EVENTS) expect(LEASE_EVENTS.has(d)).toBe(false);
    expect([...USER_EVENTS].sort()).toEqual(["cancel", "unblocked", "user_abandon"]);
    expect([...DAEMON_EVENTS].sort()).toEqual(["approval_expired", "approved", "denied_terminal"]);
  });

  it("(e) JSON 의 모든 precondition ID 가 PRECONDITION_IDS 에 있다", () => {
    const used = new Set(table.transitions.flatMap((t) => t.preconditions));
    expect([...used].filter((p) => !(PRECONDITION_IDS as readonly string[]).includes(p))).toEqual([]);
    expect(table.v).toBe(1);
  });
});
