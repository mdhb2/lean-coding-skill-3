import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface DbError {
  message: string;
}

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export interface BootstrapResult {
  dbPath: string;
  version: number;
  applied: string[];
  created: boolean;
  errors: DbError[];
}

export const SCHEMA_VERSION = 4;
export const STATE_DB_REL = ".lcs3/state.db";

// ponytail: migrations append-only; repair/normalize helpers stay out unless a
// Smart Gate approves the recovery semantics (GATE-04 invariant 6).
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "base-schema-migrations",
    sql: `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );`,
  },
  {
    version: 2,
    name: "runtime-tasks-table",
    sql: `CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      task_status TEXT NOT NULL,
      owner TEXT,
      lease_until INTEGER,
      heartbeat_at INTEGER,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(task_status);`,
  },
  {
    version: 3,
    name: "runtime-task-scopes-table",
    sql: `CREATE TABLE IF NOT EXISTS task_scopes (
      task_id TEXT PRIMARY KEY,
      read_scope TEXT NOT NULL,
      write_scope TEXT NOT NULL,
      expansions TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  },
  {
    version: 4,
    name: "runtime-task-retries-table",
    sql: `CREATE TABLE IF NOT EXISTS task_retries (
      task_id TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL,
      last_category TEXT NOT NULL,
      disposition TEXT NOT NULL,
      hitl INTEGER NOT NULL,
      suggested_next TEXT NOT NULL,
      reason TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
  },
];

export function defaultStateDbPath(projectDir: string): string {
  return join(projectDir, STATE_DB_REL);
}

function userVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  return row.user_version;
}

// Guardrail (SRC-013/SRC-017): bootstrap stores runtime bookkeeping only.
// Canonical requirements live in Markdown+YAML; SQLite must never be their sole location.
export function bootstrapDatabase(dbPath: string): BootstrapResult {
  if (!dbPath) return { dbPath, version: 0, applied: [], created: false, errors: [{ message: "bootstrapDatabase: empty database path" }] };
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
    if (current > SCHEMA_VERSION) {
      return {
        dbPath,
        version: current,
        applied: [],
        created: false,
        errors: [
          {
            message: `database schema version ${current} is newer than runtime SCHEMA_VERSION ${SCHEMA_VERSION} at ${dbPath}; downgrade requires explicit migration, refusing to open`,
          },
        ],
      };
    }
    const created = current === 0;
    const pending = MIGRATIONS.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
    const applied: string[] = [];
    if (pending.length > 0) {
      db.exec("BEGIN");
      try {
        for (const m of pending) {
          db.exec(m.sql);
          db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(
            m.version,
            m.name,
          );
          applied.push(m.name);
        }
        db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
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
          errors: [{ message: `migration failed on ${dbPath}: ${(e as Error).message}` }],
        };
      }
    }
    return { dbPath, version: SCHEMA_VERSION, applied, created, errors: [] };
  } finally {
    db.close();
  }
}
