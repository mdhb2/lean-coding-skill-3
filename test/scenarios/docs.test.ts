// Operator-guide accuracy net (L3-059): the guide must cover all 8 card topics,
// pin load-bearing facts, and document only shipped CLI behavior.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DOCTOR_CODES } from "../../src/doctor.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const GUIDE = readFileSync(join(REPO_ROOT, "docs", "operator-guide.md"), "utf8");

describe("operator guide accuracy (L3-059)", () => {
  it("covers all 8 card topics", () => {
    for (const topic of [
      "## 1. Installation",
      "## 2. Project init",
      "## 3. Authority model",
      "## 4. Worker rules",
      "## 5. Legacy reference and import",
      "## 6. Doctor",
      "## 7. Recovery",
      "## 8. Contribution workflow",
    ]) {
      assert.ok(GUIDE.includes(topic), `guide must cover ${topic}`);
    }
  });

  it("pins load-bearing facts from verified behavior", () => {
    for (const fact of [
      "Node.js >= 22",
      "max_retries: 3",
      "lease_seconds: 600",
      "max_files: 6",
      "400",
      "initProject",
      "validateManifests",
      "claimTask",
      "importLegacyDoc",
      "runDoctor",
      "checkDerivedFileFreshness",
      "js-yaml",
    ]) {
      assert.ok(GUIDE.includes(fact), `guide must pin fact '${fact}'`);
    }
    for (const code of DOCTOR_CODES) {
      assert.equal(DOCTOR_CODES.length, 8, "doctor must define exactly 8 codes");
      assert.ok(GUIDE.includes(code), `guide must list doctor code ${code}`);
    }
  });

  it("documents the local private CLI without promising global installation", () => {
    assert.match(GUIDE, /node dist\/src\/cli\.js/);
    assert.match(GUIDE, /task transition/);
    assert.match(GUIDE, /task claim/);
    assert.ok(!GUIDE.includes("npm i -g"), "no global-install command may be documented");
    assert.ok(GUIDE.includes("private package"), "private distribution boundary must be stated plainly");
  });
});
