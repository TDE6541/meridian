const {
  LIVE_FEED_EVENT_CONTRACT_VERSION,
  createEmptyLiveFeedRefs,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  isPositiveInteger,
  validateForemanHints,
  validateLiveFeedEventKind,
  validateLiveFeedRefs,
  validateLiveFeedSeverity,
  validateLiveFeedSource,
  validateLiveFeedVisibility,
} = require("./contracts");

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

function mergeRefs(refs) {
  if (refs === undefined) {
    return createEmptyLiveFeedRefs();
  }

  return isPlainObject(refs) ? cloneJsonValue(refs) : refs;
}

function mergeForemanHints(foremanHints = {}) {
  return {
    narration_eligible: false,
    priority: 0,
    reason: "not_requested",
    ...(isPlainObject(foremanHints) ? cloneJsonValue(foremanHints) : foremanHints),
  };
}

function validateLiveFeedEventV1(event) {
  const issues = [];

  if (!isPlainObject(event)) {
    return createValidationResult([
      "LiveFeedEventV1 must be a plain object.",
    ]);
  }

  if (event.version !== LIVE_FEED_EVENT_CONTRACT_VERSION) {
    issues.push(
      `version must equal ${LIVE_FEED_EVENT_CONTRACT_VERSION}.`
    );
  }

  if (!isNonEmptyString(event.event_id)) {
    issues.push("event_id must be a non-empty string.");
  }

  if (!isNonEmptyString(event.session_id)) {
    issues.push("session_id must be a non-empty string.");
  }

  if (!isPositiveInteger(event.sequence)) {
    issues.push("sequence must be a positive integer.");
  }

  if (!isNonEmptyString(event.timestamp)) {
    issues.push("timestamp must be a non-empty string.");
  }

  issues.push(...validateLiveFeedEventKind(event.kind).issues);
  issues.push(...validateLiveFeedSeverity(event.severity).issues);

  if (!isNonEmptyString(event.title)) {
    issues.push("title must be a non-empty string.");
  }

  if (!isNonEmptyString(event.summary)) {
    issues.push("summary must be a non-empty string.");
  }

  issues.push(...validateLiveFeedSource(event.source).issues);
  issues.push(...validateLiveFeedRefs(event.refs).issues);
  issues.push(...validateLiveFeedVisibility(event.visibility).issues);
  issues.push(...validateForemanHints(event.foreman_hints).issues);

  return createValidationResult(issues);
}

function createLiveFeedEventV1(input = {}, options = {}) {
  const now =
    typeof options.now === "function"
      ? options.now
      : () => new Date().toISOString();

  const event = {
    version: LIVE_FEED_EVENT_CONTRACT_VERSION,
    event_id: input.event_id,
    session_id: input.session_id,
    sequence: input.sequence,
    timestamp: input.timestamp || now(),
    kind: input.kind,
    severity: input.severity,
    title: input.title,
    summary: input.summary,
    source: cloneJsonValue(input.source),
    refs: mergeRefs(input.refs),
    visibility: input.visibility,
    foreman_hints: mergeForemanHints(input.foreman_hints),
  };

  const validation = validateLiveFeedEventV1(event);
  return {
    ok: validation.valid,
    valid: validation.valid,
    event: validation.valid ? event : null,
    issues: validation.issues,
  };
}

function createLiveFeedEventFromRecordV1(record, overrides = {}) {
  if (!isPlainObject(record)) {
    return {
      ok: false,
      valid: false,
      event: null,
      issues: Object.freeze(["record must be a plain object."]),
    };
  }

  const payloadEvent = isPlainObject(record.payload?.live_feed_event)
    ? record.payload.live_feed_event
    : {};

  return createLiveFeedEventV1({
    ...payloadEvent,
    ...overrides,
    event_id:
      overrides.event_id ||
      payloadEvent.event_id ||
      `live-event-${record.record_id}`,
    session_id: record.session_id,
    sequence: record.sequence,
    timestamp: record.timestamp,
    source: record.source,
  });
}

module.exports = {
  LIVE_FEED_EVENT_CONTRACT_VERSION,
  createLiveFeedEventFromRecordV1,
  createLiveFeedEventV1,
  validateLiveFeedEventV1,
};
