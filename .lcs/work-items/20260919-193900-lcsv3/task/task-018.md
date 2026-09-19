---
title: "TASK-018: Derived provenance + staleness + traceability engine"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs-task-slicer"
created: "2026-09-19"
updated: "2026-09-19"
artifact_type: task
cot_level: standard
version: "1.0"
status: pending
tags: [task]
task_id: "TASK-018"
depends_on: [TASK-006]
mode: "AFK"
summary: "Track provenance/freshness; detect stale derived artifacts; runtime traceability."
related_fr: [FR-039,FR-040,FR-044]
related_ac: [AC-032]
related_test: [TEST-023]
---

# TASK-018: Derived provenance + staleness + traceability engine

## Scope
Track provenance/freshness; detect stale derived artifacts; runtime traceability.

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: FR-039,FR-040,FR-044
AC: AC-032

## Verification
Tests: TEST-023

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-006

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
