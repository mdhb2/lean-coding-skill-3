---
name: lcs3-wayfinder
description: 'Use this skill to plan huge chunks of work with a shared map and decision tickets. Trigger on "wayfinder", "map the codebase", "plan this refactor", "decision tickets", "blocked on". Do NOT trigger for: architecture documentation (use lcs3-codebase-doc), onboarding (use lcs3-codebase-doc onboarding mode), or simple tasks (use lcs3-task-slicer).'
source: lcs-wayfinder (MIG-022, REWRITE)
modes: []
---

# LCS3 Wayfinder

## Purpose

Preserve: huge/uncertain-work planning via shared map + decision tickets; blockers exposed; incremental navigation for huge refactors. Provisional map/tickets are never treated as executable task graph.

## Trigger

Use when: user needs to plan a huge refactor, map out multi-session work, create decision tickets, or navigate blocked work.

Do NOT use for: architecture documentation (lcs3-codebase-doc), onboarding (lcs3-codebase-doc onboarding mode), or simple tasks (lcs3-task-slicer).

## Workflow

1. Run a grilling session to pin down the destination: what does "done" look like?
2. Map the frontier: breadth-first fan-out across the codebase space. Surface open decisions — name them, don't solve them yet.
3. Write the shared map artifact via the artifact writer.
4. Create decision tickets as child artifacts with `blocked_by` dependencies. Each ticket has a status lifecycle: `draft` → `reviewed` → `active` → `archived`.
5. Resolve incrementally: do NOT resolve more than one ticket per session. Record resolution, archive ticket, update the map.
6. When map clears (no open decisions), hand off to lcs3-toprd to collapse decisions into a buildable plan.
7. Emit Evidence report.

## Runtime calls

- `writeCanonicalArtifact(projectRoot, ...)` — persist map and decision ticket artifacts.
- `validateArtifactContent(projectRoot, ...)` — validate artifact structure.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.
- `proposeCandidate(manifestDir, ...)` — create ADR candidates for resolved decisions.

## Evidence report

- **Sources checked:** codebase areas mapped, active work-item context.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** map created; decision tickets written; resolutions recorded.
- **Concise summary:** open vs resolved decisions count with confidence rating.

## Handoff

- **Upstream:** lcs3-master, lcs3-explore, lcs3-improve-architecture, lcs3-srs (detour).
- **Downstream:** lcs3-toprd (to collapse decisions into buildable plan before slicing).

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-022
- SRC: SRC-028, SRC-029, SRC-032, SRC-056, SRC-064, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
