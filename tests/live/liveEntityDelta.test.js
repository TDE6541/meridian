const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createEntityDeltaV1,
  validateEntityDeltaV1,
} = require("../../src/live/liveEntityDelta");
const { createInspection } = require("../../src/entities/inspection");

function createValidInspection(overrides = {}) {
  return createInspection({
    entity_id: "inspection-a2-1",
    org_id: "fortworth-dev",
    name: "A2 inspection",
    status: "passed",
    ...overrides,
  });
}

function createValidDelta(overrides = {}) {
  const entity = overrides.entity || createValidInspection();

  return {
    version: "meridian.v2.entityDelta.v1",
    delta_id: "delta-a2-1",
    session_id: "session-a2",
    timestamp: "2026-04-24T10:00:00.000Z",
    operation: "state_transition",
    entity_type: entity.entity_type,
    entity_id: entity.entity_id,
    entity,
    source: {
      type: "live_gateway",
      ref: "tests/live/liveEntityDelta.test.js",
    },
    governance_context: {},
    authority_context: {},
    ...overrides,
  };
}

test("EntityDeltaV1: validates a delta around an existing valid entity payload", () => {
  const validation = validateEntityDeltaV1(createValidDelta());

  assert.equal(validation.valid, true, validation.issues.join("\n"));
  assert.deepEqual(validation.issues, []);
});

test("EntityDeltaV1: malformed payload fails closed", () => {
  const validation = validateEntityDeltaV1({
    version: "meridian.v2.entityDelta.v1",
  });

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /delta_id/);
  assert.match(validation.issues.join("\n"), /entity must be a plain object/);
});

test("EntityDeltaV1: unknown entity type fails closed", () => {
  const delta = createValidDelta({
    entity_type: "unknown_entity",
  });

  const validation = validateEntityDeltaV1(delta);

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /entity_type is not supported/);
});

test("EntityDeltaV1: invalid entity fails closed", () => {
  const entity = createValidInspection({
    status: "not-a-real-inspection-state",
  });
  const validation = validateEntityDeltaV1(createValidDelta({ entity }));

  assert.equal(validation.valid, false);
  assert.match(
    validation.issues.join("\n"),
    /entity.status must be null or one of LIFECYCLE_STATES/
  );
});

test("EntityDeltaV1: source ref is required", () => {
  const delta = createValidDelta({
    source: {
      type: "live_gateway",
    },
  });

  const validation = validateEntityDeltaV1(delta);

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /source.ref/);
});

test("EntityDeltaV1: create helper does not mutate input", () => {
  const input = createValidDelta();
  const before = JSON.parse(JSON.stringify(input));

  const result = createEntityDeltaV1(input);

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.deepEqual(input, before);
  assert.notEqual(result.delta, input);
  assert.notEqual(result.delta.entity, input.entity);
});

test("EntityDeltaV1: existing entity validators are used, not bypassed", () => {
  const entity = createValidInspection();
  entity.signal_tree.governance.evidence.required_count = "1";

  const validation = validateEntityDeltaV1(createValidDelta({ entity }));

  assert.equal(validation.valid, false);
  assert.match(
    validation.issues.join("\n"),
    /entity.signal_tree must match the typed Meridian signal_tree subset/
  );
});
