const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
} = require("../../src/live/authority/authorityContracts");
const {
  buildAuthorityNotificationPayload,
} = require("../../src/live/authority/authorityNotificationService");

const SECRET = "g3-deterministic-token-secret";

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
    expiry: "2026-04-25T13:00:00.000Z",
    status: "pending",
    forensic_receipt_id: null,
    ...overrides,
  };
}

function createRecipient(overrides = {}) {
  return {
    recipient_id: "authority-holder-1",
    device_ref: "sim-device-1",
    browser_push_ref: "browser-push-ref-1",
    email_ref: "authority-holder-email-ref",
    channels: ["email", "simulated_device", "browser_push"],
    ...overrides,
  };
}

function buildPayload(overrides = {}, options = {}) {
  return buildAuthorityNotificationPayload(
    {
      request: createValidRequest(),
      recipient: createRecipient(),
      current_time: "2026-04-25T12:00:00.000Z",
      route_base_url: "https://control-room.local/garp",
      ...overrides,
    },
    {
      secret: SECRET,
      ...options,
    }
  );
}

test("authority notification service: simulated-device payload builds", () => {
  const result = buildPayload({
    channels: ["simulated_device"],
  });

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.notification.channels[0].channel, "simulated_device");
  assert.equal(result.notification.channels[0].payload.actions.length, 3);
  assert.match(
    result.notification.channels[0].payload.actions[0].response_url,
    /token=/
  );
});

test("authority notification service: channel priority is deterministic", () => {
  const result = buildPayload({
    channels: ["email", "browser_push", "simulated_device"],
  });

  assert.deepEqual(
    result.notification.channels.map((entry) => entry.channel),
    ["simulated_device", "browser_push", "email"]
  );
});

test("authority notification service: unsupported channels are skipped", () => {
  const result = buildPayload({
    channels: ["pager", "email"],
  });

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.deepEqual(
    result.notification.skipped_channels,
    [{ channel: "pager", reason: "unsupported_channel" }]
  );
  assert.deepEqual(
    result.notification.channels.map((entry) => entry.channel),
    ["email"]
  );
});

test("authority notification service: missing recipient HOLDs", () => {
  const result = buildPayload({
    recipient: null,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ["recipient_required"]);
});

test("authority notification service: missing current time HOLDs", () => {
  const result = buildPayload({
    current_time: undefined,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ["current_time_required"]);
});

test("authority notification service: missing secret HOLDs", () => {
  const result = buildAuthorityNotificationPayload({
    request: createValidRequest(),
    recipient: createRecipient(),
    current_time: "2026-04-25T12:00:00.000Z",
    route_base_url: "https://control-room.local/garp",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ["token_secret_required"]);
});

test("authority notification service: missing route base HOLDs", () => {
  const result = buildPayload({
    route_base_url: undefined,
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues, ["route_base_url_required"]);
});

test("authority notification service: raw tokens appear only in action surfaces", () => {
  const result = buildPayload({
    channels: ["simulated_device", "email"],
  });
  const hashes = result.notification.evidence.action_token_hashes;
  const simulatedActions = result.notification.channels[0].payload.actions;
  const serializedEvidence = JSON.stringify(result.notification.evidence);
  const serializedStorage = JSON.stringify(result.notification.storage);

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.ok(simulatedActions.every((entry) => entry.response_token));
  assert.ok(Object.values(hashes).every((hash) => /^[a-f0-9]{64}$/.test(hash)));
  assert.equal(/garp-action-v1\./.test(serializedEvidence), false);
  assert.equal(/garp-action-v1\./.test(serializedStorage), false);
});

test("authority notification service: evidence and storage fields contain token hashes", () => {
  const result = buildPayload();

  assert.deepEqual(
    Object.keys(result.notification.evidence.action_token_hashes).sort(),
    ["approve", "deny", "request_info"]
  );
  assert.deepEqual(
    result.notification.evidence.action_token_hashes,
    result.notification.storage.action_token_hashes
  );
});

test("authority notification service: payload builder has no sender/provider behavior", () => {
  const source = readFileSync(
    path.join(
      __dirname,
      "../../src/live/authority/authorityNotificationService.js"
    ),
    "utf8"
  );

  assert.equal(
    /fetch\s*\(|Resend|SendGrid|nodemailer|smtp|PushManager|serviceWorker|navigator/i.test(
      source
    ),
    false
  );
  assert.equal(/Date\.now|new Date\s*\(/.test(source), false);
  assert.equal(/Math\.random|randomBytes|randomUUID/.test(source), false);
});
