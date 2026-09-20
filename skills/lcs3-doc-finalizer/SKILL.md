---
name: lcs3-doc-finalizer
description: 'Use this skill whenever the user asks to finalize completed work into canonical documentation. Trigger on "finalize documentation", "prepare final-doc", "lcs3-doc-finalizer". Synthesizes final docs via runtime transaction — never manual folder moves. Do NOT trigger for: code changes, task execution, or debugging.'
source: lcs-doc-finalizer (MIG-006, REWRITE)
modes: []
---

# LCS3 Doc Finalizer

## Purpose

Synthesize final canonical documentation from completed work. Produces work summary, file map, commit/PR recommendations, and completion evidence. All archiving and state transitions happen via runtime transaction — never manual file moves.

## Trigger

Activate on: "finalize documentation", "prepare final-doc", "lcs3-doc-finalizer", "selesaikan dokumentasi", or when all tasks pass review and final gate is ready.

Do NOT use for: code changes (lcs3-task-executor), debugging (lcs3-debug), or documentation generation during execution (lcs3-codebase-doc).

## Workflow

1. **Verify readiness.** Confirm all tasks in the work item are `done`. If any are pending/blocked, STOP and list incomplete tasks.
2. **Read artifacts.** Load PRD/SRS, task files, code review results, coverage matrix, traceability. Identify all `SRC-###`, `FR-###`, `AC-###`, `TEST-###` IDs covered.
3. **Run final gate.** Call `runFinalGate(projectRoot, workItemId)` to verify all verification gates passed. If gate fails, STOP and report.
4. **Generate traceability.** Call `generateTraceability(projectRoot, ...)` and `buildCoverage(projectRoot, ...)` for final requirement coverage report.
5. **Synthesize documentation.** Generate work summary (doc.md) and file map (map.md). Include: objective, context, functional changes, verification results, commit recommendation, PR description, task list.
6. **Attach provenance.** Call `buildProvenance(projectRoot, ...)` to record provenance metadata for all generated artifacts.
7. **Finalize via runtime.** Call `transitionTask` to advance work item to completed state. Runtime handles archiving and state cleanup atomically — never manual folder moves or deletes.
8. **Emit evidence.** Record completion evidence with all preserved IDs.

## Runtime calls

- `runFinalGate(projectRoot, workItemId)` — verify all gates passed before finalization.
- `generateTraceability(projectRoot, ...)` — render final traceability matrix.
- `buildCoverage(projectRoot, ...)` — verify requirement coverage completeness.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.
- `transitionTask(projectRoot, workItemId, status)` — advance lifecycle (handles archive atomically).
- `validateArtifactContent(projectRoot, artifact)` — validate generated doc structure.
- Path-string entries only: `dbPath`, `projectRoot`, `manifestDir`. No raw SQL, no DatabaseSync.

## Evidence report

- **Sources checked:** all task files, PRD/SRS, code review, coverage matrix, traceability.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Gate result:** final gate pass/fail status.
- **IDs preserved:** all `SRC-###`, `FR-###`, `AC-###`, `TEST-###` IDs covered.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-code-review (after PASS).
- **Downstream:** workflow complete. Commit/PR recommendation provided. Runtime archives source artifacts atomically.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Never perform manual folder moves or deletes — finalization is a runtime transaction.
- Never finalize if tasks are incomplete or final gate fails.

## Traceability

- Matrix: MIG-006
- SRC: SRC-013, SRC-014, SRC-037, SRC-040, SRC-060, SRC-061, SRC-064, SRC-065, SRC-067, SRC-069
