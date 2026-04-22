const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { runResolutionCascade } = require("../../src/integration/resolutionCascade.js");

const FIXED_EVALUATED_AT = "2026-04-21T12:00:00.000Z";
const TEMP_ROOT = path.join(process.cwd(), ".tmp");
const SKIN_IDS = ["permitting", "council", "operations", "dispatch", "public"];
const SORTED_SKIN_IDS = [...SKIN_IDS].sort();

const SCENARIOS = [
  {
    label: "routine",
    scenarioId: "routine-lancaster-avenue-corridor-reconstruction",
    corridorId: "corridor-fw-lancaster-avenue",
    fixtureRoot: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "routine",
      "lancaster-avenue-corridor-reconstruction"
    ),
    minimumSteps: 4,
    expectedStatus: "PASS",
    expectedDecisionSequence: ["SUPERVISE", "HOLD", "ALLOW", "SUPERVISE"],
    expectedForensicCounts: [1, 2, 3, 4],
    expectedFallbackStepIds: [],
  },
  {
    label: "contested",
    scenarioId: "contested-hemphill-street-mixed-use-contested-authority",
    corridorId: "corridor-fw-hemphill-street",
    fixtureRoot: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "contested",
      "hemphill-street-mixed-use-contested-authority"
    ),
    minimumSteps: 5,
    expectedStatus: "PASS",
    expectedDecisionSequence: ["HOLD", "HOLD", "HOLD", "REVOKE", "SUPERVISE"],
    expectedForensicCounts: [1, 3, 5, 7, 9],
    expectedFallbackStepIds: ["C3", "C4", "C5"],
  },
  {
    label: "emergency",
    scenarioId: "emergency-camp-bowie-water-main-break",
    corridorId: "corridor-fw-camp-bowie",
    fixtureRoot: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "emergency",
      "camp-bowie-water-main-break"
    ),
    minimumSteps: 5,
    expectedStatus: "PASS",
    expectedDecisionSequence: ["HOLD", "ALLOW", "BLOCK", "ALLOW", "HOLD"],
    expectedForensicCounts: [1, 3, 4, 5, 6],
    expectedFallbackStepIds: ["E3"],
  },
];

const FROZEN_PACKET_SOURCES = [
  path.join(process.cwd(), "src", "integration", "contracts.js"),
  path.join(process.cwd(), "src", "integration", "pipelineBridge.js"),
  path.join(process.cwd(), "src", "integration", "matchingEngine.js"),
];

const FROZEN_EXISTING_TESTS = [
  path.join(process.cwd(), "tests", "integration", "scenarioFixtures.test.js"),
  path.join(process.cwd(), "tests", "integration", "pipelineBridge.test.js"),
  path.join(process.cwd(), "tests", "integration", "matchingEngine.test.js"),
  path.join(process.cwd(), "tests", "integration", "corridorScenario.test.js"),
];

const RESULT_CACHE = new Map();
const FIXTURE_CACHE = new Map();

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeStateSnapshot(stateDocument) {
  const entities = Array.isArray(stateDocument?.entities)
    ? stateDocument.entities
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

  return {
    scenarioId: stateDocument?.scenarioId || null,
    corridorId: stateDocument?.corridorId || null,
    entities,
  };
}

function buildStateFingerprint(stateDocument) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizeStateSnapshot(stateDocument)))
    .digest("hex");
}

function hashFile(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function hashFiles(filePaths) {
  return new Map(filePaths.map((filePath) => [filePath, hashFile(filePath)]));
}

function listFilesRecursively(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(absolutePath));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files.sort();
}

function readFixtureSet(entry) {
  if (!FIXTURE_CACHE.has(entry.scenarioId)) {
    FIXTURE_CACHE.set(entry.scenarioId, {
      scenario: readJson(path.join(entry.fixtureRoot, "scenario.json")),
      beforeState: readJson(path.join(entry.fixtureRoot, "beforeState.json")),
      afterState: readJson(path.join(entry.fixtureRoot, "afterState.json")),
      resolutionSequence: readJson(
        path.join(entry.fixtureRoot, "resolutionSequence.json")
      ),
      expectedSummary: readJson(
        path.join(entry.fixtureRoot, "expectedScenarioSummary.json")
      ),
    });
  }

  return deepClone(FIXTURE_CACHE.get(entry.scenarioId));
}

function getScenarioResult(entry) {
  if (!RESULT_CACHE.has(entry.scenarioId)) {
    RESULT_CACHE.set(
      entry.scenarioId,
      runResolutionCascade({
        scenarioId: entry.scenarioId,
        corridorId: entry.corridorId,
        fixtureRoot: entry.fixtureRoot,
        mode: "REPLAY",
        evaluatedAt: FIXED_EVALUATED_AT,
      })
    );
  }

  return deepClone(RESULT_CACHE.get(entry.scenarioId));
}

function runScenarioFresh(entry, extra = {}) {
  return runResolutionCascade({
    scenarioId: entry.scenarioId,
    corridorId: entry.corridorId,
    fixtureRoot: entry.fixtureRoot,
    mode: "REPLAY",
    evaluatedAt: FIXED_EVALUATED_AT,
    ...extra,
  });
}

function collectStateChangingSteps(result) {
  return result.transitionEvidence.steps.filter((step) => step.stateChanged === true);
}

function collectFallbackStepIds(result) {
  return result.steps
    .map((step, index) =>
      Array.isArray(step.skins?.fallbackSkinIds) &&
      step.skins.fallbackSkinIds.length > 0
        ? result.transitionEvidence.steps[index]?.stepId || null
        : null
    )
    .filter(Boolean);
}

function assertStageSectionsPresent(stepResult) {
  assert.deepEqual(Object.keys(stepResult.stageStatus).sort(), [
    "authority",
    "forensic",
    "governance",
    "matching",
    "pipeline",
    "skins",
  ]);

  for (const [stageName, stageValue] of Object.entries(stepResult.stageStatus)) {
    assert.equal(typeof stageValue, "object", `${stageName} stageStatus missing object`);
    assert.equal(typeof stageValue.status, "string", `${stageName} stageStatus missing status`);
    assert.equal(typeof stageValue.reason, "string", `${stageName} stageStatus missing reason`);
    assert.equal(typeof stepResult[stageName], "object", `${stageName} section missing object`);
    assert.equal(typeof stepResult[stageName].status, "string", `${stageName} section missing status`);
    assert.equal(typeof stepResult[stageName].reason, "string", `${stageName} section missing reason`);
  }
}

function assertScenarioResultShape(result, entry) {
  assert.equal(result.contractVersion, "wave8.cascadeResult.v1");
  assert.equal(result.scenarioId, entry.scenarioId);
  assert.equal(result.corridorId, entry.corridorId);
  assert.equal(result.variantName, "resolution-cascade");
  assert.equal(result.mode, "REPLAY");
  assert.equal(Array.isArray(result.steps), true);
  assert.equal(typeof result.transitionEvidence, "object");
  assert.equal(Array.isArray(result.transitionEvidence.steps), true);
  assert.equal(Array.isArray(result.holds), true);
  assert.equal(Array.isArray(result.errors), true);
  assert.equal(typeof result.summary, "object");
}

function runAllScenariosFresh() {
  for (const entry of SCENARIOS) {
    runScenarioFresh(entry);
  }
}

for (const entry of SCENARIOS) {
  test(`${entry.label} cascade returns a complete CascadeResultV1`, () => {
    const result = getScenarioResult(entry);
    assertScenarioResultShape(result, entry);
    assert.equal(result.status, entry.expectedStatus);
  });

  test(`${entry.label} cascade preserves the frozen step order and minimum count`, () => {
    const result = getScenarioResult(entry);
    const fixtureSet = readFixtureSet(entry);
    const frozenSteps = fixtureSet.resolutionSequence.steps;

    assert.equal(result.steps.length, entry.minimumSteps);
    assert.equal(result.steps.length, frozenSteps.length);
    assert.deepEqual(
      result.transitionEvidence.steps.map((step) => step.stepId),
      frozenSteps.map((step) => step.stepId)
    );
    assert.deepEqual(
      result.transitionEvidence.steps.map((step) => step.action),
      frozenSteps.map((step) => step.action)
    );
  });

  test(`${entry.label} cascade keeps each step as a full ScenarioResultV1`, () => {
    const result = getScenarioResult(entry);

    for (const stepResult of result.steps) {
      assert.equal(stepResult.contractVersion, "wave8.scenarioResult.v1");
      assert.equal(typeof stepResult.variantName, "string");
      assert.equal(typeof stepResult.governance.matchedExpectedDecision, "boolean");
      assertStageSectionsPresent(stepResult);
    }
  });

  test(`${entry.label} transition evidence links fixture before-state through every step`, () => {
    const result = getScenarioResult(entry);
    const fixtureSet = readFixtureSet(entry);
    const expectedBeforeFingerprint = buildStateFingerprint(fixtureSet.beforeState);
    const evidenceSteps = result.transitionEvidence.steps;

    assert.equal(evidenceSteps[0].beforeStateFingerprint, expectedBeforeFingerprint);

    for (let index = 1; index < evidenceSteps.length; index += 1) {
      assert.equal(
        evidenceSteps[index].previousStepId,
        evidenceSteps[index - 1].stepId
      );
      assert.equal(
        evidenceSteps[index].beforeStateFingerprint,
        evidenceSteps[index - 1].afterStateFingerprint
      );
    }
  });

  test(`${entry.label} final transition state matches the frozen after-state`, () => {
    const result = getScenarioResult(entry);
    const fixtureSet = readFixtureSet(entry);
    const expectedAfterFingerprint = buildStateFingerprint(fixtureSet.afterState);
    const finalStep =
      result.transitionEvidence.steps[result.transitionEvidence.steps.length - 1];

    assert.equal(finalStep.afterStateFingerprint, expectedAfterFingerprint);
  });

  test(`${entry.label} forensic entry counts grow monotonically`, () => {
    const result = getScenarioResult(entry);
    const counts = result.steps.map((step) => step.forensic.entries.length);

    assert.deepEqual(counts, entry.expectedForensicCounts);
    for (let index = 1; index < counts.length; index += 1) {
      assert.equal(counts[index] > counts[index - 1], true);
    }
  });

  test(`${entry.label} truth fingerprints change across consecutive state-changing steps`, () => {
    const result = getScenarioResult(entry);
    const stateChangingSteps = collectStateChangingSteps(result);
    const digests = stateChangingSteps.map((step) => step.truthFingerprintDigest);

    assert.equal(digests.length >= 2, true);
    for (let index = 1; index < digests.length; index += 1) {
      assert.notEqual(digests[index], digests[index - 1]);
    }
  });

  test(`${entry.label} every step re-renders all five skins and preserves per-skin absence evidence`, () => {
    const result = getScenarioResult(entry);

    for (let index = 0; index < result.steps.length; index += 1) {
      const stepResult = result.steps[index];
      const transitionStep = result.transitionEvidence.steps[index];

      assert.deepEqual(stepResult.skins.renderedSkinIds, SKIN_IDS);
      assert.deepEqual(
        Object.keys(stepResult.skins.outputs).sort(),
        SORTED_SKIN_IDS
      );
      assert.deepEqual(
        Object.keys(transitionStep.absenceBySkin).sort(),
        SORTED_SKIN_IDS
      );
    }
  });

  test(`${entry.label} lifecycle regression evidence stays empty across all steps`, () => {
    const result = getScenarioResult(entry);

    for (const transitionStep of result.transitionEvidence.steps) {
      assert.deepEqual(transitionStep.lifecycle.regressions, []);
    }
  });
}

test("routine completes the four-step minimum with the expected governance sequence", () => {
  const entry = SCENARIOS[0];
  const result = getScenarioResult(entry);

  assert.equal(result.status, "PASS");
  assert.deepEqual(
    result.steps.map((step) => step.governance.result.decision),
    entry.expectedDecisionSequence
  );
  assert.equal(result.summary.totalSteps, 4);
  assert.equal(result.summary.finalForensicEntryCount, 4);
});

test("routine keeps all four steps state-changing with no skin fallbacks", () => {
  const entry = SCENARIOS[0];
  const result = getScenarioResult(entry);

  assert.deepEqual(
    result.transitionEvidence.steps.map((step) => step.stateChanged),
    [true, true, true, true]
  );
  assert.deepEqual(collectFallbackStepIds(result), []);
});

test("routine clears the inspection absence once the inspection passes", () => {
  const entry = SCENARIOS[0];
  const result = getScenarioResult(entry);
  const [r1, r2, r3, r4] = result.transitionEvidence.steps;

  assert.deepEqual(r1.absenceBySkin.permitting, []);
  assert.deepEqual(r2.absenceBySkin.permitting, [
    "Missing evidence type: inspection_confirmation.",
  ]);
  assert.deepEqual(r3.absenceBySkin.permitting, []);
  assert.deepEqual(r4.absenceBySkin.permitting, []);
});

test("routine summary stays aligned with the frozen expected final disposition", () => {
  const entry = SCENARIOS[0];
  const result = getScenarioResult(entry);
  const fixtureSet = readFixtureSet(entry);

  assert.equal(result.summary.expectedFinalStatus, fixtureSet.expectedSummary.finalStatus);
  assert.equal(
    result.summary.expectedFinalDisposition,
    fixtureSet.expectedSummary.finalDisposition
  );
});

test("contested completes the five-step minimum with the expected decision sequence", () => {
  const entry = SCENARIOS[1];
  const result = getScenarioResult(entry);

  assert.equal(result.status, "PASS");
  assert.deepEqual(
    result.steps.map((step) => step.governance.result.decision),
    entry.expectedDecisionSequence
  );
  assert.equal(result.summary.totalSteps, 5);
  assert.equal(result.summary.finalForensicEntryCount, 9);
});

test("contested preserves the expected fallback steps while still rendering all skins", () => {
  const entry = SCENARIOS[1];
  const result = getScenarioResult(entry);

  assert.deepEqual(collectFallbackStepIds(result), entry.expectedFallbackStepIds);
});

test("contested exercises the phantom authority detection path at C3", () => {
  const entry = SCENARIOS[1];
  const result = getScenarioResult(entry);
  const c3 = result.steps[2];

  assert.equal(c3.governance.result.reason, "phantom_authority_detected");
  assert.equal(c3.authority.resolution.decision, "ALLOW");
  assert.equal(c3.authority.revocation.provenance_reason, "phantom_authority_detected");
});

test("contested exercises explicit REVOKE at C4 and only there", () => {
  const entry = SCENARIOS[1];
  const result = getScenarioResult(entry);
  const allowedRevocationCounts = result.transitionEvidence.steps.map(
    (step) => step.lifecycle.allowedRevocations.length
  );

  assert.deepEqual(allowedRevocationCounts, [0, 0, 0, 1, 0]);
  assert.equal(result.steps[3].governance.result.decision, "REVOKE");
  assert.equal(result.steps[3].governance.result.reason, "authority_revoked_mid_action");
});

test("contested authority-relevant steps append two forensic entries after the first hold step", () => {
  const entry = SCENARIOS[1];
  const result = getScenarioResult(entry);

  assert.deepEqual(
    result.steps.map((step) => step.forensic.entryRefs.length),
    [1, 2, 2, 2, 2]
  );
  assert.deepEqual(
    result.steps.map((step) => step.forensic.entries.length),
    entry.expectedForensicCounts
  );
});

test("contested absence signatures change as the authority dispute progresses", () => {
  const entry = SCENARIOS[1];
  const result = getScenarioResult(entry);
  const [c1, c2, c3, c4, c5] = result.transitionEvidence.steps;

  assert.notDeepEqual(c1.absenceBySkin.permitting, c2.absenceBySkin.permitting);
  assert.deepEqual(c3.absenceBySkin.permitting, []);
  assert.deepEqual(c4.absenceBySkin.permitting, []);
  assert.deepEqual(c5.absenceBySkin.permitting, []);
  assert.deepEqual(c3.absenceBySkin.public, c4.absenceBySkin.public);
});

test("emergency completes the five-step minimum with the expected decision sequence", () => {
  const entry = SCENARIOS[2];
  const result = getScenarioResult(entry);

  assert.equal(result.status, "PASS");
  assert.deepEqual(
    result.steps.map((step) => step.governance.result.decision),
    entry.expectedDecisionSequence
  );
  assert.equal(result.summary.totalSteps, 5);
  assert.equal(result.summary.finalForensicEntryCount, 6);
});

test("emergency preserves the expected fallback only on the HARD_STOP step", () => {
  const entry = SCENARIOS[2];
  const result = getScenarioResult(entry);

  assert.deepEqual(collectFallbackStepIds(result), entry.expectedFallbackStepIds);
});

test("emergency E2 exercises the emergency authority allow path", () => {
  const entry = SCENARIOS[2];
  const result = getScenarioResult(entry);
  const e2 = result.steps[1];

  assert.equal(e2.governance.result.decision, "ALLOW");
  assert.equal(e2.authority.relevant, true);
  assert.equal(e2.authority.resolution.decision, "ALLOW");
});

test("emergency E3 exercises the expected HARD_STOP / BLOCK path", () => {
  const entry = SCENARIOS[2];
  const result = getScenarioResult(entry);
  const e3 = result.steps[2];
  const e3Transition = result.transitionEvidence.steps[2];

  assert.equal(e3.governance.result.decision, "BLOCK");
  assert.equal(e3.governance.result.reason, "hard_stop_domain_requires_manual_lane");
  assert.equal(e3Transition.stateChanged, false);
});

test("emergency obligation absence signatures change between escalation and follow-up", () => {
  const entry = SCENARIOS[2];
  const result = getScenarioResult(entry);
  const [e1, , e3, , e5] = result.transitionEvidence.steps;

  assert.notDeepEqual(e1.absenceBySkin.permitting, e5.absenceBySkin.permitting);
  assert.deepEqual(e3.absenceBySkin.public, [
    "Public disclosure hold: free-form rationale detail is withheld.",
  ]);
});

test("emergency non-state HARD_STOP still preserves continuity into the repair step", () => {
  const entry = SCENARIOS[2];
  const result = getScenarioResult(entry);
  const [, , e3, e4] = result.transitionEvidence.steps;

  assert.equal(e3.stateChanged, false);
  assert.equal(e4.beforeStateFingerprint, e3.afterStateFingerprint);
});

test("shared forensic persistence stays inside the temp output directory", () => {
  const entry = SCENARIOS[1];
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(TEMP_ROOT, "wave8-p4-chain-"));

  try {
    const result = runScenarioFresh(entry, {
      outputDirectory: tempDir,
    });
    const finalStep = result.steps[result.steps.length - 1];

    assert.equal(typeof finalStep.forensic.persistedPath, "string");
    assert.equal(finalStep.forensic.persistedPath.startsWith(tempDir), true);
    assert.equal(fs.existsSync(finalStep.forensic.persistedPath), true);

    const persisted = readJson(finalStep.forensic.persistedPath);
    assert.equal(persisted.version, "wave6-packet1-civic-forensic-chain-v1");
    assert.equal(persisted.entries.length, 9);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("frozen Packet 1 and Packet 2 integration sources remain hash-stable across cascade runs", () => {
  const before = hashFiles(FROZEN_PACKET_SOURCES);
  runAllScenariosFresh();
  const after = hashFiles(FROZEN_PACKET_SOURCES);

  assert.deepEqual(after, before);
});

test("existing integration tests remain hash-stable across cascade runs", () => {
  const before = hashFiles(FROZEN_EXISTING_TESTS);
  runAllScenariosFresh();
  const after = hashFiles(FROZEN_EXISTING_TESTS);

  assert.deepEqual(after, before);
});

test("frozen scenario fixture files remain hash-stable across cascade runs", () => {
  const fixtureFiles = listFilesRecursively(
    path.join(process.cwd(), "tests", "fixtures", "scenarios")
  );
  const before = hashFiles(fixtureFiles);
  runAllScenariosFresh();
  const after = hashFiles(fixtureFiles);

  assert.deepEqual(after, before);
});

test("blocked governance runtime, forensic, and skin surfaces remain hash-stable across cascade runs", () => {
  const blockedFiles = []
    .concat(listFilesRecursively(path.join(process.cwd(), "src", "governance", "runtime")))
    .concat(listFilesRecursively(path.join(process.cwd(), "src", "governance", "forensic")))
    .concat(listFilesRecursively(path.join(process.cwd(), "src", "skins")));
  const before = hashFiles(blockedFiles);
  runAllScenariosFresh();
  const after = hashFiles(blockedFiles);

  assert.deepEqual(after, before);
});

test("the cascade runner leaves the frozen fixture trees and blocked surfaces read-only", () => {
  const blockedFiles = []
    .concat(FROZEN_PACKET_SOURCES)
    .concat(FROZEN_EXISTING_TESTS)
    .concat(listFilesRecursively(path.join(process.cwd(), "tests", "fixtures", "scenarios")))
    .concat(listFilesRecursively(path.join(process.cwd(), "src", "governance", "runtime")))
    .concat(listFilesRecursively(path.join(process.cwd(), "src", "governance", "forensic")))
    .concat(listFilesRecursively(path.join(process.cwd(), "src", "skins")));
  const before = hashFiles(blockedFiles);
  runAllScenariosFresh();
  const after = hashFiles(blockedFiles);

  assert.deepEqual(after, before);
});
