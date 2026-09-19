---
title: "TASK-016: Stable review-fix loop"
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
task_id: "TASK-016"
depends_on: [TASK-014]
mode: "AFK"
summary: "Review to fix to review loop with reusable verification recipe."
related_fr: [FR-033,FR-034,FR-043]
related_ac: [AC-036]
related_test: [TEST-022]
---

# TASK-016: Stable review-fix loop

## Scope
Review to fix to review loop with reusable verification recipe.

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: FR-033,FR-034,FR-043
AC: AC-036

## Verification
Tests: TEST-022

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-014

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
