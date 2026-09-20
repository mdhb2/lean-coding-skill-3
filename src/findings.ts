// Structured review finding IDs (L3-037): actionable FIX-### findings with
// stable target/evidence/status fields (SRC-039, AC-036). Audit history retained
// on close: the history JSON array accumulates every status transition, so a
// closed finding never loses its trail. Duplicate IDs rejected; status values
// constrained to open → fixed → closed (verified) or open → closed (wontfix,
// caller must supply reason — never inferred).
import { DatabaseSync } from "node:sqlite";
import { bootstrapDatabase } from "./db.js";

export type FindingStatus = "open" | "fixed" | "closed";

export interface Finding {
  findingId: string;
  taskId: string;
  target: string;
  evidence: string;
  status: FindingStatus;
  history: string[];
}

interface FindingRow {
  finding_id: string;
  task_id: string;
  target: string;
  evidence: string;
  status: string;
  history: string;
}

function openDb(dbPath: string): DatabaseSync {
  if (!dbPath) throw new Error("findings: empty database path");
  const res = bootstrapDatabase(dbPath);
  if (res.errors.length > 0) {
    throw new Error(`findings: cannot open runtime database at ${dbPath}: ${res.errors[0].message}`);
  }
  try {
    return new DatabaseSync(dbPath);
  } catch (e) {
    throw new Error(`findings: cannot open SQLite database at ${dbPath}: ${(e as Error).message}`);
  }
}

function checkId(id: string): void {
  if (!/^FIX-[0-9]{3}$/.test(id)) {
    throw new Error(`findings: finding id must match FIX-### (got '${id}')`);
  }
}

function rowToFinding(row: FindingRow): Finding {
  return {
    findingId: row.finding_id,
    taskId: row.task_id,
    target: row.target,
    evidence: row.evidence,
    status: row.status as FindingStatus,
    history: JSON.parse(row.history) as string[],
  };
}

/** Emit a new finding. Duplicate IDs rejected — IDs are stable, never reused. */
export function emitFinding(
  dbPath: string,
  input: { findingId: string; taskId: string; target: string; evidence: string },
): Finding {
  checkId(input.findingId);
  if (!input.taskId) throw new Error("findings: task id must be non-empty");
  if (!input.target?.trim()) throw new Error("findings: target must be a non-empty string");
  if (!input.evidence?.trim()) throw new Error("findings: evidence must be a non-empty string");
  const db = openDb(dbPath);
  try {
    const dup = db.prepare("SELECT finding_id FROM review_findings WHERE finding_id = ?").get(input.findingId);
    if (dup) throw new Error(`findings: duplicate finding id '${input.findingId}' — IDs are stable, never reused`);
    const history = JSON.stringify([`open: emitted for ${input.taskId}`]);
    db.prepare(
      `INSERT INTO review_findings (finding_id, task_id, target, evidence, status, history, updated_at)
       VALUES (?, ?, ?, ?, 'open', ?, datetime('now'))`,
    ).run(input.findingId, input.taskId, input.target.trim(), input.evidence.trim(), history);
    return { findingId: input.findingId, taskId: input.taskId, target: input.target.trim(), evidence: input.evidence.trim(), status: "open", history: JSON.parse(history) as string[] };
  } finally {
    db.close();
  }
}

/** Move a finding open → fixed → closed or open → closed. History appends every step. */
export function transitionFinding(
  dbPath: string,
  findingId: string,
  to: FindingStatus,
  note?: string,
): Finding {
  checkId(findingId);
  const db = openDb(dbPath);
  try {
    const row = db.prepare("SELECT * FROM review_findings WHERE finding_id = ?").get(findingId) as FindingRow | undefined;
    if (!row) throw new Error(`findings: unknown finding '${findingId}'`);
    const legal: Record<FindingStatus, FindingStatus[]> = { open: ["fixed", "closed"], fixed: ["closed"], closed: [] };
    const from = row.status as FindingStatus;
    if (!legal[from].includes(to)) {
      throw new Error(`findings: illegal finding transition '${from}' → '${to}'`);
    }
    const history = [...(JSON.parse(row.history) as string[]), `${to}: ${note?.trim() || "no note"}`];
    db.prepare("UPDATE review_findings SET status = ?, history = ?, updated_at = datetime('now') WHERE finding_id = ?").run(
      to,
      JSON.stringify(history),
      findingId,
    );
    return { ...rowToFinding(row), status: to, history };
  } finally {
    db.close();
  }
}

/** Read one finding, or null. */
export function getFinding(dbPath: string, findingId: string): Finding | null {
  checkId(findingId);
  const db = openDb(dbPath);
  try {
    const row = db.prepare("SELECT * FROM review_findings WHERE finding_id = ?").get(findingId) as FindingRow | undefined;
    return row ? rowToFinding(row) : null;
  } finally {
    db.close();
  }
}

/** List all findings for a task. */
export function listFindings(dbPath: string, taskId: string): Finding[] {
  if (!taskId) throw new Error("findings: task id must be non-empty");
  const db = openDb(dbPath);
  try {
    const rows = db.prepare("SELECT * FROM review_findings WHERE task_id = ? ORDER BY finding_id").all(taskId) as unknown as FindingRow[];
    return rows.map(rowToFinding);
  } finally {
    db.close();
  }
}
