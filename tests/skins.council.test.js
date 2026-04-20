const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const { evaluateGovernanceRequest } = require("../src/governance/runtime");
const { buildCivicSkinInput, renderSkin } = require("../src/skins");
const { permittingSkinDescriptor } = require("../src/skins/civic/permitting");
const { councilSkinDescriptor } = require("../src/skins/civic/council");
const { operationsSkinDescriptor } = require("../src/skins/civic/operations");
const { dispatchSkinDescriptor } = require("../src/skins/civic/dispatch");

function buildInputFromEvaluation(
  evaluation,
  sourceId,
  viewType = "governance-decision",
  rawRequest = null
) {
  const raw =
    rawRequest && typeof rawRequest === "object"
      ? {
          ...evaluation,
          request: rawRequest,
        }
      : null;

  return buildCivicSkinInput(evaluation, {
    viewType,
    sourceKind: "runtime-evaluation",
    sourceId,
    raw,
    metadata: {
      generatedAt: "2026-04-20T00:00:00.000Z",
    },
  });
}

test("council skin renders approved section families with deterministic hearing/voting absences", () => {
  const refusalEvaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    refusalEvaluation,
    "refusal-council",
    "governance-decision",
    refusalFixture
  );
  const output = renderSkin(input, councilSkinDescriptor);

  assert.equal(output.skinId, "civic.council");
  assert.equal(output.fallback.active, false);
  assert.deepEqual(
    output.sections.map((section) => section.title),
    [
      "Resolution Summary",
      "Obligation Status",
      "Governance Rationale",
      "Public Hearing / Comment Context",
      "Voting Record Context",
      "Authority / Revocation Notice",
      "Absence Notices",
    ]
  );

  const absenceIds = output.absences.map((absence) => absence.id).sort();
  assert.equal(absenceIds.includes("absence.council-public-comment.missing"), true);
  assert.equal(absenceIds.includes("absence.council-voting-record.missing"), true);
  assert.equal(
    output.claims.some((claim) => claim.id === "claim.council-public-comment"),
    false
  );
  assert.equal(
    output.claims.some((claim) => claim.id === "claim.council-voting-record"),
    false
  );
  assert.equal(
    output.sections.every((section) => Array.isArray(section.sourceRefs) && section.sourceRefs.length > 0),
    true
  );
  assert.equal(
    output.claims.every(
      (claim) =>
        ["presented-source-truth", "label-translation", "derived-runtime-truth", "absence-notice"].includes(
          claim.claimKind
        ) && Array.isArray(claim.sourceRefs) && claim.sourceRefs.length > 0
    ),
    true
  );
});

test("council skin keeps truthFingerprint parity across permitting, council, operations, and dispatch", () => {
  const refusalEvaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    refusalEvaluation,
    "refusal-all-skins",
    "governance-decision",
    refusalFixture
  );

  const permittingOutput = renderSkin(input, permittingSkinDescriptor);
  const councilOutput = renderSkin(input, councilSkinDescriptor);
  const operationsOutput = renderSkin(input, operationsSkinDescriptor);
  const dispatchOutput = renderSkin(input, dispatchSkinDescriptor);

  assert.deepEqual(councilOutput.truthFingerprint, permittingOutput.truthFingerprint);
  assert.deepEqual(operationsOutput.truthFingerprint, permittingOutput.truthFingerprint);
  assert.deepEqual(dispatchOutput.truthFingerprint, permittingOutput.truthFingerprint);

  assert.notDeepEqual(
    councilOutput.sections.map((section) => section.id),
    operationsOutput.sections.map((section) => section.id)
  );
  assert.notDeepEqual(
    councilOutput.sections.map((section) => section.id),
    dispatchOutput.sections.map((section) => section.id)
  );
  assert.notDeepEqual(
    operationsOutput.sections.map((section) => section.id),
    dispatchOutput.sections.map((section) => section.id)
  );
});

test("council skin emits deterministic unsupported fallback for explicit out-of-scope domains", () => {
  const safePassEvaluation = evaluateGovernanceRequest(safePassFixture);
  const input = buildInputFromEvaluation(
    safePassEvaluation,
    "safe-pass-council-unsupported",
    "governance-decision",
    safePassFixture
  );

  input.civic.authority_resolution = {
    decision: "ALLOW",
    reason: "authority_domain_resolved",
    domain: {
      domain_id: "emergency_incident_command",
      decision: "ALLOW",
    },
  };

  const output = renderSkin(input, councilSkinDescriptor);

  assert.equal(output.fallback.active, true);
  assert.equal(output.fallback.code, "UNSUPPORTED_VIEW_INTERNAL");
  assert.equal(output.absences[0].reason, "UNSUPPORTED_VIEW");
});
