import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as adr from "../src/adr.js";
import {
  ADR_AUTHORITY,
  ADR_CANDIDATE_STATUS,
  ADR_SCHEMA_VERSION,
  bootstrapAdrDatabase,
  defaultAdrDbPath,
  getCandidate,
  listCandidates,
  makeCandidateId,
  proposeCandidate,
} from "../src/adr.js";

function freshDb(): string {
  const dir = mkdtempSync(join(tmpdir(), "lcs3-adr-"));
  const dbPath = join(dir, "adr-candidates.db");
  const res = bootstrapAdrDatabase(dbPath);
  assert.deepEqual(res.errors, []);
  return dbPath;
}

describe("L3-044 ADR promotion candidate flow (SRC-056)", () => {
  it("bootstraps a versioned candidate database under the memory scope", () => {
    const dir = mkdtempSync(join(tmpdir(), "lcs3-adr-boot-"));
    assert.equal(defaultAdrDbPath(dir), join(dir, ".lcs3/memory/adr-candidates.db"));
    const res = bootstrapAdrDatabase(defaultAdrDbPath(dir));
    assert.deepEqual(res.errors, []);
    assert.equal(res.version, ADR_SCHEMA_VERSION);
  });

  it("proposed candidate keeps candidate status and retains source evidence", () => {
    const dbPath = freshDb();
    const got = proposeCandidate(dbPath, {
      title: "Adopt scope-based overlay loading",
      summary: "Load quality overlays only when task concerns match their scope.",
      evidence: [{ kind: "memory", id: "MEM-abc123", note: "repeated overload observed" }],
      nowMs: 1_700_000_000_000,
    });
    assert.equal(got.status, ADR_CANDIDATE_STATUS);
    assert.deepEqual(got.evidence, [{ kind: "memory", id: "MEM-abc123", note: "repeated overload observed" }]);
    const reread = getCandidate(dbPath, got.id);
    assert.deepEqual(reread, got);
  });

  it("candidate ids are deterministic for identical title and summary", () => {
    assert.equal(makeCandidateId("T", "S"), makeCandidateId("T", "S"));
    assert.notEqual(makeCandidateId("T", "S"), makeCandidateId("T", "other"));
  });

  it("rejects evidence-free proposals so sourceless decisions cannot surface", () => {
    const dbPath = freshDb();
    assert.throws(() => proposeCandidate(dbPath, { title: "T", summary: "S", evidence: [] }), /source evidence/);
    assert.throws(() => proposeCandidate(dbPath, { title: "  ", summary: "S", evidence: [{ kind: "memory", id: "MEM-x" }] }), /title/);
    assert.throws(
      () => proposeCandidate(dbPath, { title: "T", summary: "S", evidence: [{ kind: "rumor" as never, id: "x" }] }),
      /evidence kind/,
    );
  });

  it("re-proposing refreshes evidence but never leaves candidate status", () => {
    const dbPath = freshDb();
    const first = proposeCandidate(dbPath, {
      title: "T",
      summary: "S",
      evidence: [{ kind: "work-item", id: "WI-1" }],
      nowMs: 1000,
    });
    const second = proposeCandidate(dbPath, {
      title: "T",
      summary: "S",
      evidence: [{ kind: "work-item", id: "WI-1" }, { kind: "canonical", id: "SRC-056" }],
      nowMs: 2000,
    });
    assert.equal(first.id, second.id);
    assert.equal(second.status, "candidate");
    assert.equal(second.createdAt, first.createdAt);
    assert.equal(second.evidence.length, 2);
  });

  it("exposes no approve/promote path: worker can propose and read only", () => {
    const names = new Set(Object.keys(adr));
    for (const forbidden of ["approveCandidate", "promoteCandidate", "approveAdr", "promoteAdr", "applyCandidate"]) {
      assert.equal(names.has(forbidden), false, `${forbidden} must not exist on the worker-visible surface`);
    }
    assert.equal(ADR_AUTHORITY, "candidate-only");
  });

  it("lists candidates and returns null for unknown ids", () => {
    const dbPath = freshDb();
    assert.deepEqual(listCandidates(dbPath), []);
    assert.equal(getCandidate(dbPath, "ADRC-missing"), null);
    proposeCandidate(dbPath, { title: "A", summary: "a", evidence: [{ kind: "memory", id: "MEM-1" }] });
    proposeCandidate(dbPath, { title: "B", summary: "b", evidence: [{ kind: "memory", id: "MEM-2" }] });
    assert.equal(listCandidates(dbPath).length, 2);
  });
});
