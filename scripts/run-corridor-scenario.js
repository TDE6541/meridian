#!/usr/bin/env node

const { readFileSync } = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const {
  RUNNER_MODE,
  TOP_LEVEL_STATUS,
} = require("../src/integration/contracts");
const { runCorridorScenario } = require("../src/integration/corridorScenario");
const { runResolutionCascade } = require("../src/integration/resolutionCascade");

const RUNNER_REPORT_CONTRACT_VERSION = "wave8.packet5.runnerReport.v1";
const FIXED_REPLAY_EVALUATED_AT = "2026-04-21T12:00:00.000Z";
const EXIT_CODES = Object.freeze({
  MATCHED_EXPECTATIONS: 0,
  TECHNICAL_FAILURE: 1,
  UNEXPECTED_HOLD: 2,
});
const EXIT_LABELS = Object.freeze({
  0: "MATCHED_EXPECTATIONS",
  1: "TECHNICAL_FAILURE",
  2: "UNEXPECTED_HOLD",
});
const REPO_ROOT = path.resolve(__dirname, "..");
const FIXTURE_ROOT = path.join(REPO_ROOT, "tests", "fixtures", "scenarios");
const SCENARIO_ORDER = Object.freeze(["routine", "contested", "emergency"]);
const SCENARIO_CATALOG = Object.freeze({
  routine: Object.freeze({
    key: "routine",
    directoryParts: ["routine", "lancaster-avenue-corridor-reconstruction"],
  }),
  contested: Object.freeze({
    key: "contested",
    directoryParts: [
      "contested",
      "hemphill-street-mixed-use-contested-authority",
    ],
  }),
  emergency: Object.freeze({
    key: "emergency",
    directoryParts: ["emergency", "camp-bowie-water-main-break"],
  }),
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function buildFixtureRoot(definition) {
  return path.join(FIXTURE_ROOT, ...definition.directoryParts);
}

function loadScenarioFixture(definition) {
  const root = buildFixtureRoot(definition);
  const scenario = readJson(path.join(root, "scenario.json"));
  const expectedSummary = readJson(path.join(root, "expectedScenarioSummary.json"));
  const resolutionSequence = readJson(path.join(root, "resolutionSequence.json"));
  const afterState = readJson(path.join(root, "afterState.json"));

  return {
    key: definition.key,
    root,
    scenario,
    expectedSummary,
    resolutionSequence,
    afterState,
  };
}

function parseCliArgs(argv) {
  const options = {
    scenario: null,
    mode: null,
    cascade: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--cascade") {
      options.cascade = true;
      continue;
    }

    if (token === "--json") {
      options.json = true;
      continue;
    }

    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }

    if (token.startsWith("--scenario=")) {
      options.scenario = token.slice("--scenario=".length);
      continue;
    }

    if (token === "--scenario") {
      index += 1;
      options.scenario = argv[index] || null;
      continue;
    }

    if (token.startsWith("--mode=")) {
      options.mode = token.slice("--mode=".length);
      continue;
    }

    if (token === "--mode") {
      index += 1;
      options.mode = argv[index] || null;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (options.help) {
    return options;
  }

  if (!options.scenario) {
    throw new Error("Missing required --scenario flag.");
  }

  if (!options.mode) {
    throw new Error("Missing required --mode flag.");
  }

  const requestedScenario = String(options.scenario).trim().toLowerCase();
  if (
    requestedScenario !== "all" &&
    !Object.prototype.hasOwnProperty.call(SCENARIO_CATALOG, requestedScenario)
  ) {
    throw new Error(
      "Invalid --scenario value. Use routine, contested, emergency, or all."
    );
  }

  const requestedMode = String(options.mode).trim().toLowerCase();
  if (requestedMode !== "replay" && requestedMode !== "live") {
    throw new Error("Invalid --mode value. Use replay or live.");
  }

  return {
    ...options,
    scenario: requestedScenario,
    mode: requestedMode === "replay" ? RUNNER_MODE.REPLAY : RUNNER_MODE.LIVE,
  };
}

function getSelectedScenarioDefinitions(requestedScenario) {
  if (requestedScenario === "all") {
    return SCENARIO_ORDER.map((key) => SCENARIO_CATALOG[key]);
  }

  return [SCENARIO_CATALOG[requestedScenario]];
}

function getEvaluatedAt(mode) {
  return mode === RUNNER_MODE.REPLAY
    ? FIXED_REPLAY_EVALUATED_AT
    : new Date().toISOString();
}

function buildStateFingerprint(stateDocument) {
  const normalizedEntities = Array.isArray(stateDocument?.entities)
    ? stateDocument.entities
        .filter(isPlainObject)
        .map((entity) => ({
          entityType: entity.entityType || null,
          entityId: entity.entityId || null,
          status: entity.status || null,
        }))
        .sort((left, right) => {
          const leftKey = `${left.entityType}:${left.entityId}`;
          const rightKey = `${right.entityType}:${right.entityId}`;
          return leftKey.localeCompare(rightKey);
        })
    : [];

  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        scenarioId: stateDocument?.scenarioId || null,
        corridorId: stateDocument?.corridorId || null,
        entities: normalizedEntities,
      })
    )
    .digest("hex");
}

function buildScenarioRunInput(fixture, mode, cascade) {
  return {
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    fixtureRoot: fixture.root,
    mode,
    evaluatedAt: getEvaluatedAt(mode),
  };
}

function executeScenario(fixture, mode, cascade) {
  const input = buildScenarioRunInput(fixture, mode, cascade);

  return cascade ? runResolutionCascade(input) : runCorridorScenario(input);
}

function buildCheck(label, pass, expected, actual) {
  return {
    label,
    pass: pass === true,
    expected,
    actual,
  };
}

function countStatuses(stageEntries) {
  const counts = {};

  for (const entry of stageEntries) {
    const status = entry?.status || "UNKNOWN";
    counts[status] = (counts[status] || 0) + 1;
  }

  return counts;
}

function formatCounts(counts) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status} x${count}`)
    .join(", ");
}

function buildSingleStageSummary(result) {
  return Object.entries(result.stageStatus || {}).map(([stageName, stageValue]) => ({
    stage: stageName,
    counts: {
      [stageValue.status]: 1,
    },
    formatted: `${stageName}=${stageValue.status}`,
  }));
}

function buildCascadeStageSummary(result) {
  const stageNames = ["pipeline", "matching", "governance", "authority", "forensic", "skins"];
  return stageNames.map((stageName) => {
    const counts = countStatuses(
      (result.steps || []).map((step) => step?.stageStatus?.[stageName] || {})
    );
    return {
      stage: stageName,
      counts,
      formatted: `${stageName}=${formatCounts(counts)}`,
    };
  });
}

function buildSingleComparison(fixture, result, mode) {
  const expectedBridgeStatus =
    mode === RUNNER_MODE.REPLAY ? fixture.expectedSummary.bridgeReplayStatus : "PASS";
  const checks = [
    buildCheck(
      "pipeline bridge status",
      result.pipeline?.bridgeStatus === expectedBridgeStatus,
      expectedBridgeStatus,
      result.pipeline?.bridgeStatus || null
    ),
    buildCheck(
      "runner top-level status",
      result.status === TOP_LEVEL_STATUS.PASS,
      TOP_LEVEL_STATUS.PASS,
      result.status || null
    ),
    buildCheck(
      "expected governance decision",
      result.summary?.expectedDecisionMatched === true,
      true,
      result.summary?.expectedDecisionMatched === true
    ),
    buildCheck(
      "scenario final disposition reference",
      result.summary?.expectedFinalDisposition ===
        fixture.expectedSummary.finalDisposition,
      fixture.expectedSummary.finalDisposition,
      result.summary?.expectedFinalDisposition || null
    ),
    buildCheck(
      "scenario final status reference",
      result.summary?.expectedScenarioFinalStatus ===
        fixture.expectedSummary.finalStatus,
      fixture.expectedSummary.finalStatus,
      result.summary?.expectedScenarioFinalStatus || null
    ),
  ];

  return {
    matched: checks.every((check) => check.pass),
    expected: {
      bridgeStatus: expectedBridgeStatus,
      finalDisposition: fixture.expectedSummary.finalDisposition,
      finalStatus: fixture.expectedSummary.finalStatus,
      governanceDecision: result.summary?.expectedDecision || null,
    },
    actual: {
      bridgeStatus: result.pipeline?.bridgeStatus || null,
      governanceDecision: result.governance?.result?.decision || null,
      runnerStatus: result.status || null,
      selectedClauseText: result.summary?.selectedClauseText || null,
    },
    checks,
  };
}

function buildCascadeComparison(fixture, result, mode) {
  const expectedBridgeStatus =
    mode === RUNNER_MODE.REPLAY ? fixture.expectedSummary.bridgeReplayStatus : "PASS";
  const stepIds = fixture.resolutionSequence.steps.map((step) => step.stepId);
  const actualStepIds = (result.transitionEvidence?.steps || []).map(
    (step) => step.stepId
  );
  const actionSequence = fixture.resolutionSequence.steps.map((step) => step.action);
  const actualActionSequence = (result.transitionEvidence?.steps || []).map(
    (step) => step.action
  );
  const expectedAfterStateFingerprint = buildStateFingerprint(fixture.afterState);
  const actualAfterStateFingerprint =
    result.transitionEvidence?.steps?.[result.transitionEvidence.steps.length - 1]
      ?.afterStateFingerprint || null;
  const checks = [
    buildCheck(
      "runner top-level status",
      result.status === TOP_LEVEL_STATUS.PASS,
      TOP_LEVEL_STATUS.PASS,
      result.status || null
    ),
    buildCheck(
      "step count",
      (result.steps || []).length === fixture.resolutionSequence.steps.length &&
        (result.steps || []).length >= (fixture.scenario.minimumCascadeSteps || 0),
      fixture.resolutionSequence.steps.length,
      (result.steps || []).length
    ),
    buildCheck("step ids", JSON.stringify(actualStepIds) === JSON.stringify(stepIds), stepIds, actualStepIds),
    buildCheck(
      "step actions",
      JSON.stringify(actualActionSequence) === JSON.stringify(actionSequence),
      actionSequence,
      actualActionSequence
    ),
    buildCheck(
      "final state fingerprint",
      actualAfterStateFingerprint === expectedAfterStateFingerprint,
      expectedAfterStateFingerprint,
      actualAfterStateFingerprint
    ),
    buildCheck(
      "bridge status reference",
      ((result.steps || [])[0]?.pipeline?.bridgeStatus || null) === expectedBridgeStatus,
      expectedBridgeStatus,
      (result.steps || [])[0]?.pipeline?.bridgeStatus || null
    ),
    buildCheck(
      "scenario final disposition reference",
      result.summary?.expectedFinalDisposition ===
        fixture.expectedSummary.finalDisposition,
      fixture.expectedSummary.finalDisposition,
      result.summary?.expectedFinalDisposition || null
    ),
    buildCheck(
      "scenario final status reference",
      result.summary?.expectedFinalStatus === fixture.expectedSummary.finalStatus,
      fixture.expectedSummary.finalStatus,
      result.summary?.expectedFinalStatus || null
    ),
  ];

  return {
    matched: checks.every((check) => check.pass),
    expected: {
      bridgeStatus: expectedBridgeStatus,
      finalDisposition: fixture.expectedSummary.finalDisposition,
      finalStatus: fixture.expectedSummary.finalStatus,
      minimumCascadeSteps: fixture.scenario.minimumCascadeSteps || 0,
      stepCount: fixture.resolutionSequence.steps.length,
    },
    actual: {
      decisions: (result.steps || []).map((step) => step?.governance?.result?.decision || null),
      finalStateFingerprint: actualAfterStateFingerprint,
      runnerStatus: result.status || null,
      stepCount: (result.steps || []).length,
    },
    checks,
  };
}

function hasStructuredHold(result, cascade) {
  if (!result || result.status !== TOP_LEVEL_STATUS.HOLD) {
    return false;
  }

  if (Array.isArray(result.holds) && result.holds.length > 0) {
    return true;
  }

  if (!cascade && Array.isArray(result.pipeline?.holds) && result.pipeline.holds.length > 0) {
    return true;
  }

  return false;
}

function classifyResult(result, comparison, cascade) {
  if (
    result.status === TOP_LEVEL_STATUS.FAIL ||
    (Array.isArray(result.errors) && result.errors.length > 0)
  ) {
    return EXIT_CODES.TECHNICAL_FAILURE;
  }

  if (comparison.matched) {
    return EXIT_CODES.MATCHED_EXPECTATIONS;
  }

  if (hasStructuredHold(result, cascade)) {
    return EXIT_CODES.UNEXPECTED_HOLD;
  }

  return EXIT_CODES.TECHNICAL_FAILURE;
}

function buildSingleHumanSummary(result) {
  const decision = result.governance?.result?.decision || "UNKNOWN";
  const authoritySummary = result.authority?.relevant
    ? `${result.authority.status} (${result.authority.resolution?.decision || "unknown"})`
    : "n/a";
  const fallbackSummary =
    Array.isArray(result.skins?.fallbackSkinIds) && result.skins.fallbackSkinIds.length > 0
      ? result.skins.fallbackSkinIds.join(", ")
      : "none";

  return {
    stageSummary: buildSingleStageSummary(result)
      .map((entry) => entry.formatted)
      .join(" | "),
    expectedActualSummary:
      `decision=${result.summary?.expectedDecision || "unknown"}/` +
      `${decision}, finalDisposition=${result.summary?.expectedFinalDisposition || "unknown"}`,
    keySummary:
      `decision=${decision}; authority=${authoritySummary}; forensic_entries=` +
      `${result.forensic?.entries?.length || 0}; skins=` +
      `${(result.skins?.renderedSkinIds || []).length}; fallback=${fallbackSummary}`,
  };
}

function buildCascadeHumanSummary(result) {
  const fallbackStepIds = (result.steps || [])
    .map((step, index) =>
      Array.isArray(step?.skins?.fallbackSkinIds) && step.skins.fallbackSkinIds.length > 0
        ? result.transitionEvidence?.steps?.[index]?.stepId || null
        : null
    )
    .filter(Boolean);
  const authorityDecisions = (result.steps || [])
    .map((step, index) =>
      step?.authority?.relevant
        ? `${result.transitionEvidence?.steps?.[index]?.stepId || `step-${index + 1}`}=` +
          `${step.authority.resolution?.decision || "unknown"}`
        : null
    )
    .filter(Boolean);

  return {
    stageSummary: buildCascadeStageSummary(result)
      .map((entry) => entry.formatted)
      .join(" | "),
    expectedActualSummary:
      `steps=${result.summary?.totalSteps || 0}/` +
      `${result.summary?.totalSteps || 0}, finalDisposition=` +
      `${result.summary?.expectedFinalDisposition || "unknown"}, finalStatus=` +
      `${result.summary?.expectedFinalStatus || "unknown"}`,
    keySummary:
      `decisions=${(result.steps || [])
        .map((step) => step?.governance?.result?.decision || "UNKNOWN")
        .join(" -> ")}; authority=` +
      `${authorityDecisions.length > 0 ? authorityDecisions.join(", ") : "n/a"}; forensic_final=` +
      `${result.summary?.finalForensicEntryCount || 0}; fallback_steps=` +
      `${fallbackStepIds.length > 0 ? fallbackStepIds.join(", ") : "none"}`,
  };
}

function buildExecutionReport(fixture, mode, cascade, result) {
  const comparison = cascade
    ? buildCascadeComparison(fixture, result, mode)
    : buildSingleComparison(fixture, result, mode);
  const exitCode = classifyResult(result, comparison, cascade);
  const human = cascade
    ? buildCascadeHumanSummary(result)
    : buildSingleHumanSummary(result);

  return {
    cascade,
    comparison,
    exitClassification: {
      code: exitCode,
      label: EXIT_LABELS[exitCode],
    },
    fixture: {
      category: fixture.scenario.category,
      expectedSummary: fixture.expectedSummary,
      root: path.relative(REPO_ROOT, fixture.root).replace(/\\/g, "/"),
      scenarioId: fixture.scenario.scenarioId,
      scenarioName: fixture.scenario.scenarioName,
    },
    humanSummary: human,
    mode,
    result,
    scenarioKey: fixture.key,
  };
}

function buildOverallExitCode(scenarios) {
  if (scenarios.some((entry) => entry.exitClassification.code === EXIT_CODES.TECHNICAL_FAILURE)) {
    return EXIT_CODES.TECHNICAL_FAILURE;
  }

  if (scenarios.some((entry) => entry.exitClassification.code === EXIT_CODES.UNEXPECTED_HOLD)) {
    return EXIT_CODES.UNEXPECTED_HOLD;
  }

  return EXIT_CODES.MATCHED_EXPECTATIONS;
}

function buildRunnerReport(options) {
  const fixtures = getSelectedScenarioDefinitions(options.scenario).map(
    loadScenarioFixture
  );
  const scenarios = fixtures.map((fixture) =>
    buildExecutionReport(
      fixture,
      options.mode,
      options.cascade,
      executeScenario(fixture, options.mode, options.cascade)
    )
  );
  const exitCode = buildOverallExitCode(scenarios);

  return {
    contractVersion: RUNNER_REPORT_CONTRACT_VERSION,
    runner: {
      cascade: options.cascade,
      mode: options.mode,
      requestedScenario: options.scenario,
      script: "scripts/run-corridor-scenario.js",
    },
    scenarios,
    summary: {
      exitClassification: {
        code: exitCode,
        label: EXIT_LABELS[exitCode],
      },
      matchedExpectationCount: scenarios.filter(
        (entry) =>
          entry.exitClassification.code === EXIT_CODES.MATCHED_EXPECTATIONS
      ).length,
      scenarioCount: scenarios.length,
      technicalFailureCount: scenarios.filter(
        (entry) =>
          entry.exitClassification.code === EXIT_CODES.TECHNICAL_FAILURE
      ).length,
      unexpectedHoldCount: scenarios.filter(
        (entry) =>
          entry.exitClassification.code === EXIT_CODES.UNEXPECTED_HOLD
      ).length,
    },
  };
}

function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) =>
      entry === undefined ? null : sortJsonValue(entry)
    );
  }

  if (isPlainObject(value)) {
    const next = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) {
        continue;
      }

      next[key] = sortJsonValue(value[key]);
    }
    return next;
  }

  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortJsonValue(value), null, 2);
}

function buildHumanOutput(report) {
  const lines = [];

  for (const scenario of report.scenarios) {
    lines.push(
      `Scenario: ${scenario.fixture.scenarioName} (${scenario.scenarioKey})`
    );
    lines.push(`Mode: ${scenario.mode}`);
    lines.push(`Cascade: ${scenario.cascade ? "on" : "off"}`);
    lines.push(`Top-level status: ${scenario.result.status}`);
    lines.push(`Stage statuses: ${scenario.humanSummary.stageSummary}`);
    lines.push(`Expected vs actual: ${scenario.humanSummary.expectedActualSummary}`);
    lines.push(`Key summary: ${scenario.humanSummary.keySummary}`);
    lines.push(
      `Exit classification: ${scenario.exitClassification.code} ${scenario.exitClassification.label}`
    );
    lines.push("");
  }

  lines.push(
    `Overall: scenarios=${report.summary.scenarioCount}, matched=` +
      `${report.summary.matchedExpectationCount}, unexpected_holds=` +
      `${report.summary.unexpectedHoldCount}, technical_failures=` +
      `${report.summary.technicalFailureCount}`
  );
  lines.push(
    `Overall exit classification: ${report.summary.exitClassification.code} ` +
      `${report.summary.exitClassification.label}`
  );

  return `${lines.join("\n").trimEnd()}\n`;
}

function buildErrorReport(error, options = {}) {
  const exitCode = EXIT_CODES.TECHNICAL_FAILURE;

  return {
    contractVersion: RUNNER_REPORT_CONTRACT_VERSION,
    errors: [
      {
        code: "runner_argument_error",
        message: error.message,
      },
    ],
    runner: {
      cascade: options.cascade === true,
      mode: options.mode || null,
      requestedScenario: options.scenario || null,
      script: "scripts/run-corridor-scenario.js",
    },
    scenarios: [],
    summary: {
      exitClassification: {
        code: exitCode,
        label: EXIT_LABELS[exitCode],
      },
      matchedExpectationCount: 0,
      scenarioCount: 0,
      technicalFailureCount: 1,
      unexpectedHoldCount: 0,
    },
  };
}

function usageText() {
  return [
    "Usage:",
    "  node scripts/run-corridor-scenario.js --scenario=routine|contested|emergency|all --mode=replay|live [--cascade] [--json]",
    "",
    "Examples:",
    "  node scripts/run-corridor-scenario.js --scenario=routine --mode=replay",
    "  node scripts/run-corridor-scenario.js --scenario=all --mode=replay --cascade",
    "  node scripts/run-corridor-scenario.js --scenario=contested --mode=replay --cascade --json",
    "  node scripts/run-corridor-scenario.js --scenario=emergency --mode=live --cascade",
  ].join("\n");
}

function main(argv = process.argv.slice(2)) {
  let options;

  try {
    options = parseCliArgs(argv);

    if (options.help) {
      process.stdout.write(`${usageText()}\n`);
      return EXIT_CODES.MATCHED_EXPECTATIONS;
    }

    const report = buildRunnerReport(options);
    const output = options.json
      ? `${stableStringify(report)}\n`
      : buildHumanOutput(report);

    process.stdout.write(output);
    return report.summary.exitClassification.code;
  } catch (error) {
    const optionHints = {
      cascade: argv.includes("--cascade"),
      json: argv.includes("--json"),
      mode: null,
      scenario: null,
    };
    const report = buildErrorReport(error, optionHints);

    if (argv.includes("--json")) {
      process.stdout.write(`${stableStringify(report)}\n`);
    } else {
      process.stdout.write(`${error.message}\n\n${usageText()}\n`);
    }

    return report.summary.exitClassification.code;
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  EXIT_CODES,
  EXIT_LABELS,
  buildErrorReport,
  buildHumanOutput,
  buildRunnerReport,
  classifyResult,
  main,
  parseCliArgs,
  stableStringify,
};
