const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLiveFeedEventV1,
  validateLiveFeedEventV1,
} = require("../../src/live/liveFeedEvent.js");

function createValidEventInput(overrides = {}) {
  return {
    event_id: "event-1",
    session_id: "session-1",
    sequence: 1,
    timestamp: "2026-04-24T10:00:00.000Z",
    kind: "session.created",
    severity: "INFO",
    title: "Session created",
    summary: "Local live session was created.",
    source: {
      type: "system",
      ref: "local-session-store",
    },
    refs: {
      entity_ids: [],
      evidence_ids: [],
      governance_ref: null,
      authority_ref: null,
      forensic_refs: [],
      absence_refs: [],
      skin_ref: null,
    },
    visibility: "internal",
    foreman_hints: {
      narration_eligible: false,
      priority: 0,
      reason: "not_requested",
    },
    ...overrides,
  };
}

test("LiveFeedEventV1: creates a valid event", () => {
  const result = createLiveFeedEventV1(createValidEventInput());

  assert.equal(result.valid, true, result.issues.join("\n"));
  assert.equal(result.event.version, "meridian.v2.liveFeedEvent.v1");
  assert.equal(result.event.kind, "session.created");
  assert.equal(result.event.source.ref, "local-session-store");
});

test("LiveFeedEventV1: foreman_hints are required on every event", () => {
  const event = {
    version: "meridian.v2.liveFeedEvent.v1",
    ...createValidEventInput(),
  };
  delete event.foreman_hints;

  const validation = validateLiveFeedEventV1(event);

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /foreman_hints/);
});

test("LiveFeedEventV1: source refs are required", () => {
  const result = createLiveFeedEventV1(
    createValidEventInput({
      source: {
        type: "system",
      },
    })
  );

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /source.ref/);
});

test("LiveFeedEventV1: refs object shape is required", () => {
  const result = createLiveFeedEventV1(
    createValidEventInput({
      refs: {
        entity_ids: [],
      },
    })
  );

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /refs.evidence_ids/);
  assert.match(result.issues.join("\n"), /refs.governance_ref/);
  assert.match(result.issues.join("\n"), /refs.authority_ref/);
  assert.match(result.issues.join("\n"), /refs.forensic_refs/);
  assert.match(result.issues.join("\n"), /refs.absence_refs/);
  assert.match(result.issues.join("\n"), /refs.skin_ref/);
});

test("LiveFeedEventV1: unknown kind fails closed", () => {
  const result = createLiveFeedEventV1(
    createValidEventInput({
      kind: "foreman.spoke",
    })
  );

  assert.equal(result.valid, false);
});

test("LiveFeedEventV1: unknown severity fails closed", () => {
  const result = createLiveFeedEventV1(
    createValidEventInput({
      severity: "CRITICAL",
    })
  );

  assert.equal(result.valid, false);
});

test("LiveFeedEventV1: unknown visibility fails closed", () => {
  const result = createLiveFeedEventV1(
    createValidEventInput({
      visibility: "global_public",
    })
  );

  assert.equal(result.valid, false);
});

test("LiveFeedEventV1: malformed source fails closed", () => {
  const result = createLiveFeedEventV1(
    createValidEventInput({
      source: "system",
    })
  );

  assert.equal(result.valid, false);
  assert.match(result.issues.join("\n"), /source must be a plain object/);
});

test("LiveFeedEventV1: no Foreman behavior, API, or model fields are introduced", () => {
  const result = createLiveFeedEventV1(createValidEventInput());
  assert.equal(result.valid, true, result.issues.join("\n"));

  for (const forbiddenField of [
    "foreman",
    "foreman_api",
    "model",
    "api",
    "voice",
    "avatar",
    "ui",
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.event, forbiddenField),
      false
    );
  }

  assert.deepEqual(Object.keys(result.event.foreman_hints).sort(), [
    "narration_eligible",
    "priority",
    "reason",
  ]);
});
