// Dependency resolver (L3-018): normalize task IDs and block execution when
// prerequisites are incomplete/invalid (FR-023, SRC-025, AC-024/AC-025).
//
// Reads the SQLite runtime mirror only (task_status per task). Canonical
// dependency declarations live in task artifact frontmatter (`blocked_by`);
// this module never parses Markdown — the caller passes the declared list.
//
// ponytail: direct-dependency checks only; transitive cycle detection waits
// for a stored dependency graph + approved design (spec: "if approved by
// design" — no such approval exists yet). Self-dependency is rejected as a
// degenerate cycle.
import { getTask } from "./state.js";

export interface DependencyCheck {
  taskId: string;
  dependencies: string[];
  blockedBy: string[];
  ready: boolean;
}

/** Trim + uppercase; rejects empty / non-string / internal whitespace. */
export function normalizeTaskId(id: string): string {
  if (typeof id !== "string") throw new Error("dependencies: task id must be a string");
  const normalized = id.trim().toUpperCase();
  if (!normalized) throw new Error("dependencies: task id must be non-empty");
  if (/\s/.test(normalized)) {
    throw new Error(`dependencies: task id '${id}' contains whitespace after trimming`);
  }
  return normalized;
}

function normalizeDepList(raw: string[], taskId: string): string[] {
  if (!Array.isArray(raw)) throw new Error(`dependencies: blocked_by for '${taskId}' must be a list`);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const dep of raw) {
    const n = normalizeTaskId(dep);
    if (n === taskId) {
      throw new Error(`dependencies: task '${taskId}' cannot depend on itself`);
    }
    if (seen.has(n)) {
      throw new Error(`dependencies: duplicate dependency '${n}' for task '${taskId}'`);
    }
    seen.add(n);
    out.push(n);
  }
  return out;
}

/**
 * Check a task's prerequisites against runtime statuses.
 * Unknown dependency → throw (AC-025). Incomplete (status !== done) → listed
 * in blockedBy, ready=false (AC-024). All done (or no deps) → ready=true.
 */
export function checkDependencies(
  dbPath: string,
  taskId: string,
  rawDeps: string[],
): DependencyCheck {
  const id = normalizeTaskId(taskId);
  const self = getTask(dbPath, id);
  if (self === null) {
    throw new Error(`dependencies: unknown task '${id}'; create it first with createTask`);
  }
  const dependencies = normalizeDepList(rawDeps, id);
  const blockedBy: string[] = [];
  for (const dep of dependencies) {
    const row = getTask(dbPath, dep);
    if (row === null) {
      throw new Error(`dependencies: unknown dependency '${dep}' for task '${id}'`);
    }
    if (row.taskStatus !== "done") blockedBy.push(dep);
  }
  return { taskId: id, dependencies, blockedBy, ready: blockedBy.length === 0 };
}

/** Throw with actionable error when prerequisites are incomplete. */
export function assertDependenciesReady(
  dbPath: string,
  taskId: string,
  rawDeps: string[],
): DependencyCheck {
  const check = checkDependencies(dbPath, taskId, rawDeps);
  if (!check.ready) {
    const details = check.blockedBy
      .map((dep) => {
        const row = getTask(dbPath, dep);
        const status = row === null ? "unknown" : row.taskStatus;
        return `'${dep}' (status '${status}')`;
      })
      .join(", ");
    throw new Error(
      `dependencies: task '${check.taskId}' blocked by incomplete dependencies: ${details}; finish them to 'done' first`,
    );
  }
  return check;
}
