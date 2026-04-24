const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { getLiveFeedEvents } = require("../../src/live/liveEventBus");
const { LiveSessionStore } = require("../../src/live/liveSessionStore");

function createClock() {
  let tick = 0;
  return () => {
    tick += 1;
    return `2026-04-24T10:00:${String(tick).padStart(2, "0")}.000Z`;
  };
}

function createIdGenerator() {
  let tick = 0;
  return (prefix) => {
    tick += 1;
    return `${prefix}-${tick}`;
  };
}

function createStore(rootDirectory) {
  return new LiveSessionStore({
    rootDirectory,
    now: createClock(),
    idGenerator: createIdGenerator(),
  });
}

function appendEvent(store, sessionId, kind, summary = kind) {
  return store.appendRecord(sessionId, {
    type: kind,
    source: {
      type: "live_gateway",
      ref: "event-bus-test",
    },
    dashboard_visible: true,
    payload: {
      live_feed_event: {
        kind,
        severity: "INFO",
        title: kind,
        summary,
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
      },
    },
  });
}

test("live event bus: retrieves events from live session records", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-bus-"));
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    store.createSession({ session_id: "session-bus" });
    appendEvent(store, "session-bus", "entity.delta.accepted");

    const result = getLiveFeedEvents({ store, session_id: "session-bus" });

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].kind, "entity.delta.accepted");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("live event bus: since filtering works", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-bus-"));
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    store.createSession({ session_id: "session-bus" });
    appendEvent(store, "session-bus", "entity.delta.accepted");
    appendEvent(store, "session-bus", "governance.evaluated");

    const result = getLiveFeedEvents({
      store,
      session_id: "session-bus",
      since: 1,
    });

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.deepEqual(result.events.map((event) => event.sequence), [2]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("live event bus: sequence ordering is preserved", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-bus-"));
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    store.createSession({ session_id: "session-bus" });
    appendEvent(store, "session-bus", "governance.evaluated");
    appendEvent(store, "session-bus", "entity.delta.accepted");

    const records = store.listRecords("session-bus").records.reverse();
    const result = getLiveFeedEvents({ records });

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.deepEqual(result.events.map((event) => event.sequence), [1, 2]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("live event bus: unusual currently valid event kinds do not crash retrieval", () => {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-bus-"));
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    store.createSession({ session_id: "session-bus" });
    appendEvent(store, "session-bus", "cityData.seed.loaded");

    const result = getLiveFeedEvents({ store, session_id: "session-bus" });

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.events[0].kind, "cityData.seed.loaded");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("live event bus: malformed record or event is skipped with visible issues", () => {
  const malformedEventRecord = {
    version: "meridian.v2.liveSessionRecord.v1",
    record_id: "record-bad-event",
    session_id: "session-bus",
    sequence: 1,
    timestamp: "2026-04-24T10:00:00.000Z",
    type: "bad.future.event",
    source: {
      type: "live_gateway",
      ref: "event-bus-test",
    },
    payload: {
      live_feed_event: {
        kind: "bad.future.event",
        severity: "INFO",
        title: "Bad future event",
        summary: "Bad future event.",
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
      },
    },
    previous_hash: "GENESIS",
    hash: "not-checked-by-event-bus-contract-reader",
  };

  const result = getLiveFeedEvents({ records: [malformedEventRecord] });

  assert.equal(result.ok, false);
  assert.deepEqual(result.events, []);
  assert.match(result.issues.join("\n"), /payload.live_feed_event invalid/);
});
