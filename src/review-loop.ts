// Review-fix handoff loop (L3-038): executor consumes approved FIX-###
// findings and returns work to review (SRC-039, AC-037/AC-038). Uses existing
// primitives only: getTask/transitionTask (task_status machine) + getFinding /
// transitionFinding (finding states). Path: in_review -> needs_fix (reviewer
// sends) -> claimed (executor returns after fixing). Only listed findings are
// touched; unrelated findings remain unchanged.
import { getTask } from "./state.js";
import { transitionTask, defaultManifestDir } from "./transitions.js";
import { getFinding } from "./findings.js";
import type { TaskRecord } from "./state.js";
import type { Finding } from "./findings.js";

export interface FixHandoff {
  task: TaskRecord;
  findings: Finding[];
}

function checkIds(ids: string[]): void {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("review-loop: findingIds must be a non-empty string list");
  }
  for (const id of ids) {
    if (typeof id !== "string" || !id.trim()) {
      throw new Error("review-loop: findingIds must be a non-empty string list");
    }
  }
}

/** Reviewer sends in_review work to needs_fix with specific open findings. */
export function sendToNeedsFix(
  dbPath: string,
  taskId: string,
  findingIds: string[],
  manifestDir: string = defaultManifestDir(),
): FixHandoff {
  if (!taskId) throw new Error("review-loop: task id must be non-empty");
  checkIds(findingIds);
  const task = getTask(dbPath, taskId);
  if (!task) throw new Error(`review-loop: unknown task '${taskId}'`);
  if (task.taskStatus !== "in_review") {
    throw new Error(`review-loop: task '${taskId}' must be in_review to send to fix (got '${task.taskStatus}')`);
  }
  const findings: Finding[] = findingIds.map((fid) => {
    const f = getFinding(dbPath, fid);
    if (!f) throw new Error(`review-loop: unknown finding '${fid}'`);
    if (f.taskId !== taskId) {
      throw new Error(`review-loop: finding '${fid}' belongs to '${f.taskId}', not '${taskId}'`);
    }
    if (f.status !== "open") {
      throw new Error(`review-loop: finding '${fid}' must be open to send to fix (got '${f.status}')`);
    }
    return f;
  });
  const moved = transitionTask(dbPath, taskId, "needs_fix", manifestDir);
  return { task: moved, findings };
}

/** Executor returns needs_fix work to claimed after marking findings fixed. */
export function returnFromFix(
  dbPath: string,
  taskId: string,
  findingIds: string[],
  manifestDir: string = defaultManifestDir(),
): FixHandoff {
  if (!taskId) throw new Error("review-loop: task id must be non-empty");
  checkIds(findingIds);
  const task = getTask(dbPath, taskId);
  if (!task) throw new Error(`review-loop: unknown task '${taskId}'`);
  if (task.taskStatus !== "needs_fix") {
    throw new Error(`review-loop: task '${taskId}' must be needs_fix to return from fix (got '${task.taskStatus}')`);
  }
  const findings: Finding[] = findingIds.map((fid) => {
    const f = getFinding(dbPath, fid);
    if (!f) throw new Error(`review-loop: unknown finding '${fid}'`);
    if (f.taskId !== taskId) {
      throw new Error(`review-loop: finding '${fid}' belongs to '${f.taskId}', not '${taskId}'`);
    }
    if (f.status !== "fixed") {
      throw new Error(`review-loop: finding '${fid}' must be fixed before returning to review (got '${f.status}')`);
    }
    return f;
  });
  const moved = transitionTask(dbPath, taskId, "claimed", manifestDir);
  return { task: moved, findings };
}
