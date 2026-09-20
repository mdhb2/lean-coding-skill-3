# AGENTS.md — LCS3 Project Rules

## 1. Project Identity

This repository is **LCS3**.

LCS3 is a clean-slate successor to the legacy LCS project. It preserves useful behavior deliberately, but it does **not** preserve legacy architecture, schemas, runtime state, paths, or backward compatibility by default.

Canonical namespace:

```text
Repository: LCS3
CLI:        lcs3
Skills:     lcs3-*
Project:    .lcs3/
```

Never use `.lcs/` as LCS3 runtime state.

## 2. Primary Source of Truth

Use this precedence when sources conflict:

1. explicit current user instruction;
2. canonical LCS3 artifacts in the active work-item;
3. approved ADRs / project-level decisions;
4. verified current repository evidence;
5. approved Legacy Skill Migration Matrix (`docs/legacy-skill-matrix.md`);
6. project memory;
7. derived/generated artifacts and Context Capsules;
8. legacy LCS reference material.

Legacy LCS content is **reference evidence only**. It is never authoritative over LCS3 canonical artifacts.

## 3. Legacy LCS Reference Policy

The repository may contain or reference the old LCS codebase under a clearly isolated path such as:

```text
reference/legacy-lcs/
```

Treat this area as **READ-ONLY**.

Rules:

- Do not modify files under the legacy reference.
- Do not commit LCS3 implementation changes inside the legacy reference.
- Do not treat legacy schemas, paths, statuses, state files, validators, or workflow mechanics as LCS3 requirements.
- Do not copy legacy code or SKILL.md files wholesale and then rename them.
- Do not load the entire legacy repository into context when only one skill/capability needs inspection.
- Preserve useful behavior, not architectural baggage.
- When reusing implementation code materially, preserve required license/provenance information.

If the legacy reference is supplied as a Git submodule or separate clone, do not change its pinned revision unless the task explicitly requires it.

## 4. Mandatory Legacy Skill Migration Matrix

Canonical location: `docs/legacy-skill-matrix.md`. This file is the single approved-matrix artifact; do not create a duplicate elsewhere.

Before implementing the initial LCS3 skill family, inspect every legacy LCS skill and classify it exactly once as one of:

- `REWRITE`
- `MERGE`
- `DROP`
- `REPLACED_BY_RUNTIME`

The approved migration matrix must record, for each legacy skill:

- legacy skill name;
- inspected legacy revision/commit;
- target LCS3 skill or runtime capability;
- disposition;
- useful behavior to preserve;
- legacy mechanics to remove;
- deterministic runtime dependencies;
- upstream/downstream workflow relationships;
- rationale/notes.

Do not invent the LCS3 skill inventory from memory or from PRD wording alone.

Do not begin bulk creation of `lcs3-*` skills until the migration matrix is complete and approved for the relevant scope.

A new LCS3 skill that has no legacy counterpart must still be traceable to an explicit LCS3 requirement/design decision.

## 5. Clean-Slate Rule

LCS3 is not a mechanical rename of LCS.

When examining a legacy component:

1. identify the user-visible/product behavior worth preserving;
2. identify legacy state/path/schema/runtime assumptions;
3. discard obsolete mechanics;
4. map deterministic mechanics to the LCS3 runtime;
5. rebuild the reasoning/control portion as a lean LCS3 skill;
6. verify the result against current LCS3 requirements, not against legacy structure.

Prefer:

> preserve behavior, redesign mechanics

Avoid:

> copy folder, rename `lcs-` to `lcs3-`, patch until tests pass

## 6. Deterministic Runtime Boundary

LLMs should primarily handle:

- ambiguity;
- exploration;
- synthesis;
- engineering judgment;
- implementation reasoning;
- code generation;
- review judgments.

The `lcs3` runtime should handle mechanical/stateful operations where practical, including:

- IDs;
- state mutation;
- lifecycle transitions;
- task claims and leases;
- dependency checks;
- conflict checks;
- validation;
- generated traceability/coverage;
- provenance/freshness;
- deterministic indexes;
- runtime telemetry persistence.

Do not implement a critical state mutation only as natural-language instructions if it can reasonably be enforced by runtime code.

## 7. Artifact Rules

Canonical specification artifacts should remain human-readable Markdown with structured metadata where machine interpretation is required.

Dynamic execution state belongs in SQLite, not repeated Markdown rewrites.

Every artifact type must be clearly classified as:

- canonical; or
- derived/generated.

Derived artifacts and Context Capsules are caches/views. They must never silently become a higher authority than their canonical sources.

Canonical location: `docs/prd.md`. This file is the canonical PRD; do not create a duplicate elsewhere.

`prd-review.md` contains reviewer findings and proposed hardening; it is not a second canonical PRD.

Canonical location: `docs/lcs3-worker-task-plan.md`. This file is the single approved worker task plan artifact; do not create a duplicate elsewhere.

## 8. Requirement Traceability

Preserve stable requirement IDs exactly.

Current PRD Must Preserve range:

```text
SRC-001 .. SRC-069
```

Never renumber existing `SRC-###` IDs for convenience.

Do not weaken or merge away P0 requirements.

Acceptance criteria use stable `AC-###` IDs where defined.

When creating downstream SRS/tasks/tests/review findings, maintain traceability to source requirements.

## 9. Workflow Principles

Workflow depth is adaptive based on **complexity + risk**.

Do not force every change through the same pipeline.

Expected principles:

- simple + low risk -> shorter path;
- complex or high risk -> deeper specification/review;
- scoped known bug -> bug fast lane;
- bug revealing missing requirements -> escalate to planning;
- AFK -> continue autonomously while requirements are sufficient;
- HITL -> stop only for meaningful human-authority decisions or true blockers.

## 10. Autonomous Execution Rules

For AFK work:

- do not ask routine mode confirmations;
- diagnose recoverable implementation failures;
- retry only within a bounded retry budget;
- classify failures before deciding whether to retry or escalate;
- never loop indefinitely;
- do not treat missing credentials, specification ambiguity, or human business decisions as ordinary implementation retries.

## 11. Multi-Worker Safety

Use deterministic task ownership.

Requirements include:

- atomic claim;
- lease/expiry semantics;
- dependency awareness;
- write-conflict awareness;
- declared read/write scope;
- recorded scope expansion;
- blast-radius awareness.

Do not rely on agent convention alone to prevent two workers from owning the same task.

## 12. Context Discipline

Load only what is relevant to the current task.

Do not automatically read:

- every work-item artifact;
- every legacy skill;
- every Quality Overlay;
- all project memory.

Prefer selective retrieval and task-specific Context Capsules.

If a derived artifact is stale, regenerate or fall back to canonical sources.

## 13. Quality Overlay Rules

Quality Overlays are task-specific.

Initial expected native overlays:

- `ui-quality`
- `code-quality`
- `security-basic`

Do not load `ui-quality` for a task with no UI concern merely because the overlay exists.

Anti-Slop may be a design reference, but LCS3 owns its native rules and must not require Anti-Slop at runtime.

## 14. Project Memory Rules

Project memory is advisory evidence.

Memory should include provenance, confidence, and freshness where practical.

When memory conflicts with current canonical artifacts or verified repository evidence, current canonical/repository evidence wins.

Do not silently turn a memory observation into a project-wide architecture rule. Promote project-wide decisions explicitly, for example through an ADR workflow.

## 15. Telemetry and Self-Improvement

Telemetry may capture useful local metrics such as:

- workflow/skill;
- task;
- retries;
- failure type;
- context size/token estimate;
- tool calls;
- files read/written;
- result.

Telemetry and self-improvement must **never silently modify**:

- skills;
- manifests;
- schemas;
- runtime contracts;
- project policy.

Self-improvement outputs proposals. Applying them is a separate explicit workflow.

## 16. Testing and Verification

Do not treat Markdown/schema shape tests as sufficient.

Test at three levels:

1. unit tests for deterministic subsystems;
2. integration tests for CLI/filesystem/SQLite interactions;
3. end-to-end workflow scenarios.

Important scenario families include:

- simple feature;
- complex feature;
- bug fast lane;
- AFK;
- HITL;
- multiple work-items;
- multiple workers;
- dependency blocking;
- write conflict;
- review -> fix -> review;
- stale derived artifact;
- retry exhaustion;
- finalization;
- attempted premature skill generation before migration-matrix approval;
- attempted leakage of legacy `.lcs/` contracts into LCS3.

Before claiming a task complete, run the smallest relevant verification first, then the broader gate when appropriate.

## 17. Code and Architecture Guidelines

- Prefer deep modules with small stable interfaces.
- Avoid duplicated business/workflow rules across skills and runtime code.
- Canonicalize framework contracts in manifests where possible.
- Keep `SKILL.md` concise; use references for conditional detail.
- Prefer deterministic scripts/runtime operations for fragile repeatable mechanics.
- Avoid speculative abstractions not required by the PRD/SRS.
- Do not fabricate performance targets, security guarantees, or project facts.
- Keep changes scoped to the active task unless scope expansion is recorded.

## 18. Working With Skills

When creating or rewriting an LCS3 skill:

- use the approved migration matrix as the inventory authority;
- inspect only the relevant legacy skill and directly related references;
- preserve valuable behavior explicitly;
- remove legacy `.lcs/` paths, stale schemas, duplicated shared contracts, and manual state mechanics;
- use `lcs3` runtime capabilities for deterministic stateful work;
- keep the skill entrypoint focused on reasoning/control flow;
- maintain upstream/downstream workflow relationships defined by the migration matrix;
- test the skill against its acceptance criteria and relevant workflow scenario.

## 19. Prohibited Shortcuts

Do not:

- fork/merge legacy LCS history and assume compatibility;
- copy the legacy repository into active LCS3 source directories;
- edit the read-only legacy reference as part of LCS3 work;
- mechanically rename all `lcs-*` skills to `lcs3-*`;
- invent missing skill names or workflow stages;
- bypass the migration matrix for initial skill-family implementation;
- use project memory as canonical truth;
- manually mutate critical runtime state when a deterministic runtime operation exists;
- claim tests passed without running them;
- claim repository facts without checking them.

## 20. Current Project Phase

Current phase: **PRD / pre-SRS architecture hardening**.

Before broad implementation begins, the following must be resolved:

1. complete Legacy Skill Migration Matrix;
2. artifact-format / OKF position;
3. exact workflow phase and task lifecycle contracts;
4. deterministic runtime/SQLite design sufficiently detailed for implementation;
5. PRD review and downstream SRS/system design.

When a requested task conflicts with these gates, preserve the requested work but do not silently bypass the required design decision.

## 21. Staged Task Execution

Execute `L3-###` tasks in `docs/lcs3-worker-task-plan.md` staged (bertahap): in phase order (Phase 0..7), respecting task dependencies and the plan's gates (`GATE-01`..`GATE-05`). Do not skip an unapproved gate to reach a later phase.

After a task's Worker Result Contract reports `status: PASS` and verification ran, update that task's status to done/selesai directly in `docs/lcs3-worker-task-plan.md` before starting a dependent task.
