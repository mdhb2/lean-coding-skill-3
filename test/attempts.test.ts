import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { createTask } from "../src/transitions.js";
import { registerRecipe } from "../src/recipes.js";
import { runAttempt } from "../src/attempts.js";
import type { ExecutionPolicy } from "../src/config.js";

const EXECUTION: ExecutionPolicy = {
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

const ROUTINE = {
  destructive: false,
  credentials: false,
  securityDecision: false,
  businessDecision: false,
  highImpactAmbiguity: false,
  retryExhausted: false,
};

describe("execution attempt controller (L3-036, SRC-020..023, AC-019..023)", () => {
  let dir: string;
  let dbPath: string;
  let a: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lcs3-attempt-"));
    dbPath = defaultStateDbPath(dir);
    assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
    a = join(dir, "a.txt");
    writeFileSync(a, "v1");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("passing gate + routine autonomy finishes AFK with no confirmation (AC-019)", () => {
    registerRecipe(dir, { name: "ok", command: "node -e \"console.log('ok')\"", verified: true, sources: [a] });
    createTask(dbPath, "TASK-A1");
    const r = runAttempt(dbPath, dir, "TASK-A1", { recipeName: "ok", execution: EXECUTION, autonomy: ROUTINE });
    assert.equal(r.decision, "done");
    assert.equal(r.hitl, false);
    assert.equal(r.retry, null);
  });

  it("recoverable failure retries within budget (AC-020)", () => {
    registerRecipe(dir, { name: "bad", command: "node -e \"process.exit(3)\"", verified: true, sources: [a] });
    createTask(dbPath, "TASK-A2");
    const r = runAttempt(dbPath, dir, "TASK-A2", {
      recipeName: "bad",
      execution: EXECUTION,
      failureCategory: "implementation",
      autonomy: ROUTINE,
    });
    assert.equal(r.decision, "retry");
    assert.equal(r.hitl, false);
    assert.equal(r.retry?.attempts, 1);
  });

  it("non-recoverable category escalates immediately (AC-022)", () => {
    registerRecipe(dir, { name: "bad", command: "node -e \"process.exit(3)\"", verified: true, sources: [a] });
    createTask(dbPath, "TASK-A3");
    const r = runAttempt(dbPath, dir, "TASK-A3", {
      recipeName: "bad",
      execution: EXECUTION,
      failureCategory: "specification",
      autonomy: ROUTINE,
    });
    assert.equal(r.decision, "escalate");
    assert.equal(r.hitl, true);
  });

  it("blocked gate escalates without consuming retry budget", () => {
    createTask(dbPath, "TASK-A4");
    const r = runAttempt(dbPath, dir, "TASK-A4", { recipeName: "missing", execution: EXECUTION, autonomy: ROUTINE });
    assert.equal(r.decision, "escalate");
    assert.equal(r.gate.status, "blocked");
    assert.equal(r.retry, null);
  });

  it("passing gate + destructive autonomy escalates to HITL (AC-023)", () => {
    registerRecipe(dir, { name: "ok", command: "node -e \"console.log('ok')\"", verified: true, sources: [a] });
    createTask(dbPath, "TASK-A5");
    const r = runAttempt(dbPath, dir, "TASK-A5", {
      recipeName: "ok",
      execution: EXECUTION,
      autonomy: { ...ROUTINE, destructive: true },
    });
    assert.equal(r.decision, "escalate");
    assert.equal(r.hitl, true);
  });

  it("missing failureCategory on gate failure throws, never inferred", () => {
    registerRecipe(dir, { name: "bad", command: "node -e \"process.exit(3)\"", verified: true, sources: [a] });
    createTask(dbPath, "TASK-A6");
    assert.throws(
      () => runAttempt(dbPath, dir, "TASK-A6", { recipeName: "bad", execution: EXECUTION, autonomy: ROUTINE }),
      /failureCategory is required/,
    );
  });
});
