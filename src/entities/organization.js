const {
  createGovernanceShadows,
  createTypedSignalTree,
  validateGovernanceShadows,
  validateTypedSignalTree,
} = require("../governance/shadows");

const ENTITY_TYPE = "organization";

function hasOwnProperty(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function validateOfficeHolderSnapshot(value) {
  if (value === null) {
    return true;
  }

  if (!isPlainObject(value)) {
    return false;
  }

  const allowedKeys = ["name", "title"];

  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    return false;
  }

  if (hasOwnProperty(value, "name") && !isNonEmptyString(value.name)) {
    return false;
  }

  if (hasOwnProperty(value, "title") && !isNonEmptyString(value.title)) {
    return false;
  }

  return true;
}

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

  if (hasOwnProperty(entity, "org_type") && !isNonEmptyString(entity.org_type)) {
    errors.push("entity.org_type must be a non-empty string");
  }

  if (
    hasOwnProperty(entity, "parent_org_id") &&
    !isNullableNonEmptyString(entity.parent_org_id)
  ) {
    errors.push("entity.parent_org_id must be null or a non-empty string");
  }

  if (
    hasOwnProperty(entity, "portfolio_org_id") &&
    !isNullableNonEmptyString(entity.portfolio_org_id)
  ) {
    errors.push("entity.portfolio_org_id must be null or a non-empty string");
  }

  if (
    hasOwnProperty(entity, "authorized_domains") &&
    !isStringArray(entity.authorized_domains)
  ) {
    errors.push("entity.authorized_domains must be an array of non-empty strings");
  }

  if (
    hasOwnProperty(entity, "office_holder_snapshot") &&
    !validateOfficeHolderSnapshot(entity.office_holder_snapshot)
  ) {
    errors.push(
      "entity.office_holder_snapshot must be null or a plain object with optional non-empty string name/title fields"
    );
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
