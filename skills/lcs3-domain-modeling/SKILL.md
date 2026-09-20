---
name: lcs3-domain-modeling
description: 'Use this skill to actively build and sharpen a project''s domain model. Trigger on phrases like "domain model", "what do we call this", "naming", "glossary", "ubiquitous language", "what does this term mean". Challenges fuzzy language, invents edge-case scenarios, writes glossary/ADRs. Do NOT trigger for: code changes, bug fixes, task execution, or architecture review.'
source: lcs-domain-modeling (MIG-007, REWRITE)
modes: []
---

# LCS3 Domain Modeling

## Purpose

Preserve: ubiquitous language; glossary; naming clarification; edge-case scenarios; domain decision capture; ADR candidate discovery.

## Trigger

Use when: user wants to define domain terms, clarify naming, build glossary, update domain vocabulary, or resolve ambiguous language.

Do NOT use for: code changes, bug fixes, task execution, architecture review, PRD creation, or debugging.

## Workflow

1. If a work-item is active, read its canonical artifacts for existing vocabulary context.
2. If `CONTEXT.md` exists at project root, load current domain terms.
3. Challenge user terminology against existing glossary — call out drift immediately.
4. Propose precise canonical terms for overloaded or fuzzy words.
5. Cross-reference codebase: surface contradictions between stated terms and actual implementation.
6. Update domain vocabulary inline when a term is resolved.
7. Create ADR candidate only when a decision is (a) hard to reverse, (b) surprising without context, or (c) results in a real trade-off.
8. Emit Evidence report and hand off.

## Runtime calls

- `writeCanonicalArtifact(projectRoot, ...)` — persist glossary or domain vocabulary artifact.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.
- `proposeCandidate(manifestDir, ...)` — create ADR candidate for significant decisions.

## Evidence report

- **Sources checked:** project root vocabulary files, active work-item canonical artifacts, codebase signals.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** domain terms updated; contradictions surfaced; ADR candidates created where warranted.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-explore, lcs3-toprd, lcs3-master (detour).
- **Downstream:** returns clarified vocabulary and decisions to invoking skill.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-007
- SRC: SRC-056, SRC-064, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
