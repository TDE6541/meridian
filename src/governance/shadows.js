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

function createTypedSignalTree() {
  return {
    governance: {
      decision_state: null,
      authority_chain: {
        requested_by_role: null,
        required_approvals: [],
        resolved_approvals: [],
        missing_approvals: [],
      },
      evidence: {
        required_count: 0,
        present_count: 0,
        missing_types: [],
      },
      absence: {
        inspection_missing: false,
        notice_missing: false,
        supersession_missing: false,
      },
    },
    civic: {
      promise_status: {
        conditions_total: 0,
        conditions_satisfied: 0,
        oldest_open_condition_at: null,
      },
      related_zone_ids: [],
      related_asset_ids: [],
    },
    lineage: {
      decision_record_ids: [],
      evidence_ids: [],
    },
  };
}

function validateMinimalSignalTree(value) {
  if (!isPlainObject(value)) {
    return false;
  }

  const requiredKeys = ["governance", "civic", "lineage"];

  return requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key) && isPlainObject(value[key]));
}

function validateTypedSignalTree(value) {
  if (!validateMinimalSignalTree(value)) {
    return false;
  }

  const isStringArray = (candidate) =>
    Array.isArray(candidate) && candidate.every((item) => typeof item === "string");
  const isNonNegativeInteger = (candidate) => Number.isInteger(candidate) && candidate >= 0;
  const hasKey = (candidate, key) => Object.prototype.hasOwnProperty.call(candidate, key);

  if (!hasKey(value.governance, "decision_state")) {
    return false;
  }

  if (value.governance.decision_state !== null && typeof value.governance.decision_state !== "string") {
    return false;
  }

  if (!hasKey(value.governance, "authority_chain") || !isPlainObject(value.governance.authority_chain)) {
    return false;
  }

  const authorityChain = value.governance.authority_chain;

  if (!hasKey(authorityChain, "requested_by_role")) {
    return false;
  }

  if (authorityChain.requested_by_role !== null && typeof authorityChain.requested_by_role !== "string") {
    return false;
  }

  if (
    !hasKey(authorityChain, "required_approvals") ||
    !isStringArray(authorityChain.required_approvals) ||
    !hasKey(authorityChain, "resolved_approvals") ||
    !isStringArray(authorityChain.resolved_approvals) ||
    !hasKey(authorityChain, "missing_approvals") ||
    !isStringArray(authorityChain.missing_approvals)
  ) {
    return false;
  }

  if (!hasKey(value.governance, "evidence") || !isPlainObject(value.governance.evidence)) {
    return false;
  }

  const evidence = value.governance.evidence;

  if (
    !hasKey(evidence, "required_count") ||
    !isNonNegativeInteger(evidence.required_count) ||
    !hasKey(evidence, "present_count") ||
    !isNonNegativeInteger(evidence.present_count) ||
    !hasKey(evidence, "missing_types") ||
    !isStringArray(evidence.missing_types)
  ) {
    return false;
  }

  if (!hasKey(value.governance, "absence") || !isPlainObject(value.governance.absence)) {
    return false;
  }

  const absence = value.governance.absence;

  if (
    !hasKey(absence, "inspection_missing") ||
    typeof absence.inspection_missing !== "boolean" ||
    !hasKey(absence, "notice_missing") ||
    typeof absence.notice_missing !== "boolean" ||
    !hasKey(absence, "supersession_missing") ||
    typeof absence.supersession_missing !== "boolean"
  ) {
    return false;
  }

  if (!hasKey(value.civic, "promise_status") || !isPlainObject(value.civic.promise_status)) {
    return false;
  }

  const promiseStatus = value.civic.promise_status;

  if (
    !hasKey(promiseStatus, "conditions_total") ||
    !isNonNegativeInteger(promiseStatus.conditions_total) ||
    !hasKey(promiseStatus, "conditions_satisfied") ||
    !isNonNegativeInteger(promiseStatus.conditions_satisfied) ||
    !hasKey(promiseStatus, "oldest_open_condition_at")
  ) {
    return false;
  }

  if (
    promiseStatus.oldest_open_condition_at !== null &&
    typeof promiseStatus.oldest_open_condition_at !== "string"
  ) {
    return false;
  }

  if (
    !hasKey(value.civic, "related_zone_ids") ||
    !isStringArray(value.civic.related_zone_ids) ||
    !hasKey(value.civic, "related_asset_ids") ||
    !isStringArray(value.civic.related_asset_ids)
  ) {
    return false;
  }

  if (
    !hasKey(value.lineage, "decision_record_ids") ||
    !isStringArray(value.lineage.decision_record_ids) ||
    !hasKey(value.lineage, "evidence_ids") ||
    !isStringArray(value.lineage.evidence_ids)
  ) {
    return false;
  }

  return true;
}

module.exports = {
  createAuthorityShadow,
  createEvidenceShadow,
  createObligationShadow,
  createAbsenceShadow,
  createGovernanceShadows,
  validateGovernanceShadows,
  createEmptySignalTree,
  createTypedSignalTree,
  validateMinimalSignalTree,
  validateTypedSignalTree,
};
