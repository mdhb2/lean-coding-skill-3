---
name: lcs3-prd-reviewer
description: 'Use this skill whenever the user asks to review, harden, or security-check an existing PRD. Trigger on phrases like "review prd", "audit prd", "harden prd", "security review of prd". This skill aggressively looks for ambiguous acceptance criteria, missing tests, and missing Affected Areas / Files, and writes findings to prd-review.md. Do NOT trigger for: creating new PRDs (use lcs3-toprd), code review (use lcs3-code-review), task execution (use lcs3-task-executor), or brainstorming (use lcs3-explore).'
source: lcs-prd-reviewer (MIG-013, REWRITE)
modes: []
---

# LCS3 PRD Reviewer

## Purpose

Preserve: aggressive PRD hardening; ambiguity checks; AC/test/affected-area/security gaps; preservation review. No second PRD — approved changes applied to canonical prd.md.

## Trigger

Use when: user asks to review, harden, or security-check an existing PRD.

Do NOT use for: creating new PRDs (lcs3-toprd), code review (lcs3-code-review), task execution (lcs3-task-executor), or brainstorming (lcs3-explore).

## Workflow

1. Read the canonical PRD artifact from the active work-item.
2. Review for gaps: ambiguous acceptance criteria, missing tests, security/performance concerns, missing Affected Areas / Files.
3. Perform Preservation Check: prove every `SRC-###` from the PRD still exists in the review output. If removed, list under `## Intentionally Removed` with reason.
4. Write findings to `prd-review.md` via the artifact writer — this is a review artifact, NOT a second canonical PRD.
5. Approved reviewer changes are applied to the canonical `prd.md` by the invoking skill or agent — the reviewer itself does not rewrite the source PRD.
6. Update Review Notes: Last Reviewed, Summary, Changes Applied.
7. Emit Evidence report and hand off.

## Runtime calls

- `writeDerivedArtifact(projectRoot, ...)` — persist review findings (derived, not canonical).
- `validateArtifactContent(projectRoot, ...)` — validate review artifact structure.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.
- `emitFinding(manifestDir, ...)` — record findings for downstream traceability.

## Evidence report

- **Sources checked:** canonical PRD, active work-item context.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** preservation check passed; gaps identified; review artifact written.
- **Concise summary:** explicit pass/fail with confidence rating.

## Handoff

- **Upstream:** lcs3-toprd.
- **Downstream:** approved changes applied to canonical prd.md → then lcs3-tosrs or lcs3-task-slicer.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-013
- SRC: SRC-011, SRC-012, SRC-037, SRC-064, SRC-065, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
