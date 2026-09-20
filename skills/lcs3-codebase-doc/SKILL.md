---
name: lcs3-codebase-doc
description: 'Use this skill when the user explicitly asks to map, document, inspect, analyze, understand, or onboard into an existing codebase or repository. Trigger on prompts like "map this codebase", "document this architecture", "onboard me to this repo", "create codebase docs", "analyze this repository", or "help me understand this codebase". Do NOT trigger for routine feature implementation, bug fixes, narrow code edits, single-file refactors, or isolated programming questions unless the user asks for repository-level discovery.'
source: lcs-codebase-doc (MIG-003 REWRITE + MIG-012 MERGE)
modes: [deep-map, onboarding]
---

# LCS3 Codebase Doc

## Purpose

Preserve: repository-level architecture mapping; focused/deep modes; evidence-based documentation. Absorbs onboarding behavior (MIG-012): developer-friendly repo overview, setup/run/test instructions, entrypoints.

## Trigger

Use when: user asks to map, document, inspect, analyze, or onboard into an existing codebase or repository.

Do NOT use for: routine feature implementation, bug fixes, narrow code edits, single-file refactors, or isolated programming questions (unless user explicitly asks for repository-level discovery).

## Modes

- **deep-map** — Full repository architecture mapping: stack, structure, architecture, conventions, integrations, testing, concerns. Produces comprehensive evidence-based documentation.
- **onboarding** — Developer-friendly repo overview: setup/run/test instructions, entrypoints, architecture summary. Read-only documentation generation, not implementation.

## Workflow (deep-map mode)

1. Run full scoped scan of the repository.
2. Read intent documents from canonical work-item artifacts.
3. Investigate each documentation area: stack, structure, architecture, conventions, integrations, testing, concerns.
4. Populate documentation sections using evidence from source files, configs, manifests.
5. Validate every non-trivial claim has evidence; mark gaps `[TODO]` or `[ASK USER]`.
6. Emit Evidence report.

## Workflow (onboarding mode)

1. Scan repository for configuration files, READMEs, entrypoints.
2. Identify technology stack, language, framework, and key entry points.
3. Discover local setup, run, build, and test commands.
4. Extract primary environment variables or configuration options.
5. Write lean onboarding documentation via the artifact writer.
6. Emit Evidence report.

## Runtime calls

- `writeCanonicalArtifact(projectRoot, ...)` — persist documentation artifacts.
- `validateArtifactContent(projectRoot, ...)` — validate artifact structure.
- `buildProvenance(projectRoot, ...)` — attach provenance/freshness metadata.

## Evidence report

- **Sources checked:** project source files, configs, manifests, intent documents.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** documentation produced; claims validated against evidence.
- **Concise summary:** confidence rating per documentation area.

## Handoff

- **Upstream:** lcs3-master (detour), standalone.
- **Downstream:** feeds lcs3-explore, lcs3-toprd, lcs3-srs context.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-003 (REWRITE) + MIG-012 (MERGE)
- SRC: SRC-032, SRC-035, SRC-038, SRC-055, SRC-064, SRC-065, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
