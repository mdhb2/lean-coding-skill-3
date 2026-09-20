import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { getTask, putTask, withTransaction, type TaskRecord } from "./state.js";

export interface TransitionCheck {
  from: string;
  to: string;
  legal: boolean;
}

interface TaskMachine {
  states: Set<string>;
  terminal: Set<string>;
  edges: Set<string>;
  nextFrom: Map<string, string[]>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Single source of truth: task_status machine from canonical lifecycle.yaml
// (GATE-03 freeze). No hardcoded transition table here — drift the manifest
// and this module follows it; drift.test.ts guards manifest↔validator drift.
function loadMachine(manifestDir: string): TaskMachine {
  const path = join(manifestDir, "lifecycle.yaml");
  if (!existsSync(path)) throw new Error(`transitions: missing canonical manifest at ${path}`);
  let data: unknown;
  try {
    data = yamlLoad(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`transitions: malformed lifecycle.yaml at ${path}: ${(e as Error).message}`);
  }
  if (!isRecord(data) || !isRecord(data.task_status))
    throw new Error(`transitions: lifecycle.yaml at ${path} has no task_status machine`);
  const t = data.task_status;
  if (!Array.isArray(t.states) || !t.states.every((s) => typeof s === "string"))
    throw new Error(`transitions: task_status.states must be a string list in ${path}`);
  if (!Array.isArray(t.transitions))
    throw new Error(`transitions: task_status.transitions must be a list in ${path}`);
  const terminal = new Set(
    (Array.isArray(t.terminal) ? t.terminal : []).filter((s): s is string => typeof s === "string"),
  );
  const edges = new Set<string>();
  const nextFrom = new Map<string, string[]>();
  for (const e of t.transitions) {
    if (!isRecord(e) || typeof e.from !== "string" || typeof e.to !== "string")
      throw new Error(`transitions: every task_status transition needs string from/to in ${path}`);
    edges.add(`${e.from}→${e.to}`);
    const list = nextFrom.get(e.from) ?? [];
    list.push(e.to);
    nextFrom.set(e.from, list);
  }
  return { states: new Set(t.states as string[]), terminal, edges, nextFrom };
}

export function defaultManifestDir(): string {
  return new URL("../../.lcs3/manifests", import.meta.url).pathname;
}

function knownOrThrow(m: TaskMachine, state: string, role: string): void {
  if (!m.states.has(state))
    throw new Error(
      `transitions: unknown task_status '${state}' (${role}); legal states: ${[...m.states].join(", ")}`,
    );
}

/** Pure check: is from→to legal per the canonical machine? */
export function canTransition(manifestDir: string, from: string, to: string): boolean {
  const m = loadMachine(manifestDir);
  knownOrThrow(m, from, "from");
  knownOrThrow(m, to, "to");
  return m.edges.has(`${from}→${to}`);
}

/** Throw with actionable error (incl. legal next states) on illegal transition. */
export function assertTransition(manifestDir: string, from: string, to: string): void {
  const m = loadMachine(manifestDir);
  knownOrThrow(m, from, "from");
  knownOrThrow(m, to, "to");
  if (m.edges.has(`${from}→${to}`)) return;
  if (m.terminal.has(from))
    throw new Error(
      `transitions: illegal task_status transition '${from}' → '${to}': '${from}' is terminal and has no outgoing edges`,
    );
  const legal = m.nextFrom.get(from) ?? [];
  throw new Error(
    `transitions: illegal task_status transition '${from}' → '${to}'; legal next from '${from}': ${legal.length > 0 ? legal.join(", ") : "(none)"}`,
  );
}

/** Create a task row in a known state (default pending). Fails if it exists. */
export function createTask(
  dbPath: string,
  taskId: string,
  status = "pending",
  manifestDir: string = defaultManifestDir(),
): TaskRecord {
  if (!taskId) throw new Error("transitions: createTask requires a non-empty task id");
  const m = loadMachine(manifestDir);
  knownOrThrow(m, status, "initial status");
  if (getTask(dbPath, taskId) !== null)
    throw new Error(`transitions: task '${taskId}' already exists; use transitionTask to move it`);
  const record: TaskRecord = {
    taskId,
    taskStatus: status,
    owner: null,
    leaseUntil: null,
    heartbeatAt: null,
    updatedAt: "",
  };
  putTask(dbPath, record);
  const created = getTask(dbPath, taskId);
  if (created === null) throw new Error(`transitions: failed to create task '${taskId}'`);
  return created;
}

// Guardrail (SRC-019/AC-014): only task_status moves here. Artifact `status`
// values (draft/reviewed/active/archived) are unknown to this machine and
// rejected — cross-talk can never slip through as a legal edge.
/** Atomically move a task to a new state; rejects illegal/terminal/unknown. */
export function transitionTask(
  dbPath: string,
  taskId: string,
  to: string,
  manifestDir: string = defaultManifestDir(),
): TaskRecord {
  const m = loadMachine(manifestDir);
  knownOrThrow(m, to, "target");
  return withTransaction(dbPath, (tx) => {
    const cur = tx.get(taskId);
    if (cur === null)
      throw new Error(`transitions: unknown task '${taskId}'; create it first with createTask`);
    knownOrThrow(m, cur.taskStatus, "current");
    if (!m.edges.has(`${cur.taskStatus}→${to}`)) {
      if (m.terminal.has(cur.taskStatus))
        throw new Error(
          `transitions: illegal task_status transition '${cur.taskStatus}' → '${to}': '${cur.taskStatus}' is terminal and has no outgoing edges`,
        );
      const legal = m.nextFrom.get(cur.taskStatus) ?? [];
      throw new Error(
        `transitions: illegal task_status transition '${cur.taskStatus}' → '${to}'; legal next from '${cur.taskStatus}': ${legal.length > 0 ? legal.join(", ") : "(none)"}`,
      );
    }
    tx.put({ ...cur, taskStatus: to });
    const next = tx.get(taskId);
    if (next === null) throw new Error(`transitions: task '${taskId}' vanished mid-transition`);
    return next;
  });
}
