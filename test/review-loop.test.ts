import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { createTask, transitionTask } from "../src/transitions.js";
import { emitFinding, transitionFinding, getFinding } from "../src/findings.js";
import { sendToNeedsFix, returnFromFix } from "../src/review-loop.js";

function toReview(dbPath: string, taskId: string): void {
  createTask(dbPath, taskId);
  for (const s of ["ready", "claimed", "in_progress", "in_review"]) transitionTask(dbPath, taskId, s);
}

describe("review-fix handoff loop (L3-038, SRC-039, AC-037/038)", () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lcs3-revloop-"));
    dbPath = defaultStateDbPath(dir);
    assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("review -> fix -> review path closes", () => {
    toReview(dbPath, "TASK-V1");
    emitFinding(dbPath, { findingId: "FIX-001", taskId: "TASK-V1", target: "src/a.ts:1", evidence: "bad" });
    const sent = sendToNeedsFix(dbPath, "TASK-V1", ["FIX-001"]);
    assert.equal(sent.task.taskStatus, "needs_fix");
    transitionFinding(dbPath, "FIX-001", "fixed", "patched");
    const back = returnFromFix(dbPath, "TASK-V1", ["FIX-001"]);
    assert.equal(back.task.taskStatus, "claimed");
    assert.equal(getFinding(dbPath, "FIX-001")?.status, "fixed");
  });

  it("unrelated findings remain unchanged", () => {
    toReview(dbPath, "TASK-V2");
    emitFinding(dbPath, { findingId: "FIX-010", taskId: "TASK-V2", target: "x", evidence: "e1" });
    emitFinding(dbPath, { findingId: "FIX-011", taskId: "TASK-V2", target: "y", evidence: "e2" });
    sendToNeedsFix(dbPath, "TASK-V2", ["FIX-010"]);
    transitionFinding(dbPath, "FIX-010", "fixed", "ok");
    returnFromFix(dbPath, "TASK-V2", ["FIX-010"]);
    assert.equal(getFinding(dbPath, "FIX-011")?.status, "open");
  });

  it("wrong status and cross-task findings rejected", () => {
    toReview(dbPath, "TASK-V3");
    createTask(dbPath, "TASK-V4");
    emitFinding(dbPath, { findingId: "FIX-020", taskId: "TASK-V4", target: "z", evidence: "ez" });
    assert.throws(() => sendToNeedsFix(dbPath, "TASK-V3", ["FIX-020"]), /belongs to/);
    assert.throws(() => returnFromFix(dbPath, "TASK-V3", ["FIX-020"]), /must be needs_fix/);
    assert.throws(() => sendToNeedsFix(dbPath, "TASK-V4", ["FIX-020"]), /must be in_review/);
  });

  it("unfixed finding blocks return to review", () => {
    toReview(dbPath, "TASK-V5");
    emitFinding(dbPath, { findingId: "FIX-030", taskId: "TASK-V5", target: "w", evidence: "ew" });
    sendToNeedsFix(dbPath, "TASK-V5", ["FIX-030"]);
    assert.throws(() => returnFromFix(dbPath, "TASK-V5", ["FIX-030"]), /must be fixed/);
  });
});
