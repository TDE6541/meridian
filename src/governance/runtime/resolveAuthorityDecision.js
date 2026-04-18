const { GOVERNANCE_DECISIONS } = require("./decisionVocabulary");
const {
  AUTHORITY_REVOCATION_REASONS,
  deriveAuthorityRevocation,
} = require("./deriveAuthorityRevocation");

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

const AUTHORITY_DECISION_PRIORITY = Object.freeze({
  BLOCK: 4,
  HOLD: 3,
  SUPERVISE: 2,
  ALLOW: 1,
});

function combineAuthorityResolutions(domainResolution, actorResolution) {
  const activeResolutions = [domainResolution, actorResolution].filter(
    (resolution) => isPlainObject(resolution) && resolution.active === true
  );

  if (activeResolutions.length === 0) {
    return null;
  }

  const effectiveDecision = activeResolutions.reduce((bestDecision, resolution) => {
    if (
      (AUTHORITY_DECISION_PRIORITY[resolution.decision] || 0) >
      (AUTHORITY_DECISION_PRIORITY[bestDecision] || 0)
    ) {
      return resolution.decision;
    }

    return bestDecision;
  }, GOVERNANCE_DECISIONS.ALLOW);

  const reasons = activeResolutions
    .filter((resolution) => resolution.decision === effectiveDecision)
    .map((resolution) => resolution.reason)
    .filter(isNonEmptyString);

  return {
    active: true,
    decision: effectiveDecision,
    reason: [...new Set(reasons)].join(";"),
    conditions_total: activeResolutions.length,
    conditions_satisfied: activeResolutions.filter(
      (resolution) => resolution.decision === GOVERNANCE_DECISIONS.ALLOW
    ).length,
    domain: domainResolution?.active ? domainResolution : null,
    actor: actorResolution?.active ? actorResolution : null,
  };
}

function resolveAuthorityDecision(request, domainResolution, actorResolution) {
  const baseResolution = combineAuthorityResolutions(
    domainResolution,
    actorResolution
  );

  if (!baseResolution) {
    return {
      active: false,
      decision: null,
      reason: "authority_not_requested",
      conditions_total: 0,
      conditions_satisfied: 0,
      domain: null,
      actor: null,
      baseResolution: null,
      revocation: null,
      provenance: {
        status: "not_applicable",
        reason: null,
        depthCap: null,
        checkedChainDepth: 0,
      },
    };
  }

  if (baseResolution.decision === GOVERNANCE_DECISIONS.BLOCK) {
    return {
      active: true,
      decision: baseResolution.decision,
      reason: baseResolution.reason,
      conditions_total: baseResolution.conditions_total || 0,
      conditions_satisfied: baseResolution.conditions_satisfied || 0,
      domain: baseResolution.domain,
      actor: baseResolution.actor,
      baseResolution,
      revocation: null,
      provenance: {
        status: "not_applicable",
        reason: null,
        depthCap: null,
        checkedChainDepth: 0,
      },
    };
  }

  const revocation = deriveAuthorityRevocation(request, baseResolution);
  const provenance = revocation.provenance;

  if (provenance.status === "invalid") {
    return {
      active: true,
      decision: GOVERNANCE_DECISIONS.BLOCK,
      reason: provenance.reason,
      conditions_total: (baseResolution.conditions_total || 0) + 1,
      conditions_satisfied: baseResolution.conditions_satisfied || 0,
      domain: baseResolution.domain,
      actor: baseResolution.actor,
      baseResolution,
      revocation: null,
      provenance,
    };
  }

  if (provenance.status === "phantom") {
    return {
      active: true,
      decision: GOVERNANCE_DECISIONS.HOLD,
      reason: provenance.reason,
      conditions_total: (baseResolution.conditions_total || 0) + 1,
      conditions_satisfied: baseResolution.conditions_satisfied || 0,
      domain: baseResolution.domain,
      actor: baseResolution.actor,
      baseResolution,
      revocation: null,
      provenance,
    };
  }

  if (revocation.active) {
    return {
      active: true,
      decision: GOVERNANCE_DECISIONS.REVOKE,
      reason: revocation.reason,
      conditions_total: (baseResolution.conditions_total || 0) + 1,
      conditions_satisfied: baseResolution.conditions_satisfied || 0,
      domain: baseResolution.domain,
      actor: baseResolution.actor,
      baseResolution,
      revocation,
      provenance,
    };
  }

  return {
    active: true,
    decision: baseResolution.decision,
    reason: baseResolution.reason,
    conditions_total: baseResolution.conditions_total || 0,
    conditions_satisfied: baseResolution.conditions_satisfied || 0,
    domain: baseResolution.domain,
    actor: baseResolution.actor,
    baseResolution,
    revocation: null,
    provenance,
  };
}

module.exports = {
  AUTHORITY_DECISION_PRIORITY,
  AUTHORITY_REVOCATION_REASONS,
  combineAuthorityResolutions,
  resolveAuthorityDecision,
};
