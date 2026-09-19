---
title: "Task 019: lcs3-* skill-family generation from approved matrix"
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
summary: "Generate the lcs3-* skill family strictly from the signed-off migration matrix, using clean-slate redesign rather than mechanical renaming."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-018"
---

# TASK-019: lcs3-* skill-family generation from approved matrix

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-018
* **Source coverage**:
  - Sources: SRC-065, SRC-066, SRC-067, SRC-068
  - Requirements: FR-065, FR-066, FR-067, FR-068
  - Acceptance Criteria: AC-057, AC-058, AC-059, AC-064, AC-065
  - Tests: none defined yet
* **Priority**: high
* **Scope**: Once TASK-018 sign-off is recorded, generate the `lcs3-*` skill family for every legacy skill classified REWRITE or MERGE, using the Clean-Slate Rule (preserve behavior, redesign mechanics) rather than copy-rename. Skills classified DROP are not generated; skills classified REPLACED_BY_RUNTIME are implemented as runtime capabilities (already covered by TASK-001..017), not as skills.
* **Files likely touched**:
  - lcs3-*/SKILL.md (one per approved REWRITE/MERGE skill from the matrix)
  - .lcs/work-items/20260919-193900-lcsv3/migration-matrix.md (read-only reference for this task)
* **Implementation notes**:
  - Hard gate: do not write any lcs3-* skill file unless TASK-018's sign-off record exists and is checked at the start of this task.
  - For each REWRITE-classified legacy skill: identify user-visible behavior worth preserving, discard obsolete legacy mechanics/paths/schemas, map deterministic mechanics to the lcs3 runtime (TASK-001..017), and author a lean new SKILL.md.
  - For the 1 MERGE-classified skill: combine the relevant legacy skills' preserved behavior into a single lcs3-* skill rather than a 1:1 rename.
  - Do not mechanically rename all lcs-* to lcs3-*; each skill must be traceable to an explicit LCS3 requirement/design decision (per AGENTS.md §4, §19).
* **Acceptance criteria**:
  - [ ] AC-057: Every REWRITE-classified legacy skill has a corresponding lcs3-* skill file, and no DROP-classified skill has one generated.
  - [ ] AC-058: The MERGE-classified skill produces exactly one combined lcs3-* skill file, not multiple 1:1 renames.
  - [ ] AC-059: No lcs3-* skill file references legacy `.lcs/` paths, schemas, or state mechanics as a requirement.
  - [ ] AC-064: This task's execution is blocked and produces no output until TASK-018's sign-off record is verified present.
  - [ ] AC-065: Each generated lcs3-* skill is traceable to a migration-matrix entry or an explicit LCS3 requirement, not invented from memory.
* **Test plan**:
  - Verify TASK-018 gate check blocks execution when sign-off absent (simulate both states).
  - For a sample of 3 generated skills, verify no legacy `.lcs/` path references and verify traceability back to matrix entries.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `AGENTS.md` (§3-5, §18-19)
- migration matrix artifact (23 skills classified)

### Assumptions
- Migration matrix's 18 REWRITE + 1 MERGE + 4 REPLACED_BY_RUNTIME classifications are final and will not change between now and TASK-018 sign-off [unverified — if matrix changes before sign-off, this task's file list must be re-derived from the updated matrix, not this cached count].

### Plan
1. Verify TASK-018 sign-off record exists; abort with clear message if not.
2. Read approved migration matrix.
3. Generate one lcs3-* SKILL.md per REWRITE entry, one combined skill for the MERGE entry.
4. Skip DROP and REPLACED_BY_RUNTIME entries.
5. Validate no legacy path leakage and full traceability.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-018 (HITL gate) — hard block, no partial execution before sign-off.
- Terminal task in the plan; no downstream tasks depend on it within this 19-task set.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: none (last task in sequence)
Current phase: tasks
Current confidence: high
Blocking questions: Blocked entirely on TASK-018 human sign-off; do not attempt any part of this task before that gate clears.
Risks to carry forward: If migration matrix changes after this task file was written but before sign-off, re-derive skill list from the updated matrix rather than this task's cached classification counts.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md, AGENTS.md, migration matrix artifact
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-019 (only after TASK-018 sign-off)
