// L3-048 Doctor core: each seeded bad fixture yields its distinct actionable
// code; the clean fixture passes with zero findings (SRC-060, AC-053).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runDoctor, type DoctorSnapshot } from "../src/doctor.js";

// Legal task_status from canonical .lcs3/manifests/lifecycle.yaml.
const LEGAL = [
  "pending",
  "ready",
  "blocked",
  "claimed",
  "in_progress",
  "in_review",
  "needs_fix",
  "done",
  "cancelled",
  "expired",
];
const TERMINAL = ["done", "cancelled"];

function clean(): DoctorSnapshot {
  return {
    legalStates: LEGAL,
    terminalStates: TERMINAL,
    tasks: [
      { id: "L3-001", status: "done", dependsOn: [], workItemId: "W-1", owner: null },
      { id: "L3-002", status: "claimed", dependsOn: ["L3-001"], workItemId: "W-1", owner: "worker-a" },
    ],
    derived: [
      { path: "task-coverage.md", sourcePath: "tasks.yaml", sourceMtimeMs: 100, derivedMtimeMs: 200 },
    ],
    coverage: [{ requirementId: "SRC-001", taskIds: ["L3-001"] }],
    manifests: [{ name: "lifecycle.yaml", expectedDigest: "abc", actualDigest: "abc" }],
  };
}

function codesOf(s: DoctorSnapshot): string[] {
  return runDoctor(s).map((f) => f.code);
}

describe("doctor core (L3-048)", () => {
  it("clean fixture passes with zero findings", () => {
    assert.deepEqual(runDoctor(clean()), []);
  });

  it("state inconsistency yields doc-invalid-status naming legal states", () => {
    const s = clean();
    s.tasks[0].status = "archived";
    const findings = runDoctor(s);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, "doc-invalid-status");
    assert.equal(findings[0].target, "L3-001");
    assert.equal(findings[0].severity, "error");
    assert.match(findings[0].evidence, /pending/);
  });

  it("terminal task holding a claim yields doc-lifecycle-error", () => {
    const s = clean();
    s.tasks[0].owner = "worker-a";
    const found = runDoctor(s);
    assert.deepEqual(codesOf(s), ["doc-lifecycle-error"]);
    assert.match(found[0].evidence, /worker-a/);
  });

  it("claimed status with no owner yields doc-lifecycle-error", () => {
    const s = clean();
    s.tasks[1].owner = null;
    assert.deepEqual(codesOf(s), ["doc-lifecycle-error"]);
  });

  it("older derived artifact yields doc-stale-derived; fresh one is silent", () => {
    const s = clean();
    s.derived[0].derivedMtimeMs = 50;
    const found = runDoctor(s);
    assert.deepEqual(codesOf(s), ["doc-stale-derived"]);
    assert.equal(found[0].severity, "warning");
    assert.match(found[0].evidence, /regenerate/);
  });

  it("dependency on unknown task yields doc-broken-dep naming the missing id", () => {
    const s = clean();
    s.tasks[1].dependsOn = ["L3-999"];
    const found = runDoctor(s);
    assert.deepEqual(codesOf(s), ["doc-broken-dep"]);
    assert.match(found[0].evidence, /L3-999/);
  });

  it("task with no work-item yields doc-orphan", () => {
    const s = clean();
    s.tasks[1].workItemId = "";
    const found = runDoctor(s);
    assert.deepEqual(codesOf(s), ["doc-orphan"]);
    assert.equal(found[0].target, "L3-002");
  });

  it("requirement with no tasks, or linking unknown tasks, yields doc-missing-coverage", () => {
    const empty = clean();
    empty.coverage = [{ requirementId: "SRC-002", taskIds: [] }];
    assert.deepEqual(codesOf(empty), ["doc-missing-coverage"]);
    const dangling = clean();
    dangling.coverage = [{ requirementId: "SRC-001", taskIds: ["L3-404"] }];
    const found = runDoctor(dangling);
    assert.deepEqual(codesOf(dangling), ["doc-missing-coverage"]);
    assert.match(found[0].evidence, /L3-404/);
  });

  it("duplicate task ids yield doc-conflict", () => {
    const s = clean();
    s.tasks.push({ id: "L3-001", status: "ready", dependsOn: [], workItemId: "W-1", owner: null });
    const found = runDoctor(s);
    assert.deepEqual(codesOf(s), ["doc-conflict"]);
    assert.match(found[0].evidence, /duplicate/i);
  });

  it("manifest digest mismatch yields doc-contract-drift; match is silent", () => {
    const s = clean();
    s.manifests[0].actualDigest = "zzz";
    const found = runDoctor(s);
    assert.deepEqual(codesOf(s), ["doc-contract-drift"]);
    assert.match(found[0].evidence, /lifecycle\.yaml/);
  });

  it("malformed snapshot is rejected", () => {
    const s = clean();
    s.legalStates = [];
    assert.throws(() => runDoctor(s), /legalStates/);
    assert.throws(
      () => runDoctor({ ...clean(), tasks: "nope" } as unknown as DoctorSnapshot),
      /tasks/,
    );
  });
});
