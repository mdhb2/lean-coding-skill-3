---
title: "Task 003: Canonical manifest loader + drift validation"
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
summary: "Loader for canonical manifests with drift detection against derived artifacts"
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: TASK-002
---

# TASK-003: Canonical manifest loader + drift validation

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-002
* **Source coverage**:
  - Requirements: FR-010, FR-011, FR-012, FR-013
  - Acceptance Criteria: AC-004, AC-005, AC-009, AC-056
* **Priority**: high
* **Scope**: Load canonical manifests (skill manifests, artifact-type registry) and validate no drift between canonical source and derived/generated copies.
* **Files likely touched**:
  - runtime/manifest_loader.*
  - runtime/drift_validator.*
* **Implementation notes**:
  - Manifest schema must classify each artifact as canonical vs derived (AGENTS.md §7).
  - Drift validation runs on demand and via doctor (TASK-016).
* **Acceptance criteria**:
  - [ ] Manifest loader parses and validates schema
  - [ ] Drift check flags mismatched derived artifacts
  - [ ] Canonical/derived classification enforced
* **Test plan**:
  - Unit: valid manifest load, corrupted manifest rejection, drift detection on stale derived file.

## Chain of Truth Report
### Level
Strict
### Sources Checked
- srs.md, prd.md, AGENTS.md §7
### Assumptions
- None unverified beyond schema format choice
### Plan
1. Define manifest schema. 2. Implement loader. 3. Implement drift check.
### Actions Taken
Not yet started.
### Verification
Pending.
### Report
Pending.

## Blocking Edges & Expand-Contract Pattern
Blocked by TASK-002. Unblocks TASK-004, TASK-012, TASK-013, TASK-014.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: .lcs/work-items/20260919-193900-lcsv3/task/task-004.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: None
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: FR-010, FR-011, FR-012, FR-013, AC-004, AC-005, AC-009, AC-056
Unresolved IDs: None
Suggested next command: Eksekusi TASK-004
