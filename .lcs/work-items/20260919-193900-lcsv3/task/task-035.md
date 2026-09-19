---
title: "TASK-035: Skill-gen: lcs3-prototype"
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
task_id: "TASK-035"
depends_on: [TASK-003]
mode: "AFK"
summary: "Rewrite lcs-prototype scratch-dir path (row 14)."
related_fr: []
related_ac: []
related_test: []
---

# TASK-035: Skill-gen: lcs3-prototype

## Scope
Rewrite lcs-prototype scratch-dir path (row 14).

## Read scope
Declared narrowly: this task's own migration-matrix.md entry (if skill-gen), directly relevant FR/AC rows in traceability.md, and its own legacy skill dir under reference/legacy-lcs/skills/ if applicable. Do not read the full legacy repo or full PRD/SRS.

## Write scope
LCS3 runtime/manifest/skill files relevant to this task only. Never write under reference/legacy-lcs/ (read-only, BR-004).

## Requirements covered
FR: 
AC: 

## Verification
Tests: 

## Chain of Truth Report
- Requirement source: prd.md / srs.md (see traceability.md row)
- Evidence: task-coverage.md, migration-matrix.md (if skill-gen)
- Assumptions: none beyond migration-matrix disposition for this skill

## Blocking Edges
Depends on: TASK-003

## Handoff
On completion: update task status in runtime state, note any scope expansion explicitly.
