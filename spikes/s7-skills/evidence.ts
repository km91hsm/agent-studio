/**
 * S7 — 스킬 실행 증거 등급(SKILL_EXECUTION_EVIDENCE_SPEC §2 #13·§3)과 고유 절차 시그니처(§3 공통 행) 판정 로직. 순수 함수.
 *   Claude: Skill 도구 블록(tool_use name="Skill", input.skill) + tool_result 성공 → LOAD_OBSERVED
 *   Codex : skills/list 존재 → DISCOVERED, turn/start skill 입력 수락 → INJECTION_ACCEPTED, 시그니처 required 단계 순서 관찰 → LOAD_OBSERVED
 *   APPLIED_VERIFIED(산출물·테스트 해시 연결)는 P07 Verifier 범위 — 여기서는 판정하지 않는다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Grade = "NOT_FOUND" | "DISCOVERED" | "INJECTION_ACCEPTED" | "LOAD_OBSERVED" | "APPLIED_VERIFIED" | "UNVERIFIABLE" | "FAILED";

export interface SignatureStep {
  order: number;
  /** 산출물 경로 glob(저장소 상대, `/` 구분) — event_pattern과 택일 */
  artifact_glob?: string;
  /** 이벤트 토큰(`skill_invoked:<name>`, `test_run:fail|pass`, `command:<text>`) 정확 일치 또는 `/regex/` */
  event_pattern?: string;
  required: boolean;
  note?: string;
}

export interface SkillSignature {
  skill_id: string;
  skill_commit: string;
  version: number;
  steps: SignatureStep[];
  author: string;
  reviewed_by: string | null;
  created_seq: number;
}

export interface Observation {
  seq: number;
  kind: "artifact" | "event";
  value: string;
}

export interface SignatureMatch {
  observed: number[];
  missingRequired: number[];
  inOrder: boolean;
}

const SIG_DIR = fileURLToPath(new URL("../../docs/agent-studio/skill-signatures/", import.meta.url));

export function loadSignature(name: string): SkillSignature {
  const sig = JSON.parse(readFileSync(`${SIG_DIR}${name}.json`, "utf8")) as SkillSignature;
  const errors = validateSignature(sig);
  if (errors.length) throw new Error(`invalid signature ${name}: ${errors.join("; ")}`);
  return sig;
}

export function validateSignature(input: unknown): string[] {
  const errors: string[] = [];
  const sig = input as Partial<SkillSignature> | null;
  if (!sig || typeof sig !== "object") return ["signature: not an object"];
  if (typeof sig.skill_id !== "string" || !/^[^/\s]+\/[^\s]+$/.test(sig.skill_id)) errors.push("skill_id: expected <repo>/<name>");
  if (typeof sig.skill_commit !== "string" || !sig.skill_commit) errors.push("skill_commit: required");
  if (typeof sig.version !== "number" || sig.version < 1) errors.push("version: expected >= 1");
  if (typeof sig.author !== "string" || !sig.author) errors.push("author: required");
  if (!(sig.reviewed_by === null || typeof sig.reviewed_by === "string")) errors.push("reviewed_by: string or null");
  if (typeof sig.created_seq !== "number") errors.push("created_seq: number");
  if (!Array.isArray(sig.steps)) errors.push("steps: array");
  else if (sig.steps.length === 0) errors.push("steps: empty");
  else {
    sig.steps.forEach((s, i) => {
      if (s.order !== i + 1) errors.push(`steps[${i}].order: expected ${i + 1}`);
      const hasGlob = typeof s.artifact_glob === "string" && s.artifact_glob.length > 0;
      const hasEvent = typeof s.event_pattern === "string" && s.event_pattern.length > 0;
      if (!hasGlob && !hasEvent) errors.push(`steps[${i}]: artifact_glob or event_pattern required`);
      if (hasGlob && hasEvent) errors.push(`steps[${i}]: artifact_glob and event_pattern are exclusive`);
      if (typeof s.required !== "boolean") errors.push(`steps[${i}].required: boolean`);
    });
  }
  return errors;
}

export interface ClaudeGradeInput {
  skill: string;
  /** system/init.skills — Claude Code가 세션에 노출한 스킬 이름 */
  initSkills: string[];
  /** 프롬프트에 명시 호출(스킬 이름·Skill 도구 지시)을 넣었는가 */
  explicit: boolean;
  toolUses: { name: string; input: Record<string, unknown> | unknown; isError: boolean | null }[];
}

export function gradeClaude(i: ClaudeGradeInput): Grade {
  if (!i.initSkills.includes(i.skill)) return "NOT_FOUND";
  const uses = i.toolUses.filter((t) => t.name === "Skill" && String((t.input as { skill?: unknown } | null)?.skill ?? "") === i.skill);
  if (uses.some((u) => u.isError === false)) return "LOAD_OBSERVED";
  if (uses.length && uses.every((u) => u.isError === true)) return "FAILED";
  return i.explicit ? "INJECTION_ACCEPTED" : "DISCOVERED";
}

export interface CodexGradeInput {
  listed: boolean;
  /** turn/start에 {type:"skill"} 입력을 보냈을 때 서버 응답: accepted(오류 없음) / rejected / null(보내지 않음) */
  injection: "accepted" | "rejected" | null;
  /** 시그니처 required 단계가 순서대로 관찰됐는가 */
  procedureObserved: boolean;
}

export function gradeCodex(i: CodexGradeInput): Grade {
  if (!i.listed) return "NOT_FOUND";
  if (i.injection === "rejected") return "FAILED";
  if (i.procedureObserved) return "LOAD_OBSERVED";
  if (i.injection === "accepted") return "INJECTION_ACCEPTED";
  return "DISCOVERED";
}

/** glob(`**`, `*`, `?`, `{a,b}`) → 전체 일치 정규식. 경로 구분자는 `/` */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else re += ".*";
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "{") {
      const end = glob.indexOf("}", i);
      const alts = glob.slice(i + 1, end).split(",").map((a) => a.replace(/[.+^$()|[\]\\]/g, "\\$&"));
      re += `(?:${alts.join("|")})`;
      i = end;
    } else re += c.replace(/[.+^$()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

function stepMatches(step: SignatureStep, o: Observation): boolean {
  if (step.artifact_glob) return o.kind === "artifact" && globToRegExp(step.artifact_glob).test(o.value.replace(/^\.\//, ""));
  if (step.event_pattern) {
    if (o.kind !== "event") return false;
    const p = step.event_pattern;
    if (p.length > 2 && p.startsWith("/") && p.endsWith("/")) return new RegExp(p.slice(1, -1)).test(o.value);
    return o.value === p;
  }
  return false;
}

/**
 * 단계를 순서대로 소비한다: 직전 단계 이후(seq 증가)에서 첫 일치를 찾고, 없으면 아직 소비되지 않은 관찰 전체에서 찾는다(순서 어긋남 → inOrder=false).
 * 한 관찰은 한 단계에만 쓰인다(테스트 파일이 구현 glob에 겹쳐도 두 번 세지 않음).
 */
export function matchSignature(sig: SkillSignature, observations: Observation[]): SignatureMatch {
  const sorted = [...observations].sort((a, b) => a.seq - b.seq);
  const used = new Set<number>();
  const observed: number[] = [];
  const missingRequired: number[] = [];
  let inOrder = true;
  let cursor = -Infinity;
  for (const step of sig.steps) {
    let hit = sorted.find((o, idx) => !used.has(idx) && o.seq > cursor && stepMatches(step, o));
    let idx = hit ? sorted.indexOf(hit) : -1;
    if (!hit) {
      idx = sorted.findIndex((o, j) => !used.has(j) && stepMatches(step, o));
      hit = idx >= 0 ? sorted[idx] : undefined;
      if (hit) inOrder = false;
    }
    if (hit) {
      used.add(idx);
      observed.push(step.order);
      if (hit.seq > cursor) cursor = hit.seq;
    } else if (step.required) missingRequired.push(step.order);
  }
  return { observed, missingRequired, inOrder };
}
