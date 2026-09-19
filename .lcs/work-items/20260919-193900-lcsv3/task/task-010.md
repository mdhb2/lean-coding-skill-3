---
title: "Task 010: Verification (Task Gate, Work-item Gate, recipe cache)"
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
summary: "Enforce a Task Gate and Work-item Gate before completion claims, with a cache of verification recipes to avoid re-deriving how to verify."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-005"
---

# TASK-010: Verification (Task Gate, Work-item Gate, recipe cache)

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-005
* **Source coverage**:
  - Sources: SRC-041, SRC-042, SRC-043
  - Requirements: FR-041, FR-042, FR-043
  - Acceptance Criteria: AC-033, AC-034, AC-035
  - Tests: none defined yet
* **Priority**: high
* **Scope**: Implement a Task Gate that runs the smallest relevant verification before a task can be marked done, a Work-item Gate that runs the broader verification before a work-item is finalized, and a recipe cache that stores how to verify a given task/file type so it is not re-derived each time.
* **Files likely touched**:
  - lcs3-runtime/src/verification/task_gate.*
  - lcs3-runtime/src/verification/workitem_gate.*
  - lcs3-runtime/src/verification/recipe_cache.*
  - lcs3-runtime/tests/verification/*
* **Implementation notes**:
  - Task Gate blocks a status transition to done unless its recorded acceptance criteria have passing verification evidence.
  - Work-item Gate blocks finalization unless all constituent tasks pass their Task Gates.
  - Recipe cache keys on task type/file pattern and stores the verification command/steps used successfully before; cache entries are invalidated if the underlying command fails on reuse.
* **Acceptance criteria**:
  - [ ] AC-033: Task cannot transition to done status without passing Task Gate verification evidence.
  - [ ] AC-034: Work-item cannot be finalized while any task's Task Gate has not passed.
  - [ ] AC-035: Recipe cache returns a previously successful verification recipe for a matching task type instead of re-deriving it, and invalidates on failure.
* **Test plan**:
  - Unit tests: block done-transition on failing gate; block work-item finalization with one failing task; recipe cache hit/miss/invalidation.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `task-coverage.md`

### Assumptions
- Recipe cache is per-project (not global across work-items) [unverified — reasonable default, not specified].

### Plan
1. Implement Task Gate check against SQLite task status/AC records.
2. Implement Work-item Gate aggregating Task Gate results.
3. Implement recipe cache with invalidation logic.
4. Unit test all three components.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-005 (needs dependency graph to determine work-item completeness).
- Downstream: TASK-016 (doctor) and TASK-017 (scenario harness) depend on gates existing.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-011.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Recipe cache scope (per-project vs global) is an implementation choice; default to per-project.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-010
