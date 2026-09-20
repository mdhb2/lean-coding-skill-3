import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { validateManifests } from "../src/manifests.js";
import { loadProjectConfig } from "../src/config.js";
import { initProject } from "../src/init.js";

// Anchor from GATE-01: exactly 18 skills. Hardcoded here on purpose —
// if validator + manifest drift together, this independent anchor still fails.
const EXPECTED_SKILL_COUNT = 18;

const ROOT = new URL("../../", import.meta.url).pathname;
const MANIFESTS = join(ROOT, ".lcs3", "manifests");

// Every file initProject generates must stay byte-identical to the repo
// canonical copy. Edit one without the other => drift => this suite fails.
const GENERATED = [
  ".lcs3/config.yaml",
  ".lcs3/manifests/artifacts.yaml",
  ".lcs3/manifests/lifecycle.yaml",
  ".lcs3/manifests/skills.yaml",
  ".lcs3/manifests/tasks.yaml",
  ".lcs3/manifests/quality.yaml",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function names(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((e) => (isRecord(e) && typeof e.name === "string" ? e.name : undefined))
    .filter((n): n is string => typeof n === "string");
}

function freshManifestCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), "lcs3-drift-"));
  cpSync(MANIFESTS, dir, { recursive: true });
  return dir;
}

describe("contract drift regression (AC-004/005/006/054/056)", () => {
  it("canonical repo manifests + config pass validators (AC-004)", () => {
    assert.deepEqual(validateManifests(MANIFESTS), []);
    assert.deepEqual(loadProjectConfig(ROOT).errors, []);
  });

  it("init templates byte-identical to repo canonical files (AC-005)", () => {
    const dir = mkdtempSync(join(tmpdir(), "lcs3-drift-init-"));
    const { errors } = initProject(dir);
    assert.deepEqual(errors, []);
    for (const rel of GENERATED) {
      const fromInit = readFileSync(join(dir, rel), "utf8");
      const fromRepo = readFileSync(join(ROOT, rel), "utf8");
      assert.equal(fromInit, fromRepo, `drift: init template vs repo ${rel}`);
    }
  });

  it("config overlays agree with quality.yaml registry (AC-005 cross-file)", () => {
    const quality = yamlLoad(readFileSync(join(MANIFESTS, "quality.yaml"), "utf8"));
    const config = yamlLoad(readFileSync(join(ROOT, ".lcs3", "config.yaml"), "utf8"));
    assert.ok(isRecord(quality) && isRecord(config) && isRecord(config.quality));
    const registry = names(quality.overlays);
    const configured = config.quality.overlays;
    assert.ok(Array.isArray(configured));
    for (const o of configured) {
      assert.ok(typeof o === "string" && registry.includes(o), `config overlay '${String(o)}' missing from quality.yaml`);
    }
    const skills = yamlLoad(readFileSync(join(MANIFESTS, "skills.yaml"), "utf8"));
    assert.ok(isRecord(skills) && Array.isArray(skills.skills));
    assert.equal(skills.skills.length, EXPECTED_SKILL_COUNT);
  });

  it("manifest missing a skill fails validation (AC-056)", () => {
    const dir = freshManifestCopy();
    const p = join(dir, "skills.yaml");
    const text = readFileSync(p, "utf8");
    const stripped = text.replace("  - name: lcs3-wizard\n    source: lcs-wizard\n    role: hitl\n", "");
    assert.ok(stripped.length < text.length, "wizard entry not found");
    writeFileSync(p, stripped);
    const errors = validateManifests(dir);
    assert.ok(errors.some((e) => e.message.includes("expected 18 skills")));
  });

  it("config with unknown group fails validation (AC-056)", () => {
    const dir = mkdtempSync(join(tmpdir(), "lcs3-drift-config-"));
    const { errors } = initProject(dir);
    assert.deepEqual(errors, []);
    const p = join(dir, ".lcs3", "config.yaml");
    writeFileSync(p, `${readFileSync(p, "utf8")}\ncustom_group:\n  foo: true\n`);
    assert.ok(
      loadProjectConfig(dir).errors.some((e) => e.message.includes("unknown config group")),
    );
  });

  it("corrupted init output fails validators (AC-056 template mismatch)", () => {
    const dir = mkdtempSync(join(tmpdir(), "lcs3-drift-corrupt-"));
    const { errors } = initProject(dir);
    assert.deepEqual(errors, []);
    // Simulate template/manifest disagreement: duplicate an artifact type.
    const p = join(dir, ".lcs3", "manifests", "artifacts.yaml");
    writeFileSync(
      p,
      readFileSync(p, "utf8").replace(
        "  - name: prd_enhanced",
        "  - name: prd\n    authority: canonical\n    cot_level: standard\n  - name: prd_enhanced",
      ),
    );
    const manifestErrors = validateManifests(join(dir, ".lcs3", "manifests"));
    assert.ok(manifestErrors.some((e) => e.message.includes("duplicate artifact_type 'prd'")));
  });
});
