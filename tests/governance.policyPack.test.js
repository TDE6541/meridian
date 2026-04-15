const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const refusalFixture = require("./fixtures/governance/refusal.commandRequest.json");
const safePassFixture = require("./fixtures/governance/safe-pass.commandRequest.json");
const {
  MERIDIAN_GOVERNANCE_CONFIG,
  evaluateGovernanceRequest,
  resolveGovernancePolicyContext,
} = require("../src/governance/runtime/index.js");

test("governance policy pack is importable, versioned, and static-local for Wave 4A", () => {
  assert.equal(
    MERIDIAN_GOVERNANCE_CONFIG.version,
    "wave4a-block-b-static-civic-policy-pack-v1"
  );
  assert.equal(MERIDIAN_GOVERNANCE_CONFIG.source.mode, "static_local_module");
  assert.equal(MERIDIAN_GOVERNANCE_CONFIG.source.wave, "4A");
  assert.equal(MERIDIAN_GOVERNANCE_CONFIG.source.block, "B");
  assert.equal(
    MERIDIAN_GOVERNANCE_CONFIG.source.runtimeConfigSource,
    "only_runtime_config_source"
  );
  assert.match(
    MERIDIAN_GOVERNANCE_CONFIG.source.notes.join(" "),
    /live nats kv reads, env branching, dynamic fetch, and filesystem reads are out of scope/i
  );
});

test("governance policy pack freezes bounded vocabulary domains thresholds and omission packs", () => {
  assert.deepEqual(MERIDIAN_GOVERNANCE_CONFIG.decisionVocabulary.emittedNow, [
    "ALLOW",
    "HOLD",
    "BLOCK",
  ]);
  assert.deepEqual(MERIDIAN_GOVERNANCE_CONFIG.decisionVocabulary.reservedOnly, [
    "SUPERVISE",
    "REVOKE",
  ]);

  const domains = MERIDIAN_GOVERNANCE_CONFIG.domains;
  const domainIds = Object.keys(domains);
  assert.ok(domainIds.length >= 5);
  assert.deepEqual(domainIds, [
    "permit_authorization",
    "inspection_resolution",
    "utility_corridor_action",
    "decision_closure",
    "public_notice_action",
  ]);

  for (const domainId of domainIds) {
    assert.match(domains[domainId].rodPosition, /^(FULL_AUTO|SUPERVISED|HARD_STOP)$/);
    assert.equal(typeof domains[domainId].description, "string");
    assert.ok(domains[domainId].description.length > 0);
  }

  assert.deepEqual(
    Object.keys(MERIDIAN_GOVERNANCE_CONFIG.confidenceThresholds),
    ["WATCH", "GAP", "HOLD", "KILL"]
  );

  assert.deepEqual(Object.keys(MERIDIAN_GOVERNANCE_CONFIG.omissionPacks), [
    "permit_without_inspection",
    "action_without_authority",
    "closure_without_evidence",
  ]);
});

test("governance runtime resolves policy context from the static civic pack", () => {
  const refusalContext = resolveGovernancePolicyContext(refusalFixture);
  assert.deepEqual(refusalContext, {
    domainIds: ["permit_authorization", "utility_corridor_action"],
    constraintIds: [
      "incomplete_required_evidence",
      "unresolved_required_approvals",
      "utility_conflict_evidence_present",
    ],
    omissionPackIds: ["action_without_authority"],
  });

  const safePassContext = resolveGovernancePolicyContext(safePassFixture);
  assert.deepEqual(safePassContext, {
    domainIds: ["inspection_resolution"],
    constraintIds: [],
    omissionPackIds: [],
  });

  assert.deepEqual(evaluateGovernanceRequest(safePassFixture), {
    decision: "ALLOW",
    reason: "authority_and_evidence_resolved",
  });
});

test("governance runtime uses a static local import without env or dynamic fetch policy loading", () => {
  const evaluatorSource = readFileSync(
    path.join(__dirname, "../src/governance/runtime/evaluateGovernanceRequest.js"),
    "utf8"
  );

  assert.match(evaluatorSource, /require\(\"\.\/meridian-governance-config\"\)/);
  assert.equal(evaluatorSource.includes("process.env"), false);
  assert.equal(/fetch\s*\(/.test(evaluatorSource), false);
  assert.equal(
    /require\(["']fs["']\)|readFileSync\s*\(|readFile\s*\(/.test(evaluatorSource),
    false
  );
});
