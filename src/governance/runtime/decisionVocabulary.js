const GOVERNANCE_DECISIONS = Object.freeze({
  ALLOW: "ALLOW",
  HOLD: "HOLD",
  BLOCK: "BLOCK",
});

const GOVERNANCE_DECISION_VALUES = Object.freeze(
  Object.values(GOVERNANCE_DECISIONS)
);

function isGovernanceDecision(value) {
  return GOVERNANCE_DECISION_VALUES.includes(value);
}

module.exports = {
  GOVERNANCE_DECISIONS,
  GOVERNANCE_DECISION_VALUES,
  isGovernanceDecision,
};
