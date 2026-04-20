const test = require("node:test");
const assert = require("node:assert/strict");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const { evaluateGovernanceRequest } = require("../src/governance/runtime");
const { buildCivicSkinInput, renderSkin } = require("../src/skins");
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

test("dispatch skin renders approved section families with deterministic resource and incident absences", () => {
  const refusalEvaluation = evaluateGovernanceRequest(refusalFixture);
  const input = buildInputFromEvaluation(
    refusalEvaluation,
    "refusal-dispatch",
    "governance-decision",
    refusalFixture
  );
  const output = renderSkin(input, dispatchSkinDescriptor);

  assert.equal(output.skinId, "civic.dispatch");
  assert.equal(output.fallback.active, false);
  assert.deepEqual(
    output.sections.map((section) => section.title),
    [
      "Active Hold Queue",
      "Priority Posture",
      "Governance Override Status",
      "Responsible Office",
      "Dispatch-Style Routing Summary",
      "Resource / Unit Context",
      "Absence Notices",
    ]
  );

  const absenceIds = output.absences.map((absence) => absence.id).sort();
  assert.equal(absenceIds.includes("absence.dispatch-resource-unit.missing"), true);
  assert.equal(absenceIds.includes("absence.dispatch-incident-context.missing"), true);
  assert.equal(
    output.sections.every((section) => Array.isArray(section.sourceRefs) && section.sourceRefs.length > 0),
    true
  );
});

test("dispatch skin keeps routing vocabulary bounded and avoids live CAD/911 inference", () => {
  const safePassEvaluation = evaluateGovernanceRequest(safePassFixture);
  const input = buildInputFromEvaluation(
    safePassEvaluation,
    "safe-pass-dispatch",
    "governance-decision",
    safePassFixture
  );
  const output = renderSkin(input, dispatchSkinDescriptor);
  const renderedText = output.sections
    .map((section) => section.body)
    .join(" ")
    .concat(" ")
    .concat(output.claims.map((claim) => claim.text).join(" "));

  assert.equal(output.fallback.active, false);
  assert.equal(/911|cad|incident command/i.test(renderedText), false);
});

test("dispatch skin emits deterministic unsupported fallback for explicit out-of-scope domains", () => {
  const safePassEvaluation = evaluateGovernanceRequest(safePassFixture);
  const input = buildInputFromEvaluation(
    safePassEvaluation,
    "safe-pass-dispatch-unsupported",
    "governance-decision",
    safePassFixture
  );

  input.civic.authority_resolution = {
    decision: "ALLOW",
    reason: "authority_domain_resolved",
    domain: {
      domain_id: "permit_authorization",
      decision: "ALLOW",
    },
  };

  const output = renderSkin(input, dispatchSkinDescriptor);

  assert.equal(output.fallback.active, true);
  assert.equal(output.fallback.code, "UNSUPPORTED_VIEW_INTERNAL");
  assert.equal(output.absences[0].reason, "UNSUPPORTED_VIEW");
});
