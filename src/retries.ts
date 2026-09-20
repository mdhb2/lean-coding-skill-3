// Failure taxonomy + bounded retry state (L3-021): persist per-task retry
// attempts and route approved failure categories (FR-031/032, SRC-021..023,
// AC-020..023).
//
// Routing (lifecycle-contract-proposal §5/§7):
// - implementation, test_instability → bounded self-correct ("retry") while
//   attempts <= execution.max_retries; exhaustion escalates (AC-020/021).
// - specification, credentials, human_decision → escalate immediately, never
//   loop as implementation retry; HITL gate (AC-022/023).
// - environment, external_dependency, repository_conflict → escalate to
//   `blocked` (external condition: not a human gate, not an impl retry).
//
// Guardrail: this module never transitions task_status itself — it persists
// the retry record and returns a disposition. Staying in `in_progress` for
// another attempt or moving to `blocked` is the caller's job via
// transitionTask, so illegal edges stay rejected by the canonical machine.
// The approved category list always comes from the caller's ExecutionPolicy
// (loaded from .lcs3/config.yaml) — never a private copy (FR-011).
import { DatabaseSync } from "node:sqlite";
import { bootstrapDatabase } from "./db.js";
import { getTask } from "./state.js";
import type { ExecutionPolicy } from "./config.js";

export type FailureDisposition = "retry" | "escalate";

export interface FailureRoute {
  category: string;
  attempts: number;
  attemptsLeft: number;
  disposition: FailureDisposition;
  hitl: boolean;
  suggestedNext: "stay" | "blocked";
  reason: string;
}

export interface RetryState extends FailureRoute {
  taskId: string;
}

// AC-022: these never loop as implementation retry — escalate on first sight.
const NEVER_RETRY = new Set(["specification", "credentials", "human_decision"]);
// External conditions route to `blocked`: no impl-retry budget consumed
// conceptually, no human gate — the task waits on the outside world.
const BLOCKING = new Set(["environment", "external_dependency", "repository_conflict"]);
// AC-020: only these consume the bounded self-correction budget.
const RETRYABLE = new Set(["implementation", "test_instability"]);

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function checkPolicy(execution: ExecutionPolicy): void {
  if (typeof execution !== "object" || execution === null) {
    throw new Error("retries: execution policy must be an object with max_retries and failure_taxonomy");
  }
  if (!isPositiveInt(execution.max_retries)) {
    throw new Error("retries: execution.max_retries must be a positive integer (FR-031 bounded retry)");
  }
  if (
    !Array.isArray(execution.failure_taxonomy) ||
    execution.failure_taxonomy.length === 0 ||
    !execution.failure_taxonomy.every((f) => typeof f === "string")
  ) {
    throw new Error("retries: execution.failure_taxonomy must be a non-empty string list (FR-032)");
  }
}

function checkCategory(category: string, execution: ExecutionPolicy): void {
  if (!category) throw new Error("retries: failure category must be non-empty");
  if (!execution.failure_taxonomy.includes(category)) {
    throw new Error(
      `retries: unknown failure category '${category}'; approved taxonomy: ${execution.failure_taxonomy.join(", ")}`,
    );
  }
}

function openDb(dbPath: string): DatabaseSync {
  if (!dbPath) throw new Error("retries: empty database path");
  const res = bootstrapDatabase(dbPath);
  if (res.errors.length > 0) {
    throw new Error(`retries: cannot open runtime database at ${dbPath}: ${res.errors[0].message}`);
  }
  try {
    return new DatabaseSync(dbPath);
  } catch (e) {
    throw new Error(`retries: cannot open SQLite database at ${dbPath}: ${(e as Error).message}`);
  }
}

interface RetryRow {
  task_id: string;
  attempts: number;
  last_category: string;
  disposition: FailureDisposition;
  hitl: number;
  suggested_next: "stay" | "blocked";
  reason: string;
}

function mapRow(row: RetryRow): RetryState {
  return {
    taskId: row.task_id,
    category: row.last_category,
    attempts: row.attempts,
    attemptsLeft: 0, // recomputed by callers with live policy; stored rows keep history only
    disposition: row.disposition,
    hitl: row.hitl === 1,
    suggestedNext: row.suggested_next,
    reason: row.reason,
  };
}

/**
 * Pure routing: map (category, attempts) to a disposition under the policy.
 * No IO, no state mutation — deterministic for the same inputs (AC-021).
 */
export function classifyFailure(
  category: string,
  attempts: number,
  execution: ExecutionPolicy,
): FailureRoute {
  checkPolicy(execution);
  checkCategory(category, execution);
  if (!isPositiveInt(attempts)) {
    throw new Error("retries: attempts must be a positive integer failure count");
  }
  const attemptsLeft = Math.max(0, execution.max_retries - attempts);
  if (NEVER_RETRY.has(category)) {
    return {
      category,
      attempts,
      attemptsLeft,
      disposition: "escalate",
      hitl: true,
      suggestedNext: "blocked",
      reason: `'${category}' is never an implementation retry (AC-022); escalate to a human gate instead of looping`,
    };
  }
  if (BLOCKING.has(category)) {
    return {
      category,
      attempts,
      attemptsLeft,
      disposition: "escalate",
      hitl: false,
      suggestedNext: "blocked",
      reason: `'${category}' is an external condition, not an implementation error; route to blocked, not the retry budget`,
    };
  }
  if (RETRYABLE.has(category)) {
    if (attempts <= execution.max_retries) {
      return {
        category,
        attempts,
        attemptsLeft,
        disposition: "retry",
        hitl: false,
        suggestedNext: "stay",
        reason: `recoverable '${category}' failure, attempt ${attempts} of ${execution.max_retries} (AC-020)`,
      };
    }
    return {
      category,
      attempts,
      attemptsLeft: 0,
      disposition: "escalate",
      hitl: true,
      suggestedNext: "blocked",
      reason: `retry budget exhausted: attempt ${attempts} exceeds max_retries ${execution.max_retries}; escalate rather than loop (AC-021)`,
    };
  }
  // Defensive: config validation (subset of the 8 approved) makes this
  // unreachable, but an unknown routing must escalate, never silently retry.
  return {
    category,
    attempts,
    attemptsLeft,
    disposition: "escalate",
    hitl: true,
    suggestedNext: "blocked",
    reason: `'${category}' has no approved retry routing; escalate rather than guess`,
  };
}

/**
 * Record one failure for a task: increment its attempt counter, persist the
 * routed disposition, and return the new state. Unknown tasks and unknown
 * categories fail instead of creating phantom rows.
 */
export function recordFailure(
  dbPath: string,
  taskId: string,
  category: string,
  execution: ExecutionPolicy,
): RetryState {
  if (!taskId) throw new Error("retries: task id must be non-empty");
  checkPolicy(execution);
  checkCategory(category, execution);
  if (getTask(dbPath, taskId) === null) {
    throw new Error(`retries: unknown task '${taskId}'; create it first with createTask`);
  }
  const db = openDb(dbPath);
  try {
    const prev = db.prepare("SELECT * FROM task_retries WHERE task_id = ?").get(taskId) as
      | RetryRow
      | undefined;
    const attempts = (prev?.attempts ?? 0) + 1;
    const route = classifyFailure(category, attempts, execution);
    db.prepare(
      `INSERT INTO task_retries (task_id, attempts, last_category, disposition, hitl, suggested_next, reason, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(task_id) DO UPDATE SET
         attempts = excluded.attempts,
         last_category = excluded.last_category,
         disposition = excluded.disposition,
         hitl = excluded.hitl,
         suggested_next = excluded.suggested_next,
         reason = excluded.reason,
         updated_at = datetime('now')`,
    ).run(taskId, attempts, category, route.disposition, route.hitl ? 1 : 0, route.suggestedNext, route.reason);
    return { ...route, taskId };
  } finally {
    db.close();
  }
}

/** Read the persisted retry state, or null before the first recorded failure. */
export function getRetryState(dbPath: string, taskId: string): RetryState | null {
  if (!taskId) throw new Error("retries: task id must be non-empty");
  const db = openDb(dbPath);
  try {
    const row = db.prepare("SELECT * FROM task_retries WHERE task_id = ?").get(taskId) as
      | RetryRow
      | undefined;
    return row === undefined ? null : mapRow(row);
  } finally {
    db.close();
  }
}
