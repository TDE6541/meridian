function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function createEmptyPromiseStatus() {
  return {
    conditions_total: 0,
    conditions_satisfied: 0,
    oldest_open_condition_at: null,
  };
}

function countRequiredApprovals(request) {
  return Array.isArray(request?.authority_context?.required_approvals)
    ? request.authority_context.required_approvals.length
    : 0;
}

function countResolvedApprovals(request, approvalsTotal) {
  const resolvedApprovals = Array.isArray(request?.authority_context?.resolved_approvals)
    ? request.authority_context.resolved_approvals.length
    : 0;

  return Math.min(resolvedApprovals, approvalsTotal);
}

function countEvidenceConditions(requestFacts) {
  return isNonNegativeInteger(requestFacts?.requiredCount) ? requestFacts.requiredCount : 0;
}

function countSatisfiedEvidenceConditions(requestFacts, evidenceTotal) {
  const presentCount = isNonNegativeInteger(requestFacts?.presentCount)
    ? requestFacts.presentCount
    : 0;

  return Math.min(presentCount, evidenceTotal);
}

function getActiveOmissionCount(omissions) {
  return Array.isArray(omissions?.findings) ? omissions.findings.length : 0;
}

function getOpenStandingRiskCount(standingRisk) {
  if (!Array.isArray(standingRisk?.view)) {
    return 0;
  }

  return standingRisk.view.filter((item) => {
    if (
      !isPlainObject(item) ||
      (item.state !== "OPEN" && item.state !== "CARRIED" && item.state !== "STANDING")
    ) {
      return false;
    }

    return (
      item.state === "CARRIED" ||
      item.state === "STANDING" ||
      (isNonNegativeInteger(item.sessionCount) && item.sessionCount > 1) ||
      (isNonNegativeInteger(item.carryCount) && item.carryCount > 0)
    );
  }).length;
}

function derivePromiseStatus(request, requestFacts, omissions, standingRisk) {
  const approvalsTotal = countRequiredApprovals(request);
  const approvalsSatisfied = countResolvedApprovals(request, approvalsTotal);
  const evidenceTotal = countEvidenceConditions(requestFacts);
  const evidenceSatisfied = countSatisfiedEvidenceConditions(requestFacts, evidenceTotal);
  const omissionTotal = getActiveOmissionCount(omissions);
  const standingRiskTotal = getOpenStandingRiskCount(standingRisk);

  return {
    conditions_total:
      approvalsTotal + evidenceTotal + omissionTotal + standingRiskTotal,
    conditions_satisfied: approvalsSatisfied + evidenceSatisfied,
    // Block D does not invent temporal provenance when bounded runtime facts lack it.
    oldest_open_condition_at: null,
  };
}

module.exports = {
  createEmptyPromiseStatus,
  derivePromiseStatus,
};
