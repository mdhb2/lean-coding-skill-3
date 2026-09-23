# L3-060 Release Gate Evidence

## Decision history

- **2026-09-20:** owner/HITL approved RC with accepted exceptions after worker recommendation BLOCK. The accepted exceptions covered missing CLI, pending GATE-05 approval, AC-003 coverage wording, and uncommitted Phase 5-7 changes. This records that historical decision; this follow-up does not constitute a new RC approval.
- **2026-09-23 follow-up:** CLI implementation and evidence below close the scoped CLI exception. GATE-05 approval and historical AC-003 footer correction remain documented in the worker plan. The current feature worktree is intentionally uncommitted; no commit or release cut was requested.

## CLI follow-up evidence (2026-09-23)

- `src/cli.ts` implements the approved command matrix in `thoughts/shared/plans/2026-09-23-lcs3-primary-cli.md`: help/version, explicit init, and task list/create/transition/claim. It uses existing frozen runtime APIs; `src/index.ts` remains `export {}`.
- `test/scenarios/cli.test.ts`: 4/4 subprocess scenarios pass, including init idempotency, preservation of a legacy `.lcs/` sentinel, task lifecycle/claim operations, and rejection of invalid or pre-init operations without unintended DB creation.
- `package.json` maps local `lcs3` bin to `./dist/src/cli.js` and remains `private: true`. No global installation or publication is supported or claimed.
- `npm pack --dry-run` succeeds: `lcs3@0.1.0`, 374 files, includes `dist/src/cli.js`, 255.3 kB. `test/scenarios/packaging.test.ts` passes 5/5.
- `AC-003` remains the PRD's namespace-isolation criterion. Its generated evidence row now includes package metadata, CLI/packaging scenarios, and init test. This row does not by itself claim that every runtime operation is exposed through CLI.
- CLI scope is bounded by the approved plan: remaining frozen module operations (dependencies, conflicts/scope, findings, retries, recipes, review, traceability/coverage, memory, telemetry, and doctor) are not CLI commands. Do not describe them as CLI-accessible.

## Verification

- `npm test`: **288/288 pass**, 51 suites, 0 failures. Node may print its experimental SQLite warning.
- `npm run typecheck`: pass, no diagnostics.
- `npm run lint`: pass, no diagnostics.
- `npm pack --dry-run`: pass; package contents above.
- Focused CLI subprocess suite: **4/4 pass**. Operator-guide scenario: **3/3 pass**. Packaging scenario: **5/5 pass**.
- `docs/ac-coverage.md` regenerated from `renderAcCoverage`; current sweep reports 65/65 ACs, 37/37 P0 SRCs traced, zero failures, zero blocked exceptions.

These checks verify the scoped implementation and current repository evidence. They do not replace a new owner/HITL release decision or establish that the uncommitted feature worktree is a release artifact.
