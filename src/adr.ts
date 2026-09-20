import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { BootstrapResult } from "./db.js";
import { digestContent } from "./provenance.js";

// L3-044: ADR promotion candidate flow (SRC-056). Decisions whose scope
// becomes project-wide architecture should be promotable to ADRs rather
// than remaining buried inside a single work item — but a worker may only
// create a *candidate*. Architecture approval remains Smart Gate/HITL, so
// this module deliberately exposes NO approve/promote API: a candidate
// retains its source evidence and never alters canonical architecture.

export const ADR_SCHEMA_VERSION = 1;
export const ADR_DB_REL = ".lcs3/memory/adr-candidates.db";

// Candidates are proposals, never authority. There is no "approved" state
// reachable through this module.
export const ADR_AUTHORITY = "candidate-only" as const;
export const ADR_CANDIDATE_STATUS = "candidate" as const;

export interface EvidenceRef {
  kind: "memory" | "work-item" | "canonical";
  id: string;
  note?: string;
}

export interface AdrCandidate {
  id: string;
  title: string;
  summary: string;
  evidence: EvidenceRef[];
  status: typeof ADR_CANDIDATE_STATUS;
  createdAt: number;
}

export interface ProposeCandidateInput {
  title: string;
  summary: string;
  evidence: EvidenceRef[];
  nowMs?: number;
}

const ADR_MIGRATION_V1 = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS adr_candidates (
  candidate_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_adr_candidates_status ON adr_candidates(status);`;

export function defaultAdrDbPath(projectDir: string): string {
  return join(projectDir, ADR_DB_REL);
}

export function makeCandidateId(title: string, summary: string): string {
  return `ADRC-${digestContent(`${title}\n${summary}`).slice(0, 12)}`;
}

function userVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  return row.user_version;
}

export function bootstrapAdrDatabase(dbPath: string): BootstrapResult {
  if (!dbPath) return { dbPath, version: 0, applied: [], created: false, errors: [{ message: "bootstrapAdrDatabase: empty database path" }] };
  try {
    mkdirSync(dirname(dbPath), { recursive: true });
  } catch (e) {
    return { dbPath, version: 0, applied: [], created: false, errors: [{ message: `cannot create directory for ${dbPath}: ${(e as Error).message}` }] };
  }
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(dbPath);
  } catch (e) {
    return { dbPath, version: 0, applied: [], created: false, errors: [{ message: `cannot open SQLite database at ${dbPath}: ${(e as Error).message}` }] };
  }
  try {
    const current = userVersion(db);
    if (current > ADR_SCHEMA_VERSION) {
      return {
        dbPath,
        version: current,
        applied: [],
        created: false,
        errors: [
          {
            message: `adr database schema version ${current} is newer than runtime ADR_SCHEMA_VERSION ${ADR_SCHEMA_VERSION} at ${dbPath}; downgrade requires explicit migration, refusing to open`,
          },
        ],
      };
    }
    const created = current === 0;
    const applied: string[] = [];
    if (current < ADR_SCHEMA_VERSION) {
      db.exec("BEGIN");
      try {
        db.exec(ADR_MIGRATION_V1);
        db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(
          ADR_SCHEMA_VERSION,
          "adr-candidates-table",
        );
        applied.push("adr-candidates-table");
        db.exec(`PRAGMA user_version = ${ADR_SCHEMA_VERSION}`);
        db.exec("COMMIT");
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // Rollback best-effort; report the original failure below.
        }
        return {
          dbPath,
          version: userVersion(db),
          applied: [],
          created,
          errors: [{ message: `adr migration failed on ${dbPath}: ${(e as Error).message}` }],
        };
      }
    }
    return { dbPath, version: ADR_SCHEMA_VERSION, applied, created, errors: [] };
  } finally {
    db.close();
  }
}

interface AdrRow {
  candidate_id: string;
  title: string;
  summary: string;
  evidence_json: string;
  status: string;
  created_at: number;
}

function toCandidate(row: AdrRow): AdrCandidate {
  return {
    id: row.candidate_id,
    title: row.title,
    summary: row.summary,
    evidence: JSON.parse(row.evidence_json) as EvidenceRef[],
    status: ADR_CANDIDATE_STATUS,
    createdAt: row.created_at,
  };
}

function validateProposeInput(input: ProposeCandidateInput): string | null {
  if (!input.title || input.title.trim().length === 0) return "proposeCandidate: title must not be empty";
  if (!input.summary || input.summary.trim().length === 0) return "proposeCandidate: summary must not be empty";
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    return "proposeCandidate: at least one source evidence ref is required";
  }
  for (const ref of input.evidence) {
    if (ref.kind !== "memory" && ref.kind !== "work-item" && ref.kind !== "canonical") {
      return `proposeCandidate: evidence kind must be memory, work-item, or canonical (got ${String(ref.kind)})`;
    }
    if (!ref.id || ref.id.trim().length === 0) return "proposeCandidate: every evidence ref must carry a non-empty id";
  }
  return null;
}

// Re-proposing an identical (title, summary) candidate refreshes its
// evidence text but never changes its status or creation time: promotion
// out of "candidate" is not expressible here by construction.
export function proposeCandidate(dbPath: string, input: ProposeCandidateInput): AdrCandidate {
  const invalid = validateProposeInput(input);
  if (invalid) throw new Error(invalid);
  const now = input.nowMs ?? Date.now();
  const id = makeCandidateId(input.title, input.summary);
  const evidenceJson = JSON.stringify(input.evidence);
  const db = new DatabaseSync(dbPath);
  try {
    db.prepare(
      `INSERT INTO adr_candidates (candidate_id, title, summary, evidence_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(candidate_id) DO UPDATE SET title = excluded.title, summary = excluded.summary, evidence_json = excluded.evidence_json`,
    ).run(id, input.title, input.summary, evidenceJson, ADR_CANDIDATE_STATUS, now);
    const row = db.prepare("SELECT * FROM adr_candidates WHERE candidate_id = ?").get(id) as unknown as AdrRow;
    return toCandidate(row);
  } finally {
    db.close();
  }
}

export function getCandidate(dbPath: string, id: string): AdrCandidate | null {
  const db = new DatabaseSync(dbPath);
  try {
    const row = db.prepare("SELECT * FROM adr_candidates WHERE candidate_id = ?").get(id) as unknown as AdrRow | undefined;
    return row === undefined ? null : toCandidate(row);
  } finally {
    db.close();
  }
}

export function listCandidates(dbPath: string): AdrCandidate[] {
  const db = new DatabaseSync(dbPath);
  try {
    const rows = db.prepare("SELECT * FROM adr_candidates ORDER BY candidate_id").all() as unknown as AdrRow[];
    return rows.map(toCandidate);
  } finally {
    db.close();
  }
}
