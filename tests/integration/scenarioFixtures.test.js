const test = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const {
  REQUIRED_SCENARIO_FIXTURE_FILES,
  validateFixtureProvenance,
  validateRequiredScenarioFixtureSetFiles,
  validateScenarioMinimums,
} = require("../../src/integration/contracts.js");

const SCENARIOS = [
  {
    label: "routine",
    directory: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "routine",
      "lancaster-avenue-corridor-reconstruction"
    ),
    requiredEntityTypes: [
      "permit_application",
      "inspection",
      "authority_grant",
      "decision_record",
      "obligation",
      "corridor_zone",
      "organization",
    ],
    requiredActions: [
      "APPROVE",
      "INSPECTION_SCHEDULED",
      "INSPECTION_PASSED",
      "PERMIT_ISSUED",
    ],
    minimumStepCount: 4,
  },
  {
    label: "contested",
    directory: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "contested",
      "hemphill-street-mixed-use-contested-authority"
    ),
    requiredEntityTypes: [
      "authority_grant",
      "organization",
      "decision_record",
      "obligation",
      "incident_observation",
      "corridor_zone",
      "action_request",
    ],
    requiredActions: [
      "DEFER",
      "CONDITION",
      "PHANTOM_AUTHORITY_DETECTED",
      "REVOKE",
      "CONTESTED_AUTHORITY_RESOLVED",
    ],
    minimumStepCount: 5,
  },
  {
    label: "emergency",
    directory: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "emergency",
      "camp-bowie-water-main-break"
    ),
    requiredEntityTypes: [
      "utility_asset",
      "device",
      "critical_site",
      "incident_observation",
      "authority_grant",
      "obligation",
      "corridor_zone",
    ],
    requiredActions: [
      "ESCALATE",
      "EMERGENCY_AUTHORITY_APPROVED",
      "HARD_STOP",
      "REPAIR_COMPLETED",
      "POST_REPAIR_OBLIGATION_CREATED",
    ],
    minimumStepCount: 5,
  },
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readScenarioFixtureSet(root) {
  return {
    fileNames: readdirSync(root),
    scenario: readJson(path.join(root, "scenario.json")),
    beforeState: readJson(path.join(root, "beforeState.json")),
    afterState: readJson(path.join(root, "afterState.json")),
    replayArtifact: readJson(path.join(root, "pipelineReplayOutput.json")),
    expectedMatches: readJson(path.join(root, "expectedMatches.json")),
    resolutionSequence: readJson(path.join(root, "resolutionSequence.json")),
    expectedSummary: readJson(path.join(root, "expectedScenarioSummary.json")),
    provenance: readJson(path.join(root, "fixtureProvenance.json")),
    transcript: readFileSync(path.join(root, "transcript.txt"), "utf8"),
  };
}

test("scenario fixture inventory stays inside the approved packet fence", () => {
  const root = path.join(__dirname, "..", "fixtures", "scenarios");
  const categoryNames = readdirSync(root).sort();

  assert.deepEqual(categoryNames, ["contested", "emergency", "routine"]);
  assert.deepEqual(
    REQUIRED_SCENARIO_FIXTURE_FILES,
    [
      "afterState.json",
      "beforeState.json",
      "expectedMatches.json",
      "expectedScenarioSummary.json",
      "fixtureProvenance.json",
      "pipelineReplayOutput.json",
      "resolutionSequence.json",
      "scenario.json",
      "transcript.txt",
    ]
  );
});

for (const entry of SCENARIOS) {
  test(`${entry.label} fixture includes the full Packet 1 file set`, () => {
    const fixtureSet = readScenarioFixtureSet(entry.directory);
    const validation = validateRequiredScenarioFixtureSetFiles(
      fixtureSet.fileNames
    );

    assert.equal(validation.valid, true, validation.issues.join("\n"));
  });

  test(`${entry.label} fixture provenance is valid and frozen`, () => {
    const fixtureSet = readScenarioFixtureSet(entry.directory);
    const validation = validateFixtureProvenance(fixtureSet.provenance);

    assert.equal(validation.valid, true, validation.issues.join("\n"));
  });

  test(`${entry.label} fixture satisfies minimum entity and cascade requirements`, () => {
    const fixtureSet = readScenarioFixtureSet(entry.directory);
    const validation = validateScenarioMinimums({
      expectedMatches: fixtureSet.expectedMatches,
      resolutionSequence: fixtureSet.resolutionSequence,
      requiredEntityTypes: entry.requiredEntityTypes,
      requiredActions: entry.requiredActions,
      minimumStepCount: entry.minimumStepCount,
    });

    assert.equal(validation.valid, true, validation.issues.join("\n"));
  });

  test(`${entry.label} fixture metadata stays aligned across scenario files`, () => {
    const fixtureSet = readScenarioFixtureSet(entry.directory);
    const { scenario } = fixtureSet;

    assert.equal(fixtureSet.beforeState.scenarioId, scenario.scenarioId);
    assert.equal(fixtureSet.afterState.scenarioId, scenario.scenarioId);
    assert.equal(fixtureSet.expectedMatches.scenarioId, scenario.scenarioId);
    assert.equal(fixtureSet.resolutionSequence.scenarioId, scenario.scenarioId);
    assert.equal(fixtureSet.expectedSummary.scenarioId, scenario.scenarioId);
    assert.equal(fixtureSet.replayArtifact.scenario_id, scenario.scenarioId);
    assert.equal(fixtureSet.beforeState.corridorId, scenario.corridorId);
    assert.equal(fixtureSet.afterState.corridorId, scenario.corridorId);
    assert.equal(fixtureSet.expectedSummary.corridorId, scenario.corridorId);
    assert.equal(fixtureSet.transcript.includes(scenario.scenarioName.split(" ")[0]), true);
  });
}
