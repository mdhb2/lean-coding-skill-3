import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { parseArtifact, writeDerivedArtifact } from "./artifacts.js";
import { buildProvenance } from "./provenance.js";

export interface TraceTask {
  id: string;
  covers: string[];
  tests: string[];
}

export interface TraceabilityView {
  bySrc: Record<string, string[]>;
  byTask: Record<string, string[]>;
  tasks: TraceTask[];
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0).map((s) => s.trim()).filter(Boolean);
}

function taskIdFromFile(filePath: string, fm: Record<string, unknown>): string {
  if (typeof fm.artifact_id === "string" && fm.artifact_id) return fm.artifact_id.trim();
  // fallback to filename without ext, uppercased e.g. task-001 -> TASK-001
  const base = basename(filePath).replace(/\.md$/, "");
  return base.toUpperCase();
}

export function parseTraceTask(filePath: string, content: string): TraceTask | null {
  const { parsed } = parseArtifact(content);
  if (!parsed || typeof parsed.data !== "object" || parsed.data === null) return null;
  const fm = parsed.data as Record<string, unknown>;
  return {
    id: taskIdFromFile(filePath, fm),
    covers: asStringList(fm.covers),
    tests: asStringList(fm.tests),
  };
}

export function buildTraceability(tasks: TraceTask[]): TraceabilityView {
  const sorted = [...tasks].sort((a, b) => a.id.localeCompare(b.id));
  const bySrc: Record<string, string[]> = {};
  const byTask: Record<string, string[]> = {};
  for (const t of sorted) {
    const covers = [...new Set(t.covers)].sort();
    byTask[t.id] = covers;
    for (const src of covers) {
      if (!bySrc[src]) bySrc[src] = [];
      bySrc[src].push(t.id);
    }
  }
  for (const k of Object.keys(bySrc)) bySrc[k] = [...new Set(bySrc[k])].sort();
  return { bySrc, byTask, tasks: sorted };
}

export function renderTraceability(view: TraceabilityView): string {
  const lines: string[] = [];
  lines.push("# Traceability (derived)");
  lines.push("");
  lines.push("## Forward (SRC/AC -> Task)");
  lines.push("");
  lines.push("| Source | Tasks |");
  lines.push("|---|---|");
  const srcs = Object.keys(view.bySrc).sort();
  if (srcs.length === 0) lines.push("| (none) | (none) |");
  else for (const s of srcs) lines.push(`| ${s} | ${view.bySrc[s].join(", ")} |`);
  lines.push("");
  lines.push("## Backward (Task -> Source)");
  lines.push("");
  lines.push("| Task | Covers |");
  lines.push("|---|---|");
  const tids = Object.keys(view.byTask).sort();
  if (tids.length === 0) lines.push("| (none) | (none) |");
  else for (const id of tids) lines.push(`| ${id} | ${view.byTask[id].join(", ") || "(none)"} |`);
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  const gaps = tids.filter((id) => view.byTask[id].length === 0);
  lines.push(gaps.length === 0 ? "No gaps — every task declares covers." : `Tasks without covers: ${gaps.join(", ")}`);
  lines.push("");
  return lines.join("\n");
}

function collectTaskFiles(workItemDir: string): string[] {
  const taskDir = join(workItemDir, "task");
  const dir = existsSync(taskDir) && statSync(taskDir).isDirectory() ? taskDir : workItemDir;
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(dir, f))
    .filter((p) => {
      const b = basename(p).toLowerCase();
      // exclude derived outputs themselves
      return b !== "traceability.md" && b !== "task-coverage.md";
    })
    .sort();
}

export function generateTraceability(workItemDir: string, outPath: string, manifestDir: string): TraceabilityView {
  const files = collectTaskFiles(workItemDir);
  const tasks: TraceTask[] = [];
  for (const f of files) {
    const raw = readFileSync(f, "utf8");
    const t = parseTraceTask(f, raw);
    if (t) tasks.push(t);
  }
  const view = buildTraceability(tasks);
  const body = renderTraceability(view);
  const provenance = files.length > 0 ? buildProvenance(files) : [];
  const fm: Record<string, unknown> = {
    title: "Traceability (derived)",
    format_version: "okf/0.2",
    authors: [{ type: "agent", name: "lcs3-runtime" }],
    created: "2026-09-20",
    updated: "2026-09-20",
    artifact_type: "traceability",
    source: workItemDir,
    cot_level: "strict",
    status: "active",
    provenance,
  };
  const errs = writeDerivedArtifact(outPath, fm, body, manifestDir);
  if (errs.length > 0) throw new Error(`traceability: ${errs.map((e) => e.message).join("; ")}`);
  return view;
}
