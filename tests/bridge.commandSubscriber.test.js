const test = require("node:test");
const assert = require("node:assert/strict");
const commandsFixture = require("./fixtures/nats/commands.fixture.json");
const { createCommandSubscriber } = require("../src/bridge/commandSubscriber.js");
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

      return results.at(-1);
    },
  };
}

test("command subscriber binds the Wave 3 command subject and forwards deterministic governance requests", async () => {
  const evaluated = [];
  const results = [];
  const transport = createFakeTransport();
  const governanceTransport = {
    async evaluate(request) {
      evaluated.push(request);
      return {
        decision: "HOLD",
        reason: "authority_context_absent",
        publications: [],
      };
    },
  };
  const subscriber = createCommandSubscriber({
    transport,
    governanceTransport,
    onResult: async (result) => {
      results.push(result);
    },
  });

  await subscriber.start();

  assert.deepEqual(
    transport.subscriptions.map((subscription) => subscription.subject),
    [UPSTREAM_SUBJECTS.COMMAND_ENTITY_OR_BROADCAST]
  );

  const result = await transport.emit(
    commandsFixture.entity_command.subject,
    commandsFixture.entity_command.payload
  );

  assert.deepEqual(evaluated, [
    {
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
  ]);

  assert.deepEqual(results, [result]);
  assert.deepEqual(result.raw_payload, commandsFixture.entity_command.payload);
  assert.equal(result.route, "entity");
  assert.equal(result.outcome.decision, "HOLD");
});
