---
title: "Task 016: Doctor integrity checks"
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
summary: "Cross-check runtime state, dependency graph, context capsules, and traceability output for integrity drift."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-004, TASK-005, TASK-009, TASK-011"
---

# TASK-016: Doctor integrity checks

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-004, TASK-005, TASK-009, TASK-011
* **Source coverage**:
  - Sources: SRC-062
  - Requirements: FR-062
  - Acceptance Criteria: AC-053
  - Tests: none defined yet
* **Priority**: medium
* **Scope**: Implement a `doctor` command/check that cross-validates the SQLite runtime state, dependency/conflict graph, context capsule freshness, and generated traceability against canonical artifacts, reporting any drift or inconsistency.
* **Files likely touched**:
  - lcs3-runtime/src/doctor/checks.*
  - lcs3-runtime/src/doctor/report.*
  - lcs3-runtime/tests/doctor/*
* **Implementation notes**:
  - Doctor runs a battery of checks: orphaned tasks (no valid dependency edges), stale Context Capsules not yet refreshed, traceability output diverging from current task Source-coverage data, and manifest drift (from TASK-003).
  - Output a structured pass/fail report per check, not just a binary result.
* **Acceptance criteria**:
  - [ ] AC-053: Doctor check detects at least one class of injected integrity drift (e.g. stale capsule, orphaned task, traceability mismatch) in a test scenario and reports it clearly.
* **Test plan**:
  - Unit tests: inject a stale capsule, an orphaned task edge, and a traceability mismatch in turn; verify doctor flags each distinctly.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `task-coverage.md`

### Assumptions
- Doctor is a read-only diagnostic; it reports drift but does not auto-repair it in this task's scope [unverified — repair actions, if any, deferred to a future task or manual fix].

### Plan
1. Implement individual check functions for each drift class.
2. Aggregate into a single doctor report.
3. Unit test each check with injected drift fixtures.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-004 (runtime state), TASK-005 (graph), TASK-009 (context engine), TASK-011 (traceability) — all four subsystems being checked must exist first.
- Downstream: TASK-017 scenario harness exercises doctor as part of end-to-end verification.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-017.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Doctor is diagnostic-only per this task's scope; auto-repair is explicitly out of scope and should not be silently added.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-016
