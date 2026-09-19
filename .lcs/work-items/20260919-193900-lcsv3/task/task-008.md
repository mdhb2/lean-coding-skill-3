---
title: "Task 008: Review-fix loop (FIX-###)"
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
summary: "Add a review -> fix -> review cycle producing tracked FIX-### items until acceptance criteria pass."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-007"
---

# TASK-008: Review-fix loop (FIX-###)

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-007
* **Source coverage**:
  - Sources: SRC-033, SRC-034
  - Requirements: FR-033, FR-034
  - Acceptance Criteria: AC-036, AC-037, AC-038
  - Tests: none defined yet
* **Priority**: medium
* **Scope**: On top of the AFK executor, add a review step that evaluates task output against its acceptance criteria, generates FIX-### items for failures, feeds them back to the executor, and loops until acceptance criteria pass or retry budget is exhausted.
* **Files likely touched**:
  - lcs3-runtime/src/review/review_loop.*
  - lcs3-runtime/src/review/fix_item.*
  - lcs3-runtime/tests/review/*
* **Implementation notes**:
  - FIX-### items are stored in SQLite (from TASK-004), linked to the originating TASK-### and specific failed AC-### criteria.
  - Review loop re-invokes executor with FIX-### context until all linked AC-### pass or the task's retry budget (TASK-007) is exhausted, at which point it escalates.
* **Acceptance criteria**:
  - [ ] AC-036: Failed acceptance criterion produces a FIX-### item linked to the specific AC-### that failed.
  - [ ] AC-037: Review-fix loop re-runs the executor with FIX-### context and re-evaluates the same AC-### criteria.
  - [ ] AC-038: Review-fix loop terminates (pass or escalate) rather than looping indefinitely, respecting the retry budget from TASK-007.
* **Test plan**:
  - Unit tests: fail one AC on first pass, verify FIX-### created and pass on retry; verify escalation when budget exhausted.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `task-coverage.md`

### Assumptions
- FIX-### IDs are per-work-item sequential, similar to TASK-### numbering [unverified — no explicit ID scheme in PRD, following existing convention].

### Plan
1. Define FIX-### schema and storage.
2. Implement review evaluation against AC-### checklist.
3. Wire review loop to re-invoke TASK-007 executor with FIX context.
4. Unit test full loop with pass/fail/escalate paths.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-007 (needs executor + retry budget).
- Downstream: TASK-017 scenario harness includes "review -> fix -> review" scenario family.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-009.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: FIX-### ID scheme is an implementation convention, not explicitly specified; keep consistent with TASK-### numbering.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-008
