---
title: "PRD: LCS3 Deterministic Agentic Coding Runtime"
format_version: "okf/0.2"
authors:
  - type: agent
    name: "lcs-toprd"
created: "2026-09-19"
updated: "2026-09-19"
artifact_type: prd
cot_level: standard
version: "1.1"
status: draft
tags: [prd, requirements, lcs3, agentic-coding, runtime]
summary: "Product Requirements Document for LCS3, a clean-slate deterministic agentic coding framework."
source: "LCS3 exploration artifact and subsequent user decisions in the current conversation"
related: []
---

# PRD: LCS3 Deterministic Agentic Coding Runtime

## 1. Problem Statement & Objective

### Problem Statement

Current LCS has valuable workflow concepts, but too much correctness depends on an LLM interpreting and reproducing Markdown instructions correctly. The existing system also has overlapping or drifting definitions across skills, shared contracts, templates, validators, fixtures, lifecycle rules, and workflow handoffs.

This creates risks including state corruption, schema drift, duplicate Sources of Truth, unnecessary context loading, fragile dependency handling, incomplete AFK autonomy, weak multi-worker coordination, and excessive token consumption.

LCS3 must preserve useful product behavior from the current LCS while replacing fragile mechanics with a deterministic runtime and a clean artifact contract.

### Objective

Create **LCS3** as a new repository and clean-slate agentic coding framework built around:

1. **Determinism** — mechanical operations are performed by runtime code wherever practical.
2. **Autonomy** — AFK work can execute and self-correct without unnecessary human intervention.
3. **Efficiency** — agents receive only the context needed for the current task.
4. **Quality** — quality checks are modular, selective, native, and verifiable.
5. **Learning without self-corruption** — memory and telemetry improve future work without silently modifying canonical contracts.
6. **Behavioral continuity without architectural inheritance** — useful behavior from legacy LCS is explicitly inventoried and selectively rebuilt, rather than copied wholesale.

## 2. Background & Proposed Solution

LCS3 is **not an in-place major upgrade** of LCS and has **no backward compatibility requirement** for legacy state, active work-items, workflow schemas, or runtime mechanics.

The current LCS repository is instead used as a **read-only behavioral and feature reference** while LCS3 is designed and implemented from new contracts.

High-level model:

```text
Legacy LCS reference
        |
        v
Legacy Skill Migration Matrix
        |
        v
LCS3 skills / LLM reasoning
        |
        v
Workflow / policy layer
        |
        v
Deterministic lcs3 runtime
        |
   +----+----------------------+
   |            |              |
Markdown/YAML  SQLite       Derived views
canonical      runtime      / caches
artifacts       state
```

The LLM primarily handles ambiguity, synthesis, engineering judgment, planning, implementation reasoning, and review judgments.

The deterministic runtime primarily handles state mutation, IDs, lifecycle validation, dependency and conflict resolution, leases, traceability generation, freshness, generated indexes, and telemetry persistence.

## 3. Source Context

This PRD is based on:

- the completed LCS3 Hard Explore artifact from the current conversation;
- the existing `SRC-001` through `SRC-065` source requirement ledger;
- the later explicit decision to keep a read-only copy/reference of legacy LCS inside the LCS3 development repository;
- the later explicit decision that the complete legacy skill inventory must be classified before the LCS3 skill family is implemented.

No LCS3 implementation repository was inspected while authoring this artifact. Exact implementation paths remain technical-design work.

## 4. Scope & User Stories

### Scope

LCS3 includes:

- new repository `LCS3`;
- new skill namespace `lcs3-*`;
- deterministic CLI `lcs3`;
- `.lcs3/` project-local root;
- Node.js/TypeScript runtime;
- canonical manifest-based contracts;
- Markdown/YAML canonical artifacts;
- SQLite dynamic execution state;
- adaptive complexity/risk workflow routing;
- AFK/HITL execution;
- bounded self-correction;
- dependency, conflict, claim, and lease handling;
- selective context loading and Context Capsules;
- artifact provenance/freshness;
- targeted and final verification gates;
- review-fix loops;
- native Quality Overlays;
- project memory;
- ADR promotion;
- local telemetry and evidence-backed self-improvement proposals;
- Doctor/integrity checks;
- end-to-end workflow scenario tests;
- reference-only legacy LCS docs/archive import;
- read-only legacy LCS source reference for implementation analysis;
- a Legacy Skill Migration Matrix covering all legacy skills before skill-family implementation.

### User Stories

1. As a coding-agent operator, I want stateful mechanics to be deterministic so cheap models cannot corrupt project state.
2. As an autonomous worker, I want task-specific context so fresh sessions remain efficient.
3. As an orchestrator, I want dependencies, conflicts, ownership, and leases so multiple workers can operate safely.
4. As a project owner, I want AFK execution to stop only for meaningful human decisions.
5. As a coding agent, I want recoverable implementation failures to self-correct within a bounded retry budget.
6. As a reviewer, I want actionable review findings to feed directly into a fix loop.
7. As a project owner, I want quality checks loaded only when relevant.
8. As a project owner, I want reusable operational memory without letting stale memory override canonical evidence.
9. As an LCS3 maintainer, I want local telemetry and workflow evaluations so improvements are evidence-based.
10. As an LCS maintainer, I want every useful legacy skill capability consciously preserved, redesigned, merged, dropped, or moved into runtime rather than accidentally lost or blindly copied.

## 5. Source Requirement Ledger

| SRC ID | Priority | Origin | Description |
|---|---|---|---|
| SRC-001 | P0 | Direct architecture decision | LCS3 must be developed as a new repository named `LCS3`, using current LCS only as source/reference material rather than upgrading the existing repository in place. |
| SRC-002 | P0 | Direct architecture decision | LCS3 must not provide backward compatibility with LCS v2 artifact, state, workflow, or runtime formats. |
| SRC-003 | P0 | Direct architecture decision | LCS3 project-managed data must use `.lcs3/` as its root rather than `.lcs/`. |
| SRC-004 | P0 | Explore Round 4 | LCS3 must use a separate namespace: skills `lcs3-*`, CLI `lcs3`, and repository `LCS3`. |
| SRC-005 | P0 | Explore Round 1 | LCS3 must expose deterministic runtime operations through one primary CLI with modular internal subsystems. |
| SRC-006 | P1 | Explore Round 2 | The LCS3 CLI/runtime must be implemented in Node.js/TypeScript. |
| SRC-007 | P0 | Explore Round 2 | Stateful, mutation-heavy, integrity-sensitive, or critical operations must use deterministic runtime handling rather than relying on LLM compliance alone. |
| SRC-008 | P1 | Explore Round 2 | Planning and read-only LCS3 activities may operate without invoking the executable runtime when no state mutation or integrity-sensitive operation is required. |
| SRC-009 | P0 | Explore Round 2 | Artifact schemas, workflow phases/transitions, skill metadata, lifecycle definitions, and quality-overlay definitions must derive from a canonical manifest directory organized by concern. |
| SRC-010 | P0 | Prior audit decision | LCS3 must eliminate duplicated contract definitions that can drift across skills, templates, validators, fixtures, and documentation. |
| SRC-011 | P0 | Explore Round 1 | `prd.md` must be the single canonical PRD artifact. |
| SRC-012 | P1 | Explore Round 1 | PRD review findings, hardening recommendations, and proposed changes must be stored separately in `prd-review.md` rather than creating a second canonical PRD. |
| SRC-013 | P0 | Explore Round 3 | LCS3 must explicitly distinguish canonical artifacts from generated or derived artifacts. |
| SRC-014 | P1 | Explore Round 3 | Traceability views, task-coverage views, indexes, context capsules, and similar bookkeeping outputs should be regenerable rather than treated as independent Sources of Truth. |
| SRC-015 | P0 | Explore Round 3 | Machine-critical artifact metadata such as IDs, dependencies, coverage, execution mode, scope, and relations must be represented in structured metadata rather than inferred only from prose. |
| SRC-016 | P1 | Explore Round 3 | Human-oriented explanations must remain readable Markdown alongside structured metadata. |
| SRC-017 | P0 | Explore Round 3 | Dynamic execution state must be stored separately from relatively stable task/specification artifacts. |
| SRC-018 | P0 | Explore Round 5 | Dynamic runtime state must use SQLite to support atomic updates and concurrency. |
| SRC-019 | P0 | Prior architecture decision | Task execution lifecycle must distinguish task execution status from artifact lifecycle status. |
| SRC-020 | P0 | Prior architecture decision | LCS3 must support true AFK autonomous execution without requiring routine mode confirmations during execution. |
| SRC-021 | P0 | Prior architecture decision | Executor failures caused by task-local implementation errors must support bounded self-correction and retry before escalation. |
| SRC-022 | P0 | Prior architecture decision | Retry behavior must be bounded and failure causes must be classified so implementation failures, environment failures, external dependencies, specification ambiguity, and human decisions can route differently. |
| SRC-023 | P0 | Prior architecture decision | HITL must be reserved for decisions or gates that genuinely require human authority, unresolved high-impact ambiguity, destructive actions, credentials, security/business decisions, retry exhaustion, or equivalent blocking conditions. |
| SRC-024 | P0 | Prior architecture decision | Multi-worker execution must support task claim/lease semantics so multiple workers cannot unknowingly execute the same task concurrently. |
| SRC-025 | P0 | Prior architecture decision | LCS3 must model both dependency relationships and write-conflict relationships between tasks. |
| SRC-026 | P1 | Prior architecture decision | Tasks must distinguish expected read scope from write scope. |
| SRC-027 | P1 | Prior architecture decision | Scope expansion beyond the declared write scope must be explicitly recorded. |
| SRC-028 | P1 | Prior architecture decision | Tasks should support a change/blast-radius budget so unexpectedly large implementation impact can trigger reslicing or escalation rather than uncontrolled scope expansion. |
| SRC-029 | P0 | Prior architecture decision | Workflow routing must adapt based on both complexity and risk rather than forcing every work item through the same pipeline. |
| SRC-030 | P1 | Prior architecture decision | Simple low-risk work may skip unnecessary planning stages, while complex or high-risk work may require reviewer/SRS/security stages. |
| SRC-031 | P1 | Prior architecture decision | Bug handling must support a fast lane for known/scoped bugs and escalate into PRD/planning only when the bug exposes missing requirements or design ambiguity. |
| SRC-032 | P0 | Prior context decision | LCS3 must support selective context loading so workers do not need to read the entire artifact chain for every task. |
| SRC-033 | P1 | Prior context decision | LCS3 should be able to generate a temporary task-specific Context Capsule from relevant SRC/FR/AC/TEST decisions and repository evidence. |
| SRC-034 | P1 | Prior context decision | Context Capsules must be treated as derived caches and never as canonical Sources of Truth. |
| SRC-035 | P0 | Prior context decision | Derived artifacts must carry sufficient provenance to detect when their upstream canonical source has changed and the derived artifact has become stale. |
| SRC-036 | P1 | Prior efficiency decision | LCS3 should support configurable soft and hard context/token budgets to encourage selective loading. |
| SRC-037 | P1 | Prior verification decision | Verification should distinguish a targeted per-task gate from a broader work-item/final gate. |
| SRC-038 | P1 | Prior verification decision | Project-specific verification commands should be discoverable once and reusable rather than rediscovered by every fresh agent session. |
| SRC-039 | P0 | Prior review-loop decision | Code review findings must support an explicit review-fix execution path so executor can consume specific `FIX-###` findings and return work to review. |
| SRC-040 | P1 | Prior runtime decision | LCS3 should provide deterministic generation/validation for traceability and task-coverage bookkeeping where structured metadata already contains the necessary relationships. |
| SRC-041 | P0 | Explore Round 4 | LCS and LCS3 may coexist in the same project, but LCS3 runtime/state must remain isolated from old `.lcs/` runtime/state. |
| SRC-042 | P1 | Explore Round 4 | LCS3 may read legacy LCS artifacts as reference-only evidence when explicitly relevant. |
| SRC-043 | P0 | Explore Round 4 | Legacy import support must be limited to LCS documentation and archive material, not legacy state, active work-items, task runtime, or execution lifecycle. |
| SRC-044 | P1 | Explore Round 5 | Imported legacy docs/archive material must preserve the original raw content. |
| SRC-045 | P1 | Explore Round 5 | LCS3 must generate a lightweight searchable index/metadata layer for imported legacy material without converting it into native LCS3 canonical artifacts. |
| SRC-046 | P0 | Explore Round 4 | LCS3 project initialization must be explicit through `lcs3 init`. |
| SRC-047 | P0 | Explore Round 5 | LCS3 quality rules must not depend on fetching or executing the external Anti-Slop repository at runtime. |
| SRC-048 | P1 | Explore Round 5 | Relevant Anti-Slop principles may be adapted into LCS3-owned native quality rules. |
| SRC-049 | P1 | Explore Round 6 | LCS3 must provide a generic Quality Overlay framework. |
| SRC-050 | P1 | Explore Round 6 | Initial native Quality Overlays must include `ui-quality`, `code-quality`, and `security-basic`. |
| SRC-051 | P0 | Prior quality decision | Quality Overlays must be selected only when relevant to a task/concern rather than loaded globally into every skill. |
| SRC-052 | P0 | Explore Round 6 | Project memory must be advisory evidence rather than canonical authority. |
| SRC-053 | P1 | Explore Round 6 | Project memory entries must track provenance, confidence, and freshness so stale or contradicted memories can be detected. |
| SRC-054 | P0 | Explore Round 6 | Canonical artifacts and verified repository evidence must override conflicting project memory. |
| SRC-055 | P1 | Prior memory decision | Operational lessons such as project-specific commands, environment quirks, recurring failures, and verified workarounds may be stored separately from final documentation for reuse across fresh sessions. |
| SRC-056 | P1 | Prior ADR decision | Decisions whose scope becomes project-wide architecture should be promotable to ADRs rather than remaining buried inside a single work item. |
| SRC-057 | P1 | Explore Round 6 | LCS3 should collect local operational telemetry useful for understanding context size, retries, tool usage, failure patterns, and execution results. |
| SRC-058 | P0 | Explore Round 6 | Telemetry and self-improvement must not silently modify skills, runtime contracts, schemas, or framework rules. |
| SRC-059 | P1 | Explore Round 6 | Self-improvement must produce evidence-backed improvement proposals that are reviewed and applied through an explicit workflow. |
| SRC-060 | P0 | Prior health-check decision | LCS3 must provide a Doctor capability to detect state inconsistency, stale artifacts, broken dependencies, orphaned work, missing coverage, invalid lifecycle state, and contract/validator drift. |
| SRC-061 | P1 | Prior eval decision | LCS3 validation must include end-to-end workflow scenarios in addition to static schema checks. |
| SRC-062 | P1 | Prior eval decision | Scenario coverage should include simple/complex features, bug fast lane, AFK/HITL, multi-workitem behavior, multiple workers, review-fix loops, stale artifacts, conflicts, retry exhaustion, and finalization. |
| SRC-063 | P1 | Prior configuration decision | Project-level LCS3 behavior should be configurable through a centralized `.lcs3` project configuration rather than repeating policy inside many skills. |
| SRC-064 | P0 | Prior token-efficiency decision | LCS3 skill entrypoints should remain concise control planes and move conditional detail into selectively loaded references or deterministic runtime behavior. |
| SRC-065 | P0 | Prior governance decision | The LLM should primarily handle ambiguity, synthesis, and engineering judgment; deterministic code should handle state mutation, IDs, bookkeeping, validation, dependency resolution, and similar mechanical operations where practical. |
| SRC-066 | P1 | Direct follow-up decision | The LCS3 development repository may contain or reference a read-only copy of the legacy LCS repository for behavioral and feature analysis; legacy content must not become canonical LCS3 architecture, runtime state, or build output. |
| SRC-067 | P0 | Direct follow-up decision | Before implementation of the LCS3 skill family, every legacy LCS skill must be classified in an approved Legacy Skill Migration Matrix as `REWRITE`, `MERGE`, `DROP`, or `REPLACED_BY_RUNTIME`. |
| SRC-068 | P0 | Direct follow-up decision | Coding agents must not invent the LCS3 skill inventory from the PRD alone; skill creation, SRS decomposition, and task slicing must follow the approved Legacy Skill Migration Matrix. |
| SRC-069 | P1 | Direct follow-up decision | For each legacy skill that is retained or reworked, the Legacy Skill Migration Matrix must define its target LCS3 skill/capability, preserved behavior, removed legacy mechanics, runtime dependencies, and upstream/downstream workflow relationships. |

## 6. Non-Goals / Out of Scope

- Backward compatibility with legacy `.lcs/` runtime/state/artifact contracts.
- Automatic migration of active legacy work-items.
- Treating legacy skill files as canonical LCS3 requirements.
- Blindly copying the legacy LCS architecture into LCS3.
- Allowing coding agents to infer or invent the final LCS3 skill inventory without an approved migration matrix.
- Sharing runtime state between LCS and LCS3.
- Maintaining `prd-enhanced.md` as a second canonical PRD.
- Runtime dependence on the external Anti-Slop repository.
- Automatically rewriting framework contracts based on telemetry.
- Allowing project memory to override canonical artifacts.
- Loading every quality rule into every task.

Not yet established as product requirements:

- remote/cloud orchestration service;
- hosted telemetry;
- centralized multi-project server;
- graphical UI;
- distributed runtime-state backend.

## 7. Functional Requirements

### 7.1 Repository, Namespace, and Legacy Reference

**FR-001 — Clean-slate repository**  
LCS3 must exist as a separate repository named `LCS3`.

**FR-002 — Namespace isolation**  
LCS3 must use repository `LCS3`, CLI `lcs3`, skills `lcs3-*`, and project root `.lcs3/`.

**FR-003 — Read-only legacy source reference**  
The development repository may expose the legacy LCS source under a clearly isolated reference location such as `reference/legacy-lcs/` or an equivalent read-only mechanism.

Legacy source is evidence/reference only. It must not be modified as part of LCS3 implementation and must not define runtime truth.

**FR-004 — Skill migration matrix gate**  
Before the LCS3 skill family is implemented, all legacy skills must be inventoried and classified as:

- `REWRITE`
- `MERGE`
- `DROP`
- `REPLACED_BY_RUNTIME`

The migration matrix is a prerequisite input to SRS/task slicing for skill-family implementation.

For each retained/reworked skill, the matrix must record:

- legacy name;
- target LCS3 skill/capability;
- disposition;
- behavior to preserve;
- behavior/mechanics to remove;
- deterministic runtime dependencies;
- upstream/downstream workflow relationships;
- notes/rationale.

### 7.2 Initialization and Configuration

**FR-005 — Explicit initialization**  
A project must be initialized through `lcs3 init`.

**FR-006 — Central project policy**  
Project-level workflow, execution, context, verification, quality, and risk policy must be configured centrally under `.lcs3/`.

### 7.3 Deterministic Runtime

**FR-007 — Single CLI façade**  
Stateful deterministic operations must be exposed through the `lcs3` CLI.

**FR-008 — Modular internals**  
The CLI must be backed by modular subsystems rather than one monolithic implementation.

**FR-009 — Deterministic critical operations**  
State transitions, IDs, task claims, leases, dependency checks, validation, generated indexes, freshness, and deterministic traceability/coverage operations must be owned by runtime code where practical.

### 7.4 Canonical Manifest System

**FR-010 — Manifest directory**  
Canonical machine-readable manifests must define artifact types, workflow phases/transitions, skill metadata, task lifecycle, and Quality Overlay definitions.

**FR-011 — Drift prevention**  
Generated documentation, validators, fixtures, or routing tables must derive from or be validated against canonical manifests so the same contract is not independently redefined across files.

### 7.5 Artifact Model

**FR-012 — Canonical vs derived classification**  
Every artifact type must be classifiable as canonical or derived/generated.

**FR-013 — Structured metadata**  
Machine-critical metadata must be structured, while human explanations remain Markdown.

**FR-014 — Single canonical PRD**  
`prd.md` is the authoritative PRD.

**FR-015 — Separate PRD review artifact**  
PRD review output must live in `prd-review.md` or equivalent review artifact and must not become a competing canonical PRD.

### 7.6 Runtime State and Concurrency

**FR-016 — Separate dynamic state**  
Worker/session/lease/retry state must not require continuously rewriting canonical task artifacts.

**FR-017 — SQLite runtime state**  
Dynamic execution state must use SQLite with atomic operations for concurrent ownership-sensitive actions.

**FR-018 — Separate lifecycle dimensions**  
Artifact lifecycle and task execution lifecycle must be modeled separately.

### 7.7 Task Relationships and Multi-Worker Safety

**FR-019 — Machine-readable task relationships**  
Task dependencies, requirement coverage, test coverage, execution mode, scope, and relevant Quality Overlays must be structured.

**FR-020 — Read/write scope**  
Tasks must support intended read scope and expected write scope.

**FR-021 — Scope expansion**  
Write-scope expansion must be explicitly recorded.

**FR-022 — Blast-radius guard**  
Unexpectedly broad implementation impact must be detectable and able to trigger escalation or reslicing.

**FR-023 — Dependency graph**  
Incomplete or unknown dependencies must prevent unsafe execution and produce explicit validation outcomes.

**FR-024 — Conflict graph**  
Write conflicts must be represented separately from logical dependencies.

**FR-025 — Atomic task claim and lease**  
A worker must claim a task atomically and ownership must support lease expiry/recovery.

### 7.8 Adaptive Workflow

**FR-026 — Complexity + risk routing**  
Workflow depth must adapt based on both complexity and risk.

**FR-027 — Adaptive planning depth**  
Low-risk simple work may use a shorter path; complex/high-risk work may require additional review/specification/security steps.

**FR-028 — Bug fast lane**  
Scoped bugs may use a shortened workflow; ambiguous bugs must be able to escalate into planning.

### 7.9 Autonomous Execution

**FR-029 — AFK execution**  
AFK tasks must run without routine interaction when requirements are sufficient.

**FR-030 — Meaningful HITL gates**  
Human intervention must be reserved for actual human-authority decisions or blocking conditions.

**FR-031 — Bounded self-correction**  
Recoverable implementation failures must support diagnose/fix/retry within a finite retry budget.

**FR-032 — Failure taxonomy**  
Implementation, specification, environment, external dependency, credentials, test instability, repository conflict, and human-decision failures must be distinguishable enough to route differently.

### 7.10 Review-Fix Loop

**FR-033 — Stable review fixes**  
Actionable review findings must support stable `FIX-###` IDs.

**FR-034 — Direct review-fix execution**  
Executor must be able to consume a specific review fix and return work to review.

### 7.11 Context Engine and Freshness

**FR-035 — Selective context**  
Workers must not be required to load the entire artifact chain.

**FR-036 — Context Capsule**  
LCS3 should build task-specific derived context from relevant requirements, ACs, tests, decisions, repository evidence, dependencies, and relevant memory.

**FR-037 — Capsule authority**  
Context Capsules are derived caches and never canonical authority.

**FR-038 — Context budgets**  
Projects should support configurable context/token limits.

**FR-039 — Derived provenance**  
Derived artifacts must record sufficient provenance to determine whether they are current.

**FR-040 — Staleness detection**  
Upstream canonical changes must make dependent stale derived data detectable.

### 7.12 Verification and Traceability

**FR-041 — Task Gate**  
Per-task verification should use targeted checks relevant to the changed area.

**FR-042 — Work-item Gate**  
Final work-item completion should use a broader verification gate.

**FR-043 — Verification recipe reuse**  
Verified project commands should be discoverable once and reusable across fresh sessions.

**FR-044 — Deterministic traceability**  
Traceability and task coverage should be generated from structured relationships where practical.

### 7.13 Legacy Artifact Import

**FR-045 — Runtime coexistence**  
`.lcs/` and `.lcs3/` may coexist, but legacy runtime state must not influence LCS3 runtime.

**FR-046 — Reference-only access**  
Legacy LCS artifacts may be read as reference evidence when relevant.

**FR-047 — Limited legacy import**  
Import is limited to documentation and archive material, not active state/work-items/execution lifecycle.

**FR-048 — Preserve raw legacy material**  
Imported content must preserve original source material.

**FR-049 — Searchable legacy index**  
LCS3 may create lightweight metadata/indexes over imported legacy material without promoting it to canonical LCS3 status.

### 7.14 Quality Overlay Framework

**FR-050 — Generic Quality Overlay system**  
LCS3 must support concern-specific Quality Overlays.

**FR-051 — Initial native overlays**  
Initial overlays must include `ui-quality`, `code-quality`, and `security-basic`.

**FR-052 — Selective loading**  
Only overlays relevant to the current task should be loaded.

**FR-053 — Native ownership**  
Anti-Slop may inspire rules, but LCS3 owns and versions its own rules and must not depend on Anti-Slop at runtime.

### 7.15 Project Memory and ADRs

**FR-054 — Advisory memory**  
Project memory is advisory evidence, never canonical authority.

**FR-055 — Provenance/confidence/freshness**  
Memory entries must carry sufficient metadata to assess reliability and staleness.

**FR-056 — Canonical evidence wins**  
Canonical artifacts and verified repository evidence override conflicting memory.

**FR-057 — Operational learning**  
Reusable commands, environment quirks, recurring failures, and verified workarounds may be captured separately from final documentation.

**FR-058 — ADR promotion**  
Project-wide architectural decisions discovered in work-items should be promotable into ADRs or equivalent durable artifacts.

### 7.16 Telemetry and Self-Improvement

**FR-059 — Local telemetry**  
LCS3 should collect local execution metrics useful for understanding retries, context usage, failure patterns, tool usage, and results.

**FR-060 — No silent self-modification**  
Telemetry must not silently rewrite skills, manifests, schemas, runtime contracts, or framework rules.

**FR-061 — Evidence-backed proposals**  
Self-improvement must output explicit proposals backed by evidence and applied through a separate deliberate workflow.

### 7.17 Doctor and Workflow Evals

**FR-062 — Doctor**  
LCS3 must provide deterministic integrity checks for state, lifecycle, dependencies, freshness, coverage, conflicts, and contract drift.

**FR-063 — Static + scenario validation**  
Validation must include both schema/contract tests and end-to-end workflow scenarios.

**FR-064 — Scenario coverage**  
Scenario tests should cover simple/complex features, bug fast lane, AFK/HITL, multi-workitem, multi-worker, dependency blocking, write conflicts, review-fix loops, stale artifacts, retry exhaustion, and finalization.

### 7.18 Skill Architecture

**FR-065 — Lean skill entrypoints**  
`SKILL.md` files must remain concise control planes rather than duplicate entire framework contracts.

**FR-066 — Progressive disclosure**  
Conditional detail belongs in selectively loaded references or deterministic runtime operations.

**FR-067 — Runtime-first mechanics**  
Skills must invoke deterministic runtime services for mechanical stateful work rather than teaching agents to mutate state through prose.

**FR-068 — Skill inventory controlled by migration matrix**  
The authoritative initial LCS3 skill family must be derived from the approved Legacy Skill Migration Matrix plus any explicit new capabilities approved during design. Coding agents must not synthesize an unapproved skill family ad hoc.

## 8. Technical Approach & Implementation Decisions

### 8.1 Development Repository Layout

Recommended initial development shape:

```text
LCS3/
├── AGENTS.md
├── README.md
├── package.json
├── docs/
├── reference/
│   └── legacy-lcs/       # read-only reference only
├── src/                  # runtime implementation, exact structure TBD
├── skills/               # lcs3-* skills, created after migration matrix
└── .lcs3/                # LCS3 project/runtime artifacts when initialized
```

`reference/legacy-lcs/` may be implemented as a Git submodule, local clone, or equivalent read-only mechanism. It is not part of LCS3 runtime output and must not be modified by coding agents.

### 8.2 Legacy Skill Migration Matrix

Before implementing the skill family, create a canonical planning artifact that inventories every legacy skill and classifies it as `REWRITE`, `MERGE`, `DROP`, or `REPLACED_BY_RUNTIME`.

Example structure:

| Legacy Skill | LCS3 Target | Disposition | Preserve | Remove | Runtime Dependencies | Workflow Relations |
|---|---|---|---|---|---|---|
| `lcs-explore` | `lcs3-explore` | REWRITE | interview/decision ledger behavior | legacy state/path mechanics | artifact/ID validation | -> `lcs3-toprd` |
| `lcs-shared` | runtime/manifests | REPLACED_BY_RUNTIME | reusable contract intent | duplicated shared prompt contract | manifest registry | framework-wide |

The final inventory is not defined by this PRD and must be produced from actual inspection of the legacy repository.

### 8.3 Architectural Layers

```text
LCS3 Skills
    |
Workflow / Policy Layer
    |
Deterministic Runtime API / lcs3 CLI
    |
+-------------------+-----------------+
|                   |                 |
Canonical Artifacts SQLite Runtime    Derived Views
Markdown + YAML     State             / Caches
```

### 8.4 Canonical vs Runtime Data

- **Canonical specification:** Markdown + structured YAML metadata.
- **Dynamic execution state:** SQLite.
- **Derived views/cache:** regenerable and freshness-aware.

SQLite must not silently become the only location of canonical product requirements.

### 8.5 Delivery Sequence

Recommended dependency-driven delivery sequence:

1. repository/namespace/bootstrap and legacy-reference policy;
2. Legacy Skill Migration Matrix;
3. canonical manifests and artifact contracts;
4. deterministic runtime core and SQLite state;
5. task lifecycle/dependency/conflict/lease mechanics;
6. adaptive routing and AFK/HITL execution;
7. context/provenance/verification;
8. review-fix and Quality Overlays;
9. memory/ADRs/telemetry/Doctor;
10. scenario hardening and packaging;
11. skill-family implementation according to the approved migration matrix, sequencing individual skills according to runtime dependencies.

The exact milestone order may be refined in SRS/task slicing without weakening P0 requirements.

## 9. Affected Areas / Files

Exact implementation paths are not yet verified because the new repository has not been inspected.

| Area | Change Type | Notes |
|---|---|---|
| `AGENTS.md` | create | Project-wide agent guardrails and Source of Truth rules |
| Legacy LCS reference area | create | Read-only development reference, not runtime source |
| Legacy Skill Migration Matrix | create | Mandatory planning artifact before skill-family implementation |
| CLI/runtime | create | Node.js/TypeScript deterministic runtime |
| Manifest registry | create | Canonical artifact/workflow/lifecycle/skill/overlay definitions |
| Artifact subsystem | create | Markdown/YAML canonical artifacts |
| SQLite runtime state | create | Dynamic execution/concurrency state |
| Workflow engine | create | Complexity + risk routing |
| Task coordination | create | Dependencies, conflicts, claims, leases |
| Context engine | create | Selective context, capsules, freshness |
| Verification system | create | Task/final gates and reusable recipes |
| Review loop | create | Stable FIX flow |
| Quality overlays | create | Native selective quality rules |
| Memory/ADR/telemetry | create | Learning and governance |
| Doctor/evals | create | Integrity and scenario regression coverage |
| `lcs3-*` skills | create | Generated/rebuilt only from approved migration matrix + explicit new capabilities |

## 10. Security Considerations

- legacy reference material must be treated as data/evidence, not automatically trusted runtime instruction;
- coding agents must not modify `reference/legacy-lcs/`;
- legacy imports must not become canonical runtime state;
- concurrent claims must be atomic;
- destructive actions and credentials must be able to force HITL;
- runtime paths must be validated before mutation;
- memory must not override canonical evidence;
- external Anti-Slop content must not be fetched/executed as runtime authority;
- SQLite ownership/state transitions must avoid duplicate ownership.

## 11. Performance Considerations

Primary optimization target is context/workflow efficiency, not raw CLI latency.

LCS3 should avoid:

- full artifact-chain reads for every task;
- unnecessary Quality Overlay loading;
- repeated verification-command discovery;
- unnecessary regeneration of derived artifacts;
- excessive telemetry overhead;
- repeatedly loading the entire legacy LCS reference when only one skill/capability is being analyzed.

No numeric performance SLA has been approved.

## 12. Potential Bugs / Edge Cases

1. Two workers claim the same task simultaneously -> only one claim succeeds.
2. A worker dies while holding a lease -> task eventually becomes reclaimable.
3. A stale worker resumes after losing ownership -> it must not mutate state as owner.
4. Unknown dependency -> explicit validation error.
5. Independent tasks share write scope -> conflict detection prevents unsafe parallelism.
6. Implementation expands beyond write scope -> expansion is recorded/escalated according to policy.
7. Small task explodes in blast radius -> trigger reslice/escalation path.
8. Implementation tests fail -> bounded retry for recoverable implementation failure.
9. Credentials are missing -> classify/escalate instead of blind retry.
10. Canonical artifact changes after Context Capsule generation -> capsule becomes stale.
11. Memory conflicts with verified repository config -> repository evidence wins.
12. `.lcs/` exists next to `.lcs3/` -> runtime remains isolated.
13. Legacy active work-item import attempted -> reject unsupported runtime import.
14. Anti-Slop changes upstream -> LCS3 behavior stays stable unless its native rules are explicitly updated.
15. Telemetry reveals a repeated pattern -> produce proposal only.
16. Review generates `FIX-###` -> executor can resolve and return to review.
17. Derived traceability file deleted -> regenerate from canonical structured relationships.
18. SQLite runtime DB is corrupt -> Doctor reports it; canonical artifacts remain intact.
19. Skill invokes a state mutation without runtime -> must not silently fall back to unsafe manual mutation.
20. Coding agent starts generating `lcs3-*` skills before migration matrix approval -> workflow must treat this as invalid/premature work.
21. Coding agent copies a legacy `SKILL.md` wholesale including old `.lcs/` paths or lifecycle assumptions -> review/validation must reject legacy contract leakage.
22. A legacy skill has no direct LCS3 counterpart -> matrix must explicitly mark MERGE, DROP, or REPLACED_BY_RUNTIME rather than silently omitting it.

## 13. Acceptance Criteria

### Foundation & Namespace

- **AC-001:** A newly initialized LCS3 project uses `.lcs3/` and does not require `.lcs/`.
- **AC-002:** `lcs3 init` initializes LCS3 without importing or mutating legacy runtime state.
- **AC-003:** LCS3 uses the `LCS3` / `lcs3` / `lcs3-*` namespace without collision with legacy LCS.

### Contract Integrity

- **AC-004:** Framework artifact/workflow/lifecycle/skill/overlay contracts have canonical machine-readable definitions.
- **AC-005:** Automated validation detects drift between canonical contracts and generated/runtime expectations.
- **AC-006:** Task execution status and artifact lifecycle status cannot silently share an incompatible status vocabulary.

### Artifact Authority

- **AC-007:** `prd.md` is the only canonical PRD.
- **AC-008:** PRD review uses a separate review artifact.
- **AC-009:** Canonical and derived artifact types are distinguishable programmatically.
- **AC-010:** Derived traceability/coverage can be regenerated from canonical structured relationships.

### Runtime State & Concurrency

- **AC-011:** Dynamic task state can change without rewriting canonical task Markdown.
- **AC-012:** Concurrent claim attempts result in at most one active owner.
- **AC-013:** Expired ownership is detectable and recoverable.
- **AC-014:** Artifact lifecycle and task execution lifecycle are represented separately.

### Adaptive Workflow & Autonomy

- **AC-015:** Simple low-risk work may follow a shorter pipeline than complex/high-risk work.
- **AC-016:** Low-complexity high-risk work can still require deeper review/specification.
- **AC-017:** Scoped bugs can use a fast lane.
- **AC-018:** Ambiguous bugs can escalate into planning without losing evidence.
- **AC-019:** Complete AFK tasks execute without routine interaction prompts.
- **AC-020:** Recoverable implementation failure can self-correct within bounded retries.
- **AC-021:** Retry exhaustion escalates rather than loops indefinitely.
- **AC-022:** Specification ambiguity/credentials are not treated as normal code-retry failures.
- **AC-023:** HITL stops only when human authority is actually required.

### Dependency & Conflict Safety

- **AC-024:** Incomplete dependencies block dependent tasks.
- **AC-025:** Unknown dependencies fail validation.
- **AC-026:** Overlapping write scopes are detectable as conflicts.
- **AC-027:** Write-scope expansion is recorded.
- **AC-028:** Excessive blast radius can trigger escalation/reslicing.

### Context & Freshness

- **AC-029:** A worker can receive task-specific relevant context without reading all work-item artifacts.
- **AC-030:** Context Capsules identify their canonical sources.
- **AC-031:** Upstream changes can make old capsules/derived artifacts detectable as stale.
- **AC-032:** Context Capsules never override canonical sources.

### Verification & Review

- **AC-033:** Task Gate can run targeted checks.
- **AC-034:** Work-item completion can run a broader gate.
- **AC-035:** Verified project commands can be reused across fresh sessions.
- **AC-036:** Code review can emit stable `FIX-###` findings.
- **AC-037:** Executor can consume a selected `FIX-###` directly.
- **AC-038:** Fixed work returns to review.

### Legacy Runtime Isolation & Artifact Import

- **AC-039:** Existing `.lcs/` runtime state does not alter LCS3 runtime behavior.
- **AC-040:** Eligible legacy docs/archive material can be imported while preserving original content.
- **AC-041:** Imported legacy material is clearly reference-only.
- **AC-042:** LCS3 can build a searchable index over eligible imported material.

### Quality, Memory, Telemetry, Doctor

- **AC-043:** Quality Overlay selection can differ by task concern.
- **AC-044:** Non-UI tasks do not automatically load `ui-quality`.
- **AC-045:** Native quality rules operate without network access to Anti-Slop.
- **AC-046:** Initial registry exposes `ui-quality`, `code-quality`, `security-basic`.
- **AC-047:** Memory entries can record source, confidence, and freshness.
- **AC-048:** Canonical/repository evidence overrides conflicting memory.
- **AC-049:** Stale or contradicted memory is detectable.
- **AC-050:** Local telemetry records execution outcome plus useful efficiency/failure measures.
- **AC-051:** Telemetry cannot silently rewrite framework contracts.
- **AC-052:** Self-improvement output is an explicit proposal.
- **AC-053:** Doctor detects representative state/dependency/lifecycle/freshness/coverage problems.
- **AC-054:** CI/test execution includes validator regression tests.
- **AC-055:** Required end-to-end scenario families are covered.
- **AC-056:** Contract/template mismatch can fail automated validation.

### Skill Architecture & Legacy Migration

- **AC-057:** Stateful skill operations invoke runtime functionality rather than manually mutating state through prompt instructions.
- **AC-058:** LCS3 skill entrypoints do not duplicate the full framework contract.
- **AC-059:** Conditional references and Quality Overlays load only when relevant.
- **AC-060:** The development repository can expose the legacy LCS source in a clearly marked read-only reference area without making it part of LCS3 runtime state or canonical architecture.
- **AC-061:** A complete Legacy Skill Migration Matrix exists before implementation of the LCS3 skill family begins.
- **AC-062:** Every legacy skill appears exactly once in the migration matrix with one explicit disposition: REWRITE, MERGE, DROP, or REPLACED_BY_RUNTIME.
- **AC-063:** Every retained/reworked legacy skill records target LCS3 capability, preserved behavior, removed legacy mechanics, runtime dependencies, and workflow relationships.
- **AC-064:** Task slicing for the skill family can trace each planned LCS3 skill/capability back to the approved migration matrix or to an explicit new requirement.
- **AC-065:** Coding-agent changes that modify the read-only legacy reference or copy legacy `.lcs/` contracts into LCS3 are rejected by review/validation.

## 14. Test Strategy & Testing Decisions

### Primary Seam

The primary test seam is the public `lcs3` runtime/CLI plus machine-readable contracts.

### Unit Tests

Cover:

- manifest parsing/validation;
- IDs and lifecycle transitions;
- dependency/conflict logic;
- claims/leases/retries;
- provenance/freshness;
- context selection;
- overlay matching;
- memory precedence;
- telemetry serialization;
- migration-matrix schema/coverage validation.

### Integration Tests

Cover:

- CLI + filesystem;
- CLI + SQLite;
- initialization;
- artifact writes/validation;
- task claim/release;
- concurrent claims;
- context generation;
- Doctor;
- legacy docs/archive import;
- read-only legacy reference guardrails;
- migration-matrix completeness checks.

### End-to-End Scenarios

At minimum:

1. simple feature;
2. complex feature;
3. bug fast lane;
4. AFK;
5. HITL;
6. multi-workitem;
7. multi-worker;
8. blocked dependency;
9. write conflict;
10. review -> fix -> review;
11. stale derived artifact;
12. retry exhaustion;
13. finalization;
14. attempted premature skill generation before migration-matrix approval;
15. attempted legacy contract leakage into new skills.

## 15. Risks & Assumptions

### Risks

- Scope breadth may cause a big-bang rewrite unless implementation is staged.
- Coding agents may over-copy legacy implementation rather than preserve behavior selectively.
- A read-only reference directory can still create context noise if agents load it wholesale.
- The migration matrix could become stale if legacy reference changes after inventory; the matrix should record the inspected legacy revision/commit.
- SQLite may accidentally become hidden canonical storage unless boundaries remain explicit.
- Quality Overlay rules may recreate prompt bloat if selection is weak.
- Memory without freshness may create context poisoning.
- Multi-worker claims/leases require transactional correctness.

### Assumptions

- Node.js/TypeScript is accepted for the runtime. [verified]
- SQLite is accepted for dynamic execution state. [verified]
- LCS3 is a new repository with no backward compatibility requirement. [verified]
- `.lcs3/` is the project-managed root. [verified]
- Legacy LCS source may be kept inside or referenced by the LCS3 development repository as read-only material. [verified]
- Skill inventory must be explicitly mapped before implementation. [verified]
- LCS3 is local-first and does not require a remote runtime service. [unverified]
- Exact artifact-format standard remains unresolved. [unverified]

## 16. Open Questions

### Must Resolve Before SRS / Skill-Family Design

1. What is the complete Legacy Skill Migration Matrix for the actual legacy repository revision used as reference?
2. Which legacy skills become LCS3 skills versus runtime commands/capabilities?
3. Which legacy skills are merged or intentionally dropped?
4. Does LCS3 define its own artifact format or retain any explicit OKF compatibility claim?

### Must Resolve Before Runtime Implementation

5. Exact `.lcs3/` directory structure.
6. Exact manifest files/schema.
7. Canonical workflow phase names and legal transitions.
8. Exact task execution lifecycle states.
9. SQLite tables, indexes, transaction boundaries, lease/heartbeat semantics.
10. Final `lcs3` command surface.
11. Runtime recovery strategy if SQLite state is missing/corrupt.

### Can Be Resolved During Later Technical Design

12. Context Capsule schema/default context budgets.
13. Detailed rules for `ui-quality`, `code-quality`, `security-basic`.
14. Telemetry fields and retention policy.
15. ADR-promotion thresholds.
16. CLI/skill packaging and distribution refinements.

## 17. Review Notes

- Last Reviewed: not yet reviewed
- Summary: Revised after explicit decision to keep legacy LCS as a read-only implementation reference and to gate LCS3 skill-family implementation on a complete Legacy Skill Migration Matrix.
- Changes Applied:
  - added SRC-066 through SRC-069;
  - added read-only legacy source-reference requirement;
  - added mandatory skill migration matrix;
  - added migration-matrix acceptance criteria and tests;
  - split Open Questions by decision deadline;
  - clarified that coding agents must not invent the skill inventory.

## 18. Chain of Truth Report

### Level

Standard

### Sources Checked

- Final LCS3 Explore artifact from the current conversation.
- Original LCS3 PRD from the current conversation.
- Subsequent user decisions that legacy LCS should be retained as a development reference and that the PRD must be updated to prevent missing/invented skill coverage.

### Assumptions

- The exact legacy repository revision for the migration matrix will be pinned later. [unverified]
- The exact internal repository paths remain technical design. [unverified]

### Plan

1. Preserve SRC-001 through SRC-065 unchanged.
2. Add only requirements directly supported by the new user decision.
3. Make skill-inventory governance testable.
4. Keep unresolved design details explicit and deadline-classified.

### Actions Taken

- Preserved all previous source requirements.
- Added SRC-066 through SRC-069.
- Added read-only legacy reference and migration-matrix requirements.
- Added corresponding functional requirements, acceptance criteria, risks, testing, and implementation sequencing.

### Verification

- Existing IDs SRC-001 through SRC-065 preserved.
- New IDs begin at SRC-066.
- No backward compatibility requirement reintroduced.
- Legacy LCS remains non-canonical/read-only.
- Skill inventory is no longer left to coding-agent inference.

### Report

Confidence remains high at the product-requirement level. The major prior gap around legacy skill coverage is now explicitly controlled by a required migration matrix before skill-family implementation.

## Handoff

Next recommended skill: lcs-prd-reviewer (if installed)  
Next file to read: prd.md  
Current phase: prd  
Current confidence: high  
Blocking questions: Complete Legacy Skill Migration Matrix and artifact-format position must be resolved before SRS/skill-family design is considered final.  
Risks to carry forward: Legacy behavior can be lost or copied too mechanically if migration-matrix governance is weak; runtime/state/concurrency design remains broad and must be phased.  
Source of Truth Bundle: Final LCS3 Explore artifact; revised `prd.md`; project `AGENTS.md`  
Must Preserve IDs: SRC-001 through SRC-069  
Unresolved IDs: None  
Suggested next command: Inspect legacy LCS and build the complete Legacy Skill Migration Matrix, then review and harden `prd.md`.
