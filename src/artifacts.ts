import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import type { ValidationError } from "./manifests.js";

export interface ParsedArtifact {
  data: unknown;
  body: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}Z)?$/;
const COT_LEVELS = ["light", "standard", "strict", "very_strict"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Split `---` frontmatter from body. Metadata comes ONLY from frontmatter, never prose. */
export function parseArtifact(content: string): { parsed: ParsedArtifact | null; errors: ValidationError[] } {
  const file = "artifact";
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return { parsed: null, errors: [{ file, message: "missing frontmatter delimiters" }] };
  }
  const lines = content.split("\n");
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { parsed: null, errors: [{ file, message: "unterminated frontmatter" }] };
  const raw = lines.slice(1, end).join("\n");
  let data: unknown;
  try {
    data = yamlLoad(raw);
  } catch {
    return { parsed: null, errors: [{ file, message: "malformed frontmatter YAML" }] };
  }
  return { parsed: { data, body: lines.slice(end + 1).join("\n") }, errors: [] };
}

function loadYaml(dir: string, file: string): unknown {
  const p = join(dir, file);
  if (!existsSync(p)) return undefined;
  return yamlLoad(readFileSync(p, "utf8"));
}

/** Authority class for one artifact_type, or undefined when unknown (AC-009). */
export function getArtifactAuthority(
  artifactType: string,
  manifestDir: string,
): "canonical" | "derived" | undefined {
  const m = loadYaml(manifestDir, "artifacts.yaml");
  if (!isRecord(m) || !Array.isArray(m.artifact_types)) return undefined;
  for (const e of m.artifact_types) {
    if (isRecord(e) && e.name === artifactType) {
      return e.authority === "derived" ? "derived" : e.authority === "canonical" ? "canonical" : undefined;
    }
  }
  return undefined;
}

/** Validate frontmatter against GATE-02 + manifests. Returns errors; empty means PASS. */
export function validateArtifactContent(content: string, manifestDir: string): ValidationError[] {
  const file = "artifact";
  const { parsed, errors } = parseArtifact(content);
  if (!parsed) return errors;
  const out: ValidationError[] = [...errors];
  const fm = parsed.data;
  if (!isRecord(fm)) {
    return [{ file, message: "frontmatter must be a mapping" }];
  }

  const manifests = loadYaml(manifestDir, "artifacts.yaml");
  const lifecycle = loadYaml(manifestDir, "lifecycle.yaml");
  if (!isRecord(manifests) || !Array.isArray(manifests.artifact_types)) {
    return [{ file, message: "artifacts.yaml registry unreadable" }];
  }
  if (!isRecord(lifecycle)) return [{ file, message: "lifecycle.yaml unreadable" }];

  const validTypes = new Map<string, unknown>();
  for (const e of manifests.artifact_types) {
    if (isRecord(e) && typeof e.name === "string") validTypes.set(e.name, e.authority);
  }
  const required: string[] = Array.isArray(manifests.required_fields)
    ? manifests.required_fields.filter((f): f is string => typeof f === "string")
    : [];
  const artifactStates: string[] = isRecord(lifecycle.artifact_status) &&
      Array.isArray(lifecycle.artifact_status.states)
    ? lifecycle.artifact_status.states.filter((s): s is string => typeof s === "string")
    : [];
  const taskStates: string[] = isRecord(lifecycle.task_status) && Array.isArray(lifecycle.task_status.states)
    ? lifecycle.task_status.states.filter((s): s is string => typeof s === "string")
    : [];

  for (const f of required) {
    if (!(f in fm)) out.push({ file, message: `missing required field '${f}'` });
  }

  if (fm.format_version !== "okf/0.2") out.push({ file, message: 'format_version must be "okf/0.2"' });
  if (typeof fm.title !== "string" || fm.title.length === 0) {
    out.push({ file, message: "title must be a non-empty string" });
  }
  if (
    !Array.isArray(fm.authors) || fm.authors.length === 0 ||
    !fm.authors.every((a) => isRecord(a) && (a.type === "human" || a.type === "agent") && typeof a.name === "string")
  ) {
    out.push({ file, message: "authors must be a non-empty list of {type: human|agent, name}" });
  }
  for (const f of ["created", "updated"] as const) {
    if (f in fm && (typeof fm[f] !== "string" || !ISO_DATE.test(fm[f]))) {
      out.push({ file, message: `${f} must be ISO-8601 YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ` });
    }
  }
  if (typeof fm.artifact_type !== "string" || !validTypes.has(fm.artifact_type)) {
    out.push({ file, message: `unknown artifact_type '${String(fm.artifact_type)}'` });
  }
  if ("source" in fm && (typeof fm.source !== "string" || fm.source.length === 0)) {
    out.push({ file, message: "source must be a non-empty string" });
  }
  if (typeof fm.cot_level !== "string" || !COT_LEVELS.includes(fm.cot_level)) {
    out.push({ file, message: `cot_level must be one of ${COT_LEVELS.join("|")}` });
  }
  // `type` forbidden except `state` (GATE-02 collision fix).
  if ("type" in fm && fm.artifact_type !== "state") {
    out.push({ file, message: "`type` forbidden except artifact_type state" });
  }
  // Lifecycle separation (AC-006/AC-014): status vs task_status never share vocab.
  if ("status" in fm && (typeof fm.status !== "string" || !artifactStates.includes(fm.status))) {
    out.push({ file, message: `status must be one of ${artifactStates.join("|")}` });
  }
  if (fm.artifact_type === "task") {
    if (typeof fm.task_status !== "string" || !taskStates.includes(fm.task_status)) {
      out.push({ file, message: `task artifact requires task_status one of ${taskStates.join("|")}` });
    }
  } else if ("task_status" in fm) {
    out.push({ file, message: "task_status only allowed on artifact_type task (AC-014)" });
  }
  if ("related" in fm && (!Array.isArray(fm.related) || !fm.related.every((r) => typeof r === "string"))) {
    out.push({ file, message: "related must be a list of strings" });
  }

  return out;
}

export function serializeArtifact(data: Record<string, unknown>, body: string): string {
  const yaml = yamlDump(data, { lineWidth: 120, noRefs: true }).trimEnd();
  return `---\n${yaml}\n---\n${body}`;
}

export function readArtifactFile(
  filePath: string,
  manifestDir: string,
): { parsed: ParsedArtifact | null; errors: ValidationError[]; raw: string | null } {
  if (!existsSync(filePath)) return { parsed: null, errors: [{ file: filePath, message: "file not found" }], raw: null };
  const raw = readFileSync(filePath, "utf8");
  const { parsed, errors: parseErrors } = parseArtifact(raw);
  if (!parsed) return { parsed: null, errors: parseErrors.map((e) => ({ ...e, file: filePath })), raw };
  const vErrors = validateArtifactContent(raw, manifestDir).map((e) => ({ ...e, file: filePath }));
  return { parsed, errors: vErrors, raw };
}

export function writeCanonicalArtifact(
  filePath: string,
  data: Record<string, unknown>,
  body: string,
  manifestDir: string,
): ValidationError[] {
  const at = typeof data.artifact_type === "string" ? data.artifact_type : "";
  const auth = at ? getArtifactAuthority(at, manifestDir) : undefined;
  if (auth === "derived") {
    return [{ file: filePath, message: `derived artifact_type '${at}' cannot be written through canonical API` }];
  }
  if (auth === undefined && at) {
    // let validateArtifactContent report unknown type, but still block write
  }
  const content = serializeArtifact(data, body);
  const errors = validateArtifactContent(content, manifestDir).map((e) => ({ ...e, file: filePath }));
  if (errors.length > 0) return errors;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
  return [];
}

export function writeDerivedArtifact(
  filePath: string,
  data: Record<string, unknown>,
  body: string,
  manifestDir: string,
): ValidationError[] {
  const at = typeof data.artifact_type === "string" ? data.artifact_type : "";
  const auth = at ? getArtifactAuthority(at, manifestDir) : undefined;
  if (auth === "canonical") {
    return [{ file: filePath, message: `canonical artifact_type '${at}' cannot be written through derived API` }];
  }
  const content = serializeArtifact(data, body);
  const errors = validateArtifactContent(content, manifestDir).map((e) => ({ ...e, file: filePath }));
  if (errors.length > 0) return errors;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
  return [];
}
