import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyWork } from "../src/classification.js";

describe("complexity/risk classification (L3-032, SRC-029/030, AC-015/016)", () => {
  it("low+low takes short path (AC-015)", () => {
    const c = classifyWork({ complexity: "low", risk: "low" });
    assert.equal(c.depth, "short");
    assert.equal(c.requiresDeepPath, false);
    assert.match(c.reason, /short path/);
  });

  it("low-complexity high-risk still requires deep path (AC-016)", () => {
    const c = classifyWork({ complexity: "low", risk: "high" });
    assert.equal(c.depth, "full");
    assert.equal(c.requiresDeepPath, true);
    assert.match(c.reason, /regardless of complexity/);
  });

  it("high complexity requires deep path", () => {
    const c = classifyWork({ complexity: "high", risk: "low" });
    assert.equal(c.depth, "full");
    assert.equal(c.requiresDeepPath, true);
  });

  it("high+high requires deep path", () => {
    const c = classifyWork({ complexity: "high", risk: "high" });
    assert.equal(c.depth, "full");
    assert.equal(c.requiresDeepPath, true);
  });

  it("invalid labels throw actionably, never inferred", () => {
    assert.throws(() => classifyWork({ complexity: "medium" as never, risk: "low" }), /complexity must be/);
    assert.throws(() => classifyWork({ complexity: "low", risk: "medium" as never }), /risk must be/);
  });
});
