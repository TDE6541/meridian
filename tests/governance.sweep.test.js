const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const hardStopFixture = require("./fixtures/governance/hard-stop.commandRequest.json");
const { runGovernanceSweep } = require("../src/governance/runtime/index.js");

test("governance sweep evaluates explicit synthetic scenarios through a read-only on-demand facade", () => {
  const result = runGovernanceSweep({
    evaluatedAt: "2026-04-15T09:00:00.000Z",
    scenarios: [
      {
        scenarioId: "governed-non-event-refusal",
        request: refusalFixture,
        expectedDecision: "HOLD",
        governedNonEventProof: true,
      },
      {
        scenarioId: "safe-pass-control",
        request: safePassFixture,
        expectedDecision: "ALLOW",
      },
      {
        scenarioId: "hard-stop-control",
        request: hardStopFixture,
        expectedDecision: "BLOCK",
      },
    ],
  });

  assert.equal(result.sweepMode, "on_demand_read_only");
  assert.equal(result.evaluatedAt, "2026-04-15T09:00:00.000Z");
  assert.equal(result.scenarioCount, 3);
  assert.equal(result.governedNonEventProofPassed, true);

  assert.deepEqual(result.scenarios, [
    {
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
    },
    {
      scenarioId: "safe-pass-control",
      decision: "ALLOW",
      reason: "authority_and_evidence_resolved",
      rationale: "Required approvals and evidence are resolved.",
      promiseStatus: {
        conditions_total: 3,
        conditions_satisfied: 3,
        oldest_open_condition_at: null,
      },
      confidenceTier: "WATCH",
      omissionSummary: {
        activeOmissionPackIds: [],
        findingCount: 0,
      },
      standingRiskSummary: {
        blockingItemCount: 0,
        blockingEntryIds: [],
      },
      governedNonEventProofPassed: null,
    },
    {
      scenarioId: "hard-stop-control",
      decision: "BLOCK",
      reason: "hard_stop_domain_requires_manual_lane",
      rationale: "HARD_STOP domain requires the manual lane.",
      promiseStatus: {
        conditions_total: 3,
        conditions_satisfied: 3,
        oldest_open_condition_at: null,
      },
      confidenceTier: "KILL",
      omissionSummary: {
        activeOmissionPackIds: [],
        findingCount: 0,
      },
      standingRiskSummary: {
        blockingItemCount: 0,
        blockingEntryIds: [],
      },
      governedNonEventProofPassed: null,
    },
  ]);
});

test("governance sweep stays explicit, read-only, and free of scheduler, publisher, event-side, or write logic", () => {
  const originalRefusalFixture = JSON.parse(JSON.stringify(refusalFixture));

  const result = runGovernanceSweep({
    scenarios: [
      {
        scenarioId: "governed-non-event-refusal",
        request: refusalFixture,
        governedNonEventProof: true,
      },
    ],
  });

  const sweepSource = readFileSync(
    path.join(__dirname, "../src/governance/runtime/runGovernanceSweep.js"),
    "utf8"
  );

  assert.equal(result.sweepMode, "on_demand_read_only");
  assert.deepEqual(refusalFixture, originalRefusalFixture);
  assert.equal(sweepSource.includes("setInterval"), false);
  assert.equal(sweepSource.includes("setTimeout"), false);
  assert.equal(/cron|daemon|worker/i.test(sweepSource), false);
  assert.equal(sweepSource.includes("governancePublisher"), false);
  assert.equal(sweepSource.includes("eventSubscriber"), false);
  assert.equal(sweepSource.includes("eventTranslator"), false);
  assert.equal(/writeFile|appendFile|createWriteStream/.test(sweepSource), false);
});
