// AFK/HITL/retry scenarios (L3-053, SRC-020..023/061/062): routine work
// continues AFK with no confirmation; destructive/credential/business-decision
// stops for HITL; recoverable failures retry within budget; exhaustion and
// credential/spec-ambiguity escalate immediately and never loop as retries.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateAutonomy } from "../../src/autonomy.js";
import { createTask } from "../../src/transitions.js";
import { getRetryState, recordFailure } from "../../src/retries.js";
import { SCENARIO_POLICY, freshScenarioProject } from "./helpers.js";

const ROUTINE = {
  destructive: false,
  credentials: false,
  securityDecision: false,
  businessDecision: false,
  highImpactAmbiguity: false,
  retryExhausted: false,
};

describe("afk/hitl/retry scenarios (L3-053)", () => {
  it("routine implementation continues AFK with no mode confirmation", () => {
    const r = evaluateAutonomy(ROUTINE);
    assert.equal(r.decision, "afk-continue");
    assert.deepEqual(r.triggers, []);
  });

  it("destructive, credential, and business-decision fixtures stop for HITL with triggers", () => {
    const destructive = evaluateAutonomy({ ...ROUTINE, destructive: true });
    assert.equal(destructive.decision, "hitl-stop");
    assert.ok(destructive.triggers.includes("destructive action"));
    const creds = evaluateAutonomy({ ...ROUTINE, credentials: true });
    assert.equal(creds.decision, "hitl-stop");
    assert.ok(creds.triggers.includes("credentials required"));
    const biz = evaluateAutonomy({ ...ROUTINE, businessDecision: true });
    assert.equal(biz.decision, "hitl-stop");
    assert.ok(biz.triggers.includes("business decision"));
  });

  it("recoverable failure retries within budget, then exhausts deterministically", () => {
    const scn = freshScenarioProject("lcs3-scn-retry-");
    createTask(scn.dbPath, "SCN-RETRY-1", "pending", scn.manifestDir);
    const dispositions: string[] = [];
    for (let n = 0; n < 4; n += 1) {
      dispositions.push(recordFailure(scn.dbPath, "SCN-RETRY-1", "implementation", SCENARIO_POLICY).disposition);
    }
    assert.deepEqual(dispositions, ["retry", "retry", "retry", "escalate"]);
    const stored = getRetryState(scn.dbPath, "SCN-RETRY-1");
    assert.equal(stored?.attempts, 4);
    assert.equal(stored?.hitl, true);
  });

  it("credential/spec ambiguity never loops as implementation retry", () => {
    const scn = freshScenarioProject("lcs3-scn-ambig-");
    createTask(scn.dbPath, "SCN-AMBIG-1", "pending", scn.manifestDir);
    createTask(scn.dbPath, "SCN-AMBIG-2", "pending", scn.manifestDir);
    const creds = recordFailure(scn.dbPath, "SCN-AMBIG-1", "credentials", SCENARIO_POLICY);
    assert.equal(creds.disposition, "escalate");
    assert.equal(creds.hitl, true);
    assert.equal(creds.attempts, 1);
    const spec = recordFailure(scn.dbPath, "SCN-AMBIG-2", "specification", SCENARIO_POLICY);
    assert.equal(spec.disposition, "escalate");
    assert.equal(spec.hitl, true);
  });
});
