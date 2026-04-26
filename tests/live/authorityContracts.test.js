const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
  AUTHORITY_SEVERITY_ORDER,
  validateAuthorityResolutionRequestV1,
} = require("../../src/live/authority/authorityContracts");

function createValidRequest(overrides = {}) {
  return {
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
    request_id: "ARR-0001",
    source_absence_id: "absence-1",
    source_governance_evaluation: "governance-1",
    required_authority_role: "public_works_director",
    required_authority_department: "public_works",
    resolution_type: "approval",
    binding_context: {
      source_refs: ["record:1"],
      entity_refs: ["entity-1"],
    },
    expiry: "2026-04-25T13:00:00.000Z",
    status: "pending",
    forensic_receipt_id: null,
    ...overrides,
  };
}

test("authority contracts: valid authority resolution request passes validation", () => {
  const validation = validateAuthorityResolutionRequestV1(createValidRequest());

  assert.equal(validation.valid, true, validation.issues.join("\n"));
  assert.deepEqual(validation.issues, []);
});

test("authority contracts: malformed request fails visibly", () => {
  const validation = validateAuthorityResolutionRequestV1({});

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /contract must equal/);
  assert.match(validation.issues.join("\n"), /request_id/);
  assert.match(validation.issues.join("\n"), /binding_context/);
});

test("authority contracts: invalid status fails", () => {
  const validation = validateAuthorityResolutionRequestV1(
    createValidRequest({ status: "waiting_for_email" })
  );

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /status is not allowed/);
});

test("authority contracts: consumed action token hashes are optional but validated", () => {
  const valid = validateAuthorityResolutionRequestV1(
    createValidRequest({
      consumed_action_token_hashes: ["abc123"],
    })
  );
  const invalid = validateAuthorityResolutionRequestV1(
    createValidRequest({
      consumed_action_token_hashes: ["abc123", ""],
    })
  );

  assert.equal(valid.valid, true, valid.issues.join("\n"));
  assert.equal(invalid.valid, false);
  assert.match(invalid.issues.join("\n"), /consumed_action_token_hashes/);
});

test("authority contracts: blank required authority role fails", () => {
  const validation = validateAuthorityResolutionRequestV1(
    createValidRequest({ required_authority_role: " " })
  );

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /required_authority_role/);
});

test("authority contracts: blank source absence id fails", () => {
  const validation = validateAuthorityResolutionRequestV1(
    createValidRequest({ source_absence_id: "" })
  );

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /source_absence_id/);
});

test("authority contracts: binding context is required", () => {
  const request = createValidRequest();
  delete request.binding_context;

  const validation = validateAuthorityResolutionRequestV1(request);

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /binding_context/);
});

test("authority contracts: contract string and severity order are locked", () => {
  assert.equal(
    AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
    "meridian.v2.authorityResolutionRequest.v1"
  );
  assert.deepEqual(AUTHORITY_SEVERITY_ORDER, [
    "INFO",
    "WATCH",
    "GAP",
    "HOLD",
    "BLOCK",
    "REVOKE",
  ]);

  const validation = validateAuthorityResolutionRequestV1(
    createValidRequest({ contract: "meridian.v2.authorityResolutionRequest.v2" })
  );
  assert.equal(validation.valid, false);
});
