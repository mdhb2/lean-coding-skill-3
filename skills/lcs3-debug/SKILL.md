---
name: lcs3-debug
description: 'Use this skill whenever the user needs a focused bug investigation. Trigger on bugs, failing tests, errors, regressions, or unexpected behavior. Modes: normal (disciplined investigation, evidence-before-fix) and report-only (reproduce/characterize, hypotheses, proposals without code mutation). Do NOT trigger for: design review, architecture decisions, new feature implementation, or code review.'
source: lcs-debug (MIG-005, REWRITE) + lcs-debug-ext (MIG-004, MERGE)
modes: [normal, report-only]
---

# LCS3 Debug

## Purpose

Disciplined bug investigation with evidence-first methodology. Normal mode: investigate, find root cause, fix, regress. Report-only mode: diagnose, hypothesize, propose — never mutate code.

## Trigger

Activate on: bug reports, failing tests, errors, regressions, unexpected behavior, "diagnose this", "debug", "why is this failing?", "make a debug report", "propose a patch only".

Do NOT use for: code review (lcs3-code-review), architecture (lcs3-codebase-doc), new implementation (lcs3-task-executor), or documentation (lcs3-doc-finalizer).

## Modes

- **normal** — Full investigation loop. Reproduce, hypothesize, instrument, fix, regress. Emits findings and may route to slicer/executor fast lane.
- **report-only** — Reproduce, characterize, rank hypotheses, propose instrumentation, suggest patch/regression. Never applies code changes. Produces diagnostic report.

## Workflow

1. **Collect context.** Gather error messages, logs, repro steps, recent changes, relevant source. Label evidence: user claim vs observed vs code evidence.
2. **Build feedback loop.** Find fastest repeatable pass/fail signal: failing test, targeted command, minimal script. Must be deterministic and fast.
3. **Reproduce or characterize.** Confirm exact symptom. Status: reproduced / partially reproduced / not reproduced / evidence-only. Record confidence level.
4. **Hypothesize.** Generate 3–5 ranked falsifiable hypotheses. Format: "If X is cause, then Y should be true, and Z check confirms/disproves."
5. **Instrument.** Change one variable at a time. Tag all debug artifacts with unique prefix for cleanup.
6. **Normal mode only — fix and regress.** Write regression test before fix (if correct seam exists). Implement fix. Verify. Clean up debug artifacts.
7. **Report-only mode — propose.** Produce patch proposal and regression-test options. Clearly state `Changes applied: None`.
8. **Route result.** Scoped known bug → slicer/executor fast lane. Ambiguity → explore/toprd. Architecture issue → lcs3-codebase-doc. New requirement discovered → emit SRC-### ID for PRD pipeline.
9. **Emit findings.** Call `emitFinding` for each confirmed defect. Transition findings via `transitionFinding`.

## Runtime calls

- `classifyFailure(projectRoot, error)` — categorize failure type for routing.
- `getRecipe(projectRoot, recipeId)` — load verification recipe for repro.
- `checkRecipeFreshness(projectRoot, recipeId)` — verify recipe is current.
- `runTargetedGate(projectRoot, taskId, recipe)` — verification gate for fix validation.
- `emitFinding(projectRoot, finding)` — record diagnostic finding.
- `transitionFinding(projectRoot, findingId, status)` — advance finding lifecycle.
- Path-string entries only: `dbPath`, `projectRoot`, `manifestDir`. No raw SQL, no DatabaseSync.

## Evidence report

- **Sources checked:** error logs, source files, test output, recent diffs, user-provided evidence.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Reproduction:** status, confidence, command/scenario used.
- **Hypotheses:** ranked list with evidence for/against each.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-task-executor (failed gate), user bug report, CI failure.
- **Downstream:** scoped fix → lcs3-task-slicer or executor fast lane. Architecture → lcs3-codebase-doc. New requirement → lcs3-toprd. Report-only → user decision on next step.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Report-only mode must never apply code changes — proposal only.
- Evidence before fix: do not hypothesize before feedback loop exists.

## Traceability

- Matrix: MIG-005 + MIG-004
- SRC: SRC-021, SRC-022, SRC-031, SRC-032, SRC-037, SRC-064, SRC-065, SRC-067, SRC-069
