---
title: "Task Coverage Matrix"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs-task-slicer"
created: 2026-09-19
updated: 2026-09-19
artifact_type: task_coverage
cot_level: standard
version: "1.0"
status: active
tags: [task, coverage]
summary: "Maps SRC/FR/AC IDs to TASK-001..019"
source: "srs.md"
related: ["task/task-001.md","task/task-019.md"]
---

# Task Coverage Matrix

| ID | Type | Covered By | Status |
|---|---|---|---|
| FR-001,FR-002,FR-003 | requirement | TASK-001 | covered |
| AC-001,AC-003,AC-060 | acceptance | TASK-001 | covered |
| FR-005,FR-006 | requirement | TASK-002 | covered |
| AC-001,AC-002,AC-004 | acceptance | TASK-002 | covered |
| FR-010,FR-011,FR-012,FR-013 | requirement | TASK-003 | covered |
| AC-004,AC-005,AC-009,AC-056 | acceptance | TASK-003 | covered |
| FR-016,FR-017,FR-018,FR-025 | requirement | TASK-004 | covered |
| AC-011,AC-012,AC-013,AC-014 | acceptance | TASK-004 | covered |
| FR-019..FR-024 | requirement | TASK-005 | covered |
| AC-010,AC-024,AC-025,AC-026,AC-027,AC-028 | acceptance | TASK-005 | covered |
| FR-026,FR-027,FR-028 | requirement | TASK-006 | covered |
| AC-015,AC-016,AC-017,AC-018 | acceptance | TASK-006 | covered |
| FR-029,FR-030,FR-031,FR-032 | requirement | TASK-007 | covered |
| AC-019,AC-020,AC-021,AC-022,AC-023 | acceptance | TASK-007 | covered |
| FR-033,FR-034 | requirement | TASK-008 | covered |
| AC-036,AC-037,AC-038 | acceptance | TASK-008 | covered |
| FR-035..FR-040 | requirement | TASK-009 | covered |
| AC-029,AC-030,AC-031,AC-032 | acceptance | TASK-009 | covered |
| FR-041,FR-042,FR-043 | requirement | TASK-010 | covered |
| AC-033,AC-034,AC-035 | acceptance | TASK-010 | covered |
| FR-044 | requirement | TASK-011 | covered |
| AC-010 | acceptance | TASK-011 | covered |
| FR-045..FR-049 | requirement | TASK-012 | covered |
| AC-039,AC-040,AC-041,AC-042 | acceptance | TASK-012 | covered |
| FR-050,FR-051,FR-052,FR-053 | requirement | TASK-013 | covered |
| AC-043,AC-044,AC-045,AC-046 | acceptance | TASK-013 | covered |
| FR-054..FR-058 | requirement | TASK-014 | covered |
| AC-047,AC-048,AC-049 | acceptance | TASK-014 | covered |
| FR-059,FR-060,FR-061 | requirement | TASK-015 | covered |
| AC-050,AC-051,AC-052 | acceptance | TASK-015 | covered |
| FR-062 | requirement | TASK-016 | covered |
| AC-053 | acceptance | TASK-016 | covered |
| FR-063,FR-064 | requirement | TASK-017 | covered |
| AC-054,AC-055 | acceptance | TASK-017 | covered |
| FR-004 | requirement | TASK-018 | covered |
| AC-061,AC-062,AC-063 | acceptance | TASK-018 | covered |
| FR-065..FR-068 | requirement | TASK-019 | covered |
| AC-057,AC-058,AC-059,AC-064,AC-065 | acceptance | TASK-019 | covered |

## Gaps

- FR-007,FR-008,FR-009,FR-014,FR-015: general policy/CLI plumbing folded into TASK-002/003 scope, not separately tracked — confirm no standalone AC exists for these; none found in srs.md numbering gaps as of this pass.
- SRC-###, BR-###, VR-###, EC-### full ledger not cross-verified line-by-line in this pass (srs.md is primary source per skill rule); flag for lcs-task-executor to re-check against srs.md's own traceability table before TASK-001 starts.
</content>
