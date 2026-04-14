const {
  createGovernanceShadows,
  createEmptySignalTree,
  validateGovernanceShadows,
  validateMinimalSignalTree,
} = require("../governance/shadows");

const ENTITY_TYPE = "authority_grant";

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
    signal_tree: createEmptySignalTree(),
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

  if (!validateGovernanceShadows(entity.governance)) {
    errors.push("entity.governance must contain authority, evidence, obligation, and absence plain objects");
  }

  if (!validateMinimalSignalTree(entity.signal_tree)) {
    errors.push("entity.signal_tree must contain governance, civic, and lineage plain objects");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  ENTITY_TYPE,
  createAuthorityGrant,
  validateAuthorityGrant,
};
