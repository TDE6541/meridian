const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
} = require("../../src/live/authority/authorityContracts");
const {
  createAuthorityRequestStore,
} = require("../../src/live/authority/authorityRequestStore");
const {
  createAuthorityActionToken,
  hashAuthorityActionToken,
  verifyAuthorityActionToken,
} = require("../../src/live/authority/authorityTokens");
const {
  resolveAuthorityRequestAction,
} = require("../../src/live/authority/authorityResolutionHandler");

const SECRET = "g3-deterministic-token-secret";
const ISSUED_AT = "2026-04-25T12:00:00.000Z";
const EXPIRES_AT = "2026-04-25T13:00:00.000Z";

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
    },
    expiry: EXPIRES_AT,
    status: "pending",
    forensic_receipt_id: null,
    ...overrides,
  };
}

function createToken(action = "approve", overrides = {}) {
  return createAuthorityActionToken(
    {
      request_id: "ARR-0001",
      action,
      issued_at: ISSUED_AT,
      expires_at: EXPIRES_AT,
      ...overrides,
    },
    { secret: SECRET }
  );
}

test("authority tokens: token creation succeeds with explicit inputs and secret", () => {
  const created = createToken();

  assert.equal(created.ok, true, created.issues.join("\n"));
  assert.match(created.token, /^garp-action-v1\./);
  assert.equal(created.payload.request_id, "ARR-0001");
  assert.equal(created.payload.action, "approve");
});

test("authority tokens: token creation HOLDs without secret", () => {
  const created = createAuthorityActionToken({
    request_id: "ARR-0001",
    action: "approve",
    issued_at: ISSUED_AT,
    expires_at: EXPIRES_AT,
  });

  assert.equal(created.ok, false);
  assert.deepEqual(created.issues, ["token_secret_required"]);
});

test("authority tokens: verification passes for valid token", () => {
  const created = createToken();
  const verified = verifyAuthorityActionToken(
    created.token,
    {
      request_id: "ARR-0001",
      action: "approve",
      current_time: ISSUED_AT,
    },
    { secret: SECRET }
  );

  assert.equal(verified.ok, true, verified.issues.join("\n"));
  assert.equal(verified.payload.action, "approve");
  assert.equal(verified.token_hash, created.token_hash);
});

test("authority tokens: verification fails for wrong request id", () => {
  const created = createToken();
  const verified = verifyAuthorityActionToken(
    created.token,
    {
      request_id: "ARR-0002",
      action: "approve",
      current_time: ISSUED_AT,
    },
    { secret: SECRET }
  );

  assert.equal(verified.ok, false);
  assert.deepEqual(verified.issues, ["token_request_id_mismatch"]);
});

test("authority tokens: verification fails for wrong action", () => {
  const created = createToken("deny");
  const verified = verifyAuthorityActionToken(
    created.token,
    {
      request_id: "ARR-0001",
      action: "approve",
      current_time: ISSUED_AT,
    },
    { secret: SECRET }
  );

  assert.equal(verified.ok, false);
  assert.deepEqual(verified.issues, ["token_action_mismatch"]);
});

test("authority tokens: verification fails for expired token", () => {
  const created = createToken();
  const verified = verifyAuthorityActionToken(
    created.token,
    {
      request_id: "ARR-0001",
      action: "approve",
      current_time: "2026-04-25T13:00:01.000Z",
    },
    { secret: SECRET }
  );

  assert.equal(verified.ok, false);
  assert.deepEqual(verified.issues, ["token_expired"]);
});

test("authority tokens: verification fails for malformed token", () => {
  const verified = verifyAuthorityActionToken(
    "not-a-token",
    {
      request_id: "ARR-0001",
      action: "approve",
      current_time: ISSUED_AT,
    },
    { secret: SECRET }
  );

  assert.equal(verified.ok, false);
  assert.match(verified.issues.join("\n"), /malformed/);
});

test("authority tokens: token hash is stable and does not equal raw token", () => {
  const created = createToken("request_info");

  assert.equal(hashAuthorityActionToken(created.token), created.token_hash);
  assert.notEqual(created.token_hash, created.token);
});

test("authority tokens: token payload does not include secret", () => {
  const created = createToken();

  assert.equal(Object.values(created.payload).includes(SECRET), false);
  assert.equal(Object.prototype.hasOwnProperty.call(created.payload, "secret"), false);
});

test("authority tokens: generation uses no live clock or random values", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/authority/authorityTokens.js"),
    "utf8"
  );

  assert.equal(/Date\.now|new Date\s*\(/.test(source), false);
  assert.equal(/Math\.random|randomBytes|randomUUID/.test(source), false);
});

test("authority tokens: consumed request-info token cannot be reused while pending", () => {
  const store = createAuthorityRequestStore([createValidRequest()]);
  const token = createToken("request_info");

  const first = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action: "request_info",
      token: token.token,
      current_time: "2026-04-25T12:10:00.000Z",
      request_info: {
        question: "Upload signed concurrence memo.",
      },
    },
    { store, secret: SECRET }
  );
  const second = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action: "request_info",
      token: token.token,
      current_time: "2026-04-25T12:11:00.000Z",
    },
    { store, secret: SECRET }
  );

  assert.equal(first.ok, true, first.issues.join("\n"));
  assert.equal(store.getRequestById("ARR-0001").status, "pending");
  assert.equal(second.ok, false);
  assert.deepEqual(second.issues, ["action_token_already_consumed"]);
  assert.equal(
    store.getRequestById("ARR-0001").consumed_action_token_hashes.length,
    1
  );
});
