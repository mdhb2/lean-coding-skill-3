import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrapDatabase, defaultStateDbPath } from "../src/db.js";
import { emitFinding, transitionFinding, getFinding, listFindings } from "../src/findings.js";

describe("structured review finding IDs (L3-037, SRC-039, AC-036)", () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lcs3-find-"));
    dbPath = defaultStateDbPath(dir);
    assert.deepEqual(bootstrapDatabase(dbPath).errors, []);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("emits stable FIX-### with target/evidence/status", () => {
    const f = emitFinding(dbPath, { findingId: "FIX-001", taskId: "TASK-R1", target: "src/x.ts:10", evidence: "missing null check" });
    assert.equal(f.findingId, "FIX-001");
    assert.equal(f.status, "open");
    assert.equal(f.target, "src/x.ts:10");
    assert.equal(f.evidence, "missing null check");
  });

  it("duplicate ID rejected", () => {
    emitFinding(dbPath, { findingId: "FIX-002", taskId: "T1", target: "a", evidence: "e" });
    assert.throws(
      () => emitFinding(dbPath, { findingId: "FIX-002", taskId: "T1", target: "a", evidence: "e" }),
      /duplicate finding id/,
    );
  });

  it("closed finding retains audit history", () => {
    emitFinding(dbPath, { findingId: "FIX-003", taskId: "T2", target: "b", evidence: "e2" });
    transitionFinding(dbPath, "FIX-003", "fixed", "null check added");
    const closed = transitionFinding(dbPath, "FIX-003", "closed", "verified by reviewer");
    assert.equal(closed.status, "closed");
    assert.ok(closed.history.length >= 3);
    assert.match(closed.history[0], /open/);
    const reread = getFinding(dbPath, "FIX-003");
    assert.deepEqual(reread?.history, closed.history);
  });

  it("illegal transition and bad IDs rejected", () => {
    emitFinding(dbPath, { findingId: "FIX-004", taskId: "T3", target: "c", evidence: "e3" });
    transitionFinding(dbPath, "FIX-004", "closed", "wontfix: out of scope");
    assert.throws(() => transitionFinding(dbPath, "FIX-004", "fixed"), /illegal finding transition/);
    assert.throws(() => emitFinding(dbPath, { findingId: "BAD-1", taskId: "T3", target: "c", evidence: "e" }), /FIX-###/);
  });

  it("listFindings scoped per task", () => {
    emitFinding(dbPath, { findingId: "FIX-010", taskId: "TA", target: "x", evidence: "ex" });
    emitFinding(dbPath, { findingId: "FIX-011", taskId: "TA", target: "y", evidence: "ey" });
    emitFinding(dbPath, { findingId: "FIX-012", taskId: "TB", target: "z", evidence: "ez" });
    assert.equal(listFindings(dbPath, "TA").length, 2);
    assert.equal(listFindings(dbPath, "TB").length, 1);
  });
});
