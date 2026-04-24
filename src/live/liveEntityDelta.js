const path = require("node:path");

const {
  RESERVED_CONTRACT_VERSIONS,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  validateLiveFeedSource,
} = require("./contracts");

const ENTITY_DELTA_CONTRACT_VERSION = RESERVED_CONTRACT_VERSIONS.ENTITY_DELTA;

const ENTITY_DELTA_OPERATIONS = Object.freeze([
  "proposed_creation",
  "state_transition",
  "metadata_update",
  "evidence_link",
]);

const ENTITY_VALIDATOR_MODULES = Object.freeze({
  action_request: {
    file: "../entities/action_request",
    validator: "validateActionRequest",
  },
  authority_grant: {
    file: "../entities/authority_grant",
    validator: "validateAuthorityGrant",
  },
  corridor_zone: {
    file: "../entities/corridor_zone",
    validator: "validateCorridorZone",
  },
  critical_site: {
    file: "../entities/critical_site",
    validator: "validateCriticalSite",
  },
  decision_record: {
    file: "../entities/decision_record",
    validator: "validateDecisionRecord",
  },
  device: {
    file: "../entities/device",
    validator: "validateDevice",
  },
  evidence_artifact: {
    file: "../entities/evidence_artifact",
    validator: "validateEvidenceArtifact",
  },
  incident_observation: {
    file: "../entities/incident_observation",
    validator: "validateIncidentObservation",
  },
  inspection: {
    file: "../entities/inspection",
    validator: "validateInspection",
  },
  obligation: {
    file: "../entities/obligation",
    validator: "validateObligation",
  },
  organization: {
    file: "../entities/organization",
    validator: "validateOrganization",
  },
  permit_application: {
    file: "../entities/permit_application",
    validator: "validatePermitApplication",
  },
  utility_asset: {
    file: "../entities/utility_asset",
    validator: "validateUtilityAsset",
  },
});

const ENTITY_TYPE_VALUES = Object.freeze(Object.keys(ENTITY_VALIDATOR_MODULES));

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

function getEntityValidator(entityType) {
  const entry = ENTITY_VALIDATOR_MODULES[entityType];
  if (!entry) {
    return null;
  }

  const entityModule = require(path.join(__dirname, entry.file));
  const validator = entityModule[entry.validator];

  return typeof validator === "function" ? validator : null;
}

function normalizeValidatorIssues(result) {
  if (!isPlainObject(result)) {
    return ["entity validator returned a malformed result."];
  }

  if (Array.isArray(result.errors)) {
    return result.errors.map((issue) => `entity: ${issue}`);
  }

  if (Array.isArray(result.issues)) {
    return result.issues.map((issue) => `entity: ${issue}`);
  }

  return result.valid === true
    ? []
    : ["entity validator returned invalid without issues."];
}

function validateEntityPayload(entityType, entity) {
  const validator = getEntityValidator(entityType);
  if (!validator) {
    return createValidationResult([
      `entity_type is not supported: ${String(entityType)}`,
    ]);
  }

  let validation;
  try {
    validation = validator(entity);
  } catch (error) {
    return createValidationResult([
      `entity validator failed closed: ${error.message}`,
    ]);
  }

  return createValidationResult(normalizeValidatorIssues(validation));
}

function validateRequiredObjectField(delta, fieldName, issues) {
  if (!Object.prototype.hasOwnProperty.call(delta, fieldName)) {
    issues.push(`${fieldName} is required.`);
    return;
  }

  if (!isPlainObject(delta[fieldName])) {
    issues.push(`${fieldName} must be a plain object.`);
  }
}

function validateEntityDeltaV1(delta) {
  const issues = [];

  if (!isPlainObject(delta)) {
    return createValidationResult([
      "EntityDeltaV1 must be a plain object.",
    ]);
  }

  if (delta.version !== ENTITY_DELTA_CONTRACT_VERSION) {
    issues.push(`version must equal ${ENTITY_DELTA_CONTRACT_VERSION}.`);
  }

  for (const fieldName of [
    "delta_id",
    "session_id",
    "timestamp",
    "entity_type",
    "entity_id",
  ]) {
    if (!isNonEmptyString(delta[fieldName])) {
      issues.push(`${fieldName} must be a non-empty string.`);
    }
  }

  if (!ENTITY_DELTA_OPERATIONS.includes(delta.operation)) {
    issues.push(`operation is not allowed: ${String(delta.operation)}`);
  }

  if (!ENTITY_TYPE_VALUES.includes(delta.entity_type)) {
    issues.push(`entity_type is not supported: ${String(delta.entity_type)}`);
  }

  if (!isPlainObject(delta.entity)) {
    issues.push("entity must be a plain object.");
  } else if (ENTITY_TYPE_VALUES.includes(delta.entity_type)) {
    if (delta.entity.entity_type !== delta.entity_type) {
      issues.push("entity.entity_type must match entity_type.");
    }

    if (delta.entity.entity_id !== delta.entity_id) {
      issues.push("entity.entity_id must match entity_id.");
    }

    issues.push(...validateEntityPayload(delta.entity_type, delta.entity).issues);
  }

  if (!Object.prototype.hasOwnProperty.call(delta, "source")) {
    issues.push("source is required.");
  } else {
    issues.push(...validateLiveFeedSource(delta.source).issues);
  }

  validateRequiredObjectField(delta, "governance_context", issues);
  validateRequiredObjectField(delta, "authority_context", issues);

  return createValidationResult(issues);
}

function createEntityDeltaV1(input = {}) {
  const delta = {
    version: ENTITY_DELTA_CONTRACT_VERSION,
    delta_id: input.delta_id,
    session_id: input.session_id,
    timestamp: input.timestamp,
    operation: input.operation,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    entity: cloneJsonValue(input.entity),
    source: cloneJsonValue(input.source),
    governance_context: cloneJsonValue(input.governance_context),
    authority_context: cloneJsonValue(input.authority_context),
  };
  const validation = validateEntityDeltaV1(delta);

  return {
    ok: validation.valid,
    valid: validation.valid,
    delta: validation.valid ? delta : null,
    issues: validation.issues,
  };
}

module.exports = {
  ENTITY_DELTA_CONTRACT_VERSION,
  ENTITY_DELTA_OPERATIONS,
  ENTITY_TYPE_VALUES,
  createEntityDeltaV1,
  getEntityValidator,
  validateEntityDeltaV1,
  validateEntityPayload,
};
