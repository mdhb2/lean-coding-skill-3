---
name: lcs3-self-improvement
description: 'Use this skill when the user asks to analyze conversation context, friction patterns, or success patterns and produce improvement proposals. Trigger on "review what went wrong", "improve agent behavior", "analyze this conversation", "generate improvement recommendations", or "suggest updates to rules or skills". Do NOT trigger for: debugging (use lcs3-debug), routine implementation, direct rule/skill edits, or code review.'
source: lcs-self-improvement (MIG-016, REWRITE)
modes: []
---

# LCS3 Self Improvement

Diagnostic meta-skill for friction/success analysis and deduplicated improvement proposals. Proposals only — never auto-applies.

## Purpose

Analyze interaction history and project context, identify friction and success patterns, and produce reviewable recommendations. Every recommendation is a proposal artifact requiring explicit human review or ADR promotion before any change.

## Trigger

Use when: user asks to review what went wrong, improve future agent behavior, analyze friction, generate improvement recommendations, or audit rules/instructions/skills.

Do NOT use for: routine debugging (lcs3-debug), feature implementation, direct rule edits, or code review.

## Workflow

1. Collect evidence: conversation context, supplied files, project docs, skill definitions, runtime telemetry summary, memory entries.
2. Analyze friction patterns: misunderstandings, repeated corrections, stale assumptions, constraint misses, workflow ambiguity.
3. Analyze success patterns: effective constraints, reusable workflow choices, effective formats.
4. Deduplicate recommendations against previously emitted proposals using stable ID (category + title + target hash).
5. Cross-reference findings against current project instructions and skills — classify each as addressed, partially addressed, missing, or conflicting.
6. Write proposal artifact via the artifact writer. No instruction, rule, or skill files are modified by this skill.
7. Emit Evidence report.

## Runtime calls

- Runtime telemetry query — retrieve session/task/retry/failure metrics (telemetry module is not frozen; call the current query API).
- Memory query — retrieve project memory entries for context enrichment.
- `writeCanonicalArtifact(projectRoot, ...)` — persist proposal artifact.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.
- `proposeCandidate(manifestDir, ...)` — create ADR candidate for proposals warranting architectural decisions.

## Evidence report

- **Sources checked:** conversation history, project docs, skill files, telemetry summary, memory entries.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** proposal artifact written; no rule/skill files modified; deduplication applied.
- **Concise summary:** new vs recurring recommendation counts, confidence rating.

## Handoff

- **Upstream:** lcs3-master (detour), explicit user request, evidence threshold trigger.
- **Downstream:** manual review → accepted proposals applied via lcs3-master or direct ADR/task creation. Never auto-apply.

## Guardrails

- Proposals only — no auto-apply capability; changes require explicit human approval (SRC-065).
- Bounded introspection — do not sweep entire context when targeted evidence suffices.
- No raw user quotes by default; summarized evidence only.
- Concise control plane (SRC-064); deterministic mechanics delegated to runtime.
- No duplicated framework contract (AC-058); selective references only (AC-059).
- Read-only legacy reference (AC-060).
## Traceability

- Matrix: MIG-016
- SRC: SRC-052, SRC-053, SRC-054, SRC-055, SRC-057, SRC-058, SRC-059, SRC-064, SRC-065, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
