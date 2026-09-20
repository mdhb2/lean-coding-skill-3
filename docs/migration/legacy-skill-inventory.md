---
title: "LCS3 Legacy Skill Inventory"
artifact_type: legacy-skill-inventory
status: factual
legacy_repository: "mdhb2/lean-coding-skills"
legacy_branch: "master"
legacy_revision: "f35dd2629f4efcd204987bb99c3f13b82990f463"
legacy_version: "2.8.0"
snapshot_path: "reference/legacy-lcs"
inventory_date: "2026-09-20"
total_entrypoints: 23
---

# Legacy Skill Inventory — Pinned Revision f35dd26

Factual inventory of every legacy `SKILL.md` at pinned revision. No disposition decision. Satisfies L3-002 (SRC-067/068/069, AC-061/062).

Verify: `find reference/legacy-lcs/skills -name "SKILL.md" | wc -l` == rows below (23).

## INV-001 — lcs-chain-of-truth

- **Path:** `reference/legacy-lcs/skills/lcs-chain-of-truth/SKILL.md`
- **Purpose:** Meta-skill protocol, auditable evidence chain injected into other skills. Not standalone flow.
- **Workflow neighbors:** All skills (cross-cutting). Referenced by code-review, debug, doc-finalizer, explore, task-executor etc. via `lcs-shared/contract.md`.
- **State/runtime assumptions:** No direct `.lcs/state.md` mutation. Depends on `skills/lcs-shared/contract.md` OKF frontmatter, report templates. Chain-of-Truth levels Light/Standard/Strict/Very Strict.
- **Reference files:** `references/protocol.md`, `templates/truth-report-light.md`, `truth-report-standard.md`, `truth-report-strict.md`, `truth-report-very-strict.md`

## INV-002 — lcs-code-review

- **Path:** `reference/legacy-lcs/skills/lcs-code-review/SKILL.md`
- **Purpose:** Review code after task-executor against Explore/PRD/SRS/task artifacts. Output structured review report, not patch.
- **Workflow neighbors:** Upstream `lcs-task-executor` → review → `FIX-###` → executor loop → `lcs-doc-finalizer`. References `lcs-shared/contract.md`.
- **State/runtime assumptions:** Reads `.lcs/state.md` to locate active work-item; reads task artifacts diff; writes review report under `.lcs/work-items/{ts}-{slug}/`. OKF frontmatter required.
- **Reference files:** `assets/code-review-template.md`, `references/gotchas-anti-patterns.md`, `references/output-format.md`, `references/what-to-review.md`

## INV-003 — lcs-codebase-doc

- **Path:** `reference/legacy-lcs/skills/lcs-codebase-doc/SKILL.md`
- **Purpose:** Map existing repository into evidence-based docs (architecture, structure, concerns). Three modes: Quick Update / Standard Refresh / Rebuild Docs.
- **Workflow neighbors:** Standalone or feed explore/PRD/SRS/context. Related to `lcs-onboarding` (duplicated scan mechanics).
- **State/runtime assumptions:** Outputs to `.lcs/codebase/` (7 docs) + reads `.lcs/docs/`. Mode selection required before scan. Uses `scripts/scan.py`.
- **Reference files:** `agents/openai.yaml`, `assets/templates/{ARCHITECTURE,CONCERNS,CONVENTIONS,INTEGRATIONS,STACK,STRUCTURE,TESTING}.md`, `references/inquiry-checkpoints.md`, `references/stack-detection.md`, `scripts/scan.py`

## INV-004 — lcs-debug

- **Path:** `reference/legacy-lcs/skills/lcs-debug/SKILL.md`
- **Purpose:** Focused bug investigation. Ask one question at a time, write `debug.md` + fix plan before any fix.
- **Workflow neighbors:** Trigger on bug/failing test. Writes `debug.md` → then `lcs-task-executor` or re-derive PRD. References `lcs-explore`, `lcs-code-review`.
- **State/runtime assumptions:** Writes `.lcs/work-items/{ts}-{slug}/debug.md` with OKF frontmatter. Updates `.lcs/state.md`. Depends on `lcs-shared/contract.md` writing safety.
- **Reference files:** `SKILL.md` only (no bundled references)

## INV-005 — lcs-debug-ext

- **Path:** `reference/legacy-lcs/skills/lcs-debug-ext/SKILL.md`
- **Purpose:** Report-only debugging, evidence-based diagnosis, patch proposal without applying code changes. Distinct from `lcs-debug`.
- **Workflow neighbors:** May hand off to `lcs-research`, PRD, or task execution. Uses `-debug-ext` suffix folder to stay separate from `lcs-debug`.
- **State/runtime assumptions:** Outputs to `.lcs/work-items/{ts}-{slug}-debug-ext/debug.md` only. Never mutate source/tests. `Changes applied: None`.
- **Reference files:** `agents/openai.yaml`, `evals/evals.json`, `references/debug-workflow.md`, `references/hypothesis-checklist.md`, `references/patch-proposal-format.md`, `references/report-template.md`, `scripts/hitl-loop.template.sh`

## INV-006 — lcs-doc-finalizer

- **Path:** `reference/legacy-lcs/skills/lcs-doc-finalizer/SKILL.md`
- **Purpose:** Finalize completed work into `map.md` + `doc.md`, recommend commit/PR, archive source work-item.
- **Workflow neighbors:** Terminal step after tasks done + review PASS. `lcs-doc-finalizer` moves `.lcs/work-items/{ts}-{slug}/` → `.lcs/archive/` and generates `.lcs/docs/{ts}-{slug}/`.
- **State/runtime assumptions:** Requires all tasks done, reads `.lcs/state.md` current_work, manual folder move/delete, non-atomic finalization, updates docs-index.
- **Reference files:** `SKILL.md` only

## INV-007 — lcs-domain-modeling

- **Path:** `reference/legacy-lcs/skills/lcs-domain-modeling/SKILL.md`
- **Purpose:** Build/sharpen domain model, ubiquitous language, glossary, challenge fuzzy naming, invent edge cases, write ADR candidates.
- **Workflow neighbors:** Standalone or detour from explore/PRD/SRS/master. Feeds clarified vocabulary into planning.
- **State/runtime assumptions:** Writes `CONTEXT.md` + `docs/adr/XXXX-decision.md` at project root (shared across work-items, overrides timestamped convention). Reads `.lcs/state.md` + existing CONTEXT.md.
- **Reference files:** `SKILL.md` only

## INV-008 — lcs-explore

- **Path:** `reference/legacy-lcs/skills/lcs-explore/SKILL.md`
- **Purpose:** Explore/brainstorm/clarify idea before PRD. Ideation only, not execution.
- **Workflow neighbors:** Entry planning skill → `lcs-toprd`. May detour to `lcs-research`, `lcs-prototype`, `lcs-domain-modeling`, `lcs-wayfinder`.
- **State/runtime assumptions:** Writes explore artifact under `.lcs/work-items/{ts}-{slug}/` with OKF frontmatter. Reads `.lcs/state.md` if exists. Chain of Truth Light.
- **Reference files:** `references/interview-protocol.md`

## INV-009 — lcs-improve-architecture

- **Path:** `reference/legacy-lcs/skills/lcs-improve-architecture/SKILL.md`
- **Purpose:** Analyze codebase features, find duplicated concerns, propose unified refactoring with visual plan + task breakdown.
- **Workflow neighbors:** Standalone or before large refactor. Proposed output feeds `lcs-task-slicer` (legacy bypasses PRD/SRS).
- **State/runtime assumptions:** Reads codebase, writes `architecture-improvement.md` with OKF frontmatter under `.lcs/work-items/{ts}-{slug}/`. Reads `.lcs/state.md`.
- **Reference files:** `SKILL.md` only

## INV-010 — lcs-master

- **Path:** `reference/legacy-lcs/skills/lcs-master/SKILL.md`
- **Purpose:** Single entry router/orchestrator over 21 skills, on-ramp detection, confirmation/autopilot modes, multi-workitem switch/resume/reconciliation, decision log.
- **Workflow neighbors:** Top-level router over all skills. Enforces shared contract handoff, routes to correct `lcs-*` skill.
- **State/runtime assumptions:** Reads/creates `.lcs/state.md` with two-level registry (`current_work` + `work_items` map), precondition checks, idempotent reconciliation, legacy single-workitem migration.
- **Reference files:** `SKILL.md` only

## INV-011 — lcs-new

- **Path:** `reference/legacy-lcs/skills/lcs-new/SKILL.md`
- **Purpose:** Register blank work item without creating explore/PRD/SRS/task/code artifacts.
- **Workflow neighbors:** Optional first step before any planning. Creates registry entry that later skills consume.
- **State/runtime assumptions:** Creates/updates `.lcs/state.md` registry entry `{timestamp}-{slug}` with `title/path/phase/status/created_at/updated_at`. No artifact inside work-item dir.
- **Reference files:** `SKILL.md` only

## INV-012 — lcs-onboarding

- **Path:** `reference/legacy-lcs/skills/lcs-onboarding/SKILL.md`
- **Purpose:** Generate developer onboarding docs for existing running project (architecture, entrypoints, setup/run/test).
- **Workflow neighbors:** Standalone discovery, may feed `lcs-codebase-doc` or planning. Read-only, no code changes.
- **State/runtime assumptions:** Writes flat singletons `.lcs/work-items/onboarding.md` + `onboarding-map.md` (no timestamp folder, overwritten each run). Reads repo config files.
- **Reference files:** `SKILL.md` only

## INV-013 — lcs-prd-reviewer

- **Path:** `reference/legacy-lcs/skills/lcs-prd-reviewer/SKILL.md`
- **Purpose:** Review/harden PRD, check ambiguous AC, missing tests, missing Affected Areas/Files, write `prd-enhanced.md`.
- **Workflow neighbors:** `lcs-toprd` prd.md → reviewer → `prd-enhanced.md` → `lcs-tosrs`/slicer. Does not implement.
- **State/runtime assumptions:** Reads `.lcs/state.md` to find active work-item, reads `prd.md`, writes `prd-enhanced.md` with OKF frontmatter in same dir.
- **Reference files:** `SKILL.md` only

## INV-014 — lcs-prototype

- **Path:** `reference/legacy-lcs/skills/lcs-prototype/SKILL.md`
- **Purpose:** Build throwaway code to answer specific design question (POC, validate approach).
- **Workflow neighbors:** Detour from explore/research/PRD/SRS. Returns evidence/conclusion, not production code.
- **State/runtime assumptions:** Writes prototype artifact under `.lcs/work-items/{ts}-{slug}/` with OKF frontmatter. Isolated/sandbox assumption, cleanup ambiguous.
- **Reference files:** `SKILL.md` only

## INV-015 — lcs-research

- **Path:** `reference/legacy-lcs/skills/lcs-research/SKILL.md`
- **Purpose:** Investigate question against high-trust primary sources, capture cited Markdown findings.
- **Workflow neighbors:** Detour from explore/debug/PRD/SRS/master. Returns `research/<topic>.md`.
- **State/runtime assumptions:** Reads `.lcs/state.md`, writes research artifact with OKF frontmatter, provenance/source metadata required.
- **Reference files:** `SKILL.md` only

## INV-016 — lcs-self-improvement

- **Path:** `reference/legacy-lcs/skills/lcs-self-improvement/SKILL.md`
- **Purpose:** Analyze conversation/history friction patterns, recommend improvements. Proposals only, never auto-apply.
- **Workflow neighbors:** Triggered explicitly or after evidence thresholds. Proposal → ADR/task via separate workflow. Excluded from `lcs-doc-finalizer` archive.
- **State/runtime assumptions:** Writes `.lcs/docs/self-improvements/{timestamp}-analysis.md` + `state.json` + `index.md` with OKF frontmatter (`self_improvement`/`index`). Diagnostic-only, state tracking pending/applied/rejected.
- **Reference files:** `agents/openai.yaml`, `references/analysis-checkpoints.md`, `references/improvement-targets.md`, `references/report-template.md`

## INV-017 — lcs-shared

- **Path:** `reference/legacy-lcs/skills/lcs-shared/SKILL.md` + `contract.md`
- **Purpose:** Shared coding workflow contract, folder conventions, OKF frontmatter schema, token-optimization. Internal resource, not self-applied.
- **Workflow neighbors:** Framework-wide dependency, consumed by all 22 other skills via `../lcs-shared/contract.md` import. Chain of Truth Meta level.
- **State/runtime assumptions:** Defines `.lcs/work-items/{ts}-{slug}/` convention, multi-workitem registry, OKF 8-field schema, 28-type artifact registry, writing safety (content-first/write-second/one-artifact-per-step), Handoff format. Legacy `.lcs/` paths.
- **Reference files:** `contract.md`, `evals/routing-eval.json`, `scripts/validate-okf.py`, `scripts/validate-traceability.py`, `scripts/validate-traceability.ps1`, `templates/` (+ state.template.md)

## INV-018 — lcs-task-executor

- **Path:** `reference/legacy-lcs/skills/lcs-task-executor/SKILL.md`
- **Purpose:** Execute single `task-###.md`, Normal vs TDD mode, update status to done/blocked, evidence + verification.
- **Workflow neighbors:** Upstream `lcs-task-slicer` task graph → executor → `lcs-code-review` targeted gate → review-fix loop. Reads dependencies.
- **State/runtime assumptions:** Reads `.lcs/state.md`, checks dependencies, updates task frontmatter + `.lcs/state.md`, bounded retry, Very Strict. Manual claim/lease/state edits.
- **Reference files:** `SKILL.md` only

## INV-019 — lcs-task-slicer

- **Path:** `reference/legacy-lcs/skills/lcs-task-slicer/SKILL.md`
- **Purpose:** Split reviewed PRD/SRS (`srs.md` or `prd-enhanced.md`/`prd.md`) into small dependency-aware tracer-bullet task files `task/task-###.md`, classify AFK/HITL.
- **Workflow neighbors:** Reviewed PRD/SRS → slicer → task graph → executor. Present breakdown for user feedback before writing.
- **State/runtime assumptions:** Reads `.lcs/state.md` active work-item, writes `task-###.md` + `task-coverage.md` with OKF frontmatter under `.lcs/work-items/{ts}-{slug}/task/`.
- **Reference files:** `SKILL.md` only

## INV-020 — lcs-toprd

- **Path:** `reference/legacy-lcs/skills/lcs-toprd/SKILL.md`
- **Purpose:** Produce lean implementation-focused PRD (`prd.md`) from explore/debug/direct requirements, with AC/test strategy/affected files.
- **Workflow neighbors:** Explore/direct → toprd → `lcs-prd-reviewer` → `lcs-tosrs`/slicer. Synthesizes without interviewing.
- **State/runtime assumptions:** Reads `.lcs/state.md`, `explore.md`/`debug.md`/`prd-enhanced.md`, writes `prd.md` with OKF frontmatter. Affected Areas/Files required to limit reads.
- **Reference files:** `SKILL.md` only

## INV-021 — lcs-tosrs

- **Path:** `reference/legacy-lcs/skills/lcs-tosrs/SKILL.md`
- **Purpose:** Transform PRD (`prd-enhanced.md` or `prd.md`) into deterministic SRS (`srs.md`, `tests.md`, optional `api.md`/`db.md`), reduce ambiguity for AI implementation.
- **Workflow neighbors:** Reviewed PRD → SRS → `lcs-task-slicer`. Owns `srs.md/tests.md/api.md/db.md/traceability.md`, not task files.
- **State/runtime assumptions:** Reads `.lcs/state.md`, writes 5 output types with OKF frontmatter under `.lcs/work-items/{ts}-{slug}/`.
- **Reference files:** `SKILL.md` only

## INV-022 — lcs-wayfinder

- **Path:** `reference/legacy-lcs/skills/lcs-wayfinder/SKILL.md`
- **Purpose:** Plan huge chunks with shared map + decision tickets, incremental navigation for large refactors.
- **Workflow neighbors:** Optional detour from master/explore/architecture/SRS for huge work. Returns map/decisions before slicing.
- **State/runtime assumptions:** Writes map + child tickets in `.lcs/work-items/{ts}-{slug}/wayfinder-tickets/` with YAML `blocked_by`, OKF status lifecycle `draft|reviewed|active|archived`.
- **Reference files:** `SKILL.md` only

## INV-023 — lcs-wizard

- **Path:** `reference/legacy-lcs/skills/lcs-wizard/SKILL.md`
- **Purpose:** Generate interactive bash scripts for HITL manual procedures (infra setup, migrations, deployments).
- **Workflow neighbors:** Standalone/HITL detour from executor/ops task. Human must run script manually. Audit trail.
- **State/runtime assumptions:** Output to project `scripts/<name>-wizard.sh` (override timestamped convention). Reads `.lcs/state.md` if present.
- **Reference files:** `SKILL.md`, `template.sh`

---

## Coverage Proof

- Entrypoints found: `find reference/legacy-lcs/skills -name "SKILL.md" | wc -l` → 23
- Inventory rows: 23 (INV-001..INV-023)
- Source pin: `f35dd2629f4efcd204987bb99c3f13b82990f463` (see `reference/README.md`)
- No disposition — factual only. Migration decisions belong to `docs/migration/legacy-skill-matrix.md` (GATE-01).

## Notes

- `reference/legacy-lcs/skills/agents.md` is not a skill (no `SKILL.md`), excluded.
- `lcs-shared` counted once despite being framework contract; counted because `package.json` lists it as skill 23 and it has `SKILL.md`.
- Duplicate/ambiguous identity: none. Each dir `lcs-*` maps 1:1 to package.json entry.
- Hidden generated skills: not found at this revision.

## Verify Commands

```bash
find reference/legacy-lcs/skills -name "SKILL.md" | sort
find reference/legacy-lcs/skills -name "SKILL.md" | wc -l  # expect 23
grep -c "^## INV-" docs/migration/legacy-skill-inventory.md  # expect 23
```
