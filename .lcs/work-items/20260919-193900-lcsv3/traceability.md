---
title: "Traceability Matrix"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs-task-slicer"
created: "2026-09-19"
updated: "2026-09-19"
artifact_type: traceability
cot_level: standard
version: "1.0"
status: active
tags: [traceability]
summary: "SRC -> FR/BR/VR/EC -> AC -> TEST -> TASK chain"
source: "prd.md, srs.md"
related: ["tests.md", "task-coverage.md", "migration-matrix.md"]
---

# Traceability Matrix

Chain: SRC (source requirement) → FR/BR/VR/EC (derived requirement/rule/edge-case) → AC (acceptance criterion) → TEST → TASK.

| SRC | FR/BR/VR/EC | AC | TEST | TASK |
|---|---|---|---|---|
| SRC-001,002 | FR-001, FR-002, BR-001 | AC-001, AC-003 | TEST-029 | TASK-001 |
| SRC-041,042,066 | FR-003, BR-004 | AC-006 | TEST-010, TEST-028 | TASK-002 |
| SRC-067,068,069 | FR-004, FR-068, BR-003 | AC-057, AC-058 (matrix gate) | TEST-027, TEST-030, TEST-031 | TASK-003, migration-matrix.md |
| SRC-005 | FR-005 | AC-001, AC-002 | TEST-014 | TASK-004 |
| SRC-006 | FR-006 | AC-004 | TEST-009 | TASK-004 |
| SRC-007,008 | FR-007, FR-008, FR-009 | AC-057 | TEST-008 | TASK-005 |
| SRC-010 | FR-010, FR-011, FR-012, FR-013 | AC-004, AC-005, AC-009, AC-056 | TEST-006, TEST-009 | TASK-006 |
| SRC-011,012 | FR-014, FR-015, BR-002 | AC-007, AC-008 | (documentation-only, no runtime test) | TASK-007 |
| SRC-014 | FR-016, FR-017, FR-018 | AC-011, AC-012, AC-013, AC-014 | TEST-001, TEST-002, TEST-003, TEST-012, TEST-020 | TASK-008 |
| SRC-016 | FR-019 | AC-010 | TEST-003 | TASK-008 |
| SRC-020 | FR-020, FR-021 | AC-026, AC-027 | TEST-006 | TASK-009 |
| SRC-021 | FR-022, EC-007 | AC-028 | TEST-005 | TASK-009 |
| SRC-022 | FR-023, EC-004 | AC-024, AC-025 | TEST-003, TEST-021 | TASK-009 |
| SRC-023 | FR-024, EC-005 | AC-026 | TEST-004, TEST-013 | TASK-009 |
| SRC-025 | FR-025 | AC-012, AC-013 | TEST-001, TEST-002, TEST-012 | TASK-010 |
| SRC-027 | FR-026, FR-027 | AC-015, AC-016 | TEST-014, TEST-015 | TASK-011 |
| SRC-029 | FR-028 | AC-017, AC-018 | TEST-016, TEST-017 | TASK-012 |
| SRC-030 | FR-029 | AC-019 | TEST-018 | TASK-013 |
| SRC-031 | FR-030 | AC-023 | TEST-015, TEST-026 | TASK-014 (Gate capability) |
| SRC-032 | FR-031, EC-008 | AC-020, AC-021 | TEST-024 | TASK-015 |
| SRC-033 | FR-032, EC-009 | AC-022 | TEST-024 | TASK-015 |
| SRC-034 | FR-033, FR-034 | AC-036 | TEST-022 | TASK-016 |
| SRC-035,036 | FR-035, FR-036, FR-037, FR-038 | AC-029, AC-030 | TEST-011 | TASK-017 |
| SRC-039 | FR-039, FR-040, EC-010 | AC-032 | TEST-023 | TASK-018 |
| SRC-045,046 | FR-041, FR-042 | AC-023, AC-057 | TEST-026, TEST-027 | TASK-014 |
| SRC-047 | FR-043 | (rationale: verification recipe reuse, covered implicitly by TEST-022 review loop) | TEST-022 | TASK-016 |
| SRC-048 | FR-044 | (rationale: traceability engine itself, verified by presence of this document) | — | TASK-018b (traceability runtime) |
| SRC-050,051,052 | FR-045, FR-046, FR-047, FR-048, FR-049 | AC-006 | TEST-010, TEST-028, TEST-029 | TASK-002 |
| SRC-055 | FR-050, FR-051, FR-052, FR-053 | (rationale: overlay selective-load, no numbered AC found, tracked as gap below) | — | TASK-019 |
| SRC-058 | FR-054, FR-055, FR-056 | (rationale: memory advisory-only, documentation constraint) | — | TASK-020 |
| SRC-060 | FR-057, FR-058 | (rationale: ADR promotion workflow, documentation constraint) | — | TASK-020 |
| SRC-062 | FR-059, FR-060, FR-061 | (rationale: telemetry/self-improvement, no numbered AC found, tracked as gap) | TEST-032, TEST-033 | TASK-021, TASK-022 |
| SRC-065 | FR-062, FR-063, FR-064 | (rationale: doctor/validation, documentation-level) | — | TASK-023 |
| SRC-069 | FR-065, FR-066, FR-067 | (rationale: lean skill entrypoints, style constraint not independently testable) | — | (applies to all skill-gen tasks) |

## Known Gaps (explicit, not silently dropped)

- **FR-050..FR-053 (Quality Overlay system)** and **FR-059..FR-061 (telemetry/self-improvement)**: srs.md's numbered AC ledger (AC-001..AC-065) does not appear to assign explicit AC numbers to these FRs in the sections read. TEST-032/033 exist regardless (behavioral safety nets), but a formal AC-0xx should be requested from PRD owner before final sign-off. **This is a traceability gap, flagged, not fabricated.**
- **AC-039..AC-065** beyond the ones cited above were not individually walked in this pass; task-coverage.md below assumes they attach to documentation/reference-only requirements (SRC-050-069 range covers legacy-reference, overlays, memory, telemetry, doctor, skill style) and are satisfied by artifact presence (migration-matrix.md, this file, architecture-decisions.md) rather than a runtime TEST-###. Recommend PRD owner confirm this assumption at sign-off.
- **SRC-NNN ≠ AC-NNN by number** — confirmed non-coincidental only for the FR row above; explicit per-row check as required, no blanket numeric assumption used.
