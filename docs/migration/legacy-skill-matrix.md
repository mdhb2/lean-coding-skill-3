---
title: "LCS3 Legacy Skill Migration Matrix"
artifact_type: legacy-skill-migration-matrix
status: approved
created: "2026-09-20"
updated: "2026-09-20"
legacy_repository: "mdhb2/lean-coding-skills"
legacy_branch: "master"
legacy_revision: "f35dd2629f4efcd204987bb99c3f13b82990f463"
source_prd: "prd.md v1.1"
approval_gate: "GATE-01"
requires_approval: true
---

# LCS3 Legacy Skill Migration Matrix

## 1. Purpose

This artifact is the authoritative **proposed** mapping from the legacy LCS skill family to the initial LCS3 skill/capability boundary.

It exists to satisfy `SRC-067` through `SRC-069` and `AC-061` through `AC-064` in `prd.md`, and the Mandatory Legacy Skill Migration Matrix rule in `AGENTS.md`.

Until `GATE-01` is approved, this matrix is a **design proposal**. Coding agents may inspect it and prepare evidence, but must not begin bulk implementation of the `lcs3-*` skill family.

## 2. Legacy Source Pin

The legacy inventory was verified against:

- Repository: `mdhb2/lean-coding-skills`
- Branch: `master`
- Commit: `f35dd2629f4efcd204987bb99c3f13b82990f463`
- Commit date: `2026-09-17T10:50:12Z`
- Legacy skill entrypoints found: **23**

All 23 legacy skill directories are mapped exactly once below.

## 3. Disposition Semantics

- `REWRITE` — preserve valuable user-visible behavior, but implement a new LCS3 skill against LCS3 contracts and runtime boundaries.
- `MERGE` — preserve behavior by combining it into another LCS3 skill/framework capability; do not create a separate target skill unless later approved.
- `DROP` — intentionally remove the behavior from LCS3. Requires explicit rationale and approval because functionality is lost.
- `REPLACED_BY_RUNTIME` — no reasoning skill should remain; deterministic mechanics move to the `lcs3` runtime/manifests/CLI.

## 4. Migration Matrix

| MIG ID | Legacy Skill | LCS3 Target | Disposition | Preserve | Remove / Redesign | Deterministic Runtime Dependencies | Workflow Relations | Supporting SRC | Review Uncertainty |
|---|---|---|---|---|---|---|---|---|---|
| MIG-001 | `lcs-chain-of-truth` | Framework audit/reporting contract used by all `lcs3-*` skills | MERGE | Auditable evidence chain; sources checked; assumptions; verification; concise evidence report; no hidden chain-of-thought | Standalone meta-skill identity; duplicated report instructions in every skill; legacy `.lcs/` paths | artifact schema/validation; provenance; generated evidence metadata | Cross-cutting across all skills and runtime verification | SRC-009, SRC-010, SRC-013, SRC-014, SRC-035, SRC-064, SRC-065, SRC-067, SRC-069 | Approve final report name/schema during artifact-format gate; no standalone `lcs3-chain-of-truth` by default |
| MIG-002 | `lcs-code-review` | `lcs3-code-review` | REWRITE | Review implementation against requirements/artifacts; evidence-based findings; severity; actionable fix IDs; final pass/fail decision | Legacy review asset/schema; manual state mutation; duplicated shared contract; disconnected `FIX` handoff | context selector; artifact validator; verification registry; review-fix state/IDs; task/work-item state | `lcs3-task-executor` -> `lcs3-code-review` -> `FIX-###` -> executor -> review; pass -> finalization | SRC-037, SRC-039, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069 | Exact review artifact schema waits for artifact-format/lifecycle gates |
| MIG-003 | `lcs-codebase-doc` | `lcs3-codebase-doc` | REWRITE | Repository-level architecture mapping; codebase understanding; focused/deep modes; evidence-based documentation | Legacy `.lcs/` output paths; duplicate onboarding output mechanics; free-form state writes | repository evidence index; artifact writer/validator; provenance/freshness; optional context index | Standalone or detour from `lcs3-master`; can feed explore/PRD/SRS/context | SRC-032, SRC-035, SRC-038, SRC-064, SRC-065, SRC-067, SRC-069 | Target also absorbs onboarding behavior from MIG-012 |
| MIG-004 | `lcs-debug-ext` | `lcs3-debug` mode: `report-only` | MERGE | Report-only diagnosis; reproduce/characterize; ranked falsifiable hypotheses; instrumentation suggestions; patch/regression proposal without code mutation | Separate skill identity; duplicate debugging contracts; legacy report paths | evidence/provenance; verification recipes; artifact writer; failure taxonomy | Invoked as `lcs3-debug` report-only mode; may hand off to research, PRD, or task execution | SRC-021, SRC-022, SRC-031, SRC-064, SRC-067, SRC-069 | No separate `lcs3-debug-ext`; mode contract to be finalized in skill SRS |
| MIG-005 | `lcs-debug` | `lcs3-debug` | REWRITE | Disciplined bug investigation; evidence before fix; reproducibility; hypothesis narrowing; fix plan; bug fast-lane routing | One-question-at-a-time rigidity where not useful; legacy state/path mutation; automatic creation rules tied to `.lcs/` | failure taxonomy; verification recipes; artifact validator; context selector; runtime work-item/task routing | Bug -> debug; scoped/known fix -> slicer/executor fast lane; requirement ambiguity -> explore/toprd | SRC-021, SRC-022, SRC-031, SRC-032, SRC-037, SRC-064, SRC-065, SRC-067, SRC-069 | Merge report-only mode from MIG-004 |
| MIG-006 | `lcs-doc-finalizer` | `lcs3-doc-finalizer` | REWRITE | Synthesize final canonical documentation; work summary/map; completion evidence; commit/PR recommendation | Direct manual folder moves/deletes; legacy `.lcs/docs` and `.lcs/archive` mechanics; non-atomic finalization; duplicated state writes | finalization/archive transaction; state/lifecycle validation; full verification gate; traceability/coverage generator; provenance | Review PASS + final gate -> finalizer -> runtime archive/finalize -> completed work-item | SRC-013, SRC-014, SRC-037, SRC-040, SRC-060, SRC-061, SRC-064, SRC-065, SRC-067, SRC-069 | Exact final artifact set waits for artifact-format gate |
| MIG-007 | `lcs-domain-modeling` | `lcs3-domain-modeling` | REWRITE | Ubiquitous language; glossary; naming clarification; edge-case scenarios; domain decision capture; ADR candidate discovery | Legacy artifact path/state mechanics; any duplicated common contract | artifact writer/validator; ADR registry/promotion support; provenance | Standalone or detour from explore/PRD/SRS/master; returns clarified vocabulary/decisions | SRC-056, SRC-064, SRC-067, SRC-069 | Exact glossary/ADR artifact names deferred to artifact-format gate |
| MIG-008 | `lcs-explore` | `lcs3-explore` | REWRITE | Adaptive structured exploration; 3-question rounds; level selection; trade-offs; stable source decisions; PRD readiness; preserve user decisions | Legacy work-item creation/state mutation in prompt; `.lcs/` paths; duplicated shared contract; mechanical ID allocation by LLM | work-item lookup/create API; source-ID allocator/validator; artifact writer/validator; context retrieval | Entry planning skill -> `lcs3-toprd`; may detour to research/prototype/domain-modeling/wayfinder | SRC-005, SRC-007, SRC-009, SRC-015, SRC-032, SRC-064, SRC-065, SRC-067, SRC-069 | Behavior already well-defined; runtime API names wait for GATE-05 |
| MIG-009 | `lcs-improve-architecture` | `lcs3-improve-architecture` | REWRITE | Analyze current architecture; find duplicated concerns; propose unified target architecture; migration implications; visual/structured explanation | Direct handoff to task slicing from architecture analysis; speculative task breakdown treated as executable; legacy paths/contracts | repository evidence/context; artifact writer; provenance; optional dependency/affected-area analysis | Standalone or master detour -> **`lcs3-toprd`/SRS before slicing** when architectural changes become implementation work | SRC-028, SRC-029, SRC-032, SRC-064, SRC-067, SRC-069 | Preserve analysis; executable tasks must not bypass PRD/SRS gates |
| MIG-010 | `lcs-master` | `lcs3-master` | REWRITE | Single contextual entry/router; on-ramps; rich routing guidance; multi-workitem awareness; confirmation/autopilot concepts; research/prototype/wayfinder detours | Embedded stale state schema; hardcoded duplicated skill inventory/contracts; manual state mutation; excessive stops; legacy 21-skill assumptions | workflow manifest/router; active-work registry; risk/complexity classifier; state API; context selector; skill registry; gates | Top-level router over approved LCS3 skill registry and runtime capabilities | SRC-009, SRC-020, SRC-023, SRC-029, SRC-030, SRC-032, SRC-063, SRC-064, SRC-065, SRC-067, SRC-068, SRC-069 | Must be implemented late, after registry/workflow contracts stabilize |
| MIG-011 | `lcs-new` | Runtime capability: work-item create/register/select operations | REPLACED_BY_RUNTIME | Ability to create/register a blank work-item; multi-workitem registration; deterministic selection behavior | Standalone reasoning skill; manual timestamp/ID/state edits; contradictory selection behavior | work-item registry; ID allocator; state transaction; CLI/API | Called by master/planning skills when a new work-item is needed; no standalone skill | SRC-005, SRC-007, SRC-015, SRC-017, SRC-018, SRC-065, SRC-067, SRC-069 | Exact CLI command and default select/no-select semantics resolved by runtime contract gate |
| MIG-012 | `lcs-onboarding` | `lcs3-codebase-doc` mode: `onboarding` | MERGE | Developer-friendly repo overview; setup/run/test instructions; entrypoints; architecture summary; read-only repository discovery | Separate skill duplicating repository scan/document mechanics; legacy onboarding file paths | repository evidence index; verification recipe discovery; artifact writer; provenance | `lcs3-codebase-doc --mode onboarding` conceptually; can feed memory/context/planning | SRC-032, SRC-038, SRC-055, SRC-064, SRC-067, SRC-069 | No separate `lcs3-onboarding`; exact mode interface waits for skill design |
| MIG-013 | `lcs-prd-reviewer` | `lcs3-prd-reviewer` | REWRITE | Aggressive PRD hardening; ambiguity checks; AC/test/affected-area/security gaps; preservation review | `prd-enhanced.md` as second PRD; reviewer rewriting source IDs; legacy state/path mechanics | artifact diff/validation; source/AC preservation checker; review artifact writer | `lcs3-toprd` -> reviewer -> `prd-review.md`; approved changes applied to canonical `prd.md`; then SRS/slicer | SRC-011, SRC-012, SRC-037, SRC-064, SRC-065, SRC-067, SRC-069 | Must enforce canonical `prd.md`; reviewer artifact format waits for artifact gate |
| MIG-014 | `lcs-prototype` | `lcs3-prototype` | REWRITE | Throwaway proof-of-concept to answer a specific design question; record evidence and conclusion; prevent prototype from silently becoming production | Legacy state/path writing; ambiguous cleanup mechanics; accidental production handoff | sandbox/worktree metadata if available; artifact writer; provenance; verification recipe registry | Detour from explore/research/PRD/SRS; returns evidence/decision, not production code | SRC-032, SRC-035, SRC-064, SRC-067, SRC-069 | Exact isolation mechanism is technical design; behavior remains a skill |
| MIG-015 | `lcs-research` | `lcs3-research` | REWRITE | Research against high-trust/primary sources; cited findings; answer focused technical questions; preserve source evidence | Legacy artifact path/state mechanics; duplicated shared reporting contract | artifact writer; provenance/source metadata; context retrieval | Detour from explore/debug/PRD/SRS/master; returns cited research artifact | SRC-032, SRC-035, SRC-064, SRC-067, SRC-069 | External-source tooling is adapter-specific; skill contract should stay provider-agnostic |
| MIG-016 | `lcs-self-improvement` | `lcs3-self-improvement` | REWRITE | Analyze friction/success patterns; deduplicate recommendations; cross-reference rules/docs/skills; produce reviewable improvement proposals only | Any ability to apply changes automatically; legacy paths/contracts; unbounded introspection/context sweep | telemetry query; memory query; artifact writer; provenance; proposal IDs; optional Doctor evidence | Triggered explicitly or after evidence thresholds; proposal -> explicit review/ADR/task, never auto-apply | SRC-052, SRC-053, SRC-054, SRC-055, SRC-057, SRC-058, SRC-059, SRC-064, SRC-065, SRC-067, SRC-069 | Must remain recommendation-only; automatic trigger policy can be separate design |
| MIG-017 | `lcs-shared` | Framework manifests + runtime contracts + minimal reusable references | REPLACED_BY_RUNTIME | Shared naming/paths/contract intent; reusable artifact semantics; stable IDs; writing safety; common handoff concepts | Monolithic shared prompt contract; duplicated rules loaded into many skills; legacy `.lcs/` schema/path assumptions | canonical manifest registry; artifact schemas; lifecycle schemas; skill registry; validation; config | Framework-wide dependency; skills consume only relevant generated/reference slices | SRC-009, SRC-010, SRC-013, SRC-015, SRC-019, SRC-063, SRC-064, SRC-065, SRC-067, SRC-069 | Some explanatory references may remain, but there is no standalone `lcs3-shared` skill |
| MIG-018 | `lcs-task-executor` | `lcs3-task-executor` | REWRITE | Execute one approved task; implementation reasoning; seam discipline; targeted verification; explicit completion evidence; review-fix execution | User confirmation for Normal/TDD; manual dependency/state status edits; unbounded retry; direct lease/state ownership; legacy `.lcs/` paths | atomic claim/lease; dependency/conflict checks; context capsule; retry budget; failure taxonomy; verification registry; scope/blast-radius tracking; review-fix state | Task ready -> executor -> targeted gate -> code review; `FIX-###` -> executor -> review; blockers -> smart gate/HITL | SRC-020 through SRC-028, SRC-032 through SRC-039, SRC-064, SRC-065, SRC-067, SRC-069 | Critical skill; do not implement until runtime ownership/context/verification APIs are stable |
| MIG-019 | `lcs-task-slicer` | `lcs3-task-slicer` | REWRITE | Small dependency-aware tracer-bullet tasks; AFK/HITL classification; present/validate breakdown; acceptance/test mapping | Free-form IDs/dependencies; writing tasks one-by-one only for safety; legacy `.lcs/` path mechanics; task schema duplicated in prompt | task ID allocator; task schema validator; dependency/conflict graph; scope metadata; coverage/traceability generator; runtime registry | Reviewed PRD or SRS -> slicer -> approved task graph -> executor | SRC-015, SRC-024, SRC-025, SRC-026, SRC-027, SRC-028, SRC-029, SRC-030, SRC-037, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069 | Exact task schema/lifecycle must pass GATE-03 before skill implementation |
| MIG-020 | `lcs-toprd` | `lcs3-toprd` | REWRITE | Convert explore/direct/debug requirements into lean implementation-focused PRD; preserve stable SRC IDs; AC/test strategy; affected areas; unresolved questions | Legacy state/path mutation; speculative requirements/NFRs; duplicated common contract | source-ID validation; artifact writer/validator; context retrieval; preservation checker | Explore/debug/direct requirements -> topPRD -> PRD reviewer -> SRS or slicer per adaptive route | SRC-011, SRC-012, SRC-015, SRC-016, SRC-029, SRC-030, SRC-064, SRC-065, SRC-067, SRC-069 | Must never invent missing normative NFRs; open questions remain explicit |
| MIG-021 | `lcs-tosrs` | `lcs3-tosrs` | REWRITE | Transform reviewed PRD into deterministic implementation specification; FR/BR/VR/EC/AC mapping; security/performance/reliability/API/DB specification when source-supported | Invented default NFR targets (for example arbitrary latency numbers); legacy paths/state; duplicated schema mechanics | artifact validation; stable ID mapping; context retrieval; repository evidence index; traceability generator | Reviewed PRD -> SRS -> task slicer; optional research/prototype/domain-modeling detours | SRC-015, SRC-016, SRC-029, SRC-032, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069 | SRS may resolve technical design, but must not fabricate product constraints |
| MIG-022 | `lcs-wayfinder` | `lcs3-wayfinder` | REWRITE | Plan very large/uncertain work using shared map and decision tickets; expose blockers; incremental navigation for huge refactors | Legacy state/path mechanics; treating provisional map/tickets as executable task graph; duplicated common contract | context selector; artifact writer; decision/ADR links; provenance; affected-area index | Optional detour from master/explore/architecture/SRS for huge work; returns map/decisions to canonical planning flow before slicing | SRC-028, SRC-029, SRC-032, SRC-056, SRC-064, SRC-067, SRC-069 | Keep as distinct detour; executable tasks still require slicer/runtime validation |
| MIG-023 | `lcs-wizard` | `lcs3-wizard` | REWRITE | Generate interactive scripts/procedures for genuinely manual/HITL operations such as setup, deployment, migrations; clear checkpoints and rollback guidance | Unsafe assumption that generated script should auto-run; legacy paths/state; duplicated common contract | HITL gate metadata; verification recipe registry; optional artifact writer; security-basic overlay | Standalone/HITL detour from executor or ops task; generated procedure remains reviewable before execution | SRC-023, SRC-037, SRC-049, SRC-050, SRC-051, SRC-064, SRC-067, SRC-069 | Security boundaries and auto-execution prohibition should be explicit in skill SRS |

## 5. Coverage Check

Legacy skill count: **23**

Disposition count:

| Disposition | Count | Legacy Entries |
|---|---:|---|
| REWRITE | 18 | MIG-002, 003, 005-010, 013-016, 018-023 |
| MERGE | 3 | MIG-001, MIG-004, MIG-012 |
| REPLACED_BY_RUNTIME | 2 | MIG-011, MIG-017 |
| DROP | 0 | None |
| **TOTAL** | **23** | Complete |

No legacy entry is intentionally dropped in this proposal. Where a standalone skill disappears, its useful behavior is preserved in another skill, framework contract, or deterministic runtime capability.

## 6. Proposed Initial LCS3 Skill Family

If `GATE-01` approves the matrix without changing dispositions, the initial user-facing skill family is exactly **18 skills**:

| Target Skill | Legacy Source(s) | Role |
|---|---|---|
| `lcs3-master` | `lcs-master` | Contextual router/orchestrator; consumes canonical skill/workflow registry |
| `lcs3-explore` | `lcs-explore` | Requirements exploration and decision capture |
| `lcs3-toprd` | `lcs-toprd` | PRD authoring from approved source requirements |
| `lcs3-prd-reviewer` | `lcs-prd-reviewer` | PRD hardening/review; emits `prd-review.md` |
| `lcs3-tosrs` | `lcs-tosrs` | Deterministic implementation specification |
| `lcs3-task-slicer` | `lcs-task-slicer` | Guarded task graph creation |
| `lcs3-task-executor` | `lcs-task-executor` | Implementation reasoning/control over runtime-owned task execution |
| `lcs3-code-review` | `lcs-code-review` | Requirement-aware code review and `FIX-###` loop |
| `lcs3-debug` | `lcs-debug`, `lcs-debug-ext` | Debugging with normal and report-only modes |
| `lcs3-doc-finalizer` | `lcs-doc-finalizer` | Final documentation synthesis; runtime performs atomic finalization/archive |
| `lcs3-codebase-doc` | `lcs-codebase-doc`, `lcs-onboarding` | Repository documentation with deep-map and onboarding modes |
| `lcs3-domain-modeling` | `lcs-domain-modeling` | Ubiquitous language/domain model/ADR candidate work |
| `lcs3-improve-architecture` | `lcs-improve-architecture` | Architecture improvement analysis before canonical planning |
| `lcs3-research` | `lcs-research` | Primary/high-trust source research |
| `lcs3-prototype` | `lcs-prototype` | Throwaway proof-of-concept evidence |
| `lcs3-wayfinder` | `lcs-wayfinder` | Huge-work navigation and decision mapping |
| `lcs3-self-improvement` | `lcs-self-improvement` | Evidence-backed improvement proposals only |
| `lcs3-wizard` | `lcs-wizard` | HITL/manual procedure generation |

### Explicitly NOT separate skills after migration

The following names must **not** be created as standalone initial LCS3 skills unless a later approved requirement changes this matrix:

- `lcs3-chain-of-truth` — merged into framework audit/reporting contract.
- `lcs3-debug-ext` — merged into `lcs3-debug` report-only mode.
- `lcs3-new` — replaced by deterministic work-item runtime commands/API.
- `lcs3-onboarding` — merged into `lcs3-codebase-doc` onboarding mode.
- `lcs3-shared` — replaced by manifests/runtime contracts/minimal reusable references.

## 7. Runtime / Framework Capabilities That Are Not Skills

This matrix intentionally separates user-facing reasoning skills from deterministic mechanics. The following are framework/runtime capabilities, not standalone skills by default:

- project initialization (`lcs3 init` or approved equivalent);
- work-item create/register/select/switch;
- state lifecycle transitions;
- ID allocation;
- task claim/lease/heartbeat/release;
- dependency and conflict validation;
- artifact/schema validation;
- traceability and task-coverage generation;
- provenance/freshness checks;
- Context Capsule generation;
- verification recipe registry;
- Doctor/integrity checks;
- local telemetry persistence;
- canonical manifest/skill registry;
- shared audit/reporting schema.

Do **not** create skills such as `lcs3-doctor`, `lcs3-context`, `lcs3-state`, `lcs3-trace`, or `lcs3-init` merely because the runtime exposes those capabilities. A new user-facing skill requires an explicit approved requirement/design decision.

Project memory is currently a framework capability (`SRC-052` through `SRC-055`). This matrix does **not** authorize a standalone `lcs3-memory` skill. If a manual memory skill is desired, approve it separately and trace it to a new explicit design decision before implementation.

## 8. Cross-Cutting Rewrite Guardrails

Every `REWRITE` target must follow these rules:

1. Do not copy the legacy skill directory wholesale.
2. Inspect only the relevant legacy skill plus directly required references.
3. Preserve useful behavior explicitly; do not preserve legacy mechanics by default.
4. Replace `.lcs/` with LCS3 canonical paths/contracts only through approved runtime/artifact APIs; do not mechanical-search-replace paths.
5. Move IDs, lifecycle, state mutation, claims, leases, dependency checks, traceability, provenance, and similar mechanics into deterministic runtime capabilities where defined by the PRD.
6. Keep `SKILL.md` as a lean reasoning/control-plane entrypoint; conditional detail belongs in references.
7. Do not duplicate canonical manifests or runtime contracts inside skill prose.
8. Do not invent target skills outside Section 6 without an explicit approved requirement.
9. Preserve stable SRC/AC traceability in downstream skill artifacts.
10. A skill is not done until its relevant workflow scenario and acceptance criteria pass.

## 9. Skill Implementation Dependency Order

This is a dependency-oriented recommendation for task slicing, not a replacement for the runtime/SRS gates.

### Wave A — Planning / evidence skills

Can be designed after artifact contracts and minimal artifact runtime are approved:

- `lcs3-domain-modeling`
- `lcs3-research`
- `lcs3-prototype`
- `lcs3-codebase-doc`
- `lcs3-explore`
- `lcs3-toprd`
- `lcs3-prd-reviewer`
- `lcs3-improve-architecture`
- `lcs3-wayfinder`

### Wave B — Deterministic specification and task planning

Requires stable artifact IDs, workflow phases, task schema, and traceability contracts:

- `lcs3-tosrs`
- `lcs3-task-slicer`

### Wave C — Execution / review / completion

Requires stable runtime state, SQLite, claims/leases, failure taxonomy, context, verification, and review-fix mechanics:

- `lcs3-task-executor`
- `lcs3-debug`
- `lcs3-code-review`
- `lcs3-doc-finalizer`
- `lcs3-wizard`

### Wave D — Governance / meta

Implement after the registry, workflow engine, telemetry/memory interfaces, and most downstream skills are stable:

- `lcs3-self-improvement`
- `lcs3-master`

`lcs3-master` should be among the last skills implemented because it must route over the **actual approved registry**, not a hardcoded speculative inventory.

## 10. Minimum Acceptance Contract Per Target Skill

Before a generated `SKILL-###` implementation task can be marked complete, it must demonstrate all applicable items below:

- target skill name is listed in Section 6 or separately approved;
- legacy behavior listed under `Preserve` has an explicit test/scenario or artifact assertion;
- prohibited mechanics listed under `Remove / Redesign` are absent;
- deterministic runtime operations are invoked rather than reproduced in natural-language state-edit instructions;
- no `.lcs/` path/schema/status leaks into active LCS3 contracts;
- no duplicate shared contract is embedded in the skill;
- only relevant references/Quality Overlays are loaded;
- upstream/downstream handoffs match the approved workflow registry;
- required SRC/AC IDs remain traceable;
- smallest relevant verification passes before the broader workflow scenario.

## 11. GATE-01 Approval Checklist

A smart reviewer/HITL should mark this artifact `approved` only if all checks pass:

- [ ] 23/23 legacy skills appear exactly once.
- [ ] Every row has exactly one allowed disposition.
- [ ] No proposed target skill lacks a legacy mapping or explicit LCS3 requirement.
- [ ] No valuable legacy behavior is silently lost by MERGE/REPLACED_BY_RUNTIME decisions.
- [ ] `lcs3-debug-ext`, `lcs3-new`, `lcs3-onboarding`, `lcs3-shared`, and standalone `lcs3-chain-of-truth` are intentionally absent from the initial skill family.
- [ ] The 18-skill target inventory is accepted.
- [ ] `lcs3-improve-architecture` no longer bypasses canonical PRD/SRS planning before executable task slicing.
- [ ] `lcs3-prd-reviewer` no longer creates `prd-enhanced.md` as a second canonical PRD.
- [ ] `lcs3-task-executor` delegates state/lease/dependency/retry mechanics to runtime.
- [ ] `lcs3-master` consumes the canonical registry instead of embedding a duplicated skill list/schema.
- [ ] No standalone skill is created for deterministic runtime commands without an explicit later requirement.

## 12. Approval Record

Current status: **APPROVED — GATE-01 2026-09-20**

Approval authority: project owner / designated SMART_GATE.

On approval:

1. change frontmatter `status` from `proposed` to `approved`;
2. record approval date/reviewer below;
3. treat Section 6 as the authoritative initial LCS3 skill inventory for SRS/task slicing;
4. any later inventory change must update this artifact explicitly and record the rationale.

Approval date: 2026-09-20
Approved by: product owner (SMART_GATE GATE-01)
Notes: Approved as-is — 23 legacy skills REWRITE 18 / MERGE 3 / REPLACED_BY_RUNTIME 2 / DROP 0. Section 6 authoritative initial LCS3 skill inventory.

## 13. Traceability Summary

Primary governing requirements:

- `SRC-066` — legacy reference may exist but is non-canonical/read-only.
- `SRC-067` — every legacy skill must be classified exactly once.
- `SRC-068` — agents may not invent the LCS3 skill inventory from PRD wording alone.
- `SRC-069` — retained/reworked skills require target, preserve/remove, runtime dependencies, and workflow relationships.
- `AC-060` through `AC-065` — migration completeness, traceability, and legacy-contract leakage guardrails.

This matrix also operationalizes `AGENTS.md` Sections 3, 4, 5, 6, 8, 18, 19, and 20.
