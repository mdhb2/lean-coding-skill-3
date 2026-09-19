---
title: "Task 007: AFK/HITL executor + bounded retry + failure taxonomy"
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
summary: "Execute AFK work autonomously with bounded retries, classify failures, and stop only for true HITL blockers."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-005"
---

# TASK-007: AFK/HITL executor + bounded retry + failure taxonomy

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-005
* **Source coverage**:
  - Sources: SRC-029, SRC-030, SRC-031, SRC-032
  - Requirements: FR-029, FR-030, FR-031, FR-032
  - Acceptance Criteria: AC-019, AC-020, AC-021, AC-022, AC-023
  - Tests: none defined yet
* **Priority**: high
* **Scope**: Build the executor loop that runs AFK tasks autonomously, retries recoverable failures within a bounded budget, classifies failure types (recoverable vs credential/business-decision/ambiguity blockers), and stops for HITL only on true blockers rather than routine confirmations.
* **Files likely touched**:
  - lcs3-runtime/src/executor/afk_loop.*
  - lcs3-runtime/src/executor/failure_taxonomy.*
  - lcs3-runtime/src/executor/retry_budget.*
  - lcs3-runtime/tests/executor/*
* **Implementation notes**:
  - Failure taxonomy categories: transient/recoverable, missing-credentials, specification-ambiguity, human-business-decision.
  - Only transient/recoverable failures consume retry budget; other categories immediately escalate to HITL.
  - Retry budget is bounded (max attempts configurable) and never loops indefinitely.
  - Executor must not ask routine mode confirmations for AFK-classified work.
* **Acceptance criteria**:
  - [ ] AC-019: Recoverable failure is retried automatically up to the bounded budget.
  - [ ] AC-020: Retry budget exhaustion stops retrying and reports failure instead of looping indefinitely.
  - [ ] AC-021: Missing-credential failure escalates to HITL immediately, without consuming retry budget.
  - [ ] AC-022: Specification-ambiguity failure escalates to HITL immediately.
  - [ ] AC-023: AFK task execution proceeds without routine confirmation prompts.
* **Test plan**:
  - Unit tests: simulate each failure category and assert correct retry/escalate behavior; assert retry budget hard cap.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `task-coverage.md`

### Assumptions
- Retry budget default value not specified in PRD; executor implementation may pick a sane default (e.g. 3) and make it configurable [unverified].

### Plan
1. Define failure taxonomy enum and classifier hook.
2. Implement retry loop with bounded budget.
3. Implement HITL escalation path for non-recoverable categories.
4. Unit test each category.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-005 (needs task claim/lease + dependency graph).
- Downstream: TASK-008 (review-fix loop) builds on this executor.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-008.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Default retry budget value is an implementation choice, not specified by PRD; document choice in code comments.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-007
