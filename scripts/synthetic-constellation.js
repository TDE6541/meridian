const assert = require("node:assert/strict");
const commandsFixture = require("../tests/fixtures/nats/commands.fixture.json");
const publicationsFixture = require("../tests/fixtures/nats/publications.fixture.json");
const { createCommandSubscriber } = require("../src/bridge/commandSubscriber");
const {
  createGovernanceTransportAdapter,
} = require("../src/bridge/governanceTransportAdapter");

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

async function main() {
  const transport = createFakeTransport();
  const adapter = createGovernanceTransportAdapter({
    now: () => publicationsFixture.hold_missing_authority.evaluated_at,
  });
  const subscriber = createCommandSubscriber({
    transport,
    governanceTransport: adapter,
  });

  await subscriber.start();

  const result = await transport.emit(
    commandsFixture.entity_command.subject,
    commandsFixture.entity_command.payload
  );

  const summary = {
    decision: result.outcome.decision,
    reason: result.outcome.reason,
    evaluated_at: result.outcome.evaluated_at,
    publications: result.outcome.publications,
  };

  assert.deepEqual(summary, publicationsFixture.hold_missing_authority);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
