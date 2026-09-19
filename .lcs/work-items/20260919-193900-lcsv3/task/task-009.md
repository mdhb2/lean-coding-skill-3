---
title: "Task 009: Context engine (selective context, Context Capsule, budgets, staleness)"
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
summary: "Load only task-relevant context via Context Capsules with token budgets and staleness fallback to canonical sources."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-004"
---

# TASK-009: Context engine (selective context, Context Capsule, budgets, staleness)

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-004
* **Source coverage**:
  - Sources: SRC-035, SRC-036, SRC-037, SRC-038, SRC-039, SRC-040
  - Requirements: FR-035, FR-036, FR-037, FR-038, FR-039, FR-040
  - Acceptance Criteria: AC-029, AC-030, AC-031, AC-032
  - Tests: none defined yet
* **Priority**: high
* **Scope**: Implement a context engine that selectively retrieves only task-relevant artifacts (not entire work-item or legacy tree), assembles a Context Capsule (a derived, cached view) bounded by a token/size budget, and detects staleness to fall back to canonical sources when the capsule no longer reflects them.
* **Files likely touched**:
  - lcs3-runtime/src/context/selective_retrieval.*
  - lcs3-runtime/src/context/capsule.*
  - lcs3-runtime/src/context/budget.*
  - lcs3-runtime/src/context/staleness.*
  - lcs3-runtime/tests/context/*
* **Implementation notes**:
  - Context Capsule is explicitly a derived/generated artifact (per PRD §7), never authoritative over canonical sources.
  - Staleness detection: hash or mtime-based comparison against source artifact; if stale, regenerate or fall back to reading canonical source directly.
  - Selective retrieval must not default to reading every work-item artifact, every legacy skill, every Quality Overlay, or all project memory (per PRD §12 Context Discipline).
* **Acceptance criteria**:
  - [ ] AC-029: Context retrieval for a task loads only artifacts relevant to that task's declared scope, not the entire work-item tree.
  - [ ] AC-030: Context Capsule respects a configured token/size budget and truncates/prioritizes rather than exceeding it.
  - [ ] AC-031: Stale Context Capsule is detected and either regenerated or bypassed in favor of canonical source.
  - [ ] AC-032: Context Capsule is never treated as authoritative when it conflicts with its canonical source.
* **Test plan**:
  - Unit tests: selective retrieval scope filtering; budget truncation on oversized input; staleness detection via modified source; conflict resolution favoring canonical source.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `task-coverage.md`

### Assumptions
- Token budget default and staleness check mechanism (hash vs mtime) are implementation details not fixed by PRD [unverified — deferred to implementer, prefer content-hash for determinism].

### Plan
1. Define Context Capsule schema (derived artifact, source references, generation timestamp/hash).
2. Implement selective retrieval bounded by declared task scope.
3. Implement budget enforcement.
4. Implement staleness detection and fallback.
5. Unit test all four behaviors.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-004 (needs runtime-state core for storing capsule metadata).
- Downstream: TASK-011 (traceability generation) and TASK-016 (doctor checks) depend on this context engine.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-010.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Staleness detection mechanism (hash vs mtime) not fixed by PRD; prefer content-hash for determinism, document choice.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-009
