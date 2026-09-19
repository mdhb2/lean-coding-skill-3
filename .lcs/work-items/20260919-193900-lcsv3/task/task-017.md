---
title: "Task 017: Scenario test harness (15 e2e families)"
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
summary: "Build an end-to-end scenario harness covering the 15 required workflow scenario families from AGENTS.md §16."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-006, TASK-007, TASK-008, TASK-010, TASK-012, TASK-013, TASK-014, TASK-016"
---

# TASK-017: Scenario test harness (15 e2e families)

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-006, TASK-007, TASK-008, TASK-010, TASK-012, TASK-013, TASK-014, TASK-016
* **Source coverage**:
  - Sources: SRC-063, SRC-064
  - Requirements: FR-063, FR-064
  - Acceptance Criteria: AC-054, AC-055
  - Tests: none defined yet
* **Priority**: high
* **Scope**: Build an end-to-end scenario test harness exercising the workflow scenario families listed in AGENTS.md §16: simple feature, complex feature, bug fast lane, AFK, HITL, multiple work-items, multiple workers, dependency blocking, write conflict, review -> fix -> review, stale derived artifact, retry exhaustion, finalization, attempted premature skill generation before migration-matrix approval, and attempted leakage of legacy `.lcs/` contracts into LCS3.
* **Files likely touched**:
  - lcs3-runtime/tests/e2e/scenarios/*.test
  - lcs3-runtime/tests/e2e/harness.*
* **Implementation notes**:
  - Each scenario is a self-contained fixture exercising the relevant subsystem(s) built in TASK-004 through TASK-016.
  - "Attempted premature skill generation before migration-matrix approval" scenario asserts TASK-019 cannot run/produce output while TASK-018 gate is unresolved.
  - "Attempted leakage of legacy .lcs/ contracts" scenario asserts TASK-012's isolation guarantee holds.
* **Acceptance criteria**:
  - [ ] AC-054: All 15 scenario families listed in AGENTS.md §16 have at least one passing or explicitly-failing (with reason) automated test.
  - [ ] AC-055: Scenario harness can be run as a single command producing a pass/fail summary per scenario family.
* **Test plan**:
  - Run harness against all subsystems built so far; verify each of the 15 named scenario families is represented and produces a deterministic result.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `AGENTS.md` (§16 Testing and Verification, full scenario family list)

### Assumptions
- All 15 scenario families are enumerated verbatim from AGENTS.md §16 [verified — direct list copy].

### Plan
1. Enumerate the 15 scenario families as individual test fixtures.
2. Implement harness runner producing per-family pass/fail summary.
3. Wire each fixture to the relevant already-built subsystem (TASK-004..016).
4. Run full harness and record results.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-006, TASK-007, TASK-008, TASK-010, TASK-012, TASK-013, TASK-014, TASK-016 (all subsystems under test must exist first).
- Terminal verification task before HITL gate (TASK-018) and skill generation (TASK-019).

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-018.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: This is the widest-dependency task in the plan; if any upstream task (4-16) has an incomplete API, this task's scenarios will need re-scoping. Treat partial harness completion as acceptable if individual scenario gaps are documented, not silently dropped.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md, AGENTS.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-017
