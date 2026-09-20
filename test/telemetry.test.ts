import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  TELEMETRY_SCHEMA_VERSION,
  bootstrapTelemetryDatabase,
  defaultTelemetryDbPath,
  listTelemetry,
  recordTelemetry,
} from "../src/telemetry.js";

function scratch(): string {
  return mkdtempSync(join(tmpdir(), "lcs3-tel-"));
}

function bootTelemetry(dir: string): string {
  const dbPath = defaultTelemetryDbPath(dir);
  const result = bootstrapTelemetryDatabase(dbPath);
  assert.equal(result.errors.length, 0);
  assert.equal(result.version, TELEMETRY_SCHEMA_VERSION);
  return dbPath;
}

describe("telemetry store (L3-045)", () => {
  it("bootstraps telemetry.db at the runtime path with version 1", () => {
    const dir = scratch();
    const dbPath = defaultTelemetryDbPath(dir);
    assert.ok(dbPath.endsWith(join(".lcs3", "telemetry", "telemetry.db")));
    const result = bootstrapTelemetryDatabase(dbPath);
    assert.equal(result.errors.length, 0);
    assert.equal(result.version, 1);
    assert.ok(existsSync(dbPath));
  });

  it("AC-050: records execution outcome plus efficiency/failure measures", () => {
    const dbPath = bootTelemetry(scratch());
    const event = recordTelemetry(dbPath, {
      workflow: "complex-feature",
      task: "L3-045",
      result: "fail",
      retries: 2,
      failureType: "RETRYABLE",
      contextSize: 42000,
      toolCalls: 17,
      filesRead: 9,
      filesWritten: 2,
      nowMs: 1_700_000_000_000,
    });
    assert.ok(event !== null);
    assert.equal(event.workflow, "complex-feature");
    assert.equal(event.task, "L3-045");
    assert.equal(event.result, "fail");
    assert.equal(event.retries, 2);
    assert.equal(event.failureType, "RETRYABLE");
    assert.equal(event.contextSize, 42000);
    assert.equal(event.toolCalls, 17);
    assert.equal(event.filesRead, 9);
    assert.equal(event.filesWritten, 2);
    assert.equal(event.recordedAt, 1_700_000_000_000);
  });

  it("disabled mode returns null and creates no file", () => {
    const dir = scratch();
    const dbPath = defaultTelemetryDbPath(dir);
    const result = recordTelemetry(dbPath, {
      workflow: "complex-feature",
      task: "L3-045",
      result: "pass",
      enabled: false,
    });
    assert.equal(result, null);
    assert.equal(existsSync(dbPath), false);
    assert.deepEqual(readdirSync(dir), []);
  });

  it("rejects invalid input without persisting anything", () => {
    const dbPath = bootTelemetry(scratch());
    assert.throws(() => recordTelemetry(dbPath, { workflow: "", task: "T", result: "pass" }), /workflow/);
    assert.throws(() => recordTelemetry(dbPath, { workflow: "W", task: "  ", result: "pass" }), /task/);
    assert.throws(
      () => recordTelemetry(dbPath, { workflow: "W", task: "T", result: "maybe" as "pass" }),
      /result/,
    );
    assert.throws(() => recordTelemetry(dbPath, { workflow: "W", task: "T", result: "pass", retries: -1 }), /retries/);
    assert.throws(() => recordTelemetry(dbPath, { workflow: "W", task: "T", result: "pass", toolCalls: 1.5 }), /toolCalls/);
    assert.deepEqual(listTelemetry(dbPath), []);
  });

  it("lists events filtered by workflow/task with a bounded limit", () => {
    const dbPath = bootTelemetry(scratch());
    recordTelemetry(dbPath, { workflow: "bug-fast-lane", task: "B1", result: "pass" });
    recordTelemetry(dbPath, { workflow: "complex-feature", task: "C1", result: "pass" });
    recordTelemetry(dbPath, { workflow: "complex-feature", task: "C2", result: "fail", failureType: "BLOCKING" });
    assert.equal(listTelemetry(dbPath).length, 3);
    assert.equal(listTelemetry(dbPath, { workflow: "complex-feature" }).length, 2);
    assert.equal(listTelemetry(dbPath, { task: "B1" }).length, 1);
    const limited = listTelemetry(dbPath, { limit: 2 });
    assert.equal(limited.length, 2);
    assert.equal(limited[0].task, "B1");
    // Oversized limits are clamped, never unbounded.
    assert.equal(listTelemetry(dbPath, { limit: 1_000_000 }).length, 3);
  });

  it("AC-051: recording creates only the telemetry database file, nothing else", () => {
    const dir = scratch();
    const before = new Set(readdirSync(dir));
    const dbPath = bootTelemetry(dir);
    recordTelemetry(dbPath, { workflow: "W", task: "T", result: "pass", retries: 1 });
    const after = readdirSync(dir);
    // Bootstrapping creates exactly one directory (.lcs3); recording adds
    // no files anywhere outside the telemetry database itself.
    assert.deepEqual(after.filter((name) => !before.has(name)), [".lcs3"]);
    assert.ok(existsSync(dbPath));
  });

  it("refuses to open a newer telemetry schema version", () => {
    const dbPath = bootTelemetry(scratch());
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`PRAGMA user_version = ${TELEMETRY_SCHEMA_VERSION + 5}`);
    } finally {
      db.close();
    }
    const result = bootstrapTelemetryDatabase(dbPath);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, /newer than runtime/);
  });
});
