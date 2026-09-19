---
title: "Test Coverage Plan"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs-task-slicer"
created: "2026-09-19"
updated: "2026-09-19"
artifact_type: tests
cot_level: standard
version: "1.0"
status: active
tags: [tests, coverage]
summary: "TEST-### per AC-### with required scenario-family coverage"
source: "prd.md, srs.md"
related: ["traceability.md", "task-coverage.md"]
---

# Test Plan

## Unit (deterministic runtime subsystems)
- TEST-001 — Task claim is atomic under concurrent claim attempts (AC-014, FR-025)
- TEST-002 — Lease expiry releases a claimed task back to pool (AC-014)
- TEST-003 — Dependency graph rejects a task claim when a hard dependency is incomplete (AC-011, AC-012)
- TEST-004 — Conflict graph flags two open tasks with overlapping write scope (AC-015, AC-016, FR-024)
- TEST-005 — Blast-radius calculation flags downstream impact beyond declared scope (AC-017, AC-018)
- TEST-006 — Canonical vs derived artifact classification is enforced at write time (AC-004, AC-005)
- TEST-007 — Staleness detector marks a derived artifact stale when its canonical source changes (AC-036, AC-037, AC-038)

## Integration (CLI/filesystem/SQLite)
- TEST-008 — `lcs3` CLI writes task state to SQLite, not repeated Markdown rewrites (AC-009, FR-017)
- TEST-009 — Manifest directory drift check fails build when manifest and filesystem diverge (AC-005, FR-011)
- TEST-010 — Legacy reference path is mounted read-only; write attempt is rejected (AC-006, FR-003)
- TEST-011 — Context Capsule generation reads only declared task scope, not full work-item (AC-032, FR-035/036)

## Concurrency (multi-worker safety)
- TEST-012 — Two workers claim the same task simultaneously; exactly one wins (AC-014)
- TEST-013 — Write-conflict on shared file between two concurrently executing tasks is detected before commit (AC-015, AC-016)

## End-to-End workflow scenarios
- TEST-014 — Simple low-risk feature: explore → PRD → tasks → execute → done, no HITL stop (FR-026/027)
- TEST-015 — Complex/high-risk feature: full explore → PRD → SRS → review → tasks → execute, HITL gate hit at least once (FR-030)
- TEST-016 — Bug fast lane: scoped bug skips full PRD pipeline (FR-028)
- TEST-017 — Bug investigation reveals missing requirement, escalates to planning instead of silent fix (FR-028 boundary)
- TEST-018 — AFK execution: agent proceeds without stopping while requirements are sufficient (FR-029)
- TEST-019 — Multiple work-items running concurrently do not cross-contaminate state (SRC-052+)
- TEST-020 — Multiple workers on same work-item, no double-claim (AC-014)
- TEST-021 — Dependency blocking: task B correctly blocked until task A completes (AC-011, AC-012)
- TEST-022 — Review → fix → review loop terminates and updates task status correctly (FR-033/034)
- TEST-023 — Stale derived artifact triggers regeneration or explicit fallback to canonical source (AC-036-038)
- TEST-024 — Retry exhaustion: bounded self-correction gives up after N attempts and escalates (FR-031, AC-020/021)
- TEST-025 — Finalization: doc-finalizer archives work-item and produces map.md/doc.md correctly

## HITL Gate
- TEST-026 — Generic Gate capability blocks downstream task until explicit approval recorded (FR-041/042)
- TEST-027 — Migration-matrix-approval gate: skill-generation tasks cannot start until matrix sign-off checkbox is set (BR-003)

## Legacy isolation
- TEST-028 — Attempted write inside `reference/legacy-lcs/` from any LCS3 runtime path is rejected (BR-004)
- TEST-029 — LCS3 code generation never reads legacy `.lcs/` (singular) paths as configuration (SRC-002, BR-001)

## Migration-matrix gate
- TEST-030 — Skill-generation task for a REWRITE/MERGE-classified skill only unlocks after migration-matrix.md HITL block is checked APPROVED (BR-003)
- TEST-031 — A skill with disposition DROP or REPLACED_BY_RUNTIME has no corresponding skill-generation task in task/ (traceability check)

## Self-improvement / telemetry
- TEST-032 — Telemetry capture never silently mutates skills/manifests/schemas/runtime contracts/policy (FR-060)
- TEST-033 — Self-improvement proposal requires separate explicit apply step; is not auto-applied (FR-061)

**Coverage check:** every AC-001..AC-065 must map to at least one TEST-### above or to an explicit rationale in traceability.md (e.g. "documentation-only, no runtime test applicable"). See traceability.md for the full AC→TEST cross-reference.
