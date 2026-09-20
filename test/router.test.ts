import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultManifestDir } from "../src/transitions.js";
import {
  assertAdvance,
  canAdvance,
  loadPhases,
  nextPhase,
  routeBug,
  routeWork,
} from "../src/router.js";

const MANIFESTS = defaultManifestDir();

describe("adaptive workflow router (L3-033, SRC-029/030, AC-015/016)", () => {
  it("loads canonical phases from lifecycle.yaml in order", () => {
    const phases = loadPhases(MANIFESTS);
    assert.deepEqual(phases, [
      "idle",
      "new",
      "explore",
      "prd",
      "prd_review",
      "srs",
      "tasks",
      "execution",
      "code_review",
      "finalization",
    ]);
  });

  it("simple/low-risk takes short path skipping deep-only phases (AC-015)", () => {
    const r = routeWork(MANIFESTS, { complexity: "low", risk: "low" });
    assert.equal(r.depth, "short");
    assert.deepEqual(r.path, ["idle", "new", "prd", "tasks", "execution", "code_review", "finalization"]);
    assert.deepEqual(r.skipped, ["explore", "prd_review", "srs"]);
  });

  it("complex/high-risk takes the full path (AC-015)", () => {
    const r = routeWork(MANIFESTS, { complexity: "high", risk: "high" });
    assert.equal(r.depth, "full");
    assert.equal(r.path.length, 10);
    assert.deepEqual(r.skipped, []);
  });

  it("low-complexity/high-risk takes the full path — risk dominates (AC-016)", () => {
    const r = routeWork(MANIFESTS, { complexity: "low", risk: "high" });
    assert.equal(r.depth, "full");
    assert.ok(r.path.includes("explore") && r.path.includes("srs"));
  });

  it("paths differ between short and full (AC-015)", () => {
    const short = routeWork(MANIFESTS, { complexity: "low", risk: "low" });
    const full = routeWork(MANIFESTS, { complexity: "high", risk: "low" });
    assert.notDeepEqual(short.path, full.path);
  });

  it("invalid labels throw, never inferred", () => {
    assert.throws(
      () => routeWork(MANIFESTS, { complexity: "medium" as never, risk: "low" }),
      /complexity must be/,
    );
  });

  it("missing manifest throws actionably", () => {
    assert.throws(() => routeWork("/no/such/dir", { complexity: "low", risk: "low" }), /missing canonical manifest/);
  });

  it("adjacent forward advance is legal; skips/backward rejected", () => {
    const r = routeWork(MANIFESTS, { complexity: "low", risk: "low" });
    assert.equal(canAdvance(r, "new", "prd"), true);
    assert.equal(canAdvance(r, "new", "explore"), false);
    assert.equal(canAdvance(r, "prd", "new"), false);
    assert.equal(canAdvance(r, "new", "tasks"), false);
    assert.throws(() => assertAdvance(r, "new", "explore"), /legal next: 'prd'/);
    assertAdvance(r, "new", "prd");
  });

  it("short path never walks a skipped phase", () => {
    const r = routeWork(MANIFESTS, { complexity: "low", risk: "low" });
    for (const s of r.skipped) {
      assert.throws(() => nextPhase(r, s), /unknown phase/);
    }
    assert.equal(nextPhase(r, "finalization"), null);
    assert.throws(() => assertAdvance(r, "finalization", "idle"), /final phase/);
  });
});

describe("bug fast-lane routing (L3-034, SRC-031, AC-017/AC-018)", () => {
  it("scoped bug takes fast lane shorter than short, skipping prd too (AC-017)", () => {
    const short = routeWork(MANIFESTS, { complexity: "low", risk: "low" });
    const bug = routeBug(MANIFESTS, { scoped: true, evidence: ["repro: crash on empty input"] });
    assert.equal(bug.depth, "fast");
    assert.equal(bug.escalated, false);
    assert.ok(bug.skipped.includes("prd"));
    assert.ok(bug.path.length < short.path.length);
  });

  it("ambiguous bug escalates to full path retaining evidence verbatim (AC-018)", () => {
    const evidence = ["stack trace line 42", "user report #7"];
    const bug = routeBug(MANIFESTS, { scoped: false, evidence });
    assert.equal(bug.depth, "full");
    assert.equal(bug.escalated, true);
    assert.deepEqual(bug.evidence, evidence);
    assert.equal(bug.path.length, 10);
  });

  it("empty evidence rejected on escalation (AC-018)", () => {
    assert.throws(() => routeBug(MANIFESTS, { scoped: false, evidence: [] }), /non-empty evidence/);
  });

  it("invalid scoped flag rejected, never inferred", () => {
    assert.throws(
      () => routeBug(MANIFESTS, { scoped: "yes" as never, evidence: ["x"] }),
      /scoped must be a boolean/,
    );
  });
});
