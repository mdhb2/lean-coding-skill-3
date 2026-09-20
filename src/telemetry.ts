import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { BootstrapResult } from "./db.js";

// L3-045: local operational telemetry (SRC-057). Append-only event log used
// to understand context size, retries, tool usage, failure patterns, and
// execution results. Guardrail (SRC-058, AC-051): this module only ever
// touches its own SQLite file under .lcs3/telemetry/ — it has no code path
// that can write to manifests, skills, schemas, or framework rules.
// Storage: .lcs3/telemetry/telemetry.db (runtime).

export const TELEMETRY_SCHEMA_VERSION = 1;
export const TELEMETRY_DB_REL = ".lcs3/telemetry/telemetry.db";

// Default cap for list queries so telemetry reads stay bounded (goal:
// bounded overhead). Callers may pass a smaller limit; larger values are
// clamped to this cap.
export const TELEMETRY_LIST_LIMIT_DEFAULT = 500;

export type TelemetryResult = "pass" | "fail";

export interface TelemetryEvent {
  id: number;
  workflow: string;
  task: string;
  result: TelemetryResult;
  retries: number;
  failureType: string | null;
  contextSize: number | null;
  toolCalls: number;
  filesRead: number;
  filesWritten: number;
  recordedAt: number;
}

export interface RecordTelemetryInput {
  workflow: string;
  task: string;
  result: TelemetryResult;
  retries?: number;
  failureType?: string | null;
  contextSize?: number | null;
  toolCalls?: number;
  filesRead?: number;
  filesWritten?: number;
  nowMs?: number;
  // Disabled mode: when false, recordTelemetry is a no-op returning null
  // and never touches the filesystem. Defaults to true.
  enabled?: boolean;
}

export interface ListTelemetryOptions {
  workflow?: string;
  task?: string;
  limit?: number;
}

const TELEMETRY_MIGRATION_V1 = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS telemetry_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow TEXT NOT NULL,
  task TEXT NOT NULL,
  result TEXT NOT NULL,
  retries INTEGER NOT NULL,
  failure_type TEXT,
  context_size INTEGER,
  tool_calls INTEGER NOT NULL,
  files_read INTEGER NOT NULL,
  files_written INTEGER NOT NULL,
  recorded_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflow ON telemetry_events(workflow);
CREATE INDEX IF NOT EXISTS idx_telemetry_task ON telemetry_events(task);`;

export function defaultTelemetryDbPath(projectDir: string): string {
  return join(projectDir, TELEMETRY_DB_REL);
}

function userVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  return row.user_version;
}

export function bootstrapTelemetryDatabase(dbPath: string): BootstrapResult {
  if (!dbPath) return { dbPath, version: 0, applied: [], created: false, errors: [{ message: "bootstrapTelemetryDatabase: empty database path" }] };
  try {
    mkdirSync(dirname(dbPath), { recursive: true });
  } catch (e) {
    return { dbPath, version: 0, applied: [], created: false, errors: [{ message: `cannot create directory for ${dbPath}: ${(e as Error).message}` }] };
  }
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(dbPath);
  } catch (e) {
    return { dbPath, version: 0, applied: [], created: false, errors: [{ message: `cannot open SQLite database at ${dbPath}: ${(e as Error).message}` }] };
  }
  try {
    const current = userVersion(db);
    if (current > TELEMETRY_SCHEMA_VERSION) {
      return {
        dbPath,
        version: current,
        applied: [],
        created: false,
        errors: [
          {
            message: `telemetry database schema version ${current} is newer than runtime TELEMETRY_SCHEMA_VERSION ${TELEMETRY_SCHEMA_VERSION} at ${dbPath}; downgrade requires explicit migration, refusing to open`,
          },
        ],
      };
    }
    const created = current === 0;
    const applied: string[] = [];
    if (current < TELEMETRY_SCHEMA_VERSION) {
      db.exec("BEGIN");
      try {
        db.exec(TELEMETRY_MIGRATION_V1);
        db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(
          TELEMETRY_SCHEMA_VERSION,
          "telemetry-events-table",
        );
        applied.push("telemetry-events-table");
        db.exec(`PRAGMA user_version = ${TELEMETRY_SCHEMA_VERSION}`);
        db.exec("COMMIT");
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // Rollback best-effort; report the original failure below.
        }
        return {
          dbPath,
          version: userVersion(db),
          applied: [],
          created,
          errors: [{ message: `telemetry migration failed on ${dbPath}: ${(e as Error).message}` }],
        };
      }
    }
    return { dbPath, version: TELEMETRY_SCHEMA_VERSION, applied, created, errors: [] };
  } finally {
    db.close();
  }
}

interface TelemetryRow {
  event_id: number;
  workflow: string;
  task: string;
  result: string;
  retries: number;
  failure_type: string | null;
  context_size: number | null;
  tool_calls: number;
  files_read: number;
  files_written: number;
  recorded_at: number;
}

function toEvent(row: TelemetryRow): TelemetryEvent {
  return {
    id: row.event_id,
    workflow: row.workflow,
    task: row.task,
    result: row.result as TelemetryResult,
    retries: row.retries,
    failureType: row.failure_type,
    contextSize: row.context_size,
    toolCalls: row.tool_calls,
    filesRead: row.files_read,
    filesWritten: row.files_written,
    recordedAt: row.recorded_at,
  };
}

function nonNegativeInt(value: number | undefined, field: string): string | null {
  if (value === undefined) return null;
  if (!Number.isInteger(value) || value < 0) return `recordTelemetry: ${field} must be a non-negative integer`;
  return null;
}

function validateRecordInput(input: RecordTelemetryInput): string | null {
  if (!input.workflow || input.workflow.trim().length === 0) return "recordTelemetry: workflow must not be empty";
  if (!input.task || input.task.trim().length === 0) return "recordTelemetry: task must not be empty";
  if (input.result !== "pass" && input.result !== "fail") return "recordTelemetry: result must be 'pass' or 'fail'";
  for (const [field, value] of [
    ["retries", input.retries],
    ["toolCalls", input.toolCalls],
    ["filesRead", input.filesRead],
    ["filesWritten", input.filesWritten],
  ] as const) {
    const problem = nonNegativeInt(value, field);
    if (problem) return problem;
  }
  if (input.contextSize !== undefined && input.contextSize !== null) {
    if (!Number.isFinite(input.contextSize) || input.contextSize < 0) {
      return "recordTelemetry: contextSize must be a non-negative number";
    }
  }
  return null;
}

// Record one execution event (AC-050). Returns null without touching the
// filesystem when enabled is false (disabled mode works cleanly). Throws on
// invalid input; never writes outside dbPath (SRC-058).
export function recordTelemetry(dbPath: string, input: RecordTelemetryInput): TelemetryEvent | null {
  if (input.enabled === false) return null;
  const invalid = validateRecordInput(input);
  if (invalid) throw new Error(invalid);
  const db = new DatabaseSync(dbPath);
  try {
    const eventId = db.prepare(
      `INSERT INTO telemetry_events
         (workflow, task, result, retries, failure_type, context_size, tool_calls, files_read, files_written, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.workflow,
      input.task,
      input.result,
      input.retries ?? 0,
      input.failureType ?? null,
      input.contextSize ?? null,
      input.toolCalls ?? 0,
      input.filesRead ?? 0,
      input.filesWritten ?? 0,
      input.nowMs ?? Date.now(),
    ) as unknown as { lastInsertRowid: number | bigint };
    const row = db.prepare("SELECT * FROM telemetry_events WHERE event_id = ?").get(
      Number(eventId.lastInsertRowid),
    ) as unknown as TelemetryRow;
    return toEvent(row);
  } finally {
    db.close();
  }
}

export function listTelemetry(dbPath: string, options: ListTelemetryOptions = {}): TelemetryEvent[] {
  const limit = Math.min(
    Math.max(1, options.limit ?? TELEMETRY_LIST_LIMIT_DEFAULT),
    TELEMETRY_LIST_LIMIT_DEFAULT,
  );
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (options.workflow !== undefined) {
    conditions.push("workflow = ?");
    params.push(options.workflow);
  }
  if (options.task !== undefined) {
    conditions.push("task = ?");
    params.push(options.task);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const db = new DatabaseSync(dbPath);
  try {
    const rows = db.prepare(
      `SELECT * FROM telemetry_events ${where} ORDER BY event_id LIMIT ?`,
    ).all(...params, limit) as unknown as TelemetryRow[];
    return rows.map(toEvent);
  } finally {
    db.close();
  }
}
