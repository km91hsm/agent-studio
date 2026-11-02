/**
 * 투영(P01 범위): projects · tasks · leases · approvals · capabilities (+ projection_cursor).
 * 열 ↔ 생산 이벤트·필드 대응은 `packages/protocol/projections.md` 가 정본이며 `projections.test.ts` 가 열 단위로 대조한다.
 * 같은 `PROJECTORS` 배열을 실시간 적용(append 트랜잭션)과 `rebuildProjections`(DROP 후 전체 재생)이 공유한다.
 */
import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import type { JournalEvent } from "./event-store.js";
import type { SqliteEventStore } from "./sqlite-store.js";

export interface Projector {
  table: string;
  ddl: string;
  apply(e: JournalEvent, db: Database.Database): void;
}

const str = (v: unknown): string | null => (v === undefined || v === null ? null : typeof v === "string" ? v : JSON.stringify(v));
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

export const PROJECTORS: readonly Projector[] = [
  {
    table: "projects",
    ddl: `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, path TEXT, policy_json TEXT)`,
    apply(e, db) {
      if (e.type === "ProjectRegistered") {
        db.prepare("INSERT OR REPLACE INTO projects(id, path, policy_json) VALUES (?, ?, NULL)").run(str(e.payload.id) ?? e.projectId, str(e.payload.path));
      } else if (e.type === "ProjectPolicyChanged" && e.projectId) {
        db.prepare("UPDATE projects SET policy_json = ? WHERE id = ?").run(JSON.stringify(e.payload.after ?? null), e.projectId);
      }
    },
  },
  {
    table: "tasks",
    ddl: `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, phase_id TEXT, title TEXT, kind TEXT, status TEXT, paused INTEGER NOT NULL DEFAULT 0,
      iteration INTEGER NOT NULL DEFAULT 0, implementer_agent TEXT, reviewer_agent TEXT, created_seq INTEGER, updated_seq INTEGER)`,
    apply(e, db) {
      if (!e.taskId) return;
      switch (e.type) {
        case "TaskCreated":
          db.prepare("INSERT OR REPLACE INTO tasks(id, phase_id, title, kind, status, paused, iteration, created_seq, updated_seq) VALUES (?, ?, ?, ?, NULL, 0, 0, ?, ?)").run(
            e.taskId,
            str(e.payload.phase_id) ?? e.phaseId ?? null,
            str(e.payload.title),
            str(e.payload.kind),
            e.seq,
            e.seq,
          );
          break;
        case "TaskTransition":
          db.prepare(
            `UPDATE tasks SET status = ?, updated_seq = ?,
               iteration = COALESCE(?, iteration),
               implementer_agent = COALESCE(?, implementer_agent),
               reviewer_agent = COALESCE(?, reviewer_agent)
             WHERE id = ?`,
          ).run(str(e.payload.to), e.seq, num(e.payload.iteration), str(e.payload.implementer_agent), str(e.payload.reviewer_agent), e.taskId);
          break;
        case "Paused":
          db.prepare("UPDATE tasks SET paused = 1 WHERE id = ?").run(e.taskId);
          break;
        case "ResumeRequested":
          db.prepare("UPDATE tasks SET paused = 0 WHERE id = ?").run(e.taskId);
          break;
      }
    },
  },
  {
    table: "leases",
    ddl: `CREATE TABLE IF NOT EXISTS leases (task_id TEXT PRIMARY KEY, run_id TEXT, fencing_token INTEGER, expires_at TEXT, heartbeat_at TEXT)`,
    apply(e, db) {
      if (!e.taskId) return;
      if (e.type === "LeaseAcquired") {
        db.prepare("INSERT OR REPLACE INTO leases(task_id, run_id, fencing_token, expires_at, heartbeat_at) VALUES (?, ?, ?, ?, NULL)").run(
          e.taskId,
          str(e.payload.run_id) ?? e.agentRunId ?? null,
          num(e.payload.token),
          str(e.payload.expires_at),
        );
      } else if (e.type === "LeaseRenewed") {
        db.prepare("UPDATE leases SET expires_at = COALESCE(?, expires_at), heartbeat_at = ? WHERE task_id = ? AND fencing_token = ?").run(
          str(e.payload.expires_at),
          str(e.payload.heartbeat_at),
          e.taskId,
          num(e.payload.token),
        );
      } else if (e.type === "LeaseExpired") {
        db.prepare("DELETE FROM leases WHERE task_id = ? AND fencing_token = ?").run(e.taskId, num(e.payload.token));
      }
    },
  },
  {
    table: "approvals",
    ddl: `CREATE TABLE IF NOT EXISTS approvals (
      request_id TEXT PRIMARY KEY, task_id TEXT, run_id TEXT, kind TEXT, category TEXT, request_json TEXT,
      decision TEXT, scope TEXT, decided_by TEXT, requested_at TEXT, decided_at TEXT, expires_at TEXT)`,
    apply(e, db) {
      const rid = str(e.payload.request_id);
      if (!rid) return;
      if (e.type === "ApprovalRequested") {
        db.prepare(
          "INSERT OR REPLACE INTO approvals(request_id, task_id, run_id, kind, category, request_json, decision, scope, decided_by, requested_at, decided_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, NULL, ?)",
        ).run(rid, e.taskId ?? null, e.agentRunId ?? null, str(e.payload.kind), str(e.payload.category), JSON.stringify(e.payload.request ?? null), str(e.payload.requested_at) ?? e.ts, str(e.payload.expires_at));
      } else if (e.type === "ApprovalDecided") {
        db.prepare("UPDATE approvals SET decision = ?, scope = ?, decided_by = ?, decided_at = ? WHERE request_id = ?").run(
          str(e.payload.decision),
          str(e.payload.scope),
          str(e.payload.by),
          str(e.payload.decided_at) ?? e.ts,
          rid,
        );
      } else if (e.type === "ApprovalExpired") {
        db.prepare("UPDATE approvals SET decision = 'expired', decided_by = 'daemon', decided_at = ? WHERE request_id = ?").run(e.ts, rid);
      }
    },
  },
  {
    table: "capabilities",
    ddl: `CREATE TABLE IF NOT EXISTS capabilities (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)`,
    apply(e, db) {
      if (e.type !== "WorkspaceSettingsChanged") return;
      const caps = e.payload.capabilities;
      if (!caps || typeof caps !== "object") return;
      const up = db.prepare("INSERT OR REPLACE INTO capabilities(key, value_json) VALUES (?, ?)");
      for (const [k, v] of Object.entries(caps as Record<string, unknown>)) up.run(k, JSON.stringify(v));
    },
  },
];

const CURSOR_DDL = `CREATE TABLE IF NOT EXISTS projection_cursor (name TEXT PRIMARY KEY, last_seq INTEGER NOT NULL)`;

export function ensureProjectionTables(db: Database.Database): void {
  for (const p of PROJECTORS) db.exec(p.ddl);
  db.exec(CURSOR_DDL);
}

/** append 트랜잭션 안에서 호출: 모든 projector 적용 + cursor 전진. */
export function applyProjection(db: Database.Database, e: JournalEvent): void {
  const cursor = db.prepare("INSERT OR REPLACE INTO projection_cursor(name, last_seq) VALUES (?, ?)");
  for (const p of PROJECTORS) {
    p.apply(e, db);
    cursor.run(p.table, e.seq);
  }
}

/** 투영 테이블 전부 DROP 후 저널 전체 재생(RC-S16). */
export function rebuildProjections(store: SqliteEventStore): void {
  const db = store.db;
  const tx = db.transaction(() => {
    for (const p of PROJECTORS) db.exec(`DROP TABLE IF EXISTS ${p.table}`);
    db.exec("DROP TABLE IF EXISTS projection_cursor");
    ensureProjectionTables(db);
    const cursor = db.prepare("INSERT OR REPLACE INTO projection_cursor(name, last_seq) VALUES (?, ?)");
    for (const p of PROJECTORS) cursor.run(p.table, 0);
    for (const e of store.read(1)) applyProjection(db, e);
  });
  tx();
}

/** 투영 테이블(+cursor) 행을 정렬·직렬화해 sha256. */
export function projectionChecksum(store: SqliteEventStore): string {
  const h = createHash("sha256");
  for (const table of [...PROJECTORS.map((p) => p.table), "projection_cursor"]) {
    const cols = store.columns(table);
    const rows = store.db.prepare(`SELECT * FROM ${table} ORDER BY ${cols.map((c) => `"${c}"`).join(", ")}`).all() as Record<string, unknown>[];
    h.update(`#${table}\n`);
    for (const r of rows) h.update(JSON.stringify(cols.map((c) => r[c])) + "\n");
  }
  return h.digest("hex");
}
