const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const supervisedFixture = require("./fixtures/governance/supervised.commandRequest.json");
const hardStopFixture = require("./fixtures/governance/hard-stop.commandRequest.json");
const {
  evaluateGovernanceRequest,
} = require("../src/governance/runtime/index.js");

test("governance runtime fails closed on malformed requests", () => {
  const result = evaluateGovernanceRequest({
    kind: "command_request",
  });

  assert.deepEqual(result, {
    decision: "BLOCK",
    reason: "request_org_id_required",
  });
});

test("governance runtime blocks event observations as deferred in Block A", () => {
  const result = evaluateGovernanceRequest({
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
  });

  assert.deepEqual(result, {
    decision: "BLOCK",
    reason: "event_observation_deferred_block_a_command_request_only",
  });
});

test("governance runtime returns HOLD for the refusal fixture", () => {
  const result = evaluateGovernanceRequest(refusalFixture);

  assert.equal(result.decision, "HOLD");
  assert.equal(
    result.reason,
    "missing_approvals=tpw_row,development_services;evidence_gap=3/4;missing_evidence_types=utility_conflict_assessment"
  );
  assert.equal(result.hold.status, "active");
  assert.equal(result.runtimeSubset.controlRod.effectivePosture, "HARD_STOP");
});

test("governance runtime returns ALLOW for the safe-pass fixture", () => {
  const result = evaluateGovernanceRequest(safePassFixture);

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "authority_and_evidence_resolved");
  assert.equal(result.runtimeSubset.controlRod.effectivePosture, "FULL_AUTO");
});

test("governance runtime returns SUPERVISE for the supervised fixture", () => {
  const result = evaluateGovernanceRequest(supervisedFixture);

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.reason, "supervised_domain_requires_operator_review");
  assert.equal(result.runtimeSubset.controlRod.effectivePosture, "SUPERVISED");
});

test("governance runtime returns BLOCK for the hard-stop fixture", () => {
  const result = evaluateGovernanceRequest(hardStopFixture);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "hard_stop_domain_requires_manual_lane");
  assert.equal(result.runtimeSubset.controlRod.effectivePosture, "HARD_STOP");
});
