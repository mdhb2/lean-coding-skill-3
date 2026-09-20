---
name: lcs3-master
description: 'Use this skill as the single contextual entry point and router for the entire LCS3 workflow. Activate when the user wants to "start", "begin", "what should I do next", "route me", has an ambiguous LCS request, or needs the correct skill selected and invoked. Recognizes on-ramps, provides rich routing guidance, supports multi-workitem awareness, and runs in confirmation or autopilot mode. Do NOT activate when request names a specific downstream skill — invoke that skill directly.'
source: lcs-master (MIG-010, REWRITE)
modes: []
---

# LCS3 Master

Contextual router and orchestrator over the canonical skill registry. Consumes `skills.yaml` — never embeds a duplicated skill list.

## Purpose

Single entry point that recognizes starting situations (on-ramps), routes to the correct downstream skill with rich contextual guidance, enforces workflow contracts on every handoff, and supports multi-workitem management and autopilot chaining.

## Trigger

Use when: user says "start", "begin", "what should I do next", "route me", has an ambiguous or multi-stage LCS request, reports a bug/huge project/mid-workflow situation, or explicitly requests the master/router skill.

Do NOT use when: request names a specific downstream skill (e.g. "run lcs3-toprd") — invoke that skill directly.

## Workflow

1. Load canonical skill registry from `skills.yaml` at `manifestDir`. Never hardcode skill names or counts.
2. Recognize on-ramp: bug report → route to lcs3-debug; huge/uncertain project → lcs3-wayfinder; codebase maintenance → lcs3-codebase-doc; mid-workflow help → situational routing; new feature → lcs3-explore.
3. Classify work complexity and risk via `classifyWork(classificationInput)`.
4. Generate rich routing guidance: recommended skill, reason, flow path, alternatives, critical warnings.
5. Present recommendation in confirmation mode (default) or chain in autopilot mode (opt-in, stops at critical gates).
6. On every handoff: enforce exact skill-name routing from registry; record routing decision.
7. Support multi-workitem operations: list, switch, resume via runtime state — never via stale hardcoded schema.
8. Emit Evidence report.

## Runtime calls

- `routeWork(route)` / `routeBug(bugInput)` / `nextPhase()` — workflow routing and phase transitions.
- `classifyWork(classificationInput)` — assess complexity/risk for routing depth.
- `generateCapsule(projectRoot, ...)` — build context capsule for downstream skill.
- `canTransition(...)` / `assertTransition(...)` / `transitionTask(...)` — lifecycle transitions.
- `evaluateAutonomy(autonomyInput)` — determine AFK vs HITL for current context.

## Evidence report

- **Sources checked:** user intent, canonical registry, active work-item state, classification result.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** routing decision recorded; handoff contract enforced; registry consumed (not duplicated).
- **Concise summary:** routed skill, mode (confirmation/autopilot), on-ramp type if applicable.

## Handoff

- **Upstream:** user input (any ambiguous or starting request).
- **Downstream:** any `lcs3-*` skill from the canonical registry, selected by routing logic. Detours (research, prototype, wayfinder) return to the calling skill after completion.

## Guardrails

- Must consume the canonical registry (`skills.yaml`); never embed a hardcoded skill inventory or assume a fixed skill count (SRC-063).
- No stale state schema — use runtime state API, not manual state mutation.
- No raw database mechanics in skill contracts — path-string entry points only.
- Confirmation mode is default; autopilot requires explicit opt-in and stops at critical gates.
- Concise control plane (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references only (AC-059).
- Read-only legacy reference (AC-060).

## Traceability

- Matrix: MIG-010
- SRC: SRC-009, SRC-020, SRC-023, SRC-029, SRC-030, SRC-032, SRC-063, SRC-064, SRC-065, SRC-067, SRC-068, SRC-069
- AC: AC-057..AC-065 subset
