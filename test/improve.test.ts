import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateProposals, makeProposalId } from "../src/improve.js";
import type { TelemetryEvent } from "../src/telemetry.js";

function makeEvent(overrides: Partial<TelemetryEvent> & { id: number }): TelemetryEvent {
  return {
    workflow: "build",
    task: "L3-001",
    result: "pass",
    retries: 0,
    failureType: null,
    contextSize: null,
    toolCalls: 1,
    filesRead: 0,
    filesWritten: 0,
    recordedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("generateProposals repeated failures", () => {
  it("proposes when the same workflow+failureType repeats at threshold", () => {
    const events = [1, 2, 3].map((id) =>
      makeEvent({ id, result: "fail", failureType: "timeout" }),
    );
    const proposals = generateProposals(events);
    assert.equal(proposals.length, 1);
    assert.match(proposals[0].title, /build/);
    assert.match(proposals[0].title, /timeout/);
    assert.equal(proposals[0].status, "proposed");
    // AC-052: every evidence ref resolves to a supplied input event.
    const inputIds = new Set(events.map((e) => e.id));
    assert.ok(proposals[0].evidence.length >= 3);
    for (const ref of proposals[0].evidence) {
      assert.equal(ref.kind, "telemetry");
      assert.ok(inputIds.has(ref.id), `evidence id ${ref.id} must reference an input event`);
    }
  });

  it("stays silent below the occurrence threshold", () => {
    const events = [1, 2].map((id) =>
      makeEvent({ id, result: "fail", failureType: "timeout" }),
    );
    assert.deepEqual(generateProposals(events), []);
  });

  it("does not mix different failure types or workflows", () => {
    const events = [
      makeEvent({ id: 1, result: "fail", failureType: "timeout" }),
      makeEvent({ id: 2, result: "fail", failureType: "conflict" }),
      makeEvent({ id: 3, result: "fail", failureType: "timeout", workflow: "other" }),
    ];
    assert.deepEqual(generateProposals(events), []);
  });
});

describe("generateProposals retry hotspot", () => {
  it("proposes when a workflow burns retries across multiple runs", () => {
    const events = [
      makeEvent({ id: 1, retries: 4 }),
      makeEvent({ id: 2, retries: 5 }),
      makeEvent({ id: 3, retries: 0 }),
    ];
    const proposals = generateProposals(events);
    assert.equal(proposals.length, 1);
    assert.match(proposals[0].title, /Retry hotspot in build/);
    assert.deepEqual(
      proposals[0].evidence.map((e) => e.id),
      [1, 2],
    );
  });

  it("stays silent for a single high-retry run", () => {
    assert.deepEqual(generateProposals([makeEvent({ id: 1, retries: 9 })]), []);
  });
});

describe("generateProposals determinism and input handling", () => {
  it("is deterministic and ID-stable for the same input", () => {
    const events = [1, 2, 3].map((id) =>
      makeEvent({ id, result: "fail", failureType: "timeout" }),
    );
    const first = generateProposals(events);
    const second = generateProposals(events);
    assert.deepEqual(first, second);
    assert.equal(first[0].id, makeProposalId(first[0].title, first[0].summary));
    assert.match(first[0].id, /^IMP-[0-9a-f]{12}$/);
  });

  it("returns no proposals for empty input and rejects bad options", () => {
    assert.deepEqual(generateProposals([]), []);
    assert.throws(() => generateProposals([], { minOccurrences: 0 }), /positive integer/);
    assert.throws(() => generateProposals([], { minRetries: -1 }), /positive integer/);
  });

  it("exposes no apply/mutate path (proposals only, AC-051)", async () => {
    const module = await import("../src/improve.js");
    for (const name of Object.keys(module)) {
      assert.doesNotMatch(name, /apply|mutate|write|persist|execute|save/i);
    }
  });
});
