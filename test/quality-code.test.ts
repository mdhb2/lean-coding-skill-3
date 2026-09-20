import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CODE_QUALITY_RULES, checkCodeQuality } from "../src/quality-code.js";

describe("code-quality native rules (SRC-047/048/050, AC-045)", () => {
  it("registry exposes stable rule ids with descriptions", () => {
    assert.deepEqual(
      CODE_QUALITY_RULES.map((r) => r.id),
      ["code-no-todo", "code-no-console"],
    );
    for (const r of CODE_QUALITY_RULES) assert.ok(r.description.length > 0);
  });

  it("clean code passes", () => {
    assert.deepEqual(checkCodeQuality(`const x = 1;\nlogger.info("done");\n`), []);
  });

  it("TODO/FIXME markers are surfaced with line numbers", () => {
    const findings = checkCodeQuality(`const x = 1;\n// TODO: handle this\n// FIXME later`);
    assert.equal(findings.length, 2);
    assert.ok(findings.every((f) => f.rule === "code-no-todo"));
    assert.deepEqual(
      findings.map((f) => f.line),
      [2, 3],
    );
  });

  it("console.log leftovers are surfaced; other console uses pass", () => {
    const findings = checkCodeQuality(`console.log(x);\nconsole.error(y);\n`);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, "code-no-console");
    assert.equal(findings[0].line, 1);
  });

  it("empty input is valid; non-string input fails loudly", () => {
    assert.deepEqual(checkCodeQuality(""), []);
    assert.throws(() => checkCodeQuality(null as unknown as string), /must be a string/);
  });
});
