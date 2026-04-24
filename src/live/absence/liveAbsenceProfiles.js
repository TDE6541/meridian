const {
  LIVE_FEED_SEVERITIES,
  RESERVED_CONTRACT_VERSIONS,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");

const LIVE_ABSENCE_FINDING_CONTRACT_VERSION =
  RESERVED_CONTRACT_VERSIONS.LIVE_ABSENCE_FINDING;
const LIVE_ABSENCE_PROFILE_VERSION = "meridian.v2.liveAbsenceProfile.v1";
const DEFAULT_LIVE_ABSENCE_PROFILE_ID = "a4.default.civic";

const DEFAULT_LIVE_ABSENCE_RULES = Object.freeze([
  Object.freeze({
    rule_id: "utility_conflict_requires_authority_or_evidence",
    expected_signal: "utility_authority_or_evidence_ref",
    trigger_field: "touches_utility_asset",
    satisfied_field: "authority_or_evidence_present",
    severity: "HOLD",
    resolution_path:
      "Attach an observed authority approval or evidence ref before clearing the utility conflict absence.",
    why_this_matters:
      "Utility-touching live work needs observed authority or evidence before the session can treat the action as resolved.",
  }),
  Object.freeze({
    rule_id: "emergency_utility_incident_requires_public_notice_posture",
    expected_signal: "public_notice_posture_ref",
    trigger_field: "emergency_utility_incident",
    satisfied_field: "public_notice_posture_present",
    severity: "HOLD",
    resolution_path:
      "Attach an observed public notice posture ref or keep the emergency utility incident held.",
    why_this_matters:
      "Emergency utility incidents need an observed public notice posture before public-facing handling can be treated as complete.",
  }),
  Object.freeze({
    rule_id: "permit_or_inspection_decision_requires_authority_evidence",
    expected_signal: "permit_or_inspection_authority_evidence_ref",
    trigger_field: "permit_or_inspection_decision_activity",
    satisfied_field: "authority_evidence_present",
    severity: "HOLD",
    resolution_path:
      "Attach observed authority evidence to the permit or inspection decision before treating it as resolved.",
    why_this_matters:
      "Permit and inspection decisions need observed authority evidence before the live session can rely on the decision posture.",
  }),
  Object.freeze({
    rule_id: "public_disclosure_requires_redaction_boundary",
    expected_signal: "redaction_or_disclosure_boundary_ref",
    trigger_field: "public_facing_output",
    satisfied_field: "redaction_boundary_present",
    severity: "HOLD",
    resolution_path:
      "Attach an observed redaction or disclosure boundary ref before treating public-facing output as cleared.",
    why_this_matters:
      "Public-facing output needs an observed disclosure boundary before withheld or sensitive details can be considered bounded.",
  }),
  Object.freeze({
    rule_id: "franchise_asset_conflict_requires_jurisdiction_clarification",
    expected_signal: "jurisdiction_clarification_ref",
    trigger_field: "franchise_asset_conflict",
    satisfied_field: "jurisdiction_clarification_present",
    severity: "HOLD",
    resolution_path:
      "Attach observed jurisdiction clarification for the franchise-owned asset conflict before resolving the absence.",
    why_this_matters:
      "Franchise-owned asset conflicts need observed jurisdiction clarification before authority can be treated as settled.",
  }),
  Object.freeze({
    rule_id: "obligation_without_owner_creates_unresolved_obligation_absence",
    expected_signal: "obligation_owner_or_responsible_party_ref",
    trigger_field: "obligation_present",
    satisfied_field: "owner_present",
    severity: "GAP",
    resolution_path:
      "Attach an observed owner or responsible party ref to the obligation before clearing the ownership absence.",
    why_this_matters:
      "Live obligations need an observed owner or responsible party before follow-through can be treated as assigned.",
  }),
]);

const MINIMUM_LIVE_ABSENCE_RULE_IDS = Object.freeze(
  DEFAULT_LIVE_ABSENCE_RULES.map((rule) => rule.rule_id)
);

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

function createDefaultLiveAbsenceProfile() {
  return {
    version: LIVE_ABSENCE_PROFILE_VERSION,
    profile_id: DEFAULT_LIVE_ABSENCE_PROFILE_ID,
    finding_version: LIVE_ABSENCE_FINDING_CONTRACT_VERSION,
    rules: DEFAULT_LIVE_ABSENCE_RULES.map(cloneJsonValue),
  };
}

function getDefaultLiveAbsenceProfile() {
  return createDefaultLiveAbsenceProfile();
}

function validateRule(rule, index, seenRuleIds) {
  const issues = [];
  const path = `rules[${index}]`;

  if (!isPlainObject(rule)) {
    return [`${path} must be a plain object.`];
  }

  for (const fieldName of [
    "rule_id",
    "expected_signal",
    "trigger_field",
    "satisfied_field",
    "severity",
    "resolution_path",
    "why_this_matters",
  ]) {
    if (!isNonEmptyString(rule[fieldName])) {
      issues.push(`${path}.${fieldName} must be a non-empty string.`);
    }
  }

  if (isNonEmptyString(rule.rule_id)) {
    if (seenRuleIds.has(rule.rule_id)) {
      issues.push(`${path}.rule_id must be unique.`);
    }
    seenRuleIds.add(rule.rule_id);
  }

  if (
    isNonEmptyString(rule.severity) &&
    !LIVE_FEED_SEVERITIES.includes(rule.severity)
  ) {
    issues.push(`${path}.severity is not allowed: ${rule.severity}.`);
  }

  return issues;
}

function validateLiveAbsenceProfile(profile) {
  const issues = [];

  if (!isPlainObject(profile)) {
    return createValidationResult([
      "LiveAbsenceProfileV1 must be a plain object.",
    ]);
  }

  if (profile.version !== LIVE_ABSENCE_PROFILE_VERSION) {
    issues.push(`version must equal ${LIVE_ABSENCE_PROFILE_VERSION}.`);
  }

  if (!isNonEmptyString(profile.profile_id)) {
    issues.push("profile_id must be a non-empty string.");
  }

  if (profile.finding_version !== LIVE_ABSENCE_FINDING_CONTRACT_VERSION) {
    issues.push(
      `finding_version must equal ${LIVE_ABSENCE_FINDING_CONTRACT_VERSION}.`
    );
  }

  if (!Array.isArray(profile.rules)) {
    issues.push("rules must be an array.");
  } else {
    const seenRuleIds = new Set();
    profile.rules.forEach((rule, index) => {
      issues.push(...validateRule(rule, index, seenRuleIds));
    });

    for (const ruleId of MINIMUM_LIVE_ABSENCE_RULE_IDS) {
      if (!seenRuleIds.has(ruleId)) {
        issues.push(`minimum rule missing: ${ruleId}.`);
      }
    }
  }

  return createValidationResult(issues);
}

function getLiveAbsenceRuleProfile(ruleId, profile = createDefaultLiveAbsenceProfile()) {
  const validation = validateLiveAbsenceProfile(profile);
  if (!validation.valid) {
    return null;
  }

  return profile.rules.find((rule) => rule.rule_id === ruleId) || null;
}

module.exports = {
  DEFAULT_LIVE_ABSENCE_PROFILE_ID,
  DEFAULT_LIVE_ABSENCE_RULES,
  LIVE_ABSENCE_FINDING_CONTRACT_VERSION,
  LIVE_ABSENCE_PROFILE_VERSION,
  MINIMUM_LIVE_ABSENCE_RULE_IDS,
  createDefaultLiveAbsenceProfile,
  getDefaultLiveAbsenceProfile,
  getLiveAbsenceRuleProfile,
  validateLiveAbsenceProfile,
};
