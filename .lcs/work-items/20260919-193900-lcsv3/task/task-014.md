---
title: "TASK-014: Generic Gate capability (HITL)"
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
task_id: "TASK-014"
depends_on: [TASK-003]
mode: "AFK"
summary: "One Gate primitive for all approval kinds incl. migration-matrix."
related_fr: [FR-030,FR-041,FR-042]
related_ac: [AC-023,AC-057]
related_test: [TEST-026,TEST-027]
---

# TASK-014: Generic Gate capability (HITL)

## Scope
One Gate primitive for all approval kinds incl. migration-matrix.

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: FR-030,FR-041,FR-042
AC: AC-023,AC-057

## Verification
Tests: TEST-026,TEST-027

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-003

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
