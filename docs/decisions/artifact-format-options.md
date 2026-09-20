---
title: "L3-004 Artifact Format Decision Memo"
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
tags: [decision, artifact-format, okf, lcs3]
summary: "Options for LCS3 artifact format: independent vs OKF-compatible — obligations, collision risks, validator impact, recommendation."
source: "docs/prd.md"
related: ["reference/legacy-lcs/skills/lcs-shared/contract.md", "reference/legacy-lcs/skills/lcs-shared/templates/okf-schema.md"]
---

# L3-004 — Artifact Format Decision Memo

**Status:** proposal (requires GATE-02 approval)  
**Covers:** SRC-013..SRC-016, SRC-019; PRD Open Question 4  
**Inspected revision:** f35dd26 (reference/legacy-lcs, 2026-09-17T10:50:12Z)

## 1. Question

Does LCS3 define an independent artifact format or retain explicit OKF v0.2 compatibility with LCS3 extensions?

Current evidence: `docs/prd.md` already emits `format_version: "okf/0.2"` with LCS extensions (`artifact_type`, `source`, `cot_level`). Legacy LCS mandates OKF frontmatter on every artifact (`lcs-shared/contract.md` § OKF Frontmatter Schema, `templates/okf-schema.md`). Decision must be frozen before manifest/schema coding (GATE-02).

## 2. Options

### Option A — Independent LCS3 format (`lcs3/1.0`)

Define `format_version: "lcs3/1.0"` (or similar), own required field set, own validator. OKF treated as historical inspiration only; no compatibility claim. Legacy `format_version: "okf/0.2"` artifacts would be reference-only and explicitly non-conformant under new validator.

- Pros: full freedom to rename/trim fields; no upstream SPEC drift risk; single authority (manifests).
- Cons: breaks reuse of legacy validator/tooling; every consumer must learn new spec; migration cost for any OKF tooling; must re-document everything OKF already defines (authors, timestamps, title).

### Option B — Full OKF fidelity (strict OKF without LCS drift)

Adopt OKF v0.2 verbatim: only OKF required/recommended fields, no LCS extensions. LCS-specific metadata (artifact_type, cot_level, source) moves to body or separate sidecar YAML.

- Pros: maximal OKF interop; zero spec maintenance.
- Cons: loses machine-critical metadata that PRD requires as structured frontmatter (SRC-015 violations); forces parsers to scan body for IDs/relations; duplicates existing valid legacy pattern for no gain; breaks PRD PRD's own frontmatter (`artifact_type: prd`, `cot_level`).

### Option C — OKF-compatible core with explicit LCS3 extensions (hybrid)

Retain `format_version: "okf/0.2"` and all OKF required/recommended fields as defined in https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md, plus a documented, manifest-owned LCS3 extension namespace. This is the current de-facto state of both `docs/prd.md` and legacy `lcs-shared/contract.md`.

- Pros: reuses OKF as stable base; reuses `validate-okf.py` / `validate-traceability.py` logic; preserves SRC-015/016 (structured metadata + readable Markdown); minimal migration from legacy templates; explicit compatibility obligations can be codified in manifests.
- Cons: must manage extension discipline to avoid collision; must pin OKF version (v0.2) and handle upstream SPEC changes explicitly.

## 3. Compatibility obligations

If OKF compatibility is retained (Option C), obligations are:

1. Every canonical artifact file MUST start with YAML frontmatter delimited by `---`.
2. OKF required fields MUST be present and valid: `title` (string), `format_version` (`"okf/0.2"`), `authors` (non-empty list of `{type, name}`), `created` (ISO-8601), `updated` (ISO-8601).
3. OKF recommended fields (`tags`, `summary`, `status`, `related`) SHOULD be present; validator warns in `--strict`.
4. LCS3 extensions MUST NOT redefine OKF field semantics. Extension fields are additive.
5. `format_version` value is frozen to `"okf/0.2"` until GATE-02 explicitly approves a bump; upstream OKF bump requires ADR.
6. Artifact schema source of truth is the manifest directory (SRC-009/010), not scattered `SKILL.md` copies — manifests generate or validate templates.

Under Option A, obligations 1–2 are replaced by `lcs3/1.0` spec; legacy artifacts are explicitly out-of-scope for new validator.

## 4. Metadata collision risks

| Collision | Evidence | Risk if unaddressed | Mitigation |
|---|---|---|---|
| `type` vs `artifact_type` | Legacy `state.template.md` uses `type: state`; `task.template.md` has no `type`; `validate-okf.py` lists `type` under `LCS_RUNTIME` (recognized, not required) while `artifact_type` is under `LCS_REQUIRED`. `validate-traceability.py` comment: "`type` is intentionally NOT required ... `artifact_type` is the canonical type discriminator." | Two fields both claiming to be "type" → drift, duplicate lifecycle definition (violates SRC-010) | Canonicalize: `artifact_type` is the only artifact type discriminator. `type` is runtime/control alias allowed only where manifest explicitly permits (e.g., `state` artifact). All other artifacts MUST NOT emit `type`. Validator enforces. |
| `status` collision (artifact vs task) | OKF `status` lifecycle is `draft → reviewed → active → archived` (contract.md, okf-schema.md, VALID_STATUSES). Legacy `task.template.md` frontmatter uses `status: pending` — which `validate-okf.py` rejects (`VALID_STATUSES` excludes `pending`; fixture `invalid-bad-status.md` treats `pending` as error). Task execution status (SRC-019: must distinguish task execution status from artifact lifecycle status) is conflated if the same `status` field is used for both. | Task boards and artifact lifecycle share one enum → illegal comparisons, lost traceability, SRC-019 violation, AC-006/014 failures. | Separate fields: artifact lifecycle stays on OKF `status`. Task execution state uses distinct frontmatter field `task_status` (or `execution_status`) with its own enum, owned by manifest + SQLite runtime. Never reuse `status` for task execution. Migration: `pending` task values move to `task_status`. |
| Lifecycle separation (artifact vs work_item vs task) | `contract.md` 17.2 defines work_item registry `status: open/paused/archived/finalized` and work_item `phase`; artifact frontmatter `status` is separate; task execution status is third dimension. Legacy mixes prose `current_phase` with registry `phase`. | Single state machine trying to cover 3 dimensions → invalid transitions, multi-worker lease bugs | Three orthogonal state machines (see L3-005): artifact lifecycle (`status`), task execution (`task_status`), work-item container (`work_items[].status` + `phase`). Each has own enum and transition table; cross-field invariants checked by Doctor (SRC-060). |

## 5. Frontmatter requirements (normative for Option C)

Base OKF + LCS3 extensions, per artifact type:

| Field | Required | Applies to | Notes |
|---|---|---|---|
| `title` | yes | all | descriptive, quoted if contains `:` |
| `format_version` | yes | all | exactly `"okf/0.2"` |
| `authors` | yes | all | `[{type: human|agent, name, id?}]` |
| `created` | yes | all | ISO-8601 `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ` |
| `updated` | yes | all | ISO-8601; bumped on any mutation |
| `artifact_type` | yes | all | enum from registry (see §6); canonical discriminator |
| `source` | yes | all except `state` | relative path to upstream artifact; `state` uses `source: "runtime"` |
| `cot_level` | yes | all | `light | standard | strict | very_strict` |
| `tags` | recommended | all | warn in strict |
| `summary` | recommended | all | one sentence |
| `status` | recommended (required for canonical) | all canonical | OKF lifecycle `draft|reviewed|active|archived` |
| `related` | recommended | all | list of relative paths |
| `version` | optional | all | default `"1.0"` |
| `artifact_id` | optional | typed artifacts | `SRC-###`, `FR-###`, `TEST-###`, etc. per registry |
| `type` | forbidden except `state` | `state` only | legacy alias; new artifacts MUST NOT add `type` |
| `task_status` | yes for `task` | `task` | separate execution enum (defined in L3-005) |
| `blocked_by` | optional | `task`, `wayfinder` DEC | structured dependency edge |

Validation: `validate-okf.py` (+ strict) for frontmatter shape; `validate-traceability.py` for cross-artifact ID coverage; Doctor for lifecycle invariants.

## 6. Artifact type registry (approved subset continuing from legacy)

Canonical types remain those in `okf-schema.md` §2. No new types introduced in this memo. New capability → explicit requirement + GATE approval (SRC-069 guardrail).

| `artifact_type` | File(s) | CoT | Registry source |
|---|---|---|---|
| `prd` | `prd.md` | standard | okf-schema.md |
| `prd_enhanced` | `prd-enhanced.md` | strict | okf-schema.md |
| `srs`, `tests`, `api`, `db`, `traceability` | `srs.md`, `tests.md`, `api.md`, `db.md`, `traceability.md` | strict | okf-schema.md |
| `task_coverage` | `task-coverage.md` | strict | okf-schema.md |
| `task` | `task/task-###.md` | very_strict | okf-schema.md |
| `state` | `.lcs3/state.md` (LCS3 root TBD in L3-006) | standard | okf-schema.md |
| `final_doc`, `final_map`, `index` | `doc.md`, `map.md`, `index.md` | strict/standard | okf-schema.md |
| plus `explore`, `debug`, `code_review`, `wayfinder`, etc. | — | — | okf-schema.md (unchanged) |

No `lcs3-*` skill invents a new `artifact_type` without manifest entry.

## 7. Canonical vs derived marking

Required by SRC-013/014/034/035:

- Every artifact type is classified once in manifest: `canonical` or `derived`.
- Canonical: `prd`, `srs`, `api`, `db`, `task` (spec), `state` (pointer/registry). Human-authored, reviewed, versioned.
- Derived: `traceability`, `task_coverage`, `task-coverage.md` views, Context Capsules, indexes over imported legacy docs (FR-049), telemetry aggregates. Regenerable from canonical structured relations.
- Marking mechanism: manifest field `authority: canonical | derived` + frontmatter `derived_from` / `provenance` block for derived files (upstream hashes/timestamps). Derived files MUST NOT be treated as authority; staleness detected via `provenance` vs upstream `updated` (FR-039/040).
- Validation: derived file present without canonical source → warn; canonical file generated by runtime → error.

## 8. Validator implications

- Keep `validate-okf.py` as primary frontmatter validator: extend `VALID_ARTIFACT_TYPES` and `VALID_STATUSES` from manifests (do not hardcode drift). `task_status` validated by separate task-lifecycle validator.
- Fix legacy bug: `task.template.md` `status: pending` → migrate to `status: draft` (artifact) + `task_status: pending` (execution). Existing fixtures with `pending` become invalid and must be updated — validator change lands with manifest freeze (GATE-02).
- `validate-traceability.py`: unchanged logic but consumes manifest `artifact_type` registry; enforces `Chain of Truth Report before Handoff` and ID preservation.
- New: manifest-driven validator (`manifest validate`) becomes gate before `validate-okf.py` to catch duplicate contract definitions (SRC-010/011 drift prevention).

## 9. Recommendation

**Option C — OKF-compatible core with explicit LCS3 extensions, with the collision fixes in §4–§5.**

Evidence:
- `docs/prd.md` and every legacy template already conform to OKF v0.2 + LCS extensions; Option C is the least-churn path that preserves validator reuse and human readability (SRC-016).
- SRC-015 requires structured metadata — Option B removes it from frontmatter, violating test seam assumptions (FR-044, AC-005).
- SRC-009/010 require single canonical manifest directory — Option C expresses this without redefining OKF base; Option A would force wholesale re-documentation for no behavioral gain.
- Collision fixes (`artifact_type` canonical, `type` restricted, `task_status` split, three-state-machine separation) are the actual design work; format label is secondary.

This memo does not change manifests/schemas — it proposes the position for GATE-02 to freeze.

## 10. Decision needed at GATE-02

- Approve Option C and the field table in §5.
- Freeze `format_version: "okf/0.2"` and base metadata set before artifact-schema coding.
- Approve canonical/derived classification mechanism (§7) and `task_status` separation (detail frozen in L3-005 / GATE-03).
- Direct manifest to be sole source for `VALID_ARTIFACT_TYPES`, `VALID_STATUSES`, and `task_status` enum.

## References

- `docs/prd.md` §§5 (SRC-013..016,019), 7.5, 8.1, 10, 16 Q4
- `reference/legacy-lcs/skills/lcs-shared/contract.md` (OKF schema, folder conventions, Chain of Truth)
- `reference/legacy-lcs/skills/lcs-shared/templates/okf-schema.md` (registry, lifecycle, validation checklist)
- `reference/legacy-lcs/skills/lcs-shared/scripts/validate-okf.py` (VALID_STATUSES, LCS_RUNTIME, TIMESTAMP_RE, artifact_type checks)
- `reference/legacy-lcs/skills/lcs-shared/templates/task.template.md` (`status: pending` anomaly)
- `docs/legacy-skill-matrix.md` / `docs/migration/legacy-skill-matrix.md` (GATE-01 boundary; no new artifact_type without SRC)
