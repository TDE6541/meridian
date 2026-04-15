const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const supervisedFixture = require("./fixtures/governance/supervised.commandRequest.json");
const hardStopFixture = require("./fixtures/governance/hard-stop.commandRequest.json");
const {
  GOVERNANCE_CONFIDENCE_TIERS,
  GOVERNANCE_CONFIDENCE_TIER_VALUES,
  MERIDIAN_GOVERNANCE_CONFIG,
  evaluateGovernanceRequest,
} = require("../src/governance/runtime/index.js");

function createEventObservationRequest() {
  return {
    kind: "event_observation",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "inspection-2026-0101",
      entity_type: "inspection",
    },
    authority_context: {
      resolved: true,
      requested_by_role: "fire_inspector",
      required_approvals: ["fire_department"],
      resolved_approvals: ["fire_department"],
      missing_approvals: [],
    },
    evidence_context: {
      required_count: 2,
      present_count: 2,
      missing_types: [],
    },
    confidence_context: null,
    candidate_signal_patch: null,
    raw_subject: "constellation.events.fortworth-dev.inspection-2026-0101",
  };
}

function createStandingRiskHoldRequest() {
  return {
    ...safePassFixture,
    confidence_context: {
      evaluation_session_id: "session-2026-04-14-standing-risk",
      continuity_entries: [
        {
          entry_id: "standing-risk-entry",
          entry_type: "hold",
          summary: "Prior unresolved inspection review still carries operational risk.",
          origin_session_id: "session-2026-04-10",
          last_seen_session_id: "session-2026-04-14-standing-risk",
          session_count: 3,
          carry_count: 2,
          source_refs: ["continuity://standing-risk-entry"],
          evidence_refs: ["evidence://standing-risk-entry"],
        },
      ],
      continuation_signals: [
        {
          entry_id: "standing-risk-entry",
          relevant_work_continued: true,
          blast_radius_still_exists: true,
          evidence_refs: ["continuation://standing-risk-entry"],
        },
      ],
      current_session_resolved_outcomes: [],
    },
  };
}

function createNonBlockingGapRequest() {
  return {
    ...safePassFixture,
    confidence_context: {
      evaluation_session_id: "session-2026-04-14-gap-signal",
      continuity_entries: [
        {
          entry_id: "gap-signal-entry",
          entry_type: "review",
          summary: "Prior inspection follow-up still needs manual confirmation.",
          origin_session_id: "session-2026-04-10",
          last_seen_session_id: "session-2026-04-14-gap-signal",
          session_count: 2,
          carry_count: 1,
          source_refs: ["continuity://gap-signal-entry"],
          evidence_refs: ["evidence://gap-signal-entry"],
        },
      ],
      continuation_signals: [
        {
          entry_id: "gap-signal-entry",
          relevant_work_continued: true,
          blast_radius_still_exists: true,
          evidence_refs: ["continuation://gap-signal-entry"],
        },
      ],
      current_session_resolved_outcomes: [],
    },
  };
}

test("safe-pass emits fully satisfied promise status", () => {
  const result = evaluateGovernanceRequest(safePassFixture);

  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 3,
    conditions_satisfied: 3,
    oldest_open_condition_at: null,
  });
});

test("safe-pass emits WATCH as a separate civic confidence axis", () => {
  const result = evaluateGovernanceRequest(safePassFixture);

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.runtimeSubset.civic.confidence.tier, "WATCH");
  assert.notEqual(result.decision, result.runtimeSubset.civic.confidence.tier);
});

test("safe-pass exposes a short decision rationale string", () => {
  const result = evaluateGovernanceRequest(safePassFixture);

  assert.equal(
    result.runtimeSubset.civic.rationale.decision,
    "Required approvals and evidence are resolved."
  );
});

test("supervised request emits GAP without changing the decision truth", () => {
  const result = evaluateGovernanceRequest(supervisedFixture);

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.runtimeSubset.civic.confidence.tier, "GAP");
  assert.equal(
    result.runtimeSubset.civic.confidence.rationale,
    "gap_supervised_review_required"
  );
});

test("refusal request emits open-condition promise status", () => {
  const result = evaluateGovernanceRequest(refusalFixture);

  assert.equal(result.runtimeSubset.civic.promise_status.conditions_total, 8);
  assert.equal(result.runtimeSubset.civic.promise_status.conditions_satisfied, 4);
  assert.ok(
    result.runtimeSubset.civic.promise_status.conditions_total >
      result.runtimeSubset.civic.promise_status.conditions_satisfied
  );
});

test("refusal request emits HOLD as a separate civic confidence tier", () => {
  const result = evaluateGovernanceRequest(refusalFixture);

  assert.equal(result.decision, "HOLD");
  assert.equal(result.runtimeSubset.civic.confidence.tier, "HOLD");
  assert.equal(
    result.runtimeSubset.civic.rationale.decision,
    "Required approvals and evidence remain unresolved."
  );
});

test("hard-stop request emits KILL while preserving BLOCK as the decision state", () => {
  const result = evaluateGovernanceRequest(hardStopFixture);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.runtimeSubset.civic.confidence.tier, "KILL");
  assert.notEqual(result.decision, result.runtimeSubset.civic.confidence.tier);
});

test("hard-stop request keeps promise status satisfied when no civic conditions remain open", () => {
  const result = evaluateGovernanceRequest(hardStopFixture);

  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 3,
    conditions_satisfied: 3,
    oldest_open_condition_at: null,
  });
});

test("malformed request emits KILL with an empty promise status projection", () => {
  const result = evaluateGovernanceRequest({
    kind: "command_request",
  });

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "request_org_id_required");
  assert.equal(result.runtimeSubset.civic.confidence.tier, "KILL");
  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 0,
    conditions_satisfied: 0,
    oldest_open_condition_at: null,
  });
});

test("event observations stay deferred and emit KILL without opening event-side routing", () => {
  const result = evaluateGovernanceRequest(createEventObservationRequest());

  assert.equal(result.decision, "BLOCK");
  assert.equal(
    result.reason,
    "event_observation_deferred_block_a_command_request_only"
  );
  assert.equal(result.runtimeSubset.civic.confidence.tier, "KILL");
  assert.equal(
    result.runtimeSubset.civic.rationale.decision,
    "Event-side governance routing remains deferred."
  );
});

test("promise status never fabricates oldest-open timestamps when none exist", () => {
  const refusalResult = evaluateGovernanceRequest(refusalFixture);
  const standingRiskResult = evaluateGovernanceRequest(createStandingRiskHoldRequest());

  assert.equal(
    refusalResult.runtimeSubset.civic.promise_status.oldest_open_condition_at,
    null
  );
  assert.equal(
    standingRiskResult.runtimeSubset.civic.promise_status.oldest_open_condition_at,
    null
  );
});

test("blocking standing-risk entries add an open civic condition and HOLD tier", () => {
  const result = evaluateGovernanceRequest(createStandingRiskHoldRequest());

  assert.equal(result.decision, "HOLD");
  assert.equal(result.runtimeSubset.civic.confidence.tier, "HOLD");
  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 4,
    conditions_satisfied: 3,
    oldest_open_condition_at: null,
  });
});

test("non-blocking carried continuity signals can raise GAP without changing ALLOW", () => {
  const result = evaluateGovernanceRequest(createNonBlockingGapRequest());

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.runtimeSubset.civic.confidence.tier, "GAP");
  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 4,
    conditions_satisfied: 3,
    oldest_open_condition_at: null,
  });
});

test("confidence tier vocabulary stays aligned with the static civic policy pack", () => {
  assert.deepEqual(
    GOVERNANCE_CONFIDENCE_TIER_VALUES,
    Object.keys(MERIDIAN_GOVERNANCE_CONFIG.confidenceThresholds)
  );
  assert.deepEqual(GOVERNANCE_CONFIDENCE_TIERS, {
    WATCH: "WATCH",
    GAP: "GAP",
    HOLD: "HOLD",
    KILL: "KILL",
  });
});

test("promise status keys match the shipped typed civic field family", () => {
  const result = evaluateGovernanceRequest(safePassFixture);

  assert.deepEqual(Object.keys(result.runtimeSubset.civic.promise_status), [
    "conditions_total",
    "conditions_satisfied",
    "oldest_open_condition_at",
  ]);
});
