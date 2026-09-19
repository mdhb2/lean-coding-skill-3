# LCS3 — Deterministic Agentic Coding Runtime

LCS3 is a clean-slate successor to the legacy LCS (Lean Coding Skills) project. It keeps the useful *behavior* of the original workflow system while replacing its fragile, LLM-only mechanics with a deterministic runtime.

> Not an in-place upgrade. No backward compatibility with legacy `.lcs/` state, schemas, or workflow mechanics. Legacy LCS is treated strictly as read-only reference material.

## Why LCS3 exists

The original LCS relies heavily on LLMs correctly interpreting and reproducing Markdown instructions to manage state, IDs, dependencies, and lifecycle transitions. That produces real risks:

- state corruption from misapplied instructions
- schema drift across skills, templates, validators, and fixtures
- duplicated / conflicting sources of truth
- unnecessary context loading (token waste)
- fragile dependency and conflict handling
- weak multi-worker safety
- incomplete AFK (away-from-keyboard) autonomy

LCS3 fixes this by giving mechanical, stateful, integrity-sensitive work to a deterministic runtime, and keeping LLMs focused on what they're actually good at: ambiguity, synthesis, judgment, and code.

## Core principles

1. **Determinism** — state mutation, IDs, lifecycle transitions, leases, dependency/conflict checks run as runtime code, not natural-language instructions an LLM might misread.
2. **Autonomy** — AFK work executes and self-corrects (within a bounded retry budget) without unnecessary human intervention.
3. **Efficiency** — agents load only the context relevant to their current task via Context Capsules, not the whole project.
4. **Quality** — quality checks are modular, selective, native, and verifiable (Quality Overlays), loaded only when relevant.
5. **Learning without self-corruption** — telemetry and project memory inform future work but never silently rewrite canonical skills, manifests, schemas, or policy.
6. **Behavioral continuity, not architectural inheritance** — every legacy LCS skill is explicitly inventoried and classified (`REWRITE` / `MERGE` / `DROP` / `REPLACED_BY_RUNTIME`) before any `lcs3-*` skill is built. Nothing gets mechanically renamed and reused as-is.

## Architecture at a glance

```text
Legacy LCS reference (read-only)
        |
        v
Legacy Skill Migration Matrix
        |
        v
LCS3 skills / LLM reasoning
        |
        v
Workflow / policy layer
        |
        v
Deterministic lcs3 runtime
        |
   +----+----------------------+
   |            |              |
Markdown/YAML  SQLite       Derived views
canonical      runtime      / caches
artifacts       state
```

- **Canonical artifacts** (Markdown/YAML with structured metadata) are the human-readable source of truth: PRDs, SRS, tasks, ADRs.
- **Dynamic execution state** (claims, leases, task status, telemetry) lives in SQLite, not repeated Markdown rewrites.
- **Derived artifacts** (traceability views, task-coverage reports, Context Capsules) are regenerable caches — never a higher authority than their canonical sources.

## Key capabilities

- Single deterministic CLI (`lcs3`) with modular internal subsystems, Node.js/TypeScript.
- Project-local root at `.lcs3/` (never `.lcs/`).
- Adaptive workflow routing by complexity + risk — simple/low-risk work takes a short path, complex/high-risk work gets deeper spec and review.
- AFK/HITL execution split, with bounded, classified retry on recoverable failures.
- Deterministic dependency, conflict, claim, and lease handling for safe multi-worker execution.
- Review → fix loop with traceable `FIX-###` findings.
- Native Quality Overlays (`ui-quality`, `code-quality`, `security-basic`), loaded only when relevant to the task.
- Project memory as advisory evidence — never silently promoted to project-wide rule; ADR promotion is explicit.
- Local telemetry and evidence-backed self-improvement proposals — proposals only, never auto-applied.
- Deterministic, regenerable requirement traceability (`SRC-###` → `FR-###` → `AC-###` → tasks/tests).

## Requirement traceability

Requirements are tracked with stable, never-renumbered IDs across the whole pipeline:

```
SRC-### (source requirement) → FR-### (functional requirement) → AC-### (acceptance criterion) → TASK-### (implementation task) → tests
```

Current PRD "must preserve" range: `SRC-001` .. `SRC-069`.

## Project status

**Phase: PRD / pre-SRS architecture hardening.**

Before broad implementation begins:

1. Legacy Skill Migration Matrix must be complete and approved.
2. Artifact-format / OKF position finalized.
3. Workflow phase and task lifecycle contracts finalized.
4. Deterministic runtime/SQLite design detailed enough to implement.
5. PRD reviewed and downstream SRS/task breakdown produced.

Canonical artifacts for the active work item live under:

```text
.lcs/work-items/{timestamp}-{slug}/
  prd.md              # canonical PRD
  srs.md              # implementation-ready spec
  task-coverage.md     # derived traceability view
  task/task-###.md      # individual implementation tasks
```

## Non-goals

- Not a mechanical rename of legacy `lcs-*` skills to `lcs3-*`.
- Not backward compatible with legacy `.lcs/` paths, schemas, or state.
- Does not treat legacy LCS mechanics, statuses, or validators as LCS3 requirements — legacy is behavioral reference only.

## Bahasa Indonesia

Baca [README.id.md](./README.id.md) untuk versi Bahasa Indonesia.
