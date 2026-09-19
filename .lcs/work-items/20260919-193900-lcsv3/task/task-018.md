---
title: "Task 018: HITL GATE — Migration-matrix sign-off"
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
tags: [task, hitl-gate]
summary: "Human sign-off on the completed Legacy Skill Migration Matrix, required before any lcs3-* skill file is generated."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "None"
---

# TASK-018: HITL GATE — Migration-matrix sign-off

* **Status**: pending
* **Type**: HITL
* **Depends on**: None
* **Source coverage**:
  - Sources: SRC-004
  - Requirements: FR-004
  - Acceptance Criteria: AC-061, AC-062, AC-063
  - Tests: none defined yet
* **Priority**: high
* **Scope**: Present the completed Legacy Skill Migration Matrix (23 legacy skills classified: 18 REWRITE, 1 MERGE, 0 DROP, 4 REPLACED_BY_RUNTIME) to the human authority for explicit sign-off. This is a decision gate, not an implementation task — it produces no code, only an approval record.
* **Files likely touched**:
  - .lcs/work-items/20260919-193900-lcsv3/migration-matrix.md (or wherever the matrix currently lives — add explicit sign-off field/section)
* **Implementation notes**:
  - Do not proceed to TASK-019 (skill-family generation) until this sign-off is explicitly recorded (approved-by, timestamp).
  - Per AGENTS.md §4 and §19, do not invent the LCS3 skill inventory from memory or PRD wording alone, and do not bypass this gate for initial skill-family implementation.
* **Acceptance criteria**:
  - [ ] AC-061: Migration matrix is presented to the human with all 23 classifications and rationale visible.
  - [ ] AC-062: An explicit sign-off record (approver, timestamp, scope approved) is captured before TASK-019 can start.
  - [ ] AC-063: If the human rejects or requests changes, the matrix is revised and re-submitted rather than TASK-019 proceeding on the unapproved version.
* **Test plan**:
  - Manual: human reviews matrix and provides explicit approval or requested changes; verify TASK-019 file/task state reflects the gate as unblocked only after approval is recorded.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `AGENTS.md` (§4 Mandatory Legacy Skill Migration Matrix, §19 Prohibited Shortcuts)

### Assumptions
- Migration matrix content already exists and is complete (23 skills classified) per prior session work; only sign-off is outstanding [verified against ledger/prior session notes].

### Plan
1. Surface the completed matrix for human review.
2. Capture explicit approval or change requests.
3. Record sign-off (or revision cycle) before unblocking TASK-019.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Not blocked by any task; can be raised for review any time the matrix is stable.
- Blocks TASK-019 exclusively. Does not block TASK-001 through TASK-017 (runtime/CLI work proceeds independently).

## Handoff
Next recommended skill: lcs-master (or direct human review)
Next file to read: task-019.md
Current phase: tasks
Current confidence: high
Blocking questions: Awaiting human sign-off on migration matrix — this is the actual HITL blocker, not an implementation question.
Risks to carry forward: TASK-019 must not be started or have its skill files generated until this gate's sign-off is explicitly recorded.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md, AGENTS.md, migration matrix artifact
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Review migration matrix and provide sign-off
