function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createAuthorityShadow() {
  return {};
}

function createEvidenceShadow() {
  return {};
}

function createObligationShadow() {
  return {};
}

function createAbsenceShadow() {
  return {};
}

function createGovernanceShadows() {
  return {
    authority: createAuthorityShadow(),
    evidence: createEvidenceShadow(),
    obligation: createObligationShadow(),
    absence: createAbsenceShadow(),
  };
}

function validateGovernanceShadows(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  const requiredKeys = ["authority", "evidence", "obligation", "absence"];

  return requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key) && isPlainObject(value[key]));
}

function createEmptySignalTree() {
  return {
    governance: {},
    civic: {},
    lineage: {},
  };
}

function validateMinimalSignalTree(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  const requiredKeys = ["governance", "civic", "lineage"];

  return requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key) && isPlainObject(value[key]));
}

module.exports = {
  createAuthorityShadow,
  createEvidenceShadow,
  createObligationShadow,
  createAbsenceShadow,
  createGovernanceShadows,
  validateGovernanceShadows,
  createEmptySignalTree,
  validateMinimalSignalTree,
};
