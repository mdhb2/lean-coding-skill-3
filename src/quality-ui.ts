// `ui-quality` native rules (L3-040): LCS3-owned UI checks over caller-supplied
// markup (SRC-047, SRC-048, SRC-050; FR-053; AC-045).
//
// Guardrail: fully offline — no fetch of the external Anti-Slop repository,
// no parity claim with upstream. Rules are adapted principles, owned and
// versioned here. Pure string-in/findings-out: no IO, no state mutation.
// Only runs when the L3-039 resolver selects `ui-quality` for the task.
export interface QualityFinding {
  rule: string;
  line: number;
  message: string;
}

export interface QualityRule {
  id: string;
  description: string;
  check: (content: string, lines: string[]) => QualityFinding[];
}

function imgAlt(): QualityRule {
  return {
    id: "ui-img-alt",
    description: "every <img> carries an alt attribute so images have a text alternative",
    check: (content, lines) => {
      void content;
      const findings: QualityFinding[] = [];
      lines.forEach((line, i) => {
        if (/<img\b/i.test(line) && !/\balt\s*=/i.test(line)) {
          findings.push({
            rule: "ui-img-alt",
            line: i + 1,
            message: "<img> without alt attribute; add alt text or alt=\"\" for decorative images",
          });
        }
      });
      return findings;
    },
  };
}

function buttonLabel(): QualityRule {
  return {
    id: "ui-button-label",
    description: "every <button> exposes an accessible label (text content or aria-label)",
    check: (content, lines) => {
      void lines;
      const findings: QualityFinding[] = [];
      const re = /<button\b([^>]*)>([\s\S]*?)<\/button\s*>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) {
        const attrs = m[1];
        const inner = m[2].replace(/<[^>]*>/g, "").trim();
        if (inner.length === 0 && !/\baria-label\s*=/i.test(attrs)) {
          const line = content.slice(0, m.index).split("\n").length;
          findings.push({
            rule: "ui-button-label",
            line,
            message: "<button> with no text content and no aria-label; add a visible or aria label",
          });
        }
      }
      return findings;
    },
  };
}

export const UI_QUALITY_RULES: QualityRule[] = [imgAlt(), buttonLabel()];

/** Run all `ui-quality` rules over markup. Empty input is valid: no findings. */
export function checkUiQuality(content: string): QualityFinding[] {
  if (typeof content !== "string") throw new Error("quality-ui: content must be a string");
  const lines = content.split("\n");
  return UI_QUALITY_RULES.flatMap((r) => r.check(content, lines)).sort((a, b) => a.line - b.line);
}
