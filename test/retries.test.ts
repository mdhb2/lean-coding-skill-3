import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { createTask } from "../src/transitions.js";
import { classifyFailure, getRetryState, recordFailure } from "../src/retries.js";
import type { ExecutionPolicy } from "../src/config.js";

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

function freshDb(): string {
  const dbPath = defaultStateDbPath(mkdtempSync(join(tmpdir(), "lcs3-retry-")));
  assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
  return dbPath;
}

describe("failure taxonomy and retry state (SRC-021..023, AC-020..023)", () => {
  it("recoverable implementation failure retries within budget (AC-020)", () => {
    const r = classifyFailure("implementation", 1, POLICY);
    assert.equal(r.disposition, "retry");
    assert.equal(r.hitl, false);
    assert.equal(r.suggestedNext, "stay");
    assert.equal(r.attemptsLeft, 2);
  });

  it("test_instability is retryable; exhaustion escalates to HITL (AC-020/021)", () => {
    const third = classifyFailure("test_instability", 3, POLICY);
    assert.equal(third.disposition, "retry");
    const fourth = classifyFailure("test_instability", 4, POLICY);
    assert.equal(fourth.disposition, "escalate");
    assert.equal(fourth.hitl, true);
    assert.equal(fourth.suggestedNext, "blocked");
    assert.match(fourth.reason, /budget exhausted/);
  });

  it("specification/credentials/human_decision escalate immediately, never retry (AC-022/023)", () => {
    for (const cat of ["specification", "credentials", "human_decision"]) {
      const r = classifyFailure(cat, 1, POLICY);
      assert.equal(r.disposition, "escalate");
      assert.equal(r.hitl, true);
      assert.equal(r.suggestedNext, "blocked");
    }
  });

  it("environment/external_dependency/repository_conflict route to blocked without a human gate", () => {
    for (const cat of ["environment", "external_dependency", "repository_conflict"]) {
      const r = classifyFailure(cat, 1, POLICY);
      assert.equal(r.disposition, "escalate");
      assert.equal(r.hitl, false);
      assert.equal(r.suggestedNext, "blocked");
    }
  });

  it("recordFailure persists attempts and getRetryState reads them back", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-R1");
    const first = recordFailure(dbPath, "TASK-R1", "implementation", POLICY);
    assert.equal(first.taskId, "TASK-R1");
    assert.equal(first.attempts, 1);
    assert.equal(first.disposition, "retry");
    const second = recordFailure(dbPath, "TASK-R1", "implementation", POLICY);
    assert.equal(second.attempts, 2);
    const stored = getRetryState(dbPath, "TASK-R1");
    assert.equal(stored?.attempts, 2);
    assert.equal(stored?.category, "implementation");
    assert.equal(stored?.disposition, "retry");
  });

  it("recorded exhaustion escalates deterministically on repeat runs", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-RX");
    recordFailure(dbPath, "TASK-RX", "implementation", POLICY);
    recordFailure(dbPath, "TASK-RX", "implementation", POLICY);
    recordFailure(dbPath, "TASK-RX", "implementation", POLICY);
    const fourth = recordFailure(dbPath, "TASK-RX", "implementation", POLICY);
    assert.equal(fourth.attempts, 4);
    assert.equal(fourth.disposition, "escalate");
    assert.equal(fourth.hitl, true);
    // Same inputs re-classify identically (deterministic, no hidden state).
    assert.deepEqual(classifyFailure("implementation", 4, POLICY).disposition, "escalate");
  });

  it("unknown task, unknown category, and bad policy fail actionably", () => {
    const dbPath = freshDb();
    assert.throws(() => recordFailure(dbPath, "TASK-GHOST", "implementation", POLICY), /unknown task/);
    assert.equal(getRetryState(dbPath, "TASK-GHOST"), null);
    createTask(dbPath, "TASK-R2");
    assert.throws(() => recordFailure(dbPath, "TASK-R2", "nope", POLICY), /unknown failure category/);
    assert.equal(getRetryState(dbPath, "TASK-R2"), null);
    assert.throws(
      () => classifyFailure("implementation", 1, { ...POLICY, max_retries: 0 }),
      /positive integer/,
    );
    assert.throws(() => classifyFailure("", 1, POLICY), /non-empty/);
    assert.throws(() => classifyFailure("implementation", 0, POLICY), /positive integer/);
    assert.throws(() => recordFailure(dbPath, "", "implementation", POLICY), /non-empty/);
  });
});
