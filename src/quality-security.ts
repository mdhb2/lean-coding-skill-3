// `security-basic` native rules (L3-042): lightweight approved baseline checks
// over caller-supplied text/config (SRC-047, SRC-048, SRC-050; FR-053; AC-045).
//
// Guardrail: surfaces representative unsafe configuration/actions only —
// never claims to replace domain security review. Same ownership/offline
// rules as L3-040/L3-041: no Anti-Slop fetch, pure string-in/findings-out,
// only runs when the resolver selects `security-basic`.
import type { QualityFinding, QualityRule } from "./quality-ui.js";

function hardcodedSecret(): QualityRule {
  return {
    id: "sec-no-hardcoded-secret",
    description: "no hardcoded secret assignments (password/api_key/secret/token) in submitted text",
    check: (content, lines) => {
      void content;
      const findings: QualityFinding[] = [];
      lines.forEach((line, i) => {
        if (/\b(password|api[_-]?key|secret|token)\s*[:=]\s*["'][^"']+["']/i.test(line)) {
          findings.push({
            rule: "sec-no-hardcoded-secret",
            line: i + 1,
            message: "possible hardcoded secret; load credentials from the environment, never commit values",
          });
        }
      });
      return findings;
    },
  };
}

function httpUrl(): QualityRule {
  return {
    id: "sec-no-http-url",
    description: "no plaintext http:// endpoint URLs where https is expected",
    check: (content, lines) => {
      void content;
      const findings: QualityFinding[] = [];
      lines.forEach((line, i) => {
        if (/http:\/\/[^\s"']+/i.test(line)) {
          findings.push({
            rule: "sec-no-http-url",
            line: i + 1,
            message: "plaintext http:// URL; prefer https for network endpoints",
          });
        }
      });
      return findings;
    },
  };
}

export const SECURITY_BASIC_RULES: QualityRule[] = [hardcodedSecret(), httpUrl()];

/** Run all `security-basic` rules. Empty input is valid: no findings. */
export function checkSecurityBasic(content: string): QualityFinding[] {
  if (typeof content !== "string") throw new Error("quality-security: content must be a string");
  const lines = content.split("\n");
  return SECURITY_BASIC_RULES.flatMap((r) => r.check(content, lines)).sort((a, b) => a.line - b.line);
}
