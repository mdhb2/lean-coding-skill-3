---
title: "Task 013: Quality Overlay framework + 3 native overlays"
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
summary: "Build the task-specific Quality Overlay framework and ship ui-quality, code-quality, security-basic as native overlays."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-003"
---

# TASK-013: Quality Overlay framework + 3 native overlays

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-003
* **Source coverage**:
  - Sources: SRC-050, SRC-051, SRC-052, SRC-053
  - Requirements: FR-050, FR-051, FR-052, FR-053
  - Acceptance Criteria: AC-043, AC-044, AC-045, AC-046
  - Tests: none defined yet
* **Priority**: medium
* **Scope**: Implement the Quality Overlay framework that attaches task-specific quality rule sets, and ship the three initial native overlays (ui-quality, code-quality, security-basic), applying overlays only when relevant to the task (e.g. no ui-quality load for a task with no UI concern).
* **Files likely touched**:
  - lcs3-runtime/src/overlays/framework.*
  - lcs3-runtime/src/overlays/ui_quality.*
  - lcs3-runtime/src/overlays/code_quality.*
  - lcs3-runtime/src/overlays/security_basic.*
  - lcs3-runtime/tests/overlays/*
* **Implementation notes**:
  - Overlay applicability is determined by task's declared scope/files-touched (from TASK-005), not loaded unconditionally.
  - Framework must own its native rules and not require the external "Anti-Slop" project as a runtime dependency (per PRD §13), though it may be a design reference.
* **Acceptance criteria**:
  - [ ] AC-043: Quality Overlay framework attaches one or more overlays to a task based on declared scope.
  - [ ] AC-044: A task with no UI-touching files does not have ui-quality overlay applied.
  - [ ] AC-045: code-quality and security-basic overlays are available and applied to relevant tasks.
  - [ ] AC-046: Overlay framework functions without any runtime dependency on an external Anti-Slop package.
* **Test plan**:
  - Unit tests: applicability filter for each of the 3 overlays against sample task scopes; verify no external Anti-Slop import/dependency exists.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `AGENTS.md` (§13 Quality Overlay Rules)

### Assumptions
- Overlay rule content (specific lint/security checks) is implementation detail beyond PRD scope; only the framework mechanics and 3 native overlay stubs are require by this task [verified against AGENTS.md §13 wording "native rules"].

### Plan
1. Build overlay framework core (registration, applicability filter).
2. Implement 3 native overlays with baseline rule sets.
3. Wire applicability to TASK-005 scope data.
4. Unit test applicability and dependency-freeness.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-003 (manifest loader, since overlays are likely manifest-declared).
- Downstream: TASK-017 scenario harness references overlay application scenarios.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-014.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Exact rule content for each overlay is left to implementer discretion within PRD's stated intent; keep rules lean, not exhaustive.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md, AGENTS.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-013
