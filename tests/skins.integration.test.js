const test = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const {
  evaluateGovernanceRequest,
  runGovernanceSweep,
} = require("../src/governance/runtime");
const {
  buildCivicSkinInput,
  buildTruthFingerprint,
  renderDefaultSkin,
  renderSkin,
} = require("../src/skins");
const { councilSkinDescriptor } = require("../src/skins/civic/council");
const { operationsSkinDescriptor } = require("../src/skins/civic/operations");
const { dispatchSkinDescriptor } = require("../src/skins/civic/dispatch");
const { renderPublicSkin } = require("../src/skins/civic/public");
const { isApprovedPublicClaimLanguage } = require("../src/skins/redaction");

function clone(value) {
  return structuredClone(value);
}

function buildRuntimeInput(
  evaluation,
  sourceId,
  rawRequest,
  viewType = "governance-decision"
) {
  return buildCivicSkinInput(evaluation, {
    viewType,
    sourceKind: "runtime-evaluation",
    sourceId,
    raw: {
      ...evaluation,
      request: rawRequest,
    },
    metadata: {
      generatedAt: "2026-04-20T00:00:00.000Z",
    },
  });
}

function buildSweepInput(summary, request, evaluatedAt) {
  return buildCivicSkinInput(
    {
      ...summary,
      request,
    },
    {
      viewType: "sweep-result",
      sourceKind: "governance-sweep",
      sourceId: summary.scenarioId,
      metadata: {
        generatedAt: evaluatedAt,
        fixtureName: `${summary.scenarioId}.fixture`,
      },
    }
  );
}

function renderAllFive(input) {
  return {
    permitting: renderDefaultSkin(input),
    council: renderSkin(input, councilSkinDescriptor),
    operations: renderSkin(input, operationsSkinDescriptor),
    dispatch: renderSkin(input, dispatchSkinDescriptor),
    public: renderPublicSkin(input),
  };
}

function collectTextSegments(output) {
  return output.sections
    .flatMap((section) =>
      Array.isArray(section.body)
        ? section.body
        : typeof section.body === "string"
          ? [section.body]
          : []
    )
    .concat(output.claims.map((claim) => claim.text))
    .concat(output.absences.map((absence) => absence.displayText))
    .concat(output.redactions.map((entry) => entry.text))
    .concat(output.fallback.message ? [output.fallback.message] : []);
}

function collectSkinSourceFiles(root) {
  const entries = readdirSync(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSkinSourceFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(absolutePath);
    }
  }

  return files;
}

test("all five skins preserve runtime truth parity while public rendering stays structurally distinct and redacted", () => {
  const refusalBefore = clone(refusalFixture);
  const evaluation = evaluateGovernanceRequest(refusalFixture);
  const evaluationBefore = clone(evaluation);
  const input = buildRuntimeInput(
    evaluation,
    "refusal.commandRequest.json",
    refusalFixture
  );
  const inputBefore = clone(input);
  const outputs = renderAllFive(input);
  const canonicalFingerprint = buildTruthFingerprint(input);
  const digests = Object.values(outputs).map((output) => output.truthFingerprint.digest);
  const sectionSetSignatures = Object.values(outputs).map((output) =>
    [...new Set(output.sections.map((section) => section.id))].sort().join("|")
  );
  const publicOutput = outputs.public;
  const publicRenderedText = collectTextSegments(publicOutput).join(" ");

  assert.equal(new Set(digests).size, 1);
  assert.equal(
    digests.every((digest) => digest === canonicalFingerprint.digest),
    true
  );
  assert.equal(new Set(sectionSetSignatures).size, 5);

  assert.equal(outputs.permitting.audience, "internal");
  assert.equal(outputs.council.audience, "internal");
  assert.equal(outputs.operations.audience, "internal");
  assert.equal(outputs.dispatch.audience, "internal");
  assert.equal(publicOutput.audience, "public");
  assert.equal(
    publicOutput.sections.every((section) => section.id.startsWith("public-")),
    true
  );
  assert.notDeepEqual(
    publicOutput.sections.map((section) => section.id),
    outputs.permitting.sections.map((section) => section.id)
  );

  assert.equal(publicOutput.redactions.length > 0, true);
  assert.deepEqual(
    publicOutput.redactions.map((entry) => entry.path),
    [
      "entity_ref.entity_id",
      "org_id",
      "raw_subject",
      "entity_ref.entity_type",
    ]
  );
  assert.equal(
    publicOutput.redactions.every(
      (entry) =>
        typeof entry.marker === "string" &&
        entry.marker.length > 0 &&
        typeof entry.noticeId === "string" &&
        entry.noticeId.length > 0 &&
        typeof entry.basis === "string" &&
        entry.basis.length > 0 &&
        typeof entry.path === "string" &&
        entry.path.length > 0
    ),
    true
  );
  assert.equal(
    publicRenderedText.includes(refusalFixture.entity_ref.entity_id),
    false
  );
  assert.equal(publicRenderedText.includes(refusalFixture.org_id), false);
  assert.equal(publicRenderedText.includes(refusalFixture.raw_subject), false);
  assert.equal(
    publicRenderedText.includes("entity_ref"),
    false
  );
  assert.equal(publicRenderedText.includes("org_id"), false);
  assert.equal(publicRenderedText.includes("raw_subject"), false);

  const repeatedPublicOutput = renderPublicSkin(input);
  assert.deepEqual(repeatedPublicOutput.redactions, publicOutput.redactions);

  for (const text of collectTextSegments(publicOutput)) {
    assert.equal(isApprovedPublicClaimLanguage(text), true);
  }

  assert.deepEqual(input, inputBefore);
  assert.deepEqual(evaluation, evaluationBefore);
  assert.deepEqual(refusalFixture, refusalBefore);
});

test("supported internal inputs stay internal, non-redacted, and non-fallback across all internal skins", () => {
  const evaluation = evaluateGovernanceRequest(safePassFixture);
  const input = buildRuntimeInput(
    evaluation,
    "safe-pass.commandRequest.json",
    safePassFixture
  );
  const outputs = renderAllFive(input);
  const internalOutputs = [
    outputs.permitting,
    outputs.council,
    outputs.operations,
    outputs.dispatch,
  ];

  for (const output of internalOutputs) {
    assert.equal(output.audience, "internal");
    assert.equal(output.fallback.active, false);
    assert.deepEqual(output.redactions, []);
    assert.equal(
      output.claims.every(
        (claim) =>
          Array.isArray(claim.allowedAudience) &&
          claim.allowedAudience.length === 1 &&
          claim.allowedAudience[0] === "internal"
      ),
      true
    );
  }
});

test("sweep summary input renders through all five skins with canonical fingerprint parity and immutable inputs", () => {
  const scenarios = [
    {
      scenarioId: "governed-non-event-refusal",
      request: refusalFixture,
      expectedDecision: "HOLD",
      governedNonEventProof: true,
    },
  ];
  const requestBefore = clone(scenarios[0].request);
  const sweepResult = runGovernanceSweep({
    evaluatedAt: "2026-04-20T00:00:00.000Z",
    scenarios,
  });
  const summary = sweepResult.scenarios[0];
  const summaryBefore = clone(summary);
  const input = buildSweepInput(summary, scenarios[0].request, sweepResult.evaluatedAt);
  const inputBefore = clone(input);
  const outputs = renderAllFive(input);
  const canonicalFingerprint = buildTruthFingerprint(input);

  assert.equal(sweepResult.sweepMode, "on_demand_read_only");
  assert.equal(sweepResult.governedNonEventProofPassed, true);
  assert.equal(
    Object.values(outputs).every((output) => output.viewType === "sweep-result"),
    true
  );
  assert.equal(
    Object.values(outputs).every(
      (output) => output.truthFingerprint.digest === canonicalFingerprint.digest
    ),
    true
  );
  assert.deepEqual(summary, summaryBefore);
  assert.deepEqual(scenarios[0].request, requestBefore);
  assert.deepEqual(input, inputBefore);
});

test("integration proof keeps the skin surface read-only and free of scheduler, publish, or write side channels", () => {
  const sourceRoot = path.join(__dirname, "../src/skins");
  const source = collectSkinSourceFiles(sourceRoot)
    .map((entry) => readFileSync(entry, "utf8"))
    .join("\n");

  assert.equal(source.includes("setInterval"), false);
  assert.equal(source.includes("setTimeout"), false);
  assert.equal(/cron|daemon|worker/i.test(source), false);
  assert.equal(/writeFile|appendFile|createWriteStream/.test(source), false);
  assert.equal(source.includes("governancePublisher"), false);
  assert.equal(source.includes("publishOutcome"), false);
});
