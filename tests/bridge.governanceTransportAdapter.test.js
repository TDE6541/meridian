const test = require("node:test");
const assert = require("node:assert/strict");
const publicationsFixture = require("./fixtures/nats/publications.fixture.json");
const {
  createGovernanceTransportAdapter,
} = require("../src/bridge/governanceTransportAdapter.js");

test("governance transport adapter returns HOLD when authority context is absent", async () => {
  const adapter = createGovernanceTransportAdapter({
    now: () => publicationsFixture.hold_missing_authority.evaluated_at,
  });

  const result = await adapter.evaluate({
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "device-100",
      entity_type: "device",
    },
    authority_context: null,
    evidence_context: null,
    confidence_context: null,
    candidate_signal_patch: null,
    raw_subject: "constellation.commands.fortworth-dev.device-100",
  });

  assert.deepEqual(result, publicationsFixture.hold_missing_authority);
});

test("governance transport adapter blocks unresolved authority contexts", async () => {
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-14T12:04:00.000Z",
  });

  const result = await adapter.evaluate({
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "device-100",
      entity_type: "device",
    },
    authority_context: {
      resolved: false,
    },
    evidence_context: null,
    confidence_context: null,
    candidate_signal_patch: null,
    raw_subject: "constellation.commands.fortworth-dev.device-100",
  });

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_context_unresolved");
  assert.equal(
    result.publications[0].subject,
    "constellation.governance.fortworth-dev.device-100.decision"
  );
});

test("governance transport adapter never allows even when authority context appears resolved", async () => {
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-14T12:05:00.000Z",
  });

  const result = await adapter.evaluate({
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "device-100",
      entity_type: "device",
    },
    authority_context: {
      resolved: true,
      reviewed_by: "stub-lane",
    },
    evidence_context: null,
    confidence_context: null,
    candidate_signal_patch: null,
    raw_subject: "constellation.commands.fortworth-dev.device-100",
  });

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "wave3_stub_never_allows");
  assert.equal(result.publications[0].payload.decision, "BLOCK");
});
