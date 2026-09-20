// Verification recipe registry (L3-029): persist/reuse verified project
// build/test/lint/typecheck commands with provenance/freshness (SRC-038, AC-035).
// Guardrail: unverified command never promoted silently; stale via provenance.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { buildProvenance, isStale, digestFile } from "./provenance.js";
import type { ProvenanceEntry } from "./provenance.js";

export interface Recipe {
  name: string;
  command: string;
  verified: boolean;
  provenance: ProvenanceEntry[];
  created: string;
}

const REL = ".lcs3/cache/recipes.json";

export function getRecipesPath(projectRoot: string): string {
  return join(projectRoot, REL);
}

function loadRaw(projectRoot: string): unknown {
  const p = getRecipesPath(projectRoot);
  if (!existsSync(p)) return [];
  const raw = readFileSync(p, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`recipes: malformed JSON in ${REL}`);
  }
}

function validateRecipe(r: unknown): Recipe | null {
  if (typeof r !== "object" || r === null) return null;
  const o = r as Record<string, unknown>;
  if (typeof o.name !== "string" || !o.name.trim()) return null;
  if (typeof o.command !== "string" || !o.command.trim()) return null;
  if (o.verified !== true) return null;
  if (!Array.isArray(o.provenance)) return null;
  for (const e of o.provenance) {
    if (typeof e !== "object" || e === null) return null;
    const er = e as Record<string, unknown>;
    if (typeof er.source !== "string" || typeof er.digest !== "string") return null;
  }
  if (typeof o.created !== "string") return null;
  return r as Recipe;
}

export function loadRecipes(projectRoot: string): Recipe[] {
  const raw = loadRaw(projectRoot);
  if (!Array.isArray(raw)) throw new Error(`recipes: expected array in ${REL}`);
  const out: Recipe[] = [];
  for (const e of raw) {
    const v = validateRecipe(e);
    if (!v) throw new Error(`recipes: invalid recipe entry in ${REL}`);
    out.push(v);
  }
  return out;
}

function saveRecipes(projectRoot: string, recipes: Recipe[]): void {
  const p = getRecipesPath(projectRoot);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(recipes, null, 2) + "\n", "utf8");
}

export function registerRecipe(
  projectRoot: string,
  input: { name: string; command: string; verified: boolean; sources: string[] },
): Recipe {
  const name = input.name?.trim();
  const command = input.command?.trim();
  if (!name) throw new Error("recipes: name must be a non-empty string");
  if (!command) throw new Error("recipes: command must be a non-empty string");
  if (input.verified !== true) throw new Error("recipes: unverified command cannot be promoted — verified must be true (AC-035)");
  if (!Array.isArray(input.sources) || input.sources.length === 0) throw new Error("recipes: sources must be a non-empty list of file paths");
  const provenance = buildProvenance(input.sources);
  const recipe: Recipe = { name, command, verified: true, provenance, created: "2026-09-20" };
  const all = existsSync(getRecipesPath(projectRoot)) ? loadRecipes(projectRoot) : [];
  const idx = all.findIndex((r) => r.name === name);
  if (idx >= 0) all[idx] = recipe;
  else all.push(recipe);
  saveRecipes(projectRoot, all);
  return recipe;
}

export function getRecipe(projectRoot: string, name: string): Recipe | null {
  const all = loadRecipes(projectRoot);
  return all.find((r) => r.name === name) ?? null;
}

export function listRecipes(projectRoot: string): Recipe[] {
  return loadRecipes(projectRoot);
}

export function checkRecipeFreshness(
  projectRoot: string,
  name: string,
): { fresh: boolean; reason: string | null; recipe: Recipe | null } {
  const recipe = getRecipe(projectRoot, name);
  if (!recipe) return { fresh: false, reason: "recipe not found", recipe: null };
  const current: ProvenanceEntry[] = [];
  for (const e of recipe.provenance) {
    const d = digestFile(e.source);
    if (d === null) return { fresh: false, reason: `upstream not found: ${e.source}`, recipe };
    current.push({ source: e.source, digest: d });
  }
  return isStale(recipe.provenance, current)
    ? { fresh: false, reason: "upstream changed", recipe }
    : { fresh: true, reason: null, recipe };
}
