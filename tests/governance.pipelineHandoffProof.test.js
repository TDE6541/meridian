const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const { runGovernanceSweep } = require("../src/governance/runtime/index.js");

test("pipeline handoff fixture rides the existing Wave 4A proof lane without runtime widening", () => {
  const translationFixture = JSON.parse(
    readFileSync(
      path.join(
        __dirname,
        "pipeline/fixtures/utility_refusal_translation_expected.json"
      ),
      "utf8"
    )
  );
  const request = {
    ...JSON.parse(JSON.stringify(refusalFixture)),
    candidate_signal_patch: {
      governance: {
        proof_mode: "local_frozen_capture_handoff",
        capture_handoff: translationFixture.governance_handoff,
      },
    },
  };

  const result = runGovernanceSweep({
    evaluatedAt: "2026-04-15T10:00:00.000Z",
    scenarios: [
      {
        scenarioId: "pipeline-handoff-refusal-proof",
        request,
        expectedDecision: "HOLD",
        governedNonEventProof: true,
      },
    ],
  });

  assert.equal(refusalFixture.candidate_signal_patch, null);
  assert.deepEqual(
    request.candidate_signal_patch.governance.capture_handoff,
    translationFixture.governance_handoff
  );
  assert.equal(result.governedNonEventProofPassed, true);
  assert.deepEqual(result.scenarios[0], {
    scenarioId: "pipeline-handoff-refusal-proof",
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
