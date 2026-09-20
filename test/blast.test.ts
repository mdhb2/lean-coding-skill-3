import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertBlastBudget, checkBlastRadius } from "../src/blast.js";
import type { RiskPolicy } from "../src/config.js";

const BUDGET: RiskPolicy = { max_files: 6, max_loc: 400, on_exceed: "escalate_or_reslice" };

describe("blast-radius budget tracking (SRC-028, AC-028)", () => {
  it("below-budget impact continues with no exceeded dimensions", () => {
    const check = assertBlastBudget(BUDGET, { files: 3, loc: 120 });
    assert.equal(check.withinBudget, true);
    assert.deepEqual(check.exceeded, []);
    assert.equal(check.signal, "continue");
    assert.deepEqual(check.budget, { max_files: 6, max_loc: 400 });
  });

  it("exactly-at-budget counts as within budget", () => {
    const check = checkBlastRadius(BUDGET, { files: 6, loc: 400 });
    assert.equal(check.withinBudget, true);
    assert.equal(check.signal, "continue");
  });

  it("above-budget files emit the configured escalation signal", () => {
    const check = checkBlastRadius(BUDGET, { files: 7, loc: 100 });
    assert.equal(check.withinBudget, false);
    assert.deepEqual(check.exceeded, ["files"]);
    assert.equal(check.signal, "escalate_or_reslice");
    assert.throws(
      () => assertBlastBudget(BUDGET, { files: 7, loc: 100 }),
      /files 7 > budget 6.*escalate_or_reslice.*never silently expand/,
    );
  });

  it("above-budget loc emits the configured signal; both dimensions reported together", () => {
    const check = checkBlastRadius(BUDGET, { files: 9, loc: 500 });
    assert.deepEqual(check.exceeded, ["files", "loc"]);
    assert.throws(
      () => assertBlastBudget(BUDGET, { files: 9, loc: 500 }),
      /files 9 > budget 6.*loc 500 > budget 400/,
    );
  });

  it("signal follows on_exceed policy per budget config", () => {
    const escalate: RiskPolicy = { max_files: 6, max_loc: 400, on_exceed: "escalate" };
    assert.equal(checkBlastRadius(escalate, { files: 7, loc: 0 }).signal, "escalate");
    const reslice: RiskPolicy = { max_files: 6, max_loc: 400, on_exceed: "reslice" };
    assert.equal(checkBlastRadius(reslice, { files: 0, loc: 401 }).signal, "reslice");
  });

  it("invalid budget and observed counts fail with actionable errors", () => {
    assert.throws(
      () => checkBlastRadius({ max_files: 0, max_loc: 400, on_exceed: "escalate" }, { files: 1, loc: 1 }),
      /max_files must be a positive integer/,
    );
    assert.throws(
      () => checkBlastRadius({ max_files: 6, max_loc: 400, on_exceed: "page-someone" } as unknown as RiskPolicy, { files: 1, loc: 1 }),
      /on_exceed must be escalate, reslice, or escalate_or_reslice/,
    );
    assert.throws(() => checkBlastRadius(BUDGET, { files: -1, loc: 0 }), /files must be a non-negative integer/);
    assert.throws(() => checkBlastRadius(BUDGET, { files: 1.5, loc: 0 }), /files must be a non-negative integer/);
    assert.throws(() => checkBlastRadius(BUDGET, { files: 0, loc: -5 }), /loc must be a non-negative integer/);
  });
});
