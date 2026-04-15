const { createGovernancePublisher } = require("./governancePublisher");
const {
  GOVERNANCE_DECISIONS,
  evaluateGovernanceRequest,
  isGovernanceDecision,
} = require("../governance/runtime");

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }

  return value;
}

function normalizeOutcome(outcome) {
  if (
    !outcome ||
    typeof outcome !== "object" ||
    Array.isArray(outcome) ||
    !isGovernanceDecision(outcome.decision) ||
    typeof outcome.reason !== "string" ||
    outcome.reason.trim() === ""
  ) {
    return {
      decision: GOVERNANCE_DECISIONS.BLOCK,
      reason: "governance_runtime_invalid_outcome",
    };
  }

  return {
    decision: outcome.decision,
    reason: outcome.reason,
  };
}

function createGovernanceTransportAdapter(options = {}) {
  const publisher = options.publisher || createGovernancePublisher();
  const evaluateRequest =
    options.evaluateGovernanceRequest || evaluateGovernanceRequest;
  const now = options.now || (() => new Date().toISOString());

  if (typeof publisher.publishOutcome !== "function") {
    throw new TypeError("publisher.publishOutcome must be a function");
  }

  if (typeof evaluateRequest !== "function") {
    throw new TypeError("evaluateGovernanceRequest must be a function");
  }

  async function evaluate(request) {
    const evaluated_at = requireNonEmptyString(now(), "evaluated_at");
    let outcome;

    try {
      outcome = normalizeOutcome(evaluateRequest(request));
    } catch (error) {
      outcome = {
        decision: GOVERNANCE_DECISIONS.BLOCK,
        reason: "governance_runtime_error",
      };
    }

    const publications =
      outcome.decision === GOVERNANCE_DECISIONS.HOLD
        ? await publisher.publishOutcome(request, {
            decision: outcome.decision,
            reason: outcome.reason,
            evaluated_at,
          })
        : [];

    return {
      decision: outcome.decision,
      reason: outcome.reason,
      evaluated_at,
      publications,
    };
  }

  return {
    evaluate,
  };
}

module.exports = {
  createGovernanceTransportAdapter,
};
