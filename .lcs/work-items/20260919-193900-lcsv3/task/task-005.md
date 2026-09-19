---
title: "Task 005: Task dependency + conflict graph + scope/blast-radius"
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
summary: "Build dependency graph, write-conflict detection, declared read/write scope, and blast-radius awareness for multi-worker safety."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-004"
---

# TASK-005: Task dependency + conflict graph + scope/blast-radius

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-004
* **Source coverage**:
  - Sources: SRC-019, SRC-020, SRC-021, SRC-022, SRC-023, SRC-024
  - Requirements: FR-019, FR-020, FR-021, FR-022, FR-023, FR-024
  - Acceptance Criteria: AC-010, AC-024, AC-025, AC-026, AC-027, AC-028
  - Tests: none defined yet
* **Priority**: high
* **Scope**: On top of the SQLite runtime-state core (TASK-004), add a task dependency graph (blocked_by edges), write-conflict detection between concurrently claimed tasks, declared read/write scope per task, and blast-radius computation so a worker can see what else is touched before claiming.
* **Files likely touched**:
  - lcs3-runtime/src/graph/dependency_graph.*
  - lcs3-runtime/src/graph/conflict_detector.*
  - lcs3-runtime/src/graph/scope.*
  - lcs3-runtime/src/graph/blast_radius.*
  - lcs3-runtime/tests/graph/*
* **Implementation notes**:
  - Represent task dependency edges (blocked_by) as a DAG stored in SQLite (from TASK-004 schema); detect cycles and reject on insert.
  - Compute "ready" set: tasks whose all blocked_by dependencies are status=done.
  - Track declared read/write file-scope per task; compute conflict when two open/claimed tasks declare overlapping write scopes.
  - Blast-radius: for a task's declared scope, compute transitive dependents that would need re-verification if that scope changes.
  - Expose query API: get_ready_tasks(), detect_conflicts(task_id), get_blast_radius(task_id).
* **Acceptance criteria**:
  - [ ] AC-010: Traceability/dependency data is deterministically queryable, not hand-maintained prose.
  - [ ] AC-024: Cyclic blocked_by dependency is rejected at insert time with clear error.
  - [ ] AC-025: get_ready_tasks() returns only tasks with all dependencies satisfied.
  - [ ] AC-026: Two tasks with overlapping write scope are flagged as conflicting before both can be claimed.
  - [ ] AC-027: Declared read/write scope is stored and queryable per task.
  - [ ] AC-028: Blast-radius query returns transitive dependents for a given task's scope.
* **Test plan**:
  - Unit tests: cycle rejection, ready-set computation with partial completion, conflict detection with overlapping/non-overlapping scopes, blast-radius on a sample 5-task graph.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `task-coverage.md`

### Assumptions
- Graph and conflict data live in the same SQLite runtime-state DB as TASK-004 [unverified — exact schema not yet designed, deferred to implementation].
- Scope is declared per task as file-path or path-prefix lists [verified against PRD §11 Multi-Worker Safety].

### Plan
1. Design dependency/scope/conflict schema extending TASK-004's SQLite core.
2. Implement dependency graph insert/query with cycle rejection.
3. Implement scope declaration and conflict detector.
4. Implement blast-radius traversal.
5. Write unit tests for all four behaviors.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-004 (needs SQLite runtime-state core to exist first).
- Downstream: TASK-006, TASK-007, TASK-010, TASK-011, TASK-016 all depend on this task's graph/scope APIs.
- Not a wide refactor; standard vertical slice.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-006.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Conflict-detection granularity (file-level vs directory-level) not yet decided; deferred to implementation with executor discretion.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-005
