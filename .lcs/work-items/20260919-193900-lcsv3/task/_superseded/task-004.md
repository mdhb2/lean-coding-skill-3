---
title: "Task 004: SQLite runtime-state core + atomic claim/lease"
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
summary: "SQLite-backed runtime state store with atomic task claim and lease/expiry"
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: TASK-003
---

# TASK-004: SQLite runtime-state core + atomic claim/lease

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-003
* **Source coverage**:
  - Requirements: FR-016, FR-017, FR-018, FR-025
  - Acceptance Criteria: AC-011, AC-012, AC-013, AC-014
* **Priority**: high
* **Scope**: Dynamic execution state (task lifecycle, ownership) lives in SQLite per AGENTS.md §7/§11. Implement atomic claim (compare-and-swap) and lease with expiry so two workers cannot own the same task.
* **Files likely touched**:
  - runtime/db/schema.sql
  - runtime/state_store.*
  - runtime/claim.*
* **Implementation notes**:
  - Claim must be atomic transaction (SQLite `BEGIN IMMEDIATE` or equivalent).
  - Lease expiry triggers automatic re-claimability.
* **Acceptance criteria**:
  - [ ] Two concurrent claim attempts on same task: exactly one succeeds
  - [ ] Expired lease allows re-claim
  - [ ] State survives process restart (durable SQLite file)
* **Test plan**:
  - Integration: concurrent claim race test, lease expiry test, restart durability test.

## Chain of Truth Report
### Level
Strict
### Sources Checked
- srs.md, prd.md, AGENTS.md §6,§7,§11
### Assumptions
- None
### Plan
1. Schema design. 2. Claim/lease logic. 3. Concurrency tests.
### Actions Taken
Not yet started.
### Verification
Pending.
### Report
Pending.

## Blocking Edges & Expand-Contract Pattern
Blocked by TASK-003. Unblocks TASK-005, TASK-009, TASK-015, TASK-016.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: .lcs/work-items/20260919-193900-lcsv3/task/task-005.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: None
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: FR-016, FR-017, FR-018, FR-025, AC-011, AC-012, AC-013, AC-014
Unresolved IDs: None
Suggested next command: Eksekusi TASK-005
