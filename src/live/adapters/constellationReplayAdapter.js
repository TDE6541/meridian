const {
  RESERVED_CONTRACT_VERSIONS,
  createEmptyLiveFeedRefs,
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");
const {
  createLiveFeedEventFromRecordV1,
} = require("../liveFeedEvent");
const {
  translateEventMessage,
  translateTelemetryMessage,
} = require("../../bridge/eventTranslator");
const {
  translateCommandMessage,
} = require("../../bridge/commandTranslator");

const CONSTELLATION_REPLAY_CONTRACT_VERSION =
  RESERVED_CONTRACT_VERSIONS.CONSTELLATION_REPLAY;
const CONSTELLATION_REPLAY_RECORD_TYPE = "constellation.replay.received";
const CONSTELLATION_REPLAY_SOURCE_TYPE = "constellation_replay";
const LIVE_BROKER_REQUIRED_ENV = Object.freeze([
  "NATS_URL",
  "MERIDIAN_CONSTELLATION_LIVE_BROKER_PROOF_REF",
]);
const REPLAY_LIMITATIONS = Object.freeze([
  "Replay/local-demo proof only; no live Constellation broker integration is claimed.",
  "No NATS connection, subscription, publication, or request path is used by Packet A7 replay.",
  "Original subject, payload ref, message id, and replay source ref are preserved as replay evidence.",
]);

function cloneJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  if (isPlainObject(value)) {
    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        clone[key] = cloneJsonValue(entry);
      }
    }
    return clone;
  }

  return value;
}

function createReplayResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function validateOptionalPlainObject(value, fieldName, issues) {
  if (value !== undefined && value !== null && !isPlainObject(value)) {
    issues.push(`${fieldName} must be a plain object when provided.`);
  }
}

function parseReplayJsonl(jsonlText) {
  if (typeof jsonlText !== "string") {
    return createReplayResult(
      false,
      {
        reason: "constellation_replay_input_invalid",
        messages: [],
      },
      ["JSONL input must be a string."]
    );
  }

  const messages = [];
  const issues = [];
  const lines = jsonlText.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (line.trim() === "") {
      return;
    }

    try {
      const parsed = JSON.parse(line);
      messages.push(parsed);
    } catch (error) {
      issues.push(`line ${index + 1} malformed JSON: ${error.message}`);
    }
  });

  if (messages.length === 0) {
    issues.push("JSONL input must contain at least one replay message.");
  }

  return createReplayResult(
    issues.length === 0,
    {
      reason: issues.length === 0 ? "constellation_replay_parsed" : "constellation_replay_invalid",
      messages: issues.length === 0 ? messages.map(cloneJsonValue) : [],
    },
    issues
  );
}

function parseReplayInput(input) {
  if (Array.isArray(input)) {
    if (input.length === 0) {
      return createReplayResult(
        false,
        {
          reason: "constellation_replay_input_invalid",
          messages: [],
        },
        ["replay message array must not be empty."]
      );
    }

    return createReplayResult(true, {
      reason: "constellation_replay_parsed",
      messages: input.map(cloneJsonValue),
    });
  }

  return parseReplayJsonl(input);
}

function validateConstellationReplayWrapperV1(message) {
  const issues = [];

  if (!isPlainObject(message)) {
    return createReplayResult(
      false,
      { reason: "constellation_replay_wrapper_invalid" },
      ["replay message must be a plain object."]
    );
  }

  if (message.version !== CONSTELLATION_REPLAY_CONTRACT_VERSION) {
    issues.push(
      `version must equal ${CONSTELLATION_REPLAY_CONTRACT_VERSION}.`
    );
  }

  for (const fieldName of [
    "replay_id",
    "message_id",
    "recorded_at",
    "type",
    "ref",
    "subject",
  ]) {
    if (!isNonEmptyString(message[fieldName])) {
      issues.push(`${fieldName} must be a non-empty string.`);
    }
  }

  if (message.mode !== "replay") {
    issues.push('mode must equal "replay".');
  }

  if (message.type !== "constellation_replay") {
    issues.push('type must equal "constellation_replay".');
  }

  if (!isPlainObject(message.source)) {
    issues.push("source must be a plain object.");
  } else if (!isNonEmptyString(message.source.ref)) {
    issues.push("source.ref must be a non-empty string.");
  }

  if (!isPlainObject(message.original)) {
    issues.push("original must be a plain object.");
  } else {
    if (!isNonEmptyString(message.original.subject)) {
      issues.push("original.subject must be a non-empty string.");
    } else if (
      isNonEmptyString(message.subject) &&
      message.original.subject !== message.subject
    ) {
      issues.push("original.subject must match subject.");
    }

    if (!isNonEmptyString(message.original.payload_ref)) {
      issues.push("original.payload_ref must be a non-empty string.");
    }
  }

  if (!isPlainObject(message.payload)) {
    issues.push("payload must be a plain object.");
  }

  validateOptionalPlainObject(message.headers, "headers", issues);
  validateOptionalPlainObject(
    message.bridge_envelope,
    "bridge_envelope",
    issues
  );

  if (
    isPlainObject(message.bridge_envelope) &&
    Object.prototype.hasOwnProperty.call(message.bridge_envelope, "ref") &&
    !isNonEmptyString(message.bridge_envelope.ref)
  ) {
    issues.push("bridge_envelope.ref must be a non-empty string when provided.");
  }

  return createReplayResult(issues.length === 0, {
    reason:
      issues.length === 0
        ? "constellation_replay_wrapper_valid"
        : "constellation_replay_wrapper_invalid",
  }, issues);
}

function inferReplayChannel(subject) {
  if (/^constellation\.events\./.test(subject)) {
    return "events";
  }

  if (/^constellation\.telemetry\./.test(subject)) {
    return "telemetry";
  }

  if (/^constellation\.commands\./.test(subject)) {
    return "commands";
  }

  return null;
}

function getBridgeRef(message) {
  if (isPlainObject(message.bridge_envelope) && isNonEmptyString(message.bridge_envelope.ref)) {
    return message.bridge_envelope.ref;
  }

  return `bridge-compatible:${message.message_id}`;
}

function normalizeBridgeCompatibleMessage(message) {
  const wrapperValidation = validateConstellationReplayWrapperV1(message);
  if (!wrapperValidation.valid) {
    return createReplayResult(
      false,
      {
        reason: "constellation_replay_wrapper_invalid",
        replay_record: null,
      },
      wrapperValidation.issues
    );
  }

  const channel = inferReplayChannel(message.subject);
  if (channel === null) {
    return createReplayResult(
      false,
      {
        reason: "constellation_replay_subject_unsupported",
        replay_record: null,
      },
      [`subject is not an approved Constellation replay family: ${message.subject}`]
    );
  }

  const issues = [];
  let bridge;

  try {
    if (channel === "events") {
      if (message.payload.subject !== message.subject) {
        issues.push("event payload.subject must match replay subject.");
      } else {
        bridge = {
          kind: "BridgeEnvelope",
          ref: getBridgeRef(message),
          envelope: translateEventMessage(message.payload),
        };
      }
    }

    if (channel === "telemetry") {
      bridge = {
        kind: "BridgeEnvelope",
        ref: getBridgeRef(message),
        envelope: translateTelemetryMessage({
          subject: message.subject,
          payload: message.payload,
        }),
      };
    }

    if (channel === "commands") {
      const translated = translateCommandMessage({
        subject: message.subject,
        payload: message.payload,
        authority_context: message.authority_context,
        evidence_context: message.evidence_context,
        confidence_context: message.confidence_context,
        candidate_signal_patch: message.candidate_signal_patch,
      });
      bridge = {
        kind: "GovernanceEvaluationRequest",
        ref: getBridgeRef(message),
        request: translated.request,
        raw_payload: translated.raw_payload,
        route: translated.route,
      };
    }
  } catch (error) {
    issues.push(`bridge-compatible translation failed closed: ${error.message}`);
  }

  if (issues.length > 0) {
    return createReplayResult(
      false,
      {
        reason: "constellation_replay_bridge_shape_invalid",
        replay_record: null,
      },
      issues
    );
  }

  const replayRecord = {
    version: CONSTELLATION_REPLAY_CONTRACT_VERSION,
    replay_id: message.replay_id,
    message_id: message.message_id,
    mode: "replay",
    recorded_at: message.recorded_at,
    source: cloneJsonValue(message.source),
    type: "constellation_replay",
    ref: message.ref,
    original: cloneJsonValue(message.original),
    subject: message.subject,
    payload: cloneJsonValue(message.payload),
    headers: cloneJsonValue(message.headers || {}),
    bridge,
    limitations: cloneJsonValue(message.limitations || REPLAY_LIMITATIONS),
  };

  return createReplayResult(true, {
    reason: "constellation_replay_normalized",
    replay_record: replayRecord,
  });
}

function buildReplayRefs(replayRecord) {
  return {
    ...createEmptyLiveFeedRefs(),
    entity_ids: [
      replayRecord.bridge?.envelope?.entity_id ||
        replayRecord.bridge?.request?.entity_ref?.entity_id ||
        null,
    ].filter((value) => isNonEmptyString(value) && value !== "broadcast"),
    evidence_ids: [
      `replay:${replayRecord.replay_id}`,
      `message:${replayRecord.message_id}`,
      `subject:${replayRecord.subject}`,
      `payload:${replayRecord.original.payload_ref}`,
      replayRecord.bridge?.ref || null,
    ].filter(isNonEmptyString),
  };
}

function buildReplayRecordInput(replayRecord) {
  return {
    type: CONSTELLATION_REPLAY_RECORD_TYPE,
    source: {
      type: CONSTELLATION_REPLAY_SOURCE_TYPE,
      ref: replayRecord.source.ref,
    },
    dashboard_visible: true,
    payload: {
      constellation_replay: replayRecord,
      live_feed_event: {
        kind: CONSTELLATION_REPLAY_RECORD_TYPE,
        severity: "INFO",
        title: "Constellation replay received",
        summary:
          `${replayRecord.bridge.kind} replay message ${replayRecord.message_id} ` +
          "entered the live session store from recorded local traffic.",
        refs: buildReplayRefs(replayRecord),
        visibility: "internal",
        foreman_hints: {
          narration_eligible: false,
          priority: 0,
          reason: "not_requested",
        },
      },
    },
  };
}

function replayConstellationMessages(input, options = {}) {
  const replayInput = isPlainObject(input)
    ? input.messages || input.jsonl || input.text || input.replay
    : input;
  const store = isPlainObject(input) ? input.store || options.store : options.store;
  const sessionId =
    (isPlainObject(input) &&
      (input.session_id || input.sessionId)) ||
    options.session_id ||
    options.sessionId;
  const issues = [];

  if (!store || typeof store.appendRecord !== "function") {
    issues.push("live session store with appendRecord is required.");
  }

  if (!isNonEmptyString(sessionId)) {
    issues.push("session_id is required.");
  }

  if (issues.length > 0) {
    return createReplayResult(
      false,
      {
        reason: "constellation_replay_unavailable",
        appended_count: 0,
        records: [],
        events: [],
      },
      issues
    );
  }

  if (typeof store.loadSession === "function") {
    const loaded = store.loadSession(sessionId);
    if (!loaded.ok) {
      return createReplayResult(
        false,
        {
          reason: "constellation_replay_session_unavailable",
          appended_count: 0,
          records: [],
          events: [],
        },
        loaded.issues
      );
    }
  }

  const parsed = parseReplayInput(replayInput);
  if (!parsed.ok) {
    return createReplayResult(
      false,
      {
        reason: parsed.reason,
        appended_count: 0,
        records: [],
        events: [],
      },
      parsed.issues
    );
  }

  const normalized = [];
  for (const message of parsed.messages) {
    const normalizedMessage = normalizeBridgeCompatibleMessage(message);
    if (!normalizedMessage.ok) {
      issues.push(...normalizedMessage.issues);
    } else {
      normalized.push(normalizedMessage.replay_record);
    }
  }

  if (issues.length > 0) {
    return createReplayResult(
      false,
      {
        reason: "constellation_replay_invalid",
        appended_count: 0,
        records: [],
        events: [],
      },
      issues
    );
  }

  const records = [];
  const events = [];
  let latestSession = null;
  for (const replayRecord of normalized) {
    const appended = store.appendRecord(
      sessionId,
      buildReplayRecordInput(replayRecord)
    );

    if (!appended.ok) {
      return createReplayResult(
        false,
        {
          reason: "constellation_replay_append_failed",
          appended_count: records.length,
          records,
          events,
        },
        appended.issues
      );
    }

    const eventResult = createLiveFeedEventFromRecordV1(appended.record);
    if (!eventResult.valid) {
      return createReplayResult(
        false,
        {
          reason: "constellation_replay_event_invalid",
          appended_count: records.length,
          records,
          events,
        },
        eventResult.issues
      );
    }

    records.push(appended.record);
    events.push(eventResult.event);
    latestSession = appended.session;
  }

  return createReplayResult(true, {
    reason: "constellation_replay_appended",
    appended_count: records.length,
    records: records.map(cloneJsonValue),
    events: events.map(cloneJsonValue),
    session: latestSession,
    limitations: cloneJsonValue(REPLAY_LIMITATIONS),
  });
}

function buildLiveBrokerHold(env = process.env) {
  const missingEnv = LIVE_BROKER_REQUIRED_ENV.filter(
    (name) => !isNonEmptyString(env[name])
  );
  const missingProof = missingEnv.includes(
    "MERIDIAN_CONSTELLATION_LIVE_BROKER_PROOF_REF"
  )
    ? ["MERIDIAN_CONSTELLATION_LIVE_BROKER_PROOF_REF"]
    : ["approved_a7_live_broker_proof"];

  return {
    ok: false,
    valid: false,
    status: "HOLD",
    reason:
      missingEnv.length > 0
        ? "live_constellation_env_missing"
        : "live_constellation_proof_not_approved_in_a7",
    missing_env: missingEnv,
    missing_proof: missingProof,
    statement:
      "Packet A7 replay proof is recorded/local only and does not claim live Constellation broker integration.",
    limitations: cloneJsonValue(REPLAY_LIMITATIONS),
  };
}

module.exports = {
  CONSTELLATION_REPLAY_CONTRACT_VERSION,
  CONSTELLATION_REPLAY_RECORD_TYPE,
  CONSTELLATION_REPLAY_SOURCE_TYPE,
  LIVE_BROKER_REQUIRED_ENV,
  REPLAY_LIMITATIONS,
  buildLiveBrokerHold,
  buildReplayRecordInput,
  cloneJsonValue,
  inferReplayChannel,
  normalizeBridgeCompatibleMessage,
  parseReplayInput,
  parseReplayJsonl,
  replayConstellationMessages,
  validateConstellationReplayWrapperV1,
};
