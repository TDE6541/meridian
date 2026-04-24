const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const {
  LIVE_SESSION_CONTRACT_VERSION,
  LIVE_SESSION_RECORD_CONTRACT_VERSION,
  LIVE_SESSION_STATUSES,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  validateLiveSessionRecordV1,
  validateLiveSessionStatus,
  validateLiveSessionV1,
} = require("./contracts");
const {
  LIVE_HASH_CHAIN_GENESIS,
  canonicalJson,
  hashRecord,
  verifyRecordHash,
} = require("./liveHashChain");
const {
  createLiveFeedEventFromRecordV1,
} = require("./liveFeedEvent");

const DEFAULT_LIVE_SESSION_ROOT = ".meridian/live-sessions";

function cloneJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  if (isPlainObject(value)) {
    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      clone[key] = cloneJsonValue(entry);
    }
    return clone;
  }

  return value;
}

function isSafeId(value) {
  return (
    isNonEmptyString(value) &&
    /^[A-Za-z0-9._-]+$/.test(value) &&
    value !== "." &&
    value !== ".." &&
    !value.includes("..")
  );
}

function createStoreResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function defaultIdGenerator(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function normalizeString(value, fallback) {
  return isNonEmptyString(value) ? value : fallback;
}

class LiveSessionStore {
  constructor(options = {}) {
    if (!isPlainObject(options)) {
      throw new TypeError("options must be a plain object");
    }

    this.fs = options.fs || fs;
    this.path = options.path || path;
    this.cwd = normalizeString(options.cwd, process.cwd());
    this.rootDirectory = normalizeString(
      options.rootDirectory || options.root_directory,
      DEFAULT_LIVE_SESSION_ROOT
    );
    this.now = options.now || (() => new Date().toISOString());
    this.idGenerator = options.idGenerator || defaultIdGenerator;

    if (typeof this.now !== "function") {
      throw new TypeError("now must be a function");
    }

    if (typeof this.idGenerator !== "function") {
      throw new TypeError("idGenerator must be a function");
    }
  }

  resolveRootDirectory() {
    return this.path.resolve(this.cwd, this.rootDirectory);
  }

  resolveSessionFilePath(sessionId) {
    if (!isSafeId(sessionId)) {
      return null;
    }

    return this.path.join(
      this.resolveRootDirectory(),
      `${sessionId}.json`
    );
  }

  createSession(input = {}) {
    if (!isPlainObject(input)) {
      return createStoreResult(
        false,
        { session: null },
        ["input must be a plain object."]
      );
    }

    const sessionId = input.session_id || this.idGenerator("session");
    const createdAt = input.created_at || this.now();
    const status = input.status || "open";
    const issues = [];

    if (!isSafeId(sessionId)) {
      issues.push("session_id must be a safe non-empty id.");
    }

    issues.push(...validateLiveSessionStatus(status).issues);

    if (status === "closed") {
      issues.push("new live sessions must not start closed.");
    }

    if (issues.length > 0) {
      return createStoreResult(false, { session: null }, issues);
    }

    const sessionFilePath = this.resolveSessionFilePath(sessionId);
    if (this.fs.existsSync(sessionFilePath)) {
      return createStoreResult(
        false,
        { session: null },
        [`session already exists: ${sessionId}`]
      );
    }

    const session = {
      version: LIVE_SESSION_CONTRACT_VERSION,
      session_id: sessionId,
      status,
      created_at: createdAt,
      updated_at: createdAt,
      closed_at: null,
      records: [],
    };

    const validation = validateLiveSessionV1(session);
    if (!validation.valid) {
      return createStoreResult(false, { session: null }, validation.issues);
    }

    const writeResult = this.writeSession(session);
    if (!writeResult.ok) {
      return createStoreResult(false, { session: null }, writeResult.issues);
    }

    return createStoreResult(true, { session: cloneJsonValue(session) });
  }

  loadSession(sessionId) {
    const sessionFilePath = this.resolveSessionFilePath(sessionId);
    if (sessionFilePath === null) {
      return createStoreResult(
        false,
        { session: null },
        ["session_id must be a safe non-empty id."]
      );
    }

    if (!this.fs.existsSync(sessionFilePath)) {
      return createStoreResult(
        false,
        { session: null },
        [`session not found: ${sessionId}`]
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(this.fs.readFileSync(sessionFilePath, "utf8"));
    } catch (error) {
      return createStoreResult(
        false,
        { session: null },
        [`session read failed closed: ${error.message}`]
      );
    }

    const validation = this.validateSessionSnapshot(parsed);
    if (!validation.valid) {
      return createStoreResult(false, { session: null }, validation.issues);
    }

    return createStoreResult(true, { session: cloneJsonValue(parsed) });
  }

  listRecords(sessionId) {
    const loaded = this.loadSession(sessionId);
    if (!loaded.ok) {
      return createStoreResult(
        false,
        { records: [] },
        loaded.issues
      );
    }

    return createStoreResult(true, {
      records: loaded.session.records.map(cloneJsonValue),
    });
  }

  appendRecord(sessionId, input = {}) {
    if (!isPlainObject(input)) {
      return createStoreResult(
        false,
        { record: null, session: null },
        ["record input must be a plain object."]
      );
    }

    const loaded = this.loadSession(sessionId);
    if (!loaded.ok) {
      return createStoreResult(
        false,
        { record: null, session: null },
        loaded.issues
      );
    }

    const session = loaded.session;
    if (session.status === "closed") {
      return createStoreResult(
        false,
        { record: null, session },
        ["closed live sessions cannot accept new records."]
      );
    }

    const previousRecord = session.records[session.records.length - 1] || null;
    const previousHash = previousRecord
      ? previousRecord.hash
      : LIVE_HASH_CHAIN_GENESIS;
    const timestamp = input.timestamp || this.now();
    const record = {
      version: LIVE_SESSION_RECORD_CONTRACT_VERSION,
      record_id: input.record_id || this.idGenerator("record"),
      session_id: session.session_id,
      sequence: session.records.length + 1,
      timestamp,
      type: input.type,
      source: cloneJsonValue(input.source),
      payload: cloneJsonValue(input.payload || {}),
      previous_hash: previousHash,
    };

    const validation = validateLiveSessionRecordV1(record);
    if (!validation.valid) {
      return createStoreResult(
        false,
        { record: null, session },
        validation.issues
      );
    }

    const hashResult = hashRecord(record);
    if (!hashResult.valid) {
      return createStoreResult(
        false,
        { record: null, session },
        hashResult.issues
      );
    }

    record.hash = hashResult.hash;

    const finalValidation = this.validateRecordInSequence(
      record,
      session.records.length,
      previousHash
    );
    if (!finalValidation.valid) {
      return createStoreResult(
        false,
        { record: null, session },
        finalValidation.issues
      );
    }

    if (input.dashboard_visible === true || input.dashboardVisible === true) {
      const eventResult = createLiveFeedEventFromRecordV1(
        record,
        input.live_feed_event || input.liveFeedEvent || {}
      );

      if (!eventResult.valid) {
        return createStoreResult(
          false,
          { record: null, session },
          eventResult.issues
        );
      }
    }

    const updatedSession = {
      ...session,
      updated_at: timestamp,
      records: [...session.records, record],
    };

    const writeResult = this.writeSession(updatedSession);
    if (!writeResult.ok) {
      return createStoreResult(
        false,
        { record: null, session },
        writeResult.issues
      );
    }

    return createStoreResult(true, {
      record: cloneJsonValue(record),
      session: cloneJsonValue(updatedSession),
    });
  }

  closeSession(sessionId, input = {}) {
    const loaded = this.loadSession(sessionId);
    if (!loaded.ok) {
      return createStoreResult(false, { session: null }, loaded.issues);
    }

    const session = loaded.session;
    const closedAt = input.closed_at || this.now();
    const updatedSession = {
      ...session,
      status: "closed",
      updated_at: closedAt,
      closed_at: closedAt,
    };

    const validation = validateLiveSessionV1(updatedSession);
    if (!validation.valid) {
      return createStoreResult(false, { session: null }, validation.issues);
    }

    const writeResult = this.writeSession(updatedSession);
    if (!writeResult.ok) {
      return createStoreResult(false, { session: null }, writeResult.issues);
    }

    return createStoreResult(true, {
      session: cloneJsonValue(updatedSession),
    });
  }

  validateSessionSnapshot(session) {
    const issues = [];
    const sessionValidation = validateLiveSessionV1(session);
    issues.push(...sessionValidation.issues);

    if (!isPlainObject(session) || !Array.isArray(session.records)) {
      return createValidationResult(issues);
    }

    let previousHash = LIVE_HASH_CHAIN_GENESIS;
    session.records.forEach((record, index) => {
      const recordValidation = this.validateRecordInSequence(
        record,
        index,
        previousHash
      );
      issues.push(...recordValidation.issues);

      if (isPlainObject(record) && isNonEmptyString(record.hash)) {
        previousHash = record.hash;
      }
    });

    return createValidationResult(issues);
  }

  validateRecordInSequence(record, index, previousHash) {
    const issues = [];
    const validation = validateLiveSessionRecordV1(record);
    issues.push(...validation.issues);

    if (!isPlainObject(record)) {
      return createValidationResult(issues);
    }

    if (record.sequence !== index + 1) {
      issues.push(`record sequence must equal ${index + 1}.`);
    }

    if (record.previous_hash !== previousHash) {
      issues.push("record.previous_hash does not match previous record hash.");
    }

    if (!isNonEmptyString(record.hash)) {
      issues.push("hash must be a non-empty string.");
    } else {
      issues.push(...verifyRecordHash(record).issues);
    }

    return createValidationResult(issues);
  }

  writeSession(session) {
    const sessionFilePath = this.resolveSessionFilePath(session.session_id);
    if (sessionFilePath === null) {
      return createStoreResult(
        false,
        {},
        ["session_id must be a safe non-empty id."]
      );
    }

    const validation = this.validateSessionSnapshot(session);
    if (!validation.valid) {
      return createStoreResult(false, {}, validation.issues);
    }

    const serialized = canonicalJson(session);
    if (!serialized.valid) {
      return createStoreResult(false, {}, serialized.issues);
    }

    try {
      this.fs.mkdirSync(this.path.dirname(sessionFilePath), {
        recursive: true,
      });
      this.fs.writeFileSync(sessionFilePath, `${serialized.json}\n`, "utf8");
    } catch (error) {
      return createStoreResult(
        false,
        {},
        [`session write failed closed: ${error.message}`]
      );
    }

    return createStoreResult(true, { path: sessionFilePath });
  }
}

module.exports = {
  DEFAULT_LIVE_SESSION_ROOT,
  LIVE_HASH_CHAIN_GENESIS,
  LIVE_SESSION_STATUSES,
  LiveSessionStore,
  isSafeId,
};
