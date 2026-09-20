import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getLegacyImport,
  importLegacyDoc,
  listLegacyImports,
  searchLegacyImports,
  LEGACY_IMPORTS_DB_REL,
  LEGACY_IMPORTS_SCHEMA_VERSION,
} from "../src/legacy-import.js";
import { DatabaseSync } from "node:sqlite";

function makeProject(): string {
  return mkdtempSync(join(tmpdir(), "lcs3-legacy-"));
}

describe("importLegacyDoc eligible docs", () => {
  it("preserves raw bytes verbatim and marks reference scope (AC-040, AC-041)", () => {
    const projectDir = makeProject();
    const source = join(projectDir, "upstream", "guide.md");
    mkdirSync(join(projectDir, "upstream"), { recursive: true });
    const raw = "# Guide\n\nLegacy wisdom with trailing spaces   \n\ttabs\n";
    writeFileSync(source, raw);
    const record = importLegacyDoc({ projectDir, sourcePath: source, nowMs: 1_700_000_000_000 });
    assert.match(record.id, /^LEG-[0-9a-f]{12}$/);
    assert.equal(record.scope, "reference");
    assert.equal(record.sourcePath, source);
    assert.equal(record.importedAt, 1_700_000_000_000);
    // SRC-044: stored copy is byte-identical to the source.
    assert.equal(readFileSync(join(projectDir, record.storedRel), "utf8"), raw);
    assert.equal(record.bytes, Buffer.byteLength(raw));
    const db = new DatabaseSync(join(projectDir, LEGACY_IMPORTS_DB_REL));
    try {
      const row = db.prepare("PRAGMA user_version").get() as { user_version: number };
      assert.equal(row.user_version, LEGACY_IMPORTS_SCHEMA_VERSION);
    } finally {
      db.close();
    }
  });

  it("re-import refreshes freshness without duplicating stored bytes", () => {
    const projectDir = makeProject();
    const source = join(projectDir, "doc.md");
    writeFileSync(source, "# Same\n");
    const first = importLegacyDoc({ projectDir, sourcePath: source, nowMs: 1000 });
    const second = importLegacyDoc({ projectDir, sourcePath: source, nowMs: 2000 });
    assert.equal(first.id, second.id);
    assert.equal(second.importedAt, 2000);
    const stored = readdirSync(join(projectDir, ".lcs3", "imports", "legacy"));
    assert.equal(stored.length, 1);
  });
});

describe("importLegacyDoc eligibility guardrails", () => {
  it("rejects legacy runtime state, own runtime, non-docs, and missing files (SRC-043)", () => {
    const projectDir = makeProject();
    const lcsState = join(projectDir, ".lcs", "work-items", "active.md");
    mkdirSync(join(projectDir, ".lcs", "work-items"), { recursive: true });
    writeFileSync(lcsState, "# active\n");
    assert.throws(() => importLegacyDoc({ projectDir, sourcePath: lcsState }), /\.lcs\//);
    const ownState = join(projectDir, ".lcs3", "memory", "note.md");
    mkdirSync(join(projectDir, ".lcs3", "memory"), { recursive: true });
    writeFileSync(ownState, "# own\n");
    assert.throws(() => importLegacyDoc({ projectDir, sourcePath: ownState }), /\.lcs3\//);
    const dbFile = join(projectDir, "state.db");
    writeFileSync(dbFile, "binary");
    assert.throws(() => importLegacyDoc({ projectDir, sourcePath: dbFile }), /only Markdown/);
    assert.throws(
      () => importLegacyDoc({ projectDir, sourcePath: join(projectDir, "nope.md") }),
      /not an importable file/,
    );
  });

  it("leaves existing .lcs/ runtime state untouched and behavior unchanged (AC-039)", () => {
    const projectDir = makeProject();
    const lcsDir = join(projectDir, ".lcs", "state");
    mkdirSync(lcsDir, { recursive: true });
    writeFileSync(join(lcsDir, "state.md"), "# runtime\n");
    const before = readFileSync(join(lcsDir, "state.md"), "utf8");
    const source = join(projectDir, "archive.md");
    writeFileSync(source, "# archive\n");
    importLegacyDoc({ projectDir, sourcePath: source });
    // `.lcs/` content is byte-identical and LCS3 listing only sees the import.
    assert.equal(readFileSync(join(lcsDir, "state.md"), "utf8"), before);
    assert.equal(listLegacyImports(projectDir).length, 1);
  });
});

describe("searchLegacyImports", () => {
  it("finds content matches with snippets and source-path matches (AC-042)", () => {
    const projectDir = makeProject();
    const first = join(projectDir, "alpha.md");
    const second = join(projectDir, "beta.md");
    writeFileSync(first, "# Alpha\n\nThe migration matrix governs skill inventory.\n");
    writeFileSync(second, "# Beta\n\nUnrelated notes about telemetry.\n");
    const recAlpha = importLegacyDoc({ projectDir, sourcePath: first });
    importLegacyDoc({ projectDir, sourcePath: second });
    const hits = searchLegacyImports({ projectDir, query: "migration matrix" });
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, recAlpha.id);
    assert.equal(hits[0].scope, "reference");
    assert.match(hits[0].snippet.toLowerCase(), /migration matrix/);
    const pathHits = searchLegacyImports({ projectDir, query: "beta.md" });
    assert.equal(pathHits.length, 1);
    assert.match(pathHits[0].snippet, /source path match/);
    assert.deepEqual(searchLegacyImports({ projectDir, query: "no-such-term" }), []);
  });

  it("rejects empty queries and bad limits, and resolves records by id", () => {
    const projectDir = makeProject();
    assert.throws(() => searchLegacyImports({ projectDir, query: "" }), /non-empty/);
    assert.throws(() => searchLegacyImports({ projectDir, query: "x", limit: 0 }), /positive integer/);
    assert.equal(getLegacyImport(projectDir, "LEG-deadbeef1234"), null);
    const source = join(projectDir, "doc.md");
    writeFileSync(source, "# Doc\n");
    const record = importLegacyDoc({ projectDir, sourcePath: source });
    assert.deepEqual(getLegacyImport(projectDir, record.id), record);
  });
});
