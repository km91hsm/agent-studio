/**
 * EVENT_TYPES 는 DATABASE_SCHEMA §2.1 "이벤트 타입(최소; 이 목록이 단일 출처)" 문단과 집합으로 같아야 한다(검토 #9 — 자동 대조).
 * 축약 `A/B/C{…}` 는 `A, <prefix>B, <prefix>C` 로 전개한다(prefix = A 에서 마지막 대문자 단어를 뺀 부분).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { EVENT_TYPES, TASK_KINDS, isEventType } from "./events.js";

const DOC = fileURLToPath(new URL("../../../docs/planning/02_agents_state/DATABASE_SCHEMA.md", import.meta.url));

/** 문서 문단에서 이벤트 이름 집합을 뽑는다. */
export function parseDocEventTypes(md: string): string[] {
  // 문단 안에 주석용 백틱(`sessions` 등)이 섞여 있어 "ErrorRaised{class}`" 를 끝 표지로 쓴다.
  const m = md.match(/이벤트 타입\(최소;[^`]*`([\s\S]*?ErrorRaised\{class\})`/);
  if (!m) throw new Error("DATABASE_SCHEMA: 이벤트 타입 문단을 찾지 못함");
  const body = m[1]!.replace(/\*\*/g, "").replace(/`/g, "");
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  const flush = () => {
    const tok = cur.trim();
    cur = "";
    if (!tok) return;
    const name = tok.replace(/\{[\s\S]*$/, "").replace(/\([^)]*\)/g, "").trim();
    if (!name) return;
    const parts = name.split("/");
    const first = parts[0]!;
    out.push(first);
    if (parts.length > 1) {
      // prefix = first 에서 마지막 단어(대문자 시작 CamelCase 단어 또는 '-' 로 시작하는 소문자 단어)를 제거
      const prefix = first.replace(/(?:[A-Z][a-z0-9]*|-[a-z]+)$/, "");
      for (const p of parts.slice(1)) out.push(prefix + p);
    }
  };
  for (const ch of body) {
    if (ch === "{" || ch === "(") depth++;
    if (ch === "}" || ch === ")") depth--;
    if (ch === "," && depth === 0) flush();
    else cur += ch;
  }
  flush();
  return out;
}

describe("EVENT_TYPES ↔ DATABASE_SCHEMA §2.1", () => {
  const doc = parseDocEventTypes(readFileSync(DOC, "utf8"));

  it("문서 파서가 축약을 전개한다(대표 사례)", () => {
    expect(doc).toContain("RequirementAdded");
    expect(doc).toContain("RequirementChanged");
    expect(doc).toContain("RequirementRemoved");
    expect(doc).toContain("UserInputRequested");
    expect(doc).toContain("UserInputAnswered");
    expect(doc).toContain("McpElicitation-requested"); // 문서 표기 그대로(오타 추정 — 보고서에 수정 제안)
    expect(doc).toContain("McpElicitationAnswered");
    expect(doc).toContain("PhaseDepRemoved");
    expect(doc).toContain("CaptureConfidenceChanged");
    expect(doc).toContain("SessionRegistered");
    expect(doc).toContain("AuditSignal");
    expect(doc).toContain("TaskTransition");
    expect(doc).toContain("ErrorRaised");
  });

  it("코드의 EVENT_TYPES 와 문서 집합이 양방향으로 같다", () => {
    const code = new Set<string>(EVENT_TYPES);
    const docSet = new Set(doc);
    const onlyDoc = [...docSet].filter((t) => !code.has(t));
    const onlyCode = [...code].filter((t) => !docSet.has(t));
    expect(onlyDoc, "문서에만 있음").toEqual([]);
    expect(onlyCode, "코드에만 있음").toEqual([]);
    expect(EVENT_TYPES.length).toBe(docSet.size);
  });

  it("isEventType 가드와 TASK_KINDS enum", () => {
    expect(isEventType("TaskTransition")).toBe(true);
    expect(isEventType("Bogus")).toBe(false);
    expect([...TASK_KINDS]).toEqual(["plan", "research", "prototype", "impl", "review", "verify", "replan"]);
  });
});
