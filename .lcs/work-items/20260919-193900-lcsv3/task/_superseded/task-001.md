---
title: "Task 001: Bootstrap repo/namespace + legacy read-only reference"
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
summary: "Establish LCS3 repo namespace, .lcs3/ separation from legacy .lcs/, and read-only legacy reference mount"
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: None
---

# TASK-001: Bootstrap repo/namespace + legacy read-only reference

* **Status**: pending
* **Type**: AFK
* **Depends on**: None
* **Source coverage**:
  - Requirements: FR-001, FR-002, FR-003
  - Acceptance Criteria: AC-001, AC-003, AC-060
* **Priority**: high
* **Scope**: Establish canonical LCS3 namespace (`lcs3` CLI, `.lcs3/` project dir), never `.lcs/` for runtime state. Set up `reference/legacy-lcs/` as isolated read-only mount point for legacy LCS codebase inspection.
* **Files likely touched**:
  - AGENTS.md (namespace confirmation, already exists)
  - reference/legacy-lcs/ (mount/symlink or submodule pin)
  - .gitignore or repo config for reference isolation
* **Implementation notes**:
  - Verify `.lcs3/` does not collide with existing `.lcs/` (legacy LCS3 workflow scaffolding, separate concern).
  - Add write-protection convention (docs or pre-commit hook) preventing edits under `reference/legacy-lcs/`.
  - Document namespace rules in a root-level policy note if not already in AGENTS.md.
* **Acceptance criteria**:
  - [ ] `.lcs3/` directory convention documented and never conflated with `.lcs/`
  - [ ] `reference/legacy-lcs/` exists and is clearly marked read-only
  - [ ] No LCS3 runtime code writes into `reference/legacy-lcs/`
* **Test plan**:
  - Manual: attempt a write under reference/legacy-lcs/ via runtime tooling, confirm rejection/absence of write path.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `.lcs/work-items/20260919-193900-lcsv3/srs.md`
- `.lcs/work-items/20260919-193900-lcsv3/prd.md`

### Assumptions
- Legacy LCS repo location TBD at implementation time [unverified]

### Plan
1. Confirm namespace docs. 2. Create reference/ mount. 3. Add protection convention.

### Actions Taken
Not yet started.

### Verification
Pending implementation.

### Report
Pending.

## Blocking Edges & Expand-Contract Pattern
No blockers. First task in dependency chain — unblocks TASK-002.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: .lcs/work-items/20260919-193900-lcsv3/task/task-002.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Legacy repo location/pin method not yet decided
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: FR-001, FR-002, FR-003, AC-001, AC-003, AC-060
Unresolved IDs: None
Suggested next command: Eksekusi TASK-002
