import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { createTask, transitionTask } from "../src/transitions.js";
import {
  assertNoConflicts,
  checkConflicts,
  getTaskScope,
  normalizeScopePath,
  recordExpansion,
  setTaskScope,
} from "../src/conflicts.js";

function freshDb(): string {
  const dbPath = defaultStateDbPath(mkdtempSync(join(tmpdir(), "lcs3-conf-")));
  assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
  return dbPath;
}

function readyTask(dbPath: string, id: string): void {
  createTask(dbPath, id);
  transitionTask(dbPath, id, "ready");
}

function finishTask(dbPath: string, id: string): void {
  transitionTask(dbPath, id, "claimed");
  transitionTask(dbPath, id, "in_progress");
  transitionTask(dbPath, id, "in_review");
  transitionTask(dbPath, id, "done");
}

describe("conflict + write-scope resolver (SRC-025..027, AC-026/027)", () => {
  it("overlapping write scopes conflict with actionable error (AC-026)", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-A");
    readyTask(dbPath, "TASK-B");
    setTaskScope(dbPath, "TASK-A", { write: ["src/auth"] });
    setTaskScope(dbPath, "TASK-B", { write: ["src/auth/login.ts"] });
    const check = checkConflicts(dbPath, "TASK-A");
    assert.equal(check.hasConflict, true);
    assert.deepEqual(check.conflicts, [
      { otherTaskId: "TASK-B", overlappingPaths: ["src/auth"] },
    ]);
    assert.throws(
      () => assertNoConflicts(dbPath, "TASK-A"),
      /write-conflicts with 'TASK-B' on 'src\/auth'/,
    );
  });

  it("disjoint write scopes do not conflict", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-C");
    readyTask(dbPath, "TASK-D");
    setTaskScope(dbPath, "TASK-C", { write: ["src/auth"] });
    setTaskScope(dbPath, "TASK-D", { write: ["src/billing"] });
    const check = assertNoConflicts(dbPath, "TASK-C");
    assert.equal(check.hasConflict, false);
    assert.deepEqual(check.conflicts, []);
  });

  it("read-only overlap never conflicts", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-E");
    readyTask(dbPath, "TASK-F");
    setTaskScope(dbPath, "TASK-E", { read: ["src/shared"], write: ["src/auth"] });
    setTaskScope(dbPath, "TASK-F", { read: ["src/shared"], write: ["src/billing"] });
    assert.equal(checkConflicts(dbPath, "TASK-E").hasConflict, false);
    assertNoConflicts(dbPath, "TASK-F");
  });

  it("terminal tasks are history, not parallel writers", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-G");
    readyTask(dbPath, "TASK-H");
    setTaskScope(dbPath, "TASK-G", { write: ["src/auth"] });
    setTaskScope(dbPath, "TASK-H", { write: ["src/auth"] });
    assert.equal(checkConflicts(dbPath, "TASK-G").hasConflict, true);
    finishTask(dbPath, "TASK-H");
    assert.equal(checkConflicts(dbPath, "TASK-G").hasConflict, false);
  });

  it("expansion beyond declared write is recorded explicitly (AC-027)", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-I");
    setTaskScope(dbPath, "TASK-I", { write: ["src/auth"] });
    const scope = recordExpansion(dbPath, "TASK-I", ["src/billing"]);
    assert.equal(scope.expansions.length, 1);
    assert.equal(scope.expansions[0].path, "src/billing");
    assert.ok(scope.expansions[0].recordedAt);
    // Expanded path now participates in conflict detection.
    readyTask(dbPath, "TASK-J");
    setTaskScope(dbPath, "TASK-J", { write: ["src/billing/invoice.ts"] });
    assert.equal(checkConflicts(dbPath, "TASK-I").hasConflict, true);
  });

  it("already-covered paths are no-ops, not expansions", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-K");
    setTaskScope(dbPath, "TASK-K", { write: ["src/auth"] });
    const scope = recordExpansion(dbPath, "TASK-K", ["src/auth/login.ts", " src/auth/ "]);
    assert.deepEqual(scope.expansions, []);
    assert.deepEqual(getTaskScope(dbPath, "TASK-K")?.expansions, []);
  });

  it("paths normalize: trim + leading ./ + trailing slash; empty rejected", () => {
    assert.equal(normalizeScopePath("  ./src/auth/ "), "src/auth");
    assert.throws(() => normalizeScopePath(""), /non-empty/);
    assert.throws(() => normalizeScopePath("   "), /non-empty/);
  });

  it("unknown task and missing scope fail with actionable errors", () => {
    const dbPath = freshDb();
    assert.throws(() => checkConflicts(dbPath, "GHOST"), /unknown task 'GHOST'/);
    assert.throws(
      () => setTaskScope(dbPath, "GHOST", { write: ["src/x"] }),
      /unknown task 'GHOST'/,
    );
    readyTask(dbPath, "TASK-L");
    assert.throws(() => recordExpansion(dbPath, "TASK-L", ["src/x"]), /no declared scope/);
  });
});
