import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UI_QUALITY_RULES, checkUiQuality } from "../src/quality-ui.js";

describe("ui-quality native rules (SRC-047/048/050, AC-045)", () => {
  it("registry exposes stable rule ids with descriptions; no network use", () => {
    assert.deepEqual(
      UI_QUALITY_RULES.map((r) => r.id),
      ["ui-img-alt", "ui-button-label"],
    );
    for (const r of UI_QUALITY_RULES) assert.ok(r.description.length > 0);
  });

  it("good markup passes clean", () => {
    const findings = checkUiQuality(
      `<img src="a.png" alt="logo">\n<button aria-label="close">×</button>\n<button>Save</button>`,
    );
    assert.deepEqual(findings, []);
  });

  it("img without alt is surfaced with a line number", () => {
    const findings = checkUiQuality(`<p>ok</p>\n<img src="x.png">`);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, "ui-img-alt");
    assert.equal(findings[0].line, 2);
  });

  it("button without label is surfaced; labelled buttons pass", () => {
    const findings = checkUiQuality(`<button></button>`);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, "ui-button-label");
    assert.equal(findings[0].line, 1);
  });

  it("empty input is valid; non-string input fails loudly", () => {
    assert.deepEqual(checkUiQuality(""), []);
    assert.throws(() => checkUiQuality(undefined as unknown as string), /must be a string/);
  });
});
