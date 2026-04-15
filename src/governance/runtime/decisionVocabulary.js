const GOVERNANCE_DECISIONS = Object.freeze({
  ALLOW: "ALLOW",
  SUPERVISE: "SUPERVISE",
  HOLD: "HOLD",
  BLOCK: "BLOCK",
});

const GOVERNANCE_CONFIDENCE_TIERS = Object.freeze({
  WATCH: "WATCH",
  GAP: "GAP",
  HOLD: "HOLD",
  KILL: "KILL",
});

const GOVERNANCE_DECISION_VALUES = Object.freeze(
  Object.values(GOVERNANCE_DECISIONS)
);

const GOVERNANCE_CONFIDENCE_TIER_VALUES = Object.freeze(
  Object.values(GOVERNANCE_CONFIDENCE_TIERS)
);

function isGovernanceDecision(value) {
  return GOVERNANCE_DECISION_VALUES.includes(value);
}

function isGovernanceConfidenceTier(value) {
  return GOVERNANCE_CONFIDENCE_TIER_VALUES.includes(value);
}

module.exports = {
  GOVERNANCE_CONFIDENCE_TIERS,
  GOVERNANCE_CONFIDENCE_TIER_VALUES,
  GOVERNANCE_DECISIONS,
  GOVERNANCE_DECISION_VALUES,
  isGovernanceDecision,
  isGovernanceConfidenceTier,
};
