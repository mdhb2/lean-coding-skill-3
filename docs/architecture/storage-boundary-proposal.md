---
title: "L3-006 .lcs3/ Storage Boundary Proposal"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs3-worker"
created: "2026-09-20"
updated: "2026-09-20"
artifact_type: analysis
status: draft
tags: [decision, storage-boundary, lcs3]
summary: "Exact .lcs3/ locations and authority class (canonical/runtime/derived/reference) for every planned data type."
source: "docs/prd.md"
related: ["docs/decisions/artifact-format-options.md", "docs/decisions/lifecycle-contract-proposal.md"]
---

# L3-006 — `.lcs3/` Storage Boundary Proposal

**Status:** proposal (requires GATE-04 approval)
**Covers:** SRC-003, SRC-013, SRC-017, SRC-018, SRC-034, SRC-041, SRC-046, SRC-063
**Depends:** GATE-02 (Option C artifact format), GATE-03 (lifecycle contract)
**Guardrail:** proposal only — no runtime code, no recovery semantics assumed.

## 1. Authority classes

| Class | Meaning | Source of truth lives in | Regenerable? |
|---|---|---|---|
| `canonical` | Human-readable specification; machine-critical fields in YAML frontmatter (GATE-02 Option C). Never rewritten by runtime execution. | Markdown+YAML files | No — edited explicitly, versioned in git |
| `runtime` | Dynamic execution state; owned by `lcs3` CLI/SQLite with atomic ops. Canonical artifacts are never rewritten to track it. | SQLite DB under `.lcs3/` | No — mutated only via runtime transactions |
| `derived` | Regenerable views/caches computed from canonical + runtime. Stale when upstream changes; carry provenance. Never higher authority than sources. | Files under `.lcs3/` marked derived, or in-memory | Yes — regenerate any time |
| `reference` | Read-only external evidence. Never runtime input. | `reference/legacy-lcs/`, imported snapshots | No — pinned, immutable |

Rules (from PRD/GATE-02/GATE-03):

- Every planned data type has exactly one authority class (§4 table).
- `.lcs/` is never runtime input (SRC-041, FR-045). Coexistence allowed; runtime ignores it.
- SQLite must not silently become the only location of canonical requirements (§8.4).
- `status` (artifact lifecycle) vs `task_status` (execution) stay separate fields (GATE-02/GATE-03).
- Derived artifacts carry provenance sufficient to detect staleness (SRC-035).

## 2. Directory tree

```text
<project>/
├── .lcs3/                        # LCS3 project root (SRC-003, FR-002). Created only by `lcs3 init` (SRC-046, FR-005).
│   ├── config.yaml               # canonical — centralized project policy (SRC-063, FR-006):
│   │                             #   workflow, execution, context, verification, quality, risk groups only.
│   ├── manifests/                # canonical — machine-readable contracts (SRC-009/010, FR-010):
│   │   ├── artifacts.yaml        #   artifact types + artifact_type registry (GATE-02 §6)
│   │   ├── lifecycle.yaml        #   3 state machines + transition matrix (GATE-03 freeze items 1–5)
│   │   ├── skills.yaml           #   skill registry (Section 6 of migration matrix post-GATE-01)
│   │   ├── tasks.yaml            #   task schema (blocked_by, scope, overlays; FR-019)
│   │   └── quality.yaml          #   Quality Overlay definitions (ui-quality, code-quality, security-basic)
│   ├── state.db                  # runtime — SQLite, sole dynamic execution state (SRC-017/018, FR-016/017):
│   │                             #   claims, leases, heartbeats, task_status mirror, sessions, retries.
│   │                             #   Canonical task .md files are NOT rewritten for lease/heartbeat churn.
│   ├── memory/                   # runtime-advisory — project memory entries (SRC-052..055, FR-054):
│   │   └── memory.db             #   provenance + confidence + freshness per entry; advisory only.
│   │                             #   Canonical/repository evidence always wins on conflict (SRC-054).
│   ├── telemetry/                # runtime — local operational metrics (SRC-057/058):
│   │   └── telemetry.db          #   workflow, task, retries, failure type, context size, tool calls, result.
│   │                             #   Proposals only; never auto-applies to skills/manifests/schemas (SRC-059).
│   ├── imports/                  # reference — imported legacy snapshots (SRC-045, FR-047/048/049):
│   │   └── legacy/               #   raw preserved copies + lightweight searchable index/metadata.
│   │                             #   Import limited to docs/archive; never active state/work-items/lifecycle.
│   │                             #   Indexed material stays `reference` class — never promoted to canonical.
│   ├── cache/                    # derived — regenerable views (SRC-034/035):
│   │   ├── capsules/             #   Context Capsules (derived caches, never canonical — SRC-034)
│   │   ├── traceability/         #   generated coverage views (FR-044)
│   │   └── indexes/              #   generated search/metadata indexes over canonical (FR-011)
│   └── tmp/                      # runtime-ephemeral — locks, heartbeats spill, partial writes.
│                                 #   Safe to delete when no worker holds a lease; never versioned.
├── docs/                         # canonical — PRD/SRS/decisions live here in dev repo (pre-init source).
├── skills/                       # canonical — lcs3-* SKILL.md entrypoints (post-GATE-05).
├── src/                          # runtime implementation source (not project data).
└── reference/
    └── legacy-lcs/               # reference — pinned read-only legacy source (SRC-041/066, FR-003).
```

Notes:

- `docs/` vs `.lcs3/manifests/`: `docs/` holds human-facing canonical specs (PRD, SRS, decisions); `.lcs3/manifests/` holds the machine-readable contract projection of the same decisions. Manifests are canonical, not derived — but FR-011 requires generated docs/validators route from them so the contract is defined once.
- Project work-item artifacts (`prd.md`, `srs.md`, `task/task-###.md`) live wherever the workflow manifest declares per work-item (legacy: `.lcs/work-items/`); the storage boundary does not fix their path, only their class (`canonical`) and the rule that runtime churn never rewrites them (FR-016).
- `state.db` vs canonical task files: task files record spec/acceptance content; `state.db` records `task_status`, owner, lease, retries. Doctor cross-checks both (SRC-060).

## 3. `.lcs/` coexistence rule

- `.lcs/` and `.lcs3/` may coexist in one project (FR-045).
- LCS3 runtime reads nothing from `.lcs/` — not state, not schemas, not lifecycle enums.
- Legacy material enters LCS3 only via explicit import into `.lcs3/imports/legacy/` as `reference`-class snapshots (FR-046/047/048).
- Search indexes over imports are `derived` views over `reference` data (FR-049); they confer no canonical status.

## 4. Authority table — every planned data type, exactly one class

| Data | Path | Class | Why |
|---|---|---|---|
| Project policy (workflow/execution/context/verification/quality/risk) | `.lcs3/config.yaml` | canonical | SRC-063, FR-006 — centrally configured, human-edited |
| Artifact type registry | `.lcs3/manifests/artifacts.yaml` | canonical | SRC-009/010, GATE-02 — single discriminator source |
| Lifecycle contracts (3 machines + matrix) | `.lcs3/manifests/lifecycle.yaml` | canonical | SRC-019, GATE-03 — transitions validated against this |
| Skill registry | `.lcs3/manifests/skills.yaml` | canonical | GATE-01 §6 inventory — master routes over this, not hardcoded lists |
| Task schema | `.lcs3/manifests/tasks.yaml` | canonical | FR-019 — dependency/coverage/scope shape |
| Quality Overlay defs | `.lcs3/manifests/quality.yaml` | canonical | FR-050/051 — overlay contracts |
| PRD / SRS / tasks / ADRs / decisions | work-item paths + `docs/` | canonical | SRC-011..016 — Markdown+YAML, OKF frontmatter |
| Task execution status, claims, leases, heartbeats, sessions, retries | `.lcs3/state.db` (SQLite) | runtime | SRC-017/018, FR-016/017 — atomic concurrent ownership |
| Memory entries (+ provenance/confidence/freshness) | `.lcs3/memory/memory.db` | runtime-advisory | SRC-052..055 — advisory evidence, never canonical |
| Telemetry events | `.lcs3/telemetry/telemetry.db` | runtime | SRC-057/058 — local metrics; proposals only (SRC-059) |
| Imported legacy snapshots + search index | `.lcs3/imports/legacy/` | reference (+derived index) | SRC-045, FR-047/048/049 — read-only, never active state |
| Context Capsules | `.lcs3/cache/capsules/` | derived | SRC-034 — caches, never Sources of Truth |
| Traceability/coverage views | `.lcs3/cache/traceability/` | derived | FR-044 — generated from structured relations |
| Generated indexes over canonical | `.lcs3/cache/indexes/` | derived | FR-011 — validated against manifests |
| Locks / temp / partial writes | `.lcs3/tmp/` | runtime-ephemeral | Concurrency mechanics; deletable when idle |
| Legacy live source | `reference/legacy-lcs/` | reference | SRC-041/066, FR-003 — read-only evidence |
| Legacy live runtime state (`.lcs/`) | `.lcs/` (if present) | not LCS3 input | FR-045 — ignored by runtime |

## 5. Invariants for GATE-04

1. One class per data type — no row above has two classes.
2. No canonical file is rewritten for lease/heartbeat/retry churn (FR-016).
3. No `.lcs/` path is runtime input (FR-045).
4. Derived outputs record upstream source + revision so staleness is detectable (SRC-035).
5. Memory/telemetry never promote to canonical silently (SRC-054, SRC-059).
6. Recovery semantics (WAL, backup, crash replay) explicitly out of scope — Phase 1 design.

## 6. Traceability

SRC-003 (`.lcs3/` root) · SRC-013 (canonical vs derived) · SRC-017/018 (separate SQLite state) · SRC-034 (capsules derived) · SRC-041 (`.lcs/` isolation) · SRC-046 (`lcs3 init`) · SRC-063 (central config).
