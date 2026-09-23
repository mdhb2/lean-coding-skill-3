// Packaging and skill-distribution contract (L3-058): the npm `files`
// allowlist is the approved distribution boundary. Verified by running the
// real `npm pack --dry-run` and asserting on its listing — no aspirational
// install commands. The executable entry is a private local/package contract;
// it does not authorize publishing while package.json remains private.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { load as yamlLoad } from "js-yaml";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function readPackageJson(): Record<string, unknown> {
  return JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as Record<string, unknown>;
}

function packListing(): string {
  return execSync("npm pack --dry-run 2>&1", { cwd: REPO_ROOT, encoding: "utf8" });
}

describe("packaging contract (L3-058, SRC-004..SRC-006, SRC-064)", () => {
  it("files allowlist covers dist/skills/docs and excludes raw sources", () => {
    const pkg = readPackageJson();
    assert.ok(Array.isArray(pkg.files), "package.json must declare a files allowlist");
    const files = pkg.files as string[];
    for (const entry of ["dist/", "skills/", "docs/", "README.md"]) {
      assert.ok(files.includes(entry), `files allowlist must include ${entry}`);
    }
    assert.ok(!files.some((f) => f === "src/" || f.startsWith("src/")), "raw src/ must not ship");
    assert.ok(!files.some((f) => f.includes("reference")), "legacy reference must not ship");
  });

  it("dry-run tarball ships skills+docs, excludes legacy reference and raw sources", () => {
    const out = packListing();
    for (const entry of [
      "skills/lcs3-master/SKILL.md",
      "skills/lcs3-wizard/SKILL.md",
      "docs/ac-coverage.md",
      "package.json",
      "dist/src/cli.js",
    ]) {
      assert.ok(out.includes(entry), `tarball must contain ${entry}`);
    }
    for (const banned of [" reference/", " thoughts/", "/.lcs/"]) {
      assert.ok(!out.includes(banned), `tarball must not contain ${banned.trim()}`);
    }
    const rawTs = out.split("\n").filter((l) => /(^|\s)src\/[^ ]*\.ts(\s|$)/.test(l) && !l.includes("dist/src"));
    assert.deepEqual(rawTs, [], `tarball must not contain raw src/*.ts: ${rawTs.join("; ")}`);
  });

  it("no legacy runtime dependency is bundled", () => {
    const pkg = readPackageJson();
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    assert.deepEqual(Object.keys(deps).sort(), ["js-yaml"], "only approved runtime dependency allowed");
    for (const name of Object.keys(deps)) {
      assert.ok(!name.includes("lcs") || name === "lcs3", `dependency '${name}' must not be legacy LCS`);
    }
  });

  it("every registered skill is discoverable as skills/<name>/SKILL.md", () => {
    const registry = yamlLoad(
      readFileSync(join(REPO_ROOT, ".lcs3", "manifests", "skills.yaml"), "utf8"),
    ) as { skills: Array<{ name: string }> };
    assert.equal(registry.skills.length, 18, "registry must hold exactly 18 skills");
    for (const s of registry.skills) {
      assert.ok(
        existsSync(join(REPO_ROOT, "skills", s.name, "SKILL.md")),
        `registered skill '${s.name}' must ship skills/${s.name}/SKILL.md`,
      );
    }
    const dirs = readdirSync(join(REPO_ROOT, "skills"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    assert.deepEqual(
      dirs,
      registry.skills.map((s) => s.name).sort(),
      "skills/ directory must match the registry exactly",
    );
  });

  it("declares executable CLI inside the private package boundary", () => {
    const pkg = readPackageJson();
    assert.equal(pkg.private, true, "CLI wiring must not change package publication status");
    assert.deepEqual(pkg.bin, { lcs3: "./dist/src/cli.js" });
  });
});
