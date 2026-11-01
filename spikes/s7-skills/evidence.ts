/**
 * S7 — 스킬 실행 증거 등급(SKILL_EXECUTION_EVIDENCE_SPEC §2 #13·§3)과 고유 절차 시그니처(§3 공통 행) 판정 로직. 순수 함수.
 *
 * 두 종류의 신호를 분리한다(Codex 리뷰 S7 #1·#3·#6):
 *   정체(identity) — 어느 스킬인가: Claude = Skill 도구 블록(`input.skill`), Codex = turn/start `{type:"skill"}` 수락 또는 SKILL.md 읽기 명령
 *   절차(procedure) — 그 스킬의 고유 단계가 순서대로 관찰됐는가: 시그니처 `steps[]`(artifact_glob|event_pattern, exclude_glob)
 * LOAD_OBSERVED 는 정체 + 절차가 함께 있을 때만 준다. 절차만 맞는 실행은 경쟁 스킬(tdd/diagnosing-bugs)·일반 작업일 수 있어 승격하지 않는다.
 * APPLIED_VERIFIED(산출물·테스트 해시 연결)는 P07 Verifier 범위 — 여기서는 판정하지 않는다.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Grade = "NOT_FOUND" | "DISCOVERED" | "INJECTION_ACCEPTED" | "LOAD_OBSERVED" | "APPLIED_VERIFIED" | "UNVERIFIABLE" | "FAILED";

export interface SignatureStep {
  order: number;
  /** 산출물 경로 glob(저장소 상대, `/` 구분) — event_pattern과 택일 */
  artifact_glob?: string;
  /** artifact_glob에 걸리더라도 제외할 glob(예: 구현 변경 단계에서 테스트 파일 제외). EVIDENCE_SPEC 스키마 확장 제안(S7) */
  exclude_glob?: string;
  /** 이벤트 토큰(`skill_invoked:<name>`, `test_run:fail|pass`, `command:<text>`) 정확 일치 또는 `/regex/` */
  event_pattern?: string;
  required: boolean;
  note?: string;
}

export interface SkillSignature {
  skill_id: string;
  /** 출처 저장소의 커밋(SOURCES.md 메타데이터). 로컬 설치본 트리가 그 커밋과 같음을 검증한 값은 아니다 — 로컬 앵커는 s7-c4-install.json 의 treeSha256 */
  skill_commit: string;
  version: number;
  steps: SignatureStep[];
  author: string;
  reviewed_by: string | null;
  created_seq: number;
  note?: string;
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
      if (s.exclude_glob !== undefined && !hasGlob) errors.push(`steps[${i}]: exclude_glob requires artifact_glob`);
      if (typeof s.required !== "boolean") errors.push(`steps[${i}].required: boolean`);
    });
  }
  return errors;
}

export interface ClaudeGradeInput {
  skill: string;
  /** system/init.skills — Claude Code가 세션에 노출한 스킬 이름 */
  initSkills: string[];
  /**
   * "명시 지시 전달": 프롬프트에 스킬 이름·Skill 도구 호출 지시를 넣어 보냈는가. Claude에는 Codex의 `{type:"skill"}` 같은 별도 주입 채널이 없으므로
   * INJECTION_ACCEPTED 는 이 지시가 세션에 전달됐다는 뜻이지, 세션이 "수락"했다는 관찰은 아니다(리뷰 #6). 수락의 관찰은 Skill 블록(LOAD_OBSERVED)뿐이다.
   */
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
  /** turn/start에 {type:"skill"} 입력을 보냈을 때: accepted(오류 없이 turn 완료) / rejected / null(보내지 않음) */
  injection: "accepted" | "rejected" | null;
  /** 자율 선택의 정체 신호: 해당 스킬 SKILL.md 읽기 명령이 성공·출력과 함께 관찰됐는가 */
  skillReadObserved: boolean;
  /** 시그니처 required 단계가 순서대로 관찰됐는가 */
  procedureObserved: boolean;
}

export function gradeCodex(i: CodexGradeInput): Grade {
  if (!i.listed) return "NOT_FOUND";
  if (i.injection === "rejected") return "FAILED";
  const identity = i.injection === "accepted" || i.skillReadObserved;
  if (identity && i.procedureObserved) return "LOAD_OBSERVED";
  if (identity) return "INJECTION_ACCEPTED";
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
  if (step.artifact_glob) {
    if (o.kind !== "artifact") return false;
    const rel = o.value.replace(/^\.\//, "");
    if (!globToRegExp(step.artifact_glob).test(rel)) return false;
    return !(step.exclude_glob && globToRegExp(step.exclude_glob).test(rel));
  }
  if (step.event_pattern) {
    if (o.kind !== "event") return false;
    const p = step.event_pattern;
    const m = /^\/(.+)\/([a-z]*)$/s.exec(p); // `/regex/` 또는 `/regex/flags`
    if (m) return new RegExp(m[1], m[2]).test(o.value);
    return o.value === p;
  }
  return false;
}

/**
 * 단계를 순서대로 소비한다: 직전 단계 이후(seq 증가)에서 첫 일치를 찾고, 없으면 아직 소비되지 않은 관찰 전체에서 찾는다(순서 어긋남 → inOrder=false).
 * 한 관찰은 한 단계에만 쓰인다.
 */
export function matchSignature(sig: SkillSignature, observations: Observation[]): SignatureMatch {
  const sorted = [...observations].sort((a, b) => a.seq - b.seq);
  const used = new Set<number>();
  const observed: number[] = [];
  const missingRequired: number[] = [];
  let inOrder = true;
  let cursor = -Infinity;
  for (const step of sig.steps) {
    let idx = sorted.findIndex((o, j) => !used.has(j) && o.seq > cursor && stepMatches(step, o));
    if (idx < 0) {
      idx = sorted.findIndex((o, j) => !used.has(j) && stepMatches(step, o));
      if (idx >= 0) inOrder = false;
    }
    if (idx >= 0) {
      used.add(idx);
      observed.push(step.order);
      if (sorted[idx].seq > cursor) cursor = sorted[idx].seq;
    } else if (step.required) missingRequired.push(step.order);
  }
  return { observed, missingRequired, inOrder };
}
