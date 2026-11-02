/**
 * RC-S16 (AC-P01-2·7): 투영은 저널에서 100% 재구성되며, `packages/protocol/projections.md` 가 모든 투영 열을 열 단위로 설명한다.
 * 검토 #4: 행 수가 아니라 `테이블.열` 집합의 양방향 대조 + 문서가 가리키는 payload 필드가 실제 생산됨 + 값 비교 + 기동 경로 재구성.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { JournalEvent } from "./event-store.js";
import { PROJECTORS, projectionChecksum, rebuildProjections } from "./projections.js";
import { openSqliteStore } from "./sqlite-store.js";

const PROJECTIONS_MD = fileURLToPath(new URL("../../../protocol/projections.md", import.meta.url));

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});
const newPath = () => {
  const d = mkdtempSync(join(tmpdir(), "as-proj-"));
  dirs.push(d);
  return join(d, "journal.sqlite");
};

type Row = { table: string; column: string; event: string; field: string };
/** `| \`tasks.status\` | TaskTransition | payload.to | … |` 행을 파싱한다. */
export function parseProjectionsMd(md: string): Row[] {
  const rows: Row[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^\|\s*`([a-z_]+)\.([a-z_]+)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (m) rows.push({ table: m[1]!, column: m[2]!, event: m[3]!, field: m[4]! });
  }
  return rows;
}

const ISOLATION = [{ provider: "codex", os: "windows", sandbox: "workspaceWrite", variant: "elevated", variantApplied: "verified", area: "network_loopback", bypassedPolicies: ["network"] }];

/** 투영 전 테이블을 채우는 대표 저널(각 생산 이벤트 1건 이상). */
function loadFixture(s: ReturnType<typeof openSqliteStore>) {
  const p = "proj-1";
  const t = "task-1";
  s.append({ type: "ProjectRegistered", projectId: p, payload: { id: p, path: "D:/tmp/sample" } });
  s.append({ type: "ProjectPolicyChanged", projectId: p, payload: { before: null, after: { v: 1, permissionMode: { claude: "default" } } } });
  s.append({ type: "WorkspaceSettingsChanged", payload: { capabilities: { isolation_warning: ISOLATION } } });
  s.append({ type: "TaskCreated", projectId: p, taskId: t, payload: { title: "empty task", kind: "impl", phase_id: "ph-1" } });
  s.append({ type: "TaskTransition", taskId: t, payload: { from: null, to: "QUEUED", reason: "submit" } });
  s.append({ type: "LeaseAcquired", taskId: t, agentRunId: "run-1", payload: { run_id: "run-1", token: 1, ttl: 90000, expires_at: "2026-11-02T00:01:30.000Z" } });
  s.append({ type: "TaskTransition", taskId: t, fencingToken: 1, payload: { from: "QUEUED", to: "PLANNING", reason: "lease_acquired", implementer_agent: "claude" } });
  s.append({ type: "LeaseRenewed", taskId: t, agentRunId: "run-1", payload: { run_id: "run-1", token: 1, heartbeat_at: "2026-11-02T00:00:20.000Z", expires_at: "2026-11-02T00:01:50.000Z" } });
  s.append({ type: "PauseRequested", taskId: t, payload: {} });
  s.append({ type: "Paused", taskId: t, payload: { paused: true } });
  s.append({ type: "ResumeRequested", taskId: t, payload: { paused: false } });
  s.append({
    type: "ApprovalRequested",
    taskId: t,
    agentRunId: "run-1",
    correlationId: "req-1",
    payload: { request_id: "req-1", kind: "approval", category: "exec", request: { command: "npm test" }, requested_at: "2026-11-02T00:00:30.000Z", expires_at: "2026-11-02T00:15:30.000Z" },
  });
  s.append({ type: "TaskTransition", taskId: t, fencingToken: 1, payload: { from: "PLANNING", to: "WAITING_APPROVAL", reason: "approval_needed", iteration: 0 } });
  s.append({ type: "ApprovalDecided", taskId: t, correlationId: "req-1", payload: { request_id: "req-1", decision: "accept", scope: "once", by: "user", decided_at: "2026-11-02T00:01:00.000Z" } });
  s.append({ type: "TaskTransition", taskId: t, payload: { from: "WAITING_APPROVAL", to: "PLANNING", reason: "approved", reviewer_agent: "codex", iteration: 1 } });
  s.append({
    type: "ApprovalRequested",
    taskId: t,
    agentRunId: "run-1",
    correlationId: "req-2",
    payload: { request_id: "req-2", kind: "user_input", category: "exec", request: { q: "?" }, requested_at: "2026-11-02T00:02:00.000Z", expires_at: "2026-11-02T00:17:00.000Z" },
  });
  s.append({ type: "ApprovalExpired", taskId: t, correlationId: "req-2", payload: { request_id: "req-2" } });
  s.append({ type: "LeaseExpired", taskId: t, agentRunId: "run-1", payload: { run_id: "run-1", token: 1 } });
  return { p, t };
}

describe("projections (SQLite) — RC-S16", () => {
  it("저널 적재 후 투영 행 값이 기대 payload 와 같다", () => {
    const s = openSqliteStore(newPath());
    const { p, t } = loadFixture(s);
    const q = s.projections().query;
    expect(q("projects")).toEqual([{ id: p, path: "D:/tmp/sample", policy_json: JSON.stringify({ v: 1, permissionMode: { claude: "default" } }) }]);
    const task = q("tasks")[0]!;
    expect(task).toMatchObject({ id: t, phase_id: "ph-1", title: "empty task", kind: "impl", status: "PLANNING", paused: 0, iteration: 1, implementer_agent: "claude", reviewer_agent: "codex", created_seq: 4 });
    expect(task.updated_seq).toBe(s.lastSeq() - 3); // 마지막 TaskTransition 의 seq
    expect(q("leases")).toEqual([]); // LeaseExpired 로 제거
    const approvals = q("approvals");
    expect(approvals).toHaveLength(2);
    expect(approvals.find((a) => a.request_id === "req-1")).toMatchObject({ task_id: t, run_id: "run-1", kind: "approval", category: "exec", decision: "accept", scope: "once", decided_by: "user", decided_at: "2026-11-02T00:01:00.000Z", requested_at: "2026-11-02T00:00:30.000Z", expires_at: "2026-11-02T00:15:30.000Z" });
    expect(JSON.parse(approvals.find((a) => a.request_id === "req-1")!.request_json as string)).toEqual({ command: "npm test" });
    expect(approvals.find((a) => a.request_id === "req-2")).toMatchObject({ decision: "expired", decided_by: "daemon" });
    expect(q("capabilities")).toEqual([{ key: "isolation_warning", value_json: JSON.stringify(ISOLATION) }]);
    expect(q("projection_cursor")).toEqual(PROJECTORS.map((pr) => ({ name: pr.table, last_seq: s.lastSeq() })));
    s.close();
  });

  it("lease 는 LeaseAcquired 로 생기고 LeaseRenewed 로 갱신된다", () => {
    const s = openSqliteStore(newPath());
    s.append({ type: "TaskCreated", taskId: "t", payload: { title: "x", kind: "impl" } });
    s.append({ type: "LeaseAcquired", taskId: "t", agentRunId: "r", payload: { run_id: "r", token: 3, ttl: 90000, expires_at: "A" } });
    expect(s.projections().query("leases")).toEqual([{ task_id: "t", run_id: "r", fencing_token: 3, expires_at: "A", heartbeat_at: null }]);
    s.append({ type: "LeaseRenewed", taskId: "t", agentRunId: "r", payload: { run_id: "r", token: 3, heartbeat_at: "H", expires_at: "B" } });
    expect(s.projections().query("leases")).toEqual([{ task_id: "t", run_id: "r", fencing_token: 3, expires_at: "B", heartbeat_at: "H" }]);
    s.close();
  });

  it("투영 DROP → rebuildProjections → 체크섬 동일, cursor == lastSeq (RC-S16)", () => {
    const s = openSqliteStore(newPath());
    loadFixture(s);
    const c1 = projectionChecksum(s);
    for (const pr of PROJECTORS) s.rawExec(`DROP TABLE ${pr.table}`);
    s.rawExec("DROP TABLE projection_cursor");
    expect(() => s.projections().query("tasks")).toThrow();
    rebuildProjections(s);
    expect(projectionChecksum(s)).toBe(c1);
    expect(s.projections().query("projection_cursor").every((r) => r.last_seq === s.lastSeq())).toBe(true);
    s.close();
  });

  it("기동 경로: 투영이 없는 파일을 다시 열면 자동 재구성되어 체크섬이 같다", () => {
    const path = newPath();
    const s1 = openSqliteStore(path);
    loadFixture(s1);
    const c1 = projectionChecksum(s1);
    for (const pr of PROJECTORS) s1.rawExec(`DROP TABLE ${pr.table}`);
    s1.rawExec("DROP TABLE projection_cursor");
    s1.close();
    const s2 = openSqliteStore(path);
    expect(projectionChecksum(s2)).toBe(c1);
    expect(s2.projections().query("tasks")).toHaveLength(1);
    s2.close();
  });

  it("기동 경로: cursor 가 lastSeq 보다 뒤처진 파일(투영만 지운 뒤 append 없음)도 따라잡는다", () => {
    const path = newPath();
    const s1 = openSqliteStore(path);
    loadFixture(s1);
    const c1 = projectionChecksum(s1);
    s1.rawExec("DELETE FROM tasks");
    s1.rawExec("UPDATE projection_cursor SET last_seq = 3");
    s1.close();
    const s2 = openSqliteStore(path);
    expect(projectionChecksum(s2)).toBe(c1);
    s2.close();
  });

  it("projections.md: 테이블.열 집합이 실제 스키마와 양방향으로 같고, 각 행의 생산 이벤트·필드가 테스트 저널에 실제로 존재한다 (AC-P01-7)", () => {
    const s = openSqliteStore(newPath());
    loadFixture(s);
    const rows = parseProjectionsMd(readFileSync(PROJECTIONS_MD, "utf8"));
    expect(rows.length).toBeGreaterThan(0);
    const documented = new Set(rows.map((r) => `${r.table}.${r.column}`));
    const actual = new Set<string>();
    for (const table of [...PROJECTORS.map((p) => p.table), "projection_cursor"]) {
      for (const col of s.columns(table)) actual.add(`${table}.${col}`);
    }
    expect([...actual].filter((c) => !documented.has(c)), "스키마에만 있음(문서 누락)").toEqual([]);
    expect([...documented].filter((c) => !actual.has(c)), "문서에만 있음(스키마 누락)").toEqual([]);

    const journal: JournalEvent[] = s.read(1);
    const problems: string[] = [];
    for (const r of rows) {
      const events = r.event.split(/\s*[,·]\s*/).map((e) => e.replace(/`/g, "").trim()).filter((e) => e && e !== "—");
      const fields = r.field.split(/\s*[,·]\s*/).map((f) => f.replace(/`/g, "").trim()).filter((f) => f && f !== "—");
      // (1) 행에 적힌 생산 이벤트는 모두 테스트 저널에 존재해야 한다(문서가 가리키는 이벤트가 실제 생산됨)
      for (const evName of events) {
        if (!journal.some((j) => j.type === evName)) problems.push(`${r.table}.${r.column}: 이벤트 ${evName} 가 테스트 저널에 없음`);
      }
      const produced = journal.filter((j) => events.includes(j.type));
      // (2) 행에 적힌 각 필드는 그 이벤트들 중 하나의 payload/envelope 에 실제로 존재해야 한다
      for (const f of fields) {
        if (f.startsWith("payload.")) {
          const key = f.slice("payload.".length).split(".")[0]!;
          if (!produced.some((j) => key in j.payload)) problems.push(`${r.table}.${r.column}: ${events.join("/")}.payload.${key} 미생산`);
        } else if (f.startsWith("envelope.")) {
          const key = f.slice("envelope.".length) as keyof JournalEvent;
          if (events.length > 0 && !produced.some((j) => j[key] !== undefined)) problems.push(`${r.table}.${r.column}: ${events.join("/")} envelope.${String(key)} 미생산`);
        } else if (f !== "derived") {
          problems.push(`${r.table}.${r.column}: 필드 표기 '${f}' 는 payload.*|envelope.*|derived 여야 함`);
        }
      }
    }
    expect(problems).toEqual([]);
    s.close();
  });
});
