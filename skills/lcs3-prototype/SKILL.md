---
name: lcs3-prototype
description: 'Use this skill to build throwaway code answering a specific design question. Trigger on "prototype", "proof of concept", "does this work", "throwaway", "quick test", "validate approach". Do NOT trigger for: production code (use lcs3-task-executor), research (use lcs3-research), or architecture review (use lcs3-codebase-doc).'
source: lcs-prototype (MIG-014, REWRITE)
modes: []
---

# LCS3 Prototype

## Purpose

Preserve: throwaway proof-of-concept answering one design question; evidence and conclusion recorded; prototype never silently becomes production.

## Trigger

Use when: user wants to validate an approach, build a proof of concept, test a design question, or create throwaway code.

Do NOT use for: production code (lcs3-task-executor), research (lcs3-research), architecture review (lcs3-codebase-doc), or implementation tasks.

## Workflow

1. Clarify the design question being answered.
2. Select approach branch: LOGIC (state/logic validation) or UI (visual/interaction validation).
3. Build the prototype — throwaway by design, trivial to run, no persistence by default.
4. Skip polish: no tests, no abstractions. Surface state after every action.
5. Validate the design question against the prototype evidence.
6. Record the decision: fold validated findings into the canonical planning flow (PRD/SRS). Prototype code stays throwaway — never silently promoted to production.
7. Emit Evidence report and hand off.

## Runtime calls

- `writeDerivedArtifact(projectRoot, ...)` — persist prototype evidence/conclusion (not canonical production artifacts).
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.

## Evidence report

- **Sources checked:** design question being validated, active work-item artifacts.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** prototype built; design question answered; decision captured.
- **Concise summary:** explicit pass/fail on the design question with confidence rating.

## Handoff

- **Upstream:** lcs3-explore, lcs3-research, lcs3-toprd (detour).
- **Downstream:** returns evidence/decision (not production code) to invoking skill.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-014
- SRC: SRC-032, SRC-035, SRC-064, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
