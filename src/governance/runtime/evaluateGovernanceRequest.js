const { GOVERNANCE_DECISIONS } = require("./decisionVocabulary");
const { deriveCivicConfidence, deriveDecisionRationale } = require("./deriveCivicConfidence");
const { createEmptyPromiseStatus } = require("./derivePromiseStatus");
const MERIDIAN_GOVERNANCE_CONFIG = require("./meridian-governance-config");
const { evaluateRuntimeSubset } = require("./runtimeSubset");

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
  const decision = GOVERNANCE_DECISIONS.BLOCK;
  const confidence = deriveCivicConfidence(
    {
      decision,
      reason,
      hold: null,
      standingRisk: null,
    },
    MERIDIAN_GOVERNANCE_CONFIG
  );

  return {
    decision,
    reason,
    runtimeSubset: {
      civic: {
        promise_status: createEmptyPromiseStatus(),
        confidence,
        rationale: {
          decision: deriveDecisionRationale({
            decision,
            reason,
          }),
        },
      },
    },
  };
}

function sortUniqueStrings(values) {
  return [...new Set(values)].sort();
}

function domainMatchesRequest(domain, request) {
  if (!isPlainObject(domain) || !isPlainObject(domain.appliesTo)) {
    return false;
  }

  const entityType = request.entity_ref?.entity_type;
  const subjectText = [
    request.raw_subject,
    request.entity_ref?.entity_id,
    entityType,
  ]
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .join(" ")
    .toLowerCase();

  const entityTypeMatch =
    Array.isArray(domain.appliesTo.entityTypes) &&
    domain.appliesTo.entityTypes.includes(entityType);
  const subjectMatch =
    Array.isArray(domain.appliesTo.subjectIncludes) &&
    domain.appliesTo.subjectIncludes.some((token) =>
      subjectText.includes(String(token).toLowerCase())
    );

  return entityTypeMatch || subjectMatch;
}

function hasOverlap(left, right) {
  return left.some((value) => right.includes(value));
}

function getGovernanceAbsenceFlag(request, key) {
  const absence = request?.candidate_signal_patch?.governance?.absence;
  return isPlainObject(absence) && absence[key] === true;
}

function resolveGovernancePolicyContext(
  request,
  config = MERIDIAN_GOVERNANCE_CONFIG
) {
  if (!isPlainObject(request)) {
    return {
      domainIds: [],
      constraintIds: ["malformed_or_unsupported_input"],
      omissionPackIds: [],
    };
  }

  const domainIds = sortUniqueStrings(
    Object.entries(config.domains)
      .filter(([, domain]) => domainMatchesRequest(domain, request))
      .map(([domainId]) => domainId)
  );

  const missingApprovals = isStringArray(request.authority_context?.missing_approvals)
    ? request.authority_context.missing_approvals
    : [];
  const missingTypes = isStringArray(request.evidence_context?.missing_types)
    ? request.evidence_context.missing_types
    : [];
  const evidenceGap =
    (isNonNegativeInteger(request.evidence_context?.required_count)
      ? request.evidence_context.required_count
      : 0) -
    (isNonNegativeInteger(request.evidence_context?.present_count)
      ? request.evidence_context.present_count
      : 0);
  const authorityResolved =
    request.authority_context?.resolved === true && missingApprovals.length === 0;
  const evidenceResolved = evidenceGap <= 0 && missingTypes.length === 0;
  const missingInspectionLikeEvidence =
    getGovernanceAbsenceFlag(request, "inspection_missing") ||
    missingTypes.some((type) => String(type).toLowerCase().includes("inspection"));

  const constraintIds = [];

  if (request.kind !== "command_request") {
    constraintIds.push("malformed_or_unsupported_input");
  }

  if (!authorityResolved) {
    constraintIds.push("unresolved_required_approvals");
  }

  if (!evidenceResolved) {
    constraintIds.push("incomplete_required_evidence");
  }

  if (
    domainIds.includes("utility_corridor_action") &&
    missingTypes.includes("utility_conflict_assessment")
  ) {
    constraintIds.push("utility_conflict_evidence_present");
  }

  if (domainIds.includes("decision_closure") && !evidenceResolved) {
    constraintIds.push("closure_evidence_present");
  }

  const omissionPackIds = [];

  if (
    hasOverlap(
      domainIds,
      config.omissionPacks.action_without_authority.relevantDomains
    ) &&
    !authorityResolved
  ) {
    omissionPackIds.push("action_without_authority");
  }

  if (domainIds.includes("permit_authorization") && missingInspectionLikeEvidence) {
    omissionPackIds.push("permit_without_inspection");
  }

  if (domainIds.includes("decision_closure") && !evidenceResolved) {
    omissionPackIds.push("closure_without_evidence");
  }

  return {
    domainIds,
    constraintIds: sortUniqueStrings(constraintIds),
    omissionPackIds: sortUniqueStrings(omissionPackIds),
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

  const policyContext = resolveGovernancePolicyContext(request);

  return evaluateRuntimeSubset(request, policyContext, MERIDIAN_GOVERNANCE_CONFIG);
}

module.exports = {
  evaluateGovernanceRequest,
  resolveGovernancePolicyContext,
};
