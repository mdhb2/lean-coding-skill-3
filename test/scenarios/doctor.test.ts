// Doctor scenarios (L3-057): healthy project is clean, and each of the 8
// deterministic Doctor checks fires its distinct actionable code on a
// defective snapshot — all over the real runDoctor seam (SRC-060, AC-053).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runDoctor } from "../../src/doctor.js";
import type { DoctorSnapshot } from "../../src/doctor.js";

function healthy(): DoctorSnapshot {
  return {
    legalStates: ["pending", "ready", "claimed", "done"],
    terminalStates: ["done"],
    tasks: [{ id: "T1", status: "ready", dependsOn: [], workItemId: "WI-1", owner: null }],
    derived: [],
    coverage: [{ requirementId: "SRC-001", taskIds: ["T1"] }],
    manifests: [{ name: "lifecycle", expectedDigest: "abc", actualDigest: "abc" }],
  };
}

function codes(s: DoctorSnapshot): string[] {
  return runDoctor(s).map((f) => f.code);
}

describe("L3-057 doctor scenarios", () => {
  it("healthy snapshot is doctor-clean", () => {
    assert.deepEqual(runDoctor(healthy()), []);
  });

  it("unknown status fires doc-invalid-status", () => {
    const s = healthy();
    s.tasks[0].status = "bogus";
    assert.deepEqual(codes(s), ["doc-invalid-status"]);
  });

  it("terminal-claimed and ownerless-claimed fire doc-lifecycle-error", () => {
    const s = healthy();
    s.tasks = [
      { id: "T1", status: "done", dependsOn: [], workItemId: "WI-1", owner: "w1" },
      { id: "T2", status: "claimed", dependsOn: [], workItemId: "WI-1", owner: null },
    ];
    s.coverage = [{ requirementId: "SRC-001", taskIds: ["T1", "T2"] }];
    assert.deepEqual(codes(s), ["doc-lifecycle-error", "doc-lifecycle-error"]);
  });

  it("outdated derived artifact fires doc-stale-derived", () => {
    const s = healthy();
    s.derived = [{ path: "capsule-T1.md", sourcePath: "task-T1.md", sourceMtimeMs: 200, derivedMtimeMs: 100 }];
    const findings = runDoctor(s);
    assert.deepEqual(codes(s), ["doc-stale-derived"]);
    assert.equal(findings[0].severity, "warning");
  });

  it("dependency on unknown task fires doc-broken-dep", () => {
    const s = healthy();
    s.tasks[0].dependsOn = ["GHOST"];
    assert.deepEqual(codes(s), ["doc-broken-dep"]);
  });

  it("work-item-less task fires doc-orphan", () => {
    const s = healthy();
    s.tasks[0].workItemId = "";
    assert.deepEqual(codes(s), ["doc-orphan"]);
  });

  it("empty and dangling coverage fire doc-missing-coverage", () => {
    const s = healthy();
    s.coverage = [
      { requirementId: "SRC-001", taskIds: [] },
      { requirementId: "SRC-002", taskIds: ["GHOST"] },
    ];
    assert.deepEqual(codes(s), ["doc-missing-coverage", "doc-missing-coverage"]);
  });

  it("duplicate task id fires doc-conflict", () => {
    const s = healthy();
    s.tasks = [
      { id: "T1", status: "ready", dependsOn: [], workItemId: "WI-1", owner: null },
      { id: "T1", status: "ready", dependsOn: [], workItemId: "WI-1", owner: null },
    ];
    assert.deepEqual(codes(s), ["doc-conflict"]);
  });

  it("drifted manifest digest fires doc-contract-drift", () => {
    const s = healthy();
    s.manifests = [{ name: "lifecycle", expectedDigest: "abc", actualDigest: "zzz" }];
    assert.deepEqual(codes(s), ["doc-contract-drift"]);
  });

  it("doctor is deterministic for a given snapshot", () => {
    const s = healthy();
    s.tasks[0].dependsOn = ["GHOST"];
    assert.deepEqual(runDoctor(s), runDoctor(structuredClone(s)));
  });
});
