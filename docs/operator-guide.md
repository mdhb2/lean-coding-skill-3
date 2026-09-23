# LCS3 Operator / Contributor Guide

> Guardrail (L3-059): everything below describes **verified behavior** — commands
> the author ran, APIs read from `src/`, and assertions covered by
> `test/scenarios/`. The CLI is executable from a checkout; package remains private.

## 1. Installation

There is **no published package**. The private package defines local `lcs3` bin
metadata, but does not support global installation. Run CLI from a checkout:

- Requirement: **Node.js >= 22** (`engines` in `package.json`; verified here
  with `node v22.23.2`).
- Runtime dependency: exactly one — `js-yaml`. Anything else in
  `dependencies` is a packaging violation (`test/scenarios/packaging.test.ts`).
- Build: `npm run build` (`tsc -p tsconfig.json`, emits `dist/`).
- CLI: `node dist/src/cli.js --help` or `node dist/src/cli.js --version`.
  After `npm run build`, package managers can also resolve the local `lcs3` bin
  from `node_modules/.bin/`; do not publish or globally install this private
  package.
- Verify: `npm test` (build + `node --test "dist/test/**/*.test.js"`),
  `npm run typecheck`, `npm run lint`. All three must be green before any
  task claims PASS.
- Distribution boundary: the `files` allowlist (`dist/`, `skills/`, `docs/`,
  READMEs). `npm pack --dry-run` must never list `reference/`, raw `src/*.ts`,
  `thoughts/`, or `.lcs/` paths (asserted by the packaging scenario test).

## 2. Project init

Projects initialize with `node dist/src/cli.js init [--project-root <path>]`
or the local `lcs3 init` bin. Omitting `--project-root` uses current directory.
The command calls `initProject(projectRoot)` (`src/init.ts`) and bootstraps
project-local SQLite state. It emits JSON to stdout, diagnostics to stderr,
and exits with `0` on success, `1` on runtime failure, or `2` on invalid usage.
Initialization is required before task commands; task operations do not
implicitly create project state.

Supported task commands:

```sh
node dist/src/cli.js task list [--project-root <path>]
node dist/src/cli.js task create <task-id> [--project-root <path>]
node dist/src/cli.js task transition <task-id> <status> [--project-root <path>]
node dist/src/cli.js task claim <task-id> --owner <worker-id> [--lease-seconds <seconds>] [--project-root <path>]
```

Each successful task command emits its result as JSON. `task create` creates a
`pending` task; transitions are checked against `lifecycle.yaml`; claims require
a `ready` task and default to configured `execution.lease_seconds` (600).

`initProject` creates the approved `.lcs3/` layout and is **idempotent**:

```text
.lcs3/
  config.yaml            # centralized policy (workflow, execution, context,
                         # verification, quality, risk groups only)
  manifests/             # canonical registry: artifacts, lifecycle, skills,
                         # tasks, quality (each schema_version: "1")
  memory/ telemetry/     # advisory evidence, never canonical
  imports/legacy/        # quarantined legacy imports (scope: reference)
  cache/capsules|traceability|indexes/   # derived, regenerable
  tmp/
```

- Defaults written to `config.yaml`: `max_retries: 3`, `lease_seconds: 600`,
  token budgets 8000/32000, risk budget `max_files: 6` / `max_loc: 400` with
  `on_exceed: escalate_or_reslice`.
- Existing valid files are **kept, never overwritten**; malformed pre-existing
  YAML fails the whole init **before any write**.
- `.lcs/` is never read, imported, or mutated by init.

## 3. Authority model

| Layer | Lives in | Examples | Rule |
|---|---|---|---|
| Canonical | Markdown/YAML with frontmatter | PRD/SRS/tasks, `.lcs3/manifests/*`, `config.yaml`, `skills/*/SKILL.md` | Human-readable source of truth; validated by `validateManifests` (exactly 18 skills, frozen lifecycle enums, selective overlay loading) |
| Runtime state | SQLite under `.lcs3/` | task status, claims, leases, attempts, telemetry, legacy-import records | Mutated only through runtime functions, never by hand-editing |
| Derived | Regenerable views | Context Capsules, traceability, `task_coverage`, `docs/ac-coverage.md` | Cache only. Stale output is detected (`checkDerivedFileFreshness` reports `upstream changed`), never authoritative — regenerate |

When layers disagree, canonical wins; when memory disagrees with either,
current canonical/repository evidence wins (memory is advisory).

## 4. Worker rules

- **Claim before work.** `claimTask` is atomic: exactly one worker wins; losers
  see "already owned". Claims carry a lease (`lease_seconds`, default 600).
- **Lease expiry, not theft.** A live lease cannot be expired; an expired lease
  returns the task to `ready` and another worker may `reclaimTask`.
- **Dependencies gate execution.** `checkDependencies` blocks until every
  `blocked_by` task is `done`; asserting readiness early throws.
- **Write scope is declared.** `setTaskScope` + `checkConflicts` detect
  overlapping write scopes; `recordExpansion` records scope growth explicitly.
- **Blast budget is enforced.** `checkBlastRadius` against the risk policy
  (≤ 6 files / ≤ 400 LOC): within budget continues, over budget returns
  `escalate_or_reslice`.
- **AFK continues, HITL stops.** Routine work runs without mode confirmations;
  destructive, credential, and business-decision triggers stop for a human.
  Implementation failures retry within budget (`max_retries: 3`, then escalate;
  4 attempts recorded); credential/specification failures escalate immediately
  (1 attempt, never looped as implementation retries).
- **Review is a loop, not a gate.** `emitFinding` → fix → `returnFromFix` →
  close, with a full finding history. Guards refuse: returning with an open
  finding ("must be fixed"), a finding from another task ("belongs to"), or a
  task not in review ("must be in_review"). `done` is terminal — transitions
  out throw.
- **Gates run recipes.** `registerRecipe` + `runTargetedGate` per task,
  `runFinalGate([...])` broader at the end. Empty recipe lists and stale
  upstreams block deterministically instead of passing silently.

## 5. Legacy reference and import

- `reference/legacy-lcs/` is **read-only evidence**. Never modify it, never
  commit LCS3 work inside it, never treat its schemas/paths/statuses as
  requirements. Bulk skill creation starts from `docs/legacy-skill-matrix.md`,
  never from PRD wording or memory.
- Import is quarantine, not adoption: `importLegacyDoc` accepts **only
  Markdown files outside `.lcs/` and `.lcs3/`** (legacy runtime state and LCS3
  own state are never eligible), stores a byte-identical copy under
  `.lcs3/imports/legacy/`, and records a `LEG-` id with digest (`list/get/
  searchLegacyImports`). Reads never mutate the source; repeat imports are
  idempotent (one record).
- Skill registry is law: `.lcs3/manifests/skills.yaml` holds exactly the 18
  `lcs3-*` skills; `skills/<name>/SKILL.md` must match the registry exactly.

## 6. Doctor

`runDoctor(snapshot)` (`src/doctor.ts`) is pure — no filesystem, SQLite, or
network. The caller assembles the snapshot (legal/terminal states come from
canonical `lifecycle.yaml`, so Doctor never hardcodes the state machine);
checks run in fixed order, deterministically. The 8 finding codes:

```text
doc-invalid-status  doc-lifecycle-error  doc-stale-derived  doc-broken-dep
doc-orphan          doc-missing-coverage doc-conflict       doc-contract-drift
```

Severity is `error` or `warning`; every finding carries target + evidence.
A release fixture must be Doctor-clean (see L3-060).

## 7. Recovery

- **Stuck claim:** wait for lease expiry → task returns to `ready` → reclaim.
  Never hand-edit SQLite to "fix" ownership.
- **Stale derived artifact:** regenerate from canonical sources (capsules,
  traceability, coverage reports); `upstream changed` clears on regeneration.
- **Failed init:** fix or remove the malformed YAML, re-run — nothing was
  half-written (validation precedes writes).
- **Blocked gate:** read the finding/reason (`upstream changed`, missing
  recipe, open finding) and fix the cause; gates fail closed by design.
- **Retry exhaustion:** the failure is classified and escalated with its
  attempt trail — do not re-run the same fix in an unbounded loop.

## 8. Contribution workflow

1. Scope the task to its card: read the exact `SRC`/`AC` rows, the public
   contract, and only the directly relevant tests. Load context selectively
   (context budgets: 8000 soft / 32000 hard tokens).
2. Keep the change budget: **≤ 6 files, ≤ 400 LOC** per task (config `risk`
   group); record scope expansion instead of silently growing it.
3. Use real public seams (path-string entry points, never raw database
   handles or SQL in skill contracts); no `.lcs/` paths; legacy reference
   stays read-only.
4. Verify before claiming done: `npm run typecheck` (0 errors), `npm run
   lint` (0 problems), targeted `node --test dist/test/...` for touched
   areas, then full `npm test`. New behavior needs a
   scenario test under `test/scenarios/` using `freshScenarioProject` /
   `readyTask` / `doneTask` helpers — Markdown shape checks are not sufficient.
5. Update the task status line in `docs/lcs3-worker-task-plan.md` on PASS
   before starting a dependent task. Do not commit unless the owner asks.
