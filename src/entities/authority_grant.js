const {
  createGovernanceShadows,
  createTypedSignalTree,
  validateGovernanceShadows,
  validateTypedSignalTree,
} = require("../governance/shadows");

const ENTITY_TYPE = "authority_grant";
const AUTHORITY_GRANT_STATUSES = [
  "active",
  "expired",
  "revoked",
  "superseded",
  "pending",
];

function hasOwnProperty(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isNullableNonEmptyString(value) {
  return value === null || isNonEmptyString(value);
}

function isStringArray(value) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  );
}

function createAuthorityGrant(overrides = {}) {
  const entity = {
    entity_id: overrides.entity_id ?? "",
    org_id: overrides.org_id ?? "",
    name: overrides.name ?? "",
    entity_type: ENTITY_TYPE,
    status: overrides.status ?? null,
    priority: overrides.priority ?? null,
    is_live: overrides.is_live ?? false,
    governance: createGovernanceShadows(),
    signal_tree: createTypedSignalTree(),
    ...overrides,
  };

  entity.entity_type = ENTITY_TYPE;

  return entity;
}

function validateAuthorityGrant(entity) {
  const errors = [];

  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) {
    return {
      valid: false,
      errors: ["entity must be an object"],
    };
  }

  if (entity.entity_type !== ENTITY_TYPE) {
    errors.push("entity.entity_type must match ENTITY_TYPE");
  }

  if (typeof entity.entity_id !== "string" || entity.entity_id.trim() === "") {
    errors.push("entity.entity_id must be a non-empty string");
  }

  const requiredKeys = [
    "entity_id",
    "org_id",
    "name",
    "entity_type",
    "status",
    "priority",
    "is_live",
    "governance",
    "signal_tree",
  ];

  requiredKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(entity, key)) {
      errors.push(`entity.${key} is required`);
    }
  });

  if (typeof entity.is_live !== "boolean") {
    errors.push("entity.is_live must be a boolean");
  }

  if (
    entity.status !== null &&
    !AUTHORITY_GRANT_STATUSES.includes(entity.status)
  ) {
    errors.push("entity.status must be null for stateless entities");
  }

  if (!validateGovernanceShadows(entity.governance)) {
    errors.push("entity.governance must contain authority, evidence, obligation, and absence plain objects");
  }

  if (!validateTypedSignalTree(entity.signal_tree)) {
    errors.push("entity.signal_tree must match the typed Meridian signal_tree subset");
  }

  if (hasOwnProperty(entity, "granted_role") && !isNonEmptyString(entity.granted_role)) {
    errors.push("entity.granted_role must be a non-empty string");
  }

  if (hasOwnProperty(entity, "jurisdiction") && !isNonEmptyString(entity.jurisdiction)) {
    errors.push("entity.jurisdiction must be a non-empty string");
  }

  if (
    hasOwnProperty(entity, "scope_of_authority") &&
    !isStringArray(entity.scope_of_authority)
  ) {
    errors.push("entity.scope_of_authority must be an array of non-empty strings");
  }

  if (
    hasOwnProperty(entity, "granted_at") &&
    !isNullableNonEmptyString(entity.granted_at)
  ) {
    errors.push("entity.granted_at must be null or a non-empty string");
  }

  if (
    hasOwnProperty(entity, "expires_at") &&
    !isNullableNonEmptyString(entity.expires_at)
  ) {
    errors.push("entity.expires_at must be null or a non-empty string");
  }

  if (
    hasOwnProperty(entity, "revoked_at") &&
    !isNullableNonEmptyString(entity.revoked_at)
  ) {
    errors.push("entity.revoked_at must be null or a non-empty string");
  }

  if (
    hasOwnProperty(entity, "superseded_at") &&
    !isNullableNonEmptyString(entity.superseded_at)
  ) {
    errors.push("entity.superseded_at must be null or a non-empty string");
  }

  if (
    hasOwnProperty(entity, "granted_by_entity_id") &&
    !isNullableNonEmptyString(entity.granted_by_entity_id)
  ) {
    errors.push("entity.granted_by_entity_id must be null or a non-empty string");
  }

  if (
    hasOwnProperty(entity, "supersedes_grant_ids") &&
    !isStringArray(entity.supersedes_grant_ids)
  ) {
    errors.push("entity.supersedes_grant_ids must be an array of non-empty strings");
  }

  if (
    hasOwnProperty(entity, "delegation_chain_ids") &&
    !isStringArray(entity.delegation_chain_ids)
  ) {
    errors.push("entity.delegation_chain_ids must be an array of non-empty strings");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  ENTITY_TYPE,
  AUTHORITY_GRANT_STATUSES,
  createAuthorityGrant,
  validateAuthorityGrant,
};
