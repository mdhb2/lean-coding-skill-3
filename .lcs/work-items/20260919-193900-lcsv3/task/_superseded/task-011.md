---
title: "Task 011: Deterministic traceability generation"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs-task-slicer"
created: 2026-09-19
updated: 2026-09-19
artifact_type: task
cot_level: very_strict
version: "1.0"
status: pending
tags: [task, implementation]
summary: "Generate traceability.md deterministically from the runtime graph instead of hand-maintained prose."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-005, TASK-009"
---

# TASK-011: Deterministic traceability generation

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-005, TASK-009
* **Source coverage**:
  - Sources: SRC-044
  - Requirements: FR-044
  - Acceptance Criteria: AC-010
  - Tests: none defined yet
* **Priority**: medium
* **Scope**: Generate a traceability.md (or equivalent derived artifact) from the SQLite dependency/scope graph (TASK-005) and context engine (TASK-009), mapping SRC-###/FR-###/AC-### to TASK-### deterministically, rather than requiring hand-maintained cross-reference tables.
* **Files likely touched**:
  - lcs3-runtime/src/traceability/generator.*
  - lcs3-runtime/tests/traceability/*
* **Implementation notes**:
  - Traceability generator reads task Source coverage metadata (as recorded in each task-###.md frontmatter/body, or equivalently in the runtime DB) and produces a full ID-to-task mapping.
  - Output is a derived/generated artifact; regenerating it must be idempotent and never require manual edits to stay correct.
  - Flag any SRC-###/FR-###/AC-### with zero covering tasks under a Gaps section, mirroring task-coverage.md's existing Gaps format.
* **Acceptance criteria**:
  - [ ] AC-010: Traceability output is generated deterministically from graph/coverage data, not hand-maintained, and reproducible on rerun with no diff for unchanged inputs.
* **Test plan**:
  - Unit test: run generator twice on same input, assert identical output (determinism); run with an intentionally uncovered ID, assert it appears in Gaps.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `task-coverage.md`

### Assumptions
- Task Source-coverage metadata (as written in each task-###.md) is the authoritative input for generation, since a formal SQLite coverage table does not yet exist in this runtime design pass [verified against actually-written task files in this work item].

### Plan
1. Parse Source coverage sections from all task-###.md files (or runtime DB once TASK-005/009 land).
2. Build full ID -> task mapping.
3. Emit traceability.md with Gaps section for uncovered IDs.
4. Unit test idempotency and gap detection.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-005 (dependency graph) and TASK-009 (context engine, for reading task artifacts consistently).
- Downstream: TASK-016 (doctor integrity checks) consumes this generator's output for cross-checking.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-012.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: task-coverage.md already flagged FR-007,008,009,014,015 as possibly-uncovered folded-in items; TASK-011 generator should surface these again automatically once implemented, confirming or resolving the gap.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-011
