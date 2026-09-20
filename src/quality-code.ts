// `code-quality` native rules (L3-041): LCS3-owned code hygiene checks over
// caller-supplied source text (SRC-047, SRC-048, SRC-050; FR-053; AC-045).
//
// Same ownership/offline rules as L3-040: no fetch of the external Anti-Slop
// repository, no parity claim — adapted principles owned here. Pure
// string-in/findings-out; only runs when the resolver selects `code-quality`.
import type { QualityFinding, QualityRule } from "./quality-ui.js";

function noTodo(): QualityRule {
  return {
    id: "code-no-todo",
    description: "no TODO/FIXME markers left in submitted code; track them as tasks instead",
    check: (content, lines) => {
      void content;
      const findings: QualityFinding[] = [];
      lines.forEach((line, i) => {
        if (/\b(TODO|FIXME)\b/.test(line)) {
          findings.push({
            rule: "code-no-todo",
            line: i + 1,
            message: "TODO/FIXME marker in code; file a task instead of leaving a marker",
          });
        }
      });
      return findings;
    },
  };
}

function noConsole(): QualityRule {
  return {
    id: "code-no-console",
    description: "no console.log debugging leftovers in submitted code",
    check: (content, lines) => {
      void content;
      const findings: QualityFinding[] = [];
      lines.forEach((line, i) => {
        if (/(^|[^.\w])console\.(log|debug|info)\s*\(/.test(line)) {
          findings.push({
            rule: "code-no-console",
            line: i + 1,
            message: "console.log/debug/info leftover; remove or route through proper logging",
          });
        }
      });
      return findings;
    },
  };
}

export const CODE_QUALITY_RULES: QualityRule[] = [noTodo(), noConsole()];

/** Run all `code-quality` rules over source text. Empty input is valid: no findings. */
export function checkCodeQuality(content: string): QualityFinding[] {
  if (typeof content !== "string") throw new Error("quality-code: content must be a string");
  const lines = content.split("\n");
  return CODE_QUALITY_RULES.flatMap((r) => r.check(content, lines)).sort((a, b) => a.line - b.line);
}
