const test = require("node:test");
const assert = require("node:assert/strict");
const publicationsFixture = require("./fixtures/nats/publications.fixture.json");
const {
  createGovernancePublisher,
} = require("../src/bridge/governancePublisher.js");

test("governance publisher builds the approved governance, evidence, and disclosure publications", async () => {
  const published = [];
  const publisher = createGovernancePublisher({
    transport: {
      async publish(subject, payload) {
        published.push({ subject, payload });
      },
    },
  });

  const publications = await publisher.publishOutcome(
    {
      kind: "command_request",
      org_id: "fortworth-dev",
      entity_ref: {
        entity_id: "device-100",
        entity_type: "device",
      },
      raw_subject: "constellation.commands.fortworth-dev.device-100",
    },
    {
      decision: "HOLD",
      reason: "authority_context_absent",
      evaluated_at: "2026-04-14T12:03:00.000Z",
    }
  );

  assert.deepEqual(
    publications,
    publicationsFixture.hold_missing_authority.publications
  );
  assert.deepEqual(
    published,
    publications.map((publication) => ({
      subject: publication.subject,
      payload: publication.payload,
    }))
  );
});
