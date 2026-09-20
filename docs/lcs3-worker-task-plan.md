# LCS3 Cheap-Worker Task Plan

Source baseline: latest `prd.md` (SRC-001..SRC-069, AC-001..AC-065) and project `AGENTS.md`.
Purpose: split LCS3 delivery into small, bounded tasks that can be executed safely by lower-cost coding workers while reserving architecture/product decisions for a Smart Gate (`Pintar`) or HITL.

## 1. Execution Model

Roles:

- `CHEAP_WORKER`: executes bounded research, documentation, coding, tests, or migrations. May not invent architecture.
- `SMART_GATE`: reviews proposals/contract changes and returns APPROVE / REVISE with explicit rationale. Does not perform broad implementation.
- `HITL`: only for owner-level decisions, destructive actions, credentials, licensing uncertainty, or unresolved product intent.

Default worker context pack:

1. `AGENTS.md`.
2. This task card only.
3. Exact PRD SRC/AC IDs listed on the task.
4. Canonical design/manifest files explicitly listed in `Read Scope`.
5. Only the relevant legacy skill/reference when the task explicitly requires legacy inspection.

Do not load the entire PRD, entire legacy repository, or unrelated task history into a cheap worker unless the task explicitly requires it.

## 2. Global Guardrails for Every CHEAP_WORKER Task

These are orchestration guardrails for building LCS3; they are not new LCS3 product requirements.

1. Never modify `reference/legacy-lcs/`.
2. Never copy legacy `.lcs/` paths, lifecycle enums, validators, state schemas, or shared-contract mechanics into LCS3 unless an approved design explicitly requires the behavior.
3. Do not make architecture/product decisions. If a missing decision blocks the task, stop with `BLOCKED_DECISION` and state the exact decision needed.
4. Stay inside `Write Scope`. If another file must change, stop with `SCOPE_EXPANSION_REQUEST` before modifying it.
5. No unrelated refactors, formatting sweeps, dependency upgrades, or package changes.
6. Do not add a production dependency unless the task explicitly allows it or a Smart Gate approved it.
7. Do not renumber or rewrite existing `SRC-###` or `AC-###` IDs.
8. Do not edit canonical manifests/contracts unless the task explicitly owns that contract.
9. Run every verification command listed in the task. Never claim PASS without command output/evidence.
10. For this build plan, allow at most 2 local repair cycles after verification failure. If still failing, return `BLOCKED_RETRY_EXHAUSTED` with evidence.
11. Default change budget: <= 6 files and <= 400 changed LOC unless the task explicitly overrides it.
12. No placeholder implementation (`TODO`, fake success, stub returning hard-coded pass) when the task claims completion.
13. Tests must verify observable behavior, not merely file existence.
14. If current repository evidence contradicts memory/reference material, current canonical LCS3 evidence wins.
15. Every task must end with the Worker Result Contract below.

### Worker Result Contract

```yaml
status: PASS | BLOCKED_DECISION | BLOCKED_ENV | BLOCKED_RETRY_EXHAUSTED | SCOPE_EXPANSION_REQUEST
summary: <one concise paragraph>
files_changed:
  - <path>
verification:
  - command: <exact command>
    result: PASS | FAIL
    evidence: <short output/result>
requirements_checked:
  - SRC-###
  - AC-###
assumptions: []
escalation: null | <exact question for Pintar/HITL>
```

## 3. Phase Gates

A later phase must not start until its required gate is approved.

| Gate | Required before | Authority |
|---|---|---|
| GATE-01 Legacy Skill Migration Matrix approved | Skill-family design/implementation | SMART_GATE + HITL only if product intent changes |
| GATE-02 Artifact format position approved | Canonical artifact/schema implementation | SMART_GATE |
| GATE-03 Workflow/task lifecycle contract approved | Runtime state-machine implementation | SMART_GATE |
| GATE-04 `.lcs3/` canonical/runtime/derived storage boundary approved | Runtime persistence + init implementation | SMART_GATE |
| GATE-05 Runtime public contract freeze | Broad skill-family implementation | SMART_GATE |

---

# Phase 0 - Pre-SRS / Decision Preparation

## L3-001 - Pin Legacy Reference Revision — DONE ✅ 2026-09-20

**Status:** PASS — `reference/README.md` pins source `https://github.com/mdhb2/lean-coding-skills` @ `f35dd26` (2026-09-17), vendored snapshot `reference/legacy-lcs/` (137 tracked files, no `.git`, no `.gitmodules`, no merged history); root has no `package.json`/`tsconfig.json` so reference is not build input
**Owner:** CHEAP_WORKER  
**Depends:** none  
**Covers:** SRC-041, SRC-042, SRC-043, SRC-066; AC-039, AC-060, AC-065

**Goal:** expose the legacy LCS repository under the approved read-only reference mechanism and record the exact revision used for analysis.

**Read Scope:** `AGENTS.md`, repository root config.  
**Write Scope:** reference metadata/config only; documentation recording legacy revision.  
**Must Not Touch:** files inside `reference/legacy-lcs/`.

**Steps:**
1. Configure the chosen reference mechanism without merging legacy history into active LCS3 source.
2. Record repository URL/source and exact commit/revision.
3. Add/verify ignore or submodule rules as appropriate.
4. Verify no legacy source is considered active build/runtime input.

**Done When:** the revision is reproducible and legacy reference is visibly read-only/non-canonical.

**Verify:** repository status is clean; reference revision can be printed; attempted LCS3 changes are outside legacy reference.

**Escalate:** licensing/provenance ambiguity or inability to expose reference read-only.

## L3-002 - Inventory Every Legacy Skill — DONE ✅ 2026-09-20

**Status:** PASS — `docs/migration/legacy-skill-inventory.md` 23 rows, `find ... | wc -l`==23 verified
**Owner:** CHEAP_WORKER  
**Depends:** L3-001 — DONE  
**Covers:** SRC-067, SRC-068, SRC-069; AC-061, AC-062

**Goal:** produce a factual inventory of every legacy skill at the pinned revision without deciding its LCS3 disposition.

**Read Scope:** only legacy skill entrypoints and direct metadata needed to identify each skill.  
**Write Scope:** `docs/migration/legacy-skill-inventory.md` (or approved equivalent).  
**Must Not Touch:** legacy reference.

**Required fields per skill:** legacy name, path, short purpose, direct workflow neighbors, obvious runtime/state assumptions, direct reference files.

**Done When:** every discovered legacy `SKILL.md` is represented exactly once and inventory count is reproducible from the pinned revision.

**Verify:** scripted/manual count of legacy entrypoints equals inventory rows.

**Escalate:** duplicate/ambiguous skill identity or hidden generated skills not represented by normal entrypoints.

## L3-003 - Draft Legacy Skill Migration Matrix — DONE ✅ 2026-09-20

**Status:** PASS — `docs/migration/legacy-skill-matrix.md` 23 MIG rows, 23/23 inventory ↔ matrix 1:1, dispositions REWRITE 18 / MERGE 3 / REPLACED_BY_RUNTIME 2 / DROP 0, no blank, every row SRC-traced
**Owner:** CHEAP_WORKER (proposal only)  
**Depends:** L3-002  
**Covers:** SRC-067, SRC-068, SRC-069; AC-061..AC-064

**Goal:** draft the migration matrix using only approved dispositions: `REWRITE`, `MERGE`, `DROP`, `REPLACED_BY_RUNTIME`.

**Read Scope:** legacy skill inventory, relevant PRD sections, `AGENTS.md`; inspect one legacy skill at a time when needed.  
**Write Scope:** `docs/migration/legacy-skill-matrix.md`.

**Required fields per row:**
- legacy skill;
- inspected revision;
- proposed LCS3 target capability/name;
- disposition;
- behavior to preserve;
- legacy mechanics to remove;
- runtime dependencies;
- upstream/downstream workflow relationships;
- supporting SRC IDs;
- uncertainty requiring review.

**Guardrail:** worker may propose dispositions but may not mark the matrix approved.

**Done When:** every inventory row maps exactly once and no target skill is invented without SRC evidence.

**Verify:** one-to-one coverage script/check between inventory and matrix; no blank disposition; no unreferenced target capability.

**Escalate:** behavior conflicts with PRD, unclear merge target, or product behavior would be dropped.

## GATE-01 - Approve Legacy Skill Migration Matrix — APPROVED ✅ 2026-09-20

**Owner:** SMART_GATE  
**Depends:** L3-003  
**Covers:** SRC-067..SRC-069; AC-061..AC-064

**Decision:** APPROVED as-is by product owner. 23 legacy skills (REWRITE 18 / MERGE 3 / REPLACED_BY_RUNTIME 2 / DROP 0) accepted from `docs/migration/legacy-skill-matrix.md`. Skill-family boundary confirmed.

## L3-004 - Artifact Format Decision Memo — DONE ✅ 2026-09-20

**Status:** PASS — `docs/decisions/artifact-format-options.md` (161 lines) options/compatibility/collision/validator/recommendation Option C OKF-compatible + LCS3 extensions; no manifest/schema change  
**Owner:** CHEAP_WORKER (proposal only)  
**Depends:** none  
**Covers:** SRC-013..SRC-016, SRC-019; PRD Open Question on artifact-format/OKF position

**Goal:** prepare a concise decision memo comparing an independent LCS3 artifact format versus explicit OKF compatibility.

**Read Scope:** PRD artifact requirements, latest approved LCS3 contracts, only relevant legacy schema examples.  
**Write Scope:** `docs/decisions/artifact-format-options.md`.

**Required output:** options, exact compatibility obligations, metadata collision risks, validator implications, recommendation with evidence.

**Guardrail:** do not change manifests/schemas.

**Verify:** memo explicitly addresses `type`, artifact status, task status, lifecycle separation, frontmatter requirements, and canonical/derived marking.

## GATE-02 - Approve Artifact Format Position — APPROVED ✅ 2026-09-20

**Owner:** SMART_GATE  
**Depends:** L3-004

**Decision:** APPROVED Option C — OKF-compatible core (`format_version: "okf/0.2"`) + LCS3 extensions (`artifact_type`, `cot_level`, `source`), per `docs/decisions/artifact-format-options.md` §5/§9. `artifact_type` sole canonical discriminator, `type` forbidden except `state` artifact, `status` (artifact lifecycle) split from `task_status` (execution). Frozen before artifact-schema coding.

## L3-005 - Draft Workflow Phase and Task Lifecycle Contract — DONE ✅ 2026-09-20

**Status:** PASS — `docs/decisions/lifecycle-contract-proposal.md` (237 lines) phase/state tables, transition matrix, illegal→terminal, review-fix loop, AFK/HITL gates; proposal only  
**Owner:** CHEAP_WORKER (proposal only)  
**Depends:** none  
**Covers:** SRC-019, SRC-020..SRC-031, SRC-039, SRC-060

**Goal:** propose exact workflow phase names, task execution states, artifact lifecycle states, and legal transitions.

**Write Scope:** `docs/decisions/lifecycle-contract-proposal.md`.

**Required output:** state tables, transition matrix, illegal transitions, terminal states, review-fix loop, AFK/HITL entry/exit points.

**Guardrail:** do not implement state machine yet.

**Verify:** every state has defined entry/exit rules; task and artifact status are separate; review-fix loop closes.

## GATE-03 - Approve Workflow/Task Lifecycle Contract — APPROVED ✅ 2026-09-20

**Owner:** SMART_GATE  
**Depends:** L3-005

**Decision:** APPROVED as-is per `docs/decisions/lifecycle-contract-proposal.md`. Three orthogonal state machines frozen: artifact `status` (4 states), task `task_status` (9+cancelled), work-item `status` (4 states) + `phase`. Transition matrix, illegal transitions, terminal states, review-fix loop, AFK/HITL entry/exit rules all frozen for manifest/runtime/test implementation.

## L3-006 - Draft `.lcs3/` Storage Boundary — DONE ✅ 2026-09-20

**Status:** PASS — `docs/architecture/storage-boundary-proposal.md` (126 lines) tree + 16-row authority table, one class per type, `.lcs/` never input; proposal only
**Owner:** CHEAP_WORKER (proposal only)  
**Depends:** GATE-02, GATE-03  
**Covers:** SRC-003, SRC-013, SRC-017, SRC-018, SRC-034, SRC-041, SRC-046, SRC-063

**Goal:** propose exact locations and authority class for canonical artifacts, config, generated data, runtime DB, imports, memory, telemetry, locks/temp data.

**Write Scope:** `docs/architecture/storage-boundary-proposal.md`.

**Required output:** directory tree + authority table (`canonical`, `runtime`, `derived`, `reference`).

**Guardrail:** do not create runtime code or assume unapproved recovery semantics.

**Verify:** every planned data type has exactly one authority class; `.lcs/` is never runtime input.

## GATE-04 - Approve `.lcs3/` Storage Boundary — APPROVED ✅ 2026-09-20

**Owner:** SMART_GATE  
**Depends:** L3-006

**Decision:** APPROVED as-is per `docs/architecture/storage-boundary-proposal.md`. Tree + 16-row authority table + 6 invariants frozen before persistence/init coding.

---

# Phase 1 - Repository Foundation and Canonical Contracts

## L3-007 - Bootstrap TypeScript Runtime Repository — DONE ✅ 2026-09-20

**Status:** PASS — `package.json` (node>=22, scripts build/typecheck/test/lint/format), `tsconfig.json` strict, `src/index.ts` placeholder, `test/bootstrap.test.ts` 1/1 pass, `eslint.config.mjs` strict, `.prettierrc`, `.gitignore`; `npm install` clean, `npm run typecheck`/`npm test`/`npm run lint` all exit 0
**Owner:** CHEAP_WORKER  
**Depends:** GATE-04  
**Covers:** SRC-001, SRC-004..SRC-006, SRC-064, SRC-065

**Goal:** establish minimal Node.js/TypeScript runtime/test/format/lint structure without implementing product behavior.

**Write Scope:** root package/runtime tooling files and empty source/test directories only.

**Guardrails:** no framework dependencies beyond what is necessary for approved baseline; no business/runtime modules yet.

**Verify:** clean install, typecheck, unit-test command, lint command all execute successfully.

## L3-008 - Create Canonical Manifest Directory Skeleton — DONE ✅ 2026-09-20

**Status:** PASS — `.lcs3/manifests/` 5 files parseable (artifacts/lifecycle/skills/tasks/quality.yaml), lifecycle enums only in lifecycle.yaml
**Owner:** CHEAP_WORKER  
**Depends:** L3-007, GATE-02, GATE-03  
**Covers:** SRC-009, SRC-010

**Goal:** create approved manifest concern files with schema placeholders containing only approved fields/enum values.

**Write Scope:** manifest directory only.

**Verify:** all required concern manifests exist and are parseable; no duplicate lifecycle definition outside approved source.

## L3-009 - Implement Manifest Schema Validation — DONE ✅ 2026-09-20

**Status:** PASS — `src/manifests.ts` + `test/manifests.test.ts` 7/7 (valid pass, 5 failure fixtures), lint clean
**Owner:** CHEAP_WORKER  
**Depends:** L3-008  
**Covers:** SRC-009, SRC-010; AC-004..AC-006

**Goal:** validate canonical manifests and fail on invalid/missing/duplicated definitions.

**Write Scope:** manifest loader/validator module + tests.

**Verify:** valid fixture passes; malformed enum, duplicate ID, missing required field, and contradictory lifecycle fixture fail.

## L3-010 - Implement Artifact Metadata Parser/Validator — DONE ✅ 2026-09-20

**Status:** PASS — `src/artifacts.ts` (parseArtifact frontmatter/body split + validateArtifactContent frontmatter-only rules + getArtifactAuthority AC-009) + `test/artifacts.test.ts` 11/11; full suite 18/18 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** GATE-02, L3-009  
**Covers:** SRC-013..SRC-016, SRC-019; AC-007..AC-010, AC-014

**Goal:** parse and validate approved structured artifact metadata without inferring machine-critical values from prose.

**Verify:** canonical/derived classification, ID, relations, lifecycle fields validated; malformed frontmatter fails deterministically.

## L3-011 - Implement Project Config Schema and Loader — DONE ✅ 2026-09-20

**Status:** PASS — `src/config.ts` (validateConfig/loadProjectConfig 6 groups FR-006) + `test/config.test.ts` 11/11 + `.lcs3/config.yaml` canonical; full suite 29/29 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** L3-009, GATE-04  
**Covers:** SRC-063

**Goal:** load/validate centralized project policy config.

**Required policy groups:** workflow, execution, context, verification, quality, risk (only approved keys/defaults).

**Verify:** valid config loads; unknown/invalid critical fields report actionable errors.

## L3-012 - Implement `lcs3 init` — DONE ✅ 2026-09-20

**Status:** PASS — `src/init.ts` initProject + `test/init.test.ts` 6/6; full suite 35/35 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** L3-007, L3-011, GATE-04  
**Covers:** SRC-003, SRC-041, SRC-046; AC-001..AC-003, AC-039

**Goal:** initialize approved `.lcs3/` structure safely and idempotently.

**Guardrails:** never import `.lcs/`; never overwrite non-generated canonical files silently.

**Verify:** fresh init succeeds; second init is safe; existing `.lcs/` does not affect output; malformed existing `.lcs3/` returns error.

## L3-013 - Add Contract Drift Regression Suite — DONE ✅ 2026-09-20

**Status:** PASS — `test/drift.test.ts` 6/6 (repo canonical passes, init templates byte-identical, config↔quality cross-file, missing-skill/unknown-group/corrupt-template fail); full suite 41/41 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** L3-008..L3-012  
**Covers:** SRC-010, SRC-060, SRC-061; AC-004..AC-006, AC-054, AC-056

**Goal:** create fixtures that fail when templates/manifests/validators disagree.

**Verify:** intentionally inconsistent fixture fails CI; canonical fixture passes.

---

# Phase 2 - SQLite Runtime State and Concurrency

## L3-014 - Implement SQLite Bootstrap and Schema Migration Layer — DONE ✅ 2026-09-20

**Status:** PASS — `src/db.ts` (bootstrapDatabase + SCHEMA_VERSION 1 + schema_migrations bookkeeping, newer-version refusal, failed-migration rollback) + `test/db.test.ts` 7/7; full suite 48/48 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** GATE-03, GATE-04, L3-007  
**Covers:** SRC-017, SRC-018

**Goal:** create deterministic runtime DB bootstrap/migration mechanism using approved schema design.

**Guardrail:** canonical requirements must not be stored only in SQLite.

**Verify:** empty DB initializes; repeated bootstrap is safe; schema version mismatch handled explicitly.

## L3-015 - Implement Transactional Runtime State Repository — DONE ✅ 2026-09-20

**Status:** PASS — `src/state.ts` (getTask/putTask/listTasks/withTransaction, BEGIN IMMEDIATE + COMMIT/ROLLBACK) + `src/db.ts` SCHEMA_VERSION 2 (runtime-tasks-table: tasks + idx_tasks_status) + `test/state.test.ts` 8/8; full suite 56/56 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** L3-014  
**Covers:** SRC-017, SRC-018, SRC-024

**Goal:** expose narrow transactional primitives for runtime state without leaking raw SQL throughout the runtime.

**Verify:** commit/rollback tests; concurrent write behavior tested.

## L3-016 - Implement Task Execution State Machine — DONE ✅ 2026-09-20

**Status:** PASS — `src/transitions.ts` (machine loaded from canonical lifecycle.yaml, canTransition/assertTransition/createTask/transitionTask) + `test/transitions.test.ts` 7/7 (23 legal edges, 6 illegal, terminal block, review-fix loop, AC-014 cross-talk, row-unchanged, unknown-task); full suite 63/63 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** GATE-03, L3-015  
**Covers:** SRC-019..SRC-023, SRC-039; AC-014, AC-019..AC-023

**Goal:** enforce only approved execution transitions.

**Verify:** every legal transition passes; representative illegal transitions fail; terminal-state mutation is blocked unless contract explicitly permits it.

## L3-017 - Implement Atomic Task Claim and Lease — DONE ✅ 2026-09-20

**Status:** PASS — `src/claims.ts` (claimTask/renewLease/expireTask/reclaimTask/isLeaseExpired) + `test/claims.test.ts` 8/8; full suite 71/71 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** L3-015, GATE-03  
**Covers:** SRC-024; AC-012, AC-013

**Goal:** ensure one active owner per task and deterministic lease expiry/reclaim behavior.

**Verify:** concurrent claim race yields one winner; expired lease can be reclaimed; stale owner cannot renew after ownership changes.

## L3-018 - Implement Dependency Resolver — DONE ✅ 2026-09-20

**Status:** PASS — `src/dependencies.ts` (normalize/check/assert) + `test/dependencies.test.ts` 8/8 (ready, blocked, unknown-dep, unknown-task, normalize, self-cycle, dupe); full suite 79/79 pass, typecheck/lint clean

**Owner:** CHEAP_WORKER  
**Depends:** L3-010, L3-015  
**Covers:** SRC-025; AC-024, AC-025

**Goal:** normalize task IDs and block execution when prerequisites are incomplete/invalid.

**Verify:** complete dependency passes; incomplete blocks; unknown dependency errors; cycle detection if approved by design.

## L3-019 - Implement Conflict and Write-Scope Resolver — DONE ✅ 2026-09-20

**Status:** PASS — `src/conflicts.ts` (setTaskScope/getTaskScope/checkConflicts/assertNoConflicts/recordExpansion + task_scopes mirror) + `src/db.ts` SCHEMA_VERSION 3 (runtime-task-scopes-table) + `test/conflicts.test.ts` 8/8 (overlap, disjoint, read-only, terminal-history, expansion, no-op-covered, normalize, unknown-task); full suite 87/87 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** L3-010, L3-015  
**Covers:** SRC-025..SRC-027; AC-026, AC-027

**Goal:** detect parallel write conflicts and record declared scope expansion.

**Verify:** overlapping write scopes conflict; read-only overlap does not; scope expansion produces explicit runtime record.

## L3-020 - Implement Blast-Radius Budget Tracking — DONE ✅ 2026-09-20

**Status:** PASS — `src/blast.ts` pure signal module + `test/blast.test.ts` 6 tests (below/at-budget continue, over-budget escalation signal, policy signals, invalid inputs); 93/93 pass, typecheck/lint clean; proposal only

**Owner:** CHEAP_WORKER  
**Depends:** L3-019  
**Covers:** SRC-028; AC-028

**Goal:** compare observed implementation impact to configured task budget and emit controlled escalation when exceeded.

**Guardrail:** do not auto-reslice; only produce deterministic signal/state.

**Verify:** below-budget continues; above-budget emits expected escalation signal.

## L3-021 - Implement Failure Taxonomy and Retry State — DONE ✅ 2026-09-20

**Status:** PASS — `src/retries.ts` (classifyFailure/recordFailure/getRetryState: 8 approved categories, RETRYABLE bounded by execution.max_retries, NEVER_RETRY + BLOCKING escalate) + `src/db.ts` SCHEMA_VERSION 4 (runtime-task-retries-table) + `test/retries.test.ts` 7/7; full suite 100/100 pass, typecheck/lint clean
**Owner:** CHEAP_WORKER  
**Depends:** L3-016  
**Covers:** SRC-021..SRC-023; AC-020..AC-023

**Goal:** persist bounded retry attempts and approved failure categories.

**Verify:** categories route to expected next state; retry budget exhausts deterministically; human/credential/spec ambiguity never loops as implementation retry.

## L3-022 - Runtime Concurrency Regression Tests — DONE ✅ 2026-09-20

**Status:** PASS — `test/concurrency.test.ts` 7/7 through public seams (parallel-claim one winner ×3 repeats, lease-expiry handoff + stale-owner refusal ×2, dependency gate blocks-until-done + unknown-dep throw, write-conflict blocks/clears-on-done/expansion-widens + read-only never conflicts, retry budget retry×3→escalate deterministic ×2 + status untouched, blast signal pure + tasks table untouched, end-to-end A→B→C handoff); full suite 107/107 pass, typecheck/lint clean

**Owner:** CHEAP_WORKER  
**Depends:** L3-017..L3-021  
**Covers:** AC-011..AC-028

**Goal:** stress representative claim/lease/dependency/conflict/retry cases through public runtime seams.

**Verify:** deterministic repeated runs; no duplicate owner; no silent dependency bypass.

---

# Phase 3 - Artifacts, Provenance, Context, and Verification

## L3-023 - Implement Canonical Artifact Read/Write Service — DONE ✅ 2026-09-20

**Status:** PASS — `src/artifacts.ts` serializeArtifact/readArtifactFile/writeCanonicalArtifact/writeDerivedArtifact; round-trip body identical, derived via canonical blocked, canonical via derived blocked, invalid rejected + file not created, missing file actionable; `npm run typecheck`/`lint` 0, `npm test` 107/107 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-010, GATE-04  
**Covers:** SRC-011..SRC-016

**Goal:** provide safe artifact IO that preserves structured metadata and human Markdown while respecting authority class.

**Verify:** round-trip preserves metadata/body; derived artifact cannot be written through canonical-only API; invalid metadata rejected.

## L3-024 - Implement Provenance and Freshness Engine — DONE ✅ 2026-09-20

**Status:** PASS — `src/provenance.ts` (digestContent/digestFile sha256, buildProvenance, isStale pure, getDerivedProvenance, checkDerivedFileFreshness) + `test/provenance.test.ts` 4/4 (stable digest, fresh→stale on upstream change, pure isStale, missing provenance not fresh); harness tmp derived fresh true→stale after src change + missing provenance -> not fresh; `typecheck` 0, `lint` 0, `npm test` 111/111 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-023 — DONE  
**Covers:** SRC-034, SRC-035; AC-030..AC-032

**Goal:** record source identity/digest and detect stale derived outputs.

**Verify:** unchanged source stays fresh; upstream change marks derived output stale.

## L3-025 - Implement Deterministic Traceability Generator — DONE ✅ 2026-09-20

**Status:** PASS — `src/traceability.ts` (126 lines: parseTraceTask frontmatter-only, buildTraceability sorted/deduped, renderTraceability forward/backward/gaps, generateTraceability via writeDerivedArtifact + buildProvenance, excludes traceability.md/task-coverage.md) harness tmp workItem 3 tasks (TASK-001 SRC-001+AC-010, TASK-002 SRC-001, TASK-003 no covers, body prose trap SRC-999) verified: prose isolated (SRC-999 not in view), gap observable (TASK-003 no covers), regenerate stable, provenance fresh→stale after mutate; `typecheck` 0, `lint` 0, `npm test` 111/111 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-023, L3-024 — DONE  
**Covers:** SRC-014, SRC-040; AC-010

**Goal:** generate traceability view only from structured canonical relationships.

**Verify:** deleting generated view and regenerating yields equivalent mappings; prose-only guess is never required.

## L3-026 - Implement Deterministic Task-Coverage Generator — DONE ✅ 2026-09-20

**Status:** PASS — `src/coverage.ts` (116 lines: parseCoverageTask frontmatter-only, buildCoverage bySrc/byTest sorted/deduped, renderCoverage SRC/test tables + gaps, generateTaskCoverage via writeDerivedArtifact + buildProvenance) harness same tmp fixture verified: coverage gaps observable, prose isolated, regenerate stable, provenance fresh→stale; `typecheck` 0, `lint` 0, `npm test` 111/111 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-023, L3-024 — DONE  
**Covers:** SRC-014, SRC-040; AC-010

**Goal:** generate SRC/AC/test/task coverage view from structured metadata.

**Verify:** missing coverage is observable; regenerated result is stable.

## L3-027 - Implement Context Capsule Builder — DONE ✅ 2026-09-20

**Status:** PASS — `src/capsule.ts` (selective derived Context Capsule: parseCapsuleTask frontmatter-only, buildCapsule linkedSources sorted/deduped, generateCapsule via writeDerivedArtifact + buildProvenance on target task file, excludes derived outputs) + artifact_type `capsule` derived added to `.lcs3/manifests/artifacts.yaml` and `src/init.ts` template; harness tmp workItem 3 tasks (TASK-001 SRC-001+AC-010+TEST-001, TASK-002 SRC-001, TASK-003 no covers + prose trap SRC-999) verified: prose isolated (SRC-999 not in capsule), linked included (SRC-001/AC-010/TEST-001), unrelated excluded (SRC-002), peer selective (TASK-002 peer included, TASK-003 not), provenance fresh→stale after mutate TASK-001, regenerate stable; `typecheck` 0, `lint` 0, `npm test` 111/111 pass

**Owner:** CHEAP_WORKER  
**Depends:** L3-023..L3-026 — DONE  
**Covers:** SRC-032..SRC-035; AC-029..AC-032

**Goal:** build task-specific derived context from explicitly linked requirements, criteria, tests, decisions, repository evidence, and allowed memory.

**Guardrail:** capsule is always marked derived and source-linked.

**Verify:** unrelated requirements excluded; linked requirements included; stale source invalidates capsule freshness.

## L3-028 - Implement Context Budget Enforcement — DONE ✅ 2026-09-20

**Status:** PASS — `src/budget.ts` (checkContextBudget/enforceContextBudget pure, P0 set 37, soft trim + hard block, never silent P0 drop, estimateTokens len/4) + `test/budget.test.ts` 6/6 (within, soft trim P0 preserved + non-P0 dropped, soft only-P0 no-op, hard block P0 not dropped, boundaries, invalid inputs); `typecheck` 0, `lint` 0, `npm test` 117/117 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-027, L3-011 — DONE  
**Covers:** SRC-036

**Goal:** apply approved soft/hard context policy without dropping P0-linked material silently.

**Verify:** soft limit produces controlled trimming/report; hard limit blocks or escalates according to approved policy; P0 preservation tested.

## L3-029 - Implement Verification Recipe Registry — DONE ✅ 2026-09-20

**Status:** PASS — `src/recipes.ts` (registerRecipe/getRecipe/listRecipes/checkRecipeFreshness, verified-only promotion, provenance via buildProvenance/isStale, JSON at .lcs3/cache/recipes.json) + `test/recipes.test.ts` 5/5 (fresh reuse, stale on upstream change, missing upstream not fresh, unverified blocked, invalid inputs); `typecheck` 0, `lint` 0, `npm test` 122/122 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-011, L3-023  
**Covers:** SRC-038; AC-035

**Goal:** persist/reuse verified project build/test/lint/typecheck commands with provenance/freshness.

**Verify:** fresh recipe reused; stale recipe detectable; unverified command is not promoted silently.

## L3-030 - Implement Targeted Task Gate Runner — DONE ✅ 2026-09-20

**Status:** PASS — `src/gates.ts` runTargetedGate (verified-recipe-only, stale/missing blocks never executes, records exact command/output/exitCode/status) + `test/gates.test.ts` 3/3 (pass records evidence, failing command fails, stale/missing blocked); `typecheck` 0, `lint` 0, gates suite 6/6, full `npm test` 128/128 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-029  
**Covers:** SRC-037; AC-033

**Goal:** run only approved relevant verification for one task and return structured evidence.

**Verify:** failing command fails gate; result records exact command/output/status.

## L3-031 - Implement Work-Item Final Gate Runner — DONE ✅ 2026-09-20

**Status:** PASS — `src/gates.ts` runFinalGate (own broader suite, always runs independently, targeted pass never substitutes; pass/fail/blocked aggregation) + `test/gates.test.ts` 3/3 (broader suite + targeted-pass-cannot-substitute-failed-final, all-pass + stale-blocks, empty-list blocked); `typecheck` 0, `lint` 0, gates suite 6/6, full `npm test` 128/128 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-029, L3-030  
**Covers:** SRC-037; AC-034

**Goal:** run broader completion verification independent of the targeted task gate.

**Verify:** final gate can include broader suite; targeted gate passing cannot substitute for failed final gate.

---

# Phase 4 - Adaptive Workflow, Autonomy, and Review Loop

## L3-032 - Implement Complexity/Risk Classification Contract — DONE ✅ 2026-09-20

**Status:** PASS — `src/classification.ts` classifyWork (caller-supplied complexity/risk, risk dominates, pure no IO) + `test/classification.test.ts` 5/5 (short path, low-complex high-risk deep, invalid labels throw); `typecheck` 0, `lint` 0, `npm test` 133/133 pass
**Owner:** CHEAP_WORKER  
**Depends:** GATE-03, L3-009  
**Covers:** SRC-029, SRC-030; AC-015, AC-016

**Goal:** represent approved complexity/risk inputs/outputs deterministically; do not embed unapproved subjective scoring rules.

**Verify:** low-complexity/high-risk case is representable and does not collapse to short path solely due to complexity.

## L3-033 - Implement Adaptive Workflow Router — DONE ✅ 2026-09-20

**Status:** PASS — `src/router.ts` (routeWork via lifecycle.yaml workflow_phases + classifyWork, short skips explore/prd_review/srs, nextPhase/canAdvance/assertAdvance adjacent-forward only) + `test/router.test.ts` 9/9 (canonical order, short vs full differ, risk dominates, illegal advance rejected, skipped-phase walk rejected); typecheck 0, lint 0, npm test 142/142 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-032, L3-016  
**Covers:** SRC-029, SRC-030; AC-015, AC-016

**Goal:** route using approved workflow manifest and classification outcome.

**Verify:** simple/low-risk and complex/high-risk fixtures follow different valid paths; illegal phase transition rejected.

## L3-034 - Implement Bug Fast-Lane Routing — DONE ✅ 2026-09-20

**Status:** PASS — routeBug() in src/router.ts (scoped=true fast lane shorter than short, skips explore/prd_review/srs+prd; scoped=false escalates full path evidence verbatim; evidence non-empty strings required; scoped caller-supplied boolean never inferred) + 4 bug-lane tests in test/router.test.ts; typecheck 0, lint 0, npm test 146/146 pass

**Owner:** CHEAP_WORKER  
**Depends:** L3-033  
**Covers:** SRC-031; AC-017, AC-018

**Goal:** support scoped bug path and explicit escalation into planning when requirements/design are missing.

**Verify:** known bug uses shorter path; ambiguous bug retains evidence when escalated.

## L3-035 - Implement AFK/HITL Policy Evaluator — DONE ✅ 2026-09-20

**Status:** PASS — src/autonomy.ts evaluateAutonomy() (six caller-supplied boolean triggers from SRC-023, routine continues AFK no confirmation, HITL cites concrete triggers) + test/autonomy.test.ts 6/6; typecheck 0, lint 0, npm test 152/152 pass

**Owner:** CHEAP_WORKER  
**Depends:** L3-021, L3-033  
**Covers:** SRC-020, SRC-023; AC-019, AC-023

**Goal:** deterministically classify whether execution may continue AFK or must stop for human authority.

**Verify:** routine implementation does not request mode confirmation; destructive/credential/business-decision fixture escalates.

## L3-036 - Implement Execution Attempt Controller — DONE ✅ 2026-09-20

**Status:** PASS — src/attempts.ts runAttempt() (targeted gate -> caller-supplied failureCategory -> recordFailure/retry or escalate; blocked gate escalates without retry budget; no codegen inside controller) + test/attempts.test.ts 6/6; typecheck 0, lint 0, npm test 158/158 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-021, L3-030, L3-035  
**Covers:** SRC-020..SRC-023; AC-019..AC-023

**Goal:** coordinate attempt -> targeted verify -> classify failure -> retry/escalate using existing runtime primitives.

**Guardrail:** no code-generation logic inside deterministic controller; worker remains external reasoning actor.

**Verify:** recoverable failure retries within budget; non-recoverable category escalates immediately.

## L3-037 - Implement Structured Review Finding IDs — DONE ✅ 2026-09-20

**Status:** PASS — src/findings.ts emit/transition/get/list (FIX-### stable, open->fixed->closed, history audit retained) + migration v5 review_findings + test/findings.test.ts 5/5; typecheck 0, lint 0, npm test 163/163 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-023, GATE-03  
**Covers:** SRC-039; AC-036

**Goal:** define/store actionable `FIX-###` findings with stable target/evidence/status fields.

**Verify:** IDs stable; duplicate ID rejected; closed finding retains audit history.

## L3-038 - Implement Review-Fix Handoff Loop — DONE ✅ 2026-09-20

**Status:** PASS — src/review-loop.ts sendToNeedsFix/returnFromFix on in_review->needs_fix->claimed via transitionTask + finding guards + test/review-loop.test.ts 4/4; typecheck 0, lint 0, npm test 167/167 pass
**Owner:** CHEAP_WORKER  
**Depends:** L3-036, L3-037  
**Covers:** SRC-039; AC-037, AC-038

**Goal:** allow executor to consume one approved finding and return workflow to review after fix verification.

**Verify:** review -> fix -> review path closes; unrelated findings remain unchanged.

## GATE-05 - Runtime Public Contract Freeze

**Owner:** SMART_GATE  
**Depends:** L3-012, L3-016..L3-038

**Decision:** freeze the CLI/service surfaces required by skills before broad skill-family implementation. Reject leaking raw DB/storage mechanics into skill contracts.

---

# Phase 5 - Quality, Memory, Telemetry, Legacy Import, Doctor

## L3-039 - Implement Quality Overlay Registry/Resolver

**Owner:** CHEAP_WORKER  
**Depends:** L3-009, L3-011, GATE-05  
**Covers:** SRC-049, SRC-051; AC-043, AC-044, AC-046

**Goal:** select only relevant native quality overlays from task concerns/config.

**Verify:** backend-only task does not load `ui-quality`; relevant UI task does.

## L3-040 - Implement `ui-quality` Native Rules

**Owner:** CHEAP_WORKER  
**Depends:** L3-039  
**Covers:** SRC-047..SRC-050; AC-045, AC-046

**Goal:** encode only approved LCS3-owned UI-quality rules.

**Guardrail:** no runtime fetch of Anti-Slop; do not claim parity with upstream.

**Verify:** offline execution works; representative good/bad fixtures behave as expected.

## L3-041 - Implement `code-quality` Native Rules

**Owner:** CHEAP_WORKER  
**Depends:** L3-039  
**Covers:** SRC-047..SRC-050; AC-045, AC-046

**Goal/Guardrail/Verify:** same ownership/offline rules as L3-040, scoped to approved code-quality checks.

## L3-042 - Implement `security-basic` Native Rules

**Owner:** CHEAP_WORKER  
**Depends:** L3-039  
**Covers:** SRC-047..SRC-050; AC-045, AC-046

**Goal:** implement lightweight approved baseline security concerns without pretending to replace domain security review.

**Verify:** representative unsafe configuration/action is surfaced; irrelevant security checks are not globally injected.

## L3-043 - Implement Project Memory Store and Precedence

**Owner:** CHEAP_WORKER  
**Depends:** L3-023, L3-024, GATE-05  
**Covers:** SRC-052..SRC-055; AC-047..AC-049

**Goal:** persist advisory memories with source/confidence/freshness and deterministic conflict precedence.

**Verify:** current canonical/repo evidence overrides conflicting memory; stale memory flagged.

## L3-044 - Implement ADR Promotion Candidate Flow

**Owner:** CHEAP_WORKER  
**Depends:** L3-043  
**Covers:** SRC-056

**Goal:** surface project-wide decision candidates without silently promoting them.

**Guardrail:** worker may create candidate/proposal only; architecture approval remains Smart Gate/HITL.

**Verify:** candidate retains source evidence and does not alter canonical architecture until approved.

## L3-045 - Implement Local Telemetry Store

**Owner:** CHEAP_WORKER  
**Depends:** L3-015, L3-011  
**Covers:** SRC-057, SRC-058; AC-050, AC-051

**Goal:** record approved local operational fields with bounded overhead.

**Guardrail:** telemetry path cannot mutate framework manifests/skills.

**Verify:** execution result + one efficiency/failure metric persists; disabled telemetry mode if approved works cleanly.

## L3-046 - Implement Self-Improvement Proposal Generator

**Owner:** CHEAP_WORKER  
**Depends:** L3-045  
**Covers:** SRC-058, SRC-059; AC-051, AC-052

**Goal:** transform repeated evidence into explicit improvement proposal artifacts only.

**Verify:** proposal references evidence; no skill/schema/runtime file auto-modified.

## L3-047 - Implement Legacy Docs/Archive Importer

**Owner:** CHEAP_WORKER  
**Depends:** L3-001, L3-023, GATE-05  
**Covers:** SRC-041..SRC-045; AC-039..AC-042

**Goal:** import eligible legacy docs/archive as raw immutable references plus searchable index.

**Guardrails:** reject active state/work-item/runtime import; imported Markdown is reference data, not executable instruction.

**Verify:** raw content preserved; index searchable; unsupported runtime import rejected.

## L3-048 - Implement Doctor Core

**Owner:** CHEAP_WORKER  
**Depends:** L3-009, L3-015, L3-024..L3-026, L3-043, L3-047  
**Covers:** SRC-060; AC-053

**Goal:** detect representative state inconsistency, lifecycle error, stale derived artifact, bad dependency, orphan, missing coverage, conflict, and contract drift.

**Verify:** seeded bad fixtures each produce distinct actionable finding; clean fixture passes.

---

# Phase 6 - Skill Family Build (Driven Strictly by Approved Matrix)

## L3-049 - Generate Skill Implementation Task Manifest from Approved Matrix

**Owner:** CHEAP_WORKER  
**Depends:** GATE-01, GATE-05  
**Covers:** SRC-064, SRC-065, SRC-067..SRC-069; AC-057..AC-065

**Goal:** create one implementation task per approved retained/reworked LCS3 skill/capability. Do not invent extra skills.

**Write Scope:** `docs/migration/skill-build-plan.md` or approved task manifest only.

**For each matrix row:**
- `REWRITE`: create one new-skill task.
- `MERGE`: create one target-skill task referencing all merged sources.
- `DROP`: create no implementation task; record reason and coverage check.
- `REPLACED_BY_RUNTIME`: create no skill implementation task; point to runtime task(s) providing replacement.

**Verify:** every matrix row has exactly one downstream disposition outcome; every planned skill traces to matrix row or explicit new SRC.

### Template for Every Generated `SKILL-###` Task

**Owner:** CHEAP_WORKER  
**Required Inputs:** approved matrix row, relevant SRC/AC, runtime public contract, only the relevant legacy skill/direct refs.  
**Read Scope:** target row + relevant LCS3 contracts + one legacy skill family slice.  
**Write Scope:** one `lcs3-*` skill directory only unless explicit shared reference task exists.  
**Must Not Touch:** `reference/legacy-lcs/`, unrelated skills, canonical runtime manifests unless task explicitly owns them.

**Steps:**
1. Extract behavior to preserve from approved matrix row.
2. Identify mechanics explicitly marked for removal.
3. Implement concise `SKILL.md` as control plane.
4. Move conditional detail into references; deterministic mechanics must call approved runtime interface.
5. Remove legacy `.lcs/` paths/status/schema/state logic.
6. Add/update skill-specific validation/smoke fixtures.
7. Verify trigger description and workflow handoff.

**Done When:** preserved behavior passes task acceptance checks and no forbidden legacy mechanic remains.

**Escalate:** matrix row contradicts runtime contract, requires new skill/capability, or needs architecture change.

## L3-050 - Validate Complete Skill Family Against Matrix

**Owner:** CHEAP_WORKER  
**Depends:** L3-049 and all generated `SKILL-###` tasks  
**Covers:** SRC-064, SRC-067..SRC-069; AC-057..AC-065

**Goal:** prove full skill-family coverage and absence of legacy contract leakage.

**Verify:** every approved target exists exactly once; dropped/runtime-replaced rows are not accidentally recreated; scans reject `.lcs/` legacy contract/path leakage where forbidden.

---

# Phase 7 - Scenario Evals, Packaging, and Release Gate

## L3-051 - Build End-to-End Scenario Harness

**Owner:** CHEAP_WORKER  
**Depends:** L3-048, L3-050  
**Covers:** SRC-061, SRC-062; AC-054..AC-056

**Goal:** establish reusable scenario runner using real public LCS3 seams rather than mocked file-existence checks.

**Verify:** one minimal scenario can initialize, mutate runtime state through public API, and assert observable final state.

## L3-052 - Add Planning and Bug Workflow Scenarios

**Owner:** CHEAP_WORKER  
**Depends:** L3-051  
**Covers:** SRC-029..SRC-031, SRC-061, SRC-062

**Scenarios:** simple feature, complex/high-risk feature, bug fast lane, bug escalation.

**Verify:** each route matches approved workflow manifest and preserves evidence.

## L3-053 - Add AFK/HITL/Retry Scenarios

**Owner:** CHEAP_WORKER  
**Depends:** L3-051  
**Covers:** SRC-020..SRC-023, SRC-061, SRC-062

**Scenarios:** AFK success, meaningful HITL stop, recoverable retry, retry exhaustion, credential/spec ambiguity.

## L3-054 - Add Multi-Workitem/Multi-Worker Scenarios

**Owner:** CHEAP_WORKER  
**Depends:** L3-051  
**Covers:** SRC-024..SRC-028, SRC-061, SRC-062

**Scenarios:** concurrent claims, lease expiry, dependency block, write conflict, scope expansion/blast radius.

## L3-055 - Add Review/Freshness/Finalization Scenarios

**Owner:** CHEAP_WORKER  
**Depends:** L3-051  
**Covers:** SRC-034, SRC-035, SRC-037..SRC-040, SRC-061, SRC-062

**Scenarios:** review -> FIX -> review, stale capsule/derived artifact, task gate vs final gate, finalization.

## L3-056 - Add Legacy Isolation and Leakage Scenarios

**Owner:** CHEAP_WORKER  
**Depends:** L3-047, L3-050, L3-051  
**Covers:** SRC-041..SRC-045, SRC-066..SRC-069; AC-039..AC-042, AC-060..AC-065

**Scenarios:** coexist `.lcs/` + `.lcs3/`, raw legacy import, reject active-state import, reject modification/leakage of reference contracts.

## L3-057 - Full Doctor and Acceptance Coverage Sweep

**Owner:** CHEAP_WORKER  
**Depends:** L3-052..L3-056  
**Covers:** SRC-060..SRC-062; AC-001..AC-065

**Goal:** run Doctor, static validators, unit/integration tests, scenario suite, and generate requirement-to-acceptance/test coverage report.

**Guardrail:** missing coverage is a failure, not a documentation note.

**Verify:** every AC has at least one evidence source or is explicitly marked blocked with reason; all P0 SRCs trace to tests/validation where testable.

## L3-058 - Package CLI and Skill Distribution

**Owner:** CHEAP_WORKER  
**Depends:** L3-057, approved packaging decision  
**Covers:** SRC-004..SRC-006, SRC-064

**Goal:** produce approved installable packaging without changing public contracts.

**Escalate:** packaging/distribution method still unresolved.

**Verify:** clean install in isolated fixture; `lcs3` CLI starts; skills discoverable by approved mechanism; no legacy runtime dependency bundled.

## L3-059 - Write Operator/Contributor Documentation

**Owner:** CHEAP_WORKER  
**Depends:** L3-057, L3-058  
**Covers:** supporting all approved runtime behavior

**Goal:** document installation, init, authority model, canonical vs derived data, worker rules, legacy reference/import, Doctor, recovery, and contribution workflow.

**Guardrail:** documentation must be derived from actual verified behavior, not aspirational commands.

## L3-060 - Release Candidate Gate

**Owner:** SMART_GATE + HITL for release approval  
**Depends:** L3-057..L3-059

**Required evidence:**
- no unresolved P0 implementation gaps;
- all mandatory Smart Gates approved;
- complete migration matrix and skill-family coverage;
- full scenario suite pass;
- Doctor clean on release fixture;
- legacy reference remains read-only/non-runtime;
- no automatic self-modification path;
- release docs match actual CLI/runtime behavior.

**Decision:** APPROVE RC / REVISE / BLOCK.

---

# 4. Recommended Worker Scheduling

Safe parallelism after dependencies are satisfied:

- Phase 0 evidence tasks L3-002, L3-004, L3-005 can run in parallel after prerequisites, but approvals remain serialized by their gates.
- In Phase 1, config/artifact work may run in parallel only after canonical format/lifecycle/storage gates are frozen.
- In Phase 2, dependency/conflict modules may be developed in parallel after the transactional runtime repository exists, but shared DB schema ownership must remain single-writer.
- In Phase 3, traceability and task-coverage generators may run in parallel after artifact/provenance services stabilize.
- Quality overlays L3-040..L3-042 may run in parallel because each owns a separate rule set after the registry contract is stable.
- Generated `SKILL-###` tasks may run in parallel only when write scopes do not overlap and each task has a distinct target skill directory.
- Scenario tasks L3-052..L3-056 may run in parallel after the scenario harness stabilizes.

Do not parallelize two tasks that both own the same canonical manifest, DB migration, public runtime interface, or shared skill reference.

# 5. Cheap-Worker Context Discipline

For a normal implementation task, the orchestrator should construct a context pack roughly like:

```text
AGENTS.md
+ one task card
+ exact SRC/AC rows for that task
+ current public contract/interface being used
+ target files
+ directly relevant tests
+ optional one legacy skill/reference slice
```

Avoid giving the worker:

```text
entire conversation
+ entire PRD
+ every LCS3 artifact
+ entire legacy repository
+ all quality overlays
```

unless the task is specifically a cross-system validation task.

# 6. Escalation Policy for Cheap Workers

Escalate to `Pintar` when any of these occurs:

- required behavior has two or more plausible interpretations;
- task would create/change a public contract;
- task needs a new dependency not already approved;
- task would add a new skill or merge/split approved skill boundaries;
- task conflicts with a `SRC-###`, approved matrix row, manifest, or ADR;
- scope expansion exceeds the task write budget materially;
- a runtime failure category is unclear;
- tests reveal a requirement/design contradiction;
- legacy behavior conflicts with LCS3 requirements;
- worker cannot pass verification after two local repair cycles.

Escalate to HITL only for user/product authority, credentials, destructive actions, licensing uncertainty, or explicit business/security decisions that cannot be delegated.

# 7. Completion Definition

The build is not complete because all implementation tasks are marked done. It is complete only when:

1. every P0 source requirement remains traceable;
2. AC-001..AC-065 have verification evidence or an explicitly approved exception;
3. the Legacy Skill Migration Matrix has complete downstream coverage;
4. Doctor reports no release-blocking integrity issue;
5. all required end-to-end scenarios pass;
6. legacy reference remains isolated and read-only;
7. canonical artifacts, runtime SQLite state, derived views, memory, and reference data remain authority-separated;
8. Smart Gate/HITL release approval is recorded.
