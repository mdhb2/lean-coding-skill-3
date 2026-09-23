# AC Coverage Report (derived, L3-057)

Covered ACs: 65/65; P0 SRCs traced: 37/37; failures: 0

| AC | SRCs | Evidence |
|---|---|---|
| AC-001 | SRC-003, SRC-046 | test/init.test.ts, test/scenarios/minimal.test.ts |
| AC-002 | SRC-046, SRC-041 | test/init.test.ts, test/scenarios/legacy.test.ts |
| AC-003 | SRC-004, SRC-005 | BLOCKED: SRC-005 CLI half unevidenced: no executable CLI exists (no bin entry, src/index.ts is a placeholder). Evidence covers the init/SRC-004 half only. Accepted exception per L3-060 RC approval 2026-09-20; see docs/release-evidence.md. |
| AC-004 | SRC-009, SRC-010 | test/manifests.test.ts, test/drift.test.ts |
| AC-005 | SRC-009, SRC-010 | test/drift.test.ts, test/manifests.test.ts |
| AC-006 | SRC-010, SRC-019 | test/transitions.test.ts, test/artifacts.test.ts |
| AC-007 | SRC-011 | docs/prd.md |
| AC-008 | SRC-012 | skills/lcs3-prd-reviewer/SKILL.md, docs/prd.md |
| AC-009 | SRC-013, SRC-015 | test/artifacts.test.ts |
| AC-010 | SRC-013, SRC-015, SRC-040 | test/scenarios/coverage.test.ts, test/scenarios/finalization.test.ts |
| AC-011 | SRC-017, SRC-018 | test/state.test.ts, test/db.test.ts |
| AC-012 | SRC-024 | test/claims.test.ts, test/concurrency.test.ts, test/scenarios/workers.test.ts |
| AC-013 | SRC-024 | test/claims.test.ts, test/scenarios/workers.test.ts |
| AC-014 | SRC-019 | test/transitions.test.ts |
| AC-015 | SRC-029, SRC-030 | test/router.test.ts, test/classification.test.ts, test/scenarios/planning.test.ts |
| AC-016 | SRC-029, SRC-030 | test/router.test.ts, test/scenarios/planning.test.ts |
| AC-017 | SRC-031 | test/scenarios/planning.test.ts |
| AC-018 | SRC-031 | test/scenarios/planning.test.ts |
| AC-019 | SRC-020, SRC-023 | test/autonomy.test.ts, test/scenarios/autonomy.test.ts |
| AC-020 | SRC-021, SRC-022 | test/retries.test.ts, test/attempts.test.ts, test/scenarios/autonomy.test.ts |
| AC-021 | SRC-021, SRC-022 | test/retries.test.ts, test/scenarios/autonomy.test.ts |
| AC-022 | SRC-022 | test/retries.test.ts, test/scenarios/autonomy.test.ts |
| AC-023 | SRC-023 | test/autonomy.test.ts, test/scenarios/autonomy.test.ts |
| AC-024 | SRC-025 | test/dependencies.test.ts, test/scenarios/workers.test.ts |
| AC-025 | SRC-025 | test/dependencies.test.ts, test/scenarios/workers.test.ts |
| AC-026 | SRC-025, SRC-026 | test/conflicts.test.ts, test/scenarios/workers.test.ts |
| AC-027 | SRC-025, SRC-027 | test/conflicts.test.ts, test/scenarios/workers.test.ts |
| AC-028 | SRC-028 | test/blast.test.ts, test/budget.test.ts, test/scenarios/workers.test.ts |
| AC-029 | SRC-032, SRC-033 | test/scenarios/finalization.test.ts |
| AC-030 | SRC-032, SRC-033 | test/scenarios/finalization.test.ts, test/provenance.test.ts |
| AC-031 | SRC-035 | test/provenance.test.ts, test/scenarios/finalization.test.ts |
| AC-032 | SRC-034 | test/scenarios/finalization.test.ts |
| AC-033 | SRC-037 | test/gates.test.ts, test/scenarios/finalization.test.ts |
| AC-034 | SRC-037 | test/gates.test.ts, test/scenarios/finalization.test.ts |
| AC-035 | SRC-038 | test/recipes.test.ts, test/scenarios/finalization.test.ts |
| AC-036 | SRC-039 | test/findings.test.ts, test/review-loop.test.ts, test/scenarios/finalization.test.ts |
| AC-037 | SRC-039 | test/findings.test.ts, test/scenarios/finalization.test.ts |
| AC-038 | SRC-039 | test/review-loop.test.ts, test/scenarios/finalization.test.ts |
| AC-039 | SRC-003, SRC-041 | test/scenarios/legacy.test.ts, test/legacy-import.test.ts |
| AC-040 | SRC-043, SRC-044 | test/legacy-import.test.ts, test/scenarios/legacy.test.ts |
| AC-041 | SRC-043 | test/legacy-import.test.ts, test/scenarios/legacy.test.ts |
| AC-042 | SRC-045 | test/legacy-import.test.ts |
| AC-043 | SRC-049, SRC-051 | test/quality.test.ts |
| AC-044 | SRC-051 | test/quality-ui.test.ts, test/quality.test.ts |
| AC-045 | SRC-047, SRC-048 | test/quality-code.test.ts, test/quality-security.test.ts |
| AC-046 | SRC-050 | test/quality-ui.test.ts, test/quality-code.test.ts, test/quality-security.test.ts |
| AC-047 | SRC-052, SRC-053 | test/memory.test.ts |
| AC-048 | SRC-054 | test/memory.test.ts |
| AC-049 | SRC-053, SRC-055 | test/memory.test.ts |
| AC-050 | SRC-057 | test/telemetry.test.ts |
| AC-051 | SRC-058 | test/telemetry.test.ts, test/improve.test.ts |
| AC-052 | SRC-059 | test/improve.test.ts, test/adr.test.ts |
| AC-053 | SRC-060 | test/doctor.test.ts, test/scenarios/doctor.test.ts |
| AC-054 | SRC-061 | package.json, test/drift.test.ts |
| AC-055 | SRC-061, SRC-062 | test/scenarios/minimal.test.ts, test/scenarios/planning.test.ts, test/scenarios/autonomy.test.ts, test/scenarios/workers.test.ts, test/scenarios/finalization.test.ts, test/scenarios/legacy.test.ts, test/scenarios/doctor.test.ts |
| AC-056 | SRC-009, SRC-010 | test/drift.test.ts, test/manifests.test.ts, test/config.test.ts |
| AC-057 | SRC-007, SRC-065 | docs/migration/skill-build-plan.md, test/state.test.ts, test/claims.test.ts |
| AC-058 | SRC-064 | docs/migration/skill-build-plan.md, skills |
| AC-059 | SRC-064 | test/quality.test.ts, docs/migration/skill-build-plan.md |
| AC-060 | SRC-001, SRC-066 | docs/legacy-skill-matrix.md, reference/legacy-lcs, test/scenarios/legacy.test.ts |
| AC-061 | SRC-067 | docs/legacy-skill-matrix.md |
| AC-062 | SRC-067 | docs/legacy-skill-matrix.md |
| AC-063 | SRC-069 | docs/legacy-skill-matrix.md |
| AC-064 | SRC-068 | docs/legacy-skill-matrix.md, docs/migration/skill-build-plan.md |
| AC-065 | SRC-002, SRC-066 | test/scenarios/legacy.test.ts, docs/legacy-skill-matrix.md |

No gaps beyond explicitly approved exceptions (AC-003) — every other AC has evidence, and every P0 SRC traces to tests/validation.
