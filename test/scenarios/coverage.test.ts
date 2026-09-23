// AC coverage sweep scenarios (L3-057): every AC-001..AC-065 carries live
// evidence, every P0 SRC traces to tests/validation, and derived
// task-coverage regenerates from canonical frontmatter — missing coverage
// fails, per the L3-057 guardrail (SRC-060..SRC-062, AC-001..AC-065).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AC_COVERAGE, P0_SRCS, checkAcCoverage, renderAcCoverage } from "../../src/ac-coverage.js";
import { generateTaskCoverage } from "../../src/coverage.js";
import { freshScenarioProject } from "./helpers.js";

/** Walk up from this file until package.json — robust from src or dist. */
function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("coverage: repo root not found");
    dir = parent;
  }
}

describe("L3-057 acceptance coverage sweep", () => {
  it("table holds exactly AC-001..AC-065 with no gaps or duplicates", () => {
    const r = checkAcCoverage(repoRoot());
    assert.deepEqual(r.missingAc, []);
    assert.deepEqual(r.duplicateAc, []);
    assert.equal(AC_COVERAGE.length, 65);
  });

  it("every AC has evidence or an explicit blocked reason, and all evidence exists", () => {
    const r = checkAcCoverage(repoRoot());
    assert.deepEqual(r.unevidencedAc, []);
    assert.deepEqual(r.missingEvidence, []);
  });

  it("every P0 SRC traces to evidenced ACs", () => {
    const r = checkAcCoverage(repoRoot());
    assert.deepEqual(r.uncoveredP0, []);
    assert.equal(P0_SRCS.length, 37);
  });

  it("report renders all 65 ACs deterministically", () => {
    const root = repoRoot();
    const first = renderAcCoverage(root);
    const second = renderAcCoverage(root, checkAcCoverage(root));
    assert.equal(first, second);
    for (const a of AC_COVERAGE) assert.ok(first.includes(`| ${a.id} |`), a.id);
    assert.ok(first.includes("No gaps"));
  });

  it("AC-003 verifies namespace isolation and primary CLI entry point", () => {
    const row = AC_COVERAGE.find((a) => a.id === "AC-003");
    assert.deepEqual(row?.srcs, ["SRC-004", "SRC-005"]);
    assert.deepEqual(row?.evidence, ["package.json", "test/scenarios/cli.test.ts", "test/scenarios/packaging.test.ts", "test/init.test.ts"]);
    assert.equal(row?.blocked, undefined);
    const r = checkAcCoverage(repoRoot());
    assert.deepEqual(r.blocked, []);
    assert.ok(renderAcCoverage(repoRoot(), r).includes("| AC-003 | SRC-004, SRC-005 | package.json, test/scenarios/cli.test.ts"));
  });

  it("derived task coverage regenerates from canonical task frontmatter (AC-010)", () => {
    const scn = freshScenarioProject("lcs3-scn-ac-");
    const wiDir = join(scn.projectRoot, "wi-1");
    mkdirSync(join(wiDir, "task"), { recursive: true });
    const fm = (id: string, covers: string) =>
      `---\nartifact_id: ${id}\ncovers:\n${covers}tests:\n  - AC-001\n---\nbody\n`;
    writeFileSync(join(wiDir, "task", "task-a.md"), fm("TASK-A", "  - SRC-001\n"), "utf8");
    writeFileSync(join(wiDir, "task", "task-b.md"), fm("TASK-B", "  - SRC-001\n  - SRC-002\n"), "utf8");
    const out = join(wiDir, "task-coverage.md");
    const v1 = generateTaskCoverage(wiDir, out, scn.manifestDir);
    assert.deepEqual(v1.bySrc["SRC-001"], ["TASK-A", "TASK-B"]);
    assert.deepEqual(v1.bySrc["SRC-002"], ["TASK-B"]);
    assert.deepEqual(v1.byTest["AC-001"], ["TASK-A", "TASK-B"]);
    assert.equal(existsSync(out), true);
    const v2 = generateTaskCoverage(wiDir, out, scn.manifestDir);
    assert.deepEqual(v2, v1);
  });
});
