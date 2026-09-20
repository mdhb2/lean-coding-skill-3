// Legacy isolation scenarios (L3-056, recovered by L3-057 sweep): coexisting
// .lcs/ state stays inert, eligible docs import byte-identical as
// reference-only searchable material, and legacy runtime sources are refused
// — all over the real legacy-import seams (SRC-041..SRC-045, AC-039..AC-042).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getLegacyImport,
  importLegacyDoc,
  listLegacyImports,
  searchLegacyImports,
} from "../../src/legacy-import.js";
import { freshScenarioProject } from "./helpers.js";

function legacyDoc(dir: string, name: string, body: string): string {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, name);
  writeFileSync(p, body, "utf8");
  return p;
}

describe("L3-056 legacy isolation scenarios", () => {
  it("coexisting .lcs/ state does not alter LCS3 import behavior (AC-039)", () => {
    const scn = freshScenarioProject("lcs3-scn-legacy-coex-");
    mkdirSync(join(scn.projectRoot, ".lcs"), { recursive: true });
    writeFileSync(join(scn.projectRoot, ".lcs", "state.md"), "# legacy runtime state\n", "utf8");
    const src = legacyDoc(join(scn.projectRoot, "legacy-docs"), "guide.md", "# guide\nusable behavior\n");
    const rec = importLegacyDoc({ projectDir: scn.projectRoot, sourcePath: src });
    assert.equal(rec.scope, "reference");
    assert.ok(rec.storedRel.startsWith(".lcs3/imports/legacy/"));
    assert.ok(!rec.storedRel.includes(".lcs/") || rec.storedRel.includes(".lcs3/"));
    assert.equal(listLegacyImports(scn.projectRoot).length, 1);
  });

  it("eligible docs import byte-identical and stay searchable (AC-040..AC-042)", () => {
    const scn = freshScenarioProject("lcs3-scn-legacy-idx-");
    const body = "# archive\nsearchable phrase seven-seven\n";
    const src = legacyDoc(join(scn.projectRoot, "legacy-docs"), "archive.md", body);
    const rec = importLegacyDoc({ projectDir: scn.projectRoot, sourcePath: src });
    assert.equal(readFileSync(join(scn.projectRoot, rec.storedRel), "utf8"), body);
    assert.deepEqual(getLegacyImport(scn.projectRoot, rec.id)?.digest, rec.digest);
    const hits = searchLegacyImports({ projectDir: scn.projectRoot, query: "seven-seven" });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, rec.id);
    assert.ok(hits[0].snippet.includes("seven-seven"));
  });

  it("legacy runtime sources are refused (SRC-043)", () => {
    const scn = freshScenarioProject("lcs3-scn-legacy-refuse-");
    const lcsState = legacyDoc(join(scn.projectRoot, ".lcs"), "state.md", "# active\n");
    assert.throws(
      () => importLegacyDoc({ projectDir: scn.projectRoot, sourcePath: lcsState }),
      /\.lcs\/ is never eligible/,
    );
    const notMd = legacyDoc(join(scn.projectRoot, "legacy-docs"), "runbook.txt", "x\n");
    assert.throws(
      () => importLegacyDoc({ projectDir: scn.projectRoot, sourcePath: notMd }),
      /only Markdown/,
    );
    const ownState = legacyDoc(join(scn.projectRoot, ".lcs3", "notes"), "n.md", "y\n");
    assert.throws(
      () => importLegacyDoc({ projectDir: scn.projectRoot, sourcePath: ownState }),
      /\.lcs3\/ is never eligible/,
    );
    assert.deepEqual(listLegacyImports(scn.projectRoot), []);
  });

  it("read-only sources import without mutation", () => {
    const scn = freshScenarioProject("lcs3-scn-legacy-ro-");
    const src = legacyDoc(join(scn.projectRoot, "legacy-docs"), "ro.md", "# frozen\n");
    chmodSync(src, 0o444);
    try {
      const rec = importLegacyDoc({ projectDir: scn.projectRoot, sourcePath: src });
      assert.equal(readFileSync(src, "utf8"), "# frozen\n");
      assert.equal(getLegacyImport(scn.projectRoot, rec.id)?.sourcePath, src);
    } finally {
      chmodSync(src, 0o644);
    }
  });

  it("repeated import of the same doc is idempotent", () => {
    const scn = freshScenarioProject("lcs3-scn-legacy-dedupe-");
    const src = legacyDoc(join(scn.projectRoot, "legacy-docs"), "same.md", "# same\n");
    const first = importLegacyDoc({ projectDir: scn.projectRoot, sourcePath: src, nowMs: 1000 });
    const second = importLegacyDoc({ projectDir: scn.projectRoot, sourcePath: src, nowMs: 2000 });
    assert.equal(first.id, second.id);
    assert.equal(listLegacyImports(scn.projectRoot).length, 1);
  });
});
