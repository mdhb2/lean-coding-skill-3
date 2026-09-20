// Blast-radius budget tracking (L3-020): compare observed implementation impact
// against the configured task budget (risk.max_files / risk.max_loc, SRC-028,
// FR-022, AC-028) and emit a deterministic escalation signal when exceeded.
//
// Guardrail: this module never reslices, mutates task state, or touches the
// runtime database — it only produces a signal. Acting on the signal
// (escalation to a human gate, reslicing into smaller tasks) is the caller's
// job, per the approved lifecycle contract (blocked + escalation, never silent
// expansion).
import type { RiskPolicy } from "./config.js";

export type BlastDimension = "files" | "loc";

export interface ObservedImpact {
  files: number;
  loc: number;
}

export interface BlastCheck {
  withinBudget: boolean;
  exceeded: BlastDimension[];
  observed: ObservedImpact;
  budget: { max_files: number; max_loc: number };
  signal: "continue" | RiskPolicy["on_exceed"];
}

const SIGNALS = ["escalate", "reslice", "escalate_or_reslice"] as const;

function isNonNegativeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function checkRisk(risk: RiskPolicy): void {
  if (typeof risk !== "object" || risk === null) {
    throw new Error("blast: risk budget must be an object with max_files, max_loc, on_exceed");
  }
  if (!isPositiveInt(risk.max_files)) {
    throw new Error("blast: risk.max_files must be a positive integer (SRC-028 blast budget)");
  }
  if (!isPositiveInt(risk.max_loc)) {
    throw new Error("blast: risk.max_loc must be a positive integer (SRC-028 blast budget)");
  }
  if (!SIGNALS.includes(risk.on_exceed)) {
    throw new Error("blast: risk.on_exceed must be escalate, reslice, or escalate_or_reslice (FR-022)");
  }
}

function checkObserved(observed: ObservedImpact): void {
  if (typeof observed !== "object" || observed === null) {
    throw new Error("blast: observed impact must be an object with files and loc counts");
  }
  if (!isNonNegativeInt(observed.files)) {
    throw new Error("blast: observed files must be a non-negative integer file count");
  }
  if (!isNonNegativeInt(observed.loc)) {
    throw new Error("blast: observed loc must be a non-negative integer line count");
  }
}

/**
 * Compare observed impact to budget. At exactly the budget counts as within —
 * only strictly-greater exceeds. Pure: no IO, no state mutation.
 */
export function checkBlastRadius(risk: RiskPolicy, observed: ObservedImpact): BlastCheck {
  checkRisk(risk);
  checkObserved(observed);
  const exceeded: BlastDimension[] = [];
  if (observed.files > risk.max_files) exceeded.push("files");
  if (observed.loc > risk.max_loc) exceeded.push("loc");
  const withinBudget = exceeded.length === 0;
  return {
    withinBudget,
    exceeded,
    observed: { files: observed.files, loc: observed.loc },
    budget: { max_files: risk.max_files, max_loc: risk.max_loc },
    signal: withinBudget ? "continue" : risk.on_exceed,
  };
}

/** Throw with actionable error when impact exceeds budget; otherwise return the check. */
export function assertBlastBudget(risk: RiskPolicy, observed: ObservedImpact): BlastCheck {
  const check = checkBlastRadius(risk, observed);
  if (!check.withinBudget) {
    const details = check.exceeded
      .map((d) =>
        d === "files"
          ? `files ${observed.files} > budget ${risk.max_files}`
          : `loc ${observed.loc} > budget ${risk.max_loc}`,
      )
      .join("; ");
    throw new Error(
      `blast: impact exceeds budget on ${details}; signal '${check.signal}' — escalate or reslice the task, never silently expand scope (SRC-028/AC-028)`,
    );
  }
  return check;
}
