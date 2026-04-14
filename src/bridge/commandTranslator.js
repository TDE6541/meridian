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

function optionalObjectOrNull(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }

  return requirePlainObject(value, fieldName);
}

function optionalEntityType(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  return value;
}

function parseCommandSubject(subject) {
  const tokens = subject.split(".");

  if (
    tokens.length !== 4 ||
    tokens[0] !== "constellation" ||
    tokens[1] !== "commands"
  ) {
    throw new TypeError(
      "command.subject must match constellation.commands.{org_id}.{entity_id}"
    );
  }

  const entity_id = requireNonEmptyString(tokens[3], "command.subject.entity_id");

  return {
    org_id: requireNonEmptyString(tokens[2], "command.subject.org_id"),
    entity_id,
    route: entity_id === "broadcast" ? "broadcast" : "entity",
  };
}

function translateCommandMessage(input) {
  const message = requirePlainObject(input, "command");
  const subject = requireNonEmptyString(message.subject, "command.subject");
  const raw_payload = requirePlainObject(message.payload, "command.payload");
  const scope = parseCommandSubject(subject);

  return {
    request: {
      kind: "command_request",
      org_id: scope.org_id,
      entity_ref: {
        entity_id: scope.entity_id,
        entity_type: optionalEntityType(raw_payload.entity_type),
      },
      authority_context: optionalObjectOrNull(
        message.authority_context,
        "command.authority_context"
      ),
      evidence_context: optionalObjectOrNull(
        message.evidence_context,
        "command.evidence_context"
      ),
      confidence_context: optionalObjectOrNull(
        message.confidence_context,
        "command.confidence_context"
      ),
      candidate_signal_patch: optionalObjectOrNull(
        message.candidate_signal_patch,
        "command.candidate_signal_patch"
      ),
      raw_subject: subject,
    },
    raw_payload,
    route: scope.route,
  };
}

module.exports = {
  parseCommandSubject,
  translateCommandMessage,
};
