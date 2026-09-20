---
name: lcs3-task-executor
description: 'Use this skill whenever the user asks to implement, execute, or continue a specific task from sliced tasks. Trigger on "Eksekusi TASK-###", "continue TASK-###", "implement TASK-###". Claims task via runtime, checks dependencies, runs attempt, gates verification, emits findings. Do NOT trigger for: design review (lcs3-code-review), brainstorming (lcs3-explore), documentation (lcs3-doc-finalizer), or debugging (lcs3-debug).'
source: lcs-task-executor (MIG-018, REWRITE)
modes: []
---

# LCS3 Task Executor

## Purpose

Execute a single approved task end-to-end: claim, implement (Normal or TDD), verify, and hand off. Runtime handles claims, leases, dependencies, conflicts, and findings — the skill is reasoning and control flow only.

## Trigger

Activate on: "Eksekusi TASK-###", "continue TASK-###", "implement TASK-###", or when the router hands off a task for execution.

Do NOT use for: code review (lcs3-code-review), debugging (lcs3-debug), documentation (lcs3-doc-finalizer), or exploration (lcs3-explore).

## Workflow

1. **Claim task.** Call `claimTask` to acquire atomic ownership. If claim fails (busy/dependency-not-met), report and stop.
2. **Check dependencies.** Call `assertDependenciesReady(projectRoot, taskId)`. If not ready, STOP with blocker report.
3. **Check conflicts.** Call `assertNoConflicts(projectRoot, taskId)`. If conflict detected, STOP and report scope overlap.
4. **Renew lease** via `renewLease` before long operations; never exceed lease window.
5. **Classify mode.** Recommend Normal vs TDD based on task complexity. Present rationale. AFK tasks proceed autonomously; HITL tasks stop for human approval.
6. **Run attempt.** Call `runAttempt(projectRoot, input)` with task context, scope, and verification recipe. Runtime records attempt and result.
7. **Implement.** Normal mode: implement logic, add/update tests, run validation. TDD mode: red → green vertical tracer bullets, one behavior at a time. Refactor only after green.
8. **Run targeted gate.** Call `runTargetedGate(projectRoot, taskId, recipe)` for task-specific verification. Gate result determines pass/fail/needs-fix.
9. **Handle findings.** If gate finds issues: `emitFinding` for each defect, then `sendToNeedsFix` to enter review-fix loop. When fixed: `returnFromFix`.
10. **On failure.** Call `classifyFailure` from retries module. If retryable and budget remains, retry. If exhausted or non-retryable, mark blocked and escalate.
11. **On completion.** Call `transitionTask` to move task to done. Emit completion evidence.

## Runtime calls

- `claimTask(projectRoot, taskId)` — atomic task ownership.
- `renewLease(projectRoot, taskId)` — extend lease during long operations.
- `assertDependenciesReady(projectRoot, taskId)` — verify all upstream tasks complete.
- `assertNoConflicts(projectRoot, taskId)` — check scope overlap with other active tasks.
- `runAttempt(projectRoot, input)` — record execution attempt, return decision.
- `runTargetedGate(projectRoot, taskId, recipe)` — task-specific verification.
- `emitFinding(projectRoot, finding)` — record a defect/issue found during review.
- `transitionFinding(projectRoot, findingId, status)` — advance finding state.
- `sendToNeedsFix(projectRoot, taskId, findings)` — enter review-fix loop.
- `returnFromFix(projectRoot, taskId)` — return from fix to verification.
- `classifyFailure(projectRoot, error)` — categorize failure for retry decision.
- `transitionTask(projectRoot, taskId, status)` — advance task lifecycle.
- Path-string entries only: `dbPath`, `projectRoot`, `manifestDir`. No raw SQL, no DatabaseSync.

## Evidence report

- **Sources checked:** task file, PRD/SRS artifacts, dependency status, coverage matrix.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Attempt record:** mode chosen, commands run, gate result, findings emitted.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-task-slicer (approved task graph).
- **Downstream:** lcs3-code-review (after gate pass). `FIX-###` findings route back to executor. Blockers escalate to smart gate or HITL.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Never silently bypass claim/lease/dependency checks.
- Unbounded retry is forbidden; use bounded retry budget with failure classification.

## Traceability

- Matrix: MIG-018
- SRC: SRC-020–SRC-028, SRC-032–SRC-039, SRC-064, SRC-065, SRC-067, SRC-069
- Critical skill: requires stable ownership, context capsule, and verification APIs.
