const test = require("node:test");
const assert = require("node:assert/strict");
const eventsFixture = require("./fixtures/nats/events.fixture.json");
const telemetryFixture = require("./fixtures/nats/telemetry.fixture.json");
const {
  translateEventMessage,
  translateTelemetryMessage,
} = require("../src/bridge/eventTranslator.js");

test("event translator normalizes upstream events into the BridgeEnvelope contract", () => {
  assert.deepEqual(translateEventMessage(eventsFixture.valid_event), {
    channel: "events",
    subject: "constellation.events.entity.updated",
    org_id: "fortworth-dev",
    entity_id: "device-100",
    entity_type: "device",
    observed_at: "2026-04-14T12:00:00.000Z",
    raw_payload: eventsFixture.valid_event,
  });
});

test("event translator normalizes telemetry subjects into the BridgeEnvelope contract", () => {
  assert.deepEqual(
    translateTelemetryMessage(telemetryFixture.valid_telemetry),
    {
      channel: "telemetry",
      subject: "constellation.telemetry.fortworth-dev.device-100",
      org_id: "fortworth-dev",
      entity_id: "device-100",
      entity_type: "device",
      observed_at: "2026-04-14T12:01:00.000Z",
      raw_payload: telemetryFixture.valid_telemetry.payload,
    }
  );
});

test("event translator fails closed on malformed input", () => {
  assert.throws(
    () =>
      translateEventMessage({
        ...eventsFixture.valid_event,
        data: {
          ...eventsFixture.valid_event.data,
          entity_id: "",
        },
      }),
    /event\.data\.entity_id must be a non-empty string/
  );
});
