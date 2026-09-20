import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerRecipe } from "../src/recipes.js";
import { runTargetedGate, runFinalGate } from "../src/gates.js";

describe("targeted task gate (L3-030, SRC-037, AC-033)", () => {
  let dir: string;
  let a: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lcs3-gates-"));
    a = join(dir, "a.txt");
    writeFileSync(a, "v1");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("passing command passes and records exact command/output/status", () => {
    registerRecipe(dir, { name: "ok", command: "node -e \"console.log('gate-ok')\"", verified: true, sources: [a] });
    const r = runTargetedGate(dir, "ok");
    assert.equal(r.gate, "targeted");
    assert.equal(r.status, "pass");
    assert.equal(r.command, "node -e \"console.log('gate-ok')\"");
    assert.equal(r.exitCode, 0);
    assert.match(r.output, /gate-ok/);
    assert.equal(r.reason, null);
  });

  it("failing command fails the gate", () => {
    registerRecipe(dir, { name: "bad", command: "node -e \"process.exit(3)\"", verified: true, sources: [a] });
    const r = runTargetedGate(dir, "bad");
    assert.equal(r.status, "fail");
    assert.equal(r.exitCode, 3);
    assert.equal(r.command, "node -e \"process.exit(3)\"");
    assert.ok(r.reason);
  });

  it("stale or missing recipe blocks, never executes", () => {
    registerRecipe(dir, { name: "stale", command: "node -e \"console.log('must-not-run')\"", verified: true, sources: [a] });
    writeFileSync(a, "v2");
    const s = runTargetedGate(dir, "stale");
    assert.equal(s.status, "blocked");
    assert.match(s.reason ?? "", /upstream changed/);
    assert.equal(s.output, "");
    const m = runTargetedGate(dir, "nope");
    assert.equal(m.status, "blocked");
    assert.match(m.reason ?? "", /not found/);
  });
});

describe("work-item final gate (L3-031, SRC-037, AC-034)", () => {
  let dir: string;
  let a: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lcs3-final-"));
    a = join(dir, "a.txt");
    writeFileSync(a, "v1");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("broader suite runs all recipes; targeted pass cannot substitute failed final", () => {
    registerRecipe(dir, { name: "t-ok", command: "node -e \"console.log('t-ok')\"", verified: true, sources: [a] });
    registerRecipe(dir, { name: "f-bad", command: "node -e \"process.exit(2)\"", verified: true, sources: [a] });
    const targeted = runTargetedGate(dir, "t-ok");
    assert.equal(targeted.status, "pass");
    const final = runFinalGate(dir, ["t-ok", "f-bad"]);
    assert.equal(final.gate, "final");
    assert.equal(final.status, "fail");
    assert.equal(final.results.length, 2);
    assert.ok(final.results.every((r) => r.gate === "final"));
    assert.ok(final.reason);
  });

  it("all-pass broader suite passes; stale member blocks final gate", () => {
    registerRecipe(dir, { name: "a", command: "node -e \"console.log('a')\"", verified: true, sources: [a] });
    registerRecipe(dir, { name: "b", command: "node -e \"console.log('b')\"", verified: true, sources: [a] });
    const pass = runFinalGate(dir, ["a", "b"]);
    assert.equal(pass.status, "pass");
    assert.equal(pass.results.length, 2);
    writeFileSync(a, "v2");
    const blocked = runFinalGate(dir, ["a", "b"]);
    assert.equal(blocked.status, "blocked");
    assert.match(blocked.reason ?? "", /blocked/);
  });

  it("empty recipe list is blocked — final gate must be broader", () => {
    const r = runFinalGate(dir, []);
    assert.equal(r.status, "blocked");
    assert.match(r.reason ?? "", /non-empty/);
  });
});
