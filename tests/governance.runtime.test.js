const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
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

  assert.deepEqual(result, {
    decision: "HOLD",
    reason:
      "missing_approvals=tpw_row,development_services;evidence_gap=3/4;missing_evidence_types=utility_conflict_assessment",
  });
});

test("governance runtime returns ALLOW for the safe-pass fixture", () => {
  const result = evaluateGovernanceRequest(safePassFixture);

  assert.deepEqual(result, {
    decision: "ALLOW",
    reason: "authority_and_evidence_resolved",
  });
});
