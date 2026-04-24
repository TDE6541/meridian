const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createLiveGovernanceGateway,
} = require("../../src/live/liveGovernanceGateway");
const { LiveSessionStore } = require("../../src/live/liveSessionStore");
const { createInspection } = require("../../src/entities/inspection");

function createClock() {
  let tick = 0;
  return () => {
    tick += 1;
    return `2026-04-24T10:00:${String(tick).padStart(2, "0")}.000Z`;
  };
}

function createIdGenerator() {
  let tick = 0;
  return (prefix, id) => {
    if (id) {
      return `${prefix}-${id}`;
    }

    tick += 1;
    return `${prefix}-${tick}`;
  };
}

function createStore(rootDirectory) {
  return new LiveSessionStore({
    rootDirectory,
    now: createClock(),
    idGenerator: createIdGenerator(),
  });
}

function createGovernanceRequest(entity, authorityContext = {}) {
  return {
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: entity.entity_id,
      entity_type: "inspection",
    },
    authority_context: {
      resolved: true,
      requested_by_role: "fire_inspector",
      required_approvals: ["fire_department"],
      resolved_approvals: ["fire_department"],
      missing_approvals: [],
      ...authorityContext,
    },
    evidence_context: {
      required_count: 1,
      present_count: 1,
      missing_types: [],
    },
    confidence_context: null,
    candidate_signal_patch: null,
    raw_subject: `constellation.commands.fortworth-dev.${entity.entity_id}`,
  };
}

function createDelta(overrides = {}) {
  const entity =
    overrides.entity ||
    createInspection({
      entity_id: "inspection-a2-gateway",
      org_id: "fortworth-dev",
      name: "A2 gateway inspection",
      status: "passed",
    });

  return {
    version: "meridian.v2.entityDelta.v1",
    delta_id: "delta-a2-gateway",
    session_id: "session-gateway",
    timestamp: "2026-04-24T10:00:00.000Z",
    operation: "state_transition",
    entity_type: "inspection",
    entity_id: entity.entity_id,
    entity,
    source: {
      type: "live_gateway",
      ref: "tests/live/liveGovernanceGateway.test.js",
    },
    governance_context: {
      request: createGovernanceRequest(entity),
    },
    authority_context: {},
    ...overrides,
  };
}

function withStore(callback) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-gateway-"));
  try {
    const store = createStore(path.join(tempRoot, ".meridian", "live-sessions"));
    const created = store.createSession({ session_id: "session-gateway" });
    assert.equal(created.ok, true, created.issues.join("\n"));
    return callback(store, tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

test("live governance gateway: valid entity delta produces governance result and live event", () =>
  withStore((store) => {
    const gateway = createLiveGovernanceGateway({
      store,
      now: () => "2026-04-24T10:01:00.000Z",
      idGenerator: createIdGenerator(),
    });

    const result = gateway.evaluate(createDelta());
    const records = store.listRecords("session-gateway").records;

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.governance_evaluation.version, "meridian.v2.liveGovernanceEvaluation.v1");
    assert.equal(result.governance_evaluation.governance_result.decision, "ALLOW");
    assert.deepEqual(
      result.events.map((event) => event.kind),
      ["entity.delta.accepted", "governance.evaluated"]
    );
    assert.equal(records.length, 2);
  }));

test("live governance gateway: malformed payload returns structured HOLD/BLOCK", () =>
  withStore((store) => {
    const gateway = createLiveGovernanceGateway({
      store,
      now: () => "2026-04-24T10:01:00.000Z",
    });

    const result = gateway.evaluate(
      {
        version: "meridian.v2.entityDelta.v1",
        session_id: "session-gateway",
      },
      { session_id: "session-gateway" }
    );

    assert.equal(result.ok, false);
    assert.equal(result.status, "HOLD");
    assert.equal(result.decision, "BLOCK");
    assert.equal(result.reason, "entity_delta_invalid");
    assert.match(result.issues.join("\n"), /delta_id/);
    assert.deepEqual(result.events.map((event) => event.kind), ["error.hold"]);
  }));

test("live governance gateway: governance runtime seam is called through DI", () =>
  withStore((store) => {
    let calledWith = null;
    const gateway = createLiveGovernanceGateway({
      store,
      now: () => "2026-04-24T10:01:00.000Z",
      evaluateGovernanceRequest(request) {
        calledWith = request;
        return {
          decision: "ALLOW",
          reason: "di_allow",
          runtimeSubset: {
            civic: {},
          },
        };
      },
    });

    const result = gateway.evaluate(createDelta());

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(calledWith.kind, "command_request");
    assert.equal(calledWith.entity_ref.entity_id, "inspection-a2-gateway");
    assert.equal(result.governance_evaluation.governance_result.reason, "di_allow");
  }));

test("live governance gateway: authority context is preserved and evaluated when supplied", () =>
  withStore((store) => {
    const entity = createInspection({
      entity_id: "inspection-a2-authority",
      org_id: "fortworth-dev",
      name: "A2 authority inspection",
      status: "passed",
    });
    const authorityContext = {
      domain_context: {
        domain_id: "inspection_resolution",
        role_id: "city_manager",
        requester_org_id: "fw_city_manager",
        subject_department_id: "fire",
        jurisdiction_id: "city",
        evaluation_time: "2026-04-24T10:00:00.000Z",
        authority_grant: {
          status: "active",
          expires_at: "2026-12-31T00:00:00.000Z",
          jurisdiction: "city",
          scope_of_authority: ["inspection_resolution"],
          granted_by_entity_id: "decision-record-a2-authority",
          delegation_chain_ids: ["grant-root"],
          supersedes_grant_ids: [],
        },
      },
    };
    const gateway = createLiveGovernanceGateway({
      store,
      now: () => "2026-04-24T10:01:00.000Z",
      idGenerator: createIdGenerator(),
    });

    const result = gateway.evaluate(
      createDelta({
        delta_id: "delta-a2-authority",
        entity_id: entity.entity_id,
        entity,
        governance_context: {
          request: createGovernanceRequest(entity, authorityContext),
        },
        authority_context: authorityContext,
      })
    );

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(
      result.governance_evaluation.authority.authority_resolution.decision,
      "ALLOW"
    );
    assert.ok(result.events.some((event) => event.kind === "authority.evaluated"));
  }));

test("live governance gateway: forensic receipt is linked only when approved writer records", () =>
  withStore((store) => {
    const gateway = createLiveGovernanceGateway({
      store,
      now: () => "2026-04-24T10:01:00.000Z",
      idGenerator: createIdGenerator(),
      forensicWriter: {
        recordGovernanceResult(input) {
          assert.equal(input.stableRefs.governanceEntryId.includes("governance"), true);
          return {
            status: "RECORDED",
            entryRefs: ["forensic-gov-a2"],
            warnings: [],
          };
        },
      },
    });

    const result = gateway.evaluate(createDelta());

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.governance_evaluation.forensicReceiptRef, "forensic-gov-a2");
    assert.ok(result.events.some((event) => event.kind === "forensic.receipt"));
  }));

test("live governance gateway: no forensic receipt is fabricated when no writer is supplied", () =>
  withStore((store) => {
    const gateway = createLiveGovernanceGateway({
      store,
      now: () => "2026-04-24T10:01:00.000Z",
    });

    const result = gateway.evaluate(createDelta());

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(result.governance_evaluation.forensicReceiptRef, null);
    assert.equal(result.events.some((event) => event.kind === "forensic.receipt"), false);
  }));

test("live governance gateway: no NATS, dashboard, external API, or Foreman behavior is introduced", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/liveGovernanceGateway.js"),
    "utf8"
  );

  assert.equal(/require\(["'][^"']*dashboard/.test(source), false);
  assert.equal(/require\(["'][^"']*nats/.test(source), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(source), false);
  assert.equal(/OpenAI|Auth0|OpenFGA|Whisper/i.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
});
