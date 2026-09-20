import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { createTask, transitionTask } from "../src/transitions.js";
import { claimTask, expireTask, isLeaseExpired, reclaimTask, renewLease } from "../src/claims.js";
import { getTask } from "../src/state.js";

function freshDb(): string {
  const dbPath = defaultStateDbPath(mkdtempSync(join(tmpdir(), "lcs3-claim-")));
  assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
  return dbPath;
}

function readyTask(dbPath: string, id: string): void {
  createTask(dbPath, id);
  transitionTask(dbPath, id, "ready");
}

describe("atomic task claim and lease (SRC-024, AC-012/013)", () => {
  it("claimTask moves ready → claimed with owner + lease", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-1");
    const claimed = claimTask(dbPath, "TASK-1", "w1", 600, 1000);
    assert.equal(claimed.taskStatus, "claimed");
    assert.equal(claimed.owner, "w1");
    assert.equal(claimed.leaseUntil, 1000 + 600 * 1000);
    assert.equal(claimed.heartbeatAt, 1000);
  });

  it("claimTask rejects non-ready tasks with an actionable error", () => {
    const dbPath = freshDb();
    createTask(dbPath, "TASK-P"); // pending, never readied
    assert.throws(() => claimTask(dbPath, "TASK-P", "w1", 600, 1000), /cannot be claimed.*only 'ready'/);
    assert.equal(getTask(dbPath, "TASK-P")?.taskStatus, "pending");
  });

  it("concurrent claim race yields one winner; loser sees the live lease (AC-012)", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-RACE");
    claimTask(dbPath, "TASK-RACE", "w1", 600, 1000);
    // Second claimant serializes behind the first and loses deterministically.
    assert.throws(() => claimTask(dbPath, "TASK-RACE", "w2", 600, 1001), /already owned by 'w1'.*live lease/);
    const row = getTask(dbPath, "TASK-RACE");
    assert.equal(row?.owner, "w1");
    assert.equal(row?.taskStatus, "claimed");
  });

  it("renewLease extends a live lease for the current owner", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-HB");
    claimTask(dbPath, "TASK-HB", "w1", 60, 1000);
    const renewed = renewLease(dbPath, "TASK-HB", "w1", 60, 2000);
    assert.equal(renewed.leaseUntil, 2000 + 60 * 1000);
    assert.equal(renewed.heartbeatAt, 2000);
    assert.equal(renewed.owner, "w1");
  });

  it("stale owner cannot renew after ownership changes", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-STALE");
    claimTask(dbPath, "TASK-STALE", "w1", 60, 1000); // lease until 61000
    reclaimTask(dbPath, "TASK-STALE", "w2", 60, 61001); // expired → w2
    assert.throws(() => renewLease(dbPath, "TASK-STALE", "w1", 60, 62000), /stale owner 'w1'.*owned by 'w2'/);
    assert.equal(getTask(dbPath, "TASK-STALE")?.owner, "w2");
  });

  it("renewLease refuses an expired lease; reclaim recovers it (AC-013)", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-EXP");
    claimTask(dbPath, "TASK-EXP", "w1", 60, 1000);
    const row = getTask(dbPath, "TASK-EXP");
    assert.ok(row !== null);
    assert.equal(isLeaseExpired(row, 61001), true);
    assert.equal(isLeaseExpired(row, 61000), false);
    assert.throws(() => renewLease(dbPath, "TASK-EXP", "w1", 60, 61001), /expired at 61000.*reclaim/);
    const expired = expireTask(dbPath, "TASK-EXP", 61001);
    assert.equal(expired.taskStatus, "expired");
    const reclaimed = reclaimTask(dbPath, "TASK-EXP", "w2", 60, 62000);
    assert.equal(reclaimed.taskStatus, "claimed");
    assert.equal(reclaimed.owner, "w2");
    assert.equal(reclaimed.leaseUntil, 62000 + 60 * 1000);
  });

  it("reclaimTask refuses while the lease is still live", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-LIVE");
    claimTask(dbPath, "TASK-LIVE", "w1", 600, 1000);
    assert.throws(() => reclaimTask(dbPath, "TASK-LIVE", "w2", 600, 2000), /still live until/);
    assert.equal(getTask(dbPath, "TASK-LIVE")?.owner, "w1");
  });

  it("empty id/owner/lease are rejected with actionable errors", () => {
    const dbPath = freshDb();
    readyTask(dbPath, "TASK-V");
    assert.throws(() => claimTask(dbPath, "", "w1", 60), /non-empty/);
    assert.throws(() => claimTask(dbPath, "TASK-V", "", 60), /non-empty worker id/);
    assert.throws(() => claimTask(dbPath, "TASK-V", "w1", 0), /positive integer/);
    assert.throws(() => claimTask(dbPath, "NOPE", "w1", 60), /unknown task/);
  });
});
