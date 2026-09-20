// Execution attempt controller (L3-036): coordinate attempt → targeted
// verify → classify failure → retry/escalate using existing runtime
// primitives (SRC-020..SRC-023; FR-029..FR-032, AC-019..AC-023). Side effects:
// runs one targeted gate command, persists one retry row on gate failure.
// Guardrail: no code-generation logic here — the worker is the external
// reasoning actor. The failure category is caller-supplied (worker-reported),
// never inferred from gate output. A blocked gate (stale/missing recipe)
// escalates without consuming the retry budget.
import { evaluateAutonomy, type AutonomyInput, type AutonomyResult } from "./autonomy.js";
import { runTargetedGate, type GateResult } from "./gates.js";
import { recordFailure, type RetryState } from "./retries.js";
import type { ExecutionPolicy as ConfigExecutionPolicy } from "./config.js";

export interface AttemptInput {
  recipeName: string;
  execution: ConfigExecutionPolicy;
  failureCategory?: string;
  autonomy: AutonomyInput;
}

export type AttemptDecision = "done" | "retry" | "escalate";

export interface AttemptResult {
  decision: AttemptDecision;
  hitl: boolean;
  gate: GateResult;
  retry: RetryState | null;
  autonomy: AutonomyResult;
  reason: string;
}

export function runAttempt(
  dbPath: string,
  projectRoot: string,
  taskId: string,
  input: AttemptInput,
): AttemptResult {
  if (!taskId) throw new Error("attempts: task id must be non-empty");
  if (typeof input !== "object" || input === null) {
    throw new Error("attempts: input must be an object with recipeName, execution, and autonomy");
  }
  if (!input.recipeName || typeof input.recipeName !== "string") {
    throw new Error("attempts: recipeName must be a non-empty string");
  }
  const autonomy = evaluateAutonomy(input.autonomy);
  const gate = runTargetedGate(projectRoot, input.recipeName);

  if (gate.status === "blocked") {
    const hitl = autonomy.decision === "hitl-stop";
    return {
      decision: "escalate",
      hitl,
      gate,
      retry: null,
      autonomy,
      reason: `targeted verification blocked (${gate.reason}); escalate without consuming retry budget`,
    };
  }

  if (gate.status === "pass") {
    if (autonomy.decision === "hitl-stop") {
      return {
        decision: "escalate",
        hitl: true,
        gate,
        retry: null,
        autonomy,
        reason: `verification passed but human authority required: ${autonomy.triggers.join("; ")} (AC-023)`,
      };
    }
    return {
      decision: "done",
      hitl: false,
      gate,
      retry: null,
      autonomy,
      reason: "targeted verification passed; routine work continues AFK with no mode confirmation (AC-019)",
    };
  }

  // Gate failed: classify the worker-reported failure category (never inferred).
  if (!input.failureCategory) {
    throw new Error("attempts: failureCategory is required when verification fails (caller-supplied, never inferred)");
  }
  const retry = recordFailure(
    dbPath,
    taskId,
    input.failureCategory,
    input.execution,
  );
  if (retry.disposition === "retry" && autonomy.decision !== "hitl-stop") {
    return {
      decision: "retry",
      hitl: false,
      gate,
      retry,
      autonomy,
      reason: `recoverable failure retries within budget: ${retry.reason}`,
    };
  }
  return {
    decision: "escalate",
    hitl: retry.hitl || autonomy.decision === "hitl-stop",
    gate,
    retry,
    autonomy,
    reason: `escalate: ${retry.reason}`,
  };
}
