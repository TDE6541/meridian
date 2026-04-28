const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const { evaluateGovernanceRequest } = require("../src/governance/runtime");
const { buildCivicSkinInput } = require("../src/skins");
const {
  PUBLIC_DISCLOSURE_BOUNDARY_VERSION,
  PUBLIC_REDACTION_CATEGORIES,
  PUBLIC_REDACTION_MARKERS,
  applyPublicRedaction,
  buildPublicDisclosureNotice,
  isApprovedPublicClaimLanguage,
} = require("../src/skins/redaction");

function buildInputFromEvaluation(evaluation, sourceId, rawRequest) {
  return buildCivicSkinInput(evaluation, {
    viewType: "governance-decision",
    sourceKind: "runtime-evaluation",
    sourceId,
    audience: "public",
    raw: {
      ...evaluation,
      request: rawRequest,
    },
    metadata: {
      generatedAt: "2026-04-20T00:00:00.000Z",
    },
  });
}

test("public redaction categories each produce a stable marker and disclosure notice", () => {
  for (const category of PUBLIC_REDACTION_CATEGORIES) {
    assert.equal(typeof PUBLIC_REDACTION_MARKERS[category], "string");

    const notice = buildPublicDisclosureNotice(category, "demo.path");

    assert.equal(notice.category, category);
    assert.equal(notice.path, "demo.path");
    assert.equal(notice.marker, PUBLIC_REDACTION_MARKERS[category]);
    assert.equal(notice.basis, PUBLIC_DISCLOSURE_BOUNDARY_VERSION);
    assert.equal(isApprovedPublicClaimLanguage(notice.text), true);
  }
});

test("applyPublicRedaction emits deterministic structural redactions for the refusal fixture", () => {
  const evaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    evaluation,
    "refusal-redaction",
    refusalFixture
  );

  const result = applyPublicRedaction(input);

  assert.deepEqual(
    result.redactions.map((entry) => entry.category),
    [
      "entity-id-redacted",
      "org-id-redacted",
      "subject-address-redacted",
      "unknown-field-redacted",
    ]
  );

  assert.deepEqual(
    result.redactions.map((entry) => entry.path),
    [
      "entity_ref.entity_id",
      "org_id",
      "raw_subject",
      "entity_ref.entity_type",
    ]
  );

  assert.equal(
    result.redactions.every(
      (entry) =>
        typeof entry.noticeId === "string" &&
        typeof entry.marker === "string" &&
        typeof entry.basis === "string" &&
        isApprovedPublicClaimLanguage(entry.text)
    ),
    true
  );
});

test("applyPublicRedaction does not mutate the passed civic input", () => {
  const evaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    evaluation,
    "refusal-redaction-immutability",
    refusalFixture
  );
  const before = structuredClone(input);

  applyPublicRedaction(input);

  assert.deepEqual(input, before);
});

test("isApprovedPublicClaimLanguage rejects banned phrases and accepts the approved posture phrases", () => {
  const rejectedSamples = [
    "This summary is " + "TPIA" + "-compliant.",
    "This summary is " + "TPIA" + " compliant.",
    "This summary is " + "legally" + " sufficient.",
    "This summary is " + "city" + "-attorney reviewed.",
    "This summary is " + "city" + " attorney reviewed.",
    "This summary is " + "public" + "-records request automation.",
    "This summary is " + "public" + " records request automation.",
    "This summary is " + "F" + "O" + "I" + "A" + "/TPIA workflow.",
  ];

  for (const sample of rejectedSamples) {
    assert.equal(isApprovedPublicClaimLanguage(sample), false);
  }

  const approvedSamples = [
    "This TPIA-aware summary uses the public disclosure boundary.",
    "This summary uses deterministic demo redaction.",
    "This summary is not legal review.",
    "This summary is not request adjudication.",
  ];

  for (const sample of approvedSamples) {
    assert.equal(isApprovedPublicClaimLanguage(sample), true);
  }
});
