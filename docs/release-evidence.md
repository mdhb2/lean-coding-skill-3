# L3-060 Release Gate Evidence (2026-09-20)

Assembler: CHEAP_WORKER. Decision owner: SMART_GATE + HITL.
Recommendation was **BLOCK** — not RC-ready (2 failing items below).
**Decision (2026-09-20, owner/HITL): APPROVE RC with accepted exceptions**
(SRC-005 CLI gap, GATE-05 draft, AC-003 overstatement, uncommitted Phase 5-7 files).
Every claim re-verified this task; commands and sources given.

## 1. Full scenario suite — PASS

- `npm test` (build + `node --test dist/test/**/*.test.js`): **283/283 pass**, 50 suites, 0 fail.
- `npm run typecheck`: clean. `npm run lint`: clean. `node --version`: v22.23.2 (engines `>=22`).

## 2. P0 implementation gaps — FAIL (1 open)

- **SRC-005 (P0)** — "deterministic runtime operations through one primary CLI": **unresolved**.
  No CLI exists: `package.json` has no `bin`; `src/index.ts` is `export {};`;
  grep over `src/*.ts` for `process.argv|process.exit(|env node|commander|yargs` → no matches.
- Knock-on: **AC-003** (covers SRC-004/SRC-005) was **non-probative for the CLI half** —
  listed evidence files exist (path check passes) but no executable CLI behavior exists.
  Fixed 2026-09-20 (owner item #4): AC-003 now carries an explicit BLOCKED exception in
  `src/ac-coverage.ts` (pinned by `test/scenarios/coverage.test.ts`), and regenerated
  `docs/ac-coverage.md` shows `BLOCKED: SRC-005 CLI half unevidenced...` with the footer
  reading "No gaps beyond explicitly approved exceptions (AC-003)". The gap itself (no CLI) remains.
  Footer wording fixed 2026-09-23 (`renderAcCoverage` names the blocked AC explicitly;
  regenerated `docs/ac-coverage.md`; typecheck 0, lint 0, `npm test` 284/284).
- L3-058 recorded this as PARTIAL with the remainder escalated here.

## 3. Mandatory Smart Gates — FAIL (1 open)

- GATE-01 (matrix), GATE-02 (artifact format), GATE-03 (lifecycle), GATE-04 (storage
  boundary): **APPROVED** (plan lines 156–232).
- **GATE-05 (runtime public contract freeze): NOT approved** — section at plan line 631
  carries no APPROVED marker; still draft, retro-approval pending per owner instruction.

## 4. Migration matrix + skill-family coverage — PASS

- GATE-01 approved; `docs/migration/skill-build-plan.md`: disposition 23/23.
- `skills/`: 18 `lcs3-*` dirs, each with `SKILL.md`; `test/scenarios/packaging.test.ts`
  asserts the 18 registry names in `.lcs3/manifests/skills.yaml` match `skills/` dirs exactly.
- `validateManifests('.lcs3/manifests')` on the repo root: `[]` (re-ran this task).

## 5. Doctor on release fixture — PASS

- `runDoctor` on empty release-fixture snapshot (legal/terminal states from canonical
  lifecycle enum): `[]` (re-ran this task against `dist/`).
- Populated healthy/unhealthy snapshots covered by `test/scenarios/doctor.test.ts` 10/10
  (all 8 `doc-*` codes fire; determinism).

## 6. Legacy reference read-only / non-runtime — PASS

- `git status`: nothing under `reference/` modified (re-checked this task).
- Only-Markdown-outside-`.lcs/`/`.lcs3/` import gate (`resolveEligibleLegacySource`)
  covered by `test/scenarios/legacy.test.ts` 5/5; runtime `dependencies` = `js-yaml` only.

## 7. No automatic self-modification path — PASS

- `src/improve.ts`: imports only `provenance.js` + `TelemetryEvent` type; no
  fs/SQLite/exec/apply imports; module header states proposals change nothing by itself.
- Memory/telemetry are advisory stores; promotion is explicit (operator guide § authority model).

## 8. Release docs match behavior — PASS (with pinned gap)

- `docs/operator-guide.md` states plainly that **no runnable `lcs3` CLI exists**
  (no `bin`, programmatic `initProject`), install = clone + `npm ci` + `npm run build`.
- `test/scenarios/docs.test.ts` 3/3 pins doc facts (8 topics, 8 real `DOCTOR_CODES`,
  no global-install/`lcs3 <cmd>` documented).

## 9. Release hygiene notes (for HITL)

- Working tree is **dirty**: Phase 5–7 work uncommitted (owner commit decision pending);
  an RC cannot be cut from this tree as-is. `thoughts/ledgers/*` session files also
  untracked — decide whether they belong in the release tarball scope.
- `npm pack --dry-run` allowlist (`dist/, skills/, docs/, READMEs`) verified by
  `test/scenarios/packaging.test.ts` 5/5, but `dist/` is gitignored build output —
  publish flow must build before pack.

## Conditions for re-review

1. Implement primary CLI per SRC-005 (bin + argv routing over frozen module surface).
2. Repair AC-003 evidence to exercise the real CLI; regenerate `docs/ac-coverage.md`.
3. SMART_GATE approves GATE-05 (unblocks the freeze the CLI must conform to).
4. Commit release tree; re-run this gate green.
