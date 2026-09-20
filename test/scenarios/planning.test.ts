// Planning + bug workflow scenarios (L3-052, SRC-029..031/061/062): each route
// matches the approved workflow manifest and preserves evidence. Real seams
// only: routeWork/routeBug over the scenario project's lifecycle.yaml.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canAdvance, nextPhase, routeBug, routeWork } from "../../src/router.js";
import { freshScenarioProject } from "./helpers.js";

describe("planning and bug workflow scenarios (L3-052)", () => {
  it("simple feature takes the short path, complex/high-risk takes full", () => {
    const scn = freshScenarioProject("lcs3-scn-plan-");
    const simple = routeWork(scn.manifestDir, { complexity: "low", risk: "low" });
    const complex = routeWork(scn.manifestDir, { complexity: "high", risk: "high" });
    assert.equal(simple.depth, "short");
    assert.equal(complex.depth, "full");
    assert.ok(complex.path.length > simple.path.length);
    for (const skipped of ["explore", "prd_review", "srs"]) {
      assert.ok(simple.skipped.includes(skipped));
      assert.ok(complex.path.includes(skipped));
    }
    // Walk the short path stepwise: only adjacent-forward advances are legal.
    const [first, second] = [simple.path[0], simple.path[1]];
    assert.equal(nextPhase(simple, first), second);
    assert.ok(canAdvance(simple, first, second));
    assert.equal(canAdvance(simple, first, complex.path.at(-1) as string), false);
  });

  it("low-complexity/high-risk still requires the deep path (risk dominates)", () => {
    const scn = freshScenarioProject("lcs3-scn-risk-");
    const routed = routeWork(scn.manifestDir, { complexity: "low", risk: "high" });
    assert.equal(routed.depth, "full");
    assert.deepEqual(routed.skipped, []);
  });

  it("scoped bug uses the fast lane shorter than short; evidence retained", () => {
    const scn = freshScenarioProject("lcs3-scn-bugfast-");
    const short = routeWork(scn.manifestDir, { complexity: "low", risk: "low" });
    const fast = routeBug(scn.manifestDir, { scoped: true, evidence: ["repro: crash on empty input"] });
    assert.equal(fast.depth, "fast");
    assert.equal(fast.escalated, false);
    assert.ok(fast.path.length < short.path.length);
    assert.deepEqual(fast.evidence, ["repro: crash on empty input"]);
    assert.ok(fast.skipped.includes("prd"));
  });

  it("ambiguous bug escalates to full planning with evidence verbatim", () => {
    const scn = freshScenarioProject("lcs3-scn-bugesc-");
    const evidence = ["stack trace line 42", "missing requirements for retry policy"];
    const escalated = routeBug(scn.manifestDir, { scoped: false, evidence });
    assert.equal(escalated.escalated, true);
    assert.equal(escalated.depth, "full");
    assert.deepEqual(escalated.evidence, evidence);
    assert.deepEqual(escalated.skipped, []);
  });
});
