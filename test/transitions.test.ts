import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import {
  assertTransition,
  canTransition,
  createTask,
  defaultManifestDir,
  transitionTask,
} from "../src/transitions.js";
import { getTask } from "../src/state.js";

const MANIFESTS = defaultManifestDir();

function freshDb(): string {
  const dbPath = defaultStateDbPath(mkdtempSync(join(tmpdir(), "lcs3-trans-")));
  assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
  return dbPath;
}

describe("task execution state machine (SRC-019..023/039, AC-014/019..023)", () => {
  it("every legal edge in the canonical matrix passes", () => {
    const legal: Array<[string, string]> = [
      ["pending", "ready"],
      ["pending", "blocked"],
      ["pending", "cancelled"],
      ["ready", "blocked"],
      ["ready", "claimed"],
      ["ready", "cancelled"],
      ["blocked", "pending"],
      ["blocked", "ready"],
      ["blocked", "cancelled"],
      ["claimed", "in_progress"],
      ["claimed", "expired"],
      ["claimed", "cancelled"],
      ["in_progress", "blocked"],
      ["in_progress", "in_review"],
      ["in_progress", "expired"],
      ["in_progress", "cancelled"],
      ["in_review", "needs_fix"],
      ["in_review", "done"],
      ["in_review", "cancelled"],
      ["needs_fix", "claimed"],
      ["needs_fix", "cancelled"],
      ["expired", "ready"],
      ["expired", "cancelled"],
    ];
    for (const [from, to] of legal) {
      assert.equal(canTransition(MANIFESTS, from, to), true, `${from} → ${to} must be legal`);
      assertTransition(MANIFESTS, from, to); // must not throw
    }
  });

  it("representative illegal transitions fail with actionable errors", () => {
    const illegal: Array<[string, string]> = [
      ["pending", "claimed"], // must go via ready
      ["ready", "in_progress"], // must claim first
      ["in_review", "in_progress"], // must go via needs_fix → claimed
      ["done", "ready"], // terminal
      ["cancelled", "pending"], // terminal
      ["claimed", "done"], // skip ahead
    ];
    for (const [from, to] of illegal) {
      assert.equal(canTransition(MANIFESTS, from, to), false, `${from} → ${to} must be illegal`);
      assert.throws(() => assertTransition(MANIFESTS, from, to), /illegal task_status transition/);
    }
  });

  it("terminal-state mutation is blocked with explicit terminal error", () => {
    const dbPath = freshDb();
    createTask(dbPath, "T1", "pending");
    transitionTask(dbPath, "T1", "ready");
    transitionTask(dbPath, "T1", "claimed");
    transitionTask(dbPath, "T1", "in_progress");
    transitionTask(dbPath, "T1", "in_review");
    transitionTask(dbPath, "T1", "done");
    assert.equal(getTask(dbPath, "T1")?.taskStatus, "done");
    assert.throws(() => transitionTask(dbPath, "T1", "ready"), /terminal.*no outgoing edges/);
    assert.equal(getTask(dbPath, "T1")?.taskStatus, "done"); // unchanged
  });

  it("review-fix loop closes: in_review → needs_fix → claimed → in_progress → in_review → done", () => {
    const dbPath = freshDb();
    createTask(dbPath, "LOOP", "pending");
    for (const next of ["ready", "claimed", "in_progress", "in_review"]) transitionTask(dbPath, "LOOP", next);
    transitionTask(dbPath, "LOOP", "needs_fix");
    for (const next of ["claimed", "in_progress", "in_review", "done"]) transitionTask(dbPath, "LOOP", next);
    assert.equal(getTask(dbPath, "LOOP")?.taskStatus, "done");
  });

  it("artifact/task status cross-talk is rejected (AC-014)", () => {
    const dbPath = freshDb();
    createTask(dbPath, "X1", "pending");
    // Artifact lifecycle values are unknown to the task machine.
    for (const artifactState of ["draft", "reviewed", "active", "archived"]) {
      assert.throws(() => transitionTask(dbPath, "X1", artifactState), /unknown task_status/);
      assert.throws(() => createTask(dbPath, `A-${artifactState}`, artifactState), /unknown task_status/);
    }
    assert.equal(getTask(dbPath, "X1")?.taskStatus, "pending"); // unchanged
  });

  it("illegal transition leaves the stored row unchanged", () => {
    const dbPath = freshDb();
    createTask(dbPath, "S1", "pending");
    assert.throws(() => transitionTask(dbPath, "S1", "claimed"), /illegal task_status transition/);
    assert.equal(getTask(dbPath, "S1")?.taskStatus, "pending");
  });

  it("unknown task and unknown state fail actionably", () => {
    const dbPath = freshDb();
    assert.throws(() => transitionTask(dbPath, "GHOST", "ready"), /unknown task/);
    assert.throws(() => transitionTask(dbPath, "GHOST2", "nonexistent"), /unknown task_status/);
    assert.throws(() => createTask(dbPath, "", "pending"), /non-empty task id/);
    createTask(dbPath, "DUP", "pending");
    assert.throws(() => createTask(dbPath, "DUP", "pending"), /already exists/);
  });
});
