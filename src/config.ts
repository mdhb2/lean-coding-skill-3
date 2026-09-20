import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import type { ValidationError } from "./manifests.js";

export interface WorkflowPolicy {
  routing: "complexity_risk";
  default_mode: "AFK" | "HITL";
  bug_fast_lane: boolean;
}

export interface ExecutionPolicy {
  max_retries: number;
  lease_seconds: number;
  failure_taxonomy: string[];
}

export interface ContextPolicy {
  selective: boolean;
  soft_budget_tokens: number;
  hard_budget_tokens: number;
}

export interface VerificationPolicy {
  task_gate: "targeted";
  workitem_gate: "broad";
  reuse_recipes: boolean;
}

export interface QualityPolicy {
  overlays: string[];
  loading: "selective";
}

export interface RiskPolicy {
  max_files: number;
  max_loc: number;
  on_exceed: "escalate" | "reslice" | "escalate_or_reslice";
}

export interface ProjectConfig {
  schema_version: "1";
  workflow: WorkflowPolicy;
  execution: ExecutionPolicy;
  context: ContextPolicy;
  verification: VerificationPolicy;
  quality: QualityPolicy;
  risk: RiskPolicy;
}

const FILE = ".lcs3/config.yaml";

const GROUPS = ["workflow", "execution", "context", "verification", "quality", "risk"] as const;

// FR-051 — must match .lcs3/manifests/quality.yaml (FR-011: no independent redefinition).
const APPROVED_OVERLAYS = ["ui-quality", "code-quality", "security-basic"];

// FR-032 failure categories.
const APPROVED_FAILURES = [
  "implementation",
  "specification",
  "environment",
  "external_dependency",
  "credentials",
  "test_instability",
  "repository_conflict",
  "human_decision",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function needGroup(data: Record<string, unknown>, errors: ValidationError[], name: string): Record<string, unknown> | null {
  const g = data[name];
  if (g === undefined) {
    errors.push({ file: FILE, message: `missing required config group '${name}'` });
    return null;
  }
  if (!isRecord(g)) {
    errors.push({ file: FILE, message: `config group '${name}' must be a mapping` });
    return null;
  }
  return g;
}

function rejectUnknown(errors: ValidationError[], group: string, g: Record<string, unknown>, allowed: string[]): void {
  for (const k of Object.keys(g)) {
    if (!allowed.includes(k)) {
      errors.push({ file: FILE, message: `unknown key '${group}.${k}' (allowed: ${allowed.join(", ")})` });
    }
  }
}

/** Validate parsed config value. Returns typed config + errors; null config when errors exist. */
export function validateConfig(data: unknown): { config: ProjectConfig | null; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!isRecord(data)) return { config: null, errors: [{ file: FILE, message: "config must be a mapping" }] };

  if (data.schema_version !== "1") {
    errors.push({ file: FILE, message: 'schema_version must be "1"' });
  }
  for (const k of Object.keys(data)) {
    if (k !== "schema_version" && !(GROUPS as readonly string[]).includes(k)) {
      errors.push({
        file: FILE,
        message: `unknown config group '${k}' (allowed: ${GROUPS.join(", ")})`,
      });
    }
  }

  const workflow = needGroup(data, errors, "workflow");
  const execution = needGroup(data, errors, "execution");
  const context = needGroup(data, errors, "context");
  const verification = needGroup(data, errors, "verification");
  const quality = needGroup(data, errors, "quality");
  const risk = needGroup(data, errors, "risk");
  if (!workflow || !execution || !context || !verification || !quality || !risk) {
    return { config: null, errors };
  }

  rejectUnknown(errors, "workflow", workflow, ["routing", "default_mode", "bug_fast_lane"]);
  rejectUnknown(errors, "execution", execution, ["max_retries", "lease_seconds", "failure_taxonomy"]);
  rejectUnknown(errors, "context", context, ["selective", "soft_budget_tokens", "hard_budget_tokens"]);
  rejectUnknown(errors, "verification", verification, ["task_gate", "workitem_gate", "reuse_recipes"]);
  rejectUnknown(errors, "quality", quality, ["overlays", "loading"]);
  rejectUnknown(errors, "risk", risk, ["max_files", "max_loc", "on_exceed"]);

  // workflow (FR-026/027/028)
  if (workflow.routing !== "complexity_risk") {
    errors.push({ file: FILE, message: "workflow.routing must be \"complexity_risk\" (FR-026)" });
  }
  if (workflow.default_mode !== "AFK" && workflow.default_mode !== "HITL") {
    errors.push({ file: FILE, message: "workflow.default_mode must be AFK or HITL" });
  }
  if (typeof workflow.bug_fast_lane !== "boolean") {
    errors.push({ file: FILE, message: "workflow.bug_fast_lane must be a boolean (FR-028)" });
  }

  // execution (FR-025/031/032)
  if (!isPositiveInt(execution.max_retries)) {
    errors.push({ file: FILE, message: "execution.max_retries must be a positive integer (FR-031 bounded retry)" });
  }
  if (!isPositiveInt(execution.lease_seconds)) {
    errors.push({ file: FILE, message: "execution.lease_seconds must be a positive integer (FR-025 lease)" });
  }
  if (
    !Array.isArray(execution.failure_taxonomy) ||
    execution.failure_taxonomy.length === 0 ||
    !execution.failure_taxonomy.every((f) => typeof f === "string" && APPROVED_FAILURES.includes(f))
  ) {
    errors.push({
      file: FILE,
      message: `execution.failure_taxonomy must be a non-empty subset of ${APPROVED_FAILURES.join(", ")} (FR-032)`,
    });
  }

  // context (FR-035/038, SRC-036)
  if (context.selective !== true) {
    errors.push({ file: FILE, message: "context.selective must be true (FR-035 selective loading)" });
  }
  if (!isPositiveInt(context.soft_budget_tokens) || !isPositiveInt(context.hard_budget_tokens)) {
    errors.push({ file: FILE, message: "context.soft_budget_tokens and hard_budget_tokens must be positive integers (FR-038)" });
  } else if (context.hard_budget_tokens < context.soft_budget_tokens) {
    errors.push({ file: FILE, message: "context.hard_budget_tokens must be >= soft_budget_tokens" });
  }

  // verification (FR-041/042/043)
  if (verification.task_gate !== "targeted") {
    errors.push({ file: FILE, message: 'verification.task_gate must be "targeted" (FR-041)' });
  }
  if (verification.workitem_gate !== "broad") {
    errors.push({ file: FILE, message: 'verification.workitem_gate must be "broad" (FR-042)' });
  }
  if (typeof verification.reuse_recipes !== "boolean") {
    errors.push({ file: FILE, message: "verification.reuse_recipes must be a boolean (FR-043)" });
  }

  // quality (FR-050/051/052)
  if (
    !Array.isArray(quality.overlays) ||
    quality.overlays.length === 0 ||
    !quality.overlays.every((o) => typeof o === "string" && APPROVED_OVERLAYS.includes(o))
  ) {
    errors.push({
      file: FILE,
      message: `quality.overlays must be a non-empty subset of ${APPROVED_OVERLAYS.join(", ")} (FR-051)`,
    });
  }
  if (quality.loading !== "selective") {
    errors.push({ file: FILE, message: 'quality.loading must be "selective" (FR-052)' });
  }

  // risk (FR-022, SRC-028)
  if (!isPositiveInt(risk.max_files)) {
    errors.push({ file: FILE, message: "risk.max_files must be a positive integer (SRC-028 blast budget)" });
  }
  if (!isPositiveInt(risk.max_loc)) {
    errors.push({ file: FILE, message: "risk.max_loc must be a positive integer (SRC-028 blast budget)" });
  }
  if (risk.on_exceed !== "escalate" && risk.on_exceed !== "reslice" && risk.on_exceed !== "escalate_or_reslice") {
    errors.push({ file: FILE, message: "risk.on_exceed must be escalate, reslice, or escalate_or_reslice (FR-022)" });
  }

  if (errors.length > 0) return { config: null, errors };
  return {
    config: {
      schema_version: "1",
      workflow: {
        routing: "complexity_risk",
        default_mode: workflow.default_mode as "AFK" | "HITL",
        bug_fast_lane: workflow.bug_fast_lane as boolean,
      },
      execution: {
        max_retries: execution.max_retries as number,
        lease_seconds: execution.lease_seconds as number,
        failure_taxonomy: execution.failure_taxonomy as string[],
      },
      context: {
        selective: true,
        soft_budget_tokens: context.soft_budget_tokens as number,
        hard_budget_tokens: context.hard_budget_tokens as number,
      },
      verification: {
        task_gate: "targeted",
        workitem_gate: "broad",
        reuse_recipes: verification.reuse_recipes as boolean,
      },
      quality: {
        overlays: quality.overlays as string[],
        loading: "selective",
      },
      risk: {
        max_files: risk.max_files as number,
        max_loc: risk.max_loc as number,
        on_exceed: risk.on_exceed as "escalate" | "reslice" | "escalate_or_reslice",
      },
    },
    errors,
  };
}

/** Load + validate `.lcs3/config.yaml` under projectRoot. Null config when errors exist. */
export function loadProjectConfig(projectRoot: string): { config: ProjectConfig | null; errors: ValidationError[] } {
  const p = join(projectRoot, FILE);
  if (!existsSync(p)) {
    return {
      config: null,
      errors: [{ file: FILE, message: "missing .lcs3/config.yaml — run `lcs3 init` (SRC-046)" }],
    };
  }
  let data: unknown;
  try {
    data = yamlLoad(readFileSync(p, "utf8"));
  } catch {
    return { config: null, errors: [{ file: FILE, message: "malformed YAML in .lcs3/config.yaml" }] };
  }
  return validateConfig(data);
}
