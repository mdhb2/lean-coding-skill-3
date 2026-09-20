import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { BootstrapResult } from "./db.js";
import { digestContent } from "./provenance.js";

// L3-043: project memory is advisory evidence (SRC-052), never canonical
// authority. Entries carry provenance/source, confidence, and freshness
// (SRC-053, SRC-055); canonical/repository evidence always wins on
// conflict (SRC-054). Storage: .lcs3/memory/memory.db (runtime-advisory).

export const MEMORY_SCHEMA_VERSION = 1;
export const MEMORY_DB_REL = ".lcs3/memory/memory.db";

// Default time-to-live for a memory entry before it counts as stale.
// Callers may override per resolvePrecedence call; exported so tests and
// future consumers never depend on a magic number.
export const DEFAULT_MEMORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const MEMORY_AUTHORITY = "advisory" as const;

export interface MemoryEntry {
  id: string;
  content: string;
  source: string;
  confidence: number;
  createdAt: number;
  updatedAt: number;
}

export interface RecordMemoryInput {
  content: string;
  source: string;
  confidence: number;
  nowMs?: number;
}

export interface CanonicalEvidence {
  id: string;
  content: string;
  refutesMemoryIds: string[];
}

export type MemoryStanding = "current" | "stale" | "overridden";

export interface MemoryResolution {
  memory: MemoryEntry;
  standing: MemoryStanding;
  winner: "memory" | "canonical";
  reason: string;
}

const MEMORY_MIGRATION_V1 = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memories (
  memory_id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source);`;

export function defaultMemoryDbPath(projectDir: string): string {
  return join(projectDir, MEMORY_DB_REL);
}

export function makeMemoryId(source: string, content: string): string {
  return `MEM-${digestContent(`${source}\n${content}`).slice(0, 12)}`;
}

function userVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  return row.user_version;
}

export function bootstrapMemoryDatabase(dbPath: string): BootstrapResult {
  if (!dbPath) return { dbPath, version: 0, applied: [], created: false, errors: [{ message: "bootstrapMemoryDatabase: empty database path" }] };
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
    if (current > MEMORY_SCHEMA_VERSION) {
      return {
        dbPath,
        version: current,
        applied: [],
        created: false,
        errors: [
          {
            message: `memory database schema version ${current} is newer than runtime MEMORY_SCHEMA_VERSION ${MEMORY_SCHEMA_VERSION} at ${dbPath}; downgrade requires explicit migration, refusing to open`,
          },
        ],
      };
    }
    const created = current === 0;
    const applied: string[] = [];
    if (current < MEMORY_SCHEMA_VERSION) {
      db.exec("BEGIN");
      try {
        db.exec(MEMORY_MIGRATION_V1);
        db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(
          MEMORY_SCHEMA_VERSION,
          "memory-entries-table",
        );
        applied.push("memory-entries-table");
        db.exec(`PRAGMA user_version = ${MEMORY_SCHEMA_VERSION}`);
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
          errors: [{ message: `memory migration failed on ${dbPath}: ${(e as Error).message}` }],
        };
      }
    }
    return { dbPath, version: MEMORY_SCHEMA_VERSION, applied, created, errors: [] };
  } finally {
    db.close();
  }
}

interface MemoryRow {
  memory_id: string;
  content: string;
  source: string;
  confidence: number;
  created_at: number;
  updated_at: number;
}

function toEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.memory_id,
    content: row.content,
    source: row.source,
    confidence: row.confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateRecordInput(input: RecordMemoryInput): string | null {
  if (!input.content || input.content.trim().length === 0) return "recordMemory: content must not be empty";
  if (!input.source || input.source.trim().length === 0) return "recordMemory: source (provenance) must not be empty";
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) {
    return "recordMemory: confidence must be a number in [0, 1]";
  }
  return null;
}

// Re-recording an identical (source, content) lesson refreshes its
// freshness timestamp instead of duplicating the row.
export function recordMemory(dbPath: string, input: RecordMemoryInput): MemoryEntry {
  const invalid = validateRecordInput(input);
  if (invalid) throw new Error(invalid);
  const now = input.nowMs ?? Date.now();
  const id = makeMemoryId(input.source, input.content);
  const db = new DatabaseSync(dbPath);
  try {
    db.prepare(
      `INSERT INTO memories (memory_id, content, source, confidence, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(memory_id) DO UPDATE SET confidence = excluded.confidence, updated_at = excluded.updated_at`,
    ).run(id, input.content, input.source, input.confidence, now, now);
    const row = db.prepare("SELECT * FROM memories WHERE memory_id = ?").get(id) as unknown as MemoryRow;
    return toEntry(row);
  } finally {
    db.close();
  }
}

export function listMemories(dbPath: string): MemoryEntry[] {
  const db = new DatabaseSync(dbPath);
  try {
    const rows = db.prepare("SELECT * FROM memories ORDER BY memory_id").all() as unknown as MemoryRow[];
    return rows.map(toEntry);
  } finally {
    db.close();
  }
}

// Pure precedence resolution (SRC-054): explicit canonical refutation
// always wins; otherwise age decides current vs stale. Memory never
// outranks canonical evidence.
export function resolvePrecedence(
  memories: MemoryEntry[],
  canonicals: CanonicalEvidence[],
  nowMs: number,
  maxAgeMs: number = DEFAULT_MEMORY_TTL_MS,
): MemoryResolution[] {
  const refutedBy = new Map<string, string>();
  for (const c of canonicals) {
    for (const mid of c.refutesMemoryIds) {
      if (!refutedBy.has(mid)) refutedBy.set(mid, c.id);
    }
  }
  return memories.map((memory) => {
    const refuter = refutedBy.get(memory.id);
    if (refuter !== undefined) {
      return {
        memory,
        standing: "overridden" as const,
        winner: "canonical" as const,
        reason: `canonical evidence ${refuter} refutes this memory; memory is advisory only`,
      };
    }
    if (nowMs - memory.updatedAt > maxAgeMs) {
      return {
        memory,
        standing: "stale" as const,
        winner: "memory" as const,
        reason: `memory older than ${maxAgeMs}ms without refresh; verify before reuse`,
      };
    }
    return {
      memory,
      standing: "current" as const,
      winner: "memory" as const,
      reason: "no conflicting canonical evidence; memory usable as advisory evidence",
    };
  });
}
