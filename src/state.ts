import { DatabaseSync } from "node:sqlite";
import { bootstrapDatabase } from "./db.js";

export interface TaskRecord {
  taskId: string;
  taskStatus: string;
  owner: string | null;
  leaseUntil: number | null;
  heartbeatAt: number | null;
  updatedAt: string;
}

export interface StateTx {
  get(taskId: string): TaskRecord | null;
  put(record: TaskRecord): void;
}

interface TaskRow {
  task_id: string;
  task_status: string;
  owner: string | null;
  lease_until: number | null;
  heartbeat_at: number | null;
  updated_at: string;
}

function mapRow(row: TaskRow): TaskRecord {
  return {
    taskId: row.task_id,
    taskStatus: row.task_status,
    owner: row.owner,
    leaseUntil: row.lease_until,
    heartbeatAt: row.heartbeat_at,
    updatedAt: row.updated_at,
  };
}

function checkedBootstrapped(dbPath: string): void {
  if (!dbPath) throw new Error("state: empty database path");
  const res = bootstrapDatabase(dbPath);
  if (res.errors.length > 0) throw new Error(`state: cannot open runtime database at ${dbPath}: ${res.errors[0].message}`);
}

function openDb(dbPath: string): DatabaseSync {
  try {
    return new DatabaseSync(dbPath);
  } catch (e) {
    throw new Error(`state: cannot open SQLite database at ${dbPath}: ${(e as Error).message}`);
  }
}

function validateRecord(r: TaskRecord): void {
  if (!r.taskId) throw new Error("state: putTask requires a non-empty task id");
  if (!r.taskStatus) throw new Error(`state: putTask requires a non-empty task status for ${r.taskId}`);
  for (const [k, v] of [
    ["leaseUntil", r.leaseUntil],
    ["heartbeatAt", r.heartbeatAt],
  ] as const) {
    if (v !== null && (typeof v !== "number" || !Number.isFinite(v))) {
      throw new Error(`state: putTask ${r.taskId} has non-numeric ${k}`);
    }
  }
}

const PUT_SQL = `INSERT INTO tasks (task_id, task_status, owner, lease_until, heartbeat_at, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(task_id) DO UPDATE SET
    task_status = excluded.task_status,
    owner = excluded.owner,
    lease_until = excluded.lease_until,
    heartbeat_at = excluded.heartbeat_at,
    updated_at = datetime('now')`;

function putOn(db: DatabaseSync, r: TaskRecord): void {
  validateRecord(r);
  db.prepare(PUT_SQL).run(r.taskId, r.taskStatus, r.owner, r.leaseUntil, r.heartbeatAt);
}

function getOn(db: DatabaseSync, taskId: string): TaskRecord | null {
  const row = db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId) as TaskRow | undefined;
  return row === undefined ? null : mapRow(row);
}

// Guardrail (SRC-013/SRC-017): repository stores the runtime mirror only
// (task_status, owner, lease, heartbeat). Canonical spec content stays in Markdown.
export function getTask(dbPath: string, taskId: string): TaskRecord | null {
  checkedBootstrapped(dbPath);
  const db = openDb(dbPath);
  try {
    return getOn(db, taskId);
  } finally {
    db.close();
  }
}

export function putTask(dbPath: string, record: TaskRecord): void {
  checkedBootstrapped(dbPath);
  const db = openDb(dbPath);
  try {
    putOn(db, record);
  } finally {
    db.close();
  }
}

export function listTasks(dbPath: string): TaskRecord[] {
  checkedBootstrapped(dbPath);
  const db = openDb(dbPath);
  try {
    return (db.prepare("SELECT * FROM tasks ORDER BY task_id").all() as unknown as TaskRow[]).map(mapRow);
  } finally {
    db.close();
  }
}

export function withTransaction<T>(dbPath: string, fn: (tx: StateTx) => T): T {
  checkedBootstrapped(dbPath);
  const db = openDb(dbPath);
  db.exec("BEGIN IMMEDIATE");
  let committed = false;
  try {
    const result = fn({ get: (id) => getOn(db, id), put: (r) => putOn(db, r) });
    db.exec("COMMIT");
    committed = true;
    return result;
  } finally {
    if (!committed) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // Rollback best-effort; the original error below is what matters.
      }
    }
    db.close();
  }
}
