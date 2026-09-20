import { digestContent } from "./provenance.js";
import type { TelemetryEvent } from "./telemetry.js";

// L3-046: self-improvement proposal generator (SRC-059, AC-052). Pure
// function: it reads telemetry evidence supplied by the caller and returns
// explicit improvement proposal objects. It has no filesystem/SQLite access
// and no apply/mutate path — proposals must be reviewed and applied through
// an explicit workflow (SRC-058 guardrail, AC-051).

export interface ProposalEvidence {
  kind: "telemetry";
  id: number;
}

export interface ImprovementProposal {
  id: string;
  title: string;
  summary: string;
  evidence: ProposalEvidence[];
  status: "proposed";
}

export interface GenerateProposalsOptions {
  // Minimum repeated occurrences before a pattern becomes a proposal.
  minOccurrences?: number;
  // Retry count at or above which an event counts as a retry hotspot.
  minRetries?: number;
}

export const PROPOSALS_MIN_OCCURRENCES_DEFAULT = 3;
export const PROPOSALS_MIN_RETRIES_DEFAULT = 3;

export function makeProposalId(title: string, summary: string): string {
  return `IMP-${digestContent(`${title}\n${summary}`).slice(0, 12)}`;
}

function resolveOptions(options: GenerateProposalsOptions): {
  minOccurrences: number;
  minRetries: number;
} {
  const minOccurrences = options.minOccurrences ?? PROPOSALS_MIN_OCCURRENCES_DEFAULT;
  const minRetries = options.minRetries ?? PROPOSALS_MIN_RETRIES_DEFAULT;
  if (!Number.isInteger(minOccurrences) || minOccurrences < 1) {
    throw new Error("minOccurrences must be a positive integer");
  }
  if (!Number.isInteger(minRetries) || minRetries < 1) {
    throw new Error("minRetries must be a positive integer");
  }
  return { minOccurrences, minRetries };
}

function buildProposal(title: string, summary: string, eventIds: number[]): ImprovementProposal {
  const evidence: ProposalEvidence[] = [...new Set(eventIds)]
    .sort((a, b) => a - b)
    .map((id) => ({ kind: "telemetry" as const, id }));
  return {
    id: makeProposalId(title, summary),
    title,
    summary,
    evidence,
    status: "proposed",
  };
}

export function generateProposals(
  events: TelemetryEvent[],
  options: GenerateProposalsOptions = {},
): ImprovementProposal[] {
  if (!Array.isArray(events)) throw new Error("events must be an array");
  const { minOccurrences, minRetries } = resolveOptions(options);
  const proposals: ImprovementProposal[] = [];

  // Rule 1: repeated failures — same workflow + failure type recurring at or
  // above the occurrence threshold.
  const failures = new Map<string, { workflow: string; failureType: string; ids: number[] }>();
  for (const event of events) {
    if (event.result !== "fail") continue;
    const failureType = event.failureType ?? "unknown";
    const key = `${event.workflow}\n${failureType}`;
    let group = failures.get(key);
    if (!group) {
      group = { workflow: event.workflow, failureType, ids: [] };
      failures.set(key, group);
    }
    group.ids.push(event.id);
  }
  for (const key of [...failures.keys()].sort()) {
    const group = failures.get(key);
    if (!group || group.ids.length < minOccurrences) continue;
    proposals.push(
      buildProposal(
        `Repeated ${group.failureType} failures in ${group.workflow} (${group.ids.length} occurrences)`,
        `Telemetry shows ${group.ids.length} failed runs of workflow ` +
          `'${group.workflow}' with failure type '${group.failureType}'. ` +
          `Review the workflow for a systemic fix; this proposal changes nothing by itself.`,
        group.ids,
      ),
    );
  }

  // Rule 2: retry hotspot — events burning retries at or above the retry
  // threshold, grouped by workflow.
  const hotspots = new Map<string, number[]>();
  for (const event of events) {
    if (event.retries < minRetries) continue;
    let ids = hotspots.get(event.workflow);
    if (!ids) {
      ids = [];
      hotspots.set(event.workflow, ids);
    }
    ids.push(event.id);
  }
  for (const workflow of [...hotspots.keys()].sort()) {
    const ids = hotspots.get(workflow);
    if (!ids || ids.length < 2) continue;
    proposals.push(
      buildProposal(
        `Retry hotspot in ${workflow} (${ids.length} runs with >= ${minRetries} retries)`,
        `Telemetry shows ${ids.length} runs of workflow '${workflow}' each ` +
          `requiring ${minRetries} or more retries. Investigate flakiness or ` +
          `retry policy; this proposal changes nothing by itself.`,
        ids,
      ),
    );
  }

  return proposals;
}
