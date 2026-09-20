import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";

export interface ValidationError {
  file: string;
  message: string;
}

const REQUIRED_FILES = [
  "artifacts.yaml",
  "lifecycle.yaml",
  "skills.yaml",
  "tasks.yaml",
  "quality.yaml",
];

const EXPECTED_ARTIFACT_STATUS = ["draft", "reviewed", "active", "archived"];
const EXPECTED_TASK_STATES = [
  "pending",
  "ready",
  "blocked",
  "claimed",
  "in_progress",
  "in_review",
  "needs_fix",
  "done",
  "cancelled",
  "expired",
];
const EXPECTED_SKILL_COUNT = 18;
const EXPECTED_OVERLAYS = ["ui-quality", "code-quality", "security-basic"];

function load(dir: string, file: string): { data: unknown; raw: boolean } {
  const path = join(dir, file);
  if (!existsSync(path)) return { data: undefined, raw: false };
  const data = yamlLoad(readFileSync(path, "utf8"));
  return { data, raw: true };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function names(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((e) => (isRecord(e) && typeof e.name === "string" ? e.name : undefined))
    .filter((n): n is string => typeof n === "string");
}

function duplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const i of items) {
    if (seen.has(i)) dup.add(i);
    seen.add(i);
  }
  return [...dup];
}

function checkTransitions(
  errors: ValidationError[],
  file: string,
  machine: string,
  states: string[],
  terminal: string[],
  transitions: unknown,
): void {
  if (!Array.isArray(transitions)) {
    errors.push({ file, message: `${machine}: transitions must be a list` });
    return;
  }
  const stateSet = new Set(states);
  for (const t of transitions) {
    if (!isRecord(t) || typeof t.from !== "string" || typeof t.to !== "string") {
      errors.push({ file, message: `${machine}: transition must have string from/to` });
      continue;
    }
    if (!stateSet.has(t.from)) errors.push({ file, message: `${machine}: unknown from state '${t.from}'` });
    if (!stateSet.has(t.to)) errors.push({ file, message: `${machine}: unknown to state '${t.to}'` });
    if (terminal.includes(t.from))
      errors.push({ file, message: `${machine}: terminal state '${t.from}' has outgoing edge` });
  }
}

/** Validate canonical manifests in dir. Returns errors; empty means PASS. */
export function validateManifests(dir: string): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const f of REQUIRED_FILES) {
    if (!existsSync(join(dir, f))) errors.push({ file: f, message: "missing required manifest" });
  }
  if (errors.length > 0) return errors;

  const artifacts = load(dir, "artifacts.yaml");
  const lifecycle = load(dir, "lifecycle.yaml");
  const skills = load(dir, "skills.yaml");
  const tasks = load(dir, "tasks.yaml");
  const quality = load(dir, "quality.yaml");

  // schema_version === "1" on all
  for (const [f, loaded] of Object.entries({ artifacts, lifecycle, skills, tasks, quality })) {
    const file = `${f === "artifacts" ? "artifacts.yaml" : f === "lifecycle" ? "lifecycle.yaml" : f === "skills" ? "skills.yaml" : f === "tasks" ? "tasks.yaml" : "quality.yaml"}`;
    if (!isRecord(loaded.data) || loaded.data.schema_version !== "1")
      errors.push({ file, message: 'schema_version must be "1"' });
  }

  // artifacts.yaml: no duplicate names
  if (isRecord(artifacts.data) && Array.isArray(artifacts.data.artifact_types)) {
    const dup = duplicates(names(artifacts.data.artifact_types));
    for (const d of dup) errors.push({ file: "artifacts.yaml", message: `duplicate artifact_type '${d}'` });
    const req = artifacts.data.required_fields;
    if (!Array.isArray(req) || !req.includes("artifact_type"))
      errors.push({ file: "artifacts.yaml", message: "required_fields must include artifact_type" });
  } else {
    errors.push({ file: "artifacts.yaml", message: "artifact_types must be a list" });
  }

  // lifecycle.yaml: frozen enums, no cross-talk (AC-006)
  let artifactStates: string[] = [];
  let taskStates: string[] = [];
  if (isRecord(lifecycle.data)) {
    const a = lifecycle.data.artifact_status;
    const t = lifecycle.data.task_status;
    const w = lifecycle.data.work_item_status;
    if (!isRecord(a) || !Array.isArray(a.states)) {
      errors.push({ file: "lifecycle.yaml", message: "artifact_status.states must be a list" });
    } else {
      artifactStates = a.states.filter((s): s is string => typeof s === "string");
      for (const s of EXPECTED_ARTIFACT_STATUS) {
        if (!artifactStates.includes(s))
          errors.push({ file: "lifecycle.yaml", message: `artifact_status missing state '${s}'` });
      }
      checkTransitions(errors, "lifecycle.yaml", "artifact_status", artifactStates,
        Array.isArray(a.terminal) ? a.terminal.filter((s): s is string => typeof s === "string") : [],
        a.transitions);
    }
    if (!isRecord(t) || !Array.isArray(t.states)) {
      errors.push({ file: "lifecycle.yaml", message: "task_status.states must be a list" });
    } else {
      taskStates = t.states.filter((s): s is string => typeof s === "string");
      for (const s of EXPECTED_TASK_STATES) {
        if (!taskStates.includes(s))
          errors.push({ file: "lifecycle.yaml", message: `task_status missing state '${s}'` });
      }
      if (taskStates.includes("draft") || taskStates.includes("archived"))
        errors.push({ file: "lifecycle.yaml", message: "task_status must not contain artifact states (AC-006)" });
      checkTransitions(errors, "lifecycle.yaml", "task_status", taskStates,
        Array.isArray(t.terminal) ? t.terminal.filter((s): s is string => typeof s === "string") : [],
        t.transitions);
    }
    if (artifactStates.includes("pending") || artifactStates.includes("in_progress"))
      errors.push({ file: "lifecycle.yaml", message: "artifact status must not contain task states (AC-006)" });
    if (!isRecord(w) || !Array.isArray(w.states))
      errors.push({ file: "lifecycle.yaml", message: "work_item_status.states must be a list" });
    if (!Array.isArray(lifecycle.data.workflow_phases) || lifecycle.data.workflow_phases.length === 0)
      errors.push({ file: "lifecycle.yaml", message: "workflow_phases must be a non-empty list" });
  } else {
    errors.push({ file: "lifecycle.yaml", message: "manifest must be a mapping" });
  }

  // skills.yaml: exactly 18, no overlap with explicitly_not_skills, no dupes
  if (isRecord(skills.data) && Array.isArray(skills.data.skills)) {
    const list = names(skills.data.skills);
    if (list.length !== EXPECTED_SKILL_COUNT)
      errors.push({ file: "skills.yaml", message: `expected ${EXPECTED_SKILL_COUNT} skills, found ${list.length}` });
    for (const d of duplicates(list))
      errors.push({ file: "skills.yaml", message: `duplicate skill '${d}'` });
    const notSkills: string[] = Array.isArray(skills.data.explicitly_not_skills)
      ? skills.data.explicitly_not_skills.filter((s): s is string => typeof s === "string")
      : [];
    for (const s of list) {
      if (notSkills.includes(s))
        errors.push({ file: "skills.yaml", message: `skill '${s}' also in explicitly_not_skills` });
    }
  } else {
    errors.push({ file: "skills.yaml", message: "skills must be a list" });
  }

  // tasks.yaml: modes AFK/HITL
  if (isRecord(tasks.data)) {
    const modes = tasks.data.modes;
    if (!Array.isArray(modes) || !modes.includes("AFK") || !modes.includes("HITL"))
      errors.push({ file: "tasks.yaml", message: "modes must include AFK and HITL" });
  } else {
    errors.push({ file: "tasks.yaml", message: "manifest must be a mapping" });
  }

  // quality.yaml: exactly the 3 native overlays, selective loading
  if (isRecord(quality.data) && Array.isArray(quality.data.overlays)) {
    const list = names(quality.data.overlays);
    for (const o of EXPECTED_OVERLAYS) {
      if (!list.includes(o)) errors.push({ file: "quality.yaml", message: `missing overlay '${o}'` });
    }
    if (quality.data.loading !== "selective")
      errors.push({ file: "quality.yaml", message: "loading must be selective" });
  } else {
    errors.push({ file: "quality.yaml", message: "overlays must be a list" });
  }

  return errors;
}
