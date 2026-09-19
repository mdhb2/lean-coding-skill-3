---
title: "TASK-015: Bounded self-correction + failure taxonomy"
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
task_id: "TASK-015"
depends_on: [TASK-010]
mode: "AFK"
summary: "Retry budget, classify failures before retry/escalate."
related_fr: [FR-031,FR-032]
related_ac: [AC-020,AC-021,AC-022]
related_test: [TEST-024]
---

# TASK-015: Bounded self-correction + failure taxonomy

## Scope
Retry budget, classify failures before retry/escalate.

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: FR-031,FR-032
AC: AC-020,AC-021,AC-022

## Verification
Tests: TEST-024

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-010

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
