---
title: "TASK-008: SQLite lifecycle + task relationships"
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
task_id: "TASK-008"
depends_on: [TASK-006]
mode: "AFK"
summary: "runtime.db tasks/lifecycle/dependency schema."
related_fr: [FR-016,FR-017,FR-018,FR-019]
related_ac: [AC-011,AC-012,AC-013,AC-014]
related_test: [TEST-001,TEST-002,TEST-003,TEST-012,TEST-020]
---

# TASK-008: SQLite lifecycle + task relationships

## Scope
runtime.db tasks/lifecycle/dependency schema.

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: FR-016,FR-017,FR-018,FR-019
AC: AC-011,AC-012,AC-013,AC-014

## Verification
Tests: TEST-001,TEST-002,TEST-003,TEST-012,TEST-020

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-006

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
