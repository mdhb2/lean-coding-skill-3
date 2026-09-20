import { strictEqual, deepStrictEqual, ok, throws } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  MEMORY_DB_REL,
  bootstrapMemoryDatabase,
  defaultMemoryDbPath,
  listMemories,
  makeMemoryId,
  recordMemory,
  resolvePrecedence,
} from "../src/memory.js";

function freshDb(): string {
  const dir = mkdtempSync(join(tmpdir(), "lcs3-mem-"));
  const dbPath = defaultMemoryDbPath(dir);
  ok(dbPath.endsWith(MEMORY_DB_REL));
  const res = bootstrapMemoryDatabase(dbPath);
  deepStrictEqual(res.errors, []);
  return dbPath;
}

test("memory bootstrap creates versioned database", () => {
  const dir = mkdtempSync(join(tmpdir(), "lcs3-mem-boot-"));
  const res = bootstrapMemoryDatabase(defaultMemoryDbPath(dir));
  strictEqual(res.version, 1);
  strictEqual(res.created, true);
  deepStrictEqual(res.applied, ["memory-entries-table"]);
});

test("recordMemory stores source, confidence, freshness (AC-047)", () => {
  const dbPath = freshDb();
  const m = recordMemory(dbPath, { content: "staging deploy needs --legacy-peer-deps", source: "session:2026-09-19", confidence: 0.8, nowMs: 1000 });
  ok(m.id.startsWith("MEM-"));
  strictEqual(m.content, "staging deploy needs --legacy-peer-deps");
  strictEqual(m.source, "session:2026-09-19");
  strictEqual(m.confidence, 0.8);
  strictEqual(m.createdAt, 1000);
  strictEqual(m.updatedAt, 1000);
  strictEqual(listMemories(dbPath).length, 1);
});

test("recordMemory rejects empty content/source and out-of-range confidence", () => {
  const dbPath = freshDb();
  throws(() => recordMemory(dbPath, { content: "  ", source: "s", confidence: 0.5 }), /content must not be empty/);
  throws(() => recordMemory(dbPath, { content: "c", source: "", confidence: 0.5 }), /source.*must not be empty/);
  throws(() => recordMemory(dbPath, { content: "c", source: "s", confidence: 1.5 }), /confidence/);
  throws(() => recordMemory(dbPath, { content: "c", source: "s", confidence: Number.NaN }), /confidence/);
});

test("re-recording identical lesson refreshes freshness instead of duplicating", () => {
  const dbPath = freshDb();
  const a = recordMemory(dbPath, { content: "use node 22", source: "env-note", confidence: 0.6, nowMs: 1000 });
  const b = recordMemory(dbPath, { content: "use node 22", source: "env-note", confidence: 0.9, nowMs: 2000 });
  strictEqual(a.id, b.id);
  strictEqual(b.updatedAt, 2000);
  strictEqual(listMemories(dbPath).length, 1);
});

test("same content from different sources yields distinct ids", () => {
  const dbPath = freshDb();
  recordMemory(dbPath, { content: "retry thrice", source: "alice", confidence: 0.5, nowMs: 1 });
  recordMemory(dbPath, { content: "retry thrice", source: "bob", confidence: 0.5, nowMs: 1 });
  strictEqual(listMemories(dbPath).length, 2);
});

test("canonical evidence overrides conflicting memory (AC-048)", () => {
  const dbPath = freshDb();
  const m = recordMemory(dbPath, { content: "deploy on fridays is fine", source: "old-note", confidence: 0.7, nowMs: 1000 });
  const [res] = resolvePrecedence(
    [m],
    [{ id: "POL-01", content: "no friday deploys", refutesMemoryIds: [m.id] }],
    1500,
    60_000,
  );
  strictEqual(res.standing, "overridden");
  strictEqual(res.winner, "canonical");
  ok(res.reason.includes("POL-01"));
});

test("stale memory is detectable via ttl (AC-049)", () => {
  const dbPath = freshDb();
  const m = recordMemory(dbPath, { content: "old workaround", source: "s", confidence: 0.4, nowMs: 1000 });
  const [res] = resolvePrecedence([m], [], 1000 + 61_000, 60_000);
  strictEqual(res.standing, "stale");
  strictEqual(res.winner, "memory");
});

test("fresh memory with no conflict resolves current", () => {
  const dbPath = freshDb();
  const m = recordMemory(dbPath, { content: "fresh lesson", source: "s", confidence: 0.9, nowMs: 5000 });
  const [res] = resolvePrecedence([m], [], 6000, 60_000);
  strictEqual(res.standing, "current");
  strictEqual(res.winner, "memory");
});

test("makeMemoryId is deterministic", () => {
  strictEqual(makeMemoryId("s", "c"), makeMemoryId("s", "c"));
});
