const test = require("node:test");
const assert = require("node:assert/strict");
const eventsFixture = require("./fixtures/nats/events.fixture.json");
const telemetryFixture = require("./fixtures/nats/telemetry.fixture.json");
const { createEventSubscriber } = require("../src/bridge/eventSubscriber.js");
const { UPSTREAM_SUBJECTS } = require("../src/bridge/subjectCatalog.js");

function subjectMatches(pattern, subject) {
  const patternTokens = pattern.split(".");
  const subjectTokens = subject.split(".");

  for (let index = 0; index < patternTokens.length; index += 1) {
    const patternToken = patternTokens[index];
    const subjectToken = subjectTokens[index];

    if (patternToken === ">") {
      return true;
    }

    if (subjectToken === undefined) {
      return false;
    }

    if (patternToken !== "*" && patternToken !== subjectToken) {
      return false;
    }
  }

  return patternTokens.length === subjectTokens.length;
}

function createFakeTransport() {
  const subscriptions = [];

  return {
    subscriptions,
    async subscribe(subject, handler) {
      subscriptions.push({ subject, handler });
      return { subject };
    },
    async emit(subject, payload) {
      const matches = subscriptions.filter((subscription) =>
        subjectMatches(subscription.subject, subject)
      );

      if (matches.length === 0) {
        throw new Error(`No subscription matched ${subject}`);
      }

      const results = [];

      for (const subscription of matches) {
        results.push(await subscription.handler({ subject, payload }));
      }

      return results;
    },
  };
}

test("event subscriber binds the approved upstream subjects and emits normalized envelopes", async () => {
  const received = [];
  const transport = createFakeTransport();
  const subscriber = createEventSubscriber({
    transport,
    onEnvelope: async (envelope) => {
      received.push(envelope);
      return envelope;
    },
  });

  await subscriber.start();

  assert.deepEqual(
    transport.subscriptions.map((subscription) => subscription.subject).sort(),
    [UPSTREAM_SUBJECTS.EVENTS_ALL, UPSTREAM_SUBJECTS.TELEMETRY_ENTITY].sort()
  );

  await transport.emit(
    eventsFixture.valid_event.subject,
    eventsFixture.valid_event
  );
  await transport.emit(
    telemetryFixture.valid_telemetry.subject,
    telemetryFixture.valid_telemetry.payload
  );

  assert.deepEqual(received, [
    {
      channel: "events",
      subject: "constellation.events.entity.updated",
      org_id: "fortworth-dev",
      entity_id: "device-100",
      entity_type: "device",
      observed_at: "2026-04-14T12:00:00.000Z",
      raw_payload: eventsFixture.valid_event,
    },
    {
      channel: "telemetry",
      subject: "constellation.telemetry.fortworth-dev.device-100",
      org_id: "fortworth-dev",
      entity_id: "device-100",
      entity_type: "device",
      observed_at: "2026-04-14T12:01:00.000Z",
      raw_payload: telemetryFixture.valid_telemetry.payload,
    },
  ]);
});
