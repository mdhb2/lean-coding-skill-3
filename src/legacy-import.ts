import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { BootstrapResult } from "./db.js";
import { digestContent, digestFile } from "./provenance.js";

// L3-047: legacy docs/archive importer (SRC-041..SRC-045, AC-039..AC-042).
// Eligible legacy Markdown docs are copied byte-identical into
// .lcs3/imports/legacy/ (reference scope only — never canonical artifacts)
// and recorded in an own SQLite index used for lightweight search.
// Guardrails: sources under any `.lcs/` runtime directory or under `.lcs3/`
// itself are rejected, as is anything that is not a Markdown doc, so active
// legacy state / work-items / task runtime can never enter LCS3 (SRC-043).
// Storage: .lcs3/imports/legacy/ + .lcs3/imports/imports.db (reference+index).

export const LEGACY_IMPORTS_SCHEMA_VERSION = 1;
export const LEGACY_IMPORTS_DIR_REL = ".lcs3/imports/legacy";
export const LEGACY_IMPORTS_DB_REL = ".lcs3/imports/imports.db";

export const LEGACY_IMPORT_SCOPE = "reference" as const;
export const LEGACY_SEARCH_LIMIT_DEFAULT = 20;

const LEGACY_IMPORTS_MIGRATION_V1 = `CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS legacy_imports (
  import_id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  stored_rel TEXT NOT NULL,
  scope TEXT NOT NULL,
  digest TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  imported_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legacy_imports_source ON legacy_imports(source_path);`;

export function defaultLegacyImportsDir(projectDir: string): string {
  return join(projectDir, LEGACY_IMPORTS_DIR_REL);
}

export function defaultLegacyImportsDbPath(projectDir: string): string {
  return join(projectDir, LEGACY_IMPORTS_DB_REL);
}

export interface LegacyImportRecord {
  id: string;
  sourcePath: string;
  storedRel: string;
  scope: typeof LEGACY_IMPORT_SCOPE;
  digest: string;
  bytes: number;
  importedAt: number;
}

export interface LegacySearchHit {
  id: string;
  sourcePath: string;
  storedRel: string;
  scope: typeof LEGACY_IMPORT_SCOPE;
  snippet: string;
}

function userVersion(db: DatabaseSync): number {
  const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
  return row.user_version;
}

export function bootstrapLegacyImportsDatabase(dbPath: string): BootstrapResult {
  if (!dbPath) return { dbPath, version: 0, applied: [], created: false, errors: [{ message: "bootstrapLegacyImportsDatabase: empty database path" }] };
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
    if (current > LEGACY_IMPORTS_SCHEMA_VERSION) {
      return {
        dbPath,
        version: current,
        applied: [],
        created: false,
        errors: [
          {
            message: `legacy imports database schema version ${current} is newer than runtime LEGACY_IMPORTS_SCHEMA_VERSION ${LEGACY_IMPORTS_SCHEMA_VERSION} at ${dbPath}; downgrade requires explicit migration, refusing to open`,
          },
        ],
      };
    }
    const created = current === 0;
    const applied: string[] = [];
    if (current < LEGACY_IMPORTS_SCHEMA_VERSION) {
      db.exec("BEGIN");
      try {
        db.exec(LEGACY_IMPORTS_MIGRATION_V1);
        db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))").run(
          LEGACY_IMPORTS_SCHEMA_VERSION,
          "legacy-imports-table",
        );
        applied.push("legacy-imports-table");
        db.exec(`PRAGMA user_version = ${LEGACY_IMPORTS_SCHEMA_VERSION}`);
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
          errors: [{ message: `legacy imports migration failed on ${dbPath}: ${(e as Error).message}` }],
        };
      }
    }
    return { dbPath, version: LEGACY_IMPORTS_SCHEMA_VERSION, applied, created, errors: [] };
  } finally {
    db.close();
  }
}

// Eligibility gate (SRC-043): only Markdown docs outside legacy runtime
// (`.lcs/`) and outside LCS3's own state (`.lcs3/`) may be imported.
export function resolveEligibleLegacySource(projectDir: string, sourcePath: string): string {
  if (!sourcePath) throw new Error("importLegacyDoc: sourcePath must be non-empty");
  const abs = isAbsolute(sourcePath) ? sourcePath : resolve(projectDir, sourcePath);
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    throw new Error(`importLegacyDoc: not an importable file: ${sourcePath}`);
  }
  const lower = abs.toLowerCase();
  if (!lower.endsWith(".md") && !lower.endsWith(".markdown")) {
    throw new Error(`importLegacyDoc: only Markdown docs/archive material is eligible, got: ${sourcePath}`);
  }
  const segments = abs.split(sep);
  if (segments.includes(".lcs")) {
    throw new Error(`importLegacyDoc: legacy runtime state under .lcs/ is never eligible for import: ${sourcePath}`);
  }
  if (segments.includes(".lcs3")) {
    throw new Error(`importLegacyDoc: LCS3 runtime state under .lcs3/ is never eligible for import: ${sourcePath}`);
  }
  return abs;
}

export function makeLegacyImportId(absSourcePath: string, contentDigest: string): string {
  return `LEG-${digestContent(`${absSourcePath}\n${contentDigest}`).slice(0, 12)}`;
}

function openImportsDb(projectDir: string): DatabaseSync {
  const dbPath = defaultLegacyImportsDbPath(projectDir);
  const boot = bootstrapLegacyImportsDatabase(dbPath);
  if (boot.errors.length > 0) throw new Error(boot.errors[0].message);
  return new DatabaseSync(dbPath);
}

interface LegacyImportRow {
  import_id: string;
  source_path: string;
  stored_rel: string;
  scope: string;
  digest: string;
  bytes: number;
  imported_at: number;
}

function rowToRecord(row: LegacyImportRow): LegacyImportRecord {
  return {
    id: row.import_id,
    sourcePath: row.source_path,
    storedRel: row.stored_rel,
    scope: LEGACY_IMPORT_SCOPE,
    digest: row.digest,
    bytes: row.bytes,
    importedAt: row.imported_at,
  };
}

export function importLegacyDoc(options: {
  projectDir: string;
  sourcePath: string;
  nowMs?: number;
}): LegacyImportRecord {
  const { projectDir, sourcePath } = options;
  const nowMs = options.nowMs ?? Date.now();
  if (!projectDir) throw new Error("importLegacyDoc: projectDir must be non-empty");
  const abs = resolveEligibleLegacySource(projectDir, sourcePath);
  const digest = digestFile(abs);
  if (digest === null) throw new Error(`importLegacyDoc: source vanished mid-import: ${sourcePath}`);
  const raw = readFileSync(abs);
  const id = makeLegacyImportId(abs, digest);
  const storedName = `${digest.slice(0, 12)}-${basename(abs)}`;
  const dir = defaultLegacyImportsDir(projectDir);
  mkdirSync(dir, { recursive: true });
  // Raw bytes preserved verbatim (SRC-044); content-addressed name dedups.
  copyFileSync(abs, join(dir, storedName));
  const storedRel = `${LEGACY_IMPORTS_DIR_REL}/${storedName}`;
  const db = openImportsDb(projectDir);
  try {
    db.prepare(
      `INSERT INTO legacy_imports (import_id, source_path, stored_rel, scope, digest, bytes, imported_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(import_id) DO UPDATE SET imported_at = excluded.imported_at`,
    ).run(id, abs, storedRel, LEGACY_IMPORT_SCOPE, digest, raw.length, nowMs);
    const row = db.prepare("SELECT * FROM legacy_imports WHERE import_id = ?").get(id) as unknown as LegacyImportRow;
    return rowToRecord(row);
  } finally {
    db.close();
  }
}

export function listLegacyImports(projectDir: string): LegacyImportRecord[] {
  if (!projectDir) throw new Error("listLegacyImports: projectDir must be non-empty");
  const db = openImportsDb(projectDir);
  try {
    const rows = db.prepare("SELECT * FROM legacy_imports ORDER BY imported_at ASC").all() as unknown as LegacyImportRow[];
    return rows.map(rowToRecord);
  } finally {
    db.close();
  }
}

export function getLegacyImport(projectDir: string, id: string): LegacyImportRecord | null {
  if (!projectDir) throw new Error("getLegacyImport: projectDir must be non-empty");
  const db = openImportsDb(projectDir);
  try {
    const row = db.prepare("SELECT * FROM legacy_imports WHERE import_id = ?").get(id) as unknown as LegacyImportRow | undefined;
    return row ? rowToRecord(row) : null;
  } finally {
    db.close();
  }
}

// Lightweight searchable index (SRC-045, AC-042): metadata match on source
// path plus case-insensitive substring scan of the verbatim raw copies.
export function searchLegacyImports(options: {
  projectDir: string;
  query: string;
  limit?: number;
}): LegacySearchHit[] {
  const { projectDir, query } = options;
  if (!projectDir) throw new Error("searchLegacyImports: projectDir must be non-empty");
  if (!query) throw new Error("searchLegacyImports: query must be non-empty");
  const limit = options.limit ?? LEGACY_SEARCH_LIMIT_DEFAULT;
  if (!Number.isInteger(limit) || limit < 1) throw new Error("searchLegacyImports: limit must be a positive integer");
  const needle = query.toLowerCase();
  const hits: LegacySearchHit[] = [];
  for (const record of listLegacyImports(projectDir)) {
    if (hits.length >= limit) break;
    if (record.sourcePath.toLowerCase().includes(needle)) {
      hits.push({ id: record.id, sourcePath: record.sourcePath, storedRel: record.storedRel, scope: record.scope, snippet: `source path match: ${record.sourcePath}` });
      continue;
    }
    let content: string;
    try {
      content = readFileSync(join(projectDir, record.storedRel), "utf8");
    } catch {
      continue;
    }
    const at = content.toLowerCase().indexOf(needle);
    if (at < 0) continue;
    const start = Math.max(0, at - 60);
    const end = Math.min(content.length, at + needle.length + 60);
    hits.push({
      id: record.id,
      sourcePath: record.sourcePath,
      storedRel: record.storedRel,
      scope: record.scope,
      snippet: `${start > 0 ? "..." : ""}${content.slice(start, end).replaceAll("\n", " ")}${end < content.length ? "..." : ""}`,
    });
  }
  return hits;
}
