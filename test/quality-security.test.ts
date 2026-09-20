import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SECURITY_BASIC_RULES, checkSecurityBasic } from "../src/quality-security.js";

describe("security-basic native rules (SRC-047/048/050, AC-045)", () => {
  it("registry exposes stable rule ids with descriptions", () => {
    assert.deepEqual(
      SECURITY_BASIC_RULES.map((r) => r.id),
      ["sec-no-hardcoded-secret", "sec-no-http-url"],
    );
    for (const r of SECURITY_BASIC_RULES) assert.ok(r.description.length > 0);
  });

  it("representative unsafe configuration is surfaced", () => {
    const findings = checkSecurityBasic(`password = "hunter2"\nendpoint = "http://api.local/x"\n`);
    assert.equal(findings.length, 2);
    assert.equal(findings[0].rule, "sec-no-hardcoded-secret");
    assert.equal(findings[0].line, 1);
    assert.equal(findings[1].rule, "sec-no-http-url");
    assert.equal(findings[1].line, 2);
  });

  it("irrelevant checks are not injected: safe config passes clean", () => {
    assert.deepEqual(checkSecurityBasic(`endpoint = "https://api.local/x"\nretries = 3\n`), []);
  });

  it("empty input is valid; non-string input fails loudly", () => {
    assert.deepEqual(checkSecurityBasic(""), []);
    assert.throws(() => checkSecurityBasic(42 as unknown as string), /must be a string/);
  });
});
