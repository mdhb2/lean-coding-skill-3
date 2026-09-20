import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadProjectConfig, validateConfig } from "../src/config.js";

const ROOT = new URL("../../", import.meta.url).pathname;
const VALID = readFileSync(join(ROOT, ".lcs3", "config.yaml"), "utf8");

function tmpRootWith(configBody: string): string {
  const dir = mkdtempSync(join(tmpdir(), "lcs3-config-"));
  mkdirSync(join(dir, ".lcs3"), { recursive: true });
  writeFileSync(join(dir, ".lcs3", "config.yaml"), configBody);
  return dir;
}

function replace(body: string, from: string, to: string): string {
  assert.ok(body.includes(from), `fixture anchor missing: ${from}`);
  return body.replace(from, to);
}

describe("project config loader", () => {
  it("valid repo config loads", () => {
    const { config, errors } = loadProjectConfig(ROOT);
    assert.deepEqual(errors, []);
    assert.ok(config);
    assert.equal(config.schema_version, "1");
    assert.equal(config.workflow.routing, "complexity_risk");
    assert.equal(config.context.selective, true);
    assert.equal(config.quality.loading, "selective");
  });

  it("missing config reports actionable error", () => {
    const dir = mkdtempSync(join(tmpdir(), "lcs3-config-missing-"));
    const { config, errors } = loadProjectConfig(dir);
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("lcs3 init")));
  });

  it("malformed YAML fails", () => {
    const { config, errors } = loadProjectConfig(tmpRootWith("workflow: [unclosed\n"));
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("malformed YAML")));
  });

  it("unknown group fails", () => {
    const { config, errors } = validateConfig({
      schema_version: "1",
      bogus_group: {},
    });
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("unknown config group 'bogus_group'")));
  });

  it("unknown key fails", () => {
    const body = replace(VALID, "bug_fast_lane: true", "bug_fast_lane: true\n  bogus_key: 1");
    const { config, errors } = loadProjectConfig(tmpRootWith(body));
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("unknown key 'workflow.bogus_key'")));
  });

  it("invalid max_retries fails", () => {
    const body = replace(VALID, "max_retries: 3", "max_retries: 0");
    const { config, errors } = loadProjectConfig(tmpRootWith(body));
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("execution.max_retries")));
  });

  it("non-selective context fails", () => {
    const body = replace(VALID, "selective: true", "selective: false");
    const { config, errors } = loadProjectConfig(tmpRootWith(body));
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("context.selective")));
  });

  it("hard budget below soft budget fails", () => {
    const body = replace(VALID, "hard_budget_tokens: 32000", "hard_budget_tokens: 100");
    const { config, errors } = loadProjectConfig(tmpRootWith(body));
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("hard_budget_tokens")));
  });

  it("unknown overlay fails", () => {
    const body = replace(
      VALID,
      "overlays: [ui-quality, code-quality, security-basic]",
      "overlays: [ui-quality, bogus-overlay]",
    );
    const { config, errors } = loadProjectConfig(tmpRootWith(body));
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("quality.overlays")));
  });

  it("invalid failure taxonomy fails", () => {
    const body = replace(VALID, "failure_taxonomy: [implementation,", "failure_taxonomy: [bogus_failure,");
    const { config, errors } = loadProjectConfig(tmpRootWith(body));
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("execution.failure_taxonomy")));
  });

  it("missing group fails", () => {
    const { config, errors } = validateConfig({ schema_version: "1" });
    assert.equal(config, null);
    assert.ok(errors.some((e) => e.message.includes("missing required config group 'workflow'")));
  });
});
