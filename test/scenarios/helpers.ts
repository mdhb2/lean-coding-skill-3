// Scenario harness (L3-051): reusable isolated project fixture over real
// public LCS3 seams (SRC-061/SRC-062, AC-054..AC-056). No mocked
// file-existence checks — every helper drives initProject, bootstrapDatabase,
// and the canonical task_status machine. Later L3-052..L3-056 scenarios build
// on freshScenarioProject + readyTask/doneTask only.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initProject } from "../../src/init.js";
import { bootstrapDatabase, defaultStateDbPath } from "../../src/db.js";
import { createTask, transitionTask } from "../../src/transitions.js";
import type { ExecutionPolicy, RiskPolicy } from "../../src/config.js";

export interface ScenarioProject {
  projectRoot: string;
  dbPath: string;
  manifestDir: string;
}

export const SCENARIO_POLICY: ExecutionPolicy = {
  max_retries: 3,
  lease_seconds: 600,
  failure_taxonomy: [
    "implementation",
    "specification",
    "environment",
    "external_dependency",
    "credentials",
    "test_instability",
    "repository_conflict",
    "human_decision",
  ],
};

export const SCENARIO_RISK: RiskPolicy = {
  max_files: 2,
  max_loc: 100,
  on_exceed: "escalate_or_reslice",
};

/** Fresh isolated project: real initProject + real bootstrapDatabase. Throws on error. */
export function freshScenarioProject(prefix = "lcs3-scn-"): ScenarioProject {
  const projectRoot = mkdtempSync(join(tmpdir(), prefix));
  const init = initProject(projectRoot);
  if (init.errors.length > 0) {
    throw new Error(`scenario: initProject failed: ${init.errors[0].message}`);
  }
  const dbPath = defaultStateDbPath(projectRoot);
  const boot = bootstrapDatabase(dbPath);
  if (boot.errors.length > 0) {
    throw new Error(`scenario: bootstrapDatabase failed: ${boot.errors[0].message}`);
  }
  return { projectRoot, dbPath, manifestDir: join(projectRoot, ".lcs3/manifests") };
}

/** Create a task and move pending → ready through the canonical machine. */
export function readyTask(scn: ScenarioProject, id: string): void {
  createTask(scn.dbPath, id, "pending", scn.manifestDir);
  transitionTask(scn.dbPath, id, "ready", scn.manifestDir);
}

/** Drive a task pending → ready → claimed → in_progress → in_review → done. */
export function doneTask(scn: ScenarioProject, id: string): void {
  createTask(scn.dbPath, id, "pending", scn.manifestDir);
  for (const next of ["ready", "claimed", "in_progress", "in_review", "done"] as const) {
    transitionTask(scn.dbPath, id, next, scn.manifestDir);
  }
}
