# Legacy LCS Reference — Read-Only

> **Non-canonical. Reference evidence only.** Do not treat as build input, runtime state, or LCS3 architecture.

## Source Pin — Reproducible

- **Repository:** `https://github.com/mdhb2/lean-coding-skills` (`mdhb2/lean-coding-skills`)
- **Branch:** `master`
- **Commit:** `f35dd2629f4efcd204987bb99c3f13b82990f463`
- **Commit date:** `2026-09-17T10:50:12Z`
- **Version (package.json):** `2.8.0` — 23 skills
- **Snapshot location:** `reference/legacy-lcs/` (vendored read-only copy)

## Mechanism

- **Type:** vendored snapshot, not a Git submodule. No `.git` inside `reference/legacy-lcs/` (`ls reference/legacy-lcs/.git` → not found). No `.gitmodules` at repo root. No legacy history merged into `LCS3` — `git log --oneline` shows only LCS3 commits (`bc2c2cc init`, `1185c5a readme`, `73b9b61 task optimize`, `25ee7ec task without lcs`).
- **Why vendored:** simple read-only isolation without submodule setup; satisfies SRC-066 / FR-003. Submodule not required.
- **Ignore / submodule rules:** none needed beyond isolation. `reference/legacy-lcs/.gitignore` contains `.lcs` only (legacy artifact). Root has no build config (`package.json`/`tsconfig.json` absent) — nothing consumes `reference/` as build input.

## Reproduce

```bash
git clone https://github.com/mdhb2/lean-coding-skills.git /tmp/legacy-lcs
git -C /tmp/legacy-lcs checkout f35dd2629f4efcd204987bb99c3f13b82990f463
diff -rq reference/legacy-lcs /tmp/legacy-lcs --exclude=.git --exclude=.codegraph --exclude=.commandcode | head
cat docs/legacy-skill-matrix.md | head -n 35  # same pin recorded there
```

Print pin: `cat reference/README.md` or `head -n 14 docs/legacy-skill-matrix.md`.

## Isolation Guarantees

- `reference/legacy-lcs/` is **READ-ONLY** — never edit, never commit LCS3 changes inside it (AGENTS.md §3).
- Not canonical architecture. Canonical source of truth: `docs/prd.md`, `docs/legacy-skill-matrix.md` (proposed), ADRs.
- Not runtime input. LCS3 runtime: `.lcs3/` (not `.lcs/`), Node.js/TypeScript CLI `lcs3` — no import path references `reference/`.
- Verify: `git ls-files -- reference/ | wc -l` (136 tracked) and `grep -r "reference/legacy" --include="*.json" --include="*.ts"` returns no active build reference.

## Traceability

- Covers PRD SRC-041..043, SRC-066; AC-039, AC-060, AC-065; FR-003.
- Duplicated pin: `docs/legacy-skill-matrix.md` frontmatter (`legacy_revision`).
