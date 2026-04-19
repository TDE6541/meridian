const { createGovernancePublisher } = require("./governancePublisher");
const { CHAIN_WRITE_STATUSES } = require("../governance/forensic");
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
    ...outcome,
    decision: outcome.decision,
    reason: outcome.reason,
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeWarn(warn) {
  if (warn === undefined) {
    return (message) => {
      console.warn(message);
    };
  }

  if (typeof warn !== "function") {
    throw new TypeError("warn must be a function");
  }

  return warn;
}

function emitWarning(warn, message) {
  try {
    warn(message);
  } catch (error) {
    // Warning handlers are observational and must remain non-blocking.
  }
}

function normalizeStableRefs(resolveStableRefs, request, governanceResult, warn) {
  if (typeof resolveStableRefs !== "function") {
    return {};
  }

  try {
    const stableRefs = resolveStableRefs({
      request,
      governanceResult,
      governance_result: governanceResult,
      evaluatedAt: governanceResult.evaluated_at,
      evaluated_at: governanceResult.evaluated_at,
    });

    if (stableRefs === undefined || stableRefs === null) {
      return {};
    }

    if (!isPlainObject(stableRefs)) {
      emitWarning(warn, "forensic_chain_skipped:stable_refs_invalid");
      return {};
    }

    return stableRefs;
  } catch (error) {
    emitWarning(
      warn,
      `forensic_chain_skipped:stable_ref_resolution_failed:${error.message}`
    );
    return {};
  }
}

async function publishLegacyOutcome(publisher, request, governanceResult, warn) {
  if (governanceResult.decision !== GOVERNANCE_DECISIONS.HOLD) {
    return [];
  }

  try {
    return await publisher.publishOutcome(request, {
      decision: governanceResult.decision,
      reason: governanceResult.reason,
      evaluated_at: governanceResult.evaluated_at,
    });
  } catch (error) {
    emitWarning(warn, `governance_publication_failed:${error.message}`);
    return [];
  }
}

async function publishForensicSidecar(
  chainWriter,
  chainPublisher,
  resolveStableRefs,
  request,
  governanceResult,
  warn
) {
  if (
    !chainWriter ||
    typeof chainWriter.recordGovernanceResult !== "function" ||
    !chainPublisher ||
    typeof chainPublisher.publishAppendedEntries !== "function"
  ) {
    return [];
  }

  const stableRefs = normalizeStableRefs(
    resolveStableRefs,
    request,
    governanceResult,
    warn
  );

  let sidecar;
  try {
    sidecar = chainWriter.recordGovernanceResult({
      request,
      governanceResult,
      stableRefs,
      occurredAt: governanceResult.evaluated_at,
    });
  } catch (error) {
    emitWarning(warn, `forensic_chain_failed:${error.message}`);
    return [];
  }

  for (const warning of sidecar.warnings || []) {
    emitWarning(
      warn,
      `forensic_chain_${String(sidecar.status || "unknown").toLowerCase()}:${warning}`
    );
  }

  if (
    sidecar.status !== CHAIN_WRITE_STATUSES.RECORDED ||
    !Array.isArray(sidecar.entryRefs) ||
    sidecar.entryRefs.length === 0
  ) {
    return [];
  }

  try {
    return await chainPublisher.publishAppendedEntries({
      entryRefs: sidecar.entryRefs,
    });
  } catch (error) {
    emitWarning(warn, `forensic_publication_failed:${error.message}`);
    return [];
  }
}

function createGovernanceTransportAdapter(options = {}) {
  const publisher = options.publisher || createGovernancePublisher();
  const evaluateRequest =
    options.evaluateGovernanceRequest || evaluateGovernanceRequest;
  const now = options.now || (() => new Date().toISOString());
  const chainWriter = options.chainWriter || null;
  const chainPublisher = options.chainPublisher || null;
  const resolveStableRefs = options.resolveStableRefs || null;
  const warn = normalizeWarn(options.warn);

  if (typeof publisher.publishOutcome !== "function") {
    throw new TypeError("publisher.publishOutcome must be a function");
  }

  if (typeof evaluateRequest !== "function") {
    throw new TypeError("evaluateGovernanceRequest must be a function");
  }

  if (
    chainWriter !== null &&
    typeof chainWriter.recordGovernanceResult !== "function"
  ) {
    throw new TypeError(
      "chainWriter.recordGovernanceResult must be a function"
    );
  }

  if (
    chainPublisher !== null &&
    typeof chainPublisher.publishAppendedEntries !== "function"
  ) {
    throw new TypeError(
      "chainPublisher.publishAppendedEntries must be a function"
    );
  }

  if (
    resolveStableRefs !== null &&
    typeof resolveStableRefs !== "function"
  ) {
    throw new TypeError("resolveStableRefs must be a function");
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

    const governanceResult = {
      ...outcome,
      evaluated_at,
    };
    const publications = await publishLegacyOutcome(
      publisher,
      request,
      governanceResult,
      warn
    );
    const forensicPublications = await publishForensicSidecar(
      chainWriter,
      chainPublisher,
      resolveStableRefs,
      request,
      governanceResult,
      warn
    );

    return {
      decision: governanceResult.decision,
      reason: governanceResult.reason,
      evaluated_at,
      publications: [...publications, ...forensicPublications],
    };
  }

  return {
    evaluate,
  };
}

module.exports = {
  createGovernanceTransportAdapter,
};
