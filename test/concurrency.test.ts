import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { createTask, transitionTask } from "../src/transitions.js";
import { claimTask, reclaimTask, renewLease } from "../src/claims.js";
import { getTask, listTasks } from "../src/state.js";
import { assertDependenciesReady, checkDependencies } from "../src/dependencies.js";
import {
  assertNoConflicts,
  checkConflicts,
  recordExpansion,
  setTaskScope,
} from "../src/conflicts.js";
import { getRetryState, recordFailure } from "../src/retries.js";
import { assertBlastBudget, checkBlastRadius } from "../src/blast.js";
import type { ExecutionPolicy, RiskPolicy } from "../src/config.js";

const POLICY: ExecutionPolicy = {
  max_retries: 3,
  lease_seconds: 600,
  failure_taxonomy: [
    "implementation",
    "specification",
    "environment",
    "external_dependency",
    "credentials",
    "test_instability",
    "repository_conflict",
    "human_decision",
  ],
};

const RISK: RiskPolicy = { max_files: 2, max_loc: 100, on_exceed: "escalate_or_reslice" };

function freshDb(): string {
  const dbPath = defaultStateDbPath(mkdtempSync(join(tmpdir(), "lcs3-conc-")));
  assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
  return dbPath;
}

function readyTask(dbPath: string, id: string): void {
  createTask(dbPath, id);
  transitionTask(dbPath, id, "ready");
}

function doneTask(dbPath: string, id: string): void {
  createTask(dbPath, id);
  transitionTask(dbPath, id, "ready");
  transitionTask(dbPath, id, "claimed");
  transitionTask(dbPath, id, "in_progress");
  transitionTask(dbPath, id, "in_review");
  transitionTask(dbPath, id, "done");
}

describe("runtime concurrency regression (L3-022, AC-011..AC-028)", () => {
  it("parallel claimants yield exactly one winner, deterministically repeated", () => {
    for (let round = 0; round < 3; round += 1) {
      const dbPath = freshDb();
      readyTask(dbPath, "RACE-1");
      claimTask(dbPath, "RACE-1", "w1", 600, 1000);
      assert.throws(
        () => claimTask(dbPath, "RACE-1", "w2", 600, 1001),
        /already owned by 'w1'.*live lease/,
      );
      const row = getTask(dbPath, "RACE-1");
      assert.equal(row?.owner, "w1");
      assert.equal(row?.taskStatus, "claimed");
    }
  });

  it("lease-expiry handoff moves ownership; the stale owner cannot renew", () => {
    for (let round = 0; round < 2; round += 1) {
      const dbPath = freshDb();
      readyTask(dbPath, "HAND-1");
      claimTask(dbPath, "HAND-1", "w1", 60, 1000); // lease until 61000
      const reclaimed = reclaimTask(dbPath, "HAND-1", "w2", 60, 61001);
      assert.equal(reclaimed.owner, "w2");
      assert.equal(reclaimed.taskStatus, "claimed");
      assert.throws(
        () => renewLease(dbPath, "HAND-1", "w1", 60, 62000),
        /stale owner 'w1'.*owned by 'w2'/,
      );
      assert.equal(getTask(dbPath, "HAND-1")?.owner, "w2");
    }
  });

  it("dependency gate blocks until prerequisites are done; unknown deps never bypass", () => {
    const dbPath = freshDb();
    createTask(dbPath, "L3-A");
    readyTask(dbPath, "L3-B");
    const blocked = checkDependencies(dbPath, "L3-B", ["L3-A"]);
    assert.equal(blocked.ready, false);
    assert.deepEqual(blocked.blockedBy, ["L3-A"]);
    // Deterministic repeat: same inputs give the same verdict.
    assert.deepEqual(checkDependencies(dbPath, "L3-B", ["L3-A"]), blocked);
    assert.throws(
      () => assertDependenciesReady(dbPath, "L3-B", ["L3-A"]),
      /blocked by incomplete dependencies.*'L3-A'.*pending/,
    );
    // Unknown dependency throws instead of silently passing.
    assert.throws(
      () => checkDependencies(dbPath, "L3-B", ["L3-GHOST"]),
      /unknown dependency 'L3-GHOST'/,
    );
    // Finish the prerequisite through the canonical machine; the gate opens.
    transitionTask(dbPath, "L3-A", "ready");
    transitionTask(dbPath, "L3-A", "claimed");
    transitionTask(dbPath, "L3-A", "in_progress");
    transitionTask(dbPath, "L3-A", "in_review");
    transitionTask(dbPath, "L3-A", "done");
    assert.equal(checkDependencies(dbPath, "L3-B", ["L3-A"]).ready, true);
    assertDependenciesReady(dbPath, "L3-B", ["L3-A"]);
  });

  it("write-conflict blocks parallel writers, clears on done, widens on expansion", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "WL-1");
    readyTask(dbPath, "WL-2");
    setTaskScope(dbPath, "WL-1", { write: ["src/shared"] });
    setTaskScope(dbPath, "WL-2", { write: ["src/shared/kernel"] });
    const conflicted = checkConflicts(dbPath, "WL-2");
    assert.equal(conflicted.hasConflict, true);
    assert.equal(conflicted.conflicts[0]?.otherTaskId, "WL-1");
    assert.throws(() => assertNoConflicts(dbPath, "WL-2"), /write-conflicts with 'WL-1'/);
    // Read-only overlap never conflicts: WL-3 only reads the same tree.
    readyTask(dbPath, "WL-3");
    setTaskScope(dbPath, "WL-3", { read: ["src/shared"] });
    assert.equal(checkConflicts(dbPath, "WL-3").hasConflict, false);
    // Finishing the other writer clears the gate (terminal tasks are history).
    transitionTask(dbPath, "WL-1", "claimed");
    transitionTask(dbPath, "WL-1", "in_progress");
    transitionTask(dbPath, "WL-1", "in_review");
    transitionTask(dbPath, "WL-1", "done");
    assert.equal(checkConflicts(dbPath, "WL-2").hasConflict, false);
    assertNoConflicts(dbPath, "WL-2");
    // Scope expansion widens the detected overlap on a live pair.
    readyTask(dbPath, "WL-4");
    setTaskScope(dbPath, "WL-4", { write: ["src/other"] });
    assert.equal(checkConflicts(dbPath, "WL-4").hasConflict, false);
    recordExpansion(dbPath, "WL-4", ["src/shared"]);
    const widened = checkConflicts(dbPath, "WL-4");
    assert.equal(widened.hasConflict, true);
    assert.ok(widened.writeScope.includes("src/shared"));
  });

  it("retry budget exhausts deterministically; recording never moves task status", () => {
    const sequences: string[] = [];
    for (let round = 0; round < 2; round += 1) {
      const dbPath = freshDb();
      createTask(dbPath, "RT-1");
      const dispositions: string[] = [];
      for (let n = 0; n < 4; n += 1) {
        dispositions.push(recordFailure(dbPath, "RT-1", "implementation", POLICY).disposition);
      }
      assert.deepEqual(dispositions, ["retry", "retry", "retry", "escalate"]);
      sequences.push(dispositions.join(","));
      const stored = getRetryState(dbPath, "RT-1");
      assert.equal(stored?.attempts, 4);
      assert.equal(stored?.disposition, "escalate");
      assert.equal(stored?.hitl, true);
      // The retry module is a signal: task_status is untouched by recording.
      assert.equal(getTask(dbPath, "RT-1")?.taskStatus, "pending");
    }
    assert.equal(sequences[0], sequences[1]);
    // Never-retry categories escalate on first sight, outside the budget.
    const dbPath = freshDb();
    createTask(dbPath, "RT-2");
    const first = recordFailure(dbPath, "RT-2", "specification", POLICY);
    assert.equal(first.disposition, "escalate");
    assert.equal(first.hitl, true);
    assert.equal(first.attempts, 1);
  });

  it("blast overrun signals without mutating runtime state", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "BL-1");
    const before = listTasks(dbPath);
    assert.equal(checkBlastRadius(RISK, { files: 2, loc: 100 }).signal, "continue");
    const over = checkBlastRadius(RISK, { files: 3, loc: 40 });
    assert.equal(over.withinBudget, false);
    assert.deepEqual(over.exceeded, ["files"]);
    assert.equal(over.signal, "escalate_or_reslice");
    assert.throws(() => assertBlastBudget(RISK, { files: 3, loc: 40 }), /impact exceeds budget/);
    // Same inputs repeat the same signal; the tasks table is untouched.
    assert.deepEqual(checkBlastRadius(RISK, { files: 3, loc: 40 }), over);
    assert.deepEqual(listTasks(dbPath), before);
  });

  it("end-to-end: A done unblocks B, conflict gates C until B finishes", () => {
    const dbPath = freshDb();
    doneTask(dbPath, "E2E-A");
    readyTask(dbPath, "E2E-B");
    readyTask(dbPath, "E2E-C");
    assertDependenciesReady(dbPath, "E2E-B", ["E2E-A"]);
    const claimedB = claimTask(dbPath, "E2E-B", "w1", 600, 1000);
    assert.equal(claimedB.owner, "w1");
    setTaskScope(dbPath, "E2E-B", { write: ["src/e2e"] });
    setTaskScope(dbPath, "E2E-C", { write: ["src/e2e/worker"] });
    assert.throws(() => assertNoConflicts(dbPath, "E2E-C"), /write-conflicts with 'E2E-B'/);
    // A recoverable failure on B stays inside the retry budget and keeps the claim.
    const failure = recordFailure(dbPath, "E2E-B", "implementation", POLICY);
    assert.equal(failure.disposition, "retry");
    assert.equal(getTask(dbPath, "E2E-B")?.owner, "w1");
    // B finishes through the canonical machine; C's conflict gate opens.
    transitionTask(dbPath, "E2E-B", "in_progress");
    transitionTask(dbPath, "E2E-B", "in_review");
    transitionTask(dbPath, "E2E-B", "done");
    assertNoConflicts(dbPath, "E2E-C");
    const claimedC = claimTask(dbPath, "E2E-C", "w2", 600, 2000);
    assert.equal(claimedC.owner, "w2");
    assert.equal(getTask(dbPath, "E2E-B")?.taskStatus, "done");
  });
});
