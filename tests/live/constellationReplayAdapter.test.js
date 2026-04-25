const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  CONSTELLATION_REPLAY_CONTRACT_VERSION,
  normalizeBridgeCompatibleMessage,
  parseReplayJsonl,
  replayConstellationMessages,
  validateConstellationReplayWrapperV1,
} = require("../../src/live/adapters/constellationReplayAdapter");
const { getLiveFeedEvents } = require("../../src/live/liveEventBus");
const { LiveSessionStore } = require("../../src/live/liveSessionStore");

const repoRoot = path.join(__dirname, "../..");
const sampleFixturePath = path.join(
  repoRoot,
  "tests/fixtures/constellation-replay/constellation-replay.sample.jsonl"
);
const invalidFixturePath = path.join(
  repoRoot,
  "tests/fixtures/constellation-replay/constellation-replay.invalid.jsonl"
);

function createClock() {
  let tick = 0;
  return () => {
    tick += 1;
    return `2026-04-25T10:10:${String(tick).padStart(2, "0")}.000Z`;
  };
}

function createIdGenerator() {
  let tick = 0;
  return (prefix) => {
    tick += 1;
    return `${prefix}-a7-${tick}`;
  };
}

function withStore(callback) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a7-replay-"));
  try {
    const store = new LiveSessionStore({
      rootDirectory: path.join(tempRoot, ".meridian", "live-sessions"),
      now: createClock(),
      idGenerator: createIdGenerator(),
    });
    const created = store.createSession({ session_id: "session-a7-replay" });
    assert.equal(created.ok, true, created.issues.join("\n"));
    return callback(store, tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function readSampleMessages() {
  const parsed = parseReplayJsonl(readFileSync(sampleFixturePath, "utf8"));
  assert.equal(parsed.ok, true, parsed.issues.join("\n"));
  return parsed.messages;
}

test("constellation replay adapter: valid JSONL fixture parses", () => {
  const parsed = parseReplayJsonl(readFileSync(sampleFixturePath, "utf8"));

  assert.equal(parsed.ok, true, parsed.issues.join("\n"));
  assert.equal(parsed.messages.length, 3);
  assert.deepEqual(
    parsed.messages.map((message) => message.message_id),
    ["replay-msg-001", "replay-msg-002", "replay-msg-003"]
  );
});

test("constellation replay adapter: replay wrapper validates", () => {
  const messages = readSampleMessages();
  const validation = validateConstellationReplayWrapperV1(messages[0]);

  assert.equal(validation.ok, true, validation.issues.join("\n"));
  assert.equal(messages[0].version, CONSTELLATION_REPLAY_CONTRACT_VERSION);
  assert.equal(messages[0].mode, "replay");
  assert.equal(messages[0].original.payload_ref.includes("payload-001"), true);
});

test("constellation replay adapter: malformed JSONL fails closed", () =>
  withStore((store) => {
    const result = replayConstellationMessages({
      jsonl: readFileSync(invalidFixturePath, "utf8"),
      session_id: "session-a7-replay",
      store,
    });
    const listed = store.listRecords("session-a7-replay");

    assert.equal(result.ok, false);
    assert.equal(result.status, "HOLD");
    assert.equal(result.appended_count, 0);
    assert.match(result.issues.join("\n"), /malformed JSON/);
    assert.equal(listed.records.length, 0);
  }));

test("constellation replay adapter: original subject and payload refs are preserved", () => {
  const [eventMessage, commandMessage] = readSampleMessages();
  const event = normalizeBridgeCompatibleMessage(eventMessage);
  const command = normalizeBridgeCompatibleMessage(commandMessage);

  assert.equal(event.ok, true, event.issues.join("\n"));
  assert.equal(command.ok, true, command.issues.join("\n"));
  assert.equal(event.replay_record.subject, eventMessage.original.subject);
  assert.equal(
    event.replay_record.original.payload_ref,
    "fixture:constellation-replay.sample.jsonl#payload-001"
  );
  assert.equal(event.replay_record.bridge.kind, "BridgeEnvelope");
  assert.equal(command.replay_record.bridge.kind, "GovernanceEvaluationRequest");
  assert.equal(
    command.replay_record.bridge.request.raw_subject,
    "constellation.commands.fortworth-dev.device-a7-001"
  );
});

test("constellation replay adapter: replay messages convert to live session records and events", () =>
  withStore((store) => {
    const result = replayConstellationMessages({
      jsonl: readFileSync(sampleFixturePath, "utf8"),
      session_id: "session-a7-replay",
      store,
    });
    const events = getLiveFeedEvents({
      store,
      session_id: "session-a7-replay",
    });

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.appended_count, 3);
    assert.deepEqual(
      result.records.map((record) => record.type),
      [
        "constellation.replay.received",
        "constellation.replay.received",
        "constellation.replay.received",
      ]
    );
    assert.equal(events.ok, true, events.issues.join("\n"));
    assert.deepEqual(
      events.events.map((event) => event.kind),
      [
        "constellation.replay.received",
        "constellation.replay.received",
        "constellation.replay.received",
      ]
    );
  }));

test("constellation replay adapter: replay event source distinguishes replay from live broker", () =>
  withStore((store) => {
    const result = replayConstellationMessages({
      jsonl: readFileSync(sampleFixturePath, "utf8"),
      session_id: "session-a7-replay",
      store,
    });
    const [event] = result.events;

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.deepEqual(event.source, {
      type: "constellation_replay",
      ref: "tests/fixtures/constellation-replay/constellation-replay.sample.jsonl#L1",
    });
    assert.equal(
      event.refs.evidence_ids.includes("message:replay-msg-001"),
      true
    );
    assert.equal(
      event.refs.evidence_ids.includes("subject:constellation.events.entity.updated"),
      true
    );
    assert.equal(
      event.refs.evidence_ids.includes("bridge-envelope:replay-msg-001"),
      true
    );
  }));

test("constellation replay adapter: no NATS, network, dashboard, or Foreman behavior", () => {
  const source = readFileSync(
    path.join(repoRoot, "src/live/adapters/constellationReplayAdapter.js"),
    "utf8"
  );

  assert.equal(/require\(["']nats["']\)/.test(source), false);
  assert.equal(/require\(["']node:(http|https|net|tls)["']\)/.test(source), false);
  assert.equal(/fetch\s*\(/.test(source), false);
  assert.equal(/require\(["'][^"']*dashboard/.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
});

test("constellation replay adapter: no bridge/config mutation or contract widening", () => {
  const diff = execFileSync(
    "git",
    ["diff", "--name-only", "--", "src/bridge", "src/config/constellation.js"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    }
  ).trim();
  const source = readFileSync(
    path.join(repoRoot, "src/live/adapters/constellationReplayAdapter.js"),
    "utf8"
  );

  assert.equal(diff, "");
  assert.equal(/require\(["'][^"']*natsTransport/.test(source), false);
  assert.equal(/require\(["'][^"']*config\/constellation/.test(source), false);
});
