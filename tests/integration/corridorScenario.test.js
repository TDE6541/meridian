const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { runCorridorScenario } = require("../../src/integration/corridorScenario.js");

const FIXED_EVALUATED_AT = "2026-04-21T12:00:00.000Z";
const TEMP_ROOT = path.join(process.cwd(), ".tmp");

const SCENARIOS = [
  {
    label: "routine",
    scenarioId: "routine-lancaster-avenue-corridor-reconstruction",
    corridorId: "corridor-fw-lancaster-avenue",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "routine",
      "lancaster-avenue-corridor-reconstruction"
    ),
    variantName: "inspection-resolution-pass",
    expectedDecision: "ALLOW",
    expectedAuthorityStatus: "SKIPPED",
    expectedAuthorityRelevant: false,
    expectedForensicEntryCount: 1,
    expectedClauseText: "the inspection pass",
  },
  {
    label: "contested",
    scenarioId: "contested-hemphill-street-mixed-use-contested-authority",
    corridorId: "corridor-fw-hemphill-street",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "contested",
      "hemphill-street-mixed-use-contested-authority"
    ),
    variantName: "conditioned-authority-hold",
    expectedDecision: "HOLD",
    expectedAuthorityStatus: "HOLD",
    expectedAuthorityRelevant: true,
    expectedForensicEntryCount: 2,
    expectedClauseText: "a signed corridor operations grant",
  },
  {
    label: "emergency",
    scenarioId: "emergency-camp-bowie-water-main-break",
    corridorId: "corridor-fw-camp-bowie",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "emergency",
      "camp-bowie-water-main-break"
    ),
    variantName: "post-repair-follow-up-hold",
    expectedDecision: "HOLD",
    expectedAuthorityStatus: "SKIPPED",
    expectedAuthorityRelevant: false,
    expectedForensicEntryCount: 1,
    expectedClauseText: "carry forward the post-repair restoration obligation",
  },
];

const FROZEN_PACKET_INPUTS = [
  path.join(process.cwd(), "src", "integration", "contracts.js"),
  path.join(process.cwd(), "src", "integration", "pipelineBridge.js"),
  path.join(process.cwd(), "src", "integration", "matchingEngine.js"),
  path.join(process.cwd(), "tests", "integration", "scenarioFixtures.test.js"),
  path.join(process.cwd(), "tests", "integration", "pipelineBridge.test.js"),
  path.join(process.cwd(), "tests", "integration", "matchingEngine.test.js"),
];

function hashFile(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function hashFiles(filePaths) {
  return new Map(filePaths.map((filePath) => [filePath, hashFile(filePath)]));
}

function listScenarioFixtureFiles() {
  const root = path.join(process.cwd(), "tests", "fixtures", "scenarios");
  return fs
    .readdirSync(root, { recursive: true })
    .filter((entry) => typeof entry === "string")
    .map((entry) => path.join(root, entry))
    .filter((entry) => fs.statSync(entry).isFile())
    .sort();
}

function runScenario(entry, extra = {}) {
  return runCorridorScenario({
    scenarioId: entry.scenarioId,
    corridorId: entry.corridorId,
    fixtureRoot: entry.root,
    mode: "REPLAY",
    evaluatedAt: FIXED_EVALUATED_AT,
    ...extra,
  });
}

function assertCompleteResultShape(result) {
  const requiredTopLevelFields = [
    "contractVersion",
    "scenarioId",
    "corridorId",
    "variantName",
    "mode",
    "status",
    "stageStatus",
    "pipeline",
    "matching",
    "governance",
    "authority",
    "forensic",
    "skins",
    "holds",
    "errors",
    "provenance",
    "artifacts",
    "truthFingerprints",
    "summary",
  ];

  for (const field of requiredTopLevelFields) {
    assert.ok(Object.hasOwn(result, field), `missing ${field}`);
  }
}

function assertStageSectionsPresent(result) {
  assert.deepEqual(Object.keys(result.stageStatus).sort(), [
    "authority",
    "forensic",
    "governance",
    "matching",
    "pipeline",
    "skins",
  ]);

  for (const [stageName, stageValue] of Object.entries(result.stageStatus)) {
    assert.equal(typeof stageValue, "object", `${stageName} stageStatus missing object`);
    assert.equal(typeof stageValue.status, "string", `${stageName} stageStatus missing status`);
    assert.equal(typeof stageValue.reason, "string", `${stageName} stageStatus missing reason`);
    assert.equal(typeof result[stageName], "object", `${stageName} section missing object`);
    assert.equal(typeof result[stageName].status, "string", `${stageName} section missing status`);
    assert.equal(typeof result[stageName].reason, "string", `${stageName} section missing reason`);
  }
}

function assertTruthFingerprintParity(result) {
  assert.deepEqual(Object.keys(result.truthFingerprints).sort(), [
    "council",
    "dispatch",
    "operations",
    "permitting",
    "public",
  ]);

  const digests = Object.values(result.truthFingerprints).map(
    (entry) => entry.digest
  );
  assert.equal(digests.every((digest) => typeof digest === "string" && digest.length > 0), true);
  assert.equal(new Set(digests).size, 1);
  assert.equal(result.skins.parityHolds, true);
  assert.equal(result.summary.skinParityHolds, true);
}

for (const entry of SCENARIOS) {
  test(`${entry.label} replay returns a complete ScenarioResultV1`, () => {
    const result = runScenario(entry);

    assertCompleteResultShape(result);
    assert.equal(result.contractVersion, "wave8.scenarioResult.v1");
    assert.equal(result.scenarioId, entry.scenarioId);
    assert.equal(result.corridorId, entry.corridorId);
    assert.equal(result.variantName, entry.variantName);
    assert.equal(result.mode, "REPLAY");
  });

  test(`${entry.label} replay resolves top-level PASS without crashing`, () => {
    const result = runScenario(entry);

    assert.equal(result.status, "PASS");
    assert.deepEqual(result.errors, []);
    assert.equal(Array.isArray(result.holds), true);
  });

  test(`${entry.label} replay exposes all stage sections with explicit status`, () => {
    const result = runScenario(entry);

    assertStageSectionsPresent(result);
    assert.equal(result.stageStatus.pipeline.status, "PASS");
    assert.equal(result.stageStatus.matching.status, "PASS");
    assert.equal(result.stageStatus.forensic.status, "PASS");
    assert.equal(result.stageStatus.skins.status, "PASS");
  });

  test(`${entry.label} replay populates truth fingerprints for all five skins`, () => {
    const result = runScenario(entry);

    assertTruthFingerprintParity(result);
  });

  test(`${entry.label} replay renders all five skins without fallback`, () => {
    const result = runScenario(entry);

    assert.deepEqual(result.skins.renderedSkinIds, [
      "permitting",
      "council",
      "operations",
      "dispatch",
      "public",
    ]);
    assert.deepEqual(result.skins.fallbackSkinIds, []);
    for (const output of Object.values(result.skins.outputs)) {
      assert.equal(output.fallback.active, false);
    }
  });

  test(`${entry.label} replay aligns the selected variant with the expected governance decision`, () => {
    const result = runScenario(entry);

    assert.equal(result.governance.expectedDecision, entry.expectedDecision);
    assert.equal(result.governance.result.decision, entry.expectedDecision);
    assert.equal(result.governance.matchedExpectedDecision, true);
    assert.equal(result.summary.expectedDecision, entry.expectedDecision);
    assert.equal(result.summary.actualDecision, entry.expectedDecision);
    assert.equal(result.summary.expectedDecisionMatched, true);
    assert.equal(result.summary.selectedClauseText, entry.expectedClauseText);
  });

  test(`${entry.label} replay records the expected forensic entry count`, () => {
    const result = runScenario(entry);

    assert.equal(result.forensic.entryRefs.length, entry.expectedForensicEntryCount);
    assert.equal(result.forensic.entries.length, entry.expectedForensicEntryCount);
    assert.equal(result.forensic.expectedEntryCount, entry.expectedForensicEntryCount);
  });
}

test("routine replay skips authority explicitly for a non-authority match", () => {
  const result = runScenario(SCENARIOS[0]);

  assert.equal(result.authority.relevant, false);
  assert.equal(result.authority.status, "SKIPPED");
  assert.equal(result.authority.reason, "selected_match_not_authority_bound");
  assert.equal(result.summary.selectedMatchTouchesAuthority, false);
});

test("contested replay activates authority only when the selected match touches authority", () => {
  const result = runScenario(SCENARIOS[1]);

  assert.equal(result.authority.relevant, true);
  assert.equal(result.authority.status, "HOLD");
  assert.equal(result.authority.resolution.active, true);
  assert.equal(result.authority.resolution.decision, "HOLD");
  assert.equal(result.authority.resolution.actor.decision, "HOLD");
  assert.equal(result.summary.selectedMatchTouchesAuthority, true);
});

test("emergency replay skips authority explicitly for a non-authority follow-up match", () => {
  const result = runScenario(SCENARIOS[2]);

  assert.equal(result.authority.relevant, false);
  assert.equal(result.authority.status, "SKIPPED");
  assert.equal(result.summary.selectedMatchTouchesAuthority, false);
});

test("emergency replay still returns top-level PASS when the expected variant outcome is HOLD", () => {
  const result = runScenario(SCENARIOS[2]);

  assert.equal(result.governance.result.decision, "HOLD");
  assert.equal(result.governance.status, "HOLD");
  assert.equal(result.status, "PASS");
});

test("contested replay writes both governance and authority forensic entries", () => {
  const result = runScenario(SCENARIOS[1]);
  const entryTypes = result.forensic.entries.map((entry) => entry.entry_type);

  assert.deepEqual(entryTypes, ["GOVERNANCE_DECISION", "AUTHORITY_EVALUATION"]);
});

test("routine replay writes governance-only forensic evidence when authority is skipped", () => {
  const result = runScenario(SCENARIOS[0]);
  const entryTypes = result.forensic.entries.map((entry) => entry.entry_type);

  assert.deepEqual(entryTypes, ["GOVERNANCE_DECISION"]);
});

test("supplying an outputDirectory persists the forensic chain into a temp-controlled location", () => {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(TEMP_ROOT, "wave8-p3-chain-"));

  try {
    const result = runScenario(SCENARIOS[1], {
      outputDirectory: tempDir,
    });

    assert.equal(typeof result.forensic.persistedPath, "string");
    assert.equal(result.forensic.persistedPath.startsWith(tempDir), true);
    assert.equal(fs.existsSync(result.forensic.persistedPath), true);
    assert.equal(
      JSON.parse(fs.readFileSync(result.forensic.persistedPath, "utf8")).version,
      "wave6-packet1-civic-forensic-chain-v1"
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("missing replay artifacts return FAIL with downstream stages explicitly skipped", () => {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(TEMP_ROOT, "wave8-p3-bad-fixture-"));

  try {
    const sourceRoot = SCENARIOS[0].root;
    fs.cpSync(sourceRoot, tempDir, { recursive: true });
    fs.rmSync(path.join(tempDir, "pipelineReplayOutput.json"), { force: true });

    const result = runCorridorScenario({
      scenarioId: SCENARIOS[0].scenarioId,
      corridorId: SCENARIOS[0].corridorId,
      fixtureRoot: tempDir,
      mode: "REPLAY",
      evaluatedAt: FIXED_EVALUATED_AT,
    });

    assert.equal(result.status, "FAIL");
    assert.equal(result.stageStatus.pipeline.status, "FAIL");
    assert.equal(result.pipeline.errors[0].code, "scenario_fixture_invalid");
    assert.equal(result.stageStatus.matching.status, "SKIPPED");
    assert.equal(result.stageStatus.governance.status, "SKIPPED");
    assert.equal(result.stageStatus.authority.status, "SKIPPED");
    assert.equal(result.stageStatus.forensic.status, "SKIPPED");
    assert.equal(result.stageStatus.skins.status, "SKIPPED");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("frozen Packet 1 and Packet 2 integration files remain hash-stable across orchestrator runs", () => {
  const before = hashFiles(FROZEN_PACKET_INPUTS);

  for (const entry of SCENARIOS) {
    runScenario(entry);
  }

  const after = hashFiles(FROZEN_PACKET_INPUTS);
  assert.deepEqual(after, before);
});

test("frozen scenario fixture files remain hash-stable across orchestrator runs", () => {
  const fixtureFiles = listScenarioFixtureFiles();
  const before = hashFiles(fixtureFiles);

  for (const entry of SCENARIOS) {
    runScenario(entry);
  }

  const after = hashFiles(fixtureFiles);
  assert.deepEqual(after, before);
});
