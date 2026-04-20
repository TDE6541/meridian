const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const hardStopFixture = require("./fixtures/governance/hard-stop.commandRequest.json");
const supervisedFixture = require("./fixtures/governance/supervised.commandRequest.json");
const { evaluateGovernanceRequest } = require("../src/governance/runtime");
const {
  buildCivicSkinInput,
  buildTruthFingerprint,
  renderDefaultSkin,
} = require("../src/skins");
const { renderPublicSkin } = require("../src/skins/civic/public");
const { isApprovedPublicClaimLanguage } = require("../src/skins/redaction");

function buildInputFromEvaluation(evaluation, sourceId, rawRequest) {
  return buildCivicSkinInput(evaluation, {
    viewType: "governance-decision",
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

function renderPair(fixtureName, fixture) {
  const evaluation = evaluateGovernanceRequest(fixture);
  const internalInput = buildInputFromEvaluation(evaluation, fixtureName, fixture);
  const publicInput = structuredClone(internalInput);

  return {
    evaluation,
    internalInput,
    publicInput,
    internalOutput: renderDefaultSkin(internalInput),
    publicOutput: renderPublicSkin(publicInput),
  };
}

function collectRenderedPublicText(output) {
  return output.sections
    .flatMap((section) => section.body)
    .concat(output.claims.map((claim) => claim.text))
    .concat(output.absences.map((absence) => absence.displayText))
    .concat(output.redactions.map((entry) => entry.text))
    .concat(output.fallback.message ? [output.fallback.message] : []);
}

const FIXTURES = [
  ["refusal.commandRequest.json", refusalFixture],
  ["safe-pass.commandRequest.json", safePassFixture],
  ["hard-stop.commandRequest.json", hardStopFixture],
  ["supervised.commandRequest.json", supervisedFixture],
];

test("public skin renders the four fixture evaluations with truth parity and a non-empty observable surface", () => {
  for (const [fixtureName, fixture] of FIXTURES) {
    const { internalInput, internalOutput, publicOutput } = renderPair(fixtureName, fixture);

    assert.equal(publicOutput.skinId, "civic.public");
    assert.equal(publicOutput.audience, "public");
    assert.equal(
      publicOutput.truthFingerprint.digest,
      internalOutput.truthFingerprint.digest
    );
    assert.deepEqual(
      publicOutput.truthFingerprint,
      buildTruthFingerprint(internalInput)
    );
    assert.equal(
      publicOutput.claims.length + publicOutput.absences.length + publicOutput.redactions.length > 0,
      true
    );
  }
});

test("public skin never exposes refusal raw identifiers or request tokens in section bodies or claim text", () => {
  const { publicOutput } = renderPair("refusal.commandRequest.json", refusalFixture);
  const renderedText = publicOutput.sections
    .flatMap((section) => section.body)
    .join(" ")
    .concat(" ")
    .concat(publicOutput.claims.map((claim) => claim.text).join(" "));

  assert.equal(renderedText.includes("entity_ref"), false);
  assert.equal(renderedText.includes("org_id"), false);
  assert.equal(renderedText.includes("raw_subject"), false);
  assert.equal(renderedText.includes("permit-utility-2026-0847"), false);
  assert.equal(renderedText.includes("fortworth-dev"), false);
  assert.equal(
    renderedText.includes("constellation.commands.fortworth-dev.permit-utility-2026-0847"),
    false
  );
});

test("public skin redactions are deterministic and wire disclosure notice ids onto the disclosure boundary section", () => {
  const first = renderPair("refusal.commandRequest.json", refusalFixture).publicOutput;
  const second = renderPair("refusal.commandRequest.json", refusalFixture).publicOutput;

  assert.deepEqual(first.redactions, second.redactions);

  const boundarySection = first.sections.find(
    (section) => section.id === "public-disclosure-boundary"
  );

  assert.ok(boundarySection);
  assert.deepEqual(
    boundarySection.disclosureNoticeIds,
    first.redactions.map((entry) => entry.noticeId)
  );
  assert.equal(
    first.redactions.every(
      (entry) =>
        typeof entry.path === "string" &&
        typeof entry.category === "string" &&
        typeof entry.marker === "string" &&
        typeof entry.basis === "string" &&
        typeof entry.noticeId === "string" &&
        isApprovedPublicClaimLanguage(entry.text)
    ),
    true
  );
});

test("public skin emits PUBLIC_DISCLOSURE_HOLD fallback when required canonical truth is missing", () => {
  const evaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    evaluation,
    "refusal-canonical-hold",
    refusalFixture
  );
  input.civic.confidence.tier = null;
  const before = structuredClone(input);

  const output = renderPublicSkin(input);

  assert.equal(output.fallback.active, true);
  assert.equal(output.fallback.code, "PUBLIC_DISCLOSURE_HOLD");
  assert.equal(
    output.absences.some((absence) => absence.path === "civic.confidence.tier"),
    true
  );
  assert.deepEqual(input, before);
});

test("framework public guard remains reserved for callers that keep using renderDefaultSkin", () => {
  const evaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    evaluation,
    "refusal-framework-public",
    refusalFixture
  );
  input.audience = "public";

  const output = renderDefaultSkin(input);

  assert.equal(output.fallback.active, true);
  assert.equal(output.fallback.code, "PUBLIC_RENDERING_RESERVED");
});

test("public skin stays structurally distinct from the internal permitting skin and keeps approved language", () => {
  const { publicOutput, internalOutput } = renderPair(
    "safe-pass.commandRequest.json",
    safePassFixture
  );
  const publicSectionIds = new Set(publicOutput.sections.map((section) => section.id));
  const internalSectionIds = new Set(internalOutput.sections.map((section) => section.id));

  for (const sectionId of publicSectionIds) {
    assert.equal(internalSectionIds.has(sectionId), false);
  }

  assert.equal(
    publicOutput.claims.every((claim) => claim.id.startsWith("claim.public-")),
    true
  );

  for (const text of collectRenderedPublicText(publicOutput)) {
    assert.equal(isApprovedPublicClaimLanguage(text), true);
  }
});

test("renderPublicSkin does not mutate the passed civic input", () => {
  const evaluation = evaluateGovernanceRequest(supervisedFixture);
  const input = buildInputFromEvaluation(
    evaluation,
    "supervised-immutability",
    supervisedFixture
  );
  const before = structuredClone(input);

  renderPublicSkin(input);

  assert.deepEqual(input, before);
});
