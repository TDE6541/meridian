const {
  createGovernanceShadows,
  createTypedSignalTree,
  validateGovernanceShadows,
  validateTypedSignalTree,
} = require("../governance/shadows");

const ENTITY_TYPE = "organization";

function createOrganization(overrides = {}) {
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

function validateOrganization(entity) {
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

  if (entity.status !== null) {
    errors.push("entity.status must be null for stateless entities");
  }

  if (!validateGovernanceShadows(entity.governance)) {
    errors.push("entity.governance must contain authority, evidence, obligation, and absence plain objects");
  }

  if (!validateTypedSignalTree(entity.signal_tree)) {
    errors.push("entity.signal_tree must match the typed Meridian signal_tree subset");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  ENTITY_TYPE,
  createOrganization,
  validateOrganization,
};
