---
title: "TASK-006: Manifest directory + drift prevention"
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
task_id: "TASK-006"
depends_on: [TASK-005]
mode: "AFK"
summary: "Manifest dir with canonical/derived classification and drift check."
related_fr: [FR-010,FR-011,FR-012,FR-013]
related_ac: [AC-004,AC-005,AC-009,AC-056]
related_test: [TEST-006,TEST-009]
---

# TASK-006: Manifest directory + drift prevention

## Scope
Manifest dir with canonical/derived classification and drift check.

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: FR-010,FR-011,FR-012,FR-013
AC: AC-004,AC-005,AC-009,AC-056

## Verification
Tests: TEST-006,TEST-009

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-005

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
