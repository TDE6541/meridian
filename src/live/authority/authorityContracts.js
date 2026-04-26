const {
  LIVE_FEED_SEVERITIES,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");

const AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION =
  "meridian.v2.authorityResolutionRequest.v1";
const AUTHORITY_RESOLUTION_EVALUATION_CONTRACT_VERSION =
  "meridian.v2.authorityResolutionEvaluation.v1";
const AUTHORITY_REQUEST_STORE_CONTRACT_VERSION =
  "meridian.v2.authorityRequestStore.v1";

const AUTHORITY_RESOLVABLE_ABSENCE_TYPES = Object.freeze([
  "authority_evidence_missing",
  "jurisdiction_unresolved",
  "public_notice_missing",
  "inspection_signoff_absent",
  "delegation_unverified",
  "interagency_concurrence_missing",
]);

const NON_AUTHORITY_RESOLVABLE_ABSENCE_TYPES = Object.freeze([
  "utility_conflict_assessment_missing",
  "data_gap",
  "temporal_coverage_gap",
]);

const AUTHORITY_REQUEST_STATUSES = Object.freeze([
  "pending",
  "approved",
  "denied",
  "expired",
  "error",
]);

const G2_GENERATED_AUTHORITY_REQUEST_STATUS = "pending";

const AUTHORITY_RESOLUTION_TYPES = Object.freeze([
  "approval",
  "jurisdiction_clarification",
  "public_notice_approval",
  "signoff",
  "delegation_verification",
  "concurrence",
]);

const AUTHORITY_SEVERITY_ORDER = Object.freeze([...LIVE_FEED_SEVERITIES]);
const DEFAULT_AUTHORITY_RESOLUTION_THRESHOLD = "HOLD";

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

function validateEnumValue(value, allowedValues, fieldName) {
  return createValidationResult(
    allowedValues.includes(value)
      ? []
      : [`${fieldName} is not allowed: ${String(value)}`]
  );
}

function validateAuthorityRequestStatus(status) {
  return validateEnumValue(status, AUTHORITY_REQUEST_STATUSES, "status");
}

function validateAuthorityResolutionType(resolutionType) {
  return validateEnumValue(
    resolutionType,
    AUTHORITY_RESOLUTION_TYPES,
    "resolution_type"
  );
}

function validateAuthoritySeverity(severity, fieldName = "severity") {
  return validateEnumValue(severity, AUTHORITY_SEVERITY_ORDER, fieldName);
}

function getSeverityRank(severity) {
  return AUTHORITY_SEVERITY_ORDER.indexOf(severity);
}

function isSeverityAtLeast(severity, threshold) {
  const severityRank = getSeverityRank(severity);
  const thresholdRank = getSeverityRank(threshold);

  return severityRank >= 0 && thresholdRank >= 0 && severityRank >= thresholdRank;
}

function isValidDateTimeString(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function validateNullableStringField(value, fieldName, issues) {
  if (value !== null && !isNonEmptyString(value)) {
    issues.push(`${fieldName} must be null or a non-empty string.`);
  }
}

function validateRequiredNullableStringField(object, fieldName, issues) {
  if (!Object.prototype.hasOwnProperty.call(object, fieldName)) {
    issues.push(`${fieldName} is required.`);
    return;
  }

  validateNullableStringField(object[fieldName], fieldName, issues);
}

function createAuthorityHold({
  code,
  reason,
  source_absence_id = null,
  field = null,
  resolution_path,
}) {
  return Object.freeze({
    code,
    reason,
    source_absence_id,
    field,
    resolution_path:
      resolution_path ||
      "Supply explicit authority-resolution evidence or reduce scope.",
  });
}

function validateAuthorityResolutionRequestV1(request) {
  const issues = [];

  if (!isPlainObject(request)) {
    return createValidationResult([
      "AuthorityResolutionRequestV1 must be a plain object.",
    ]);
  }

  if (request.contract !== AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION) {
    issues.push(
      `contract must equal ${AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION}.`
    );
  }

  if (!isNonEmptyString(request.request_id)) {
    issues.push("request_id must be a non-empty string.");
  }

  if (!isNonEmptyString(request.source_absence_id)) {
    issues.push("source_absence_id must be a non-empty string.");
  }

  validateRequiredNullableStringField(
    request,
    "source_governance_evaluation",
    issues
  );

  if (!isNonEmptyString(request.required_authority_role)) {
    issues.push("required_authority_role must be a non-empty string.");
  }

  if (!isNonEmptyString(request.required_authority_department)) {
    issues.push("required_authority_department must be a non-empty string.");
  }

  issues.push(
    ...validateAuthorityResolutionType(request.resolution_type).issues
  );
  issues.push(...validateAuthorityRequestStatus(request.status).issues);

  if (!isPlainObject(request.binding_context)) {
    issues.push("binding_context must be a plain object.");
  }

  if (!Object.prototype.hasOwnProperty.call(request, "expiry")) {
    issues.push("expiry is required.");
  } else if (request.expiry !== null && !isValidDateTimeString(request.expiry)) {
    issues.push("expiry must be null or a valid date-time string.");
  }

  if (!Object.prototype.hasOwnProperty.call(request, "forensic_receipt_id")) {
    issues.push("forensic_receipt_id is required.");
  } else {
    validateNullableStringField(
      request.forensic_receipt_id,
      "forensic_receipt_id",
      issues
    );
  }

  return createValidationResult(issues);
}

function validateAuthorityResolutionEvaluationV1(evaluation) {
  const issues = [];

  if (!isPlainObject(evaluation)) {
    return createValidationResult([
      "AuthorityResolutionEvaluationV1 must be a plain object.",
    ]);
  }

  if (evaluation.contract !== AUTHORITY_RESOLUTION_EVALUATION_CONTRACT_VERSION) {
    issues.push(
      `contract must equal ${AUTHORITY_RESOLUTION_EVALUATION_CONTRACT_VERSION}.`
    );
  }

  if (!Array.isArray(evaluation.generated_requests)) {
    issues.push("generated_requests must be an array.");
  }

  if (!Array.isArray(evaluation.skipped_findings)) {
    issues.push("skipped_findings must be an array.");
  }

  if (!Array.isArray(evaluation.holds)) {
    issues.push("holds must be an array.");
  }

  if (!isPlainObject(evaluation.counts)) {
    issues.push("counts must be a plain object.");
  }

  return createValidationResult(issues);
}

module.exports = {
  AUTHORITY_REQUEST_STATUSES,
  AUTHORITY_REQUEST_STORE_CONTRACT_VERSION,
  AUTHORITY_RESOLVABLE_ABSENCE_TYPES,
  AUTHORITY_RESOLUTION_EVALUATION_CONTRACT_VERSION,
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
  AUTHORITY_RESOLUTION_TYPES,
  AUTHORITY_SEVERITY_ORDER,
  DEFAULT_AUTHORITY_RESOLUTION_THRESHOLD,
  G2_GENERATED_AUTHORITY_REQUEST_STATUS,
  NON_AUTHORITY_RESOLVABLE_ABSENCE_TYPES,
  cloneJsonValue,
  createAuthorityHold,
  isSeverityAtLeast,
  isValidDateTimeString,
  validateAuthorityRequestStatus,
  validateAuthorityResolutionEvaluationV1,
  validateAuthorityResolutionRequestV1,
  validateAuthorityResolutionType,
  validateAuthoritySeverity,
};
