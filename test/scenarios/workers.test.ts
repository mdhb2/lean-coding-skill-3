// Multi-workitem/multi-worker scenarios (L3-054): concurrent claims, lease
// expiry + reclaim, dependency blocking, write conflicts + scope expansion,
// and blast-radius budgeting — all over real public seams (SRC-024/SRC-025,
// SRC-028, AC-012/AC-013, AC-024..AC-028).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { claimTask, expireTask, reclaimTask } from "../../src/claims.js";
import { checkDependencies, assertDependenciesReady } from "../../src/dependencies.js";
import {
  setTaskScope,
  checkConflicts,
  assertNoConflicts,
  recordExpansion,
} from "../../src/conflicts.js";
import { checkBlastRadius } from "../../src/blast.js";
import { transitionTask } from "../../src/transitions.js";
import { freshScenarioProject, readyTask, SCENARIO_RISK } from "./helpers.js";

describe("L3-054 multi-workitem/multi-worker scenarios", () => {
  it("concurrent claims: exactly one worker wins (AC-012)", () => {
    const scn = freshScenarioProject("lcs3-scn-workers-");
    readyTask(scn, "TA");
    const won = claimTask(scn.dbPath, "TA", "worker-a", 600, Date.now(), scn.manifestDir);
    assert.equal(won.owner, "worker-a");
    assert.throws(
      () => claimTask(scn.dbPath, "TA", "worker-b", 600, Date.now(), scn.manifestDir),
      /already owned/,
    );
  });

  it("lease expiry is detectable and the task is reclaimable (AC-013)", () => {
    const scn = freshScenarioProject("lcs3-scn-lease-");
    readyTask(scn, "TA");
    const base = Date.now();
    claimTask(scn.dbPath, "TA", "worker-a", 60, base, scn.manifestDir);
    assert.throws(
      () => expireTask(scn.dbPath, "TA", base, scn.manifestDir),
      /still live/,
    );
    const expired = expireTask(scn.dbPath, "TA", base + 61_000, scn.manifestDir);
    assert.equal(expired.taskStatus, "expired");
    const reclaimed = reclaimTask(
      scn.dbPath,
      "TA",
      "worker-b",
      60,
      base + 61_000,
      scn.manifestDir,
    );
    assert.equal(reclaimed.taskStatus, "claimed");
    assert.equal(reclaimed.owner, "worker-b");
  });

  it("dependency gate blocks until prerequisites are done (AC-024)", () => {
    const scn = freshScenarioProject("lcs3-scn-deps-");
    readyTask(scn, "TA");
    readyTask(scn, "TB");
    const blocked = checkDependencies(scn.dbPath, "TB", ["TA"]);
    assert.equal(blocked.ready, false);
    assert.deepEqual(blocked.blockedBy, ["TA"]);
    assert.throws(
      () => assertDependenciesReady(scn.dbPath, "TB", ["TA"]),
      /blocked by incomplete dependencies/,
    );
    for (const next of ["claimed", "in_progress", "in_review", "done"] as const) {
      transitionTask(scn.dbPath, "TA", next, scn.manifestDir);
    }
    const ready = assertDependenciesReady(scn.dbPath, "TB", ["TA"]);
    assert.equal(ready.ready, true);
  });

  it("write conflict is detected; scope expansion is recorded (AC-026/AC-027)", () => {
    const scn = freshScenarioProject("lcs3-scn-conflict-");
    readyTask(scn, "TA");
    readyTask(scn, "TB");
    setTaskScope(scn.dbPath, "TA", { write: ["src/a"] });
    setTaskScope(scn.dbPath, "TB", { write: ["src/a"] });
    const check = checkConflicts(scn.dbPath, "TB");
    assert.equal(check.hasConflict, true);
    assert.throws(() => assertNoConflicts(scn.dbPath, "TB"), /write-conflicts/);
    const expanded = recordExpansion(scn.dbPath, "TA", ["src/b"]);
    assert.equal(expanded.expansions.length, 1);
    assert.equal(expanded.expansions[0].path, "src/b");
  });

  it("blast radius stays within budget or escalates (AC-028)", () => {
    const ok = checkBlastRadius(SCENARIO_RISK, { files: 2, loc: 100 });
    assert.equal(ok.withinBudget, true);
    assert.equal(ok.signal, "continue");
    const over = checkBlastRadius(SCENARIO_RISK, { files: 3, loc: 10 });
    assert.equal(over.withinBudget, false);
    assert.deepEqual(over.exceeded, ["files"]);
    assert.equal(over.signal, "escalate_or_reslice");
  });
});
