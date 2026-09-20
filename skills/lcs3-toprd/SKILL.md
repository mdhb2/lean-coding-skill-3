---
name: lcs3-toprd
description: 'Use this skill whenever the user asks to produce a lean, implementation-focused PRD from exploration, debug notes, or direct requirements. Trigger on requests to "create PRD", "write PRD", "plan feature", or when user asks for acceptance criteria, test strategy, or technical approach. Prefer concise, developer-ready PRDs that include Affected Areas / Files to limit code reads.'
source: lcs-toprd (MIG-020, REWRITE)
modes: []
---

# LCS3 ToPRD

## Purpose

Preserve: lean implementation-focused PRD from explore/direct/debug requirements; stable SRC IDs preserved; AC/test strategy; affected areas; explicit open questions. Never invent missing normative NFRs.

## Trigger

Use when: user asks to create a PRD, write a PRD, plan a feature, or wants acceptance criteria, test strategy, or technical approach.

Do NOT use for: code review (lcs3-code-review), task execution (lcs3-task-executor), brainstorming (lcs3-explore), or PRD review (lcs3-prd-reviewer).

## Workflow

1. Read source artifacts: explore.md, debug.md, or direct user input. If research/ or wayfinder-map.md exist, fold validated findings.
2. Explore the repo to understand current codebase state. Use domain glossary vocabulary; respect existing ADRs.
3. Sketch major modules to build or modify. Identify deep modules testable in isolation.
4. Extract every user instruction, explicit constraint, and requirement bullet into `SRC-###` rows in the Source Requirement Ledger. Never collapse P0 requirements into summaries.
5. Preserve existing `SRC-###` IDs exactly — never renumber, replace, or reassign.
6. Write the PRD via the artifact writer with sections: Problem Statement, Background, Scope, User Stories, Source Requirement Ledger, Non-Goals, Requirements, Technical Approach, Affected Areas, Security/Performance Considerations, Acceptance Criteria, Test Strategy.
7. Emit Evidence report and hand off.

## Guardrail: never invent NFRs

Do not fabricate normative non-functional requirements (latency targets, throughput numbers, compliance claims) that were not explicitly stated by the user or derived from a verified source requirement.

## Runtime calls

- `writeCanonicalArtifact(projectRoot, ...)` — persist PRD artifact.
- `validateArtifactContent(projectRoot, ...)` — validate PRD structure.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.
- `getFinding(manifestDir, ...)` — read any reviewer findings from upstream review.

## Evidence report

- **Sources checked:** source artifacts (explore/debug/research), codebase signals.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** PRD written; SRC IDs preserved; NFRs not invented.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-explore, lcs3-debug, direct user input.
- **Downstream:** lcs3-prd-reviewer → then lcs3-tosrs or lcs3-task-slicer per adaptive route.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-020
- SRC: SRC-011, SRC-012, SRC-015, SRC-016, SRC-029, SRC-030, SRC-064, SRC-065, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
