---
title: "Task 002: lcs3 init + .lcs3/ root + central policy"
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
summary: "lcs3 CLI init command creates .lcs3/ root and central policy file"
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: TASK-001
---

# TASK-002: lcs3 init + .lcs3/ root + central policy

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-001
* **Source coverage**:
  - Requirements: FR-005, FR-006
  - Acceptance Criteria: AC-001, AC-002, AC-004
* **Priority**: high
* **Scope**: `lcs3 init` command scaffolds `.lcs3/` directory tree and writes a central policy file governing runtime behavior defaults.
* **Files likely touched**:
  - cli/init.* (command entrypoint)
  - .lcs3/policy.* (generated)
* **Implementation notes**:
  - Idempotent init: re-running should not destroy existing state.
  - Policy file holds defaults referenced by later manifest/validation tasks (TASK-003).
* **Acceptance criteria**:
  - [ ] `lcs3 init` creates `.lcs3/` with expected subdirs
  - [ ] Central policy file is valid and loadable
  - [ ] Re-running init is safe (no data loss)
* **Test plan**:
  - Unit: init on empty dir, init on existing dir (idempotency).

## Chain of Truth Report
### Level
Strict
### Sources Checked
- srs.md, prd.md, task-001.md
### Assumptions
- Policy file format (YAML/JSON) decided at implementation time [unverified]
### Plan
1. Implement init command. 2. Write policy schema. 3. Idempotency test.
### Actions Taken
Not yet started.
### Verification
Pending.
### Report
Pending.

## Blocking Edges & Expand-Contract Pattern
Blocked by TASK-001. Unblocks TASK-003.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: .lcs/work-items/20260919-193900-lcsv3/task/task-003.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: None
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: FR-005, FR-006, AC-001, AC-002, AC-004
Unresolved IDs: None
Suggested next command: Eksekusi TASK-003
