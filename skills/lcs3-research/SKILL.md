---
name: lcs3-research
description: 'Use this skill to investigate questions against high-trust primary sources and capture findings in cited Markdown. Trigger on "research", "look up docs", "find API reference", "check official docs", "how does X work". Do NOT trigger for: brainstorming (use lcs3-explore), implementation (use lcs3-task-executor), or code review (use lcs3-code-review).'
source: lcs-research (MIG-015, REWRITE)
modes: []
---

# LCS3 Research

## Purpose

Preserve: research against high-trust/primary sources; cited findings; focused technical answers; source evidence preserved. Provider-agnostic skill contract.

## Trigger

Use when: user needs to research a library/API, look up documentation, verify how something works, or gather evidence for a technical decision.

Do NOT use for: brainstorming (lcs3-explore), implementation (lcs3-task-executor), code review (lcs3-code-review), or architecture analysis.

## Workflow

1. Identify the research question and required primary sources (official docs, source code, RFCs).
2. Investigate against primary sources. Follow every claim back to its source. Do NOT cite secondary blog posts unless primary source is unavailable (note it explicitly).
3. Write findings via the artifact writer with structured sections and a `## Citations` section containing exact URLs, file paths, and line numbers.
4. Emit Evidence report and hand off.

## Runtime calls

- `writeCanonicalArtifact(projectRoot, ...)` — persist cited research artifact.
- `buildProvenance(projectRoot, ...)` — attach source provenance metadata.

## Evidence report

- **Sources checked:** primary sources consulted with URLs/paths, active work-item artifacts.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** findings written; citations verified against primary sources.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-explore, lcs3-debug, lcs3-toprd, lcs3-master (detour).
- **Downstream:** returns cited research artifact to invoking skill.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-015
- SRC: SRC-032, SRC-035, SRC-064, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
