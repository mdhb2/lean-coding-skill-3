import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { validateManifests, type ValidationError } from "./manifests.js";
import { loadProjectConfig } from "./config.js";

export interface InitResult {
  created: string[];
  kept: string[];
  errors: ValidationError[];
}

const MANIFESTS_DIR_REL = ".lcs3/manifests";

// ponytail: templates duplicate repo .lcs3 canonical files; L3-013 drift suite must fail when they diverge.
const TEMPLATES: Record<string, string> = {
  ".lcs3/config.yaml": `# Canonical — centralized project policy (SRC-063, FR-006).
# Only the six approved groups; unknown groups/keys fail validation.
schema_version: "1"
workflow:
  routing: complexity_risk
  default_mode: AFK
  bug_fast_lane: true
execution:
  max_retries: 3
  lease_seconds: 600
  failure_taxonomy: [implementation, specification, environment, external_dependency, credentials, test_instability, repository_conflict, human_decision]
context:
  selective: true
  soft_budget_tokens: 8000
  hard_budget_tokens: 32000
verification:
  task_gate: targeted
  workitem_gate: broad
  reuse_recipes: true
quality:
  overlays: [ui-quality, code-quality, security-basic]
  loading: selective
risk:
  max_files: 6
  max_loc: 400
  on_exceed: escalate_or_reslice
`,
  ".lcs3/manifests/artifacts.yaml": `# Canonical — artifact type registry (GATE-02 Option C: format_version okf/0.2).
# Sole source for VALID_ARTIFACT_TYPES. No skill invents a type without an entry here.
schema_version: "1"
format_version: "okf/0.2"
artifact_types:
  - name: prd
    authority: canonical
    cot_level: standard
  - name: prd_enhanced
    authority: canonical
    cot_level: strict
  - name: srs
    authority: canonical
    cot_level: strict
  - name: tests
    authority: canonical
    cot_level: strict
  - name: api
    authority: canonical
    cot_level: strict
  - name: db
    authority: canonical
    cot_level: strict
  - name: traceability
    authority: derived
    cot_level: strict
  - name: task_coverage
    authority: derived
    cot_level: strict
  - name: task
    authority: canonical
    cot_level: very_strict
  - name: state
    authority: canonical
    cot_level: standard
  - name: final_doc
    authority: canonical
    cot_level: strict
  - name: final_map
    authority: canonical
    cot_level: strict
  - name: index
    authority: canonical
    cot_level: standard
  - name: explore
    authority: canonical
    cot_level: standard
  - name: debug
    authority: canonical
    cot_level: standard
  - name: code_review
    authority: canonical
    cot_level: strict
  - name: wayfinder
    authority: canonical
    cot_level: standard
  - name: capsule
    authority: derived
    cot_level: strict
# Required frontmatter per artifact (GATE-02 §5). \`type\` forbidden except \`state\`.
required_fields: [title, format_version, authors, created, updated, artifact_type, source, cot_level]
recommended_fields: [tags, summary, status, related]
`,
  ".lcs3/manifests/lifecycle.yaml": `# Canonical — lifecycle contracts (GATE-03 freeze). Sole owner of the 3 state machines.
# \`status\` (artifact) vs \`task_status\` (execution) never share an enum.
schema_version: "1"
artifact_status:
  field: status
  states: [draft, reviewed, active, archived]
  terminal: [archived]
  transitions:
    - { from: draft, to: reviewed }
    - { from: draft, to: active }
    - { from: reviewed, to: draft }
    - { from: reviewed, to: active }
    - { from: active, to: archived }
task_status:
  field: task_status
  states: [pending, ready, blocked, claimed, in_progress, in_review, needs_fix, done, cancelled, expired]
  terminal: [done, cancelled]
  transitions:
    - { from: pending, to: ready }
    - { from: pending, to: blocked }
    - { from: pending, to: cancelled }
    - { from: ready, to: blocked }
    - { from: ready, to: claimed }
    - { from: ready, to: cancelled }
    - { from: blocked, to: pending }
    - { from: blocked, to: ready }
    - { from: blocked, to: cancelled }
    - { from: claimed, to: in_progress }
    - { from: claimed, to: expired }
    - { from: claimed, to: cancelled }
    - { from: in_progress, to: blocked }
    - { from: in_progress, to: in_review }
    - { from: in_progress, to: expired }
    - { from: in_progress, to: cancelled }
    - { from: in_review, to: needs_fix }
    - { from: in_review, to: done }
    - { from: in_review, to: cancelled }
    - { from: needs_fix, to: claimed }
    - { from: needs_fix, to: cancelled }
    - { from: expired, to: ready }
    - { from: expired, to: cancelled }
work_item_status:
  field: status
  states: [open, paused, archived, finalized]
  terminal: [archived, finalized]
  transitions:
    - { from: open, to: paused }
    - { from: open, to: archived }
    - { from: paused, to: open }
    - { from: paused, to: archived }
    - { from: archived, to: finalized }
workflow_phases:
  - idle
  - new
  - explore
  - prd
  - prd_review
  - srs
  - tasks
  - execution
  - code_review
  - finalization
`,
  ".lcs3/manifests/skills.yaml": `# Canonical — skill registry (GATE-01 §6: exactly 18 skills).
# Master routes over this, not hardcoded lists. Explicitly-NOT skills listed for guard.
schema_version: "1"
skills:
  - name: lcs3-master
    source: lcs-master
    role: router
  - name: lcs3-explore
    source: lcs-explore
    role: exploration
  - name: lcs3-toprd
    source: lcs-toprd
    role: prd
  - name: lcs3-prd-reviewer
    source: lcs-prd-reviewer
    role: review
  - name: lcs3-tosrs
    source: lcs-tosrs
    role: srs
  - name: lcs3-task-slicer
    source: lcs-task-slicer
    role: tasks
  - name: lcs3-task-executor
    source: lcs-task-executor
    role: execution
  - name: lcs3-code-review
    source: lcs-code-review
    role: review
  - name: lcs3-debug
    source: lcs-debug
    modes: [normal, report-only]
    role: debug
  - name: lcs3-doc-finalizer
    source: lcs-doc-finalizer
    role: finalization
  - name: lcs3-codebase-doc
    source: lcs-codebase-doc
    modes: [deep-map, onboarding]
    role: docs
  - name: lcs3-domain-modeling
    source: lcs-domain-modeling
    role: domain
  - name: lcs3-improve-architecture
    source: lcs-improve-architecture
    role: architecture
  - name: lcs3-research
    source: lcs-research
    role: research
  - name: lcs3-prototype
    source: lcs-prototype
    role: prototype
  - name: lcs3-wayfinder
    source: lcs-wayfinder
    role: planning
  - name: lcs3-self-improvement
    source: lcs-self-improvement
    role: governance
  - name: lcs3-wizard
    source: lcs-wizard
    role: hitl
explicitly_not_skills:
  - lcs3-chain-of-truth
  - lcs3-debug-ext
  - lcs3-new
  - lcs3-onboarding
  - lcs3-shared
`,
  ".lcs3/manifests/tasks.yaml": `# Canonical — task schema (FR-019..FR-023). Only approved keys.
schema_version: "1"
task_fields:
  required: [name, mode]
  optional: [blocked_by, scope, overlays, covers, tests]
modes: [AFK, HITL]
scope_fields: [read, write, expansion]
`,
  ".lcs3/manifests/quality.yaml": `# Canonical — Quality Overlay definitions (SRC-047..SRC-051, FR-050..FR-052).
# Selective loading only: never loaded globally. No external network dependency.
schema_version: "1"
overlays:
  - name: ui-quality
    scope: ui
  - name: code-quality
    scope: code
  - name: security-basic
    scope: security
loading: selective
`,
};

const DIRS = [
  ".lcs3",
  ".lcs3/manifests",
  ".lcs3/memory",
  ".lcs3/telemetry",
  ".lcs3/imports/legacy",
  ".lcs3/cache/capsules",
  ".lcs3/cache/traceability",
  ".lcs3/cache/indexes",
  ".lcs3/tmp",
];

/**
 * Initialize the approved `.lcs3/` structure under projectRoot.
 * Idempotent: existing valid files are kept, never overwritten.
 * `.lcs/` is never read, imported, or mutated (SRC-041/AC-002/AC-039).
 * Malformed pre-existing files fail without being overwritten.
 */
export function initProject(projectRoot: string): InitResult {
  const errors: ValidationError[] = [];
  const created: string[] = [];
  const kept: string[] = [];

  // Pre-validate existing files so malformed state fails before any write.
  for (const rel of Object.keys(TEMPLATES)) {
    const p = join(projectRoot, rel);
    if (existsSync(p)) {
      try {
        yamlLoad(readFileSync(p, "utf8"));
      } catch {
        errors.push({
          file: rel,
          message: `malformed YAML in existing ${rel} — fix or remove before re-running \`lcs3 init\``,
        });
      }
    }
  }
  if (errors.length > 0) return { created, kept, errors };

  for (const d of DIRS) mkdirSync(join(projectRoot, d), { recursive: true });

  for (const [rel, body] of Object.entries(TEMPLATES)) {
    const p = join(projectRoot, rel);
    if (existsSync(p)) {
      kept.push(rel);
    } else {
      writeFileSync(p, body);
      created.push(rel);
    }
  }

  // Full semantic validation: pre-existing invalid content fails, never overwritten.
  errors.push(...validateManifests(join(projectRoot, MANIFESTS_DIR_REL)));
  errors.push(...loadProjectConfig(projectRoot).errors);

  return { created, kept, errors };
}
