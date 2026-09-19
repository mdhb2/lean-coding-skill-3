---
title: "Task 012: Legacy docs/archive import (reference-only, indexed)"
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
summary: "Import legacy LCS docs/archives into an indexed, read-only reference area without treating them as LCS3 requirements."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-003"
---

# TASK-012: Legacy docs/archive import (reference-only, indexed)

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-003
* **Source coverage**:
  - Sources: SRC-045, SRC-046, SRC-047, SRC-048, SRC-049
  - Requirements: FR-045, FR-046, FR-047, FR-048, FR-049
  - Acceptance Criteria: AC-039, AC-040, AC-041, AC-042
  - Tests: none defined yet
* **Priority**: medium
* **Scope**: Import legacy LCS documentation/archive content into a clearly isolated, read-only reference path (e.g. reference/legacy-lcs/), build a searchable index over it, and ensure it is never treated as canonical LCS3 requirement or state.
* **Files likely touched**:
  - lcs3-runtime/src/legacy/importer.*
  - lcs3-runtime/src/legacy/indexer.*
  - reference/legacy-lcs/ (target import path, read-only)
  - lcs3-runtime/tests/legacy/*
* **Implementation notes**:
  - Importer copies legacy content without modifying source repo (per AGENTS.md legacy reference policy: read-only, no wholesale rename-and-copy).
  - Indexer builds a lightweight search index (e.g. per-skill/file metadata) so a task can look up one legacy skill without loading the whole legacy tree (Context Discipline).
  - Enforce: legacy schemas/paths/statuses are never surfaced as LCS3 requirements by this importer; it is reference evidence only.
* **Acceptance criteria**:
  - [ ] AC-039: Legacy content is imported into an isolated read-only path, not merged into active LCS3 source directories.
  - [ ] AC-040: Legacy content is indexed such that a single skill/capability can be looked up without loading the entire legacy tree.
  - [ ] AC-041: Imported legacy content is never surfaced by LCS3 tooling as an LCS3 requirement or canonical artifact.
  - [ ] AC-042: Re-running the importer does not silently overwrite or mutate already-imported legacy content in a way that changes provenance.
* **Test plan**:
  - Unit tests: import into isolated path and verify no writes outside it; index lookup returns single-skill scope; provenance/read-only marker present in index metadata.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `AGENTS.md` (legacy reference policy, §3)

### Assumptions
- Target import path follows AGENTS.md's example `reference/legacy-lcs/` convention [verified against AGENTS.md §3].

### Plan
1. Implement importer respecting read-only source constraint.
2. Build index over imported content keyed by skill/capability name.
3. Add provenance metadata marking content as reference-only.
4. Unit test isolation, indexing, and idempotent re-import.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-003 (canonical manifest loader, so imported legacy content can be distinguished from canonical manifests).
- Downstream: TASK-017 scenario harness includes a scenario for "attempted leakage of legacy .lcs/ contracts into LCS3" that exercises this task's isolation guarantee.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-013.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: Must not confuse this task with the Migration Matrix (TASK-018 gate) — this task only imports/indexes docs for reference, it does not classify skills.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md, AGENTS.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-012
