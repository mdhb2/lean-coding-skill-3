import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initProject } from "../src/init.js";
import { validateManifests } from "../src/manifests.js";
import { loadProjectConfig } from "../src/config.js";

const EXPECTED_FILES = [
  ".lcs3/config.yaml",
  ".lcs3/manifests/artifacts.yaml",
  ".lcs3/manifests/lifecycle.yaml",
  ".lcs3/manifests/skills.yaml",
  ".lcs3/manifests/tasks.yaml",
  ".lcs3/manifests/quality.yaml",
];

const EXPECTED_DIRS = [
  ".lcs3",
  ".lcs3/manifests",
  ".lcs3/memory",
  ".lcs3/telemetry",
  ".lcs3/imports/legacy",
  ".lcs3/cache/capsules",
  ".lcs3/cache/traceability",
  ".lcs3/cache/indexes",
  ".lcs3/tmp",
];

function freshDir(): string {
  return mkdtempSync(join(tmpdir(), "lcs3-init-"));
}

describe("lcs3 init", () => {
  it("fresh init succeeds with valid output (AC-001)", () => {
    const dir = freshDir();
    const { created, kept, errors } = initProject(dir);
    assert.deepEqual(errors, []);
    assert.deepEqual(kept, []);
    assert.deepEqual([...created].sort(), [...EXPECTED_FILES].sort());
    for (const d of EXPECTED_DIRS) assert.ok(existsSync(join(dir, d)), `missing dir ${d}`);
    // Output validates through the real validators (L3-009/L3-011).
    assert.deepEqual(validateManifests(join(dir, ".lcs3", "manifests")), []);
    assert.deepEqual(loadProjectConfig(dir).errors, []);
  });

  it("second init is safe and keeps existing files", () => {
    const dir = freshDir();
    const first = initProject(dir);
    assert.deepEqual(first.errors, []);
    const before = EXPECTED_FILES.map((f) => readFileSync(join(dir, f), "utf8"));
    const second = initProject(dir);
    assert.deepEqual(second.errors, []);
    assert.deepEqual(second.created, []);
    assert.deepEqual([...second.kept].sort(), [...EXPECTED_FILES].sort());
    const after = EXPECTED_FILES.map((f) => readFileSync(join(dir, f), "utf8"));
    assert.deepEqual(after, before);
  });

  it("existing .lcs/ does not affect output and is never touched (AC-002/AC-039)", () => {
    const dir = freshDir();
    mkdirSync(join(dir, ".lcs", "work-items"), { recursive: true });
    writeFileSync(join(dir, ".lcs", "state.md"), "legacy state garbage {{{");
    writeFileSync(join(dir, ".lcs", "work-items", "task.md"), "legacy task");
    const { errors } = initProject(dir);
    assert.deepEqual(errors, []);
    assert.equal(readFileSync(join(dir, ".lcs", "state.md"), "utf8"), "legacy state garbage {{{");
    assert.equal(readFileSync(join(dir, ".lcs", "work-items", "task.md"), "utf8"), "legacy task");
  });

  it("malformed existing config fails without overwrite", () => {
    const dir = freshDir();
    mkdirSync(join(dir, ".lcs3"), { recursive: true });
    writeFileSync(join(dir, ".lcs3", "config.yaml"), "workflow: [unclosed\n");
    const { errors } = initProject(dir);
    assert.ok(errors.length > 0, "expected errors for malformed config");
    assert.equal(readFileSync(join(dir, ".lcs3", "config.yaml"), "utf8"), "workflow: [unclosed\n");
  });

  it("malformed existing manifest fails without overwrite", () => {
    const dir = freshDir();
    mkdirSync(join(dir, ".lcs3", "manifests"), { recursive: true });
    writeFileSync(join(dir, ".lcs3", "manifests", "skills.yaml"), "skills: [unclosed\n");
    const { errors } = initProject(dir);
    assert.ok(errors.some((e) => e.file.includes("skills.yaml")));
    assert.equal(
      readFileSync(join(dir, ".lcs3", "manifests", "skills.yaml"), "utf8"),
      "skills: [unclosed\n",
    );
  });

  it("schema-invalid existing config fails without overwrite", () => {
    const dir = freshDir();
    mkdirSync(join(dir, ".lcs3"), { recursive: true });
    const bad = 'schema_version: "1"\nworkflow: {}\n';
    writeFileSync(join(dir, ".lcs3", "config.yaml"), bad);
    const { errors } = initProject(dir);
    assert.ok(errors.length > 0, "expected errors for schema-invalid config");
    assert.equal(readFileSync(join(dir, ".lcs3", "config.yaml"), "utf8"), bad);
  });
});
