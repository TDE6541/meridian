const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const { runGovernanceSweep } = require("../src/governance/runtime/index.js");

test("frozen refusal fixture passes end to end as the governed non-event demo proof", () => {
  const result = runGovernanceSweep({
    evaluatedAt: "2026-04-15T09:15:00.000Z",
    scenarios: [
      {
        scenarioId: "governed-non-event-refusal",
        request: refusalFixture,
        expectedDecision: "HOLD",
        governedNonEventProof: true,
      },
    ],
  });

  assert.equal(result.scenarioCount, 1);
  assert.equal(result.governedNonEventProofPassed, true);
  assert.deepEqual(result.scenarios[0], {
    scenarioId: "governed-non-event-refusal",
    decision: "HOLD",
    reason:
      "missing_approvals=tpw_row,development_services;evidence_gap=3/4;missing_evidence_types=utility_conflict_assessment",
    rationale: "Required approvals and evidence remain unresolved.",
    promiseStatus: {
      conditions_total: 8,
      conditions_satisfied: 4,
      oldest_open_condition_at: null,
    },
    confidenceTier: "HOLD",
    omissionSummary: {
      activeOmissionPackIds: ["action_without_authority"],
      findingCount: 1,
    },
    standingRiskSummary: {
      blockingItemCount: 0,
      blockingEntryIds: [],
    },
    governedNonEventProofPassed: true,
  });
});
