---
name: lcs3-tosrs
description: 'Use this skill whenever user asks to transform PRD into SRS, implementation specification, deterministic requirements, acceptance criteria mapping, or AI-ready engineering contract. Trigger on phrases like "create SRS", "PRD to SRS", "spec from PRD", "make requirements testable", or "generate implementation-ready spec". Do NOT trigger for: PRD creation (lcs3-toprd), task slicing (lcs3-task-slicer), code review (lcs3-code-review), or brainstorming (lcs3-explore).'
source: lcs-tosrs (MIG-021, REWRITE)
modes: []
---

# LCS3 ToSRS

## Purpose

Preserve: reviewed-PRD → deterministic implementation spec; FR/BR/VR/EC/AC mapping; security/performance/reliability/API/DB spec only when source-supported. Never invent default NFR targets.

## Trigger

Use when: user asks to transform PRD into SRS, create implementation spec, generate deterministic requirements, normalize acceptance criteria, or produce AI-ready engineering contract.

Do NOT use for: PRD creation (lcs3-toprd), task slicing (lcs3-task-slicer), code review (lcs3-code-review), or brainstorming (lcs3-explore).

## Workflow

1. Read authoritative PRD: prefer `prd-enhanced.md` when present, fallback to `prd.md`. If both exist and only `prd.md` was read, stop and report source conflict.
2. Extract from PRD: features, business goals, user roles, business rules, `SRC-###` IDs and priorities. Preserve all existing IDs exactly.
3. Generate deterministic requirement sets: FR-### (functional), BR-### (business rules), VR-### (validation), EC-### (edge cases), AC-### (acceptance criteria). Every requirement must be atomic, testable, implementation-oriented. Avoid vague terms like "properly" or "fast enough."
4. Draft API contracts (`API-###`) only when API behavior exists in the PRD. Draft DB impact (`DB-###`) only when schema/persistence changes exist.
5. Map NFRs (security, performance, reliability, scalability) only from explicitly stated PRD requirements — never fabricate normative targets.
6. Build traceability matrix: every `SRC-###` maps to at least one downstream ID; every FR maps to at least one AC; every AC maps to at least one TEST.
7. Write SRS artifacts via artifact writer: `srs.md` (required), `tests.md` (required), `api.md` (optional), `db.md` (optional), `traceability.md` (required).
8. Emit evidence report and hand off to `lcs3-task-slicer`.

## Guardrail: never invent NFRs

Do not fabricate normative non-functional requirements (latency targets, throughput numbers, compliance claims) that were not explicitly stated by the user or derived from a verified source requirement.

## Runtime calls

- `validateArtifactContent(projectRoot, ...)` — validate SRS structure and ID coverage.
- `writeCanonicalArtifact(projectRoot, ...)` — persist SRS artifacts.
- `buildProvenance(projectRoot, ...)` — attach provenance metadata.
- `buildTraceability(projectRoot, ...)` — generate SRC→FR/BR/VR/EC/AC→TEST mapping.
- `generateTraceability(projectRoot, ...)` — render traceability matrix.
- `buildCoverage(projectRoot, ...)` — verify requirement coverage completeness.
- Path-string entries only: `dbPath`, `projectRoot`, `manifestDir`. No raw SQL, no DatabaseSync.

## Evidence report

- **Sources checked:** PRD (`prd-enhanced.md` or `prd.md`), source requirement ledger.
- **Assumptions:** label each `[verified]` or `[unverified]`.
- **Verification run:** all `SRC-###` mapped; no invented NFRs; traceability matrix complete.
- **Concise summary:** 1–3 sentences with confidence rating.

## Handoff

- **Upstream:** lcs3-toprd, lcs3-prd-reviewer.
- **Downstream:** lcs3-task-slicer. May detour to lcs3-research or lcs3-prototype for unresolved technical questions.

## Guardrails

- Concise control plane only (SRC-064); deterministic mechanics delegated to runtime (SRC-065).
- No duplicated framework contract (AC-058); selective references/overlays only (AC-059).
- Read-only legacy reference (AC-060).
- Proposal-only improvements — never auto-apply unapproved changes.

## Traceability

- Matrix: MIG-021
- SRC: SRC-015, SRC-016, SRC-029, SRC-032, SRC-040, SRC-064, SRC-065, SRC-067, SRC-069
- AC: AC-057..AC-065 subset
