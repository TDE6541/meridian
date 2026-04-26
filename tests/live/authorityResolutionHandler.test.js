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
      entity_refs: ["entity-1"],
    },
    expiry: EXPIRES_AT,
    status: "pending",
    forensic_receipt_id: null,
    ...overrides,
  };
}

function createStore(requestOverrides = {}) {
  return createAuthorityRequestStore([createValidRequest(requestOverrides)]);
}

function createToken(action, overrides = {}) {
  const created = createAuthorityActionToken(
    {
      request_id: "ARR-0001",
      action,
      issued_at: ISSUED_AT,
      expires_at: EXPIRES_AT,
      ...overrides,
    },
    { secret: SECRET }
  );

  assert.equal(created.ok, true, created.issues.join("\n"));
  return created.token;
}

function resolve(store, action, overrides = {}, options = {}) {
  return resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action,
      current_time: "2026-04-25T12:30:00.000Z",
      token:
        action === "expire" ? undefined : createToken(action, overrides.tokenInput),
      ...overrides,
    },
    {
      store,
      secret: SECRET,
      ...options,
    }
  );
}

test("authority resolution handler: approve with valid token transitions pending request to approved", () => {
  const store = createStore();
  const result = resolve(store, "approve");

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.request.status, "approved");
  assert.equal(store.getRequestById("ARR-0001").status, "approved");
  assert.equal(result.lifecycle_record.action, "approve");
});

test("authority resolution handler: deny with valid token transitions pending request to denied", () => {
  const store = createStore();
  const result = resolve(store, "deny", {
    reason: "Authority denied the request.",
  });

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.request.status, "denied");
  assert.equal(result.denial_record.kind, "authority_denial");
  assert.equal(result.denial_record.reason, "Authority denied the request.");
});

test("authority resolution handler: request_info leaves request pending and records lifecycle output", () => {
  const store = createStore();
  const result = resolve(store, "request_info", {
    request_info: {
      question: "Upload signed concurrence memo.",
    },
  });
  const stored = store.getRequestById("ARR-0001");

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.request.status, "pending");
  assert.equal(stored.status, "pending");
  assert.equal(result.lifecycle_record.action, "request_info");
  assert.deepEqual(result.lifecycle_record.request_info, {
    question: "Upload signed concurrence memo.",
  });
  assert.equal(stored.consumed_action_token_hashes.length, 1);
});

test("authority resolution handler: repeated request_info with same token is rejected", () => {
  const store = createStore();
  const token = createToken("request_info");

  const first = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action: "request_info",
      current_time: "2026-04-25T12:30:00.000Z",
      token,
    },
    { store, secret: SECRET }
  );
  const second = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action: "request_info",
      current_time: "2026-04-25T12:31:00.000Z",
      token,
    },
    { store, secret: SECRET }
  );

  assert.equal(first.ok, true, first.issues.join("\n"));
  assert.equal(second.ok, false);
  assert.deepEqual(second.issues, ["action_token_already_consumed"]);
  assert.equal(store.getRequestById("ARR-0001").status, "pending");
});

test("authority resolution handler: approve and deny tokens cannot be reused after transition", () => {
  for (const action of ["approve", "deny"]) {
    const store = createStore();
    const token = createToken(action);
    const first = resolveAuthorityRequestAction(
      {
        request_id: "ARR-0001",
        action,
        current_time: "2026-04-25T12:30:00.000Z",
        token,
      },
      { store, secret: SECRET }
    );
    const second = resolveAuthorityRequestAction(
      {
        request_id: "ARR-0001",
        action,
        current_time: "2026-04-25T12:31:00.000Z",
        token,
      },
      { store, secret: SECRET }
    );

    assert.equal(first.ok, true, first.issues.join("\n"));
    assert.equal(second.ok, false);
    assert.deepEqual(second.issues, ["request_not_pending"]);
  }
});

test("authority resolution handler: expire before expiry does not transition", () => {
  const store = createStore();
  const result = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action: "expire",
      current_time: "2026-04-25T12:59:59.000Z",
    },
    { store, secret: SECRET }
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ["request_not_expired"]);
  assert.equal(store.getRequestById("ARR-0001").status, "pending");
});

test("authority resolution handler: expire at or after expiry transitions pending request to expired", () => {
  const atExpiry = createStore();
  const afterExpiry = createStore({
    request_id: "ARR-0002",
    source_absence_id: "absence-2",
  });

  const at = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action: "expire",
      current_time: EXPIRES_AT,
    },
    { store: atExpiry, secret: SECRET }
  );
  const after = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0002",
      action: "expire",
      current_time: "2026-04-25T13:00:01.000Z",
    },
    { store: afterExpiry, secret: SECRET }
  );

  assert.equal(at.ok, true, at.issues.join("\n"));
  assert.equal(after.ok, true, after.issues.join("\n"));
  assert.equal(atExpiry.getRequestById("ARR-0001").status, "expired");
  assert.equal(afterExpiry.getRequestById("ARR-0002").status, "expired");
});

test("authority resolution handler: approve, deny, and request_info after non-pending status are rejected", () => {
  for (const action of ["approve", "deny", "request_info"]) {
    const store = createStore({ status: "approved" });
    const result = resolve(store, action);

    assert.equal(result.ok, false);
    assert.deepEqual(result.issues, ["request_not_pending"]);
    assert.equal(store.getRequestById("ARR-0001").status, "approved");
  }
});

test("authority resolution handler: invalid token does not change request", () => {
  const store = createStore();
  const result = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action: "approve",
      current_time: "2026-04-25T12:30:00.000Z",
      token: "not-a-valid-token",
    },
    { store, secret: SECRET }
  );

  assert.equal(result.ok, false);
  assert.equal(store.getRequestById("ARR-0001").status, "pending");
});

test("authority resolution handler: expired token does not change request", () => {
  const store = createStore();
  const result = resolveAuthorityRequestAction(
    {
      request_id: "ARR-0001",
      action: "approve",
      current_time: "2026-04-25T13:00:01.000Z",
      token: createToken("approve"),
    },
    { store, secret: SECRET }
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ["token_expired"]);
  assert.equal(store.getRequestById("ARR-0001").status, "pending");
});

test("authority resolution handler: missing token does not change approve, deny, or request_info", () => {
  for (const action of ["approve", "deny", "request_info"]) {
    const store = createStore();
    const result = resolveAuthorityRequestAction(
      {
        request_id: "ARR-0001",
        action,
        current_time: "2026-04-25T12:30:00.000Z",
      },
      { store, secret: SECRET }
    );

    assert.equal(result.ok, false);
    assert.deepEqual(result.issues, ["action_token_required"]);
    assert.equal(store.getRequestById("ARR-0001").status, "pending");
  }
});

test("authority resolution handler: approval result includes local lifecycle record", () => {
  const store = createStore();
  const result = resolve(store, "approve", {
    actor_ref: "authority-holder-1",
  });

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.lifecycle_record.kind, "authority_resolution_lifecycle");
  assert.equal(result.lifecycle_record.actor_ref, "authority-holder-1");
  assert.match(result.lifecycle_record.token_hash, /^[a-f0-9]{64}$/);
});

test("authority resolution handler: denial result includes denial record", () => {
  const store = createStore();
  const result = resolve(store, "deny", {
    actor_ref: "authority-holder-1",
  });

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.denial_record.request_id, "ARR-0001");
  assert.equal(result.denial_record.actor_ref, "authority-holder-1");
});

test("authority resolution handler: approval emits deterministic HOLD when authority evidence delta is unavailable", () => {
  const store = createStore();
  const result = resolve(store, "approve");

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.authority_evidence.status, "HOLD");
  assert.equal(
    result.authority_evidence.code,
    "authority_evidence_delta_unavailable"
  );
  assert.equal(store.getRequestById("ARR-0001").status, "approved");
});

test("authority resolution handler: approval can prepare existing-kind authority.evaluated live event", () => {
  const store = createStore();
  const result = resolve(store, "approve", {
    live_event: {
      event_id: "authority-event-1",
      session_id: "session-g3",
      sequence: 1,
      source: {
        type: "system",
        ref: "authority-resolution-handler-test",
      },
    },
  });

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.live_event.status, "PASS");
  assert.equal(result.live_event.event.kind, "authority.evaluated");
  assert.equal(result.live_event.event.timestamp, "2026-04-25T12:30:00.000Z");
});

test("authority resolution handler: live event output HOLDs when helper inputs are missing", () => {
  const store = createStore();
  const result = resolve(store, "approve");

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.live_event.status, "HOLD");
  assert.equal(result.live_event.code, "authority_live_event_unavailable");
});

test("authority resolution handler: no governance gateway, forensic, network, or event-kind widening", () => {
  const source = readFileSync(
    path.join(
      __dirname,
      "../../src/live/authority/authorityResolutionHandler.js"
    ),
    "utf8"
  );

  assert.equal(/liveGovernanceGateway|evaluateLiveEntityDelta|appendRecord/.test(source), false);
  assert.equal(/ForensicChain|forensicWriter|recordGovernanceResult/.test(source), false);
  assert.equal(/fetch\s*\(|OpenFGA|Auth0|Resend|SendGrid|smtp/i.test(source), false);
  assert.equal(/LIVE_FEED_EVENT_KINDS/.test(source), false);
  assert.equal(/Date\.now|new Date\s*\(/.test(source), false);
  assert.equal(/Math\.random|randomBytes|randomUUID/.test(source), false);
  assert.equal(/dashboard|src\/entities|src\/governance|src\/bridge/.test(source), false);
});
