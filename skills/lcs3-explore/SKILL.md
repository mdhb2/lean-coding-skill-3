---
name: lcs3-explore
description: 'Use this skill whenever the user needs to explore, brainstorm, clarify, or shape a coding idea before a PRD or implementation. Trigger on requests mentioning explore, brainstorm, evaluate options, compare trade-offs, feasibility, or ask for recommended direction. Use this skill even when the user does not explicitly ask for a PRD but wants options or trade-off analysis. Do NOT trigger for: PRD writing (use lcs3-toprd), task slicing (use lcs3-task-slicer), code review (use lcs3-code-review), bug investigation (use lcs3-debug), or implementation (use lcs3-task-executor).'
source: lcs-explore (MIG-008, REWRITE)
modes: []
---

# LCS3 Explore

## Purpose

Preserve: adaptive structured exploration; 3-question rounds; level selection; trade-offs; stable source decisions; PRD readiness; user decisions preserved.

## Trigger

Use when: user needs to explore, brainstorm, clarify, or shape a coding idea before a PRD or implementation.

Do NOT use for: PRD writing (lcs3-toprd), task slicing (lcs3-task-slicer), code review (lcs3-code-review), bug investigation (lcs3-debug), or implementation (lcs3-task-executor). Explore is for ideation only, not execution.

## Workflow

1. Establish a concise work name from user intent.
2. Assess topic complexity. Recommend an Explore Level: Easy / Medium / Hard / Auto.
3. Let the user choose the level. If mismatch with recommendation, explain and ask to confirm or switch — never override.
4. Run interview: ask **3 related high-value questions per round**.
5. After each round: interpret answers, separate resolved decisions from unresolved questions, provide 1–3 line recap, update remaining uncertainty and approximate progress.
6. Continue until: work is PRD-ready, question budget is reached, or a blocker prevents responsible progress.
7. At end of main exploration, let user choose: finish and hand off, add one round, deep-dive a specific area, or increase Explore Level.
8. When finished: synthesize artifact via the artifact writer, persist, hand off to lcs3-toprd.

## Adaptive behavior

- After every round, reassess what still matters. Drop questions made irrelevant by answers.
- If user answers only part of a round, preserve resolved answers and mark only unanswered items.
- If user gives a custom answer, accept and interpret faithfully — never force into pre-set options.

## Decision discipline

- Keep agreed decisions separate from assumptions, recommendations, unresolved questions.
- Every agreed decision that implies a requirement enters the Decision Ledger as a stable `SRC-###` entry.
- Preserve existing IDs; never renumber; assign new IDs only to uncovered requirements.

## PRD readiness

Treat exploration as PRD-ready only when: intended outcome is clear, major constraints known, trade-offs considered, material risks visible, unresolved questions non-blocking or carried forward, agreed requirements captured as stable `SRC-###` entries.

## Runtime calls

- `writeCanonicalArtifact(projectRoot, ...)` — persist exploration artifact.
- `validateArtifactContent(projectRoot, ...)` — validate artifact structure.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.
- `classifyWork(manifestDir, ...)` — assess complexity/risk for level recommendation.

## Evidence report

- **Sources checked:** user intent, existing work-item artifacts, codebase signals.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** exploration rounds completed; decisions captured; artifact persisted.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-master; new work via the runtime work-item create/register operation.
- **Downstream:** lcs3-toprd; may detour to lcs3-research, lcs3-prototype, lcs3-domain-modeling, lcs3-wayfinder.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-008
- SRC: SRC-005, SRC-007, SRC-009, SRC-015, SRC-032, SRC-064, SRC-065, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
