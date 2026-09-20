import { canTransition, defaultManifestDir, transitionTask } from "./transitions.js";
import { getTask, withTransaction, type TaskRecord } from "./state.js";

// Guardrail (SRC-024): claim/lease lives in the SQLite runtime mirror only
// (owner, lease_until, heartbeat_at). Canonical spec content stays in Markdown.

function requireTaskId(taskId: string): void {
  if (!taskId) throw new Error("claims: task id must be non-empty");
}

function requireOwner(owner: string): void {
  if (!owner) throw new Error("claims: owner must be a non-empty worker id");
}

function requireLeaseSeconds(leaseSeconds: number): void {
  if (typeof leaseSeconds !== "number" || !Number.isInteger(leaseSeconds) || leaseSeconds <= 0) {
    throw new Error("claims: leaseSeconds must be a positive integer (see config execution.lease_seconds)");
  }
}

// Lease math is epoch milliseconds: leaseUntil = nowMs + leaseSeconds * 1000.
// A null lease means "no active lease" and is never expired.
export function isLeaseExpired(record: TaskRecord, nowMs: number = Date.now()): boolean {
  if (record.leaseUntil === null) return false;
  return nowMs > record.leaseUntil;
}

function vanishedGuard(taskId: string, record: TaskRecord | null): TaskRecord {
  if (record === null) throw new Error(`claims: task '${taskId}' vanished mid-operation`);
  return record;
}

/**
 * Atomically claim a `ready` task: ready → claimed + owner + lease.
 * The read-check-write runs inside one BEGIN IMMEDIATE transaction, so two
 * concurrent claimants serialize on the write lock and at most one wins
 * (AC-012); the loser sees the already-owned row and fails.
 */
export function claimTask(
  dbPath: string,
  taskId: string,
  owner: string,
  leaseSeconds: number,
  nowMs: number = Date.now(),
  manifestDir: string = defaultManifestDir(),
): TaskRecord {
  requireTaskId(taskId);
  requireOwner(owner);
  requireLeaseSeconds(leaseSeconds);
  return withTransaction(dbPath, (tx) => {
    const cur = tx.get(taskId);
    if (cur === null) throw new Error(`claims: unknown task '${taskId}'; create it first with createTask`);
    if (!canTransition(manifestDir, cur.taskStatus, "claimed")) {
      if (
        (cur.taskStatus === "claimed" || cur.taskStatus === "in_progress") &&
        !isLeaseExpired(cur, nowMs)
      ) {
        throw new Error(
          `claims: task '${taskId}' already owned by '${cur.owner}' with a live lease until ${cur.leaseUntil}; reclaim only after expiry`,
        );
      }
      throw new Error(
        `claims: task '${taskId}' in status '${cur.taskStatus}' cannot be claimed; only 'ready' tasks are claimable`,
      );
    }
    tx.put({ ...cur, taskStatus: "claimed", owner, leaseUntil: nowMs + leaseSeconds * 1000, heartbeatAt: nowMs });
    return vanishedGuard(taskId, tx.get(taskId));
  });
}

/**
 * Heartbeat: extend a live lease. Only the current owner may renew, and only
 * while the lease is still live — a stale owner (ownership moved on) or an
 * expired lease fails instead of silently stealing the task.
 */
export function renewLease(
  dbPath: string,
  taskId: string,
  owner: string,
  leaseSeconds: number,
  nowMs: number = Date.now(),
): TaskRecord {
  requireTaskId(taskId);
  requireOwner(owner);
  requireLeaseSeconds(leaseSeconds);
  return withTransaction(dbPath, (tx) => {
    const cur = tx.get(taskId);
    if (cur === null) throw new Error(`claims: unknown task '${taskId}'; create it first with createTask`);
    if (cur.owner !== owner) {
      throw new Error(
        `claims: stale owner '${owner}' cannot renew task '${taskId}' owned by '${cur.owner}'`,
      );
    }
    if (cur.taskStatus !== "claimed" && cur.taskStatus !== "in_progress") {
      throw new Error(
        `claims: task '${taskId}' in status '${cur.taskStatus}' holds no renewable lease`,
      );
    }
    if (isLeaseExpired(cur, nowMs)) {
      throw new Error(
        `claims: lease for task '${taskId}' expired at ${cur.leaseUntil}; reclaim it instead of renewing`,
      );
    }
    tx.put({ ...cur, leaseUntil: nowMs + leaseSeconds * 1000, heartbeatAt: nowMs });
    return vanishedGuard(taskId, tx.get(taskId));
  });
}

/**
 * Detect an expired lease and move claimed/in_progress → expired via the
 * canonical machine edge (AC-013 detectable). A live lease refuses to expire.
 */
export function expireTask(
  dbPath: string,
  taskId: string,
  nowMs: number = Date.now(),
  manifestDir: string = defaultManifestDir(),
): TaskRecord {
  requireTaskId(taskId);
  const cur = getTask(dbPath, taskId);
  if (cur === null) throw new Error(`claims: unknown task '${taskId}'; create it first with createTask`);
  if (cur.taskStatus === "expired") return cur;
  if (cur.taskStatus !== "claimed" && cur.taskStatus !== "in_progress") {
    throw new Error(`claims: task '${taskId}' in status '${cur.taskStatus}' has no expirable lease`);
  }
  if (!isLeaseExpired(cur, nowMs)) {
    throw new Error(
      `claims: task '${taskId}' lease is still live until ${cur.leaseUntil}; cannot expire a live lease`,
    );
  }
  return transitionTask(dbPath, taskId, "expired", manifestDir);
}

/**
 * Atomically reclaim a task whose lease expired (AC-013 recoverable): the
 * rotation claimed/in_progress → expired → ready → claimed must exist as
 * canonical GATE-03 edges, and the final row lands claimed by the new owner
 * with a fresh lease — all in one transaction.
 */
export function reclaimTask(
  dbPath: string,
  taskId: string,
  newOwner: string,
  leaseSeconds: number,
  nowMs: number = Date.now(),
  manifestDir: string = defaultManifestDir(),
): TaskRecord {
  requireTaskId(taskId);
  requireOwner(newOwner);
  requireLeaseSeconds(leaseSeconds);
  return withTransaction(dbPath, (tx) => {
    const cur = tx.get(taskId);
    if (cur === null) throw new Error(`claims: unknown task '${taskId}'; create it first with createTask`);
    if (cur.taskStatus !== "claimed" && cur.taskStatus !== "in_progress" && cur.taskStatus !== "expired") {
      throw new Error(
        `claims: task '${taskId}' in status '${cur.taskStatus}' holds no lease to reclaim`,
      );
    }
    if (!isLeaseExpired(cur, nowMs)) {
      throw new Error(
        `claims: task '${taskId}' lease still live until ${cur.leaseUntil}; reclaim only after expiry`,
      );
    }
    const steps: Array<[string, string]> =
      cur.taskStatus === "expired"
        ? [["expired", "ready"], ["ready", "claimed"]]
        : [[cur.taskStatus, "expired"], ["expired", "ready"], ["ready", "claimed"]];
    for (const [from, to] of steps) {
      if (!canTransition(manifestDir, from, to)) {
        throw new Error(`claims: canonical machine lacks '${from}' → '${to}'; cannot reclaim without that GATE-03 edge`);
      }
    }
    tx.put({
      ...cur,
      taskStatus: "claimed",
      owner: newOwner,
      leaseUntil: nowMs + leaseSeconds * 1000,
      heartbeatAt: nowMs,
    });
    return vanishedGuard(taskId, tx.get(taskId));
  });
}
