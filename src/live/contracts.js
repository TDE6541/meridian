const LIVE_SESSION_CONTRACT_VERSION = "meridian.v2.liveSession.v1";
const LIVE_SESSION_RECORD_CONTRACT_VERSION =
  "meridian.v2.liveSessionRecord.v1";
const LIVE_FEED_EVENT_CONTRACT_VERSION = "meridian.v2.liveFeedEvent.v1";

const RESERVED_CONTRACT_VERSIONS = Object.freeze({
  ENTITY_DELTA: "meridian.v2.entityDelta.v1",
  LIVE_GOVERNANCE_EVALUATION:
    "meridian.v2.liveGovernanceEvaluation.v1",
  LIVE_ABSENCE_FINDING: "meridian.v2.liveAbsenceFinding.v1",
  DASHBOARD_LIVE_PROJECTION: "meridian.v2.dashboardLiveProjection.v1",
  CITY_SEED_MANIFEST: "meridian.v2.citySeedManifest.v1",
  CONSTELLATION_REPLAY: "meridian.v2.constellationReplay.v1",
});

const CONTRACT_VERSIONS = Object.freeze({
  LIVE_SESSION: LIVE_SESSION_CONTRACT_VERSION,
  LIVE_SESSION_RECORD: LIVE_SESSION_RECORD_CONTRACT_VERSION,
  LIVE_FEED_EVENT: LIVE_FEED_EVENT_CONTRACT_VERSION,
  ...RESERVED_CONTRACT_VERSIONS,
});

const IMPLEMENTED_CONTRACT_VERSIONS = Object.freeze([
  LIVE_SESSION_CONTRACT_VERSION,
  LIVE_SESSION_RECORD_CONTRACT_VERSION,
  LIVE_FEED_EVENT_CONTRACT_VERSION,
]);

const LIVE_SESSION_STATUSES = Object.freeze(["open", "holding", "closed"]);

const LIVE_FEED_SEVERITIES = Object.freeze([
  "INFO",
  "WATCH",
  "GAP",
  "HOLD",
  "BLOCK",
  "REVOKE",
]);

const LIVE_FEED_VISIBILITIES = Object.freeze([
  "internal",
  "public_safe",
  "restricted",
]);

const LIVE_FEED_SOURCE_TYPES = Object.freeze([
  "holdpoint_artifact",
  "live_gateway",
  "absence_rule",
  "city_seed",
  "constellation_replay",
  "dashboard",
  "system",
]);

const LIVE_FEED_EVENT_KINDS = Object.freeze([
  "session.created",
  "capture.artifact_ingested",
  "entity.delta.accepted",
  "governance.evaluated",
  "authority.evaluated",
  "forensic.receipt",
  "absence.finding.created",
  "skins.outputs.projected",
  "cityData.seed.loaded",
  "corridor.generated",
  "constellation.replay.received",
  "hold.raised",
  "error.hold",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isNullableNonEmptyString(value) {
  return value === null || isNonEmptyString(value);
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function createValidationResult(issues) {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...issues]),
  });
}

function validateEnumValue(value, allowedValues, fieldName) {
  const issues = [];

  if (!allowedValues.includes(value)) {
    issues.push(`${fieldName} is not allowed: ${String(value)}`);
  }

  return createValidationResult(issues);
}

function validateImplementedContractVersion(version) {
  return validateEnumValue(
    version,
    IMPLEMENTED_CONTRACT_VERSIONS,
    "version"
  );
}

function validateLiveSessionStatus(status) {
  return validateEnumValue(status, LIVE_SESSION_STATUSES, "status");
}

function validateLiveFeedSeverity(severity) {
  return validateEnumValue(severity, LIVE_FEED_SEVERITIES, "severity");
}

function validateLiveFeedVisibility(visibility) {
  return validateEnumValue(
    visibility,
    LIVE_FEED_VISIBILITIES,
    "visibility"
  );
}

function validateLiveFeedSourceType(sourceType) {
  return validateEnumValue(
    sourceType,
    LIVE_FEED_SOURCE_TYPES,
    "source.type"
  );
}

function validateLiveFeedEventKind(kind) {
  return validateEnumValue(kind, LIVE_FEED_EVENT_KINDS, "kind");
}

function validateStringArray(value, fieldName) {
  const issues = [];

  if (!Array.isArray(value)) {
    issues.push(`${fieldName} must be an array.`);
  } else if (!value.every(isNonEmptyString)) {
    issues.push(`${fieldName} must contain only non-empty strings.`);
  }

  return issues;
}

function validateLiveFeedSource(source) {
  const issues = [];

  if (!isPlainObject(source)) {
    return createValidationResult(["source must be a plain object."]);
  }

  issues.push(...validateLiveFeedSourceType(source.type).issues);

  if (!isNonEmptyString(source.ref)) {
    issues.push("source.ref must be a non-empty string.");
  }

  return createValidationResult(issues);
}

function createEmptyLiveFeedRefs() {
  return {
    entity_ids: [],
    evidence_ids: [],
    governance_ref: null,
    authority_ref: null,
    forensic_refs: [],
    absence_refs: [],
    skin_ref: null,
  };
}

function validateLiveFeedRefs(refs) {
  const issues = [];

  if (!isPlainObject(refs)) {
    return createValidationResult(["refs must be a plain object."]);
  }

  for (const fieldName of [
    "entity_ids",
    "evidence_ids",
    "forensic_refs",
    "absence_refs",
  ]) {
    if (!Object.prototype.hasOwnProperty.call(refs, fieldName)) {
      issues.push(`refs.${fieldName} is required.`);
    } else {
      issues.push(...validateStringArray(refs[fieldName], `refs.${fieldName}`));
    }
  }

  for (const fieldName of [
    "governance_ref",
    "authority_ref",
    "skin_ref",
  ]) {
    if (!Object.prototype.hasOwnProperty.call(refs, fieldName)) {
      issues.push(`refs.${fieldName} is required.`);
    } else if (!isNullableNonEmptyString(refs[fieldName])) {
      issues.push(`refs.${fieldName} must be null or a non-empty string.`);
    }
  }

  return createValidationResult(issues);
}

function validateForemanHints(foremanHints) {
  const issues = [];

  if (!isPlainObject(foremanHints)) {
    return createValidationResult([
      "foreman_hints must be a plain object.",
    ]);
  }

  if (typeof foremanHints.narration_eligible !== "boolean") {
    issues.push("foreman_hints.narration_eligible must be boolean.");
  }

  if (!Number.isInteger(foremanHints.priority) || foremanHints.priority < 0) {
    issues.push("foreman_hints.priority must be a non-negative integer.");
  }

  if (!isNonEmptyString(foremanHints.reason)) {
    issues.push("foreman_hints.reason must be a non-empty string.");
  }

  return createValidationResult(issues);
}

function validateLiveSessionV1(session) {
  const issues = [];

  if (!isPlainObject(session)) {
    return createValidationResult([
      "LiveSessionV1 must be a plain object.",
    ]);
  }

  if (session.version !== LIVE_SESSION_CONTRACT_VERSION) {
    issues.push(
      `version must equal ${LIVE_SESSION_CONTRACT_VERSION}.`
    );
  }

  if (!isNonEmptyString(session.session_id)) {
    issues.push("session_id must be a non-empty string.");
  }

  issues.push(...validateLiveSessionStatus(session.status).issues);

  if (!isNonEmptyString(session.created_at)) {
    issues.push("created_at must be a non-empty string.");
  }

  if (!isNonEmptyString(session.updated_at)) {
    issues.push("updated_at must be a non-empty string.");
  }

  if (!isNullableNonEmptyString(session.closed_at)) {
    issues.push("closed_at must be null or a non-empty string.");
  }

  if (!Array.isArray(session.records)) {
    issues.push("records must be an array.");
  } else if (!session.records.every(isPlainObject)) {
    issues.push("records must contain only plain objects.");
  }

  return createValidationResult(issues);
}

function validateLiveSessionRecordV1(record) {
  const issues = [];

  if (!isPlainObject(record)) {
    return createValidationResult([
      "LiveSessionRecordV1 must be a plain object.",
    ]);
  }

  if (record.version !== LIVE_SESSION_RECORD_CONTRACT_VERSION) {
    issues.push(
      `version must equal ${LIVE_SESSION_RECORD_CONTRACT_VERSION}.`
    );
  }

  if (!isNonEmptyString(record.record_id)) {
    issues.push("record_id must be a non-empty string.");
  }

  if (!isNonEmptyString(record.session_id)) {
    issues.push("session_id must be a non-empty string.");
  }

  if (!isPositiveInteger(record.sequence)) {
    issues.push("sequence must be a positive integer.");
  }

  if (!isNonEmptyString(record.timestamp)) {
    issues.push("timestamp must be a non-empty string.");
  }

  if (!isNonEmptyString(record.type)) {
    issues.push("type must be a non-empty string.");
  }

  issues.push(...validateLiveFeedSource(record.source).issues);

  if (!isPlainObject(record.payload)) {
    issues.push("payload must be a plain object.");
  }

  if (!isNonEmptyString(record.previous_hash)) {
    issues.push("previous_hash must be a non-empty string.");
  }

  if (
    record.hash !== undefined &&
    record.hash !== null &&
    !isNonEmptyString(record.hash)
  ) {
    issues.push("hash must be a non-empty string when set.");
  }

  return createValidationResult(issues);
}

module.exports = {
  CONTRACT_VERSIONS,
  IMPLEMENTED_CONTRACT_VERSIONS,
  LIVE_FEED_EVENT_CONTRACT_VERSION,
  LIVE_FEED_EVENT_KINDS,
  LIVE_FEED_SEVERITIES,
  LIVE_FEED_SOURCE_TYPES,
  LIVE_FEED_VISIBILITIES,
  LIVE_SESSION_CONTRACT_VERSION,
  LIVE_SESSION_RECORD_CONTRACT_VERSION,
  LIVE_SESSION_STATUSES,
  RESERVED_CONTRACT_VERSIONS,
  createEmptyLiveFeedRefs,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  isPositiveInteger,
  validateForemanHints,
  validateImplementedContractVersion,
  validateLiveFeedEventKind,
  validateLiveFeedRefs,
  validateLiveFeedSeverity,
  validateLiveFeedSource,
  validateLiveFeedSourceType,
  validateLiveFeedVisibility,
  validateLiveSessionRecordV1,
  validateLiveSessionStatus,
  validateLiveSessionV1,
};
