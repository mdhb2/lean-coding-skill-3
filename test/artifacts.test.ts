import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getArtifactAuthority,
  parseArtifact,
  validateArtifactContent,
} from "../src/artifacts.js";

const MANIFESTS = new URL("../../.lcs3/manifests", import.meta.url).pathname;
const PRD = new URL("../../docs/prd.md", import.meta.url).pathname;

function prd(): string {
  return readFileSync(PRD, "utf8");
}

describe("artifact parser/validator", () => {
  it("valid canonical prd.md passes", () => {
    assert.deepEqual(validateArtifactContent(prd(), MANIFESTS), []);
  });

  it("missing frontmatter delimiters fails", () => {
    assert.ok(
      validateArtifactContent("# no frontmatter\n", MANIFESTS).some((e) =>
        e.message.includes("missing frontmatter")
      ),
    );
  });

  it("malformed frontmatter YAML fails", () => {
    const bad = "---\ntitle: [unclosed\n---\nbody\n";
    assert.ok(
      validateArtifactContent(bad, MANIFESTS).some((e) => e.message.includes("malformed frontmatter")),
    );
  });

  it("missing required field fails", () => {
    const stripped = prd().replace(/^artifact_type:.*\n/m, "");
    assert.ok(
      validateArtifactContent(stripped, MANIFESTS).some((e) =>
        e.message.includes("missing required field 'artifact_type'")
      ),
    );
  });

  it("unknown artifact_type fails", () => {
    const bad = prd().replace("artifact_type: prd", "artifact_type: bogus_type");
    assert.ok(
      validateArtifactContent(bad, MANIFESTS).some((e) => e.message.includes("unknown artifact_type")),
    );
  });

  it("`type` on non-state artifact fails", () => {
    const bad = prd().replace("artifact_type: prd", "artifact_type: prd\ntype: prd");
    assert.ok(
      validateArtifactContent(bad, MANIFESTS).some((e) => e.message.includes("`type` forbidden")),
    );
  });

  it("task execution vocab in artifact status fails (AC-014)", () => {
    const bad = prd().replace("status: draft", "status: pending");
    assert.ok(
      validateArtifactContent(bad, MANIFESTS).some((e) => e.message.includes("status must be one of")),
    );
  });

  it("task artifact without task_status fails", () => {
    const bad = prd()
      .replace("artifact_type: prd", "artifact_type: task")
      .replace("status: draft", "status: draft");
    assert.ok(
      validateArtifactContent(bad, MANIFESTS).some((e) => e.message.includes("requires task_status")),
    );
  });

  it("task_status on non-task artifact fails (AC-014)", () => {
    const bad = prd().replace("status: draft", "status: draft\ntask_status: pending");
    assert.ok(
      validateArtifactContent(bad, MANIFESTS).some((e) => e.message.includes("only allowed on artifact_type task")),
    );
  });

  it("canonical vs derived authority distinguishable (AC-009)", () => {
    assert.equal(getArtifactAuthority("prd", MANIFESTS), "canonical");
    assert.equal(getArtifactAuthority("traceability", MANIFESTS), "derived");
    assert.equal(getArtifactAuthority("task_coverage", MANIFESTS), "derived");
    assert.equal(getArtifactAuthority("no_such_type", MANIFESTS), undefined);
  });

  it("parseArtifact never reads IDs from prose body", () => {
    const content = prd() + "\nSRC-999 FAKE-ID task_status: pending\n";
    const { parsed, errors } = parseArtifact(content);
    assert.deepEqual(errors, []);
    assert.ok(parsed);
    assert.ok(!("SRC-999" in (parsed.data as Record<string, unknown>)));
  });
});
