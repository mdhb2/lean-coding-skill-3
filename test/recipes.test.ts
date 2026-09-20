import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerRecipe, getRecipe, checkRecipeFreshness, listRecipes } from "../src/recipes.js";

describe("verification recipe registry (SRC-038, AC-035)", () => {
  let dir: string;
  let a: string;
  let b: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "lcs3-recipes-"));
    a = join(dir, "a.txt");
    b = join(dir, "b.txt");
    writeFileSync(a, "v1");
    writeFileSync(b, "v1");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("verified recipe persists and fresh reused", () => {
    const r = registerRecipe(dir, { name: "typecheck", command: "npm run typecheck", verified: true, sources: [a] });
    assert.equal(r.verified, true);
    const got = getRecipe(dir, "typecheck");
    assert.ok(got && got.command === "npm run typecheck");
    const fresh = checkRecipeFreshness(dir, "typecheck");
    assert.equal(fresh.fresh, true);
    assert.equal(listRecipes(dir).length, 1);
  });

  it("upstream change makes recipe stale", () => {
    registerRecipe(dir, { name: "build", command: "npm run build", verified: true, sources: [a, b] });
    assert.equal(checkRecipeFreshness(dir, "build").fresh, true);
    writeFileSync(a, "v2");
    const stale = checkRecipeFreshness(dir, "build");
    assert.equal(stale.fresh, false);
    assert.match(stale.reason ?? "", /upstream changed/);
  });

  it("missing upstream not fresh", () => {
    registerRecipe(dir, { name: "lint", command: "npm run lint", verified: true, sources: [a] });
    rmSync(a);
    const c = checkRecipeFreshness(dir, "lint");
    assert.equal(c.fresh, false);
    assert.match(c.reason ?? "", /upstream not found/);
  });

  it("unverified command never promoted", () => {
    assert.throws(
      () => registerRecipe(dir, { name: "test", command: "npm test", verified: false as unknown as boolean, sources: [a] }),
      /unverified.*cannot be promoted/,
    );
    assert.equal(getRecipe(dir, "test"), null);
  });

  it("invalid name/command/sources throw actionably", () => {
    assert.throws(() => registerRecipe(dir, { name: "", command: "x", verified: true, sources: [a] }), /name must be/);
    assert.throws(() => registerRecipe(dir, { name: "x", command: "", verified: true, sources: [a] }), /command must be/);
    assert.throws(() => registerRecipe(dir, { name: "x", command: "x", verified: true, sources: [] }), /sources must be/);
    assert.throws(() => registerRecipe(dir, { name: "x", command: "x", verified: true, sources: [join(dir, "nope")] }), /source not found/);
  });
});
