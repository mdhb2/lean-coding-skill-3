---
name: lcs3-code-review
description: 'Use this skill when the user asks to review code implementation after lcs3-task-executor execution. Trigger on "review code", "check results", "verify task", "code review", "validate against artifacts". Do NOT trigger for: design review, architecture brainstorming, or new implementation without existing code.'
source: lcs-code-review (MIG-002, REWRITE)
modes: []
---

# LCS3 Code Review

## Purpose

Review implementation against requirements and artifacts. Produce evidence-based findings with severity, actionable `FIX-###` IDs, and a pass/fail decision. Output is a structured review report, not a code patch.

## Trigger

Activate on: "review code", "lcs3-code-review", "review implementation", "check results", "verify task", "code review", "validate against artifacts".

Do NOT use for: design review, architecture brainstorming, or new implementation without existing code.

## Workflow

1. **Read context.** Load task file, PRD/SRS artifacts, acceptance criteria, coverage matrix. Identify all `SRC-###`, `FR-###`, `AC-###` IDs this task must satisfy.
2. **Read diff.** Inspect all files changed/created by the executor. Understand scope.
3. **Review against requirements.** For each requirement ID: verify implementation matches intent, check edge cases, confirm acceptance criteria are met.
4. **Scan for defects.** Check for bugs, security issues, error handling gaps, test coverage, maintainability concerns.
5. **Classify findings.** Each finding gets: `FIX-###` ID, severity (critical/major/minor), description, affected files, suggested remediation.
6. **Apply overlays.** Load `code-quality` overlay by default. Add `security-basic` overlay when security-relevant code is touched (auth, crypto, input validation, permissions). No other overlays unless explicitly requested.
7. **Validate artifacts.** Call `validateArtifactContent` to verify generated review artifact structure.
8. **Emit findings.** Call `emitFinding` for each defect. Transition via `transitionFinding` as needed.
9. **Decide pass/fail.** If critical findings exist: FAIL, route to `sendToNeedsFix`. If only minor/major: PASS with advisory findings. Record decision in review artifact.
10. **On FAIL.** Hand back to executor via `sendToNeedsFix`. Executor fixes, then returns via `returnFromFix` for re-review.

## Runtime calls

- `emitFinding(projectRoot, finding)` — record a review finding with FIX-### ID.
- `transitionFinding(projectRoot, findingId, status)` — advance finding lifecycle.
- `runTargetedGate(projectRoot, taskId, recipe)` — verification gate if needed.
- `sendToNeedsFix(projectRoot, taskId, findings)` — enter review-fix loop.
- `validateArtifactContent(projectRoot, artifact)` — validate review artifact structure.
- Path-string entries only: `dbPath`, `projectRoot`, `manifestDir`. No raw SQL, no DatabaseSync.

## Severity levels

- **Critical:** Blocking defect. Functionality broken, security vulnerability, data loss risk. Must fix before pass.
- **Major:** Significant issue. Incorrect behavior, missing error handling, poor test coverage. Should fix before pass.
- **Minor:** Advisory. Style, naming, minor inefficiency. Fix if convenient, does not block pass.

## Evidence report

- **Sources checked:** task file, PRD/SRS, acceptance criteria, coverage matrix, source diff.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Findings:** count by severity, FIX-### IDs listed.
- **Decision:** PASS or FAIL with rationale.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-task-executor (after gate pass).
- **Downstream:** PASS → lcs3-doc-finalizer. FAIL → back to executor via `sendToNeedsFix`. After fix → re-review via `returnFromFix`.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Overlays are selective: `code-quality` always, `security-basic` only when security-relevant. Never blanket-load all overlays.
- Review is evidence-based; never approve without checking requirements alignment.

## Traceability

- Matrix: MIG-002
- SRC: SRC-037, SRC-039, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069
