// Doctor core (L3-048): deterministic project health checks over an assembled
// snapshot (SRC-060, AC-053). Pure — no filesystem, no SQLite, no network.
// The caller assembles the DoctorSnapshot from canonical manifests, state.db,
// and derived views; every finding carries a distinct actionable code.
//
// The 8 checks mirror the task card exactly: state inconsistency, lifecycle
// error, stale derived artifact, bad dependency, orphan, missing coverage,
// conflict, and contract drift. Legal/terminal states arrive in the snapshot
// (caller reads canonical lifecycle.yaml) so this module never hardcodes the
// state machine — drift the manifest and the caller follows it.

export const DOCTOR_CODES = [
  "doc-invalid-status",
  "doc-lifecycle-error",
  "doc-stale-derived",
  "doc-broken-dep",
  "doc-orphan",
  "doc-missing-coverage",
  "doc-conflict",
  "doc-contract-drift",
] as const;

export type DoctorCode = (typeof DOCTOR_CODES)[number];

export type DoctorSeverity = "error" | "warning";

export interface DoctorFinding {
  code: DoctorCode;
  target: string;
  evidence: string;
  severity: DoctorSeverity;
}

export interface DoctorTask {
  id: string;
  status: string;
  dependsOn: string[];
  /** Containing work-item id; empty means the task belongs to nothing. */
  workItemId: string;
  /** Claim owner; null when unclaimed. */
  owner: string | null;
}

export interface DoctorDerived {
  path: string;
  sourcePath: string;
  sourceMtimeMs: number;
  derivedMtimeMs: number;
}

export interface DoctorCoverage {
  requirementId: string;
  taskIds: string[];
}

export interface DoctorManifestDigest {
  name: string;
  expectedDigest: string;
  actualDigest: string;
}

export interface DoctorSnapshot {
  /** Legal task_status values from canonical lifecycle.yaml. */
  legalStates: string[];
  /** Terminal task_status values from canonical lifecycle.yaml. */
  terminalStates: string[];
  tasks: DoctorTask[];
  derived: DoctorDerived[];
  coverage: DoctorCoverage[];
  manifests: DoctorManifestDigest[];
}

function checkSnapshot(s: DoctorSnapshot): void {
  if (!s || typeof s !== "object") throw new Error("doctor: snapshot must be an object");
  if (!Array.isArray(s.legalStates) || s.legalStates.length === 0)
    throw new Error("doctor: snapshot.legalStates must be a non-empty string list");
  for (const f of ["tasks", "derived", "coverage", "manifests"] as const) {
    if (!Array.isArray(s[f])) throw new Error(`doctor: snapshot.${f} must be a list`);
  }
}

function push(
  out: DoctorFinding[],
  code: DoctorCode,
  target: string,
  evidence: string,
  severity: DoctorSeverity,
): void {
  out.push({ code, target, evidence, severity });
}

/** Run all 8 checks in fixed order; deterministic for a given snapshot. */
export function runDoctor(snapshot: DoctorSnapshot): DoctorFinding[] {
  checkSnapshot(snapshot);
  const legal = new Set(snapshot.legalStates);
  const terminal = new Set(snapshot.terminalStates);
  const knownIds = new Set(snapshot.tasks.map((t) => t.id));
  const out: DoctorFinding[] = [];

  for (const t of snapshot.tasks) {
    if (!legal.has(t.status)) {
      push(
        out,
        "doc-invalid-status",
        t.id,
        `task '${t.id}' has unknown status '${t.status}'; legal states: ${snapshot.legalStates.join(", ")}`,
        "error",
      );
    }
  }

  for (const t of snapshot.tasks) {
    if (terminal.has(t.status) && t.owner !== null) {
      push(
        out,
        "doc-lifecycle-error",
        t.id,
        `task '${t.id}' is terminal ('${t.status}') but still claimed by '${t.owner}'; release the claim on completion`,
        "error",
      );
    } else if (t.status === "claimed" && (t.owner === null || t.owner === "")) {
      push(
        out,
        "doc-lifecycle-error",
        t.id,
        `task '${t.id}' has status 'claimed' with no owner; claim or move it back to a pre-claim state`,
        "error",
      );
    }
  }

  for (const d of snapshot.derived) {
    if (d.derivedMtimeMs < d.sourceMtimeMs) {
      push(
        out,
        "doc-stale-derived",
        d.path,
        `derived artifact '${d.path}' (mtime ${d.derivedMtimeMs}) is older than canonical source '${d.sourcePath}' (mtime ${d.sourceMtimeMs}); regenerate it`,
        "warning",
      );
    }
  }

  for (const t of snapshot.tasks) {
    for (const dep of t.dependsOn) {
      if (!knownIds.has(dep)) {
        push(
          out,
          "doc-broken-dep",
          t.id,
          `task '${t.id}' depends on unknown task '${dep}'; fix the dependency or create the task`,
          "error",
        );
      }
    }
  }

  for (const t of snapshot.tasks) {
    if (t.workItemId === "") {
      push(
        out,
        "doc-orphan",
        t.id,
        `task '${t.id}' belongs to no work-item; file it under a work-item or remove it`,
        "error",
      );
    }
  }

  for (const c of snapshot.coverage) {
    const unknown = c.taskIds.filter((id) => !knownIds.has(id));
    if (c.taskIds.length === 0) {
      push(
        out,
        "doc-missing-coverage",
        c.requirementId,
        `requirement '${c.requirementId}' has no covering task; add a traceability link`,
        "warning",
      );
    } else if (unknown.length > 0) {
      push(
        out,
        "doc-missing-coverage",
        c.requirementId,
        `requirement '${c.requirementId}' links to unknown task(s): ${unknown.join(", ")}; fix the traceability link`,
        "warning",
      );
    }
  }

  const seen = new Set<string>();
  for (const t of snapshot.tasks) {
    if (seen.has(t.id)) {
      push(
        out,
        "doc-conflict",
        t.id,
        `duplicate task id '${t.id}'; two records claim the same identity — merge or rename one`,
        "error",
      );
    }
    seen.add(t.id);
  }

  for (const m of snapshot.manifests) {
    if (m.actualDigest !== m.expectedDigest) {
      push(
        out,
        "doc-contract-drift",
        m.name,
        `manifest '${m.name}' drifted: expected digest ${m.expectedDigest}, found ${m.actualDigest}; re-approve or restore the canonical manifest`,
        "error",
      );
    }
  }

  return out;
}
