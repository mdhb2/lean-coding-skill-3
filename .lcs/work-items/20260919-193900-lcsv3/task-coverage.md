---
title: "Task Coverage Matrix"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs-task-slicer"
created: "2026-09-19"
updated: "2026-09-19"
artifact_type: task_coverage
cot_level: standard
version: "1.0"
status: active
tags: [task, coverage]
summary: "Maps SRC/FR/AC IDs to TASK-001..029, rebuilt after migration-matrix correction"
source: "traceability.md, tests.md"
related: ["task/task-001.md"]
---

# Task Coverage Matrix

| ID | Type | Covered By | Status |
|---|---|---|---|
| FR-001,FR-002,BR-001 | requirement | TASK-001 | covered |
| FR-003,BR-004 | requirement | TASK-002 | covered |
| FR-004,FR-068,BR-003 | requirement | TASK-003 | covered |
| FR-005,FR-006 | requirement | TASK-004 | covered |
| FR-007,FR-008,FR-009 | requirement | TASK-005 | covered |
| FR-010,FR-011,FR-012,FR-013 | requirement | TASK-006 | covered |
| FR-014,FR-015,BR-002 | requirement | TASK-007 | covered |
| FR-016,FR-017,FR-018,FR-019 | requirement | TASK-008 | covered |
| FR-020..FR-024 | requirement | TASK-009 | covered |
| FR-025 | requirement | TASK-010 | covered |
| FR-026,FR-027 | requirement | TASK-011 | covered |
| FR-028 | requirement | TASK-012 | covered |
| FR-029 | requirement | TASK-013 | covered |
| FR-030,FR-041,FR-042 | requirement | TASK-014 | covered |
| FR-031,FR-032 | requirement | TASK-015 | covered |
| FR-033,FR-034,FR-043 | requirement | TASK-016 | covered |
| FR-035..FR-038 | requirement | TASK-017 | covered |
| FR-039,FR-040,FR-044 | requirement | TASK-018 | covered |
| FR-050..FR-053 | requirement | TASK-019 | covered (gap: no numbered AC, see traceability.md) |
| FR-054..FR-058 | requirement | TASK-020 | covered |
| FR-059,FR-060 | requirement | TASK-021 | covered |
| FR-061 | requirement | TASK-022 | covered |
| FR-062,FR-063,FR-064 | requirement | TASK-023 | covered |
| lcs-code-review | skill-gen | TASK-024 | covered |
| lcs-codebase-doc | skill-gen | TASK-025 | covered |
| lcs-debug (+ lcs-debug-ext merge) | skill-gen | TASK-026 | covered |
| lcs-doc-finalizer | skill-gen | TASK-027 | covered |
| lcs-domain-modeling | skill-gen | TASK-028 | covered |
| lcs-explore | skill-gen | TASK-029 | covered |
| lcs-improve-architecture | skill-gen | TASK-030 | covered |
| lcs-master | skill-gen | TASK-031 | covered |
| lcs-new | skill-gen | TASK-032 | covered |
| lcs-onboarding | skill-gen | TASK-033 | covered |
| lcs-prd-reviewer | skill-gen | TASK-034 | covered |
| lcs-prototype | skill-gen | TASK-035 | covered |
| lcs-research | skill-gen | TASK-036 | covered |
| lcs-self-improvement | skill-gen | TASK-037 | covered |
| lcs-task-executor | skill-gen | TASK-038 | covered |
| lcs-task-slicer | skill-gen | TASK-039 | covered |
| lcs-toprd | skill-gen | TASK-040 | covered |
| lcs-tosrs | skill-gen | TASK-041 | covered |
| lcs-wizard | skill-gen | TASK-042 | covered |

**Uncovered mandatory IDs: none identified.** FR-050..053 and FR-059..061 lack numbered AC in the source ledger sections read (see traceability.md Known Gaps); tasks TASK-019/021/022 still exist and are tested (TEST-032, TEST-033), so no *task* coverage gap exists — only an *AC-numbering* gap to flag at sign-off.

All 18 REWRITE + 1 MERGE skill-gen tasks (TASK-024..042 = 19 tasks) each hard-depend on TASK-003 (migration-matrix gate) per BR-003. DROP=0 and REPLACED_BY_RUNTIME={lcs-chain-of-truth, lcs-shared, lcs-wayfinder} have no skill-gen task — their capability is covered by TASK-018 (traceability runtime), TASK-001/006 (manifest/runtime contracts), and TASK-009 (dependency/blast-radius runtime) respectively.
