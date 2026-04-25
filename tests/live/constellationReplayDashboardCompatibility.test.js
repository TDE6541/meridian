const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  replayConstellationMessages,
} = require("../../src/live/adapters/constellationReplayAdapter");
const {
  createDashboardLiveProjectionV1,
} = require("../../src/live/liveDashboardProjection");
const { LiveSessionStore } = require("../../src/live/liveSessionStore");

const repoRoot = path.join(__dirname, "../..");
const sampleFixturePath = path.join(
  repoRoot,
  "tests/fixtures/constellation-replay/constellation-replay.sample.jsonl"
);

function createClock() {
  let tick = 0;
  return () => {
    tick += 1;
    return `2026-04-25T11:00:${String(tick).padStart(2, "0")}.000Z`;
  };
}

function createStore(rootDirectory) {
  let tick = 0;
  return new LiveSessionStore({
    rootDirectory,
    now: createClock(),
    idGenerator: (prefix) => {
      tick += 1;
      return `${prefix}-a7-dashboard-${tick}`;
    },
  });
}

test("constellation replay dashboard compatibility: existing A5 rail recognizes replay event kind", () => {
  const liveTypes = readFileSync(
    path.join(repoRoot, "dashboard/src/live/liveTypes.ts"),
    "utf8"
  );
  const eventRail = readFileSync(
    path.join(repoRoot, "dashboard/src/components/LiveEventRail.tsx"),
    "utf8"
  );
  const timelineStateTest = readFileSync(
    path.join(repoRoot, "dashboard/tests/timeline-state.test.tsx"),
    "utf8"
  );

  assert.match(liveTypes, /"constellation\.replay\.received"/);
  assert.match(eventRail, /"constellation\.replay\.received": "Replay event"/);
  assert.match(eventRail, /Generic live event/);
  assert.match(timelineStateTest, /data-live-event-kind="constellation\.replay\.received"/);
});

test("constellation replay dashboard compatibility: replay-produced events project into dashboard live rail data", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a7-dashboard-"));
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    const created = store.createSession({ session_id: "session-a7-dashboard" });
    assert.equal(created.ok, true, created.issues.join("\n"));

    const replay = replayConstellationMessages({
      jsonl: readFileSync(sampleFixturePath, "utf8"),
      session_id: "session-a7-dashboard",
      store,
    });
    assert.equal(replay.ok, true, replay.issues.join("\n"));

    const loaded = store.loadSession("session-a7-dashboard");
    const projection = createDashboardLiveProjectionV1({
      session: loaded.session,
    });

    assert.equal(projection.ok, true, projection.issues.join("\n"));
    assert.deepEqual(
      projection.projection.events.map((event) => event.kind),
      [
        "constellation.replay.received",
        "constellation.replay.received",
        "constellation.replay.received",
      ]
    );
    assert.equal(
      projection.projection.events[0].source.type,
      "constellation_replay"
    );
    assert.equal(
      projection.projection.events[0].refs.evidence_ids.includes(
        "message:replay-msg-001"
      ),
      true
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
