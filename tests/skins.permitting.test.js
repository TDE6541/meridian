const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const { evaluateGovernanceRequest } = require("../src/governance/runtime");
const { buildCivicSkinInput, renderDefaultSkin } = require("../src/skins");

function clone(value) {
  return structuredClone(value);
}

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

test("permitting skin renders refusal fixture with source-backed approval claims and deterministic absences", () => {
  const refusalEvaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    refusalEvaluation,
    "refusal.commandRequest.json",
    "governance-decision",
    refusalFixture
  );
  const output = renderDefaultSkin(input);

  assert.equal(output.skinId, "civic.permitting");
  assert.equal(output.fallback.active, false);
  assert.equal(output.truthFingerprint.decision, "HOLD");
  assert.equal(output.truthFingerprint.confidenceTier, "HOLD");

  const requiredApprovalClaimIds = output.claims
    .map((claim) => claim.id)
    .filter((claimId) => claimId.startsWith("claim.required-approval."))
    .sort();

  assert.deepEqual(requiredApprovalClaimIds, [
    "claim.required-approval.development-services",
    "claim.required-approval.tpw-row",
    "claim.required-approval.water-department",
  ]);

  const absenceIds = output.absences.map((absence) => absence.id).sort();
  assert.deepEqual(
    absenceIds.includes("absence.missing-approval.tpw-row"),
    true
  );
  assert.deepEqual(
    absenceIds.includes("absence.missing-approval.development-services"),
    true
  );
  assert.deepEqual(
    absenceIds.includes("absence.missing-evidence.utility-conflict-assessment"),
    true
  );

  const absenceSourcePaths = new Set(
    output.absences
      .flatMap((absence) => absence.sourceRefs)
      .map((sourceRef) => sourceRef.path)
  );
  assert.equal(absenceSourcePaths.has("authority_context.missing_approvals"), true);
  assert.equal(absenceSourcePaths.has("evidence_context.missing_types"), true);
});

test("permitting skin renders safe-pass fixture without deterministic absences", () => {
  const safePassEvaluation = evaluateGovernanceRequest(safePassFixture);
  const input = buildInputFromEvaluation(
    safePassEvaluation,
    "safe-pass.commandRequest.json",
    "governance-decision",
    safePassFixture
  );
  const output = renderDefaultSkin(input);

  assert.equal(output.fallback.active, false);
  assert.equal(output.truthFingerprint.decision, "ALLOW");
  assert.equal(output.truthFingerprint.confidenceTier, "WATCH");
  assert.deepEqual(output.absences, []);
});

test("permitting skin supports all Packet 1 internal view types", () => {
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
      `refusal-${viewType}`,
      viewType,
      refusalFixture
    );
    const output = renderDefaultSkin(input);
    assert.equal(output.viewType, viewType);
    assert.equal(output.skinId, "civic.permitting");
  }
});

test("permitting skin rejects explicit non-permit domains with deterministic unsupported fallback", () => {
  const safePassEvaluation = evaluateGovernanceRequest(safePassFixture);
  const input = buildInputFromEvaluation(
    safePassEvaluation,
    "safe-pass-non-permit-domain",
    "governance-decision",
    safePassFixture
  );

  input.civic.authority_resolution = {
    decision: "ALLOW",
    reason: "authority_domain_resolved",
    domain: {
      domain_id: "utility_corridor_action",
      decision: "ALLOW",
    },
  };

  const output = renderDefaultSkin(input);

  assert.equal(output.fallback.active, true);
  assert.equal(output.fallback.code, "UNSUPPORTED_VIEW_INTERNAL");
  assert.equal(output.absences[0].reason, "UNSUPPORTED_VIEW");
});

test("public audience rendering remains reserved in Packet 1", () => {
  const refusalEvaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    refusalEvaluation,
    "refusal-public-reserved",
    "governance-decision",
    refusalFixture
  );
  input.audience = "public";
  const before = clone(input);

  const output = renderDefaultSkin(input);

  assert.equal(output.fallback.active, true);
  assert.equal(output.fallback.code, "PUBLIC_RENDERING_RESERVED");
  assert.equal(output.absences[0].reason, "PUBLIC_DISCLOSURE_HOLD");
  assert.deepEqual(input, before);
});
