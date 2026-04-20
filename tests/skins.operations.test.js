const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const { evaluateGovernanceRequest } = require("../src/governance/runtime");
const { buildCivicSkinInput, renderSkin } = require("../src/skins");
const { operationsSkinDescriptor } = require("../src/skins/civic/operations");

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

test("operations skin renders approved section families with deterministic crew/equipment/resource absences", () => {
  const refusalEvaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    refusalEvaluation,
    "refusal-operations",
    "governance-decision",
    refusalFixture
  );
  const output = renderSkin(input, operationsSkinDescriptor);

  assert.equal(output.skinId, "civic.operations");
  assert.equal(output.fallback.active, false);
  assert.deepEqual(
    output.sections.map((section) => section.title),
    [
      "Work Order Summary",
      "Corridor Status",
      "Asset / Utility Context",
      "Maintenance Priority",
      "Responsible Office",
      "Authority Gap / HOLD Queue",
      "Revocation or Escalation Notice",
    ]
  );

  const absenceIds = output.absences.map((absence) => absence.id).sort();
  assert.equal(absenceIds.includes("absence.operations-crew-status.missing"), true);
  assert.equal(absenceIds.includes("absence.operations-equipment-status.missing"), true);
  assert.equal(absenceIds.includes("absence.operations-resource-status.missing"), true);
  assert.equal(
    output.sections.every((section) => Array.isArray(section.sourceRefs) && section.sourceRefs.length > 0),
    true
  );
});

test("operations skin supports all Packet 2 internal view types", () => {
  const refusalEvaluation = evaluateGovernanceRequest(refusalFixture);
  const viewTypes = [
    "governance-decision",
    "authority-evaluation",
    "revocation-status",
    "promise-status",
    "sweep-result",
  ];

  for (const viewType of viewTypes) {
    const input = buildInputFromEvaluation(
      refusalEvaluation,
      `operations-${viewType}`,
      viewType,
      refusalFixture
    );
    const output = renderSkin(input, operationsSkinDescriptor);

    assert.equal(output.skinId, "civic.operations");
    assert.equal(output.viewType, viewType);
  }
});

test("operations skin emits deterministic unsupported fallback for explicit out-of-scope domains", () => {
  const safePassEvaluation = evaluateGovernanceRequest(safePassFixture);
  const input = buildInputFromEvaluation(
    safePassEvaluation,
    "safe-pass-operations-unsupported",
    "governance-decision",
    safePassFixture
  );

  input.civic.authority_resolution = {
    decision: "ALLOW",
    reason: "authority_domain_resolved",
    domain: {
      domain_id: "public_notice_action",
      decision: "ALLOW",
    },
  };

  const output = renderSkin(input, operationsSkinDescriptor);

  assert.equal(output.fallback.active, true);
  assert.equal(output.fallback.code, "UNSUPPORTED_VIEW_INTERNAL");
  assert.equal(output.absences[0].reason, "UNSUPPORTED_VIEW");
});
