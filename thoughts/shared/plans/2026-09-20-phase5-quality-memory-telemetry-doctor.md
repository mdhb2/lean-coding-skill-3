# Phase 5 Implementation Plan — Quality, Memory, Telemetry, Doctor

**Goal:** Implement 10 tasks (L3-039 through L3-048) covering quality overlay registry, native quality rules, project memory, ADR promotion, telemetry, self-improvement proposals, legacy import, and Doctor diagnostics.

**Architecture:** Each task produces a single `src/<module>.ts` + `test/<module>.test.ts` pair (≤6 files, ≤400 LOC per task). All new modules are pure additions — they add new exports without altering any frozen GATE-05 §2 signatures. SQLite tables for memory and telemetry are added via append-only migrations. Doctor orchestrates existing modules. No new prod dependencies.

**Design references:** `docs/prd.md` (SRC-047..SRC-060, AC-043..AC-053, FR-050..FR-064), `docs/decisions/runtime-contract-freeze.md` (GATE-05 §2 frozen surface), `.lcs3/manifests/quality.yaml`, `.lcs3/config.yaml`, `docs/architecture/storage-boundary-proposal.md`.

---

## Dependency Graph

```
Batch 1 (parallel):  L3-039, L3-043, L3-045, L3-047  [foundation — no deps within phase]
Batch 2 (parallel):  L3-040, L3-041, L3-042, L3-044, L3-046  [depends on batch 1]
Batch 3 (serial):    L3-048  [depends on L3-024..L3-026, L3-043, L3-047]
```

Full dependency chain:
```
L3-009, L3-011, GATE-05 ──> L3-039 ──> L3-040, L3-041, L3-042 (parallel)
L3-023, L3-024, GATE-05 ──> L3-043 ──> L3-044
L3-015, L3-011 ───────────> L3-045 ──> L3-046
L3-001, L3-023, GATE-05 ──> L3-047
L3-009, L3-015, L3-024..L3-026, L3-043, L3-047 ──> L3-048
```

**DB migration ordering:** L3-043 adds migration v6 (memory_entries). L3-045 adds migration v7 (telemetry_events). Both bump `SCHEMA_VERSION` in `src/db.ts` sequentially.

---

## Batch 1: Foundation (4 tasks — parallel)

---

### Task L3-039 — Implement Quality Overlay Registry/Resolver

**Covers:** SRC-049, SRC-051; AC-043, AC-044, AC-046
**Depends:** L3-009, L3-011, GATE-05

**Files:**
- `src/overlays.ts` (new, ~120 LOC)
- `test/overlays.test.ts` (new, ~90 LOC)

**Design decisions:**
- Pure function module — no IO beyond reading `quality.yaml` manifest. Follows path-string entry point convention: caller passes `manifestDir: string`.
- Registry loaded from `.lcs3/manifests/quality.yaml` at call time (not cached).
- `resolveOverlays` accepts `TaskConcern` (caller-supplied concern tags), returns subset of overlays whose `scope` matches at least one concern.

**Exported signatures:**

```typescript
/** Quality overlay descriptor loaded from quality.yaml. */
export interface Overlay {
  name: string;
  scope: string;
}

/** Task concern tags supplied by the caller (e.g. ["ui"], ["code"], ["security"], ["ui","code"]). */
export type TaskConcern = string[];

/** Load all overlay definitions from quality.yaml. Returns [] if manifest unreadable. */
export function loadOverlays(manifestDir: string): Overlay[];

/** Select only overlays relevant to the given task concerns.
 *  Empty concerns → empty result (never load globally). */
export function resolveOverlays(manifestDir: string, concerns: TaskConcern): Overlay[];

/** Check if a named overlay is registered. */
export function isOverlayRegistered(manifestDir: string, name: string): boolean;
```

**Test cases (test/overlays.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | `loadOverlays` returns all 3 overlays from canonical quality.yaml | SRC-049, AC-046 |
| 2 | `resolveOverlays(["ui"])` returns only `ui-quality` | AC-043 |
| 3 | `resolveOverlays(["code"])` returns only `code-quality` | AC-043 |
| 4 | `resolveOverlays(["security"])` returns only `security-basic` | AC-043 |
| 5 | `resolveOverlays(["ui","code"])` returns `ui-quality` + `code-quality` | AC-043 |
| 6 | `resolveOverlays([])` returns empty (no global loading) | SRC-051, AC-044 |
| 7 | `resolveOverlays(["backend"])` returns empty (unknown scope excluded) | AC-044 |
| 8 | `isOverlayRegistered("ui-quality")` true, `isOverlayRegistered("anti-slop")` false | AC-046 |
| 9 | Missing manifest dir → `loadOverlays` returns `[]`, `resolveOverlays` returns `[]` | defensive |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(quality): add overlay registry/resolver (L3-039)`

---

### Task L3-043 — Implement Project Memory Store and Precedence

**Covers:** SRC-052..SRC-055; AC-047..AC-049
**Depends:** L3-023, L3-024, GATE-05

**Files:**
- `src/memory.ts` (new, ~150 LOC)
- `test/memory.test.ts` (new, ~120 LOC)
- `src/db.ts` — SCHEMA_VERSION bumped to 6, new migration v6 added

**Design decisions:**
- Storage: SQLite at `.lcs3/memory/memory.db` (per storage-boundary proposal). Same pattern as `src/state.ts`: path-string entry points, private `openDb` inside module.
- New table `memory_entries` with `id TEXT PRIMARY KEY, content TEXT NOT NULL, source TEXT NOT NULL, confidence REAL NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, stale INTEGER NOT NULL DEFAULT 0`.
- `resolveConflicts` implements precedence: `canonical > verified_repo > memory`. When memory content contradicts supplied canonical evidence digests, memory is marked stale.
- Provenance via `source` (string) and `confidence` (0.0..1.0).

**DB migration v6:**
```sql
CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  stale INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_memory_stale ON memory_entries(stale);
```

**Exported signatures:**

```typescript
export interface MemoryEntry {
  id: string;
  content: string;
  source: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  stale: boolean;
}

export interface MemoryConflict {
  memoryId: string;
  canonicalSource: string;
  reason: string;
}

/** Store a memory entry. Upserts on id. Returns stored entry. */
export function storeMemory(memoryDbPath: string, entry: { id: string; content: string; source: string; confidence: number }): MemoryEntry;

/** Retrieve a memory entry by id. Null if not found. */
export function getMemory(memoryDbPath: string, id: string): MemoryEntry | null;

/** List all memory entries, optionally filtering stale-only. */
export function listMemories(memoryDbPath: string, opts?: { staleOnly?: boolean }): MemoryEntry[];

/** Mark entries stale. */
export function markStale(memoryDbPath: string, ids: string[]): void;

/** Resolve conflicts: entries whose content contradicts supplied canonical digests are marked stale. */
export function resolveConflicts(memoryDbPath: string, canonicalDigests: Record<string, string>): MemoryConflict[];

/** Delete a memory entry. Returns true if deleted. */
export function deleteMemory(memoryDbPath: string, id: string): boolean;
```

**Test cases (test/memory.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | `storeMemory` + `getMemory` round-trip preserves all fields | AC-047 |
| 2 | `storeMemory` upserts (second call with same id overwrites) | AC-047 |
| 3 | `listMemories()` returns all entries sorted by id | AC-047 |
| 4 | `listMemories({ staleOnly: true })` returns only stale | AC-049 |
| 5 | `markStale(["id1"])` sets stale flag, retrievable | AC-049 |
| 6 | `resolveConflicts` marks memory stale when content matches conflicting source | SRC-054, AC-048 |
| 7 | `resolveConflicts` does NOT mark memory stale when no conflict | SRC-054 |
| 8 | `deleteMemory` removes entry; `getMemory` returns null | AC-047 |
| 9 | Empty DB path throws descriptive error | defensive |
| 10 | Confidence out of 0..1 range rejected at store time | AC-047 |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(memory): add project memory store with precedence (L3-043)`

---

### Task L3-045 — Implement Local Telemetry Store

**Covers:** SRC-057, SRC-058; AC-050, AC-051
**Depends:** L3-015, L3-011

**Files:**
- `src/telemetry.ts` (new, ~140 LOC)
- `test/telemetry.test.ts` (new, ~100 LOC)
- `src/db.ts` — SCHEMA_VERSION bumped to 7, new migration v7 added

**Design decisions:**
- Storage: SQLite at `.lcs3/telemetry/telemetry.db` (per storage-boundary proposal). Same path-string entry pattern.
- New table `telemetry_events` with auto-increment id and all approved fields.
- `recordEvent` is append-only. No update/delete (immutable log).
- `queryEvents` supports filtering by event_type, task_id, result.
- `telemetryEnabled` checks config — when disabled, `recordEvent` returns null (no-op).
- Guardrail (SRC-058/AC-051): no function writes to manifests, skills, schemas, or runtime contracts.

**DB migration v7:**
```sql
CREATE TABLE IF NOT EXISTS telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  task_id TEXT,
  workflow TEXT,
  skill TEXT,
  retries INTEGER,
  failure_type TEXT,
  context_tokens INTEGER,
  tool_calls INTEGER,
  files_read INTEGER,
  files_written INTEGER,
  result TEXT,
  recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telemetry_type ON telemetry_events(event_type);
```

**Exported signatures:**

```typescript
export interface TelemetryEvent {
  id: number;
  eventType: string;
  taskId: string | null;
  workflow: string | null;
  skill: string | null;
  retries: number | null;
  failureType: string | null;
  contextTokens: number | null;
  toolCalls: number | null;
  filesRead: number | null;
  filesWritten: number | null;
  result: string | null;
  recordedAt: string;
}

export interface RecordEventInput {
  eventType: string;
  taskId?: string;
  workflow?: string;
  skill?: string;
  retries?: number;
  failureType?: string;
  contextTokens?: number;
  toolCalls?: number;
  filesRead?: number;
  filesWritten?: number;
  result?: string;
}

/** Record a telemetry event. Returns the recorded event, or null if telemetry disabled. */
export function recordEvent(telemetryDbPath: string, input: RecordEventInput): TelemetryEvent | null;

/** Query events with optional filters. */
export function queryEvents(telemetryDbPath: string, filter?: { eventType?: string; taskId?: string; result?: string }): TelemetryEvent[];

/** Count events matching filter. */
export function countEvents(telemetryDbPath: string, filter?: { eventType?: string; result?: string }): number;

/** Check if telemetry is enabled based on project config. */
export function telemetryEnabled(projectRoot: string): boolean;
```

**Test cases (test/telemetry.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | `recordEvent` returns event with auto-incremented id | AC-050 |
| 2 | `queryEvents` filters by eventType | AC-050 |
| 3 | `queryEvents` filters by taskId | AC-050 |
| 4 | `queryEvents` filters by result | AC-050 |
| 5 | `countEvents` returns correct count | AC-050 |
| 6 | Multiple events have increasing ids and recordedAt timestamps | AC-050 |
| 7 | `telemetryEnabled` returns true for default config | AC-051 |
| 8 | Module does not import manifest/skill/schema modules | SRC-058, AC-051 |
| 9 | Empty db path throws descriptive error | defensive |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(telemetry): add local telemetry store (L3-045)`

---

### Task L3-047 — Implement Legacy Docs/Archive Importer

**Covers:** SRC-041..SRC-045; AC-039..AC-042
**Depends:** L3-001, L3-023, GATE-05

**Files:**
- `src/importer.ts` (new, ~150 LOC)
- `test/importer.test.ts` (new, ~120 LOC)

**Design decisions:**
- Imports eligible legacy docs/archive as raw immutable references into `.lcs3/imports/legacy/`.
- Creates lightweight `index.json` (derived) mapping imported file paths to metadata (original path, imported date, content hash).
- Rejects active state/work-item/runtime import (no `.lcs/` state files, no task files with `task_status`).
- Raw content preserved byte-for-byte; index is searchable.
- Follows `reference` authority class — imported data never promoted to canonical.

**Exported signatures:**

```typescript
export interface ImportEntry {
  originalPath: string;
  importedPath: string;
  contentHash: string;
  importedAt: string;
}

export interface ImportResult {
  imported: ImportEntry[];
  rejected: Array<{ path: string; reason: string }>;
}

export interface ImportIndex {
  entries: ImportEntry[];
  generatedAt: string;
}

/** Import eligible files from sourceDir into .lcs3/imports/legacy/. Only .md and .yaml eligible. */
export function importLegacyDocs(sourceDir: string, projectRoot: string): ImportResult;

/** Read the import index. Returns null if no imports exist. */
export function getImportIndex(projectRoot: string): ImportIndex | null;

/** Check if a specific file has been imported (by original path). */
export function isImported(projectRoot: string, originalPath: string): boolean;
```

**Test cases (test/importer.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | Import .md file → preserved byte-for-byte in .lcs3/imports/legacy/ | AC-039, AC-040 |
| 2 | Import .yaml file → preserved | AC-039 |
| 3 | Import creates index.json with correct metadata | AC-041 |
| 4 | `getImportIndex` returns null for project with no imports | AC-041 |
| 5 | `isImported` returns true for imported file, false for non-imported | AC-041 |
| 6 | Reject files with active task_status frontmatter | AC-042 |
| 7 | Reject .lcs/ runtime state files | AC-042 |
| 8 | Reject non-.md/.yaml files (e.g. .js, .db) | AC-042 |
| 9 | Empty source directory → imported=[], rejected=[] | defensive |
| 10 | Re-import same file is idempotent (no duplicate entry) | AC-040 |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(importer): add legacy docs/archive importer (L3-047)`

---

## Batch 2: Rules + Flows (5 tasks — parallel after Batch 1)

---

### Task L3-040 — Implement `ui-quality` Native Rules

**Covers:** SRC-047..SRC-050; AC-045, AC-046
**Depends:** L3-039

**Files:**
- `src/rules-ui-quality.ts` (new, ~130 LOC)
- `test/rules-ui-quality.test.ts` (new, ~100 LOC)

**Design decisions:**
- Pure function module — no network access, no Anti-Slop import. Rules adapted from approved Anti-Slop principles into LCS3-owned checks.
- Each rule is a function taking file content string, returning `RuleResult`.
- Rules: `checkContrast`, `checkTapTarget`, `checkResponsive`, `checkAriaLabels`, `checkFocusVisible`.
- `evaluateUiQuality` runs all rules against a set of files.

**Exported signatures:**

```typescript
export interface RuleResult {
  rule: string;
  passed: boolean;
  message: string;
  file?: string;
}

export interface OverlayEvaluation {
  overlay: string;
  results: RuleResult[];
  passed: boolean;
}

export function checkContrast(textColor: string, bgColor: string): RuleResult;
export function checkTapTarget(htmlContent: string): RuleResult;
export function checkResponsive(htmlContent: string): RuleResult;
export function checkAriaLabels(htmlContent: string): RuleResult;
export function checkFocusVisible(cssContent: string): RuleResult;
export function evaluateUiQuality(files: Record<string, string>): OverlayEvaluation;
```

**Test cases (test/rules-ui-quality.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | `checkContrast` high-contrast passes | AC-045 |
| 2 | `checkContrast` low-contrast fails | AC-045 |
| 3 | `checkTapTarget` with small tap target fails | AC-045 |
| 4 | `checkResponsive` with viewport meta passes | AC-045 |
| 5 | `checkResponsive` without viewport meta fails | AC-045 |
| 6 | `checkAriaLabels` with aria on buttons passes | AC-045 |
| 7 | `checkAriaLabels` missing aria labels fails | AC-045 |
| 8 | `checkFocusVisible` with focus-visible in CSS passes | AC-045 |
| 9 | `evaluateUiQuality` aggregates results correctly | AC-045 |
| 10 | Module has zero imports from external packages | SRC-047, AC-045 |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(quality): add ui-quality native rules (L3-040)`

---

### Task L3-041 — Implement `code-quality` Native Rules

**Covers:** SRC-047..SRC-050; AC-045, AC-046
**Depends:** L3-039

**Files:**
- `src/rules-code-quality.ts` (new, ~130 LOC)
- `test/rules-code-quality.test.ts` (new, ~100 LOC)

**Design decisions:**
- Pure function module — no network, no Anti-Slop. LCS3-owned code quality rules.
- Rules: `checkNoConsoleLog`, `checkNoAnyType`, `checkErrorHandling`, `checkMaxLineLength`, `checkNoTodos`.
- Re-exports `RuleResult`/`OverlayEvaluation` from `rules-ui-quality.ts` for consistency.

**Exported signatures:**

```typescript
import type { RuleResult, OverlayEvaluation } from "./rules-ui-quality.js";
export type { RuleResult, OverlayEvaluation };

export function checkNoConsoleLog(tsContent: string): RuleResult;
export function checkNoAnyType(tsContent: string): RuleResult;
export function checkErrorHandling(tsContent: string): RuleResult;
export function checkMaxLineLength(content: string, max: number): RuleResult;
export function checkNoTodos(content: string): RuleResult;
export function evaluateCodeQuality(files: Record<string, string>): OverlayEvaluation;
```

**Test cases (test/rules-code-quality.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | `checkNoConsoleLog` without console.log passes | AC-045 |
| 2 | `checkNoConsoleLog` with console.log fails | AC-045 |
| 3 | `checkNoAnyType` without `any` passes | AC-045 |
| 4 | `checkNoAnyType` with `: any` fails | AC-045 |
| 5 | `checkErrorHandling` with try/catch passes | AC-045 |
| 6 | `checkErrorHandling` async without catch fails | AC-045 |
| 7 | `checkMaxLineLength` within limit passes | AC-045 |
| 8 | `checkMaxLineLength` over limit fails | AC-045 |
| 9 | `checkNoTodos` without TODO passes | AC-045 |
| 10 | `evaluateCodeQuality` aggregates correctly | AC-045 |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(quality): add code-quality native rules (L3-041)`

---

### Task L3-042 — Implement `security-basic` Native Rules

**Covers:** SRC-047..SRC-050; AC-045, AC-046
**Depends:** L3-039

**Files:**
- `src/rules-security-basic.ts` (new, ~120 LOC)
- `test/rules-security-basic.test.ts` (new, ~90 LOC)

**Design decisions:**
- Pure function module — lightweight baseline security. Not a replacement for domain security review.
- Rules: `checkNoHardcodedSecrets`, `checkNoEval`, `checkNoSqlInjection`, `checkNoUnsafeRegex`, `checkHttpsOnly`.
- Same `RuleResult` + `OverlayEvaluation` types.

**Exported signatures:**

```typescript
import type { RuleResult, OverlayEvaluation } from "./rules-ui-quality.js";
export type { RuleResult, OverlayEvaluation };

export function checkNoHardcodedSecrets(content: string): RuleResult;
export function checkNoEval(content: string): RuleResult;
export function checkNoSqlInjection(rawSql: string): RuleResult;
export function checkNoUnsafeRegex(content: string): RuleResult;
export function checkHttpsOnly(urls: string[]): RuleResult;
export function evaluateSecurityBasic(inputs: { files?: Record<string, string>; sql?: string; urls?: string[] }): OverlayEvaluation;
```

**Test cases (test/rules-security-basic.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | `checkNoHardcodedSecrets` without secrets passes | AC-045 |
| 2 | `checkNoHardcodedSecrets` with "password = abc123" fails | AC-045 |
| 3 | `checkNoEval` without eval passes | AC-045 |
| 4 | `checkNoEval` with eval() fails | AC-045 |
| 5 | `checkNoSqlInjection` with parameterized query passes | AC-045 |
| 6 | `checkNoSqlInjection` with string concat in SQL fails | AC-045 |
| 7 | `checkNoUnsafeRegex` with safe regex passes | AC-045 |
| 8 | `checkNoUnsafeRegex` with nested quantifiers fails | AC-045 |
| 9 | `checkHttpsOnly` all HTTPS passes | AC-045 |
| 10 | `checkHttpsOnly` with HTTP fails | AC-045 |
| 11 | `evaluateSecurityBasic` aggregates correctly | AC-045 |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(quality): add security-basic native rules (L3-042)`

---

### Task L3-044 — Implement ADR Promotion Candidate Flow

**Covers:** SRC-056
**Depends:** L3-043

**Files:**
- `src/adr-candidate.ts` (new, ~100 LOC)
- `test/adr-candidate.test.ts` (new, ~80 LOC)

**Design decisions:**
- ADR candidates stored as memory entries with special `source` prefix `adr-candidate:`.
- `createCandidate` stores a memory entry tagged as ADR candidate. Does NOT promote to canonical architecture — that requires Smart Gate/HITL.
- `listCandidates` retrieves all ADR candidates.
- `promoteCandidate` intentionally NOT implemented — promotion is a separate explicit workflow.
- Guardrail: candidate retains source evidence; no canonical architecture files modified.

**Exported signatures:**

```typescript
import type { MemoryEntry } from "./memory.js";

/** Create an ADR promotion candidate. Stores as memory with source prefix "adr-candidate:". */
export function createCandidate(memoryDbPath: string, input: { id: string; content: string; source: string; confidence: number }): MemoryEntry;

/** List all ADR promotion candidates. */
export function listCandidates(memoryDbPath: string): MemoryEntry[];

/** Get a specific ADR candidate by id. Returns null if not found or not a candidate. */
export function getCandidate(memoryDbPath: string, id: string): MemoryEntry | null;

/** Delete an ADR candidate (e.g. after rejection). */
export function deleteCandidate(memoryDbPath: string, id: string): boolean;
```

**Test cases (test/adr-candidate.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | `createCandidate` stores entry with "adr-candidate:" source prefix | SRC-056 |
| 2 | `listCandidates` returns only entries with "adr-candidate:" prefix | SRC-056 |
| 3 | `getCandidate` returns candidate by id, null for non-candidate | SRC-056 |
| 4 | `deleteCandidate` removes candidate | SRC-056 |
| 5 | Candidate retains source evidence (source field preserved) | SRC-056 |
| 6 | No canonical architecture files written by any function | SRC-056 |
| 7 | Regular memory entries not returned by `listCandidates` | SRC-056 |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(memory): add ADR promotion candidate flow (L3-044)`

---

### Task L3-046 — Implement Self-Improvement Proposal Generator

**Covers:** SRC-058, SRC-059; AC-051, AC-052
**Depends:** L3-045

**Files:**
- `src/improve.ts` (new, ~120 LOC)
- `test/improve.test.ts` (new, ~90 LOC)

**Design decisions:**
- Reads telemetry events as input, produces `ImprovementProposal` objects.
- Proposals written to `.lcs3/telemetry/proposals/` as Markdown files.
- Guardrail (SRC-058/AC-051): no proposal auto-modifies skills, manifests, schemas, or runtime contracts.
- `generateProposals` detects patterns: repeated failures, high retry counts, context budget near limit, frequent HITL escalations.
- Each proposal carries evidence references (telemetry event ids).

**Exported signatures:**

```typescript
export interface ImprovementProposal {
  id: string;
  title: string;
  description: string;
  evidence: string[];
  category: "workflow" | "context" | "retry" | "tooling" | "coverage";
  createdAt: string;
}

export interface ProposalResult {
  proposals: ImprovementProposal[];
  generatedAt: string;
}

/** Generate improvement proposals from telemetry + memory evidence. */
export function generateProposals(input: {
  telemetryDbPath: string;
  memoryDbPath: string;
  projectRoot: string;
}): ProposalResult;

/** Write proposals to .lcs3/telemetry/proposals/ as Markdown. */
export function writeProposals(projectRoot: string, result: ProposalResult): string[];

/** List existing proposal files. */
export function listProposals(projectRoot: string): string[];
```

**Test cases (test/improve.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | `generateProposals` with repeated failures → retry proposal with evidence | AC-052 |
| 2 | `generateProposals` with high context usage → context proposal | AC-052 |
| 3 | `generateProposals` with no problematic patterns → empty proposals | AC-052 |
| 4 | Proposal has evidence array referencing telemetry/memory ids | AC-052 |
| 5 | `writeProposals` creates Markdown files in .lcs3/telemetry/proposals/ | AC-052 |
| 6 | `listProposals` returns written proposal filenames | AC-052 |
| 7 | No skill/manifest/schema files modified by any function | SRC-058, AC-051 |
| 8 | Empty telemetry/memory → empty proposals | defensive |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(improve): add self-improvement proposal generator (L3-046)`

---

## Batch 3: Integration (1 task — after Batch 1 + Batch 2)

---

### Task L3-048 — Implement Doctor Core

**Covers:** SRC-060; AC-053
**Depends:** L3-009, L3-015, L3-024..L3-026, L3-043, L3-047

**Files:**
- `src/doctor.ts` (new, ~250 LOC)
- `test/doctor.test.ts` (new, ~200 LOC)

**Design decisions:**
- Doctor orchestrates existing modules (no reimplementation). It calls public APIs from manifests, state, provenance, traceability, coverage, memory, importer, and config modules.
- Each check returns a `DiagnosticFinding` with a unique `check` name, severity, and actionable message.
- `runDoctor` runs all checks against a project root and returns a `DoctorReport`.
- Checks seeded via fixture directories — each bad fixture triggers exactly one distinct finding.
- Path-string entry points only (no raw DB handles).

**Exported signatures:**

```typescript
export type DiagnosticSeverity = "error" | "warning" | "info";

export interface DiagnosticFinding {
  check: string;
  severity: DiagnosticSeverity;
  message: string;
  details?: string;
}

export interface DoctorReport {
  findings: DiagnosticFinding[];
  passed: boolean;
  projectRoot: string;
  checkedAt: string;
}

/** Run all Doctor checks against a project. Returns report with findings. */
export function runDoctor(projectRoot: string): DoctorReport;

/** Run a specific check by name. Returns findings for that check only. */
export function runDoctorCheck(projectRoot: string, checkName: string): DiagnosticFinding[];

/** List all available check names. */
export function listDoctorChecks(): string[];
```

**Built-in checks (each maps to a function):**

| Check name | What it detects | Module(s) used |
|---|---|---|
| `lifecycle-integrity` | Tasks with invalid lifecycle status | `state.ts`, `transitions.ts` |
| `stale-derived` | Derived artifacts with stale provenance | `provenance.ts` |
| `broken-dependency` | Tasks depending on nonexistent/failed tasks | `dependencies.ts` |
| `orphan-task` | Tasks in state.db with no corresponding task file | `state.ts`, filesystem |
| `coverage-gap` | Tasks with missing SRC/AC coverage | `coverage.ts` |
| `write-conflict` | Active write scope overlaps | `conflicts.ts` |
| `contract-drift` | Manifest/config cross-file inconsistency | `manifests.ts`, `config.ts` |
| `memory-stale` | Memory entries marked stale | `memory.ts` |
| `import-integrity` | Imported legacy files missing from index | `importer.ts` |

**Test cases (test/doctor.test.ts):**

| # | Test | SRC/AC |
|---|------|--------|
| 1 | Clean project → `runDoctor` returns `passed: true`, no error findings | AC-053 |
| 2 | Seeded invalid lifecycle status → `lifecycle-integrity` finding | AC-053 |
| 3 | Seeded stale derived artifact → `stale-derived` finding | AC-053 |
| 4 | Seeded broken dependency → `broken-dependency` finding | AC-053 |
| 5 | Seeded orphan task (in DB, no file) → `orphan-task` finding | AC-053 |
| 6 | Seeded coverage gap → `coverage-gap` finding | AC-053 |
| 7 | Seeded write conflict → `write-conflict` finding | AC-053 |
| 8 | Seeded contract drift → `contract-drift` finding | AC-053 |
| 9 | Seeded stale memory → `memory-stale` finding | AC-053 |
| 10 | `runDoctorCheck("lifecycle-integrity")` returns only that check's findings | AC-053 |
| 11 | `listDoctorChecks` returns all 9 check names | AC-053 |
| 12 | Each seeded bad fixture produces distinct finding (no duplicate check names) | AC-053 |

**Verify:** `npm run typecheck && npm run lint && npm test`
**Commit:** `feat(doctor): add Doctor core diagnostics (L3-048)`

---

## Summary of All Files Created/Modified

### New source files (10)
1. `src/overlays.ts` — L3-039
2. `src/rules-ui-quality.ts` — L3-040
3. `src/rules-code-quality.ts` — L3-041
4. `src/rules-security-basic.ts` — L3-042
5. `src/memory.ts` — L3-043
6. `src/adr-candidate.ts` — L3-044
7. `src/telemetry.ts` — L3-045
8. `src/improve.ts` — L3-046
9. `src/importer.ts` — L3-047
10. `src/doctor.ts` — L3-048

### New test files (10)
1. `test/overlays.test.ts` — L3-039
2. `test/rules-ui-quality.test.ts` — L3-040
3. `test/rules-code-quality.test.ts` — L3-041
4. `test/rules-security-basic.test.ts` — L3-042
5. `test/memory.test.ts` — L3-043
6. `test/adr-candidate.test.ts` — L3-044
7. `test/telemetry.test.ts` — L3-045
8. `test/improve.test.ts` — L3-046
9. `test/importer.test.ts` — L3-047
10. `test/doctor.test.ts` — L3-048

### Modified files (1)
- `src/db.ts` — SCHEMA_VERSION bumped 5→7 across L3-043 and L3-045 (two append-only migrations)

### No config/manifest changes
- `.lcs3/manifests/quality.yaml` — already contains the 3 overlays; no modification needed
- `.lcs3/config.yaml` — already contains quality group; no modification needed
- GATE-05 §2 frozen surface — **no existing exports altered**

---

## Execution Order

```
Parallel Group A (Batch 1):
  L3-039 (overlays)        depends: L3-009, L3-011, GATE-05
  L3-043 (memory)          depends: L3-023, L3-024, GATE-05
  L3-045 (telemetry)       depends: L3-015, L3-011
  L3-047 (importer)        depends: L3-001, L3-023, GATE-05

Parallel Group B (Batch 2, after Group A):
  L3-040 (ui-quality)      depends: L3-039
  L3-041 (code-quality)    depends: L3-039
  L3-042 (security-basic)  depends: L3-039
  L3-044 (adr-candidate)   depends: L3-043
  L3-046 (improve)         depends: L3-045

Sequential (Batch 3, after Groups A+B):
  L3-048 (doctor)          depends: L3-009, L3-015, L3-024..L3-026, L3-043, L3-047
```

## Verification After Full Phase 5

```bash
npm run typecheck
npm run lint
npm test
```

All existing 167 tests + ~87 new tests = ~254 total expected to pass.

## GATE-05 Compliance Check

Per `docs/decisions/runtime-contract-freeze.md` §6, Phase 5 modules are explicitly NOT frozen — they may add new modules + new exports via their own tasks. The frozen §2 surface (25 modules) is **not altered**. All new modules follow the path-string entry point convention and never expose raw `DatabaseSync` handles.
