---
name: lcs3-improve-architecture
description: 'Use this skill to analyze codebase features, identify duplicated concerns, and propose unified architecture improvement. Trigger on "improve architecture", "unify duplicated systems", "refactor architecture", "find duplication across features", "propose unified architecture", or before large refactoring efforts. Do NOT trigger for: new feature implementation, single-file refactoring, bug fixes, or routine code review.'
source: lcs-improve-architecture (MIG-009, REWRITE)
modes: []
---

# LCS3 Improve Architecture

## Purpose

Preserve: current-architecture analysis; duplicated-concern discovery; unified target proposal; migration implications; visual/structured explanation. Executable tasks must not bypass PRD/SRS gates.

## Trigger

Use when: user asks to improve architecture, unify duplicated systems, refactor architecture, find duplication across features, or propose unified architecture.

Do NOT use for: new feature implementation, single-file refactoring, bug fixes, or routine code review.

## Workflow

1. Confirm scope with user: specific directory, feature list, or full codebase.
2. Validate scope size (≤50 files; warn if exceeded, prompt confirmation).
3. Scan scope and identify logical features (group by responsibility).
4. Generate per-feature flowcharts (Mermaid `graph TD`).
5. Identify cross-feature duplicated concerns — each must cite ≥2 specific files with line references. Classify severity: High/Medium/Low.
6. Propose unified architecture diagram and consolidation plan.
7. **Executable tasks require PRD/SRS gating:** if the analysis produces implementation work, hand off to lcs3-toprd before task slicing — never bypass canonical planning gates.
8. Write architecture improvement artifact via the artifact writer.
9. Emit Evidence report and hand off.

## Runtime calls

- `writeCanonicalArtifact(projectRoot, ...)` — persist architecture analysis artifact.
- `validateArtifactContent(projectRoot, ...)` — validate artifact structure.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.

## Evidence report

- **Sources checked:** source files within scope, existing architecture docs, domain vocabulary.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** features identified; duplications cited; proposal produced.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-master (detour), standalone.
- **Downstream:** lcs3-toprd / lcs3-srs before slicing when work becomes implementation. Architecture analysis alone does not produce executable tasks.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-009
- SRC: SRC-028, SRC-029, SRC-032, SRC-064, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
