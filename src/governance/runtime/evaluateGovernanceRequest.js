const { GOVERNANCE_DECISIONS } = require("./decisionVocabulary");

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isStringArray(value) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  );
}

function block(reason) {
  return {
    decision: GOVERNANCE_DECISIONS.BLOCK,
    reason,
  };
}

function evaluateGovernanceRequest(request) {
  if (!isPlainObject(request)) {
    return block("request_must_be_plain_object");
  }

  if (!Object.prototype.hasOwnProperty.call(request, "kind")) {
    return block("request_kind_required");
  }

  if (request.kind === "event_observation") {
    return block("event_observation_deferred_block_a_command_request_only");
  }

  if (request.kind !== "command_request") {
    return block("unsupported_request_kind");
  }

  if (!isNonEmptyString(request.org_id)) {
    return block("request_org_id_required");
  }

  if (!isPlainObject(request.entity_ref)) {
    return block("request_entity_ref_required");
  }

  if (!isNonEmptyString(request.entity_ref.entity_id)) {
    return block("request_entity_ref_entity_id_required");
  }

  if (
    request.entity_ref.entity_type !== null &&
    request.entity_ref.entity_type !== undefined &&
    !isNonEmptyString(request.entity_ref.entity_type)
  ) {
    return block("request_entity_ref_entity_type_must_be_string_or_null");
  }

  if (!isNonEmptyString(request.raw_subject)) {
    return block("request_raw_subject_required");
  }

  if (!isPlainObject(request.authority_context)) {
    return block("authority_context_must_be_plain_object");
  }

  if (typeof request.authority_context.resolved !== "boolean") {
    return block("authority_context_resolved_must_be_boolean");
  }

  if (!isNonEmptyString(request.authority_context.requested_by_role)) {
    return block("authority_context_requested_by_role_required");
  }

  if (!isStringArray(request.authority_context.required_approvals)) {
    return block("authority_context_required_approvals_must_be_string_array");
  }

  if (!isStringArray(request.authority_context.resolved_approvals)) {
    return block("authority_context_resolved_approvals_must_be_string_array");
  }

  if (!isStringArray(request.authority_context.missing_approvals)) {
    return block("authority_context_missing_approvals_must_be_string_array");
  }

  if (!isPlainObject(request.evidence_context)) {
    return block("evidence_context_must_be_plain_object");
  }

  if (!isNonNegativeInteger(request.evidence_context.required_count)) {
    return block("evidence_context_required_count_must_be_non_negative_integer");
  }

  if (!isNonNegativeInteger(request.evidence_context.present_count)) {
    return block("evidence_context_present_count_must_be_non_negative_integer");
  }

  if (!isStringArray(request.evidence_context.missing_types)) {
    return block("evidence_context_missing_types_must_be_string_array");
  }

  if (
    request.confidence_context !== null &&
    request.confidence_context !== undefined &&
    !isPlainObject(request.confidence_context)
  ) {
    return block("confidence_context_must_be_plain_object_or_null");
  }

  if (
    request.candidate_signal_patch !== null &&
    request.candidate_signal_patch !== undefined &&
    !isPlainObject(request.candidate_signal_patch)
  ) {
    return block("candidate_signal_patch_must_be_plain_object_or_null");
  }

  const missingApprovals = request.authority_context.missing_approvals;
  const evidenceGap =
    request.evidence_context.required_count - request.evidence_context.present_count;
  const missingTypes = request.evidence_context.missing_types;
  const authorityResolved =
    request.authority_context.resolved === true && missingApprovals.length === 0;
  const evidenceResolved = evidenceGap <= 0 && missingTypes.length === 0;

  if (authorityResolved && evidenceResolved) {
    return {
      decision: GOVERNANCE_DECISIONS.ALLOW,
      reason: "authority_and_evidence_resolved",
    };
  }

  const reasonParts = [];

  if (request.authority_context.resolved !== true) {
    reasonParts.push("authority_unresolved");
  }

  if (missingApprovals.length > 0) {
    reasonParts.push(`missing_approvals=${missingApprovals.join(",")}`);
  }

  if (evidenceGap > 0) {
    reasonParts.push(
      `evidence_gap=${request.evidence_context.present_count}/${request.evidence_context.required_count}`
    );
  }

  if (missingTypes.length > 0) {
    reasonParts.push(`missing_evidence_types=${missingTypes.join(",")}`);
  }

  return {
    decision: GOVERNANCE_DECISIONS.HOLD,
    reason: reasonParts.join(";"),
  };
}

module.exports = {
  evaluateGovernanceRequest,
};
