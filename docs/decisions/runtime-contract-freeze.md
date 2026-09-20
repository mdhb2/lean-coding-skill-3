---
title: "GATE-05 Runtime Public Contract Freeze — Proposal"
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
tags: [decision, runtime-contract, freeze, lcs3]
summary: "Frozen public function surface per module, storage boundary, schema version, manifest/config anchors. No raw DB mechanics in skill contracts."
source: "docs/prd.md"
related: ["docs/decisions/lifecycle-contract-proposal.md", "docs/architecture/storage-boundary-proposal.md"]
---

# GATE-05 — Runtime Public Contract Freeze (Proposal)

**Status:** proposal — requires SMART_GATE freeze before broad skill-family implementation (Phase 6)
**Depends:** L3-012, L3-016..L3-038
**Verification at proposal time:** `typecheck` 0 errors, `lint` 0 errors, `npm test` 167/167 pass

Proposal only. No runtime code changes. Freezes what skills may call; internals stay free.

## 1. Boundary rule (frozen)

Skills call runtime only through **path-string entry points**:

- `dbPath: string` — SQLite file path; open/bootstrap/migrate happens inside runtime
- `projectRoot: string` — project directory (gates, recipes, config, init)
- `manifestDir: string` — canonical manifest directory (routing, transitions, validation)

**Forbidden in skill contracts:** raw `DatabaseSync` handles, SQL strings, `PRAGMA`
statements, direct table access. `DatabaseSync` appears only in `src/db.ts` plus
private `openDb` helpers in `state.ts`, `conflicts.ts`, `retries.ts`, `findings.ts`
(verified: no `DatabaseSync` in any `export` signature).

**`StateTx` is frozen as-is:** narrow domain abstraction `{ get, put }` exposed
only through `withTransaction(dbPath, fn)`. No SQL, no handle — acceptable, not a leak.

## 2. Frozen module surface (25 modules, `src/index.ts` stays empty)

| Module | Frozen exports (functions; types/interfaces alongside) |
|---|---|
| `artifacts.ts` | `parseArtifact`, `getArtifactAuthority`, `validateArtifactContent`, `serializeArtifact`, `readArtifactFile`, `writeCanonicalArtifact`, `writeDerivedArtifact` |
| `attempts.ts` | `runAttempt` (+ `AttemptInput`, `AttemptDecision`, `AttemptResult`) |
| `autonomy.ts` | `evaluateAutonomy` (+ `AutonomyInput`, `AutonomyDecision`, `AutonomyResult`) |
| `blast.ts` | `checkBlastRadius`, `assertBlastBudget` |
| `budget.ts` | `P0_IDS`, `isP0`, `estimateTokens`, `checkContextBudget`, `enforceContextBudget` |
| `capsule.ts` | `parseCapsuleTask`, `buildCapsule`, `generateCapsule` |
| `claims.ts` | `isLeaseExpired`, `claimTask`, `renewLease`, `expireTask`, `reclaimTask` |
| `classification.ts` | `classifyWork` (+ `Complexity`, `RiskLevel`, `WorkflowDepth`, `ClassificationInput`, `Classification`) |
| `config.ts` | `validateConfig`, `loadProjectConfig` (+ 6 policy interfaces + `ProjectConfig`) |
| `conflicts.ts` | `normalizeScopePath`, `setTaskScope`, `getTaskScope`, `checkConflicts`, `assertNoConflicts`, `recordExpansion` |
| `coverage.ts` | `parseCoverageTask`, `buildCoverage`, `renderCoverage`, `generateTaskCoverage` |
| `db.ts` | `bootstrapDatabase`, `defaultStateDbPath` (+ `SCHEMA_VERSION = 5`, `STATE_DB_REL`, `DbError`, `Migration`, `BootstrapResult`) |
| `dependencies.ts` | `normalizeTaskId`, `checkDependencies`, `assertDependenciesReady` |
| `findings.ts` | `emitFinding`, `transitionFinding`, `getFinding`, `listFindings` (+ `FindingStatus`, `Finding`) |
| `gates.ts` | `runTargetedGate`, `runFinalGate` (+ `GateStatus`, `GateResult`, `FinalGateResult`) |
| `init.ts` | `initProject` (+ `InitResult`) |
| `manifests.ts` | `validateManifests` (+ `ValidationError`) |
| `provenance.ts` | `digestContent`, `digestFile`, `buildProvenance`, `isStale`, `getDerivedProvenance`, `checkDerivedFileFreshness` |
| `recipes.ts` | `getRecipesPath`, `loadRecipes`, `registerRecipe`, `getRecipe`, `listRecipes`, `checkRecipeFreshness` |
| `retries.ts` | `classifyFailure`, `recordFailure`, `getRetryState` |
| `review-loop.ts` | `sendToNeedsFix`, `returnFromFix` (+ `FixHandoff`) |
| `router.ts` | `loadPhases`, `routeWork`, `routeBug`, `nextPhase`, `canAdvance`, `assertAdvance` (+ `Route`, `BugInput`, `BugRoute`; re-exports `defaultManifestDir`) |
| `state.ts` | `getTask`, `putTask`, `listTasks`, `withTransaction` (+ `TaskRecord`, `StateTx`) |
| `traceability.ts` | `parseTraceTask`, `buildTraceability`, `renderTraceability`, `generateTraceability` |
| `transitions.ts` | `defaultManifestDir`, `canTransition`, `assertTransition`, `createTask`, `transitionTask` |

Post-freeze rule: adding a new exported function is a contract change needing
SMART_GATE approval; changing a frozen signature likewise. Internal (non-exported)
helpers stay unrestricted.

## 3. Frozen storage facts

- Schema: `SCHEMA_VERSION = 5`, migrations append-only (`schema_migrations`,
  `tasks`, `task_scopes`, `task_retries`, `review_findings` + 2 indexes).
  Downgrade path refused loudly (newer `user_version` → error, never silent open).
- State DB path: `.lcs3/state.db`. Runtime mirror only (status/owner/lease/scope/
  retry/finding rows); canonical spec content stays in Markdown (SRC-013/017).
- Recipes cache: `.lcs3/cache/recipes.json`, verified-only promotion.

## 4. Frozen config/manifest anchors

- Config: 6 groups (`workflow`, `execution`, `context`, `verification`, `quality`,
  `risk`), `schema_version: "1"`, unknown keys rejected. `workflow.routing` must be
  `"complexity_risk"`; `quality.loading` must be `"selective"`.
- Manifests: `artifacts.yaml`, `lifecycle.yaml`, `quality.yaml`, `skills.yaml`
  (exactly 18 skills — drift-test anchor), `tasks.yaml`. Init templates byte-identical
  to repo canonical copies.
- Quality overlays: exactly `ui-quality`, `code-quality`, `security-basic`;
  selective loading; no runtime fetch of external Anti-Slop (SRC-047).

## 5. Guards enforcing the freeze

- `test/drift.test.ts` — canonical manifests+config pass; init byte-identical;
  config↔quality cross-file agreement; 18-skill anchor; inconsistency fixtures fail.
- `test/db.test.ts` — migration list includes all 5 runtime tables.
- No CLI exists yet (`src/index.ts` empty, no `bin/`); CLI surface (L3-058) must be
  built strictly on top of §2 without adding storage entry points.

## 6. Explicitly NOT frozen (free to evolve)

Non-exported helpers, SQL text inside `db.ts`/`state.ts`, error message wording,
test fixtures, docs, telemetry/memory/doctor modules (Phase 5 builds on top, may
add new modules + new exports via own tasks, but must not alter §2 signatures).
