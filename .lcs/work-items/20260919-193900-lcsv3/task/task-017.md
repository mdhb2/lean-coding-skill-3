---
title: "TASK-017: Context Capsule + budgets"
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
task_id: "TASK-017"
depends_on: [TASK-006]
mode: "AFK"
summary: "Selective-context capsule generation with budget limits."
related_fr: [FR-035,FR-036,FR-037,FR-038]
related_ac: [AC-029,AC-030]
related_test: [TEST-011]
---

# TASK-017: Context Capsule + budgets

## Scope
Selective-context capsule generation with budget limits.

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: FR-035,FR-036,FR-037,FR-038
AC: AC-029,AC-030

## Verification
Tests: TEST-011

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-006

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
