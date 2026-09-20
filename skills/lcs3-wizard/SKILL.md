---
name: lcs3-wizard
description: 'Use this skill to generate interactive scripts for genuinely manual/HITL operations (infra setup, deployments, migrations). Trigger on "wizard", "setup script", "manual procedure", "walk me through", "interactive script". Generated procedure stays reviewable, never auto-executes. Do NOT trigger for: code changes (lcs3-task-executor), architecture review (lcs3-codebase-doc), or documentation (lcs3-doc-finalizer).'
source: lcs-wizard (MIG-023, REWRITE)
modes: []
---

# LCS3 Wizard

## Purpose

Generate interactive bash scripts for human-in-the-loop manual procedures: infrastructure setup, deployments, migrations, environment configuration. Scripts include checkpoints and rollback guidance. Generated procedure is always reviewable and never auto-executes.

## Trigger

Activate on: "wizard", "setup script", "manual procedure", "walk me through", "interactive script", "generate setup script".

Do NOT use for: code changes (lcs3-task-executor), architecture review (lcs3-codebase-doc), documentation (lcs3-doc-finalizer), or debugging (lcs3-debug).

## Workflow

1. **Scope the procedure.** Read config files, `.env.example`, framework configs. Identify every required value the human must provide. Determine which steps are deterministic vs genuinely manual.
2. **Map the journey.** Define exact URLs, actions, variables, decision points. Be specific — "open AWS console" is insufficient; provide exact navigation path.
3. **Evaluate autonomy.** Call `evaluateAutonomy` to determine if each step can be automated or requires HITL. Steps that are deterministic should be flagged for potential runtime automation in future.
4. **Check recipes.** Call `getRecipe` to find existing verification recipes relevant to this procedure. Use them as checkpoints.
5. **Author the script.** Generate bash script with: stage markers, `open_url()` helpers, `ask_secret()` for sensitive input, `write_env()` for config writes. Each step must be atomic and verifiable.
6. **Add checkpoints.** Insert verification checkpoints after each critical step. Include rollback guidance for each checkpoint.
7. **Apply security overlay.** Load `security-basic` overlay selectively when procedure touches credentials, permissions, network config, or secrets.
8. **Verify script.** Run `bash -n` for syntax check. Do NOT execute end-to-end (it blocks on human input).
9. **Save and hand off.** Save to `scripts/<name>-wizard.sh`. Hand off with instructions for manual execution.

## Runtime calls

- `evaluateAutonomy(projectRoot, input)` — determine which steps can be automated vs HITL.
- `getRecipe(projectRoot, recipeId)` — load verification recipe for checkpoints.
- Path-string entries only: `dbPath`, `projectRoot`, `manifestDir`. No raw SQL, no DatabaseSync.

## Evidence report

- **Sources checked:** config files, `.env.example`, framework configs, existing recipes.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Steps:** count of total, deterministic, HITL steps.
- **Verification:** `bash -n` result, shellcheck result (if available).
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-task-executor (HITL task), ops request, user manual procedure request.
- **Downstream:** user runs script manually. Results may feed back to executor or doc-finalizer.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Generated script stays reviewable — never auto-executes without human confirmation.
- Security overlay loaded selectively for credential/permission/network operations only.
- Checkpoints and rollback guidance are mandatory for every critical step.

## Traceability

- Matrix: MIG-023
- SRC: SRC-023, SRC-037, SRC-049, SRC-050, SRC-051, SRC-064, SRC-067, SRC-069
