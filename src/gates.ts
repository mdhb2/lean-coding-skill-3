// Targeted task gate + work-item final gate runners (L3-030/L3-031).
// SRC-037: distinguish targeted per-task gate from broader work-item/final gate.
// AC-033: task gate runs targeted checks. AC-034: completion runs broader gate.
// Guardrail: only verified registered recipes run; stale/missing recipe blocks,
// never executes. Final gate always runs its own suite — a targeted pass never
// substitutes for it.
import { execSync } from "node:child_process";
import { getRecipe, checkRecipeFreshness } from "./recipes.js";

export type GateStatus = "pass" | "fail" | "blocked";

export interface GateResult {
  gate: "targeted" | "final";
  recipe: string;
  command: string;
  status: GateStatus;
  exitCode: number | null;
  output: string;
  truncated: boolean;
  reason: string | null;
}

export interface FinalGateResult {
  gate: "final";
  status: GateStatus;
  results: GateResult[];
  reason: string | null;
}

// ponytail: fixed 120s timeout + 4000-char output cap; make configurable if gates need it.
const TIMEOUT_MS = 120_000;
const MAX_OUTPUT = 4000;

function truncate(output: string): { output: string; truncated: boolean } {
  if (output.length <= MAX_OUTPUT) return { output, truncated: false };
  return { output: output.slice(0, MAX_OUTPUT), truncated: true };
}

function runRecipeCommand(
  projectRoot: string,
  gate: "targeted" | "final",
  recipeName: string,
  command: string,
): GateResult {
  const started = Date.now();
  void started;
  try {
    const raw = execSync(command, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: TIMEOUT_MS,
      maxBuffer: 4 * 1024 * 1024,
    });
    const t = truncate(typeof raw === "string" ? raw : String(raw));
    return { gate, recipe: recipeName, command, status: "pass", exitCode: 0, ...t, reason: null };
  } catch (e) {
    const err = e as { status?: number | null; stdout?: unknown; stderr?: unknown; message?: string };
    const out = [typeof err.stdout === "string" ? err.stdout : "", typeof err.stderr === "string" ? err.stderr : ""]
      .filter(Boolean)
      .join("\n");
    const t = truncate(out || err.message || String(e));
    return {
      gate,
      recipe: recipeName,
      command,
      status: "fail",
      exitCode: typeof err.status === "number" ? err.status : null,
      ...t,
      reason: `command failed with exit ${typeof err.status === "number" ? err.status : "unknown"}`,
    };
  }
}

function resolveRecipe(projectRoot: string, gate: "targeted" | "final", name: string): GateResult | null {
  if (!name.trim()) {
    return { gate, recipe: name, command: "", status: "blocked", exitCode: null, output: "", truncated: false, reason: "recipe name must be a non-empty string" };
  }
  const recipe = getRecipe(projectRoot, name);
  if (!recipe) {
    return { gate, recipe: name, command: "", status: "blocked", exitCode: null, output: "", truncated: false, reason: "recipe not found" };
  }
  const fresh = checkRecipeFreshness(projectRoot, name);
  if (!fresh.fresh) {
    return { gate, recipe: name, command: recipe.command, status: "blocked", exitCode: null, output: "", truncated: false, reason: fresh.reason };
  }
  return null;
}

export function runTargetedGate(projectRoot: string, recipeName: string): GateResult {
  const blocked = resolveRecipe(projectRoot, "targeted", recipeName);
  if (blocked) return blocked;
  const recipe = getRecipe(projectRoot, recipeName);
  if (!recipe) {
    return { gate: "targeted", recipe: recipeName, command: "", status: "blocked", exitCode: null, output: "", truncated: false, reason: "recipe not found" };
  }
  return runRecipeCommand(projectRoot, "targeted", recipeName, recipe.command);
}

export function runFinalGate(projectRoot: string, recipeNames: string[]): FinalGateResult {
  if (!Array.isArray(recipeNames) || recipeNames.length === 0) {
    return { gate: "final", status: "blocked", results: [], reason: "final gate requires a non-empty recipe list (broader suite)" };
  }
  const results: GateResult[] = recipeNames.map((name) => {
    const blocked = resolveRecipe(projectRoot, "final", name);
    if (blocked) return blocked;
    const recipe = getRecipe(projectRoot, name);
    if (!recipe) {
      return { gate: "final", recipe: name, command: "", status: "blocked", exitCode: null, output: "", truncated: false, reason: "recipe not found" } as GateResult;
    }
    return runRecipeCommand(projectRoot, "final", name, recipe.command);
  });
  if (results.some((r) => r.status === "blocked")) {
    return { gate: "final", status: "blocked", results, reason: "final gate blocked: one or more recipes stale or missing" };
  }
  if (results.some((r) => r.status === "fail")) {
    return { gate: "final", status: "fail", results, reason: "final gate failed: one or more checks failed" };
  }
  return { gate: "final", status: "pass", results, reason: null };
}
