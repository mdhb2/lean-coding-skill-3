---
title: "Architecture Decisions"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs-master"
created: "2026-09-19"
updated: "2026-09-19"
artifact_type: architecture_decisions
cot_level: standard
version: "1.0"
status: active
tags: [architecture, adr]
summary: "Core LCS3 architecture decisions for runtime, manifests, lifecycle, CLI, Gate"
source: "prd.md, srs.md"
related: ["migration-matrix.md", "tests.md"]
---

# Architecture Decisions

## AD-001: `.lcs3/` layout
`.lcs3/` is the only LCS3 runtime state root. Never `.lcs/`. Subdirectories: `work-items/`, `manifests/`, `runtime.db` (SQLite), `overlays/`. Rationale: SRC-002/BR-001 namespace isolation from legacy.

## AD-002: Manifest architecture
Manifests are Markdown+frontmatter for canonical human-authored artifacts (PRD, SRS, ADRs), SQLite rows for dynamic/derived state (task status, leases, dependency edges). A manifest directory drift-checker compares declared manifest entries against actual filesystem contents on each CLI invocation touching that work-item (FR-010/011).

## AD-003: Lifecycle states
Task lifecycle: `pending → claimed → in_progress → review → done` with side-states `blocked`, `failed`, `escalated`. Lifecycle transitions are runtime-enforced (SQLite), not agent-narrated in Markdown (FR-018, project guideline §6).

## AD-004: SQLite runtime design
Single `runtime.db` per repo. Tables: `tasks`, `claims` (task_id, worker_id, lease_expiry), `dependencies` (task_id, depends_on_id), `conflicts` (task_id_a, task_id_b, scope), `artifacts` (path, canonical|derived, source_of_truth_path, generated_at). Atomic claim = `UPDATE tasks SET status='claimed', worker_id=?, lease_expiry=? WHERE id=? AND status='pending'` checked via affected-rows count (FR-025).

## AD-005: Recovery
Expired lease (lease_expiry < now AND status='claimed') is swept back to `pending` on next runtime read. No external cron required; check-on-read is sufficient for expected worker counts (lazy: skip a background daemon until throughput requires one).

## AD-006: CLI surface
Single `lcs3` binary/façade (FR-007). Subcommands map 1:1 to runtime operations: `lcs3 claim`, `lcs3 status`, `lcs3 gate approve`, `lcs3 doctor`. No direct SQLite/manifest editing outside the CLI.

## AD-007: Generic Gate capability
One Gate primitive (not one skill per approval type). A Gate is a runtime row: `gates(id, work_item_id, kind, description, status, approved_by, approved_at)`. Migration-matrix approval, PRD review sign-off, and any future approval type are all `kind` values on the same table/mechanism (FR-041/042, avoids duplicated HITL logic across skills per project guideline §17).

## AD-008: Quality Overlay dependency fix
`code-quality`/`security-basic`/`ui-quality` overlay application depends on the dependency/conflict-graph subsystem (AD-004) being present, because overlay checks may need to know a task's declared write scope to apply narrowly. Explicit dependency: overlay-loading task requires runtime dependency/conflict graph task as a prerequisite, not the reverse.

## AD-009: Telemetry split
Telemetry has two parts: (a) telemetry-core — capture/storage schema in `runtime.db` (`telemetry_events` table), independent of any specific skill; (b) telemetry-executor-integration — the task-executor CLI command that emits events. Core ships first; executor-integration explicitly depends on core (FR-059, avoids the ambiguous "split with no dependency" bug flagged in intake).

// ponytail: SQLite runtime uses a single file with check-on-read lease sweep; a background sweep daemon or multi-file sharding is the upgrade path if concurrent worker count grows past what SQLite file-locking comfortably handles.
