import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkContextBudget, enforceContextBudget, estimateTokens, isP0, P0_IDS } from "../src/budget.js";
import type { ContextPolicy } from "../src/config.js";

const POLICY: ContextPolicy = { selective: true, soft_budget_tokens: 8000, hard_budget_tokens: 32000 };

describe("context budget enforcement (SRC-036, FR-038)", () => {
  it("within soft budget continues with no trimming", () => {
    const body = "hello world";
    const r = enforceContextBudget(POLICY, { body, linkedSources: ["SRC-001", "SRC-036"] });
    assert.equal(r.check.status, "within");
    assert.equal(r.check.signal, "continue");
    assert.deepEqual(r.dropped, []);
    assert.equal(r.trimmedBody, body);
    assert.equal(r.blockedReason, null);
    assert.match(r.report, /within budget/);
  });

  it("soft limit exceeded trims only non-P0 and reports, P0 preserved", () => {
    const p0Line = "- SRC-001\n";
    const nonP0Line = "- SRC-036\n";
    const filler = "x".repeat(8000 * 4); // ~8000 tokens
    const body = `${p0Line}${nonP0Line}${filler}`;
    // body tokens > soft (8000) but < hard (32000) -> soft_exceeded
    const tokens = estimateTokens(body);
    assert.ok(tokens > 8000 && tokens <= 32000, `tokens ${tokens} should be soft-exceeded`);
    const r = enforceContextBudget(POLICY, { body, linkedSources: ["SRC-001", "SRC-036", "SRC-002"] });
    assert.equal(r.check.status, "soft_exceeded");
    assert.equal(r.check.signal, "trim");
    assert.ok(r.preservedP0.includes("SRC-001"), "P0 preserved");
    assert.ok(r.preservedP0.includes("SRC-002"), "P0 SRC-002 preserved");
    assert.ok(!r.preservedP0.includes("SRC-036"), "non-P0 not in preservedP0");
    assert.ok((r.dropped as string[]).includes("SRC-036"), "non-P0 dropped");
    assert.ok(!(r.dropped as string[]).some(isP0), "never drops P0");
    assert.match(r.report, /soft budget exceeded/);
    assert.match(r.report, /P0 preserved/);
    assert.equal(r.blockedReason, null);
    // trimmed body must still contain P0 line, must not contain non-P0 line
    assert.ok(r.trimmedBody !== null && r.trimmedBody.includes("SRC-001"), "trimmed keeps P0");
    assert.ok(r.trimmedBody !== null && !r.trimmedBody.includes("SRC-036"), "trimmed drops non-P0");
  });

  it("soft exceeded with only P0 linked sources trims nothing but still reports", () => {
    const body = "y".repeat(9000 * 4);
    const r = enforceContextBudget(POLICY, { body, linkedSources: ["SRC-001"] });
    assert.equal(r.check.status, "soft_exceeded");
    assert.deepEqual(r.dropped, []);
    assert.equal(r.trimmedBody, body);
    assert.match(r.report, /trimmed 0 non-P0/);
  });

  it("hard limit exceeded blocks and never silently drops P0", () => {
    const body = "z".repeat(33000 * 4); // > hard
    const r = enforceContextBudget(POLICY, { body, linkedSources: ["SRC-001", "SRC-036"] });
    assert.equal(r.check.status, "hard_exceeded");
    assert.equal(r.check.signal, "block");
    assert.equal(r.trimmedBody, null);
    assert.deepEqual(r.dropped, []);
    assert.ok(r.blockedReason !== null && r.blockedReason.includes("P0"), "block reason mentions P0");
    assert.match(r.report, /hard budget exceeded/);
    assert.match(r.report, /blocked/);
    // P0 still reported preserved, not dropped
    assert.ok((r.preservedP0 as string[]).includes("SRC-001"));
    assert.ok(!(r.dropped as string[]).includes("SRC-001"));
  });

  it("estimateTokens and checkContextBudget pure boundaries", () => {
    assert.equal(estimateTokens(""), 0);
    assert.equal(estimateTokens("abcd"), 1);
    assert.equal(estimateTokens("abcde"), 2);
    assert.equal(checkContextBudget(POLICY, 8000).status, "within");
    assert.equal(checkContextBudget(POLICY, 8001).status, "soft_exceeded");
    assert.equal(checkContextBudget(POLICY, 32000).status, "soft_exceeded");
    assert.equal(checkContextBudget(POLICY, 32001).status, "hard_exceeded");
  });

  it("P0 set covers ledger and invalid inputs throw actionably", () => {
    assert.equal(P0_IDS.size, 37);
    assert.equal(isP0("SRC-001"), true);
    assert.equal(isP0("SRC-036"), false);
    assert.throws(() => checkContextBudget({ selective: true, soft_budget_tokens: 0, hard_budget_tokens: 10 } as unknown as ContextPolicy, 5), /soft_budget_tokens must be a positive integer/);
    assert.throws(() => checkContextBudget({ selective: true, soft_budget_tokens: 10, hard_budget_tokens: 5 } as unknown as ContextPolicy, 5), /hard_budget_tokens must be >= soft/);
    assert.throws(() => checkContextBudget(POLICY, -1), /tokens must be a non-negative integer/);
  });
});
