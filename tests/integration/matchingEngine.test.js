const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  runDeterministicMatching,
} = require("../../src/integration/matchingEngine.js");

const MATCH_TYPES = [
  "CONFIRMATION",
  "CONDITION",
  "RESOLUTION",
  "PROPOSED_CREATION",
  "REJECTION",
  "DEFERRAL",
  "AMENDMENT",
  "UNMATCHED",
];

const CONFIDENCE_TIERS = [
  "EXACT",
  "STRONG",
  "WEAK",
  "AMBIGUOUS",
  "UNMATCHED",
];

const REQUIRED_CONFIDENCE_KEYS = [
  "entityTypeAlignment",
  "corridorAlignment",
  "actionAlignment",
  "explicitReferenceAlignment",
  "tokenOverlap",
  "aliasAlignment",
];

const FIXTURE_SCENARIOS = [
  {
    label: "routine",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "routine",
      "lancaster-avenue-corridor-reconstruction"
    ),
  },
  {
    label: "contested",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "contested",
      "hemphill-street-mixed-use-contested-authority"
    ),
  },
  {
    label: "emergency",
    root: path.join(
      __dirname,
      "..",
      "fixtures",
      "scenarios",
      "emergency",
      "camp-bowie-water-main-break"
    ),
  },
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadFixture(entry) {
  return {
    scenario: readJson(path.join(entry.root, "scenario.json")),
    beforeState: readJson(path.join(entry.root, "beforeState.json")),
    afterState: readJson(path.join(entry.root, "afterState.json")),
    extractionOutput: readJson(path.join(entry.root, "pipelineReplayOutput.json")),
    expectedMatches: readJson(path.join(entry.root, "expectedMatches.json")),
    resolutionSequence: readJson(path.join(entry.root, "resolutionSequence.json")),
  };
}

function runFixtureMatch(entry, extra = {}) {
  const fixture = loadFixture(entry);
  return {
    fixture,
    result: runDeterministicMatching({
      scenarioId: fixture.scenario.scenarioId,
      corridorId: fixture.scenario.corridorId,
      extractionOutput: deepClone(fixture.extractionOutput),
      governanceState: deepClone(fixture.beforeState),
      ...extra,
    }),
  };
}

function findResultByClause(result, clauseText) {
  const found = result.matchResults.find(
    (entry) => entry.sourceExtraction.clauseText === clauseText
  );

  assert.ok(found, `Expected clause result for: ${clauseText}`);
  return found;
}

function getFrozenFixtureResults() {
  return FIXTURE_SCENARIOS.map((entry) => runFixtureMatch(entry));
}

function collectFrozenMatchResults() {
  return getFrozenFixtureResults().flatMap((entry) => entry.result.matchResults);
}

for (const entry of FIXTURE_SCENARIOS) {
  test(`${entry.label} fixture matching runs and returns the top-level Packet 2 shape`, () => {
    const { fixture, result } = runFixtureMatch(entry);

    assert.equal(result.scenarioId, fixture.scenario.scenarioId);
    assert.equal(result.corridorId, fixture.scenario.corridorId);
    assert.equal(Array.isArray(result.matchResults), true);
    assert.equal(Array.isArray(result.unmatchedExtractions), true);
    assert.equal(Array.isArray(result.unmatchedGovernanceItems), true);
    assert.equal(typeof result.matchSummary, "object");
  });

  test(`${entry.label} fixture matching is deterministic on repeated runs`, () => {
    const first = runFixtureMatch(entry).result;
    const second = runFixtureMatch(entry).result;

    assert.deepEqual(second, first);
  });
}

test("every frozen match result uses the local MatchResultV1 contract version", () => {
  const results = collectFrozenMatchResults();
  assert.equal(results.length > 0, true);
  for (const result of results) {
    assert.equal(result.contractVersion, "wave8.matchResult.v1");
  }
});

test("every frozen match result exposes the required confidenceEvidence keys", () => {
  const results = collectFrozenMatchResults();
  for (const result of results) {
    assert.deepEqual(
      Object.keys(result.confidenceEvidence).sort(),
      [...REQUIRED_CONFIDENCE_KEYS].sort()
    );
  }
});

test("every frozen match result includes the required Packet 2 minimum fields", () => {
  const results = collectFrozenMatchResults();
  const requiredFields = [
    "contractVersion",
    "matchId",
    "scenarioId",
    "corridorId",
    "matchType",
    "confidenceTier",
    "confidenceEvidence",
    "sourceExtraction",
    "targetGovernanceItem",
    "proposedAction",
    "proposedStateTransition",
    "holds",
    "evidenceRefs",
  ];

  for (const result of results) {
    for (const field of requiredFields) {
      assert.ok(Object.hasOwn(result, field), `missing ${field}`);
    }
  }
});

test("matchSummary exposes the full match taxonomy and confidence tier vocabulary", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[0]);

  assert.deepEqual(
    Object.keys(result.matchSummary.byMatchType).sort(),
    [...MATCH_TYPES].sort()
  );
  assert.deepEqual(
    Object.keys(result.matchSummary.byConfidenceTier).sort(),
    [...CONFIDENCE_TIERS].sort()
  );
});

for (const matchType of MATCH_TYPES) {
  test(`frozen fixture execution exercises ${matchType}`, () => {
    const results = collectFrozenMatchResults();
    assert.equal(
      results.some((entry) => entry.matchType === matchType),
      true
    );
  });
}

test("routine fixture schedule clause produces AMENDMENT on the inspection record", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const match = findResultByClause(result, "schedule the corridor inspection");

  assert.equal(match.matchType, "AMENDMENT");
  assert.equal(match.targetGovernanceItem.entityType, "inspection");
  assert.equal(match.targetGovernanceItem.entityId, "inspection:lancaster-site-visit-001");
  assert.equal(match.confidenceTier, "STRONG");
});

test("routine fixture permit clause produces RESOLUTION on the permit application", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const match = findResultByClause(result, "Issue the permit");

  assert.equal(match.matchType, "RESOLUTION");
  assert.equal(match.targetGovernanceItem.entityType, "permit_application");
  assert.equal(match.targetGovernanceItem.entityId, "permit:lancaster-reconstruction-001");
  assert.equal(match.proposedStateTransition.toStatus, "ISSUED");
});

test("routine fixture notice clause produces CONFIRMATION on the notice obligation", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const match = findResultByClause(result, "keep the notice obligation active");

  assert.equal(match.matchType, "CONFIRMATION");
  assert.equal(match.targetGovernanceItem.entityType, "obligation");
  assert.equal(match.targetGovernanceItem.entityId, "obligation:lancaster-public-notice");
  assert.equal(match.confidenceTier, "STRONG");
});

test("contested fixture defer clause produces DEFERRAL on the action request", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[1]);
  const match = findResultByClause(result, "Defer action");

  assert.equal(match.matchType, "DEFERRAL");
  assert.equal(match.targetGovernanceItem.entityType, "action_request");
  assert.equal(match.targetGovernanceItem.entityId, "action-request:hemphill-lane-closure-001");
  assert.equal(match.confidenceTier, "STRONG");
});

test("contested fixture condition clause produces CONDITION on the action request", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[1]);
  const match = findResultByClause(result, "Condition approval");

  assert.equal(match.matchType, "CONDITION");
  assert.equal(match.targetGovernanceItem.entityType, "action_request");
  assert.equal(match.targetGovernanceItem.entityId, "action-request:hemphill-lane-closure-001");
});

test("contested fixture signed grant clause produces PROPOSED_CREATION for an authority_grant", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[1]);
  const match = findResultByClause(result, "a signed corridor operations grant");

  assert.equal(match.matchType, "PROPOSED_CREATION");
  assert.equal(match.targetGovernanceItem.entityType, "authority_grant");
  assert.equal(match.targetGovernanceItem.entityId, null);
  assert.equal(match.confidenceTier, "STRONG");
});

test("contested fixture phantom memo clause produces REJECTION on the legacy authority grant", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[1]);
  const match = findResultByClause(result, "Revoke the phantom memo path");

  assert.equal(match.matchType, "REJECTION");
  assert.equal(match.targetGovernanceItem.entityType, "authority_grant");
  assert.equal(match.targetGovernanceItem.entityId, "authority:hemphill-legacy-memo");
});

test("contested fixture resolve clause stays UNMATCHED when the candidate set is ambiguous", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[1]);
  const match = findResultByClause(
    result,
    "resolve the corridor authority with conditions"
  );

  assert.equal(match.matchType, "UNMATCHED");
  assert.equal(match.confidenceTier, "AMBIGUOUS");
  assert.deepEqual(match.holds, [{ code: "AMBIGUOUS_CANDIDATES" }]);
});

test("emergency fixture protection clause produces CONFIRMATION on the critical site", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[2]);
  const match = findResultByClause(result, "protect the critical site");

  assert.equal(match.matchType, "CONFIRMATION");
  assert.equal(match.targetGovernanceItem.entityType, "critical_site");
  assert.equal(match.targetGovernanceItem.entityId, "critical-site:camp-bowie-clinic");
});

test("emergency fixture repair clause produces RESOLUTION on the utility asset", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[2]);
  const match = findResultByClause(result, "Complete the repair");

  assert.equal(match.matchType, "RESOLUTION");
  assert.equal(match.targetGovernanceItem.entityType, "utility_asset");
  assert.equal(match.targetGovernanceItem.entityId, "utility-asset:camp-bowie-water-main-77");
  assert.equal(match.proposedStateTransition.toStatus, "REPAIRED");
});

test("emergency fixture restoration clause produces PROPOSED_CREATION for a follow-up obligation", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[2]);
  const match = findResultByClause(
    result,
    "carry forward the post-repair restoration obligation"
  );

  assert.equal(match.matchType, "PROPOSED_CREATION");
  assert.equal(match.targetGovernanceItem.entityType, "obligation");
  assert.equal(match.targetGovernanceItem.entityId, null);
});

test("routine fixture absence detection carries forward the unmatched pending authority grant", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[0]);

  assert.equal(
    result.unmatchedGovernanceItems.some(
      (entry) =>
        entry.entityId === "authority:lancaster-lane-occupation" &&
        entry.status === "PENDING"
    ),
    true
  );
});

test("contested fixture absence detection carries forward the unmatched legal confirmation obligation", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[1]);

  assert.equal(
    result.unmatchedGovernanceItems.some(
      (entry) =>
        entry.entityId === "obligation:hemphill-legal-confirmation" &&
        entry.status === "OPEN"
    ),
    true
  );
});

test("emergency fixture absence detection carries forward the unmatched after-action obligation", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[2]);

  assert.equal(
    result.unmatchedGovernanceItems.some(
      (entry) =>
        entry.entityId === "obligation:camp-bowie-after-action" &&
        entry.status === "OPEN"
    ),
    true
  );
});

test("absence detection respects an explicit open-status allowlist", () => {
  const { fixture, result } = runFixtureMatch(FIXTURE_SCENARIOS[0], {
    config: {
      openStatuses: ["PENDING"],
    },
  });

  assert.equal(result.unmatchedGovernanceItems.length, 1);
  assert.equal(result.unmatchedGovernanceItems[0].entityId, "authority:lancaster-lane-occupation");
  assert.equal(result.unmatchedGovernanceItems[0].scenarioId, fixture.scenario.scenarioId);
});

test("frozen fixture execution produces STRONG confidence results", () => {
  const results = collectFrozenMatchResults();
  assert.equal(results.some((entry) => entry.confidenceTier === "STRONG"), true);
});

test("frozen fixture execution produces WEAK confidence results", () => {
  const results = collectFrozenMatchResults();
  assert.equal(results.some((entry) => entry.confidenceTier === "WEAK"), true);
});

test("frozen fixture execution produces AMBIGUOUS confidence results", () => {
  const results = collectFrozenMatchResults();
  assert.equal(results.some((entry) => entry.confidenceTier === "AMBIGUOUS"), true);
});

test("synthetic exact entity-id evidence produces EXACT confidence", () => {
  const { fixture } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const result = runDeterministicMatching({
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    extractionOutput: {
      extracted_items: [
        {
          capture_item_id: "synthetic:exact",
          item_kind: "directive",
          summary: "Issue permit:lancaster-reconstruction-001 now.",
          lineage: {
            segment_id: "SX",
            transcript_hash: "synthetic-hash",
          },
        },
      ],
    },
    governanceState: fixture.beforeState,
  });

  assert.equal(result.matchResults.length, 1);
  assert.equal(result.matchResults[0].confidenceTier, "EXACT");
  assert.equal(
    result.matchResults[0].targetGovernanceItem.entityId,
    "permit:lancaster-reconstruction-001"
  );
});

test("synthetic unsupported extraction produces UNMATCHED confidence", () => {
  const { fixture } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const result = runDeterministicMatching({
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    extractionOutput: {
      extracted_items: [
        {
          capture_item_id: "synthetic:none",
          item_kind: "directive",
          summary: "Celebrate the ribbon cutting.",
          lineage: {},
        },
      ],
    },
    governanceState: fixture.beforeState,
  });

  assert.equal(result.matchResults[0].matchType, "UNMATCHED");
  assert.equal(result.matchResults[0].confidenceTier, "UNMATCHED");
});

test("ambiguous competing candidates produce UNMATCHED instead of a forced best match", () => {
  const { fixture } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const ambiguousState = deepClone(fixture.beforeState);
  ambiguousState.entities.push({
    entityType: "inspection",
    entityId: "inspection:lancaster-site-visit-002",
    status: "UNSCHEDULED",
  });

  const result = runDeterministicMatching({
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    extractionOutput: {
      extracted_items: [
        {
          capture_item_id: "synthetic:ambiguous",
          item_kind: "directive",
          summary: "schedule the inspection",
          lineage: {},
        },
      ],
    },
    governanceState: ambiguousState,
  });

  assert.equal(result.matchResults.length, 1);
  assert.equal(result.matchResults[0].matchType, "UNMATCHED");
  assert.equal(result.matchResults[0].confidenceTier, "AMBIGUOUS");
  assert.deepEqual(result.matchResults[0].holds, [{ code: "AMBIGUOUS_CANDIDATES" }]);
});

test("multi-match only occurs when one extraction contains independent explicit evidence", () => {
  const { result } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const matchesFromSingleExtraction = result.matchResults.filter(
    (entry) => entry.sourceExtraction.captureItemId === "directive:S2:1"
  );

  assert.equal(matchesFromSingleExtraction.length, 3);
  assert.deepEqual(
    matchesFromSingleExtraction.map((entry) => entry.sourceExtraction.clauseText),
    [
      "Issue the permit",
      "the inspection pass",
      "keep the notice obligation active",
    ]
  );
});

test("generic evidence does not fan out into multiple confident matches", () => {
  const { fixture } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const ambiguousState = deepClone(fixture.beforeState);
  ambiguousState.entities.push({
    entityType: "obligation",
    entityId: "obligation:lancaster-second-notice",
    status: "OPEN",
  });

  const result = runDeterministicMatching({
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    extractionOutput: {
      extracted_items: [
        {
          capture_item_id: "synthetic:generic-obligation",
          item_kind: "directive",
          summary: "keep the obligation active",
          lineage: {},
        },
      ],
    },
    governanceState: ambiguousState,
  });

  assert.equal(result.matchResults.length, 1);
  assert.equal(result.matchResults[0].matchType, "UNMATCHED");
  assert.equal(result.unmatchedExtractions.length, 1);
});

test("out-of-scope corridor references become UNMATCHED with OUT_OF_SCOPE_CORRIDOR", () => {
  const { fixture } = runFixtureMatch(FIXTURE_SCENARIOS[0]);
  const result = runDeterministicMatching({
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    extractionOutput: {
      extracted_items: [
        {
          capture_item_id: "synthetic:out-of-scope",
          item_kind: "directive",
          summary: "schedule the inspection for corridor-fw-camp-bowie",
          lineage: {},
        },
      ],
    },
    governanceState: fixture.beforeState,
  });

  assert.equal(result.matchResults.length, 1);
  assert.equal(result.matchResults[0].matchType, "UNMATCHED");
  assert.equal(result.matchResults[0].confidenceTier, "UNMATCHED");
  assert.deepEqual(result.matchResults[0].holds, [{ code: "OUT_OF_SCOPE_CORRIDOR" }]);
  assert.equal(
    result.matchResults[0].confidenceEvidence.corridorAlignment.outOfScope,
    true
  );
});

test("alias tables are optional and omitting them stays safe and deterministic", () => {
  const { fixture } = runFixtureMatch(FIXTURE_SCENARIOS[2]);
  const withoutAliases = runDeterministicMatching({
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    extractionOutput: fixture.extractionOutput,
    governanceState: fixture.beforeState,
  });
  const emptyAliases = runDeterministicMatching({
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    extractionOutput: fixture.extractionOutput,
    governanceState: fixture.beforeState,
    aliasTables: {},
  });

  assert.deepEqual(emptyAliases, withoutAliases);
});

test("configured alias tables can support a weak deterministic match without fixture edits", () => {
  const { fixture } = runFixtureMatch(FIXTURE_SCENARIOS[2]);
  const result = runDeterministicMatching({
    scenarioId: fixture.scenario.scenarioId,
    corridorId: fixture.scenario.corridorId,
    extractionOutput: {
      extracted_items: [
        {
          capture_item_id: "synthetic:alias",
          item_kind: "directive",
          summary: "protect the medical campus",
          lineage: {},
        },
      ],
    },
    governanceState: fixture.beforeState,
    aliasTables: {
      entities: {
        "medical campus": "critical-site:camp-bowie-clinic",
      },
    },
  });

  assert.equal(result.matchResults.length, 1);
  assert.equal(result.matchResults[0].matchType, "CONFIRMATION");
  assert.equal(
    result.matchResults[0].targetGovernanceItem.entityId,
    "critical-site:camp-bowie-clinic"
  );
  assert.equal(result.matchResults[0].confidenceTier, "WEAK");
});

test("matchingEngine source stays free of LLM, embedding, and network surface references", () => {
  const source = readFileSync(
    path.join(__dirname, "..", "..", "src", "integration", "matchingEngine.js"),
    "utf8"
  );

  assert.equal(/\bopenai\b/i.test(source), false);
  assert.equal(/\bembedding\b/i.test(source), false);
  assert.equal(/\bvector\b/i.test(source), false);
  assert.equal(/\bsemantic\b/i.test(source), false);
  assert.equal(/\baxios\b/i.test(source), false);
  assert.equal(/fetch\s*\(/i.test(source), false);
  assert.equal(/node:(http|https|net|dns)/i.test(source), false);
});
