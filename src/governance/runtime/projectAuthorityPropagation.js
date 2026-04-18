const { GOVERNANCE_DECISIONS } = require("./decisionVocabulary");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeProjectionEntry(entry, index, fieldName) {
  if (!isPlainObject(entry)) {
    throw new TypeError(`${fieldName}[${index}] must be a plain object`);
  }

  if (!isNonEmptyString(entry.projection_id)) {
    throw new TypeError(`${fieldName}[${index}].projection_id must be a non-empty string`);
  }

  if (!isPlainObject(entry.request)) {
    throw new TypeError(`${fieldName}[${index}].request must be a plain object`);
  }

  return {
    projectionId: entry.projection_id,
    request: entry.request,
  };
}

function summarizeProjectionEntry(inputKind, entry, evaluation) {
  const authorityResolution = evaluation?.runtimeSubset?.civic?.authority_resolution;
  const revocation = evaluation?.runtimeSubset?.civic?.revocation;

  return {
    projection_id: entry.projectionId,
    input_kind: inputKind,
    decision: evaluation.decision,
    reason: evaluation.reason,
    domain_id:
      authorityResolution?.domain?.domain_id ||
      authorityResolution?.domain_id ||
      entry.request?.authority_context?.domain_context?.domain_id ||
      null,
    read_only: true,
    revocation_active: revocation?.active === true,
    revocation_reason: revocation?.reason || null,
  };
}

function projectAuthorityPropagation(propagationContext = {}, evaluateRequest) {
  if (!isPlainObject(propagationContext)) {
    throw new TypeError("propagationContext must be a plain object");
  }

  if (typeof evaluateRequest !== "function") {
    throw new TypeError("projectAuthorityPropagation requires an evaluateRequest function");
  }

  if (
    propagationContext.action_requests !== undefined &&
    !Array.isArray(propagationContext.action_requests)
  ) {
    throw new TypeError("propagationContext.action_requests must be an array");
  }

  if (
    propagationContext.decision_inputs !== undefined &&
    !Array.isArray(propagationContext.decision_inputs)
  ) {
    throw new TypeError("propagationContext.decision_inputs must be an array");
  }

  const actionRequests = (propagationContext.action_requests || [])
    .map((entry, index) =>
      normalizeProjectionEntry(entry, index, "propagationContext.action_requests")
    )
    .map((entry) =>
      summarizeProjectionEntry(
        "action_request",
        entry,
        evaluateRequest(entry.request)
      )
    );
  const decisionInputs = (propagationContext.decision_inputs || [])
    .map((entry, index) =>
      normalizeProjectionEntry(entry, index, "propagationContext.decision_inputs")
    )
    .map((entry) =>
      summarizeProjectionEntry(
        "decision_input",
        entry,
        evaluateRequest(entry.request)
      )
    );
  const projectedEntries = [...actionRequests, ...decisionInputs];

  return {
    mode: "projection_only_read_only",
    inputMode: "explicit_runtime_inputs",
    totalInputs: projectedEntries.length,
    affectedCount: projectedEntries.filter(
      (entry) => entry.decision !== GOVERNANCE_DECISIONS.ALLOW
    ).length,
    actionRequests,
    decisionInputs,
  };
}

module.exports = {
  projectAuthorityPropagation,
};
