/**
 * S8 — EffectLedger: 효과 원장(outbox) 최소 구현 (DATABASE_SCHEMA §3 `effects`, D16, RC-S13).
 *   intend(key, spec)  : 효과를 실행하기 **전에** 원장에 기록(idempotency_key PK, 같은 키 재기록 거부)
 *   recordResult(key)  : 실행 중간 산출(예: 생성된 git SHA)을 commit 전에 기록 — outbox
 *   commit(key)        : 효과 완료 표시
 *   assess*(key, …)    : 재기동 시 현재 상태와 대조해 done / reapply_with_approval / conflict / unverifiable 판정
 * 원장은 JSON 파일 하나. 모든 쓰기는 임시 파일 + rename 으로 원자적이다(크래시 시 반쪽 파일 없음).
 * 이 모듈은 효과를 **직접 적용하지 않는다** — 재적용은 항상 호출자가 승인 뒤에 한다(자동 재적용·자동 재시도 금지).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type EffectState = "intended" | "committed" | "failed" | "unverifiable";
export type Decision = "done" | "reapply_with_approval" | "conflict" | "unverifiable";

export interface FilePatchSpec {
  kind: "file_patch";
  path: string;
  baseBlob: string;
  targetBlob: string;
  patchHash: string;
  fileMode: string;
}
export interface GitCommitSpec {
  kind: "git_commit";
  parentSha: string;
  treeSha?: string;
  message: string;
}
export interface ExternalSpec {
  kind: "net" | "mcp" | "external_service";
  target: string;
  /** 외부 서비스가 돌려준 멱등 참조. 없으면 재기동 시 unverifiable */
  externalRef: string | null;
}
export type EffectSpec = FilePatchSpec | GitCommitSpec | ExternalSpec;

export interface Assessment {
  at: string;
  decision: Decision;
  observed?: string;
}

export interface EffectEntry {
  key: string;
  spec: EffectSpec;
  state: EffectState;
  intendedAt: string;
  committedAt: string | null;
  /** outbox: commit 전에 남긴 중간 산출(예: `{ sha }`) */
  result: Record<string, unknown> | null;
  assessments: Assessment[];
}

interface LedgerFile {
  version: 1;
  effects: Record<string, EffectEntry>;
}

/** git 과 같은 blob sha1 (`blob <len>\0<data>`) */
export function blobOf(data: Buffer): string {
  return createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
}

export class EffectLedger {
  private data: LedgerFile;

  constructor(private readonly file: string) {
    this.data = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as LedgerFile) : { version: 1, effects: {} };
  }

  static load(file: string): EffectLedger {
    return new EffectLedger(file);
  }

  get(key: string): EffectEntry | undefined {
    return this.data.effects[key];
  }

  intend(key: string, spec: EffectSpec): EffectEntry {
    if (this.data.effects[key]) throw new Error(`duplicate idempotency key: ${key}`);
    const entry: EffectEntry = { key, spec, state: "intended", intendedAt: new Date().toISOString(), committedAt: null, result: null, assessments: [] };
    this.data.effects[key] = entry;
    this.persist();
    return entry;
  }

  recordResult(key: string, result: Record<string, unknown>): void {
    const e = this.must(key);
    e.result = { ...(e.result ?? {}), ...result };
    this.persist();
  }

  commit(key: string): void {
    const e = this.must(key);
    e.state = "committed";
    e.committedAt = new Date().toISOString();
    this.persist();
  }

  fail(key: string, reason: string): void {
    const e = this.must(key);
    e.state = "failed";
    e.result = { ...(e.result ?? {}), reason };
    this.persist();
  }

  /** file_patch: 현재 blob 과 대조 — target 이면 이미 적용됨(done, 원장도 committed 로), base 면 미적용(승인 후 재적용), 그 외는 제3의 변경(conflict) */
  assess(key: string, currentBlob: string): Decision {
    const e = this.must(key);
    if (e.spec.kind !== "file_patch") throw new Error(`assess: ${key} is ${e.spec.kind}, use assessGitCommit/assessExternal`);
    let decision: Decision;
    if (e.state === "committed" || currentBlob === e.spec.targetBlob) decision = "done";
    else if (currentBlob === e.spec.baseBlob) decision = "reapply_with_approval";
    else decision = "conflict";
    return this.conclude(e, decision, currentBlob);
  }

  /** git_commit: outbox 에 SHA 가 있고 저장소에 존재하면 done(재커밋 금지); SHA 없고 parent 가 아직 HEAD 면 승인 후 재시도; HEAD 가 움직였으면 conflict */
  assessGitCommit(key: string, repo: { headSha: string; shaExists: (sha: string) => boolean }): Decision {
    const e = this.must(key);
    if (e.spec.kind !== "git_commit") throw new Error(`assessGitCommit: ${key} is ${e.spec.kind}`);
    const sha = typeof e.result?.sha === "string" ? e.result.sha : null;
    let decision: Decision;
    if (e.state === "committed" || (sha && repo.shaExists(sha))) decision = "done";
    else if (repo.headSha === e.spec.parentSha) decision = "reapply_with_approval";
    else decision = "conflict";
    return this.conclude(e, decision, `head=${repo.headSha} sha=${sha ?? "-"}`);
  }

  /** net/mcp/external_service: 외부 참조가 없으면 검증 불가 → unverifiable (자동 건너뛰기·재시도 금지, 사람이 판단) */
  assessExternal(key: string, verify?: (externalRef: string) => boolean): Decision {
    const e = this.must(key);
    if (e.spec.kind === "file_patch" || e.spec.kind === "git_commit") throw new Error(`assessExternal: ${key} is ${e.spec.kind}`);
    if (e.state === "committed") return this.conclude(e, "done", "committed");
    const ref = e.spec.externalRef;
    if (!ref || !verify) {
      e.state = "unverifiable";
      return this.conclude(e, "unverifiable", ref ? "no verifier" : "no external_ref");
    }
    return this.conclude(e, verify(ref) ? "done" : "reapply_with_approval", `ref=${ref}`);
  }

  private conclude(e: EffectEntry, decision: Decision, observed: string): Decision {
    e.assessments.push({ at: new Date().toISOString(), decision, observed });
    if (decision === "done" && e.state !== "committed") {
      e.state = "committed";
      e.committedAt = new Date().toISOString();
    }
    this.persist();
    return decision;
  }

  private must(key: string): EffectEntry {
    const e = this.data.effects[key];
    if (!e) throw new Error(`unknown idempotency key: ${key}`);
    return e;
  }

  /** tmp + rename 원자 쓰기 */
  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2) + "\n");
    renameSync(tmp, this.file);
  }
}
