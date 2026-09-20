import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { createTask, transitionTask } from "../src/transitions.js";
import {
  assertDependenciesReady,
  checkDependencies,
  normalizeTaskId,
} from "../src/dependencies.js";

function freshDb(): string {
  const dbPath = defaultStateDbPath(mkdtempSync(join(tmpdir(), "lcs3-dep-")));
  assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
  return dbPath;
}

function doneTask(dbPath: string, id: string): void {
  createTask(dbPath, id);
  transitionTask(dbPath, id, "ready");
  transitionTask(dbPath, id, "claimed");
  transitionTask(dbPath, id, "in_progress");
  transitionTask(dbPath, id, "in_review");
  transitionTask(dbPath, id, "done");
}

describe("dependency resolver (SRC-025, AC-024/025)", () => {
  it("no dependencies → ready", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-A");
    const check = checkDependencies(dbPath, "TASK-A", []);
    assert.equal(check.ready, true);
    assert.deepEqual(check.blockedBy, []);
    assertDependenciesReady(dbPath, "TASK-A", []);
  });

  it("all dependencies done → ready", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-B");
    doneTask(dbPath, "TASK-D1");
    doneTask(dbPath, "TASK-D2");
    const check = assertDependenciesReady(dbPath, "TASK-B", ["TASK-D1", "TASK-D2"]);
    assert.equal(check.ready, true);
  });

  it("incomplete dependency blocks with actionable error (AC-024)", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-C");
    createTask(dbPath, "TASK-UP"); // pending, not done
    const check = checkDependencies(dbPath, "TASK-C", ["TASK-UP"]);
    assert.equal(check.ready, false);
    assert.deepEqual(check.blockedBy, ["TASK-UP"]);
    assert.throws(
      () => assertDependenciesReady(dbPath, "TASK-C", ["TASK-UP"]),
      /blocked by incomplete dependencies.*TASK-UP.*pending/,
    );
  });

  it("unknown dependency fails validation (AC-025)", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-D");
    assert.throws(
      () => checkDependencies(dbPath, "TASK-D", ["TASK-GHOST"]),
      /unknown dependency 'TASK-GHOST'/,
    );
  });

  it("unknown task fails with actionable error", () => {
    const dbPath = freshDb();
    assert.throws(() => checkDependencies(dbPath, "NOPE", []), /unknown task 'NOPE'/);
  });

  it("IDs normalize: trim + uppercase; empty/whitespace rejected", () => {
    assert.equal(normalizeTaskId("  task-1 "), "TASK-1");
    assert.throws(() => normalizeTaskId(""), /non-empty/);
    assert.throws(() => normalizeTaskId("   "), /non-empty/);
    assert.throws(() => normalizeTaskId("A B"), /whitespace/);
  });

  it("self-dependency rejected as degenerate cycle", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-S");
    assert.throws(() => checkDependencies(dbPath, "TASK-S", ["TASK-S"]), /cannot depend on itself/);
    assert.throws(() => checkDependencies(dbPath, "task-s", ["  TASK-S "]), /cannot depend on itself/);
  });

  it("duplicate dependencies rejected", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-E");
    doneTask(dbPath, "TASK-X");
    assert.throws(
      () => checkDependencies(dbPath, "TASK-E", ["TASK-X", "task-x"]),
      /duplicate dependency 'TASK-X'/,
    );
  });
});
