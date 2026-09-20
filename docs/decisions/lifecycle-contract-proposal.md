---
title: "L3-005 Workflow Phase and Task Lifecycle Contract — Proposal"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs3-worker"
created: "2026-09-20"
updated: "2026-09-20"
artifact_type: analysis
cot_level: standard
version: "1.0"
status: draft
tags: [decision, lifecycle, workflow, lcs3]
summary: "Proposed workflow phases, task execution states, artifact lifecycle states, transition matrix, illegal transitions, terminal states, review-fix loop, AFK/HITL gates."
source: "docs/prd.md"
related: ["docs/decisions/artifact-format-options.md", "reference/legacy-lcs/skills/lcs-shared/contract.md"]
---

# L3-005 — Workflow Phase and Task Lifecycle Contract (Proposal)

**Status:** proposal — requires GATE-03 freeze before manifest/runtime coding  
**Covers:** SRC-019, SRC-020..SRC-031, SRC-039, SRC-060  
**Depends:** none (read-only proposal; does not implement state machine)

Proposal only. No runtime code. Three orthogonal state machines — artifact lifecycle, task execution, work-item container — never shared enum.

## 1. Three lifecycles (SRC-019 separation)

| Dimension | Field | Enum owner | Storage | Why separate |
|---|---|---|---|---|
| Artifact lifecycle | `status` (OKF) | manifest | Markdown frontmatter | AC-006/014: artifact maturity `draft→reviewed→active→archived` |
| Task execution | `task_status` | manifest + SQLite | frontmatter `task_status` + runtime row | SRC-019/024/025, AC-012/013: claim/lease/review-fix |
| Work-item container | `work_items[].status` + `phase`/`current_phase` | manifest + SQLite/state.md | `.lcs3/state.md` + runtime | `open/paused/archived/finalized` + phase mirror |

`type` forbidden except `state` artifact (see L3-004 §4). `status` never holds `pending`/`in_progress`/`needs_fix`.

## 2. Workflow phases (canonical names)

Main delivery flow (ordered, not all required per work item — adaptive routing SRC-029):

```
idle → new → explore → prd → prd_review → srs → tasks → execution → code_review → finalization → (archived)
```

Optional branches (enter/exit without leaving main flow, phase recorded but not counted as delivery progress):

`research`, `prototype`, `domain-modeling`, `architecture-planning`, `codebase_documentation`, `wizard`, `self_improvement_review`

Rules:

- `current_phase` mirrors `work_items[current_work].phase` when `current_work != null`; else `idle`.
- Phase change must update both mirror fields + `updated_at` (contract §17.2).
- `lcs-new` creates entry with `phase: new`, `status: open`.
- `lcs-doc-finalizer` sets `finalization` then removes entry; if selected, `current_work: null`, `current_phase: idle`.

Phase entry/exit (every phase defines both):

| Phase | Entry condition | Exit condition | Allowed next |
|---|---|---|---|
| `idle` | no work selected | `lcs-new` or `switch` | `new` |
| `new` | registry entry created | first artifact write | `explore`, `prd`, `research`, `domain-modeling` |
| `explore` | `explore.md` draft started | `explore.md → active` or skip (simple work, SRC-030) | `prd`, `srs` (skip prd if bug fast lane SRC-031) |
| `prd` | `prd.md` draft | `prd.md → reviewed/active` | `prd_review`, `srs`, `tasks` |
| `prd_review` | `prd-enhanced.md` requested | `prd-enhanced.md → reviewed` | `srs` |
| `srs` | `srs.md` draft | `srs.md → active` | `tasks` |
| `tasks` | `task-coverage.md` + `task/task-###.md` draft | all tasks have `task_status` | `execution` |
| `execution` | claim on ready task | task `done`/`needs_fix` | `code_review`, `execution` (next task) |
| `code_review` | `code-review.md` draft | review verdict `PASS`/`NEEDS_FIX`/`BLOCKED` | `execution` (fix), `finalization` |
| `finalization` | final gate requested | `doc.md`+`map.md → archived` + registry removal | `idle` |
| branch `research`/`prototype`/… | explicit skill entry | artifact `active`/`archived` | return to caller phase |

Adaptive routing (SRC-029/030/031): simple low-risk may skip `explore`/`prd_review`/`srs`; complex/high-risk must not skip; bug fast lane may go `new → execution → code_review → finalization` with escalation to `prd` if ambiguity found.

## 3. Artifact lifecycle states (`status`)

Enum: `draft → reviewed → active → archived` (OKF, VALID_STATUSES). `invalid_frontmatter` marker on parse fail.

| State | Entry | Exit | Who sets |
|---|---|---|---|
| `draft` | creating skill writes file | review or approval | creator skill |
| `reviewed` | `lcs-prd-reviewer`/`lcs-code-review` completes | user approval or fix | reviewer |
| `active` | approval / executor marks ready | finalizer | user / executor |
| `archived` | `lcs-doc-finalizer` | — (terminal) | finalizer |

Transitions:

```
draft → reviewed → active → archived
draft → active (skip review when allowed)
reviewed → draft (needs_fix, back to edit)
any → draft (invalid_frontmatter correction)
```

Terminal: `archived`. Illegal: `archived → *`, `active → draft` without review, `draft → archived` direct.

Staleness (FR-039/040): derived artifact carries `derived_from: {upstream, updated_hash}`; if upstream `updated > derived.derived_from.updated`, derived is stale until regenerated. Doctor checks.

## 4. Task execution states (`task_status`)

New field — replaces legacy `status: pending` misuse.

Enum (8 + 1 lease):

```
pending → ready → claimed → in_progress → in_review → done
                      ↘ blocked (dep/conflict)
in_review → needs_fix → claimed (re-claim)
claimed → expired → ready (lease expiry)
any → cancelled (terminal, human)
```

| State | Meaning | Entry condition | Exit condition | Lease |
|---|---|---|---|---|
| `pending` | sliced, deps unknown/unmet | task file created | deps resolved → `ready` | — |
| `ready` | deps met, claimable | `blocked_by` all `done`, no write-conflict active | atomic claim → `claimed` | — |
| `blocked` | dep or conflict blocks | dep not `done` or write-scope conflict detected | dep done / conflict cleared → `ready`/`pending` | — |
| `claimed` | lease held, not yet working | successful `claim` (atomic) | executor starts → `in_progress`; lease expiry → `expired` | active lease |
| `in_progress` | executor/AFK working | executor heartbeat | success → `in_review`; impl fail → retry or `needs_fix`/`blocked`; env fail → `blocked` | active lease, bounded retry (SRC-021/022) |
| `in_review` | awaiting review verdict | executor submits | `PASS` → `done`; `NEEDS_FIX` → `needs_fix`; `BLOCKED` → `blocked` | — |
| `needs_fix` | FIX-### emitted | review `NEEDS_FIX` | re-claim → `claimed` | — |
| `done` | verified complete | review `PASS` + task gate OK | — (terminal) | — |
| `cancelled` | abandoned | human decision | — (terminal) | — |
| `expired` | lease lost (transient) | lease timeout without heartbeat | reclaim → `ready` | — |

Terminal: `done`, `cancelled`. `expired` is transient → `ready`.

Entry/exit rules (every state has both — verify GATE-03):

- `pending` entry: file exists; exit: deps evaluated.
- `ready` entry: deps `done` + no conflict; exit: atomic claim or re-block.
- `blocked` entry: `blocked_by` not `done` or conflict graph edge; exit: dep `done` or conflict cleared (Doctor validates).
- `claimed` entry: atomic `INSERT … WHERE task_status=ready` succeeds; exit: heartbeat timeout or progress.
- `in_progress` entry: heartbeat started; exit: executor result classified (impl/env/spec/credential/human) per SRC-022.
- `in_review` entry: executor wrote handoff; exit: review verdict stable FIX-### (SRC-039).
- `needs_fix` entry: FIX-### recorded; exit: executor consumes exactly one FIX-### and returns to review (loop closes).
- `done` entry: task gate + traceability coverage OK; no exit.

## 5. Transition matrix (legal transitions)

| From \ To | pending | ready | blocked | claimed | in_progress | in_review | needs_fix | done | cancelled | expired |
|---|---|---|---|---|---|---|---|---|---|---|
| **pending** | — | ✓ | ✓ | — | — | — | — | — | ✓ | — |
| **ready** | — | — | ✓ | ✓ | — | — | — | — | ✓ | — |
| **blocked** | ✓ | ✓ | — | — | — | — | — | — | ✓ | — |
| **claimed** | — | — | — | — | ✓ | — | — | — | ✓ | ✓ |
| **in_progress** | — | — | ✓ | — | — | ✓ | — | — | ✓ | ✓ |
| **in_review** | — | — | — | — | — | — | ✓ | ✓ | ✓ | — |
| **needs_fix** | — | — | — | ✓ | — | — | — | — | ✓ | — |
| **expired** | — | ✓ | — | — | — | — | — | — | ✓ | — |
| **done** | — | — | — | — | — | — | — | — | — | — |
| **cancelled** | — | — | — | — | — | — | — | — | — | — |

Illegal = any `—` cell; runtime must reject with explicit error (not silent). Especially:

- `pending → claimed` (skip ready) — must go via `ready`.
- `done → *`, `cancelled → *` — terminal, no outgoing.
- `in_review → in_progress` — must go via `needs_fix → claimed`.
- `ready → in_progress` — must claim first.
- `status` / `task_status` cross-talk — never set `status=pending` or `task_status=draft`.

Work-item status transitions separate:

```
open → paused → open → archived → finalized (removed)
open → archived (direct when finalized)
```

`archived`/`finalized` are terminal for that registry entry.

## 6. Review-fix loop (SRC-039 closes)

```
in_progress → in_review --PASS--> done
                └─NEEDS_FIX→ needs_fix → claimed → in_progress → in_review
                └─BLOCKED  → blocked → ready → claimed …
```

Properties:

- Each `NEEDS_FIX` emits stable `FIX-###` with `task_status=needs_fix` + `blocked_by` linking review finding.
- Executor consumes exactly one `FIX-###` per cycle (FR-034), writes `Chain of Truth` + verification, returns to `in_review`.
- Loop terminates on `PASS` or `cancelled` or retry exhaustion → escalation (SRC-021).
- Trace: FIX-### appears in `task-coverage.md` and task file `related`.

## 7. AFK / HITL entry/exit (SRC-020..023, FR-029/030)

**AFK entry:** task `type: AFK`, `task_status=ready`, no HITL gate pending, lease available, deps met.

- Executor claims without user confirm (`--no-input` flag pattern), runs with bounded retry (SRC-021), classifies failures (SRC-022).
- AFK exit (return to human): any of — retry exhaustion, `NEEDS_FIX` requiring human authority, spec ambiguity, credential/security decision (SRC-023), destructive action, or `task_status=done`.

**HITL entry:** task `type: HITL` or AFK escalation, or GATE/ADR decision, or `blocked` requiring human.

- Executor stops, records `blocked` with reason `awaiting_human`, releases or pauses lease.
- HITL exit: human approves/revises → `ready`/`claimed`.

Executor must never ask routine mode confirmations during AFK (SRC-020); must classify `missing credentials | spec ambiguity | human business decision` as non-retry (SRC-022) and escalate immediately.

## 8. Concurrency & multi-worker (SRC-024..028, AC-012/013/024..028)

- Claim atomic: `UPDATE tasks SET task_status='claimed', owner=?, lease_until=? WHERE id=? AND task_status='ready'` — exactly one row affected wins.
- Lease: heartbeat extends `lease_until`; `expired` when now > `lease_until` without heartbeat; task becomes `ready` reclaimable.
- Dependencies: `blocked_by` edges; dependent stays `blocked` until upstream `done`; unknown dep → `blocked` + validation error (AC-025).
- Conflicts: write-scope overlap → `blocked` on conflict graph (separate from deps, SRC-025).
- Scope expansion: if write touches beyond declared `write_scope`, record `scope_expansion` and stay `in_progress` or escalate to `blocked` for reslicing.
- Blast radius: if diff impact > budget (SRC-028) → `blocked` + escalation, not silent expansion.

## 9. Verify (GATE-03 checklist)

- [ ] Every `status` and `task_status` value has entry/exit rule (§3/§4).
- [ ] No artifact uses `status=pending` / no task uses `task_status=draft` (separation enforced).
- [ ] Transition matrix (§5) covers all states; every `—` rejected with error.
- [ ] Terminal states `done`/`cancelled`/`archived` have no outgoing edges.
- [ ] Review-fix loop (§6) closes: `in_review → needs_fix → claimed → in_progress → in_review → done`.
- [ ] AFK/HITL entry/exit (§7) distinguish retryable vs escalate failures (SRC-022 taxonomy).
- [ ] Doctor can detect: invalid status, illegal transition, stale derived, orphaned task, broken dep, claim race, lease expiry, coverage missing (SRC-060).

## 10. Decision for GATE-03

Freeze:

1. Phase names + `current_phase` mirror rule (§2).
2. Three enums: `status` (4), `task_status` (9+cancelled), `work_items[].status` (4).
3. Transition matrix (§5) + illegal set.
4. Terminal states (§3/§4).
5. Review-fix semantics + FIX-### stability (§6).
6. AFK/HITL gates (§7).

Not frozen here: SQLite tables/indexes, heartbeat interval, retry budget numbers, exact CLI surface — L3-006 / Phase 1.

## References

- `docs/prd.md` §§5 (SRC-019..031,039,060), 7.6..7.10, 10, 16 Q7/8/11
- `docs/decisions/artifact-format-options.md` (status vs task_status split)
- `reference/legacy-lcs/skills/lcs-shared/contract.md` §17.2 (state registry), OKF lifecycle
- `reference/legacy-lcs/skills/lcs-shared/templates/task.template.md` (`status: pending` anomaly), `state.template.md`
- `reference/legacy-lcs/skills/lcs-shared/scripts/validate-okf.py` (VALID_STATUSES, LCS_RUNTIME), `validate-traceability.py`
