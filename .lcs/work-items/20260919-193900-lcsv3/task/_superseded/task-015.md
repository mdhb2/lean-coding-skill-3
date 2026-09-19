---
title: "Task 015: Telemetry + self-improvement proposals"
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
summary: "Capture local runtime telemetry and generate self-improvement proposals that never silently modify skills, manifests, schemas, or policy."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-004"
---

# TASK-015: Telemetry + self-improvement proposals

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-004
* **Source coverage**:
  - Sources: SRC-059, SRC-060, SRC-061
  - Requirements: FR-059, FR-060, FR-061
  - Acceptance Criteria: AC-050, AC-051, AC-052
  - Tests: none defined yet
* **Priority**: low
* **Scope**: Capture local metrics (workflow/skill, task, retries, failure type, context size/token estimate, tool calls, files read/written, result) in the SQLite runtime store, and generate self-improvement proposals as a separate output that must be explicitly applied via a distinct workflow, never auto-applied.
* **Files likely touched**:
  - lcs3-runtime/src/telemetry/collector.*
  - lcs3-runtime/src/telemetry/self_improvement.*
  - lcs3-runtime/tests/telemetry/*
* **Implementation notes**:
  - Telemetry collector writes structured records per task execution to SQLite (from TASK-004).
  - Self-improvement analysis reads telemetry and emits proposal documents/records; it must not write directly to skills/manifests/schemas/runtime contracts/policy (per AGENTS.md §15).
  - Applying a proposal is a separate, explicit, human-or-workflow-gated action outside this task's scope.
* **Acceptance criteria**:
  - [ ] AC-050: Telemetry record is captured per task execution with the specified fields (workflow/skill, task, retries, failure type, context size, tool calls, files read/written, result).
  - [ ] AC-051: Self-improvement analysis produces a proposal artifact, distinct from and not auto-merged into any skill/manifest/schema/policy file.
  - [ ] AC-052: No code path in this task writes directly to a skill, manifest, schema, runtime contract, or policy file.
* **Test plan**:
  - Unit tests: telemetry record shape/fields; proposal generation output location is separate from live skill/manifest paths; static check that self-improvement module has no write access to those paths.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `AGENTS.md` (§15 Telemetry and Self-Improvement)

### Assumptions
- Telemetry storage reuses TASK-004's SQLite core rather than a separate store [verified against PRD's single-SQLite-runtime-state design intent].

### Plan
1. Design telemetry record schema per specified fields.
2. Implement collector hook into executor (TASK-007) call sites.
3. Implement self-improvement analyzer emitting proposal-only output.
4. Unit test schema, proposal isolation, and no-write-to-live-artifacts guarantee.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-004 (SQLite runtime-state core).
- Downstream: none of the remaining tasks strictly depend on this, but TASK-017 scenario harness may exercise it.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-016.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: This task can be built as a stub/no-op collector initially if executor (TASK-007) call sites aren't finalized yet; full hook-in may need revisiting once TASK-007 is done.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md, AGENTS.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-015
