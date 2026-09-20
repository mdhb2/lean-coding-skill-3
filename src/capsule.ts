import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { parseArtifact, writeDerivedArtifact } from "./artifacts.js";
import { buildProvenance } from "./provenance.js";

export interface CapsuleTask {
  id: string;
  filePath: string;
  covers: string[];
  tests: string[];
  scope: string[];
}

export interface Capsule {
  task: CapsuleTask;
  linkedSources: string[];
  body: string;
}

function asList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .map((s) => s.trim())
    .filter(Boolean);
}

function taskId(filePath: string, fm: Record<string, unknown>): string {
  if (typeof fm.artifact_id === "string" && fm.artifact_id) return fm.artifact_id.trim();
  return basename(filePath).replace(/\.md$/, "").toUpperCase();
}

export function parseCapsuleTask(filePath: string, content: string): CapsuleTask | null {
  const { parsed } = parseArtifact(content);
  if (!parsed || typeof parsed.data !== "object" || parsed.data === null) return null;
  const fm = parsed.data as Record<string, unknown>;
  // frontmatter-only: covers/tests/scope come ONLY from frontmatter, never prose
  const covers = asList(fm.covers);
  const tests = asList(fm.tests);
  // scope is optional list of upstream artifact paths or IDs relevant to this task
  const scope = asList(fm.related).concat(asList(fm.scope)).concat(asList(fm.sources));
  return { id: taskId(filePath, fm), filePath, covers, tests, scope };
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
      return b !== "traceability.md" && b !== "task-coverage.md" && !b.startsWith("capsule-");
    })
    .sort();
}

function findTaskFile(workItemDir: string, taskId: string): string | null {
  for (const f of collectTaskFiles(workItemDir)) {
    const raw = readFileSync(f, "utf8");
    const t = parseCapsuleTask(f, raw);
    if (t && t.id === taskId) return f;
  }
  return null;
}

export function buildCapsule(
  target: CapsuleTask,
  allTasks: CapsuleTask[],
  workItemDir: string,
): Capsule {
  // selective: only requirements/tests linked via this task's frontmatter are included
  const linkedSources = [...new Set([...target.covers, ...target.tests])].sort();
  // also include the task file itself as a source for provenance
  const lines: string[] = [];
  lines.push(`# Capsule — ${target.id} (derived)`);
  lines.push("");
  lines.push(`Source: \`${target.filePath}\` (task artifact, canonical)`);
  lines.push(`Work item: \`${workItemDir}\``);
  lines.push("");
  lines.push("## Linked requirements/tests (frontmatter-only, selective)");
  lines.push("");
  if (linkedSources.length === 0) lines.push("(none — task declares no covers/tests; capsule is empty by design)");
  else for (const s of linkedSources) lines.push(`- ${s}`);
  lines.push("");
  lines.push("## Peer tasks sharing a source (context neighbors, not full work-item)");
  lines.push("");
  const peers = allTasks.filter((t) => t.id !== target.id && t.covers.some((c) => linkedSources.includes(c)));
  if (peers.length === 0) lines.push("(none)");
  else for (const p of peers.sort((a, b) => a.id.localeCompare(b.id))) lines.push(`- ${p.id}: ${p.covers.join(", ")} -> \`${p.filePath}\``);
  lines.push("");
  lines.push("> Capsule is derived cache, never canonical authority. Regenerate from canonical task frontmatter.");
  lines.push("");
  return { task: target, linkedSources, body: lines.join("\n") };
}

export function generateCapsule(
  workItemDir: string,
  taskIdArg: string,
  outPath: string,
  manifestDir: string,
): Capsule {
  const normalized = taskIdArg.trim().toUpperCase();
  const taskFile = findTaskFile(workItemDir, normalized);
  if (!taskFile) throw new Error(`capsule: task not found: ${taskIdArg} (looked in ${workItemDir}/task)`);
  const raw = readFileSync(taskFile, "utf8");
  const target = parseCapsuleTask(taskFile, raw);
  if (!target) throw new Error(`capsule: task unparseable: ${taskFile}`);
  const allTasks: CapsuleTask[] = [];
  for (const f of collectTaskFiles(workItemDir)) {
    const r = readFileSync(f, "utf8");
    const t = parseCapsuleTask(f, r);
    if (t) allTasks.push(t);
  }
  const capsule = buildCapsule(target, allTasks, workItemDir);
  // provenance: the capsule is derived from exactly the target task file (selective source)
  // stale when that canonical file changes — detected via checkDerivedFileFreshness
  const provenance = buildProvenance([taskFile]);
  const fm: Record<string, unknown> = {
    title: `Capsule — ${target.id} (derived)`,
    format_version: "okf/0.2",
    authors: [{ type: "agent", name: "lcs3-runtime" }],
    created: "2026-09-20",
    updated: "2026-09-20",
    artifact_type: "capsule",
    source: taskFile,
    cot_level: "strict",
    status: "active",
    provenance,
  };
  const errs = writeDerivedArtifact(outPath, fm, capsule.body, manifestDir);
  if (errs.length > 0) throw new Error(`capsule: ${errs.map((e) => e.message).join("; ")}`);
  return capsule;
}
