const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  ingestHoldpointArtifact,
} = require("../../src/live/adapters/holdpointArtifactIngest");
const { getLiveFeedEvents } = require("../../src/live/liveEventBus");
const { LiveSessionStore } = require("../../src/live/liveSessionStore");

const SAMPLE_FIXTURE = path.join(
  __dirname,
  "../fixtures/live-capture/holdpoint/holdpoint-artifact.sample.json"
);
const INVALID_FIXTURE = path.join(
  __dirname,
  "../fixtures/live-capture/holdpoint/holdpoint-artifact.invalid.json"
);

function readJsonFixture(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function createClock() {
  let tick = 0;
  return () => {
    tick += 1;
    return `2026-04-24T10:30:${String(tick).padStart(2, "0")}.000Z`;
  };
}

function createIdGenerator() {
  let tick = 0;
  return (prefix, id) => {
    if (id) {
      return `${prefix}-${id}`;
    }

    tick += 1;
    return `${prefix}-${tick}`;
  };
}

function withStore(callback) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a3-ingest-"));
  try {
    const store = new LiveSessionStore({
      rootDirectory: path.join(tempRoot, ".meridian", "live-sessions"),
      now: createClock(),
      idGenerator: createIdGenerator(),
    });
    const created = store.createSession({ session_id: "session-a3-ingest" });
    assert.equal(created.ok, true, created.issues.join("\n"));
    return callback(store, tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("holdpoint artifact ingest: sample artifact creates capture ingestion event", () =>
  withStore((store) => {
    const result = ingestHoldpointArtifact({
      store,
      session_id: "session-a3-ingest",
      artifact: readJsonFixture(SAMPLE_FIXTURE),
    });
    const events = getLiveFeedEvents({
      store,
      session_id: "session-a3-ingest",
    });

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.capture_event.kind, "capture.artifact_ingested");
    assert.equal(result.capture_record.type, "capture.artifact_ingested");
    assert.ok(events.events.some((event) => event.kind === "capture.artifact_ingested"));
  }));

test("holdpoint artifact ingest: sample artifact produces deltas and gateway evaluations", () =>
  withStore((store) => {
    const calledWith = [];
    const result = ingestHoldpointArtifact(
      {
        store,
        session_id: "session-a3-ingest",
        artifact: readJsonFixture(SAMPLE_FIXTURE),
      },
      {
        evaluateGovernanceRequest(request) {
          calledWith.push(request);
          return {
            decision: "ALLOW",
            reason: "a3_test_gateway_allow",
            runtimeSubset: {
              civic: {},
            },
          };
        },
        now: () => "2026-04-24T10:31:00.000Z",
        idGenerator: createIdGenerator(),
      }
    );

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.produced_delta_count, 10);
    assert.equal(result.evaluated_delta_count, 10);
    assert.equal(calledWith.length, result.produced_delta_count);
    assert.ok(
      calledWith.every(
        (request) =>
          request.kind === "command_request" &&
          request.raw_subject.startsWith("holdpoint://") &&
          typeof request.entity_ref.entity_id === "string"
      )
    );
    assert.ok(
      result.gateway_results.every(
        (gatewayResult) =>
          gatewayResult.ok === true &&
          gatewayResult.governance_evaluation.governance_result.reason ===
            "a3_test_gateway_allow"
      )
    );
  }));

test("holdpoint artifact ingest: live session feed shows capture and gateway events", () =>
  withStore((store) => {
    const result = ingestHoldpointArtifact({
      store,
      session_id: "session-a3-ingest",
      artifact: readJsonFixture(SAMPLE_FIXTURE),
    });
    const events = getLiveFeedEvents({
      store,
      session_id: "session-a3-ingest",
    });
    const eventKinds = events.events.map((event) => event.kind);

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(events.ok, true, events.issues.join("\n"));
    assert.equal(eventKinds[0], "capture.artifact_ingested");
    assert.ok(eventKinds.includes("entity.delta.accepted"));
    assert.ok(eventKinds.includes("governance.evaluated"));
  }));

test("holdpoint artifact ingest: invalid artifact returns structured HOLD/BLOCK posture", () =>
  withStore((store) => {
    const result = ingestHoldpointArtifact({
      store,
      session_id: "session-a3-ingest",
      artifact: readJsonFixture(INVALID_FIXTURE),
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "HOLD");
    assert.equal(result.decision, "BLOCK");
    assert.equal(result.reason, "holdpoint_artifact_invalid");
    assert.equal(result.capture_event, null);
    assert.equal(result.evaluated_delta_count, 0);
    assert.match(result.issues.join("\n"), /source.ref/);
  }));

test("holdpoint artifact ingest: row-level HOLDs are visible for invalid rows", () =>
  withStore((store) => {
    const result = ingestHoldpointArtifact({
      store,
      session_id: "session-a3-ingest",
      artifact: readJsonFixture(INVALID_FIXTURE),
    });

    assert.equal(result.ok, false);
    assert.ok(
      result.row_holds.some(
        (hold) =>
          hold.row_id === "decision-row-invalid-1" &&
          hold.issues.some((issue) => issue.includes("evidence"))
      )
    );
    assert.ok(
      result.row_holds.some(
        (hold) =>
          hold.row_id === "hold-row-invalid-1" &&
          hold.issues.some((issue) => issue.includes("summary"))
      )
    );
  }));

test("holdpoint artifact ingest: no dashboard, external API, audio, Whisper, or Foreman behavior", () => {
  const sources = [
    "holdpointArtifactAdapter.js",
    "captureToEntityDelta.js",
    "holdpointArtifactIngest.js",
  ]
    .map((fileName) =>
      readFileSync(
        path.join(__dirname, "../../src/live/adapters", fileName),
        "utf8"
      )
    )
    .join("\n");

  assert.equal(/require\(["'][^"']*dashboard/.test(sources), false);
  assert.equal(/require\(["'][^"']*nats/.test(sources), false);
  assert.equal(/require\(["'][^"']*src[\\/]skins/.test(sources), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(sources), false);
  assert.equal(/OpenAI|Whisper|live audio|transcription/i.test(sources), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(sources), false);
});
