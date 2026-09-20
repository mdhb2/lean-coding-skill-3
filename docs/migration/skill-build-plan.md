---
title: "LCS3 Skill Build Plan (SKILL-001..018)"
artifact_type: skill-build-plan
status: draft
created: "2026-09-20"
updated: "2026-09-20"
source_matrix: "docs/migration/legacy-skill-matrix.md"
matrix_revision: "f35dd2629f4efcd204987bb99c3f13b82990f463"
matrix_status: "approved — GATE-01 2026-09-20"
depends: ["GATE-01", "GATE-05"]
owner: "CHEAP_WORKER"
covers_src: ["SRC-064", "SRC-065", "SRC-067", "SRC-068", "SRC-069"]
covers_ac: ["AC-057", "AC-058", "AC-059", "AC-060", "AC-061", "AC-062", "AC-063", "AC-064", "AC-065"]
---

# LCS3 Skill Build Plan — L3-049

## 0. Authority and gate note

- Authority: approved matrix `docs/migration/legacy-skill-matrix.md` §6 (exactly 18 skills), §9 (waves A–D), §8 (rewrite guardrails), §10 (per-skill acceptance).
- `GATE-01`: **APPROVED 2026-09-20** — 23 legacy skills: REWRITE 18 / MERGE 3 / REPLACED_BY_RUNTIME 2 / DROP 0.
- `GATE-05` (runtime public contract freeze, `docs/decisions/runtime-contract-freeze.md`): status **draft/proposal**, requires SMART_GATE freeze. This plan is executed per explicit owner instruction (`lanjur kerjakan semua task di Phase 6`) under `AGENTS.md` §2 precedence #1. SMART_GATE retro-approval of GATE-05 is still required; this plan does not silently bypass `AGENTS.md` §20.
- Frozen contract skills must call (proposal): path-string entry points only (`dbPath` / `projectRoot` / `manifestDir`); no raw `DatabaseSync` / SQL / `PRAGMA` in skill contracts; `StateTx` via `withTransaction` only; `SCHEMA_VERSION = 5`; 25 frozen modules; `src/index.ts` empty; exactly 18 skills in `skills.yaml`; overlays `ui-quality`, `code-quality`, `security-basic` selective only.
- Canonical skill registry: `.lcs3/manifests/skills.yaml` (exactly 18 `lcs3-*` + 5 `explicitly_not_skills`).
- Storage boundary: canonical `skills/` at repo root (post-GATE-05); `.lcs3/` holds manifests/state.db/memory/telemetry/imports/cache. `init.ts` `DIRS` has no `skills/` entry; `drift.test.ts` anchors `EXPECTED_SKILL_COUNT = 18`.

## 1. Disposition outcome (23/23 rows)

| Outcome | Rows |
|---|---|
| REWRITE → one new-skill task | MIG-002, MIG-003, MIG-005, MIG-006, MIG-007, MIG-008, MIG-009, MIG-010, MIG-013, MIG-014, MIG-015, MIG-016, MIG-018, MIG-019, MIG-020, MIG-021, MIG-022, MIG-023 (18) |
| MERGE → folded into target-skill task | MIG-001 (chain-of-truth → framework audit/reporting contract, cross-cutting, no standalone skill), MIG-004 (debug-ext → `lcs3-debug` report-only mode), MIG-012 (onboarding → `lcs3-codebase-doc` onboarding mode) |
| DROP → no task | none (DROP 0) |
| REPLACED_BY_RUNTIME → no skill task, runtime owns | MIG-011 (`lcs-new` → work-item create/register/select runtime ops), MIG-017 (`lcs-shared` → manifests + runtime contracts + minimal references) |

Every matrix row has exactly one downstream outcome. No `lcs3-chain-of-truth`, `lcs3-debug-ext`, `lcs3-new`, `lcs3-onboarding`, `lcs3-shared`, `lcs3-doctor`, `lcs3-context`, `lcs3-state`, `lcs3-trace`, `lcs3-init`, or `lcs3-memory` skill is created by this plan.

## 2. Common template for every SKILL-### task

**Owner:** CHEAP_WORKER
**Required inputs:** approved matrix row(s), relevant SRC/AC, runtime public contract (`docs/decisions/runtime-contract-freeze.md` + `.lcs3/manifests/*.yaml`), only the relevant legacy skill slice(s) under `reference/legacy-lcs/skills/`.
**Read scope:** target matrix row + relevant LCS3 contracts + one legacy skill family slice.
**Write scope:** one `skills/lcs3-*` directory only, unless an explicit shared-reference task exists.
**Must not touch:** `reference/legacy-lcs/`, unrelated skills, canonical runtime manifests unless the task explicitly owns them.

**Steps:**
1. Extract behavior to preserve from the matrix row (`Preserve`).
2. Identify mechanics explicitly marked for removal (`Remove / Redesign`).
3. Implement concise `SKILL.md` as control plane (SRC-064; AC-058).
4. Move conditional detail into references; deterministic mechanics must call the approved runtime interface (SRC-065; AC-057).
5. Remove legacy `.lcs/` paths/status/schema/state logic (AC-060; AC-065).
6. Add/update skill-specific validation/smoke fixtures.
7. Verify trigger description and workflow handoff (matrix `Workflow Relations` + §10).

**Done when:** preserved behavior passes task acceptance checks and no forbidden legacy mechanic remains (§10 minimum acceptance contract).
**Escalate when:** matrix row contradicts runtime contract, requires a new skill/capability, or needs architecture change.

**Universal guardrails (all SKILL tasks):** concise control plane (SRC-064); LLM vs deterministic split (SRC-065); no duplicated framework contract (AC-058); selective references/overlays only (AC-059); read-only legacy reference (AC-060); traceability to matrix row or explicit new SRC (AC-064); leakage rejected (AC-065).

## 3. Wave A — Planning / evidence (9 tasks)

### SKILL-001 — `lcs3-domain-modeling`
- Matrix: MIG-007 (REWRITE, `lcs-domain-modeling`).
- Preserve: ubiquitous language; glossary; naming clarification; edge-case scenarios; domain decision capture; ADR candidate discovery.
- Remove: legacy artifact path/state mechanics; duplicated common contract.
- Runtime deps: artifact writer/validator; ADR registry/promotion support; provenance.
- Handoff: standalone or detour from explore/PRD/SRS/master; returns clarified vocabulary/decisions.
- SRC: SRC-056, SRC-064, SRC-067, SRC-069. Overlays: none by default (selective only).

### SKILL-002 — `lcs3-research`
- Matrix: MIG-015 (REWRITE, `lcs-research`).
- Preserve: research against high-trust/primary sources; cited findings; focused technical answers; source evidence preserved.
- Remove: legacy artifact path/state mechanics; duplicated shared reporting contract.
- Runtime deps: artifact writer; provenance/source metadata; context retrieval.
- Handoff: detour from explore/debug/PRD/SRS/master; returns cited research artifact.
- SRC: SRC-032, SRC-035, SRC-064, SRC-067, SRC-069. Skill contract stays provider-agnostic.

### SKILL-003 — `lcs3-prototype`
- Matrix: MIG-014 (REWRITE, `lcs-prototype`).
- Preserve: throwaway proof-of-concept answering one design question; evidence + conclusion recorded; prototype never silently becomes production.
- Remove: legacy state/path writing; ambiguous cleanup; accidental production handoff.
- Runtime deps: sandbox/worktree metadata if available; artifact writer; provenance; verification recipe registry.
- Handoff: detour from explore/research/PRD/SRS; returns evidence/decision, not production code.
- SRC: SRC-032, SRC-035, SRC-064, SRC-067, SRC-069.

### SKILL-004 — `lcs3-codebase-doc`
- Matrix: MIG-003 (REWRITE, `lcs-codebase-doc`) + MIG-012 (MERGE, `lcs-onboarding` → `onboarding` mode).
- Preserve: repository-level architecture mapping; focused/deep modes; evidence-based docs; **plus** onboarding behavior — repo overview, setup/run/test instructions, entrypoints (as `onboarding` mode).
- Remove: legacy `.lcs/` output paths; duplicate onboarding output mechanics; free-form state writes; separate `lcs3-onboarding` identity.
- Runtime deps: repository evidence index; artifact writer/validator; provenance/freshness; optional context index; verification recipe discovery.
- Handoff: standalone or detour from master; can feed explore/PRD/SRS/context. Modes: `deep-map`, `onboarding` (matches `skills.yaml`).
- SRC: SRC-032, SRC-035, SRC-038, SRC-055, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-005 — `lcs3-explore`
- Matrix: MIG-008 (REWRITE, `lcs-explore`).
- Preserve: adaptive structured exploration; 3-question rounds; level selection; trade-offs; stable source decisions; PRD readiness; user decisions preserved.
- Remove: legacy work-item creation/state mutation in prompt; `.lcs/` paths; duplicated shared contract; LLM-allocated mechanical IDs.
- Runtime deps: work-item lookup/create API; source-ID allocator/validator; artifact writer/validator; context retrieval.
- Handoff: entry planning skill → `lcs3-toprd`; may detour to research/prototype/domain-modeling/wayfinder.
- SRC: SRC-005, SRC-007, SRC-009, SRC-015, SRC-032, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-006 — `lcs3-toprd`
- Matrix: MIG-020 (REWRITE, `lcs-toprd`).
- Preserve: lean implementation-focused PRD from explore/direct/debug requirements; stable SRC IDs preserved; AC/test strategy; affected areas; explicit open questions.
- Remove: legacy state/path mutation; speculative NFRs; duplicated common contract.
- Runtime deps: source-ID validation; artifact writer/validator; context retrieval; preservation checker.
- Handoff: explore/debug/direct → topPRD → PRD reviewer → SRS or slicer per adaptive route. Never invent missing normative NFRs.
- SRC: SRC-011, SRC-012, SRC-015, SRC-016, SRC-029, SRC-030, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-007 — `lcs3-prd-reviewer`
- Matrix: MIG-013 (REWRITE, `lcs-prd-reviewer`).
- Preserve: aggressive PRD hardening; ambiguity checks; AC/test/affected-area/security gaps; preservation review.
- Remove: `prd-enhanced.md` as second PRD; reviewer rewriting source IDs; legacy state/path mechanics.
- Runtime deps: artifact diff/validation; source/AC preservation checker; review artifact writer.
- Handoff: `lcs3-toprd` → reviewer → `prd-review.md`; approved changes applied to canonical `prd.md`; then SRS/slicer.
- SRC: SRC-011, SRC-012, SRC-037, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-008 — `lcs3-improve-architecture`
- Matrix: MIG-009 (REWRITE, `lcs-improve-architecture`).
- Preserve: current-architecture analysis; duplicated-concern discovery; unified target proposal; migration implications; visual/structured explanation.
- Remove: direct handoff to task slicing; speculative breakdown treated as executable; legacy paths/contracts.
- Runtime deps: repository evidence/context; artifact writer; provenance; optional dependency/affected-area analysis.
- Handoff: standalone or master detour → `lcs3-toprd`/SRS before slicing when work becomes implementation. Executable tasks must not bypass PRD/SRS gates.
- SRC: SRC-028, SRC-029, SRC-032, SRC-064, SRC-067, SRC-069.

### SKILL-009 — `lcs3-wayfinder`
- Matrix: MIG-022 (REWRITE, `lcs-wayfinder`).
- Preserve: huge/uncertain-work planning via shared map + decision tickets; blockers exposed; incremental navigation for huge refactors.
- Remove: legacy state/path mechanics; provisional map/tickets treated as executable task graph; duplicated common contract.
- Runtime deps: context selector; artifact writer; decision/ADR links; provenance; affected-area index.
- Handoff: optional detour from master/explore/architecture/SRS; returns map/decisions to canonical planning flow before slicing.
- SRC: SRC-028, SRC-029, SRC-032, SRC-056, SRC-064, SRC-067, SRC-069.

## 4. Wave B — Deterministic specification and task planning (2 tasks)

### SKILL-010 — `lcs3-tosrs`
- Matrix: MIG-021 (REWRITE, `lcs-tosrs`).
- Preserve: reviewed-PRD → deterministic implementation spec; FR/BR/VR/EC/AC mapping; security/performance/reliability/API/DB spec only when source-supported.
- Remove: invented default NFR targets (e.g. arbitrary latency numbers); legacy paths/state; duplicated schema mechanics.
- Runtime deps: artifact validation; stable ID mapping; context retrieval; repository evidence index; traceability generator.
- Handoff: reviewed PRD → SRS → slicer; optional research/prototype/domain-modeling detours. SRS may resolve technical design, never fabricate product constraints.
- SRC: SRC-015, SRC-016, SRC-029, SRC-032, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-011 — `lcs3-task-slicer`
- Matrix: MIG-019 (REWRITE, `lcs-task-slicer`).
- Preserve: small dependency-aware tracer-bullet tasks; AFK/HITL classification; present/validate breakdown; acceptance/test mapping.
- Remove: free-form IDs/dependencies; one-by-one-only writing ritual; legacy `.lcs/` path mechanics; prompt-duplicated task schema.
- Runtime deps: task ID allocator; task schema validator; dependency/conflict graph; scope metadata; coverage/traceability generator; runtime registry.
- Handoff: reviewed PRD or SRS → slicer → approved task graph → executor. Task schema/lifecycle follows GATE-03 contracts.
- SRC: SRC-015, SRC-024–SRC-030, SRC-037, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069. Modes: AFK/HITL per `tasks.yaml`.

## 5. Wave C — Execution / review / completion (5 tasks)

### SKILL-012 — `lcs3-task-executor`
- Matrix: MIG-018 (REWRITE, `lcs-task-executor`).
- Preserve: execute one approved task; implementation reasoning; seam discipline; targeted verification; explicit completion evidence; review-fix execution.
- Remove: user confirmation for Normal/TDD; manual dependency/state edits; unbounded retry; direct lease/state ownership; legacy `.lcs/` paths.
- Runtime deps: atomic claim/lease; dependency/conflict checks; context capsule; retry budget; failure taxonomy; verification registry; scope/blast-radius tracking; review-fix state.
- Handoff: task ready → executor → targeted gate → code review; `FIX-###` → executor → review; blockers → smart gate/HITL.
- SRC: SRC-020–SRC-028, SRC-032–SRC-039, SRC-064, SRC-065, SRC-067, SRC-069. Critical skill; needs stable ownership/context/verification APIs.

### SKILL-013 — `lcs3-debug`
- Matrix: MIG-005 (REWRITE, `lcs-debug`) + MIG-004 (MERGE, `lcs-debug-ext` → `report-only` mode).
- Preserve: disciplined investigation; evidence before fix; reproducibility; hypothesis narrowing; fix plan; bug fast-lane routing; **plus** report-only diagnosis — reproduce/characterize, ranked falsifiable hypotheses, instrumentation suggestions, patch/regression proposal without code mutation.
- Remove: one-question-at-a-time rigidity where not useful; legacy state/path mutation; `.lcs/`-tied auto-creation rules; separate `lcs3-debug-ext` identity; duplicate debugging contracts.
- Runtime deps: failure taxonomy; verification recipes; artifact validator; context selector; runtime work-item/task routing; evidence/provenance; artifact writer.
- Handoff: bug → debug; scoped/known fix → slicer/executor fast lane; ambiguity → explore/toprd; report-only may hand off to research/PRD/task execution. Modes: `normal`, `report-only` (matches `skills.yaml`).
- SRC: SRC-021, SRC-022, SRC-031, SRC-032, SRC-037, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-014 — `lcs3-code-review`
- Matrix: MIG-002 (REWRITE, `lcs-code-review`).
- Preserve: review implementation against requirements/artifacts; evidence-based findings; severity; actionable fix IDs; final pass/fail decision.
- Remove: legacy review asset/schema; manual state mutation; duplicated shared contract; disconnected `FIX` handoff.
- Runtime deps: context selector; artifact validator; verification registry; review-fix state/IDs; task/work-item state.
- Handoff: `lcs3-task-executor` → review → `FIX-###` → executor → review; pass → finalization. Overlays: `code-quality` (+ `security-basic` when security-relevant), selective only.
- SRC: SRC-037, SRC-039, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-015 — `lcs3-doc-finalizer`
- Matrix: MIG-006 (REWRITE, `lcs-doc-finalizer`).
- Preserve: final canonical documentation synthesis; work summary/map; completion evidence; commit/PR recommendation.
- Remove: direct manual folder moves/deletes; legacy `.lcs/docs` + `.lcs/archive` mechanics; non-atomic finalization; duplicated state writes.
- Runtime deps: finalization/archive transaction; state/lifecycle validation; full verification gate; traceability/coverage generator; provenance.
- Handoff: review PASS + final gate → finalizer → runtime archive/finalize → completed work-item.
- SRC: SRC-013, SRC-014, SRC-037, SRC-040, SRC-060, SRC-061, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-016 — `lcs3-wizard`
- Matrix: MIG-023 (REWRITE, `lcs-wizard`).
- Preserve: interactive scripts/procedures for genuinely manual/HITL operations (setup, deployment, migrations); checkpoints + rollback guidance.
- Remove: assumption generated script should auto-run; legacy paths/state; duplicated common contract.
- Runtime deps: HITL gate metadata; verification recipe registry; optional artifact writer; `security-basic` overlay (selective).
- Handoff: standalone/HITL detour from executor or ops task; generated procedure stays reviewable before execution; never auto-executes.
- SRC: SRC-023, SRC-037, SRC-049, SRC-050, SRC-051, SRC-064, SRC-067, SRC-069.

## 6. Wave D — Governance / meta (2 tasks)

### SKILL-017 — `lcs3-self-improvement`
- Matrix: MIG-016 (REWRITE, `lcs-self-improvement`).
- Preserve: friction/success pattern analysis; deduplicated recommendations; rules/docs/skills cross-reference; reviewable improvement proposals only.
- Remove: any auto-apply capability; legacy paths/contracts; unbounded introspection/context sweep.
- Runtime deps: telemetry query; memory query; artifact writer; provenance; proposal IDs; optional Doctor evidence.
- Handoff: explicit trigger or evidence threshold → proposal → explicit review/ADR/task; never auto-apply. Recommendation-only.
- SRC: SRC-052–SRC-055, SRC-057–SRC-059, SRC-064, SRC-065, SRC-067, SRC-069.

### SKILL-018 — `lcs3-master`
- Matrix: MIG-010 (REWRITE, `lcs-master`). Implement LAST.
- Preserve: single contextual entry/router; on-ramps; rich routing guidance; multi-workitem awareness; confirmation/autopilot concepts; research/prototype/wayfinder detours.
- Remove: embedded stale state schema; hardcoded duplicated skill inventory/contracts; manual state mutation; excessive stops; legacy 21-skill assumptions.
- Runtime deps: workflow manifest/router; active-work registry; risk/complexity classifier; state API; context selector; skill registry; gates.
- Handoff: top-level router over the actual approved registry (`skills.yaml`, matrix §6) and runtime capabilities. Must consume the canonical registry, never embed a duplicated skill list/schema.
- SRC: SRC-009, SRC-020, SRC-023, SRC-029, SRC-030, SRC-032, SRC-063, SRC-064, SRC-065, SRC-067, SRC-068, SRC-069.

## 7. Cross-cutting: MIG-001 framework contract (no SKILL task)

- MIG-001 (`lcs-chain-of-truth`, MERGE): no standalone `lcs3-chain-of-truth` skill. Behavior (auditable evidence chain; sources checked; assumptions; verification; concise evidence report) becomes the framework audit/reporting contract consumed by all `lcs3-*` skills + runtime verification (artifact schema/validation; provenance; generated evidence metadata). Each SKILL-001..018 task must include the evidence-report slice; L3-050 checks no standalone chain-of-truth skill exists and no duplicated report contract is embedded per-skill.

## 8. Runtime-replaced rows (no SKILL tasks; pointer only)

- MIG-011 (`lcs-new` → REPLACED_BY_RUNTIME): covered by runtime work-item create/register/select operations (no `lcs3-new` skill). Skills needing a new work-item call the runtime; they do not implement registration reasoning.
- MIG-017 (`lcs-shared` → REPLACED_BY_RUNTIME): covered by framework manifests + runtime contracts + minimal reusable references (no `lcs3-shared` skill). Skills consume only relevant generated/reference slices; they do not duplicate the canonical contract.

## 9. Coverage check (AC-061..AC-064)

- 23/23 legacy skills appear exactly once with one disposition (AC-062).
- 18 planned skills = matrix §6 inventory 1:1 (AC-061, AC-064); `skills.yaml` 18-skill anchor agrees.
- MERGE sources trace to target tasks: MIG-004 → SKILL-013; MIG-012 → SKILL-004; MIG-001 → cross-cutting §7 (AC-063, AC-064).
- Runtime-replaced rows trace to runtime capabilities, not skills (AC-064).
- DROP 0: no behavior intentionally removed; nothing to record beyond this section.

## 10. L3-050 validation hooks (AC-057..AC-065)

L3-050 must prove: every §6 target exists exactly once; the 5 explicitly-not-skills are absent; stateful ops call runtime (AC-057); no duplicated framework contract (AC-058); selective references/overlays (AC-059); legacy reference untouched (AC-060); matrix completeness + row fields + traceability (AC-061..AC-064); `.lcs/` leakage scan rejects forbidden contracts (AC-065).
