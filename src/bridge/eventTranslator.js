function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requirePlainObject(value, fieldName) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${fieldName} must be a plain object`);
  }

  return value;
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }

  return value;
}

function optionalString(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  return requireNonEmptyString(value, fieldName);
}

function parseEntityScopedSubject(subject, channel) {
  const tokens = subject.split(".");

  if (
    tokens.length !== 4 ||
    tokens[0] !== "constellation" ||
    tokens[1] !== channel
  ) {
    throw new TypeError(
      `${channel} subject must match constellation.${channel}.{org_id}.{entity_id}`
    );
  }

  return {
    org_id: requireNonEmptyString(tokens[2], `${channel}.subject.org_id`),
    entity_id: requireNonEmptyString(tokens[3], `${channel}.subject.entity_id`),
  };
}

function translateEventMessage(payload) {
  const event = requirePlainObject(payload, "event");
  const subject = requireNonEmptyString(event.subject, "event.subject");

  if (!/^constellation\.events\..+/.test(subject)) {
    throw new TypeError(
      "event.subject must stay within the constellation.events.> family"
    );
  }

  requireNonEmptyString(event.id, "event.id");
  requireNonEmptyString(event.type, "event.type");
  requirePlainObject(event.data, "event.data");
  requirePlainObject(event.metadata, "event.metadata");
  requireNonEmptyString(event.source, "event.source");

  return {
    channel: "events",
    subject,
    org_id: requireNonEmptyString(event.data.org_id, "event.data.org_id"),
    entity_id: requireNonEmptyString(
      event.data.entity_id,
      "event.data.entity_id"
    ),
    entity_type: optionalString(event.data.entity_type, "event.data.entity_type"),
    observed_at: optionalString(event.timestamp, "event.timestamp"),
    raw_payload: event,
  };
}

function translateTelemetryMessage(input) {
  const message = requirePlainObject(input, "telemetry");
  const subject = requireNonEmptyString(message.subject, "telemetry.subject");
  const payload = requirePlainObject(message.payload, "telemetry.payload");
  const scope = parseEntityScopedSubject(subject, "telemetry");

  return {
    channel: "telemetry",
    subject,
    org_id: scope.org_id,
    entity_id: scope.entity_id,
    entity_type: optionalString(
      payload.entity_type,
      "telemetry.payload.entity_type"
    ),
    observed_at: optionalString(
      payload.timestamp,
      "telemetry.payload.timestamp"
    ),
    raw_payload: payload,
  };
}

module.exports = {
  translateEventMessage,
  translateTelemetryMessage,
};
