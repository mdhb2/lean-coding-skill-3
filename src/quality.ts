// Quality Overlay registry/resolver (L3-039): select only the native quality
// overlays relevant to a task's concerns, never the whole set globally
// (SRC-049, SRC-051; FR-050/FR-051/FR-052; AC-043, AC-044, AC-046).
//
// Inputs (caller-supplied, never inferred):
// - quality.yaml in manifestDir: canonical registry — overlay names + their
//   concern scope (ui/code/security) + selective loading mode.
// - task concerns: free-form concern labels; only concerns matching a
//   registered overlay scope select that overlay. Unknown concerns select
//   nothing — never a guess, never the full set.
// - task-declared overlays (tasks.yaml optional `overlays` field): explicit
//   opt-in, validated against the registry.
// - config-enabled overlays (.lcs3/config.yaml quality group): project-level
//   allow-list; resolution intersects with it, so a disabled overlay can
//   never load even when relevant.
//
// Guardrail: pure selection signal only — this module never loads rule bodies,
// never touches the network (FR-053), never mutates state. Backend-only task
// (no ui concern, no declared ui-quality) never resolves ui-quality (AC-044).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";

export interface OverlayEntry {
  name: string;
  scope: string;
}

export interface OverlayRegistry {
  overlays: OverlayEntry[];
  loading: "selective";
}

export interface OverlaySelectionInput {
  /** Concern labels for the task (e.g. "ui", "code"); unknown labels select nothing. */
  concerns: string[];
  /** Explicit opt-in from the task record (tasks.yaml `overlays`); validated. */
  declared?: string[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Load + validate the canonical overlay registry. Throws on missing/malformed manifest. */
export function loadOverlayRegistry(manifestDir: string): OverlayRegistry {
  const path = join(manifestDir, "quality.yaml");
  if (!existsSync(path)) throw new Error(`quality: missing canonical manifest at ${path}`);
  let data: unknown;
  try {
    data = yamlLoad(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`quality: malformed quality.yaml at ${path}: ${(e as Error).message}`);
  }
  if (!isRecord(data)) throw new Error(`quality: manifest at ${path} must be a mapping`);
  if (data.schema_version !== "1") throw new Error(`quality: schema_version must be "1" in ${path}`);
  const raw = data.overlays;
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error(`quality: overlays must be a non-empty list in ${path}`);
  const overlays: OverlayEntry[] = raw.map((e, i) => {
    if (!isRecord(e) || typeof e.name !== "string" || e.name.length === 0)
      throw new Error(`quality: overlays[${i}].name must be a non-empty string in ${path}`);
    if (typeof e.scope !== "string" || e.scope.length === 0)
      throw new Error(`quality: overlay '${e.name}' needs a non-empty scope in ${path}`);
    return { name: e.name, scope: e.scope };
  });
  const seen = new Set<string>();
  for (const o of overlays) {
    if (seen.has(o.name)) throw new Error(`quality: duplicate overlay '${o.name}' in ${path}`);
    seen.add(o.name);
  }
  if (data.loading !== "selective")
    throw new Error(`quality: loading must be "selective" in ${path} (FR-052)`);
  return { overlays, loading: "selective" };
}

function checkEnabled(enabled: unknown): asserts enabled is string[] {
  if (!Array.isArray(enabled) || !enabled.every((o) => typeof o === "string"))
    throw new Error("quality: enabled overlays must be a string list from .lcs3/config.yaml quality group");
}

/**
 * Resolve the overlays relevant to a task. Pure: no IO, no state mutation.
 * Result is in registry order, deduplicated: (scope-matched ∪ declared) ∩ enabled.
 */
export function resolveOverlays(
  registry: OverlayRegistry,
  input: OverlaySelectionInput,
  enabled: string[],
): string[] {
  if (typeof input !== "object" || input === null)
    throw new Error("quality: selection input must be an object with concerns and optional declared");
  if (!Array.isArray(input.concerns) || !input.concerns.every((c) => typeof c === "string"))
    throw new Error("quality: concerns must be a string list (caller-supplied, never inferred)");
  const declared = input.declared ?? [];
  if (!Array.isArray(declared) || !declared.every((d) => typeof d === "string"))
    throw new Error("quality: declared overlays must be a string list from the task record");
  checkEnabled(enabled);
  const names = new Set(registry.overlays.map((o) => o.name));
  for (const d of declared) {
    if (!names.has(d))
      throw new Error(`quality: task declares unknown overlay '${d}'; registry: ${[...names].join(", ")}`);
  }
  const enabledSet = new Set(enabled);
  const wanted = new Set<string>(declared);
  for (const concern of input.concerns) {
    for (const o of registry.overlays) {
      if (o.scope === concern) wanted.add(o.name);
    }
  }
  return registry.overlays.map((o) => o.name).filter((n) => wanted.has(n) && enabledSet.has(n));
}
