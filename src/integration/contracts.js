const STAGE_STATUS = Object.freeze({
  PASS: "PASS",
  HOLD: "HOLD",
  FAIL: "FAIL",
  SKIPPED: "SKIPPED",
});

const TOP_LEVEL_STATUS = Object.freeze({
  PASS: "PASS",
  HOLD: "HOLD",
  FAIL: "FAIL",
});

const RUNNER_MODE = Object.freeze({
  REPLAY: "REPLAY",
  LIVE: "LIVE",
});

const PIPELINE_BRIDGE_OUTPUT_CONTRACT_VERSION =
  "wave8.pipelineBridgeOutput.v1";

const FIXTURE_PROVENANCE_TYPES = Object.freeze({
  SYNTHETIC_HAND_CURATED: "SYNTHETIC_HAND_CURATED",
  PUBLIC_RECORD_DERIVED: "PUBLIC_RECORD_DERIVED",
});

const FIXTURE_PROVENANCE_LEGAL_CLAIM =
  "NO_REAL_TPIA_OR_TRAIGA_SUFFICIENCY_CLAIM";
const FIXTURE_PROVENANCE_FROZEN_AT = "2026-04-21";

const REQUIRED_SCENARIO_FIXTURE_FILES = Object.freeze([
  "afterState.json",
  "beforeState.json",
  "expectedMatches.json",
  "expectedScenarioSummary.json",
  "fixtureProvenance.json",
  "pipelineReplayOutput.json",
  "resolutionSequence.json",
  "scenario.json",
  "transcript.txt",
]);

const REQUIRED_LIVE_ENV_KEYS = Object.freeze([
  "OPENAI_API_KEY",
  "MERIDIAN_PIPELINE_MODEL",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isBooleanRecord(value) {
  return (
    isPlainObject(value) &&
    Object.values(value).every((entry) => typeof entry === "boolean")
  );
}

function normalizeExpectedMatches(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (isPlainObject(value) && Array.isArray(value.matches)) {
    return value.matches;
  }

  return null;
}

function normalizeResolutionSteps(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (isPlainObject(value) && Array.isArray(value.steps)) {
    return value.steps;
  }

  return null;
}

function collectScenarioEntityTypes(expectedMatches) {
  const matches = normalizeExpectedMatches(expectedMatches) || [];
  return new Set(
    matches
      .map((entry) => (isPlainObject(entry) ? entry.entityType : null))
      .filter(isNonEmptyString)
  );
}

function collectScenarioResolutionActions(resolutionSequence) {
  const steps = normalizeResolutionSteps(resolutionSequence) || [];
  return new Set(
    steps
      .map((entry) => (isPlainObject(entry) ? entry.action : null))
      .filter(isNonEmptyString)
  );
}

function validateRequiredScenarioFixtureSetFiles(fileNames) {
  const issues = [];

  if (!Array.isArray(fileNames)) {
    return {
      valid: false,
      issues: ["fileNames must be an array."],
    };
  }

  const available = new Set(fileNames);
  for (const requiredFile of REQUIRED_SCENARIO_FIXTURE_FILES) {
    if (!available.has(requiredFile)) {
      issues.push(`Missing required scenario fixture file: ${requiredFile}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function validateFixtureProvenance(value) {
  const issues = [];

  if (!isPlainObject(value)) {
    return {
      valid: false,
      issues: ["fixture provenance document must be a plain object."],
    };
  }

  const fixtureProvenance = value.fixtureProvenance;
  if (!isPlainObject(fixtureProvenance)) {
    return {
      valid: false,
      issues: ["fixtureProvenance must be a plain object."],
    };
  }

  if (!Object.values(FIXTURE_PROVENANCE_TYPES).includes(fixtureProvenance.type)) {
    issues.push("fixtureProvenance.type is invalid.");
  }

  if (!Array.isArray(fixtureProvenance.sourceRefs)) {
    issues.push("fixtureProvenance.sourceRefs must be an array.");
  } else if (
    fixtureProvenance.type === FIXTURE_PROVENANCE_TYPES.PUBLIC_RECORD_DERIVED &&
    fixtureProvenance.sourceRefs.length === 0
  ) {
    issues.push(
      "PUBLIC_RECORD_DERIVED fixtures must include at least one source ref."
    );
  }

  if (fixtureProvenance.legalClaim !== FIXTURE_PROVENANCE_LEGAL_CLAIM) {
    issues.push("fixtureProvenance.legalClaim must use the Packet 1 legal claim.");
  }

  if (fixtureProvenance.frozenAt !== FIXTURE_PROVENANCE_FROZEN_AT) {
    issues.push("fixtureProvenance.frozenAt must equal 2026-04-21.");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function validateScenarioMinimums({
  expectedMatches,
  resolutionSequence,
  requiredEntityTypes = [],
  requiredActions = [],
  minimumStepCount = 0,
}) {
  const issues = [];
  const matches = normalizeExpectedMatches(expectedMatches);
  const steps = normalizeResolutionSteps(resolutionSequence);

  if (!matches) {
    issues.push("expectedMatches must expose a matches array.");
  }

  if (!steps) {
    issues.push("resolutionSequence must expose a steps array.");
  }

  const entityTypes = collectScenarioEntityTypes(expectedMatches);
  const actions = collectScenarioResolutionActions(resolutionSequence);
  const stepCount = steps ? steps.length : 0;

  if (stepCount < minimumStepCount) {
    issues.push(
      `resolutionSequence requires at least ${minimumStepCount} steps; found ${stepCount}.`
    );
  }

  for (const entityType of requiredEntityTypes) {
    if (!entityTypes.has(entityType)) {
      issues.push(`expectedMatches is missing required entity type: ${entityType}`);
    }
  }

  for (const action of requiredActions) {
    if (!actions.has(action)) {
      issues.push(`resolutionSequence is missing required action: ${action}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    entityTypes,
    actions,
    stepCount,
  };
}

function validatePipelineBridgeOutputV1(value) {
  const issues = [];

  if (!isPlainObject(value)) {
    return {
      valid: false,
      issues: ["PipelineBridgeOutputV1 must be a plain object."],
    };
  }

  if (value.contractVersion !== PIPELINE_BRIDGE_OUTPUT_CONTRACT_VERSION) {
    issues.push("contractVersion must equal wave8.pipelineBridgeOutput.v1.");
  }

  if (!isNonEmptyString(value.scenarioId)) {
    issues.push("scenarioId must be a non-empty string.");
  }

  if (!isNonEmptyString(value.corridorId)) {
    issues.push("corridorId must be a non-empty string.");
  }

  if (!Object.values(RUNNER_MODE).includes(value.mode)) {
    issues.push("mode must be REPLAY or LIVE.");
  }

  if (!Object.values(TOP_LEVEL_STATUS).includes(value.status)) {
    issues.push("status must be PASS, HOLD, or FAIL.");
  }

  if (!isPlainObject(value.extractionOutput)) {
    issues.push("extractionOutput must be a plain object.");
  }

  if (!isPlainObject(value.artifactRefs)) {
    issues.push("artifactRefs must be a plain object.");
  } else {
    for (const field of [
      "transcriptPath",
      "replayArtifactPath",
      "liveOutputPath",
      "stderrPath",
      "stdoutPath",
    ]) {
      if (
        value.artifactRefs[field] !== undefined &&
        !isNonEmptyString(value.artifactRefs[field])
      ) {
        issues.push(`artifactRefs.${field} must be a non-empty string when set.`);
      }
    }
  }

  if (!isPlainObject(value.commandInfo)) {
    issues.push("commandInfo must be a plain object.");
  } else {
    if (
      value.commandInfo.command !== undefined &&
      !isNonEmptyString(value.commandInfo.command)
    ) {
      issues.push("commandInfo.command must be a non-empty string when set.");
    }

    if (
      value.commandInfo.args !== undefined &&
      (!Array.isArray(value.commandInfo.args) ||
        !value.commandInfo.args.every(isNonEmptyString))
    ) {
      issues.push("commandInfo.args must be an array of non-empty strings when set.");
    }

    if (
      value.commandInfo.cwd !== undefined &&
      !isNonEmptyString(value.commandInfo.cwd)
    ) {
      issues.push("commandInfo.cwd must be a non-empty string when set.");
    }

    if (
      value.commandInfo.exitCode !== undefined &&
      value.commandInfo.exitCode !== null &&
      !Number.isInteger(value.commandInfo.exitCode)
    ) {
      issues.push("commandInfo.exitCode must be an integer or null when set.");
    }

    if (
      value.commandInfo.durationMs !== undefined &&
      value.commandInfo.durationMs !== null &&
      (!Number.isFinite(value.commandInfo.durationMs) ||
        value.commandInfo.durationMs < 0)
    ) {
      issues.push("commandInfo.durationMs must be a non-negative number or null.");
    }
  }

  if (!isPlainObject(value.envInfo)) {
    issues.push("envInfo must be a plain object.");
  } else {
    if (!isBooleanRecord(value.envInfo.requiredEnvPresence)) {
      issues.push("envInfo.requiredEnvPresence must be a boolean record.");
    }

    if (value.envInfo.secretsExposed !== false) {
      issues.push("envInfo.secretsExposed must remain false.");
    }
  }

  if (
    !Array.isArray(value.holds) ||
    !value.holds.every((entry) => isPlainObject(entry))
  ) {
    issues.push("holds must be an array of plain objects.");
  }

  if (
    !Array.isArray(value.errors) ||
    !value.errors.every((entry) => isPlainObject(entry))
  ) {
    issues.push("errors must be an array of plain objects.");
  }

  if (!isPlainObject(value.provenance)) {
    issues.push("provenance must be a plain object.");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function assertPipelineBridgeOutputV1(value) {
  const validation = validatePipelineBridgeOutputV1(value);
  if (!validation.valid) {
    throw new TypeError(
      `Invalid PipelineBridgeOutputV1: ${validation.issues.join(" | ")}`
    );
  }

  return value;
}

module.exports = {
  FIXTURE_PROVENANCE_FROZEN_AT,
  FIXTURE_PROVENANCE_LEGAL_CLAIM,
  FIXTURE_PROVENANCE_TYPES,
  PIPELINE_BRIDGE_OUTPUT_CONTRACT_VERSION,
  REQUIRED_LIVE_ENV_KEYS,
  REQUIRED_SCENARIO_FIXTURE_FILES,
  RUNNER_MODE,
  STAGE_STATUS,
  TOP_LEVEL_STATUS,
  assertPipelineBridgeOutputV1,
  collectScenarioEntityTypes,
  collectScenarioResolutionActions,
  validateFixtureProvenance,
  validatePipelineBridgeOutputV1,
  validateRequiredScenarioFixtureSetFiles,
  validateScenarioMinimums,
};
