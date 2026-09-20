import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateManifests } from "../src/manifests.js";

const SOURCE = new URL("../../.lcs3/manifests", import.meta.url).pathname;

function freshCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), "lcs3-manifests-"));
  cpSync(SOURCE, dir, { recursive: true });
  return dir;
}

function edit(dir: string, file: string, fn: (s: string) => string): void {
  const p = join(dir, file);
  writeFileSync(p, fn(readFileSync(p, "utf8")));
}

describe("manifests validator", () => {
  it("valid manifests pass", () => {
    const errors = validateManifests(freshCopy());
    assert.deepEqual(errors, []);
  });

  it("malformed enum fails (unknown task state)", () => {
    const dir = freshCopy();
    edit(dir, "lifecycle.yaml", (s) => s.replace("pending,", "bogus_state,"));
    const errors = validateManifests(dir);
    assert.ok(errors.some((e) => e.message.includes("missing state 'pending'")));
  });

  it("duplicate artifact_type fails", () => {
    const dir = freshCopy();
    edit(dir, "artifacts.yaml", (s) =>
      s.replace("# Required frontmatter", "  - name: prd\n    authority: canonical\n    cot_level: standard\n# Required frontmatter"),
    );
    const errors = validateManifests(dir);
    assert.ok(errors.some((e) => e.message.includes("duplicate artifact_type 'prd'")));
  });

  it("missing required manifest fails", () => {
    const dir = freshCopy();
    rmSync(join(dir, "tasks.yaml"));
    const errors = validateManifests(dir);
    assert.ok(errors.some((e) => e.message.includes("missing required manifest")));
  });

  it("contradictory lifecycle fails (terminal with outgoing edge)", () => {
    const dir = freshCopy();
    edit(dir, "lifecycle.yaml", (s) => s.replace("- { from: expired, to: ready }", "- { from: done, to: ready }"));
    const errors = validateManifests(dir);
    assert.ok(errors.some((e) => e.message.includes("terminal state 'done'")));
  });

  it("cross-talk fails (task state in artifact status)", () => {
    const dir = freshCopy();
    edit(dir, "lifecycle.yaml", (s) => s.replace("states: [draft, reviewed, active, archived]", "states: [draft, reviewed, active, archived, pending]"));
    const errors = validateManifests(dir);
    assert.ok(errors.some((e) => e.message.includes("AC-006")));
  });
});
