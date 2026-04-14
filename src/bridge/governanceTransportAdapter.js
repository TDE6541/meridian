const { createGovernancePublisher } = require("./governancePublisher");

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
  if (value === null) {
    return null;
  }

  return requirePlainObject(value, fieldName);
}

function optionalEntityType(value) {
  if (value === null) {
    return null;
  }

  return requireNonEmptyString(value, "request.entity_ref.entity_type");
}

function validateGovernanceEvaluationRequest(request) {
  requirePlainObject(request, "request");

  if (
    request.kind !== "event_observation" &&
    request.kind !== "command_request"
  ) {
    throw new TypeError(
      "request.kind must be event_observation or command_request"
    );
  }

  requireNonEmptyString(request.org_id, "request.org_id");
  requirePlainObject(request.entity_ref, "request.entity_ref");
  requireNonEmptyString(
    request.entity_ref.entity_id,
    "request.entity_ref.entity_id"
  );
  optionalEntityType(request.entity_ref.entity_type);
  optionalObjectOrNull(request.authority_context, "request.authority_context");
  optionalObjectOrNull(request.evidence_context, "request.evidence_context");
  optionalObjectOrNull(request.confidence_context, "request.confidence_context");
  optionalObjectOrNull(
    request.candidate_signal_patch,
    "request.candidate_signal_patch"
  );
  requireNonEmptyString(request.raw_subject, "request.raw_subject");

  return request;
}

function createGovernanceTransportAdapter(options = {}) {
  const publisher = options.publisher || createGovernancePublisher();
  const now = options.now || (() => new Date().toISOString());

  if (typeof publisher.publishOutcome !== "function") {
    throw new TypeError("publisher.publishOutcome must be a function");
  }

  async function evaluate(request) {
    validateGovernanceEvaluationRequest(request);

    const evaluated_at = requireNonEmptyString(now(), "evaluated_at");
    let decision = "BLOCK";
    let reason = "wave3_stub_never_allows";

    if (request.authority_context === null) {
      decision = "HOLD";
      reason = "authority_context_absent";
    } else if (request.authority_context.resolved !== true) {
      reason = "authority_context_unresolved";
    }

    const publications = await publisher.publishOutcome(request, {
      decision,
      reason,
      evaluated_at,
    });

    return {
      decision,
      reason,
      evaluated_at,
      publications,
    };
  }

  return {
    evaluate,
  };
}

module.exports = {
  createGovernanceTransportAdapter,
};
