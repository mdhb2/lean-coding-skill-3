# LCS3 Primary CLI Implementation Plan

**Goal:** Close L3-060 exception #1 by adding the primary `lcs3` CLI required by SRC-005, while preserving approved GATE-05 runtime contracts.

**Status:** Approved for implementation by user on 2026-09-23.

**Architecture:** Small private CLI entry module composes existing frozen runtime module exports. Keep `src/index.ts` empty. Use Node.js built-ins, including `node:util.parseArgs`; add no production dependency. CLI-specific parsing and dispatch stay outside the frozen runtime surface. Runtime calls continue to use path-string arguments and existing APIs; CLI must not expose raw `DatabaseSync`, SQL, or PRAGMA.

**Design references:** `docs/prd.md` (SRC-003..SRC-008, SRC-046, FR-005, FR-007..FR-009, AC-001..AC-003); `docs/decisions/runtime-contract-freeze.md` (approved GATE-05 §§1-6); `docs/lcs3-worker-task-plan.md` (L3-058, L3-060); `docs/operator-guide.md`; `package.json`.

## Verified starting point

- `src/index.ts` is still `export {};`; no executable `bin` is declared in `package.json`.
- GATE-05 freezes 25 module surfaces, keeps `src/index.ts` empty, and requires SMART_GATE approval for new exported functions or changed frozen signatures.
- `lcs3 init` is explicit in SRC-046, FR-005, and AC-002. `initProject(projectRoot)` exists as the programmatic initialization API; operator docs state no executable CLI exists yet.
- L3-058 is DONE WITH EXCEPTION: tarball contents verified, executable CLI deferred. It does not itself prove CLI installation or invocation.
- `package.json` is currently private. Do not make it publishable or change release policy as an incidental CLI implementation choice.

## Dependency and contract gates

1. Treat SRC-005/FR-007..FR-009 and GATE-05 as authoritative; do not infer a broad subcommand inventory from module exports alone.
2. Before implementation, derive a command-to-requirement/API matrix from canonical PRD and existing runtime modules. `lcs3 init` is mandatory. Any additional command must map to an explicit requirement or already-approved operator workflow.
3. Resolve CLI invocation/distribution against the approved packaging decision. `package.json` is private; adding a `bin` entry does not by itself authorize publishing or globally releasing the package.
4. Stop and request SMART_GATE if implementation needs a new export, changes a frozen signature, or weakens GATE-05. Do not route through `src/index.ts` to evade the freeze.

## CLI-1 command contract (approved scope)

The minimum useful façade covers explicit initialization and the existing deterministic task-state API. It does not add lifecycle, storage, validation, or ID rules of its own.

| Invocation | Arguments/options | Traceability | Existing API | Effects and result | Verification |
|---|---|---|---|---|---|
| `lcs3 --help` / `lcs3 help` | None | SRC-005 | None | Print command synopsis to stdout; exit 0. | CLI unit test and built subprocess. |
| `lcs3 --version` | None | SRC-004 | Package metadata | Print package version to stdout; exit 0. | CLI unit test and built subprocess. |
| `lcs3 init [--project-root <path>]` | Optional project root; default current working directory. Reject missing option value/unknown options. | SRC-003, SRC-041, SRC-046; FR-005; AC-001, AC-002 | `initProject(projectRoot)` | Create/validate `.lcs3/`; report created/kept paths; never import/read/mutate `.lcs/`. Failure writes diagnostic to stderr and exits nonzero. | Temp-project integration and subprocess; assert `.lcs3/` exists and `.lcs/` untouched. |
| `lcs3 task list [--project-root <path>]` | Optional project root; default current working directory. | SRC-005, SRC-017; FR-007, FR-009, FR-016; AC-011 | `listTasks(defaultStateDbPath(projectRoot))` | Read task-state rows from initialized LCS3 DB; print deterministic JSON to stdout. Missing/unopenable state fails with diagnostic on stderr/nonzero exit; no implicit init. | Empty/populated temporary DB integration and subprocess. |
| `lcs3 task create <task-id> [--project-root <path>]` | Required non-empty task ID; optional root as above. | SRC-005, SRC-007, SRC-017, SRC-019; FR-007, FR-009, FR-018 | `createTask(dbPath, taskId, "pending", manifestDir)` | Create one runtime task row; print resulting record as JSON. Duplicate/invalid/uninitialized project fails on stderr/nonzero exit; never initialize implicitly. | Create, duplicate, invalid-ID and no-implicit-init integration/subprocess tests. |
| `lcs3 task transition <task-id> <status> [--project-root <path>]` | Required task ID and target status; optional root as above. | SRC-005, SRC-007, SRC-019; FR-007, FR-009, FR-018; AC-006 | `transitionTask(dbPath, taskId, target, manifestDir)` | Perform only canonical lifecycle transition; print resulting record as JSON. Unknown task/status or illegal transition fails on stderr/nonzero exit. | Legal, illegal, terminal and unknown-task integration/subprocess tests. |
| `lcs3 task claim <task-id> --owner <worker-id> [--lease-seconds <positive-integer>] [--project-root <path>]` | Required task ID and owner; lease defaults to initialized project's validated `execution.lease_seconds`; root defaults to cwd. | SRC-005, SRC-007, SRC-024; FR-007, FR-009, FR-025; AC-012 | `claimTask(dbPath, taskId, owner, leaseSeconds, Date.now(), manifestDir)` | Atomically claim only an eligible `ready` task; print record as JSON. Invalid owner/lease, missing task or competing/live claim fails on stderr/nonzero exit. | Successful claim, invalid lease, missing task and duplicate/live claim integration tests. |

**Common behavior:** use Node's built-in `node:util.parseArgs`; JSON records use one line on stdout. Errors use one concise message on stderr and exit code 1. Help/version exit 0. Unknown command/subcommand, malformed arguments and missing required values exit 2. No implicit init, no color/progress output, and no raw `DatabaseSync`, SQL, or PRAGMA interface. User-facing behavior is a new CLI decision here, not a claim that PRD already specifies formatting or exit codes.

**Path safety:** resolve an explicit `--project-root` from the caller's cwd; reject empty root. Derive DB path using frozen `defaultStateDbPath(projectRoot)` and manifest directory as `<projectRoot>/.lcs3/manifests`. Do not add a `--db-path`/manifest override that bypasses project-root conventions or use `defaultManifestDir()` (which points at the runtime repository). Before task operations, require initialized config and valid canonical project manifests; initialization remains an explicit separate command. CLI may use a private helper for these checks but cannot change frozen runtime exports.

**Known gap:** remaining frozen modules' operations (including dependencies, conflict/scope, findings, retries, recipes, review, traceability/coverage, memory, telemetry and doctor) are not CLI commands in this scope. SRC-005 is closed only for the defined primary entry point plus stateful task create/list/transition/claim; these omitted operations remain follow-up work and must not be described as CLI-accessible. No `task ready` convenience command is added; the existing canonical transition API owns how a task becomes claimable.

## Task sequence

### CLI-1 — Freeze minimal command contract

**Files:** plan/decision artifact only; no runtime changes.

- Build a traceable table: command, arguments/options, requirement IDs, existing runtime function, path inputs, effects, expected success/failure behavior, and verification.
- Include `lcs3 init` and validate its behavior against AC-001/AC-002 and SRC-003/SRC-041. List any requested operation with no approved CLI mapping as an explicit gap, not as silently supported.
- Specify help/version, unknown-command, invalid-input, stdout/stderr, and exit-code behavior before coding. Do not claim these conventions are already in the PRD.
- Record packaging boundary: local invocation can be verified without changing package publication status; any publishability change requires separate owner approval.

**Gate:** user approved implementation plan; this bounded command inventory maps to explicit PRD IDs and frozen exports. Do not add commands unless an additional canonical requirement and existing frozen API justify them.

### CLI-2 — Implement parser and dispatch

**Files:** add the smallest CLI entry module under `src/` plus focused unit tests; modify `package.json` only if the approved invocation contract requires it.

- Parse argv with Node built-ins; dispatch only commands in CLI-1 matrix.
- Use existing frozen runtime exports directly from their modules. Keep `src/index.ts` unchanged and empty.
- Validate required paths/options at the CLI boundary; convert user-facing errors into the CLI-1 contract without swallowing runtime failures.
- Keep command handlers thin; no duplicate lifecycle, persistence, or validation rules in CLI.

**Tests:** parser/dispatch success, help, unknown command, invalid/missing arguments, runtime error propagation, and no unintended filesystem mutation.

### CLI-3 — Add executable package entry and initialization integration

**Files:** CLI entry/package metadata and integration tests, only as required by CLI-1.

- Wire executable `lcs3` entry to built output using package `bin` metadata if approved invocation requires it. Preserve `private: true` unless separately authorized.
- Exercise `lcs3 init` against a temporary project root; assert `.lcs3/` contents and verify no `.lcs/` creation, import, or mutation.
- Verify repeated init and failure behavior against existing `initProject` contract; do not invent idempotency guarantees if existing behavior/spec does not establish them.
- Ensure build output contains executable entry and package allowlist includes required output without shipping raw TypeScript or legacy reference material.

**Tests:** subprocess integration for init success/failure and packaging smoke test using `npm pack --dry-run`.

### CLI-4 — Traceability and release evidence

**Files:** `docs/operator-guide.md`, `docs/release-evidence.md`, `docs/lcs3-worker-task-plan.md`, generated AC coverage only if source evidence changes.

- Document only commands verified against built CLI.
- Update L3-058 exception and L3-060 exception #1 only when executable behavior, package invocation, and regression tests pass. Keep any remaining distribution limitation explicit.
- Re-run AC coverage generation and ensure SRC-005 evidence points to CLI tests; AC-003 remains namespace criterion and must not be described as CLI completion.

## Verification

Run smallest relevant checks first, then full gate:

```sh
npm run typecheck
npm run lint
npm test
npm pack --dry-run
```

Also run built CLI subprocess smoke tests for help, invalid invocation, and `lcs3 init` in a temporary fixture. Record actual output and confirm fixture contains `.lcs3/` but no `.lcs/` side effects. Re-run the full scenario suite after any CLI/package changes.

## Scope limits

- No change to `src/index.ts`, frozen module exports/signatures, storage schema, or GATE-05 text.
- No new production dependency, global publish, public package transition, or standalone binary distribution decision without explicit approval.
- Keep implementation tasks within existing worker budget (≤6 files and ≤400 LOC per task); split or escalate if verified scope exceeds it.

**Commit convention after reviewed implementation:** `feat(cli): add primary lcs3 command` with this plan path in commit body. Commit only if separately requested.
