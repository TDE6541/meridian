const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  validateHoldpointArtifactJson,
} = require("../../src/live/adapters/holdpointArtifactAdapter");

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

test("holdpoint artifact adapter: valid JSON fixture parses", () => {
  const artifact = readJsonFixture(SAMPLE_FIXTURE);
  const result = validateHoldpointArtifactJson(artifact);

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.artifact.version, "holdpointArtifactJson.v1");
  assert.equal(result.rows.length, 5);
  assert.deepEqual(
    result.rows.map((row) => row.row_kind),
    ["decisions", "decisions", "holds", "holds", "action_requests"]
  );
});

test("holdpoint artifact adapter: JSON string input parses", () => {
  const artifactText = readFileSync(SAMPLE_FIXTURE, "utf8");
  const result = validateHoldpointArtifactJson(artifactText);

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(
    result.artifact.source.ref,
    "tests/fixtures/live-capture/holdpoint/holdpoint-artifact.sample.json"
  );
});

test("holdpoint artifact adapter: CSV-like string fails visibly", () => {
  const result = validateHoldpointArtifactJson(
    "row_id,summary,source_ref\nrow-1,Synthetic row,file.csv#row1"
  );

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /CSV or tabular text input is not supported/);
  assert.match(result.issues.join("\n"), /JSON artifacts only/);
});

test("holdpoint artifact adapter: malformed artifact fails closed", () => {
  const artifact = readJsonFixture(INVALID_FIXTURE);
  const result = validateHoldpointArtifactJson(artifact);

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /source.ref/);
  assert.match(result.issues.join("\n"), /decisions\[0\]\.evidence is required/);
  assert.equal(result.artifact, null);
  assert.ok(result.row_holds.length >= 2);
});

test("holdpoint artifact adapter: missing row evidence fails closed", () => {
  const artifact = readJsonFixture(SAMPLE_FIXTURE);
  delete artifact.decisions[0].evidence;

  const result = validateHoldpointArtifactJson(artifact);

  assert.equal(result.ok, false);
  assert.match(result.issues.join("\n"), /decisions\[0\]\.evidence is required/);
  assert.equal(result.row_holds[0].row_id, "decision-row-1");
});

test("holdpoint artifact adapter: row and file specific source refs are preserved", () => {
  const artifact = readJsonFixture(SAMPLE_FIXTURE);
  const result = validateHoldpointArtifactJson(artifact);
  const canonicalRefs = result.rows.map((row) => row.source_refs.canonical_ref);

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(new Set(canonicalRefs).size, result.rows.length);

  for (const row of result.rows) {
    assert.equal(row.source.type, "holdpoint_artifact");
    assert.match(row.source.ref, /holdpoint-artifact\.sample\.json/);
    assert.equal(row.source.ref.includes(row.row_id), true);
    assert.equal(row.source.ref.includes(row.source_ref), true);
    assert.equal(row.source_refs.row_ref, row.source_ref);
    assert.equal(row.source_refs.evidence_ref, row.evidence.source_ref);
  }
});

test("holdpoint artifact adapter: input object is not mutated", () => {
  const artifact = readJsonFixture(SAMPLE_FIXTURE);
  const before = JSON.parse(JSON.stringify(artifact));

  const result = validateHoldpointArtifactJson(artifact);

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.deepEqual(artifact, before);
  assert.notEqual(result.artifact, artifact);
});

test("holdpoint artifact adapter: no live audio, Whisper, or external call behavior exists", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/adapters/holdpointArtifactAdapter.js"),
    "utf8"
  );

  assert.equal(/require\(["'][^"']*(nats|dashboard|src[\\/]skins)/.test(source), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(source), false);
  assert.equal(/OpenAI|Whisper|live audio|transcription/i.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
});
