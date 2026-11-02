/**
 * SQLite EventStore — better-sqlite3, WAL, append-only(UPDATE/DELETE 트리거 거부), 단일 writer(동기 트랜잭션).
 * 투영은 append 와 같은 트랜잭션에서 적용되고, 기동 시 투영 테이블이 없거나 cursor 가 뒤처지면 저널에서 전부 재구성한다.
 */
import Database from "better-sqlite3";
import type { EventStore, JournalEvent, NewEvent } from "./event-store.js";
import { prepareEvent, Subscribers } from "./event-store.js";
import { applyProjection, ensureProjectionTables, PROJECTORS, projectionChecksum, rebuildProjections } from "./projections.js";

export const SCHEMA_VERSION = 1;

/** DATABASE_SCHEMA §2.1 DDL 그대로 + schema_version + append-only 트리거 */
const DDL = `
CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (
  seq            INTEGER PRIMARY KEY,
  event_id       TEXT NOT NULL UNIQUE,
  ts             TEXT NOT NULL,
  type           TEXT NOT NULL,
  workspace_id   TEXT, project_id TEXT, phase_id TEXT, task_id TEXT,
  agent_run_id   TEXT, session_ref TEXT,
  correlation_id TEXT,
  causation_seq  INTEGER,
  fencing_token  INTEGER,
  payload        TEXT NOT NULL CHECK (json_valid(payload)),
  redacted       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_events_task ON events(task_id, seq);
CREATE INDEX IF NOT EXISTS ix_events_run  ON events(agent_run_id, seq);
CREATE INDEX IF NOT EXISTS ix_events_type ON events(type, seq);
CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT, 'events is append-only'); END;
CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT, 'events is append-only'); END;
`;

type Row = {
  seq: number;
  event_id: string;
  ts: string;
  type: string;
  workspace_id: string | null;
  project_id: string | null;
  phase_id: string | null;
  task_id: string | null;
  agent_run_id: string | null;
  session_ref: string | null;
  correlation_id: string | null;
  causation_seq: number | null;
  fencing_token: number | null;
  payload: string;
  redacted: number;
};

function rowToEvent(r: Row): JournalEvent {
  const e: JournalEvent = {
    seq: r.seq,
    eventId: r.event_id,
    ts: r.ts,
    type: r.type as JournalEvent["type"],
    payload: JSON.parse(r.payload) as Record<string, unknown>,
    redacted: (r.redacted ? 1 : 0) as 0 | 1,
  };
  if (r.workspace_id !== null) e.workspaceId = r.workspace_id;
  if (r.project_id !== null) e.projectId = r.project_id;
  if (r.phase_id !== null) e.phaseId = r.phase_id;
  if (r.task_id !== null) e.taskId = r.task_id;
  if (r.agent_run_id !== null) e.agentRunId = r.agent_run_id;
  if (r.session_ref !== null) e.sessionRef = r.session_ref;
  if (r.correlation_id !== null) e.correlationId = r.correlation_id;
  if (r.causation_seq !== null) e.causationSeq = r.causation_seq;
  if (r.fencing_token !== null) e.fencingToken = r.fencing_token;
  return e;
}

export interface ProjectionsApi {
  query(table: string): Record<string, unknown>[];
  checksum(): string;
  rebuild(): void;
}

export class SqliteEventStore implements EventStore {
  private readonly subs = new Subscribers();
  private readonly insert;
  private readonly selectRange;
  private readonly selectMax;
  private readonly appendTx;

  constructor(
    readonly db: Database.Database,
    private readonly now: () => number = Date.now,
  ) {
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma("busy_timeout = 5000");
    db.pragma("foreign_keys = ON");
    db.exec(DDL);
    if (this.schemaVersion() === 0) {
      db.prepare("INSERT INTO schema_version(version, applied_at) VALUES (?, ?)").run(SCHEMA_VERSION, new Date(now()).toISOString());
    }
    this.insert = db.prepare(
      `INSERT INTO events(seq, event_id, ts, type, workspace_id, project_id, phase_id, task_id, agent_run_id, session_ref, correlation_id, causation_seq, fencing_token, payload, redacted)
       VALUES (@seq, @event_id, @ts, @type, @workspace_id, @project_id, @phase_id, @task_id, @agent_run_id, @session_ref, @correlation_id, @causation_seq, @fencing_token, @payload, @redacted)`,
    );
    this.selectRange = db.prepare("SELECT * FROM events WHERE seq >= ? AND seq <= ? ORDER BY seq");
    this.selectMax = db.prepare("SELECT COALESCE(MAX(seq), 0) AS m FROM events");
    this.appendTx = db.transaction((e: JournalEvent) => {
      this.insert.run({
        seq: e.seq,
        event_id: e.eventId,
        ts: e.ts,
        type: e.type,
        workspace_id: e.workspaceId ?? null,
        project_id: e.projectId ?? null,
        phase_id: e.phaseId ?? null,
        task_id: e.taskId ?? null,
        agent_run_id: e.agentRunId ?? null,
        session_ref: e.sessionRef ?? null,
        correlation_id: e.correlationId ?? null,
        causation_seq: e.causationSeq ?? null,
        fencing_token: e.fencingToken ?? null,
        payload: JSON.stringify(e.payload),
        redacted: e.redacted,
      });
      applyProjection(db, e);
    });
    this.ensureProjectionsFresh();
  }

  /** 기동 경로: 투영 테이블 부재 또는 cursor < lastSeq → 전체 재구성. */
  private ensureProjectionsFresh(): void {
    const tables = new Set(
      (this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((r) => r.name),
    );
    const need = [...PROJECTORS.map((p) => p.table), "projection_cursor"];
    const missing = need.some((t) => !tables.has(t));
    if (missing) {
      rebuildProjections(this);
      return;
    }
    ensureProjectionTables(this.db);
    const cursors = this.db.prepare("SELECT last_seq FROM projection_cursor").all() as { last_seq: number }[];
    const minCursor = cursors.length === need.length - 1 ? Math.min(...cursors.map((c) => c.last_seq)) : -1;
    if (minCursor !== this.lastSeq()) rebuildProjections(this);
  }

  append(e: NewEvent): JournalEvent {
    const stored = prepareEvent(e, this.lastSeq() + 1, this.now);
    this.appendTx(stored);
    const back = this.read(stored.seq, stored.seq)[0]!;
    this.subs.emit(back);
    return back;
  }

  read(fromSeq: number, toSeq?: number): JournalEvent[] {
    const rows = this.selectRange.all(Math.max(1, fromSeq), toSeq ?? Number.MAX_SAFE_INTEGER) as Row[];
    return rows.map(rowToEvent);
  }

  lastSeq(): number {
    return (this.selectMax.get() as { m: number }).m;
  }

  subscribe(fromSeq: number, cb: (e: JournalEvent) => void): () => void {
    for (const e of this.read(fromSeq)) cb(e);
    return this.subs.add(cb);
  }

  close(): void {
    this.db.close();
  }

  // --- SQLite 전용 ---
  schemaVersion(): number {
    const r = this.db.prepare("SELECT MAX(version) AS v FROM schema_version").get() as { v: number | null };
    return r.v ?? 0;
  }
  pragma(name: string): unknown {
    return this.db.pragma(name, { simple: true });
  }
  /** 테스트·운영 도구용 원시 SQL(저널 자체는 트리거가 보호). */
  rawExec(sql: string): void {
    this.db.exec(sql);
  }
  columns(table: string): string[] {
    return (this.db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
  }
  projections(): ProjectionsApi {
    return {
      query: (table) => this.db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[],
      checksum: () => projectionChecksum(this),
      rebuild: () => rebuildProjections(this),
    };
  }
}

export function openSqliteStore(path: string, now?: () => number): SqliteEventStore {
  return new SqliteEventStore(new Database(path), now);
}
