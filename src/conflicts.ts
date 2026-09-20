// Conflict + write-scope resolver (L3-019): detect parallel write conflicts and
// record declared scope expansion (FR-020/021/024, SRC-025..027, AC-026/027).
//
// Declared scopes live in canonical task artifact frontmatter (`scope.read`,
// `scope.write` per tasks.yaml `scope_fields`); this module never parses
// Markdown — the caller passes the declared lists, which are mirrored into the
// SQLite runtime table `task_scopes`. Only write-vs-write overlap conflicts;
// read-only overlap never does. Conflict graph is separate from the dependency
// graph (FR-024): dependencies block on incomplete prerequisites, conflicts
// block on overlapping parallel writes.
//
// ponytail: path overlap is exact-match + directory-prefix containment only;
// glob/negation patterns wait for an approved design.
import { DatabaseSync } from "node:sqlite";
import { bootstrapDatabase } from "./db.js";
import { getTask, listTasks } from "./state.js";

export interface ScopeExpansion {
  path: string;
  recordedAt: string;
}

export interface TaskScope {
  taskId: string;
  read: string[];
  write: string[];
  expansions: ScopeExpansion[];
}

export interface ScopeConflict {
  otherTaskId: string;
  overlappingPaths: string[];
}

export interface ConflictCheck {
  taskId: string;
  writeScope: string[];
  conflicts: ScopeConflict[];
  hasConflict: boolean;
}

const TERMINAL_STATUSES = new Set(["done", "cancelled"]);

function openDb(dbPath: string): DatabaseSync {
  if (!dbPath) throw new Error("conflicts: empty database path");
  const res = bootstrapDatabase(dbPath);
  if (res.errors.length > 0) {
    throw new Error(`conflicts: cannot open runtime database at ${dbPath}: ${res.errors[0].message}`);
  }
  try {
    return new DatabaseSync(dbPath);
  } catch (e) {
    throw new Error(`conflicts: cannot open SQLite database at ${dbPath}: ${(e as Error).message}`);
  }
}

interface ScopeRow {
  task_id: string;
  read_scope: string;
  write_scope: string;
  expansions: string;
}

/** Trim + strip leading ./ + trailing slashes; rejects empty / non-string. */
export function normalizeScopePath(path: string): string {
  if (typeof path !== "string") throw new Error("conflicts: scope path must be a string");
  let n = path.trim();
  if (!n) throw new Error("conflicts: scope path must be non-empty");
  if (n.startsWith("./")) n = n.slice(2);
  while (n.length > 1 && n.endsWith("/")) n = n.slice(0, -1);
  if (!n) throw new Error("conflicts: scope path must be non-empty");
  return n;
}

function normalizeScopeList(raw: unknown, field: string, taskId: string): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new Error(`conflicts: scope '${field}' for task '${taskId}' must be a list`);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of raw) {
    const n = normalizeScopePath(p as string);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

function mapRow(row: ScopeRow): TaskScope {
  return {
    taskId: row.task_id,
    read: JSON.parse(row.read_scope) as string[],
    write: JSON.parse(row.write_scope) as string[],
    expansions: JSON.parse(row.expansions) as ScopeExpansion[],
  };
}

/** Effective write scope = declared write + recorded expansions. */
function effectiveWrite(scope: TaskScope): string[] {
  const out = [...scope.write];
  const seen = new Set(out);
  for (const e of scope.expansions) {
    if (!seen.has(e.path)) {
      seen.add(e.path);
      out.push(e.path);
    }
  }
  return out;
}

/** Exact match or directory-prefix containment in either direction. */
function pathsOverlap(a: string, b: string): boolean {
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

/** Register (or replace) a task's declared read/write scopes in the runtime mirror. */
export function setTaskScope(
  dbPath: string,
  taskId: string,
  scope: { read?: string[]; write?: string[] },
): TaskScope {
  if (!taskId) throw new Error("conflicts: task id must be non-empty");
  if (getTask(dbPath, taskId) === null) {
    throw new Error(`conflicts: unknown task '${taskId}'; create it first with createTask`);
  }
  const read = normalizeScopeList(scope.read, "read", taskId);
  const write = normalizeScopeList(scope.write, "write", taskId);
  const db = openDb(dbPath);
  try {
    db.prepare(
      `INSERT INTO task_scopes (task_id, read_scope, write_scope, expansions, updated_at)
       VALUES (?, ?, ?, '[]', datetime('now'))
       ON CONFLICT(task_id) DO UPDATE SET
         read_scope = excluded.read_scope,
         write_scope = excluded.write_scope,
         updated_at = datetime('now')`,
    ).run(taskId, JSON.stringify(read), JSON.stringify(write));
  } finally {
    db.close();
  }
  const stored = getTaskScope(dbPath, taskId);
  if (stored === null) throw new Error(`conflicts: failed to store scope for task '${taskId}'`);
  return stored;
}

export function getTaskScope(dbPath: string, taskId: string): TaskScope | null {
  const db = openDb(dbPath);
  try {
    const row = db.prepare("SELECT * FROM task_scopes WHERE task_id = ?").get(taskId) as
      | ScopeRow
      | undefined;
    return row === undefined ? null : mapRow(row);
  } finally {
    db.close();
  }
}

/**
 * Check a task's effective write scope against every other non-terminal task.
 * Terminal (done/cancelled) tasks are history, not parallel writers. Read
 * scopes never participate — only write-vs-write overlap conflicts (AC-026).
 */
export function checkConflicts(dbPath: string, taskId: string): ConflictCheck {
  if (!taskId) throw new Error("conflicts: task id must be non-empty");
  if (getTask(dbPath, taskId) === null) {
    throw new Error(`conflicts: unknown task '${taskId}'; create it first with createTask`);
  }
  const self = getTaskScope(dbPath, taskId);
  const mine = self === null ? [] : effectiveWrite(self);
  const conflicts: ScopeConflict[] = [];
  for (const other of listTasks(dbPath)) {
    if (other.taskId === taskId || TERMINAL_STATUSES.has(other.taskStatus)) continue;
    const otherScope = getTaskScope(dbPath, other.taskId);
    if (otherScope === null) continue;
    const overlapping = mine.filter((p) => effectiveWrite(otherScope).some((q) => pathsOverlap(p, q)));
    if (overlapping.length > 0) {
      conflicts.push({ otherTaskId: other.taskId, overlappingPaths: overlapping });
    }
  }
  return { taskId, writeScope: mine, conflicts, hasConflict: conflicts.length > 0 };
}

/** Throw with actionable error when a parallel write conflict is active. */
export function assertNoConflicts(dbPath: string, taskId: string): ConflictCheck {
  const check = checkConflicts(dbPath, taskId);
  if (check.hasConflict) {
    const details = check.conflicts
      .map((c) => `'${c.otherTaskId}' on ${c.overlappingPaths.map((p) => `'${p}'`).join(", ")}`)
      .join("; ");
    throw new Error(
      `conflicts: task '${taskId}' write-conflicts with ${details}; reslice scopes or sequence execution`,
    );
  }
  return check;
}

/**
 * Record write-scope expansion (AC-027): paths beyond the declared write scope
 * (plus prior expansions) are appended as an explicit runtime record with a
 * timestamp. Paths already covered — exact or under a declared directory —
 * are no-ops, not expansions.
 */
export function recordExpansion(dbPath: string, taskId: string, paths: string[]): TaskScope {
  if (!taskId) throw new Error("conflicts: task id must be non-empty");
  if (getTask(dbPath, taskId) === null) {
    throw new Error(`conflicts: unknown task '${taskId}'; create it first with createTask`);
  }
  if (!Array.isArray(paths)) {
    throw new Error(`conflicts: expansion paths for task '${taskId}' must be a list`);
  }
  const db = openDb(dbPath);
  try {
    const row = db.prepare("SELECT * FROM task_scopes WHERE task_id = ?").get(taskId) as
      | ScopeRow
      | undefined;
    if (row === undefined) {
      throw new Error(`conflicts: no declared scope for task '${taskId}'; call setTaskScope first`);
    }
    const scope = mapRow(row);
    const covered = effectiveWrite(scope);
    const fresh: string[] = [];
    const seen = new Set<string>();
    for (const p of paths) {
      const n = normalizeScopePath(p);
      if (seen.has(n)) continue;
      seen.add(n);
      if (!covered.some((e) => n === e || n.startsWith(`${e}/`))) fresh.push(n);
    }
    if (fresh.length === 0) return scope;
    const now = new Date().toISOString();
    const expansions = [...scope.expansions, ...fresh.map((path) => ({ path, recordedAt: now }))];
    db.prepare(
      "UPDATE task_scopes SET expansions = ?, updated_at = datetime('now') WHERE task_id = ?",
    ).run(JSON.stringify(expansions), taskId);
    return { ...scope, expansions };
  } finally {
    db.close();
  }
}
