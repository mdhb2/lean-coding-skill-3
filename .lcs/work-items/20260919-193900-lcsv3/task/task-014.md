---
title: "Task 014: Project memory (advisory) + ADR promotion"
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
summary: "Store project memory as advisory evidence with provenance/confidence/freshness, and promote project-wide decisions only via explicit ADR workflow."
source: "srs.md"
related: ["task-coverage.md"]
blocked_by: "TASK-003"
---

# TASK-014: Project memory (advisory) + ADR promotion

* **Status**: pending
* **Type**: AFK
* **Depends on**: TASK-003
* **Source coverage**:
  - Sources: SRC-054, SRC-055, SRC-056, SRC-057, SRC-058
  - Requirements: FR-054, FR-055, FR-056, FR-057, FR-058
  - Acceptance Criteria: AC-047, AC-048, AC-049
  - Tests: none defined yet
* **Priority**: medium
* **Scope**: Implement a project memory store recording observations with provenance, confidence, and freshness, treat it strictly as advisory (never canonical), and implement an explicit ADR promotion workflow for turning a memory observation into a project-wide architecture decision.
* **Files likely touched**:
  - lcs3-runtime/src/memory/store.*
  - lcs3-runtime/src/memory/adr_promotion.*
  - lcs3-runtime/tests/memory/*
* **Implementation notes**:
  - Memory entries carry provenance (source), confidence (score/level), and freshness (timestamp/staleness marker).
  - When memory conflicts with current canonical artifacts, canonical wins (per AGENTS.md §14) — enforce this at read time, not just by convention.
  - ADR promotion is a separate explicit action (not automatic); a memory observation never silently becomes a project-wide rule.
* **Acceptance criteria**:
  - [ ] AC-047: Memory entry is stored with provenance, confidence, and freshness fields.
  - [ ] AC-048: Memory read that conflicts with a current canonical artifact yields the canonical artifact's value, with the conflict surfaced/logged.
  - [ ] AC-049: A memory observation only becomes a project-wide rule via an explicit ADR promotion action, never automatically.
* **Test plan**:
  - Unit tests: store/read round-trip with all three metadata fields; conflict resolution favoring canonical; ADR promotion requires explicit call, not triggered by mere memory write.

## Chain of Truth Report
### Level
Strict

### Sources Checked
- `.lcs/state.md`
- `prd.md`
- `srs.md`
- `AGENTS.md` (§14 Project Memory Rules)

### Assumptions
- ADR storage format reuses the manifest-loader's canonical/derived distinction from TASK-003 [unverified — exact ADR file format deferred to implementation].

### Plan
1. Design memory entry schema (provenance/confidence/freshness).
2. Implement store + conflict-resolution read path.
3. Implement explicit ADR promotion action.
4. Unit test schema, conflict resolution, and promotion gating.

### Actions Taken
Not yet started

### Verification
Pending

### Report
Pending

## Blocking Edges & Expand-Contract Pattern
- Blocked by TASK-003 (canonical manifest loader, needed to know what "canonical" means for conflict resolution).
- Downstream: TASK-017 scenario harness may reference memory-vs-canonical conflict scenario.

## Handoff
Next recommended skill: lcs-task-executor
Next file to read: task-015.md
Current phase: tasks
Current confidence: high
Blocking questions: None
Risks to carry forward: ADR file format not specified by PRD; implementer should keep it simple Markdown+frontmatter consistent with other canonical artifacts.
Source of Truth Bundle: .lcs/state.md, prd.md, srs.md, task-coverage.md, AGENTS.md
Must Preserve IDs: SRC-001..SRC-069, FR-001..FR-068, AC-001..AC-065, EC-001..EC-022, BR-001..BR-010, VR-001..VR-007
Unresolved IDs: None
Suggested next command: Eksekusi TASK-014
