// Minimal end-to-end scenario (L3-051): initialize a real project, mutate one
// task through the public task_status machine, assert observable final state.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getTask, listTasks } from "../../src/state.js";
import { transitionTask } from "../../src/transitions.js";
import { claimTask } from "../../src/claims.js";
import { doneTask, freshScenarioProject, readyTask } from "./helpers.js";

describe("scenario harness minimal (L3-051, SRC-061/SRC-062, AC-054..AC-056)", () => {
  it("initializes, mutates runtime state through public API, asserts final state", () => {
    const scn = freshScenarioProject("lcs3-scn-min-");
    assert.ok(existsSync(join(scn.projectRoot, ".lcs3", "manifests", "lifecycle.yaml")));
    assert.ok(existsSync(scn.dbPath));

    readyTask(scn, "SCN-MIN-1");
    assert.equal(getTask(scn.dbPath, "SCN-MIN-1")?.taskStatus, "ready");

    const claimed = claimTask(scn.dbPath, "SCN-MIN-1", "worker-1", 600, 1000, scn.manifestDir);
    assert.equal(claimed.owner, "worker-1");
    assert.equal(claimed.taskStatus, "claimed");

    transitionTask(scn.dbPath, "SCN-MIN-1", "in_progress", scn.manifestDir);
    transitionTask(scn.dbPath, "SCN-MIN-1", "in_review", scn.manifestDir);
    transitionTask(scn.dbPath, "SCN-MIN-1", "done", scn.manifestDir);
    assert.equal(getTask(scn.dbPath, "SCN-MIN-1")?.taskStatus, "done");

    doneTask(scn, "SCN-MIN-2");
    const ids = listTasks(scn.dbPath).map((t) => t.taskId);
    assert.ok(ids.includes("SCN-MIN-1"));
    assert.ok(ids.includes("SCN-MIN-2"));
  });
});
