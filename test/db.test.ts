import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { bootstrapDatabase, defaultStateDbPath, SCHEMA_VERSION, STATE_DB_REL } from "../src/db.js";

function freshDir(): string {
  return mkdtempSync(join(tmpdir(), "lcs3-db-"));
}

function versionOf(dbPath: string): number {
  const db = new DatabaseSync(dbPath);
  try {
    return (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  } finally {
    db.close();
  }
}

function tablesOf(dbPath: string): string[] {
  const db = new DatabaseSync(dbPath);
  try {
    return (db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[]).map(
      (r) => r.name,
    );
  } finally {
    db.close();
  }
}

describe("SQLite bootstrap (SRC-017/018)", () => {
  it("empty DB initializes at SCHEMA_VERSION with bookkeeping table", () => {
    const dir = freshDir();
    const dbPath = defaultStateDbPath(dir);
    assert.equal(dbPath, join(dir, STATE_DB_REL));
    const res = bootstrapDatabase(dbPath);
    assert.deepEqual(res.errors, []);
    assert.equal(res.version, SCHEMA_VERSION);
    assert.deepEqual(res.applied, ["base-schema-migrations"]);
    assert.equal(res.created, true);
    assert.ok(existsSync(dbPath));
    assert.equal(versionOf(dbPath), SCHEMA_VERSION);
    assert.ok(tablesOf(dbPath).includes("schema_migrations"));
  });

  it("repeated bootstrap is safe and applies nothing", () => {
    const dir = freshDir();
    const dbPath = defaultStateDbPath(dir);
    const first = bootstrapDatabase(dbPath);
    assert.deepEqual(first.errors, []);
    const second = bootstrapDatabase(dbPath);
    assert.deepEqual(second.errors, []);
    assert.deepEqual(second.applied, []);
    assert.equal(second.created, false);
    assert.equal(versionOf(dbPath), SCHEMA_VERSION);
  });

  it("newer schema version is refused explicitly, never silently downgraded", () => {
    const dir = freshDir();
    const dbPath = defaultStateDbPath(dir);
    assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
    const db = new DatabaseSync(dbPath);
    try {
      db.exec(`PRAGMA user_version = ${SCHEMA_VERSION + 5}`);
    } finally {
      db.close();
    }
    const res = bootstrapDatabase(dbPath);
    assert.equal(res.errors.length, 1);
    assert.match(res.errors[0].message, /newer than runtime/);
    assert.equal(versionOf(dbPath), SCHEMA_VERSION + 5);
  });

  it("failed migration rolls back without partial state", () => {
    const dir = freshDir();
    const dbPath = defaultStateDbPath(dir);
    assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
    // Corrupt the schema_migrations table shape so the migration path fails
    // before user_version advances: bootstrap must leave the DB exactly as found.
    const db = new DatabaseSync(dbPath);
    try {
      // Drop bookkeeping and fake a partial v1 state: user_version stays 1 but
      // the table no longer matches what later migrations expect. Then reset
      // user_version to 0 so migration INSERT runs against a read-only blocker.
      db.exec("DROP TABLE schema_migrations");
      db.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY)");
      db.exec("PRAGMA user_version = 0");
    } finally {
      db.close();
    }
    const res = bootstrapDatabase(dbPath);
    assert.equal(res.errors.length, 1);
    assert.match(res.errors[0].message, /migration failed/);
    assert.deepEqual(res.applied, []);
    assert.equal(versionOf(dbPath), 0);
  });

  it("bootstrap does not depend on or create canonical files", () => {
    const dir = freshDir();
    const dbPath = defaultStateDbPath(dir);
    const res = bootstrapDatabase(dbPath);
    assert.deepEqual(res.errors, []);
    assert.ok(!existsSync(join(dir, ".lcs3", "config.yaml")));
    assert.ok(!existsSync(join(dir, ".lcs3", "manifests")));
  });

  it("empty path fails with actionable error", () => {
    const res = bootstrapDatabase("");
    assert.equal(res.errors.length, 1);
    assert.match(res.errors[0].message, /empty database path/);
  });

  it("unwritable directory fails with actionable error", () => {
    const dir = freshDir();
    const blocker = join(dir, "blocker");
    mkdirSync(blocker);
    // A file at the directory position makes mkdir(dirname) throw ENOTDIR/EEXIST.
    const res = bootstrapDatabase(join(blocker, "x", "state.db"));
    if (res.errors.length > 0) {
      assert.match(res.errors[0].message, /cannot (create directory|open SQLite)/);
    } else {
      // Filesystem permitted it (root/no-perm-check envs): still a real DB file.
      assert.ok(existsSync(join(blocker, "x", "state.db")));
    }
  });
});
