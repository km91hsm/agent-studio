/**
 * S8 — EffectLedger: 효과 원장(outbox) 최소 구현 (DATABASE_SCHEMA §3 `effects`, D16, RC-S13).
 *   intend(key, spec)       : 효과를 실행하기 **전에** 원장에 기록(idempotency_key PK, 같은 키 재기록 거부)
 *   recordResult(key)       : 실행 중간 산출(예: 생성된 git SHA)을 commit 전에 기록 — outbox
 *   commit(key)             : 효과 완료 표시 (unverifiable 상태에서는 거부 — 사용자 대조로만 해소)
 *   assess*(key, …)         : 재기동 시 현재 상태와 대조해 done / reapply_with_approval / conflict / unverifiable 판정
 *   resolveUnverifiable(key): 사용자 대조 결과를 받는 유일한 unverifiable 탈출 경로
 * 원장은 JSON 파일 하나. 모든 쓰기는 임시 파일 + rename(크래시 시 반쪽 파일 없음; fsync 는 하지 않음 — 보고서 §5).
 * 이 모듈은 효과를 **직접 적용하지 않는다** — 재적용은 항상 호출자가 승인 뒤에 한다(자동 재적용·자동 재시도 금지).
 * 자동 전이는 `done` 하나뿐이며, 그것도 현재 상태가 intent 와 **정확히** 일치할 때만이다(blob 일치 / 기록 SHA 의 parent·tree 일치 / HEAD 의 parent·tree 일치).
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
  /** 커밋 직전의 HEAD(예상 parent) */
  parentSha: string;
  /** 스테이징 후 `git write-tree` 로 얻은 예상 tree — 기록 SHA/HEAD 가 "내 커밋"인지 대조하는 근거(DATABASE_SCHEMA §3) */
  treeSha: string;
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

/** `assessGitCommit` 에 주입하는 저장소 조회 — 커밋 SHA → parents·tree, 없으면 null */
export interface GitInspector {
  headSha: string;
  inspect: (sha: string) => { parents: string[]; tree: string } | null;
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
    if (spec.kind === "git_commit" && (!spec.parentSha || !spec.treeSha)) throw new Error(`git_commit intent requires parentSha and treeSha: ${key}`);
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
    if (e.state === "unverifiable") throw new Error(`cannot commit unverifiable effect ${key}: use resolveUnverifiable`);
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

  /**
   * git_commit (리뷰 #2·#3): 원장 상태가 무엇이든 저장소를 다시 본다.
   *   기록 SHA 있음 → 존재하고 parent·tree 가 intent 와 일치해야 done(재커밋 금지); 없거나 불일치 → conflict(보류)
   *   기록 SHA 없음 → HEAD 의 parent·tree 가 일치하면 "내 커밋"(SHA 기록 전 크래시) → done + SHA 복구;
   *                  HEAD 가 아직 parent 면 reapply_with_approval; 그 외 conflict
   */
  assessGitCommit(key: string, repo: GitInspector): Decision {
    const e = this.must(key);
    if (e.spec.kind !== "git_commit") throw new Error(`assessGitCommit: ${key} is ${e.spec.kind}`);
    const { parentSha, treeSha } = e.spec;
    const matches = (c: { parents: string[]; tree: string } | null) => !!c && c.parents[0] === parentSha && c.tree === treeSha;
    const sha = typeof e.result?.sha === "string" ? e.result.sha : null;
    if (sha) {
      const c = repo.inspect(sha);
      return this.conclude(e, matches(c) ? "done" : "conflict", `sha=${sha} ${c ? `parent=${c.parents[0]} tree=${c.tree}` : "missing"} head=${repo.headSha}`);
    }
    const head = repo.inspect(repo.headSha);
    if (matches(head)) {
      e.result = { ...(e.result ?? {}), sha: repo.headSha, recoveredBy: "tree_match" };
      return this.conclude(e, "done", `head=${repo.headSha} matches intent parent·tree (sha recovered)`);
    }
    if (repo.headSha === parentSha) return this.conclude(e, "reapply_with_approval", `head=${repo.headSha} == parent, no commit yet`);
    return this.conclude(e, "conflict", `head=${repo.headSha} moved, no recorded sha`);
  }

  /**
   * net/mcp/external_service: 외부 참조 또는 검증기가 없으면 unverifiable (자동 건너뛰기·재시도 금지).
   * 리뷰 #1: 한 번 unverifiable 이 되면 검증기를 나중에 줘도 재평가하지 않는다 — resolveUnverifiable 만이 탈출 경로.
   */
  assessExternal(key: string, verify?: (externalRef: string) => boolean): Decision {
    const e = this.must(key);
    if (e.spec.kind === "file_patch" || e.spec.kind === "git_commit") throw new Error(`assessExternal: ${key} is ${e.spec.kind}`);
    if (e.state === "committed") return this.conclude(e, "done", "committed");
    if (e.state === "unverifiable") return this.conclude(e, "unverifiable", "awaiting user resolution");
    const ref = e.spec.externalRef;
    if (!ref || !verify) {
      e.state = "unverifiable";
      return this.conclude(e, "unverifiable", ref ? "no verifier" : "no external_ref");
    }
    return this.conclude(e, verify(ref) ? "done" : "reapply_with_approval", `ref=${ref}`);
  }

  /** 사용자 대조 결과 반영 — unverifiable 상태에서만 허용 */
  resolveUnverifiable(key: string, resolution: { outcome: "done" | "failed"; by: string; note?: string }): void {
    const e = this.must(key);
    if (e.state !== "unverifiable") throw new Error(`resolveUnverifiable: ${key} is not unverifiable (${e.state})`);
    const observed = `user:${resolution.by}${resolution.note ? ` ${resolution.note}` : ""}`;
    if (resolution.outcome === "done") {
      this.conclude(e, "done", observed);
    } else {
      e.state = "failed";
      e.assessments.push({ at: new Date().toISOString(), decision: "conflict", observed });
      e.result = { ...(e.result ?? {}), reason: observed };
      this.persist();
    }
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
