const test = require("node:test");
const assert = require("node:assert/strict");
const commandsFixture = require("./fixtures/nats/commands.fixture.json");
const { translateCommandMessage } = require("../src/bridge/commandTranslator.js");

test("command translator derives GovernanceEvaluationRequest from subject and keeps payload opaque", () => {
  assert.deepEqual(translateCommandMessage(commandsFixture.entity_command), {
    request: {
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
    },
    raw_payload: commandsFixture.entity_command.payload,
    route: "entity",
  });
});

test("command translator keeps broadcast routing subject-driven and semantics opaque", () => {
  assert.deepEqual(translateCommandMessage(commandsFixture.broadcast_command), {
    request: {
      kind: "command_request",
      org_id: "fortworth-dev",
      entity_ref: {
        entity_id: "broadcast",
        entity_type: null,
      },
      authority_context: null,
      evidence_context: null,
      confidence_context: null,
      candidate_signal_patch: null,
      raw_subject: "constellation.commands.fortworth-dev.broadcast",
    },
    raw_payload: commandsFixture.broadcast_command.payload,
    route: "broadcast",
  });
});

test("command translator fails closed on malformed subjects", () => {
  assert.throws(
    () =>
      translateCommandMessage({
        subject: "constellation.commands.only-org",
        payload: {},
      }),
    /command\.subject must match constellation\.commands\.\{org_id\}\.\{entity_id\}/
  );
});
