const {
  createValidationResult,
  isPlainObject,
  isPositiveInteger,
  validateLiveSessionRecordV1,
} = require("./contracts");
const {
  createLiveFeedEventFromRecordV1,
} = require("./liveFeedEvent");

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

function normalizeRecords(input) {
  if (Array.isArray(input.records)) {
    return {
      ok: true,
      records: input.records,
      issues: [],
    };
  }

  if (
    input.store &&
    typeof input.store.listRecords === "function" &&
    typeof input.session_id === "string" &&
    input.session_id.trim() !== ""
  ) {
    const listed = input.store.listRecords(input.session_id);
    return {
      ok: listed.ok === true,
      records: listed.ok === true ? listed.records : [],
      issues: Array.isArray(listed.issues) ? [...listed.issues] : [],
    };
  }

  return {
    ok: false,
    records: [],
    issues: ["records or store/session_id are required."],
  };
}

function getLiveFeedEvents(input = {}) {
  const normalizedRecords = normalizeRecords(input);
  const issues = [...normalizedRecords.issues];
  const since = input.since ?? input.since_sequence ?? null;
  const events = [];

  if (since !== null && (!Number.isInteger(since) || since < 0)) {
    issues.push("since must be a non-negative integer when provided.");
  }

  if (!normalizedRecords.ok) {
    return {
      ok: false,
      valid: false,
      events,
      issues: Object.freeze(issues),
    };
  }

  normalizedRecords.records
    .slice()
    .sort((left, right) => (left?.sequence || 0) - (right?.sequence || 0))
    .forEach((record, index) => {
      const recordValidation = validateLiveSessionRecordV1(record);
      if (!recordValidation.valid) {
        issues.push(
          `records[${index}] invalid: ${recordValidation.issues.join(" | ")}`
        );
        return;
      }

      if (since !== null && record.sequence <= since) {
        return;
      }

      if (!isPlainObject(record.payload?.live_feed_event)) {
        return;
      }

      const eventResult = createLiveFeedEventFromRecordV1(record);
      if (!eventResult.valid) {
        issues.push(
          `records[${index}].payload.live_feed_event invalid: ` +
            eventResult.issues.join(" | ")
        );
        return;
      }

      events.push(cloneJsonValue(eventResult.event));
    });

  return {
    ok: issues.length === 0,
    valid: issues.length === 0,
    events,
    issues: Object.freeze(issues),
  };
}

function validateEventBusCursor(input = {}) {
  const issues = [];

  if (
    input.since !== undefined &&
    input.since !== null &&
    !isPositiveInteger(input.since) &&
    input.since !== 0
  ) {
    issues.push("since must be a non-negative integer when provided.");
  }

  return createValidationResult(issues);
}

module.exports = {
  getLiveFeedEvents,
  validateEventBusCursor,
};
