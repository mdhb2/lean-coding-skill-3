import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateAutonomy } from "../src/autonomy.js";

const ROUTINE = {
  destructive: false,
  credentials: false,
  securityDecision: false,
  businessDecision: false,
  highImpactAmbiguity: false,
  retryExhausted: false,
};

describe("AFK/HITL policy evaluator (L3-035, SRC-020/023, AC-019/023)", () => {
  it("routine implementation continues AFK with no mode confirmation (AC-019)", () => {
    const r = evaluateAutonomy(ROUTINE);
    assert.equal(r.decision, "afk-continue");
    assert.deepEqual(r.triggers, []);
  });

  it("destructive action stops for HITL with concrete trigger (AC-023)", () => {
    const r = evaluateAutonomy({ ...ROUTINE, destructive: true });
    assert.equal(r.decision, "hitl-stop");
    assert.deepEqual(r.triggers, ["destructive action"]);
  });

  it("credentials stop for HITL (AC-023)", () => {
    const r = evaluateAutonomy({ ...ROUTINE, credentials: true });
    assert.equal(r.decision, "hitl-stop");
    assert.ok(r.triggers.includes("credentials required"));
  });

  it("security/business decision stops for HITL (AC-023)", () => {
    const sec = evaluateAutonomy({ ...ROUTINE, securityDecision: true });
    assert.equal(sec.decision, "hitl-stop");
    const biz = evaluateAutonomy({ ...ROUTINE, businessDecision: true });
    assert.equal(biz.decision, "hitl-stop");
  });

  it("high-impact ambiguity and retry exhaustion stop for HITL (AC-023)", () => {
    const amb = evaluateAutonomy({ ...ROUTINE, highImpactAmbiguity: true });
    assert.equal(amb.decision, "hitl-stop");
    const exh = evaluateAutonomy({ ...ROUTINE, retryExhausted: true });
    assert.equal(exh.decision, "hitl-stop");
  });

  it("multiple triggers all cited; non-boolean flags rejected, never inferred", () => {
    const r = evaluateAutonomy({ ...ROUTINE, destructive: true, credentials: true });
    assert.equal(r.decision, "hitl-stop");
    assert.deepEqual(r.triggers, ["destructive action", "credentials required"]);
    assert.throws(
      () => evaluateAutonomy({ ...ROUTINE, destructive: "yes" as never }),
      /must be a boolean/,
    );
  });
});
