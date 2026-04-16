const { createEmptyPromiseStatus } = require("./derivePromiseStatus");
const { evaluateGovernanceRequest } = require("./evaluateGovernanceRequest");

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeOmissionSummary(runtimeSubset) {
  const omissions = isPlainObject(runtimeSubset?.omissions)
    ? runtimeSubset.omissions
    : null;
  const activeOmissionPackIds = Array.isArray(omissions?.activeOmissionPackIds)
    ? [...omissions.activeOmissionPackIds]
    : [];
  const findingCount = Array.isArray(omissions?.findings) ? omissions.findings.length : 0;

  return {
    activeOmissionPackIds,
    findingCount,
  };
}

function normalizeStandingRiskSummary(runtimeSubset) {
  const standingRisk = isPlainObject(runtimeSubset?.standingRisk)
    ? runtimeSubset.standingRisk
    : null;
  const blockingItems = Array.isArray(standingRisk?.blockingItems)
    ? standingRisk.blockingItems
    : [];

  return {
    blockingItemCount: blockingItems.length,
    blockingEntryIds: blockingItems
      .map((item) => item?.entryId)
      .filter((entryId) => isNonEmptyString(entryId)),
  };
}

function normalizeScenarioInput(scenario, index) {
  if (!isPlainObject(scenario)) {
    throw new TypeError(`scenarios[${index}] must be a plain object`);
  }

  if (!isNonEmptyString(scenario.scenarioId)) {
    throw new TypeError(`scenarios[${index}].scenarioId must be a non-empty string`);
  }

  if (!isPlainObject(scenario.request)) {
    throw new TypeError(`scenarios[${index}].request must be a plain object`);
  }

  if (
    scenario.expectedDecision !== undefined &&
    scenario.expectedDecision !== null &&
    !isNonEmptyString(scenario.expectedDecision)
  ) {
    throw new TypeError(
      `scenarios[${index}].expectedDecision must be a non-empty string when provided`
    );
  }

  if (
    scenario.governedNonEventProof !== undefined &&
    typeof scenario.governedNonEventProof !== "boolean"
  ) {
    throw new TypeError(
      `scenarios[${index}].governedNonEventProof must be a boolean when provided`
    );
  }

  return {
    scenarioId: scenario.scenarioId,
    request: scenario.request,
    expectedDecision:
      isNonEmptyString(scenario.expectedDecision) ? scenario.expectedDecision : null,
    governedNonEventProof: scenario.governedNonEventProof === true,
  };
}

function summarizeScenarioEvaluation(scenario) {
  const evaluation = evaluateGovernanceRequest(scenario.request);
  const runtimeSubset = isPlainObject(evaluation.runtimeSubset)
    ? evaluation.runtimeSubset
    : null;
  const promiseStatus = isPlainObject(runtimeSubset?.civic?.promise_status)
    ? runtimeSubset.civic.promise_status
    : createEmptyPromiseStatus();
  const proofTargetDecision = scenario.expectedDecision || "HOLD";
  const governedNonEventProofPassed = scenario.governedNonEventProof
    ? evaluation.decision === proofTargetDecision
    : null;

  return {
    scenarioId: scenario.scenarioId,
    decision: evaluation.decision,
    reason: evaluation.reason,
    rationale: runtimeSubset?.civic?.rationale?.decision || null,
    promiseStatus,
    confidenceTier: runtimeSubset?.civic?.confidence?.tier || null,
    omissionSummary: normalizeOmissionSummary(runtimeSubset),
    standingRiskSummary: normalizeStandingRiskSummary(runtimeSubset),
    governedNonEventProofPassed,
  };
}

function runGovernanceSweep(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError("runGovernanceSweep options must be a plain object");
  }

  const scenarios = Array.isArray(options.scenarios) ? options.scenarios : null;
  if (!scenarios || scenarios.length === 0) {
    throw new TypeError("runGovernanceSweep requires a non-empty scenarios array");
  }

  if (
    options.evaluatedAt !== undefined &&
    options.evaluatedAt !== null &&
    !isNonEmptyString(options.evaluatedAt)
  ) {
    throw new TypeError("runGovernanceSweep evaluatedAt must be a non-empty string");
  }

  const normalizedScenarios = scenarios.map((scenario, index) =>
    normalizeScenarioInput(scenario, index)
  );
  const summaries = normalizedScenarios.map(summarizeScenarioEvaluation);
  const proofScenarios = summaries.filter(
    (summary) => summary.governedNonEventProofPassed !== null
  );

  return {
    sweepMode: "on_demand_read_only",
    evaluatedAt: options.evaluatedAt || null,
    scenarioCount: summaries.length,
    governedNonEventProofPassed:
      proofScenarios.length > 0 &&
      proofScenarios.every((summary) => summary.governedNonEventProofPassed === true),
    scenarios: summaries,
  };
}

module.exports = {
  runGovernanceSweep,
};
