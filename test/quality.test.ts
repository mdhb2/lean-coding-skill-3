import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadOverlayRegistry, resolveOverlays } from "../src/quality.js";
import { defaultManifestDir } from "../src/transitions.js";

const DIR = defaultManifestDir();
const ALL = ["ui-quality", "code-quality", "security-basic"];

describe("quality overlay registry/resolver (SRC-049/051, AC-043/044/046)", () => {
  it("registry exposes the three native overlays with selective loading", () => {
    const reg = loadOverlayRegistry(DIR);
    assert.deepEqual(
      reg.overlays.map((o) => o.name),
      ALL,
    );
    assert.equal(reg.loading, "selective");
  });

  it("backend-only task (code concern) does not load ui-quality (AC-044)", () => {
    const reg = loadOverlayRegistry(DIR);
    const selected = resolveOverlays(reg, { concerns: ["code"] }, ALL);
    assert.deepEqual(selected, ["code-quality"]);
  });

  it("relevant UI task does load ui-quality", () => {
    const reg = loadOverlayRegistry(DIR);
    const selected = resolveOverlays(reg, { concerns: ["ui", "code"] }, ALL);
    assert.deepEqual(selected, ["ui-quality", "code-quality"]);
  });

  it("selection differs by concern (AC-043); unknown concerns select nothing", () => {
    const reg = loadOverlayRegistry(DIR);
    assert.deepEqual(resolveOverlays(reg, { concerns: ["security"] }, ALL), ["security-basic"]);
    assert.deepEqual(resolveOverlays(reg, { concerns: ["billing"] }, ALL), []);
    assert.deepEqual(resolveOverlays(reg, { concerns: [] }, ALL), []);
  });

  it("task-declared opt-in loads an overlay outside its concerns; unknown names fail", () => {
    const reg = loadOverlayRegistry(DIR);
    assert.deepEqual(resolveOverlays(reg, { concerns: ["code"], declared: ["security-basic"] }, ALL), [
      "code-quality",
      "security-basic",
    ]);
    assert.throws(() => resolveOverlays(reg, { concerns: [], declared: ["nope"] }, ALL), /unknown overlay 'nope'/);
  });

  it("config-disabled overlay never loads even when relevant", () => {
    const reg = loadOverlayRegistry(DIR);
    assert.deepEqual(resolveOverlays(reg, { concerns: ["ui"] }, ["code-quality"]), []);
  });

  it("missing or malformed registry fails loudly, never silently empty", () => {
    assert.throws(() => loadOverlayRegistry("/nonexistent-dir"), /missing canonical manifest/);
  });
});
