import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { parseArtifact, writeDerivedArtifact } from "./artifacts.js";
import { buildProvenance } from "./provenance.js";

export interface CoverageTask {
  id: string;
  covers: string[];
  tests: string[];
}

export interface CoverageView {
  bySrc: Record<string, string[]>;
  byTest: Record<string, string[]>;
  tasks: CoverageTask[];
}

function asList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0).map((s) => s.trim()).filter(Boolean);
}

function taskId(filePath: string, fm: Record<string, unknown>): string {
  if (typeof fm.artifact_id === "string" && fm.artifact_id) return fm.artifact_id.trim();
  return basename(filePath).replace(/\.md$/, "").toUpperCase();
}

export function parseCoverageTask(filePath: string, content: string): CoverageTask | null {
  const { parsed } = parseArtifact(content);
  if (!parsed || typeof parsed.data !== "object" || parsed.data === null) return null;
  const fm = parsed.data as Record<string, unknown>;
  return { id: taskId(filePath, fm), covers: asList(fm.covers), tests: asList(fm.tests) };
}

export function buildCoverage(tasks: CoverageTask[]): CoverageView {
  const sorted = [...tasks].sort((a, b) => a.id.localeCompare(b.id));
  const bySrc: Record<string, string[]> = {};
  const byTest: Record<string, string[]> = {};
  for (const t of sorted) {
    for (const s of [...new Set(t.covers)].sort()) {
      if (!bySrc[s]) bySrc[s] = [];
      bySrc[s].push(t.id);
    }
    for (const tt of [...new Set(t.tests)].sort()) {
      if (!byTest[tt]) byTest[tt] = [];
      byTest[tt].push(t.id);
    }
  }
  for (const k of Object.keys(bySrc)) bySrc[k] = [...new Set(bySrc[k])].sort();
  for (const k of Object.keys(byTest)) byTest[k] = [...new Set(byTest[k])].sort();
  return { bySrc, byTest, tasks: sorted };
}

export function renderCoverage(view: CoverageView): string {
  const lines: string[] = [];
  lines.push("# Task Coverage (derived)");
  lines.push("");
  lines.push("| SRC/AC | Tasks |");
  lines.push("|---|---|");
  const srcs = Object.keys(view.bySrc).sort();
  if (srcs.length === 0) lines.push("| (none) | (none) |");
  else for (const s of srcs) lines.push(`| ${s} | ${view.bySrc[s].join(", ")} |`);
  lines.push("");
  lines.push("| Test | Tasks |");
  lines.push("|---|---|");
  const tests = Object.keys(view.byTest).sort();
  if (tests.length === 0) lines.push("| (none) | (none) |");
  else for (const tt of tests) lines.push(`| ${tt} | ${view.byTest[tt].join(", ")} |`);
  lines.push("");
  const gaps = view.tasks.filter((t) => t.covers.length === 0).map((t) => t.id);
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
      return b !== "traceability.md" && b !== "task-coverage.md";
    })
    .sort();
}

export function generateTaskCoverage(workItemDir: string, outPath: string, manifestDir: string): CoverageView {
  const files = collectTaskFiles(workItemDir);
  const tasks: CoverageTask[] = [];
  for (const f of files) {
    const raw = readFileSync(f, "utf8");
    const t = parseCoverageTask(f, raw);
    if (t) tasks.push(t);
  }
  const view = buildCoverage(tasks);
  const body = renderCoverage(view);
  const provenance = files.length > 0 ? buildProvenance(files) : [];
  const fm: Record<string, unknown> = {
    title: "Task Coverage (derived)",
    format_version: "okf/0.2",
    authors: [{ type: "agent", name: "lcs3-runtime" }],
    created: "2026-09-20",
    updated: "2026-09-20",
    artifact_type: "task_coverage",
    source: workItemDir,
    cot_level: "strict",
    status: "active",
    provenance,
  };
  const errs = writeDerivedArtifact(outPath, fm, body, manifestDir);
  if (errs.length > 0) throw new Error(`coverage: ${errs.map((e) => e.message).join("; ")}`);
  return view;
}
