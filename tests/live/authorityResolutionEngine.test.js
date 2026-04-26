const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
} = require("../../src/live/authority/authorityContracts");
const {
  evaluateAuthorityResolutions,
} = require("../../src/live/authority/authorityResolutionEngine");

function createFinding(overrides = {}) {
  return {
    version: "meridian.v2.liveAbsenceFinding.v1",
    finding_id: "absence-1",
    session_id: "session-g2",
    absence_type: "authority_evidence_missing",
    severity: "HOLD",
    entity_refs: ["entity-1"],
    source_refs: ["record:1", "delta:1"],
    governance_ref: "governance-1",
    missing_evidence: ["authority_evidence_missing"],
    origin: "live_computed",
    ...overrides,
  };
}

function createExistingRequest(overrides = {}) {
  return {
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
    request_id: "ARR-9999",
    source_absence_id: "other-absence",
    source_governance_evaluation: "governance-existing",
    required_authority_role: "public_works_director",
    required_authority_department: "public_works",
    resolution_type: "approval",
    binding_context: {},
    expiry: "2026-04-25T13:00:00.000Z",
    status: "pending",
    forensic_receipt_id: null,
    ...overrides,
  };
}

test("authority resolution engine: authority-resolvable absence creates pending request", () => {
  const result = evaluateAuthorityResolutions({
    session_id: "session-g2",
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [createFinding()],
    existing_requests: [],
    governance_state: {},
  });

  assert.equal(result.status, "PASS", result.holds.map((hold) => hold.reason).join("\n"));
  assert.equal(result.generated_requests.length, 1);
  assert.equal(result.generated_requests[0].status, "pending");
  assert.equal(result.generated_requests[0].request_id, "ARR-0001");
  assert.equal(result.generated_requests[0].contract, AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION);
  assert.equal(result.generated_requests[0].forensic_receipt_id, null);
});

test("authority resolution engine: non-resolvable absence is skipped", () => {
  const result = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [
      createFinding({
        finding_id: "absence-data-gap",
        absence_type: "data_gap",
        missing_evidence: ["data_gap"],
      }),
    ],
    existing_requests: [],
    governance_state: {},
  });

  assert.equal(result.generated_requests.length, 0);
  assert.equal(result.skipped_findings.length, 1);
  assert.equal(
    result.skipped_findings[0].reason,
    "known_non_authority_resolvable_absence"
  );
});

test("authority resolution engine: severity below threshold is skipped deterministically", () => {
  const result = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    resolution_threshold: "HOLD",
    absence_findings: [createFinding({ severity: "GAP" })],
    existing_requests: [],
    governance_state: {},
  });

  assert.equal(result.generated_requests.length, 0);
  assert.equal(result.holds.length, 0);
  assert.equal(result.skipped_findings[0].reason, "below_resolution_threshold");
});

test("authority resolution engine: missing or unknown absence type produces HOLD", () => {
  const missing = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [
      createFinding({
        absence_type: undefined,
        missing_evidence: undefined,
      }),
    ],
    existing_requests: [],
    governance_state: {},
  });
  const unknown = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [
      createFinding({
        absence_type: "permit_or_inspection_authority_evidence_ref",
        missing_evidence: ["permit_or_inspection_authority_evidence_ref"],
      }),
    ],
    existing_requests: [],
    governance_state: {},
  });

  assert.equal(missing.status, "HOLD");
  assert.equal(missing.holds[0].code, "missing_absence_type");
  assert.equal(unknown.status, "HOLD");
  assert.equal(unknown.holds[0].code, "unknown_absence_type");
});

test("authority resolution engine: duplicate pending request for same absence prevents new request", () => {
  const result = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [createFinding()],
    existing_requests: [
      createExistingRequest({
        request_id: "ARR-0009",
        source_absence_id: "absence-1",
        status: "pending",
      }),
    ],
    governance_state: {},
  });

  assert.equal(result.generated_requests.length, 0);
  assert.equal(result.skipped_findings[0].reason, "duplicate_pending_request");
});

test("authority resolution engine: deterministic request IDs are produced", () => {
  const result = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [
      createFinding({ finding_id: "absence-1" }),
      createFinding({
        finding_id: "absence-2",
        absence_type: "public_notice_missing",
        missing_evidence: ["public_notice_missing"],
      }),
    ],
    existing_requests: [],
    governance_state: {},
  });

  assert.deepEqual(
    result.generated_requests.map((request) => request.request_id),
    ["ARR-0001", "ARR-0002"]
  );
});

test("authority resolution engine: request ID generation skips existing IDs", () => {
  const result = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [createFinding({ finding_id: "absence-new" })],
    existing_requests: [
      createExistingRequest({
        request_id: "ARR-0001",
        source_absence_id: "absence-old",
        status: "approved",
      }),
    ],
    governance_state: {},
  });

  assert.equal(result.generated_requests.length, 1);
  assert.equal(result.generated_requests[0].request_id, "ARR-0002");
});

test("authority resolution engine: expiry is computed from explicit current time only", () => {
  const result = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [createFinding()],
    existing_requests: [],
    governance_state: {},
  });
  const noTime = evaluateAuthorityResolutions({
    absence_findings: [createFinding()],
    existing_requests: [],
    governance_state: {},
  });

  assert.equal(result.generated_requests[0].expiry, "2026-04-25T13:00:00.000Z");
  assert.equal(noTime.status, "HOLD");
  assert.equal(noTime.holds[0].code, "current_time_required");
});

test("authority resolution engine: conflicting current time inputs produce HOLD", () => {
  const result = evaluateAuthorityResolutions(
    {
      current_time: "2026-04-25T12:00:00.000Z",
      absence_findings: [createFinding()],
      existing_requests: [],
      governance_state: {},
    },
    {
      currentTime: "2026-04-25T12:01:00.000Z",
    }
  );

  assert.equal(result.status, "HOLD");
  assert.equal(result.generated_requests.length, 0);
  assert.equal(result.holds[0].code, "current_time_conflict");
});

test("authority resolution engine: input objects are not mutated", () => {
  const input = {
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [createFinding()],
    existing_requests: [],
    governance_state: {
      evaluation_id: "governance-state-1",
    },
  };
  const before = JSON.parse(JSON.stringify(input));

  evaluateAuthorityResolutions(input);

  assert.deepEqual(input, before);
});

test("authority resolution engine: generated request includes source, entity, and governance refs", () => {
  const result = evaluateAuthorityResolutions({
    current_time: "2026-04-25T12:00:00.000Z",
    absence_findings: [
      createFinding({
        governance_ref: undefined,
      }),
    ],
    existing_requests: [],
    governance_state: {
      evaluation_id: "governance-from-state",
    },
  });
  const context = result.generated_requests[0].binding_context;

  assert.deepEqual(context.entity_refs, ["entity-1"]);
  assert.deepEqual(context.source_refs, ["record:1", "delta:1"]);
  assert.equal(context.governance_ref, "governance-from-state");
  assert.equal(result.generated_requests[0].source_governance_evaluation, "governance-from-state");
});

test("authority resolution engine: no LiveFeedEvent kind widening, network, auth, or Foreman behavior exists", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/authority/authorityResolutionEngine.js"),
    "utf8"
  );

  assert.equal(/liveFeedEvent|LIVE_FEED_EVENT_KINDS/.test(source), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(source), false);
  assert.equal(/OpenFGA|Auth0|Whisper|OpenAI/i.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
});
