// Context budget enforcement (L3-028): soft/hard token budgets from .lcs3/config.yaml
// context group (SRC-036, FR-038). Pure, deterministic, no IO.
// Guardrail: never silently drops P0-linked material; soft trims + report,
// hard blocks/escalates.
import type { ContextPolicy } from "./config.js";

// P0 ids from docs/prd.md ledger — 37 ids. ponytail: update when PRD ledger changes.
export const P0_IDS = new Set<string>([
  "SRC-001","SRC-002","SRC-003","SRC-004","SRC-005","SRC-007","SRC-009","SRC-010",
  "SRC-011","SRC-013","SRC-015","SRC-017","SRC-018","SRC-019","SRC-020","SRC-021",
  "SRC-022","SRC-023","SRC-024","SRC-025","SRC-029","SRC-032","SRC-035","SRC-039",
  "SRC-041","SRC-043","SRC-046","SRC-047","SRC-051","SRC-052","SRC-054","SRC-058",
  "SRC-060","SRC-064","SRC-065","SRC-067","SRC-068",
]);

export function isP0(id: string): boolean {
  return P0_IDS.has(id);
}

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

export type BudgetStatus = "within" | "soft_exceeded" | "hard_exceeded";
export type BudgetSignal = "continue" | "trim" | "block";

export interface BudgetCheck {
  tokens: number;
  soft: number;
  hard: number;
  status: BudgetStatus;
  signal: BudgetSignal;
}

function checkPolicy(p: ContextPolicy): void {
  if (typeof p !== "object" || p === null) throw new Error("budget: context policy must be an object");
  if (!Number.isInteger(p.soft_budget_tokens) || p.soft_budget_tokens <= 0) throw new Error("budget: soft_budget_tokens must be a positive integer (FR-038)");
  if (!Number.isInteger(p.hard_budget_tokens) || p.hard_budget_tokens <= 0) throw new Error("budget: hard_budget_tokens must be a positive integer (FR-038)");
  if (p.hard_budget_tokens < p.soft_budget_tokens) throw new Error("budget: hard_budget_tokens must be >= soft_budget_tokens");
}

export function checkContextBudget(policy: ContextPolicy, tokens: number): BudgetCheck {
  checkPolicy(policy);
  if (!Number.isInteger(tokens) || tokens < 0) throw new Error("budget: tokens must be a non-negative integer");
  const soft = policy.soft_budget_tokens;
  const hard = policy.hard_budget_tokens;
  if (tokens > hard) return { tokens, soft, hard, status: "hard_exceeded", signal: "block" };
  if (tokens > soft) return { tokens, soft, hard, status: "soft_exceeded", signal: "trim" };
  return { tokens, soft, hard, status: "within", signal: "continue" };
}

export interface EnforceInput {
  body: string;
  linkedSources: string[];
}

export interface EnforceResult {
  tokens: number;
  check: BudgetCheck;
  preservedP0: string[];
  dropped: string[];
  trimmedBody: string | null;
  report: string;
  blockedReason: string | null;
}

export function enforceContextBudget(policy: ContextPolicy, input: EnforceInput): EnforceResult {
  checkPolicy(policy);
  const tokens = estimateTokens(input.body);
  const check = checkContextBudget(policy, tokens);
  const p0 = [...new Set(input.linkedSources.filter(isP0))].sort();
  const nonP0 = [...new Set(input.linkedSources.filter((id) => !isP0(id)))].sort();

  if (check.status === "within") {
    return {
      tokens, check,
      preservedP0: p0,
      dropped: [],
      trimmedBody: input.body,
      report: `within budget: ${tokens} <= soft ${policy.soft_budget_tokens} (hard ${policy.hard_budget_tokens})`,
      blockedReason: null,
    };
  }

  if (check.status === "soft_exceeded") {
    // controlled trim: drop only non-P0 linked sources from the report/body hint
    // P0 never dropped; if no non-P0 exists, trim is a no-op report.
    const dropped = nonP0;
    let trimmedBody: string;
    if (dropped.length === 0) {
      trimmedBody = input.body;
    } else {
      // remove non-P0 lines from the linked-sources section if present, else keep body as-is
      // minimal deterministic trim: filter lines that exactly match "- <nonP0>"
      const dropSet = new Set(dropped);
      trimmedBody = input.body
        .split("\n")
        .filter((line) => {
          const m = line.match(/^\s*-\s*(SRC-\d+|AC-\d+|TEST-\d+)\s*$/);
          if (!m) return true;
          return !dropSet.has(m[1]);
        })
        .join("\n");
      // if filtering did not change body (no matching lines), keep original
      if (trimmedBody === input.body && dropped.length > 0) {
        // still report dropped ids even when body lacks those literal lines
      }
    }
    const afterTokens = estimateTokens(trimmedBody);
    return {
      tokens, check,
      preservedP0: p0,
      dropped,
      trimmedBody,
      report: `soft budget exceeded: ${tokens} > soft ${policy.soft_budget_tokens}; trimmed ${dropped.length} non-P0 source(s) [${dropped.join(", ")}] -> ${afterTokens} tokens; P0 preserved [${p0.join(", ")}]; hard ${policy.hard_budget_tokens}`,
      blockedReason: null,
    };
  }

  // hard_exceeded -> block, never silently drop P0 to fit
  const wouldNeedToDropP0 = true; // any fit would require dropping P0 or still over
  return {
    tokens, check,
    preservedP0: p0,
    dropped: [],
    trimmedBody: null,
    report: `hard budget exceeded: ${tokens} > hard ${policy.hard_budget_tokens} (soft ${policy.soft_budget_tokens}); blocked — must escalate or reslice, never silently drop P0 [${p0.join(", ")}]`,
    blockedReason: `hard budget ${policy.hard_budget_tokens} exceeded with ${tokens} tokens; P0-linked material [${p0.join(", ")}] cannot be silently dropped (SRC-036)` + (wouldNeedToDropP0 ? "" : ""),
  };
}
