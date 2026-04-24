const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  convertHoldpointArtifactToEntityDeltas,
} = require("../../src/live/adapters/captureToEntityDelta");
const {
  validateHoldpointArtifactJson,
} = require("../../src/live/adapters/holdpointArtifactAdapter");
const {
  validateEntityDeltaV1,
} = require("../../src/live/liveEntityDelta");

const SAMPLE_FIXTURE = path.join(
  __dirname,
  "../fixtures/live-capture/holdpoint/holdpoint-artifact.sample.json"
);

function readSampleArtifact() {
  return JSON.parse(readFileSync(SAMPLE_FIXTURE, "utf8"));
}

function convertSample() {
  const parsed = validateHoldpointArtifactJson(readSampleArtifact());
  assert.equal(parsed.ok, true, parsed.issues.join("\n"));
  return convertHoldpointArtifactToEntityDeltas(parsed, {
    session_id: "session-a3-conversion",
  });
}

function primaryDeltasByType(result, entityType) {
  return result.deltas.filter(
    (delta) =>
      delta.entity_type === entityType &&
      delta.governance_context.row.evidence_entity_id !== delta.entity_id
  );
}

test("capture to entity delta: decision rows produce valid decision_record deltas", () => {
  const result = convertSample();
  const decisionDeltas = primaryDeltasByType(result, "decision_record");

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(decisionDeltas.length, 2);
  for (const delta of decisionDeltas) {
    assert.equal(validateEntityDeltaV1(delta).valid, true);
    assert.equal(delta.operation, "proposed_creation");
    assert.equal(delta.source.type, "holdpoint_artifact");
  }
});

test("capture to entity delta: hold rows produce valid obligation deltas", () => {
  const result = convertSample();
  const holdDeltas = primaryDeltasByType(result, "obligation");

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(holdDeltas.length, 2);
  assert.ok(holdDeltas.every((delta) => validateEntityDeltaV1(delta).valid));
});

test("capture to entity delta: action request rows produce valid action_request deltas", () => {
  const result = convertSample();
  const actionDeltas = primaryDeltasByType(result, "action_request");

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(actionDeltas.length, 1);
  assert.ok(actionDeltas.every((delta) => validateEntityDeltaV1(delta).valid));
});

test("capture to entity delta: evidence rows produce evidence_artifact deltas with preserved evidence context", () => {
  const result = convertSample();
  const evidenceDeltas = result.deltas.filter(
    (delta) => delta.entity_type === "evidence_artifact"
  );

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(evidenceDeltas.length, 5);
  for (const delta of evidenceDeltas) {
    assert.equal(validateEntityDeltaV1(delta).valid, true);
    assert.equal(delta.operation, "evidence_link");
    assert.equal(typeof delta.governance_context.row.evidence.quote, "string");
    assert.equal(delta.governance_context.row.evidence.quote.length > 0, true);
    assert.equal(
      delta.governance_context.row.evidence.source_ref.includes("quote-"),
      true
    );
  }
});

test("capture to entity delta: generated deltas call and pass A2 validation", () => {
  const result = convertSample();

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.produced_delta_count, 10);
  assert.equal(result.delta_results.length, 10);
  assert.ok(
    result.delta_results.every(
      (entry) => entry.status === "PASS" && entry.validation.valid === true
    )
  );
  assert.ok(result.deltas.every((delta) => validateEntityDeltaV1(delta).valid));
});

test("capture to entity delta: source refs remain row specific", () => {
  const result = convertSample();

  assert.equal(result.ok, true, result.issues.join("\n"));
  for (const delta of result.deltas) {
    const row = delta.governance_context.row;
    assert.equal(delta.source.ref.includes(row.row_id), true);
    assert.equal(delta.source.ref.includes(row.source_ref), true);
    assert.equal(row.source_refs.canonical_ref, delta.source.ref);
  }
});

test("capture to entity delta: invalid adapter rows are not silently dropped", () => {
  const artifact = readSampleArtifact();
  delete artifact.holds[0].summary;
  const parsed = validateHoldpointArtifactJson(artifact);
  const result = convertHoldpointArtifactToEntityDeltas(parsed, {
    session_id: "session-a3-conversion",
  });

  assert.equal(parsed.ok, false);
  assert.equal(result.ok, false);
  assert.ok(result.row_holds.some((hold) => hold.row_id === "hold-row-1"));
  assert.equal(result.produced_delta_count, 8);
  assert.equal(
    result.deltas.some((delta) =>
      delta.source.ref.includes("hold-row-1")
    ),
    false
  );
});

test("capture to entity delta: entity validators are not bypassed or loosened", () => {
  const artifact = readSampleArtifact();
  artifact.decisions[0].status = "not-a-valid-decision-status";
  const parsed = validateHoldpointArtifactJson(artifact);
  const result = convertHoldpointArtifactToEntityDeltas(parsed, {
    session_id: "session-a3-conversion",
  });

  assert.equal(parsed.ok, true, parsed.issues.join("\n"));
  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /entity.status must be null or one of LIFECYCLE_STATES/);
  assert.ok(
    result.row_holds.some(
      (hold) =>
        hold.row_id === "decision-row-1" &&
        hold.reason === "entity_delta_invalid"
    )
  );
});
