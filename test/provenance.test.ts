import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serializeArtifact, writeDerivedArtifact } from "../src/artifacts.js";
import { buildProvenance, checkDerivedFileFreshness, digestContent, isStale } from "../src/provenance.js";

const MANIFESTS = new URL("../../.lcs3/manifests", import.meta.url).pathname;

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "lcs3-prov-test-"));
}

describe("provenance", () => {
  it("digestContent stable", () => {
    assert.equal(digestContent("hello"), digestContent("hello"));
    assert.notEqual(digestContent("hello"), digestContent("hello2"));
  });

  it("unchanged source stays fresh; upstream change marks stale (L3-024)", () => {
    const dir = tmp();
    const src = join(dir, "src.md");
    writeFileSync(src, "v1", "utf8");
    const prov = buildProvenance([src]);
    const derived = join(dir, "derived.md");
    const fm = {
      title: "t",
      format_version: "okf/0.2",
      authors: [{ type: "agent", name: "x" }],
      created: "2026-09-20",
      updated: "2026-09-20",
      artifact_type: "traceability",
      source: src,
      cot_level: "strict",
      provenance: prov,
    } as Record<string, unknown>;
    const errs = writeDerivedArtifact(derived, fm, "body", MANIFESTS);
    assert.deepEqual(errs, []);
    assert.deepEqual(checkDerivedFileFreshness(derived), { fresh: true, reason: null });
    writeFileSync(src, "v2 changed", "utf8");
    const r = checkDerivedFileFreshness(derived);
    assert.equal(r.fresh, false);
    assert.equal(r.reason, "upstream changed");
  });

  it("isStale pure: identical digests fresh, different stale", () => {
    assert.equal(isStale([{ source: "a", digest: "d1" }], [{ source: "a", digest: "d1" }]), false);
    assert.equal(isStale([{ source: "a", digest: "d1" }], [{ source: "a", digest: "d2" }]), true);
  });

  it("missing provenance -> not fresh", () => {
    const dir = tmp();
    const src = join(dir, "src.md");
    writeFileSync(src, "v1", "utf8");
    const derived = join(dir, "d2.md");
    writeFileSync(
      derived,
      serializeArtifact(
        {
          title: "t",
          format_version: "okf/0.2",
          authors: [{ type: "agent", name: "x" }],
          created: "2026-09-20",
          updated: "2026-09-20",
          artifact_type: "traceability",
          source: src,
          cot_level: "strict",
        },
        "body",
      ),
      "utf8",
    );
    const r = checkDerivedFileFreshness(derived);
    assert.equal(r.fresh, false);
    assert.equal(r.reason, "missing provenance");
  });
});
