// Review/freshness/finalization scenarios (L3-055): review -> FIX -> review
// loop, review-loop guards, stale capsule/derived detection + regeneration,
// task gate vs final gate, and done-terminal finalization — all over real
// public seams (SRC-034, SRC-035, SRC-037..SRC-040, SRC-061, SRC-062).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getTask } from "../../src/state.js";
import { transitionTask } from "../../src/transitions.js";
import {
  emitFinding,
  transitionFinding,
  getFinding,
  listFindings,
} from "../../src/findings.js";
import { sendToNeedsFix, returnFromFix } from "../../src/review-loop.js";
import { generateCapsule } from "../../src/capsule.js";
import { checkDerivedFileFreshness } from "../../src/provenance.js";
import { registerRecipe } from "../../src/recipes.js";
import { runTargetedGate, runFinalGate } from "../../src/gates.js";
import { freshScenarioProject, readyTask, doneTask } from "./helpers.js";
import type { ScenarioProject } from "./helpers.js";

function toReview(scn: ScenarioProject, id: string): void {
  readyTask(scn, id);
  for (const next of ["claimed", "in_progress", "in_review"] as const) {
    transitionTask(scn.dbPath, id, next, scn.manifestDir);
  }
}

describe("L3-055 review/freshness/finalization scenarios", () => {
  it("review -> FIX -> review loop preserves finding trail (SRC-039)", () => {
    const scn = freshScenarioProject("lcs3-scn-review-");
    toReview(scn, "TA");
    emitFinding(scn.dbPath, {
      findingId: "FIX-001",
      taskId: "TA",
      target: "src/x.ts",
      evidence: "reviewer: missing bounds check",
    });
    const sent = sendToNeedsFix(scn.dbPath, "TA", ["FIX-001"], scn.manifestDir);
    assert.equal(sent.task.taskStatus, "needs_fix");
    transitionFinding(scn.dbPath, "FIX-001", "fixed", "bounds check added");
    const back = returnFromFix(scn.dbPath, "TA", ["FIX-001"], scn.manifestDir);
    assert.equal(back.task.taskStatus, "claimed");
    const closed = transitionFinding(scn.dbPath, "FIX-001", "closed", "verified");
    assert.equal(closed.status, "closed");
    assert.equal(closed.history.length, 3);
    assert.equal(listFindings(scn.dbPath, "TA").length, 1);
    assert.equal(getFinding(scn.dbPath, "FIX-001")?.status, "closed");
  });

  it("review-loop guards refuse open findings and wrong tasks", () => {
    const scn = freshScenarioProject("lcs3-scn-review-guard-");
    toReview(scn, "TB");
    toReview(scn, "TC");
    emitFinding(scn.dbPath, { findingId: "FIX-002", taskId: "TB", target: "src/y.ts", evidence: "n/a" });
    emitFinding(scn.dbPath, { findingId: "FIX-003", taskId: "TC", target: "src/z.ts", evidence: "n/a" });
    sendToNeedsFix(scn.dbPath, "TB", ["FIX-002"], scn.manifestDir);
    assert.throws(
      () => returnFromFix(scn.dbPath, "TB", ["FIX-002"], scn.manifestDir),
      /must be fixed/,
    );
    assert.throws(
      () => sendToNeedsFix(scn.dbPath, "TC", ["FIX-002"], scn.manifestDir),
      /belongs to/,
    );
    readyTask(scn, "TD");
    assert.throws(
      () => sendToNeedsFix(scn.dbPath, "TD", ["FIX-002"], scn.manifestDir),
      /must be in_review/,
    );
  });

  it("stale capsule is detected and regeneration restores freshness (SRC-035)", () => {
    const scn = freshScenarioProject("lcs3-scn-capsule-");
    const wiDir = join(scn.projectRoot, "wi-1");
    mkdirSync(join(wiDir, "task"), { recursive: true });
    const taskFile = join(wiDir, "task", "task-a.md");
    writeFileSync(
      taskFile,
      "---\nartifact_id: TASK-A\ncovers:\n  - SRC-001\ntests:\n  - AC-001\n---\nbody\n",
      "utf8",
    );
    const out = join(wiDir, "capsule-TASK-A.md");
    generateCapsule(wiDir, "TASK-A", out, scn.manifestDir);
    assert.deepEqual(checkDerivedFileFreshness(out), { fresh: true, reason: null });
    writeFileSync(
      taskFile,
      "---\nartifact_id: TASK-A\ncovers:\n  - SRC-001\n  - SRC-002\ntests:\n  - AC-001\n---\nbody v2\n",
      "utf8",
    );
    const stale = checkDerivedFileFreshness(out);
    assert.equal(stale.fresh, false);
    assert.equal(stale.reason, "upstream changed");
    generateCapsule(wiDir, "TASK-A", out, scn.manifestDir);
    assert.deepEqual(checkDerivedFileFreshness(out), { fresh: true, reason: null });
  });

  it("task gate is targeted; final gate runs the broader suite (SRC-037)", () => {
    const scn = freshScenarioProject("lcs3-scn-gates-");
    const src = join(scn.projectRoot, "src.txt");
    writeFileSync(src, "v1", "utf8");
    registerRecipe(scn.projectRoot, { name: "unit", command: "true", verified: true, sources: [src] });
    registerRecipe(scn.projectRoot, { name: "bad", command: "false", verified: true, sources: [src] });
    const targeted = runTargetedGate(scn.projectRoot, "unit");
    assert.equal(targeted.status, "pass");
    assert.equal(targeted.gate, "targeted");
    const finalPass = runFinalGate(scn.projectRoot, ["unit"]);
    assert.equal(finalPass.status, "pass");
    const finalFail = runFinalGate(scn.projectRoot, ["unit", "bad"]);
    assert.equal(finalFail.status, "fail");
    const finalEmpty = runFinalGate(scn.projectRoot, []);
    assert.equal(finalEmpty.status, "blocked");
    writeFileSync(src, "v2 changed", "utf8");
    const staleTargeted = runTargetedGate(scn.projectRoot, "unit");
    assert.equal(staleTargeted.status, "blocked");
    assert.match(staleTargeted.reason ?? "", /upstream changed/);
  });

  it("done is terminal: finalization sticks (SRC-040)", () => {
    const scn = freshScenarioProject("lcs3-scn-final-");
    doneTask(scn, "TA");
    assert.equal(getTask(scn.dbPath, "TA")?.taskStatus, "done");
    assert.throws(
      () => transitionTask(scn.dbPath, "TA", "claimed", scn.manifestDir),
      /terminal/,
    );
  });
});
