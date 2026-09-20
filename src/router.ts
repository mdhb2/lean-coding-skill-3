// Adaptive workflow router (L3-033): route using the approved workflow manifest
// (lifecycle.yaml workflow_phases) plus the classification outcome (SRC-029,
// SRC-030; FR-026/FR-027, AC-015/AC-016). Manifest read only; no other IO.
// Guardrail: never infers complexity/risk — caller supplies labels via
// classifyWork, which validates them. Risk dominates end-to-end (AC-016).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { classifyWork, type ClassificationInput, type WorkflowDepth } from "./classification.js";
import { defaultManifestDir } from "./transitions.js";

export interface Route {
  depth: WorkflowDepth | "fast";
  path: string[];
  skipped: string[];
  reason: string;
}

// ponytail: fixed deep-only set from FR-027 wording ("review/specification" steps
// plus ambiguity-driven explore); promote to a manifest workflow_paths table if
// product needs configurable paths.
const DEEP_ONLY: readonly string[] = ["explore", "prd_review", "srs"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Load the canonical ordered phase list. Throws on missing/malformed manifest. */
export function loadPhases(manifestDir: string): string[] {
  const path = join(manifestDir, "lifecycle.yaml");
  if (!existsSync(path)) throw new Error(`router: missing canonical manifest at ${path}`);
  let data: unknown;
  try {
    data = yamlLoad(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`router: malformed lifecycle.yaml at ${path}: ${(e as Error).message}`);
  }
  if (!isRecord(data) || !Array.isArray(data.workflow_phases) || data.workflow_phases.length === 0)
    throw new Error(`router: lifecycle.yaml at ${path} needs a non-empty workflow_phases list`);
  if (!data.workflow_phases.every((p) => typeof p === "string"))
    throw new Error(`router: workflow_phases must all be strings in ${path}`);
  return data.workflow_phases as string[];
}

/** Route work: full depth takes every manifest phase in order; short depth skips
 * the deep-only phases but keeps manifest order. Deep-only names must exist in
 * the manifest or routing is meaningless — fail loudly, never silently equal. */
export function routeWork(manifestDir: string, input: ClassificationInput): Route {
  const c = classifyWork(input);
  const phases = loadPhases(manifestDir);
  if (c.depth === "full") {
    return { depth: "full", path: phases, skipped: [], reason: c.reason };
  }
  const missing = DEEP_ONLY.filter((p) => !phases.includes(p));
  if (missing.length > 0)
    throw new Error(
      `router: manifest workflow_phases missing deep-only phase(s) ${missing.join(", ")}; short path would silently equal full path`,
    );
  const deep = new Set(DEEP_ONLY);
  const path = phases.filter((p) => !deep.has(p));
  return { depth: "short", path, skipped: [...DEEP_ONLY], reason: c.reason };
}

export interface BugInput {
  scoped: boolean;
  evidence: string[];
}

export interface BugRoute extends Route {
  escalated: boolean;
  evidence: string[];
}

// ponytail: fixed fast skip = deep-only plus prd (scoped bug has repro, no
// planning needed); promote to manifest workflow_paths table if configurable.
const FAST_SKIP: readonly string[] = [...DEEP_ONLY, "prd"];

function checkEvidence(evidence: unknown): asserts evidence is string[] {
  if (!Array.isArray(evidence) || !evidence.every((e) => typeof e === "string" && e.length > 0))
    throw new Error("router: bug evidence must be a list of non-empty strings (AC-018)");
}

/** Route a bug (SRC-031, FR-028, AC-017/AC-018). Scoped bug takes the fast
 * lane (shorter than short: skips explore/prd_review/srs plus prd). Ambiguous
 * bug escalates to the full planning path with its evidence retained verbatim —
 * escalation never drops evidence. Caller supplies scoped flag; never inferred. */
export function routeBug(manifestDir: string, input: BugInput): BugRoute {
  if (typeof input !== "object" || input === null)
    throw new Error("router: bug input must be an object with scoped and evidence");
  if (typeof input.scoped !== "boolean")
    throw new Error('router: bug scoped must be a boolean (caller-supplied, never inferred)');
  checkEvidence(input.evidence);
  const phases = loadPhases(manifestDir);
  if (input.scoped) {
    const missing = FAST_SKIP.filter((p) => !phases.includes(p));
    if (missing.length > 0)
      throw new Error(
        `router: manifest workflow_phases missing fast-skipped phase(s) ${missing.join(", ")}; fast lane would silently equal a longer path`,
      );
    const skip = new Set(FAST_SKIP);
    return {
      depth: "fast",
      path: phases.filter((p) => !skip.has(p)),
      skipped: [...FAST_SKIP],
      reason: "scoped bug uses fast lane (AC-017)",
      escalated: false,
      evidence: [...input.evidence],
    };
  }
  if (input.evidence.length === 0)
    throw new Error("router: ambiguous bug escalation requires non-empty evidence (AC-018)");
  const { reason } = classifyWork({ complexity: "high", risk: "high" });
  return {
    depth: "full",
    path: phases,
    skipped: [],
    reason: `ambiguous bug escalated to full planning path; ${reason}`,
    escalated: true,
    evidence: [...input.evidence],
  };
}
export function nextPhase(route: Route, from: string): string | null {
  const i = route.path.indexOf(from);
  if (i === -1)
    throw new Error(`router: unknown phase '${from}'; routed path: ${route.path.join(", ")}`);
  return i + 1 < route.path.length ? route.path[i + 1] : null;
}

/** Pure check: only the adjacent forward step in the routed path is legal. */
export function canAdvance(route: Route, from: string, to: string): boolean {
  return nextPhase(route, from) === to;
}

/** Throw with actionable error (incl. legal next phase) on illegal advance. */
export function assertAdvance(route: Route, from: string, to: string): void {
  const next = nextPhase(route, from);
  if (next === to) return;
  if (next === null)
    throw new Error(`router: illegal phase transition '${from}' → '${to}': '${from}' is the final phase`);
  throw new Error(`router: illegal phase transition '${from}' → '${to}'; legal next: '${next}'`);
}

export { defaultManifestDir };
