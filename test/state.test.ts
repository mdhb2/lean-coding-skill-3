import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { getTask, putTask, listTasks, withTransaction } from "../src/state.js";

function freshDir(): string {
  return mkdtempSync(join(tmpdir(), "lcs3-state-"));
}

function freshDb(): string {
  const dbPath = defaultStateDbPath(freshDir());
  const res = bootstrapDatabase(dbPath);
  assert.deepEqual(res.errors, []);
  return dbPath;
}

function rawGet(dbPath: string, taskId: string): Record<string, unknown> | undefined {
  const db = new DatabaseSync(dbPath);
  try {
    return db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId) as Record<string, unknown> | undefined;
  } finally {
    db.close();
  }
}

describe("transactional runtime state repository (SRC-017/018/024)", () => {
  it("put/get round-trips the full runtime mirror row", () => {
    const dbPath = freshDb();
    assert.equal(getTask(dbPath, "TASK-001"), null);
    putTask(dbPath, { taskId: "TASK-001", taskStatus: "ready", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "" });
    assert.deepEqual(
      { ...getTask(dbPath, "TASK-001"), updatedAt: "IGNORED" },
      { taskId: "TASK-001", taskStatus: "ready", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "IGNORED" },
    );
    putTask(dbPath, { taskId: "TASK-001", taskStatus: "claimed", owner: "w1", leaseUntil: 123, heartbeatAt: 456, updatedAt: "" });
    assert.deepEqual(
      { ...getTask(dbPath, "TASK-001"), updatedAt: "IGNORED" },
      { taskId: "TASK-001", taskStatus: "claimed", owner: "w1", leaseUntil: 123, heartbeatAt: 456, updatedAt: "IGNORED" },
    );
  });

  it("transaction commits all writes atomically", () => {
    const dbPath = freshDb();
    withTransaction(dbPath, (tx) => {
      tx.put({ taskId: "A", taskStatus: "ready", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "" });
      tx.put({ taskId: "B", taskStatus: "blocked", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "" });
      assert.equal(tx.get("A")?.taskStatus, "ready");
    });
    assert.equal(getTask(dbPath, "A")?.taskStatus, "ready");
    assert.equal(getTask(dbPath, "B")?.taskStatus, "blocked");
    assert.deepEqual(
      listTasks(dbPath).map((t) => t.taskId),
      ["A", "B"],
    );
  });

  it("transaction rolls back everything on throw", () => {
    const dbPath = freshDb();
    putTask(dbPath, { taskId: "KEEP", taskStatus: "done", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "" });
    assert.throws(() =>
      withTransaction(dbPath, (tx) => {
        tx.put({ taskId: "KEEP", taskStatus: "ready", owner: "w-x", leaseUntil: 1, heartbeatAt: 1, updatedAt: "" });
        tx.put({ taskId: "GHOST", taskStatus: "ready", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "" });
        throw new Error("boom");
      }),
    );
    assert.equal(getTask(dbPath, "KEEP")?.taskStatus, "done");
    assert.equal(getTask(dbPath, "KEEP")?.owner, null);
    assert.equal(getTask(dbPath, "GHOST"), null);
  });

  it("transaction does not swallow the original error", () => {
    const dbPath = freshDb();
    assert.throws(() => withTransaction(dbPath, () => {
      throw new Error("original-failure");
    }), /original-failure/);
  });

  it("second writer blocks while a write transaction is open", () => {
    const dbPath = freshDb();
    putTask(dbPath, { taskId: "RACE", taskStatus: "ready", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "" });
    const first = new DatabaseSync(dbPath);
    try {
      first.exec("BEGIN IMMEDIATE");
      const second = new DatabaseSync(dbPath);
      try {
        assert.throws(() => second.exec("BEGIN IMMEDIATE"), /busy|locked/i);
      } finally {
        second.close();
      }
    } finally {
      first.exec("ROLLBACK");
      first.close();
    }
    assert.equal(getTask(dbPath, "RACE")?.taskStatus, "ready");
  });

  it("sequential commits apply in order; last commit wins", () => {
    const dbPath = freshDb();
    putTask(dbPath, { taskId: "X", taskStatus: "ready", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "" });
    // Two writers racing serialize on the write lock: whoever commits last owns
    // the row. Sequential commits reproduce that ordering deterministically.
    withTransaction(dbPath, (tx) => {
      tx.put({ taskId: "X", taskStatus: "claimed", owner: "a", leaseUntil: 1, heartbeatAt: 1, updatedAt: "" });
    });
    withTransaction(dbPath, (tx) => {
      tx.put({ taskId: "X", taskStatus: "claimed", owner: "b", leaseUntil: 2, heartbeatAt: 2, updatedAt: "" });
    });
    assert.equal(getTask(dbPath, "X")?.owner, "b");
    assert.equal(getTask(dbPath, "X")?.leaseUntil, 2);
  });

  it("claim/lease semantics live in the DB mirror, not canonical Markdown", () => {
    const dir = freshDir();
    const dbPath = defaultStateDbPath(dir);
    assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
    putTask(dbPath, { taskId: "TASK-9", taskStatus: "claimed", owner: "w1", leaseUntil: 999, heartbeatAt: 111, updatedAt: "" });
    assert.ok(!existsSync(join(dir, ".lcs3", "config.yaml")));
    assert.ok(!existsSync(join(dir, ".lcs3", "manifests")));
    const row = rawGet(dbPath, "TASK-9");
    assert.equal(row?.["owner"], "w1");
    assert.equal(row?.["lease_until"], 999);
  });

  it("empty task id is rejected with an actionable error", () => {
    const dbPath = freshDb();
    assert.throws(
      () => putTask(dbPath, { taskId: "", taskStatus: "ready", owner: null, leaseUntil: null, heartbeatAt: null, updatedAt: "" }),
      /non-empty task id/,
    );
  });
});
