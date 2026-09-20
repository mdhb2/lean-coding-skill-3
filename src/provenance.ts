import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { parseArtifact } from "./artifacts.js";

export interface ProvenanceEntry {
  source: string;
  digest: string;
}

export function digestContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function digestFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  return digestContent(readFileSync(filePath, "utf8"));
}

export function buildProvenance(sources: string[]): ProvenanceEntry[] {
  return sources.map((s) => {
    const d = digestFile(s);
    if (d === null) throw new Error(`provenance source not found: ${s}`);
    return { source: s, digest: d };
  });
}

// ponytail: per-source sha256 digest; if throughput matters, batch or cache digests.
export function isStale(stored: ProvenanceEntry[], current: ProvenanceEntry[]): boolean {
  const cur = new Map(current.map((e) => [e.source, e.digest]));
  for (const e of stored) {
    const cd = cur.get(e.source);
    if (cd === undefined || cd !== e.digest) return true;
  }
  if (stored.length !== current.length) {
    const storedSet = new Set(stored.map((e) => e.source));
    for (const c of current) if (!storedSet.has(c.source)) return true;
  }
  return false;
}

function normalizeProvenance(raw: unknown): ProvenanceEntry[] | null {
  if (Array.isArray(raw)) {
    const out: ProvenanceEntry[] = [];
    for (const e of raw) {
      if (typeof e !== "object" || e === null) return null;
      const r = e as Record<string, unknown>;
      const source = typeof r.source === "string" ? r.source : typeof r.upstream === "string" ? r.upstream : null;
      const digest = typeof r.digest === "string" ? r.digest : typeof r.updated_hash === "string" ? r.updated_hash : typeof r.hash === "string" ? r.hash : null;
      if (!source || !digest) return null;
      out.push({ source, digest });
    }
    return out;
  }
  if (typeof raw === "object" && raw !== null) {
    const r = raw as Record<string, unknown>;
    // single entry {source, digest} or {upstream, digest}
    if (typeof r.source === "string" && typeof r.digest === "string") return [{ source: r.source, digest: r.digest }];
    if (typeof r.upstream === "string" && typeof r.digest === "string") return [{ source: r.upstream, digest: r.digest }];
    if (typeof r.upstream === "string" && typeof r.updated_hash === "string") return [{ source: r.upstream, digest: r.updated_hash }];
    // map {path: digest}
    const entries = Object.entries(r);
    if (entries.length > 0 && entries.every(([k, v]) => typeof k === "string" && typeof v === "string")) {
      return entries.map(([k, v]) => ({ source: k, digest: v as string }));
    }
  }
  return null;
}

export function getDerivedProvenance(derivedPath: string): ProvenanceEntry[] | null {
  if (!existsSync(derivedPath)) return null;
  const raw = readFileSync(derivedPath, "utf8");
  const { parsed } = parseArtifact(raw);
  if (!parsed || typeof parsed.data !== "object" || parsed.data === null) return null;
  const fm = parsed.data as Record<string, unknown>;
  const candidate = fm.provenance ?? fm.derived_from ?? null;
  if (candidate === null) return null;
  return normalizeProvenance(candidate);
}

export function checkDerivedFileFreshness(derivedPath: string): { fresh: boolean; reason: string | null } {
  const stored = getDerivedProvenance(derivedPath);
  if (stored === null) {
    if (!existsSync(derivedPath)) return { fresh: false, reason: "derived file not found" };
    const raw = readFileSync(derivedPath, "utf8");
    const { parsed } = parseArtifact(raw);
    if (!parsed) return { fresh: false, reason: "unparseable frontmatter" };
    return { fresh: false, reason: "missing provenance" };
  }
  const current: ProvenanceEntry[] = [];
  for (const e of stored) {
    const d = digestFile(e.source);
    if (d === null) return { fresh: false, reason: `upstream not found: ${e.source}` };
    current.push({ source: e.source, digest: d });
  }
  return isStale(stored, current) ? { fresh: false, reason: "upstream changed" } : { fresh: true, reason: null };
}
