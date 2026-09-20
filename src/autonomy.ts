// AFK/HITL policy evaluator (L3-035): deterministically classify whether
// execution may continue AFK or must stop for human authority (SRC-020,
// SRC-023; FR-029/FR-030, AC-019/AC-023). Pure, no IO.
// Guardrail: caller supplies explicit boolean flags; this module never infers
// them from prose. HITL triggers mirror SRC-023 wording verbatim: unresolved
// high-impact ambiguity, destructive actions, credentials, security/business
// decisions, retry exhaustion. Routine work continues AFK with no mode
// confirmation prompt (AC-019); HITL stops cite concrete triggers (AC-023).
export interface AutonomyInput {
  destructive: boolean;
  credentials: boolean;
  securityDecision: boolean;
  businessDecision: boolean;
  highImpactAmbiguity: boolean;
  retryExhausted: boolean;
}

export type AutonomyDecision = "afk-continue" | "hitl-stop";

export interface AutonomyResult {
  decision: AutonomyDecision;
  triggers: string[];
  reason: string;
}

// ponytail: fixed six-trigger set from SRC-023; promote to config-driven list
// if product adds trigger kinds.
const TRIGGERS: ReadonlyArray<{ key: keyof AutonomyInput; label: string }> = [
  { key: "destructive", label: "destructive action" },
  { key: "credentials", label: "credentials required" },
  { key: "securityDecision", label: "security decision" },
  { key: "businessDecision", label: "business decision" },
  { key: "highImpactAmbiguity", label: "unresolved high-impact ambiguity" },
  { key: "retryExhausted", label: "retry budget exhausted" },
];

function checkInput(input: AutonomyInput): void {
  if (typeof input !== "object" || input === null) {
    throw new Error("autonomy: input must be an object with six boolean flags");
  }
  for (const { key } of TRIGGERS) {
    if (typeof (input as unknown as Record<string, unknown>)[key] !== "boolean") {
      throw new Error(`autonomy: '${key}' must be a boolean (caller-supplied, never inferred)`);
    }
  }
}

export function evaluateAutonomy(input: AutonomyInput): AutonomyResult {
  checkInput(input);
  const triggers = TRIGGERS.filter(({ key }) => input[key]).map(({ label }) => label);
  if (triggers.length === 0) {
    return {
      decision: "afk-continue",
      triggers: [],
      reason: "no human-authority trigger present; routine work continues AFK with no mode confirmation (AC-019)",
    };
  }
  return {
    decision: "hitl-stop",
    triggers,
    reason: `human authority required: ${triggers.join("; ")} (AC-023)`,
  };
}
