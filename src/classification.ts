// Complexity/risk classification contract (L3-032): deterministic representation
// of approved workflow routing inputs/outputs (SRC-029, SRC-030; FR-026/FR-027,
// AC-015/AC-016). Pure, no IO.
// Guardrail: caller supplies explicit complexity + risk labels; this module
// never scores, infers, or guesses them from prose. Risk dominates: any
// high risk requires the deep path even when complexity is low (AC-016).
export type Complexity = "low" | "high";
export type RiskLevel = "low" | "high";
export type WorkflowDepth = "short" | "full";

export interface ClassificationInput {
  complexity: Complexity;
  risk: RiskLevel;
}

export interface Classification extends ClassificationInput {
  depth: WorkflowDepth;
  requiresDeepPath: boolean;
  reason: string;
}

const COMPLEXITIES: readonly string[] = ["low", "high"];
const RISKS: readonly string[] = ["low", "high"];

function checkInput(input: ClassificationInput): void {
  if (typeof input !== "object" || input === null) {
    throw new Error("classification: input must be an object with complexity and risk");
  }
  if (!COMPLEXITIES.includes(input.complexity)) {
    throw new Error('classification: complexity must be "low" or "high" (FR-026, caller-supplied, never inferred)');
  }
  if (!RISKS.includes(input.risk)) {
    throw new Error('classification: risk must be "low" or "high" (FR-026, caller-supplied, never inferred)');
  }
}

export function classifyWork(input: ClassificationInput): Classification {
  checkInput(input);
  const requiresDeepPath = input.risk === "high" || input.complexity === "high";
  const depth: WorkflowDepth = requiresDeepPath ? "full" : "short";
  const reason =
    input.risk === "high"
      ? `risk=high requires deep path regardless of complexity=${input.complexity} (AC-016)`
      : input.complexity === "high"
        ? "complexity=high requires deep path (FR-027)"
        : "low complexity + low risk may use short path (FR-027/AC-015)";
  return { complexity: input.complexity, risk: input.risk, depth, requiresDeepPath, reason };
}
