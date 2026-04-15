const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const supervisedFixture = require("./fixtures/governance/supervised.commandRequest.json");
const {
  createGovernanceTransportAdapter,
} = require("../src/bridge/governanceTransportAdapter.js");

test("governance transport adapter preserves the current HOLD publication posture for governed refusal", async () => {
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-14T12:03:00.000Z",
  });

  const result = await adapter.evaluate(refusalFixture);

  assert.equal(result.decision, "HOLD");
  assert.equal(
    result.reason,
    "missing_approvals=tpw_row,development_services;evidence_gap=3/4;missing_evidence_types=utility_conflict_assessment"
  );
  assert.equal(result.evaluated_at, "2026-04-14T12:03:00.000Z");
  assert.equal(result.publications.length, 3);
  assert.equal(
    result.publications[0].subject,
    "constellation.governance.fortworth-dev.permit-utility-2026-0847.hold"
  );
  assert.equal(result.publications[0].payload.decision, "HOLD");
});

test("governance transport adapter returns ALLOW without forcing publisher widening", async () => {
  let publishCalls = 0;
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-14T12:04:00.000Z",
    publisher: {
      async publishOutcome() {
        publishCalls += 1;
        return [];
      },
    },
  });

  const result = await adapter.evaluate(safePassFixture);

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "authority_and_evidence_resolved");
  assert.equal(result.evaluated_at, "2026-04-14T12:04:00.000Z");
  assert.deepEqual(result.publications, []);
  assert.equal(publishCalls, 0);
});

test("governance transport adapter returns SUPERVISE without forcing publisher widening", async () => {
  let publishCalls = 0;
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-14T12:04:30.000Z",
    publisher: {
      async publishOutcome() {
        publishCalls += 1;
        return [];
      },
    },
  });

  const result = await adapter.evaluate(supervisedFixture);

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.reason, "supervised_domain_requires_operator_review");
  assert.equal(result.evaluated_at, "2026-04-14T12:04:30.000Z");
  assert.deepEqual(result.publications, []);
  assert.equal(publishCalls, 0);
});

test("governance transport adapter fails closed on malformed requests without publishing", async () => {
  let publishCalls = 0;
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-14T12:05:00.000Z",
    publisher: {
      async publishOutcome() {
        publishCalls += 1;
        return [];
      },
    },
  });

  const result = await adapter.evaluate({
    kind: "command_request",
  });

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "request_org_id_required");
  assert.deepEqual(result.publications, []);
  assert.equal(publishCalls, 0);
});

test("governance transport adapter blocks event observations as deferred in Block A", async () => {
  let publishCalls = 0;
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-14T12:06:00.000Z",
    publisher: {
      async publishOutcome() {
        publishCalls += 1;
        return [];
      },
    },
  });

  const result = await adapter.evaluate({
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

  assert.equal(result.decision, "BLOCK");
  assert.equal(
    result.reason,
    "event_observation_deferred_block_a_command_request_only"
  );
  assert.deepEqual(result.publications, []);
  assert.equal(publishCalls, 0);
});

test("governance transport adapter delegates evaluation to the runtime landing zone", async () => {
  let delegatedRequest = null;
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-14T12:07:00.000Z",
    publisher: {
      async publishOutcome() {
        throw new Error("publisher should not be called for delegated ALLOW");
      },
    },
    evaluateGovernanceRequest(request) {
      delegatedRequest = request;
      return {
        decision: "ALLOW",
        reason: "delegated_allow",
      };
    },
  });

  const result = await adapter.evaluate(safePassFixture);

  assert.deepEqual(delegatedRequest, safePassFixture);
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "delegated_allow");
  assert.deepEqual(result.publications, []);
});
