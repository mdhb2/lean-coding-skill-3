---
title: "TASK-012: Bug fast lane"
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
task_id: "TASK-012"
depends_on: [TASK-011]
mode: "AFK"
summary: "Scoped bug skips full PRD pipeline; escalates if requirement gap found."
related_fr: [FR-028]
related_ac: [AC-017,AC-018]
related_test: [TEST-016,TEST-017]
---

# TASK-012: Bug fast lane

## Scope
Scoped bug skips full PRD pipeline; escalates if requirement gap found.

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: FR-028
AC: AC-017,AC-018

## Verification
Tests: TEST-016,TEST-017

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-011

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
