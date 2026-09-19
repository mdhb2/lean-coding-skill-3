---
title: "Task 006: Adaptive workflow router (complexity+risk, bug fast lane)"
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
summary: "Route work through a shorter or deeper pipeline based on complexity and risk, with a dedicated bug fast lane."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-005"
---

# TASK-006: Adaptive workflow router (complexity+risk, bug fast lane)

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-005
* **Source coverage**:
  - Sources: SRC-026, SRC-027, SRC-028
  - Requirements: FR-026, FR-027, FR-028
  - Acceptance Criteria: AC-015, AC-016, AC-017, AC-018
  - Tests: none defined yet
* **Priority**: high
* **Scope**: Implement the workflow router that classifies incoming work by complexity + risk, chooses a workflow depth (short path for simple/low-risk, deeper spec/review for complex/high-risk), and routes scoped bug fixes through a dedicated fast lane rather than the full pipeline.
* **Files likely touched**:
  - lcs3-runtime/src/router/complexity_classifier.*
  - lcs3-runtime/src/router/risk_classifier.*
  - lcs3-runtime/src/router/workflow_router.*
  - lcs3-runtime/tests/router/*
* **Implementation notes**:
  - Define complexity signals (files touched estimate, blast radius from TASK-005, novelty) and risk signals (production impact, security surface, irreversibility).
  - Router returns one of: fast-lane-bug, short-path, full-pipeline.
  - Bug fast lane requires task to be a scoped known bug (not requirement-revealing); if investigation reveals missing requirements, escalate out of fast lane to full pipeline (per PRD §9 escalation rule).
* **Acceptance criteria**:
  - [ ] AC-015: Simple, low-risk task is routed to short-path workflow, not forced through full pipeline.
  - [ ] AC-016: Complex or high-risk task is routed to full pipeline with deeper spec/review.
  - [ ] AC-017: Scoped bug fix is routed through the bug fast lane.
  - [ ] AC-018: Bug fast-lane task that reveals missing requirements escalates to planning/full pipeline instead of silently proceeding.
* **Test plan**:
  - Unit tests: classifier on synthetic low/high complexity+risk inputs; fast-lane routing; escalation trigger on requirement-gap signal.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `task-coverage.md`

### Assumptions
- Complexity/risk classification can be heuristic-based initially, refined later [unverified — no ML model required per PRD].

### Plan
1. Define classifier interfaces for complexity and risk.
2. Implement router decision logic and fast-lane detection.
3. Implement escalation trigger.
4. Unit test all paths.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-005 (needs scope/blast-radius signal as complexity input).
- Downstream: TASK-017 (scenario harness) exercises this router.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-007.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Exact complexity/risk scoring thresholds are heuristic and may need tuning after scenario testing (TASK-017).
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-006
