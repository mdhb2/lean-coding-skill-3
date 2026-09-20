---
name: lcs3-task-slicer
description: 'Use this skill whenever the user asks to split a reviewed PRD into executable tasks. Trigger on "slice prd", "break down prd", "create tasks", or similar. Produce small, dependency-aware tracer-bullet vertical slices. Classify tasks into AFK (autonomous) or HITL (requires human input). Present the proposed breakdown to the user for feedback before writing tasks. Do NOT trigger for: PRD creation (lcs3-toprd), code review (lcs3-code-review), bug investigation (lcs3-debug), or implementation (lcs3-task-executor).'
source: lcs-task-slicer (MIG-019, REWRITE)
modes: [AFK, HITL]
---

# LCS3 Task Slicer

## Purpose

Preserve: small dependency-aware tracer-bullet tasks; AFK/HITL classification; present/validate breakdown; acceptance/test mapping. Task schema/lifecycle follows GATE-03 contracts.

## Trigger

Use when: user asks to slice a PRD, break down a PRD into tasks, create executable tasks, or generate a task breakdown from SRS.

Do NOT use for: PRD creation (lcs3-toprd), code review (lcs3-code-review), bug investigation (lcs3-debug), or implementation (lcs3-task-executor).

## Workflow

1. Read source bundle: SRS (`srs.md`) when present, otherwise `prd-enhanced.md` or `prd.md`. If `traceability.md` contains unresolved `SRC-###` entries, stop — report as slicing blocker.
2. If SRS exists, use `FR-###`, `BR-###`, `VR-###`, `EC-###`, `AC-###` as primary slicing source instead of PRD prose.
3. Draft tracer-bullet vertical slices: each task cuts through all layers end-to-end (schema, API, logic, tests), not horizontal layer slices.
4. Classify each task as AFK (autonomous, implementable without human input) or HITL (requires human decision, architectural review, or design input). Prefer AFK.
5. Present proposed breakdown to user for feedback: granularity, dependency correctness, AFK/HITL split. Iterate until approved.
6. Write each approved task via runtime: allocate task ID, set scope, register dependencies, emit findings for gaps.
7. Generate task coverage matrix: every `SRC-###`, `FR-###`, `AC-###` maps to at least one task. Flag uncovered IDs as gaps.
8. Emit evidence report and hand off to `lcs3-task-executor`.

## Runtime calls

- `createTask(manifestDir, ...)` — allocate task ID and register task record.
- `checkDependencies(manifestDir, ...)` — validate dependency graph before writing.
- `assertDependenciesReady(manifestDir, ...)` — verify no circular or missing deps.
- `setTaskScope(manifestDir, ...)` — register task file scope for conflict detection.
- `checkConflicts(manifestDir, ...)` — detect scope overlaps with existing tasks.
- `emitFinding(manifestDir, ...)` — record slicing gaps or uncovered requirements.
- `generateTraceability(projectRoot, ...)` — render task→requirement traceability.
- `generateTaskCoverage(projectRoot, ...)` — produce coverage matrix.
- `generateCapsule(projectRoot, ...)` — produce context capsule for executor handoff.
- Path-string entries only: `dbPath`, `projectRoot`, `manifestDir`. No raw SQL, no DatabaseSync.

## Evidence report

- **Sources checked:** SRS or PRD, traceability matrix, existing task graph.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** all `SRC-###` covered or flagged as gaps; no circular dependencies; AFK/HITL classified.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-tosrs, lcs3-prd-reviewer, lcs3-toprd.
- **Downstream:** lcs3-task-executor.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-019
- SRC: SRC-015, SRC-024, SRC-025, SRC-026, SRC-027, SRC-028, SRC-029, SRC-030, SRC-037, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
