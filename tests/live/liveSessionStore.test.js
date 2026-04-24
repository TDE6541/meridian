const test = require("node:test");
const assert = require("node:assert/strict");
const {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const {
  DEFAULT_LIVE_SESSION_ROOT,
  LiveSessionStore,
} = require("../../src/live/liveSessionStore.js");
const {
  hashRecord,
} = require("../../src/live/liveHashChain.js");

function createTempRoot() {
  return mkdtempSync(path.join(os.tmpdir(), "meridian-live-a1-"));
}

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

function createRecordInput(overrides = {}) {
  return {
    type: "session.created",
    source: {
      type: "system",
      ref: "test",
    },
    payload: {
      label: "first",
    },
    ...overrides,
  };
}

test("LiveSessionStore: creates a session", () => {
  const tempRoot = createTempRoot();
  try {
    const rootDirectory = path.join(tempRoot, ".meridian", "live-sessions");
    const store = createStore(rootDirectory);
    const result = store.createSession({ session_id: "session-a1" });

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.session.version, "meridian.v2.liveSession.v1");
    assert.equal(result.session.status, "open");
    assert.deepEqual(result.session.records, []);
    assert.equal(existsSync(path.join(rootDirectory, "session-a1.json")), true);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("LiveSessionStore: appends records with sequence numbers", () => {
  const tempRoot = createTempRoot();
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    store.createSession({ session_id: "session-a1" });

    const first = store.appendRecord("session-a1", createRecordInput());
    const second = store.appendRecord(
      "session-a1",
      createRecordInput({
        type: "hold.raised",
        payload: {
          label: "second",
        },
      })
    );

    assert.equal(first.ok, true, first.issues.join("\n"));
    assert.equal(second.ok, true, second.issues.join("\n"));
    assert.equal(first.record.sequence, 1);
    assert.equal(second.record.sequence, 2);
    assert.equal(second.record.previous_hash, first.record.hash);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("LiveSessionStore: every record has timestamp, source, previous hash, and hash", () => {
  const tempRoot = createTempRoot();
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    store.createSession({ session_id: "session-a1" });

    const appended = store.appendRecord("session-a1", createRecordInput());

    assert.equal(appended.ok, true, appended.issues.join("\n"));
    assert.equal(typeof appended.record.timestamp, "string");
    assert.deepEqual(appended.record.source, {
      type: "system",
      ref: "test",
    });
    assert.equal(appended.record.previous_hash, "GENESIS");
    assert.equal(typeof appended.record.hash, "string");
    assert.equal(appended.record.hash.length, 64);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("LiveSessionStore: hash chain changes when payload changes", () => {
  const tempRoot = createTempRoot();
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    store.createSession({ session_id: "session-a1" });

    const first = store.appendRecord(
      "session-a1",
      createRecordInput({
        payload: {
          label: "alpha",
        },
      })
    );
    const second = store.appendRecord(
      "session-a1",
      createRecordInput({
        payload: {
          label: "beta",
        },
      })
    );

    assert.equal(first.ok, true, first.issues.join("\n"));
    assert.equal(second.ok, true, second.issues.join("\n"));
    assert.notEqual(second.record.hash, first.record.hash);
    assert.equal(hashRecord(second.record).hash, second.record.hash);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("LiveSessionStore: restart/load from disk preserves session and records", () => {
  const tempRoot = createTempRoot();
  try {
    const rootDirectory = path.join(tempRoot, ".meridian", "live-sessions");
    const store = createStore(rootDirectory);
    store.createSession({ session_id: "session-a1" });
    const appended = store.appendRecord("session-a1", createRecordInput());
    const closed = store.closeSession("session-a1");

    assert.equal(appended.ok, true, appended.issues.join("\n"));
    assert.equal(closed.ok, true, closed.issues.join("\n"));

    const restartedStore = createStore(rootDirectory);
    const loaded = restartedStore.loadSession("session-a1");
    const listed = restartedStore.listRecords("session-a1");

    assert.equal(loaded.ok, true, loaded.issues.join("\n"));
    assert.equal(loaded.session.status, "closed");
    assert.equal(loaded.session.records.length, 1);
    assert.deepEqual(listed.records, loaded.session.records);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("LiveSessionStore: malformed records fail closed and are not persisted", () => {
  const tempRoot = createTempRoot();
  try {
    const rootDirectory = path.join(tempRoot, ".meridian", "live-sessions");
    const store = createStore(rootDirectory);
    store.createSession({ session_id: "session-a1" });
    store.appendRecord("session-a1", createRecordInput());

    const sessionPath = path.join(rootDirectory, "session-a1.json");
    const before = readFileSync(sessionPath, "utf8");
    const malformed = store.appendRecord(
      "session-a1",
      createRecordInput({
        source: {
          type: "system",
        },
      })
    );
    const after = readFileSync(sessionPath, "utf8");
    const listed = store.listRecords("session-a1");

    assert.equal(malformed.ok, false);
    assert.match(malformed.issues.join("\n"), /source.ref/);
    assert.equal(after, before);
    assert.equal(listed.records.length, 1);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("LiveSessionStore: .meridian/live-sessions is ignored generated state", () => {
  const repoRoot = path.join(__dirname, "..", "..");
  const output = execFileSync(
    "git",
    ["check-ignore", "-v", DEFAULT_LIVE_SESSION_ROOT],
    {
      cwd: repoRoot,
      encoding: "utf8",
    }
  );

  assert.match(output, /\.gitignore/);
  assert.match(output, /\.meridian\//);
});

test("LiveSessionStore: no Wave 6 forensic-chain imports are required", () => {
  const repoRoot = path.join(__dirname, "..", "..");
  const liveSources = [
    "contracts.js",
    "liveFeedEvent.js",
    "liveHashChain.js",
    "liveSessionStore.js",
  ].map((fileName) =>
    readFileSync(path.join(repoRoot, "src", "live", fileName), "utf8")
  );

  for (const source of liveSources) {
    assert.equal(source.includes("governance/forensic"), false);
    assert.equal(source.includes("CivicForensicChain"), false);
  }
});
