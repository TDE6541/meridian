const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  createDashboardLiveProjectionV1,
  validateDashboardLiveProjectionV1,
} = require("../../src/live/liveDashboardProjection");
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

function createDelta() {
  const entity = createInspection({
    entity_id: "inspection-a2-projection",
    org_id: "fortworth-dev",
    name: "A2 projection inspection",
    status: "passed",
  });

  return {
    version: "meridian.v2.entityDelta.v1",
    delta_id: "delta-a2-projection",
    session_id: "session-projection",
    timestamp: "2026-04-24T10:00:00.000Z",
    operation: "state_transition",
    entity_type: "inspection",
    entity_id: entity.entity_id,
    entity,
    source: {
      type: "live_gateway",
      ref: "tests/live/liveDashboardProjection.test.js",
    },
    governance_context: {
      request: {
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
        },
        evidence_context: {
          required_count: 1,
          present_count: 1,
          missing_types: [],
        },
        confidence_context: null,
        candidate_signal_patch: null,
        raw_subject:
          "constellation.commands.fortworth-dev.inspection-a2-projection",
      },
    },
    authority_context: {},
  };
}

function createSessionWithGatewayRecords() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a2-projection-"));
  const store = new LiveSessionStore({
    rootDirectory: path.join(tempRoot, ".meridian", "live-sessions"),
    now: createClock(),
    idGenerator: createIdGenerator(),
  });
  const session = store.createSession({ session_id: "session-projection" });
  assert.equal(session.ok, true, session.issues.join("\n"));

  const gateway = createLiveGovernanceGateway({
    store,
    now: () => "2026-04-24T10:01:00.000Z",
    idGenerator: createIdGenerator(),
  });
  const evaluated = gateway.evaluate(createDelta());
  assert.equal(evaluated.ok, true, evaluated.issues.join("\n"));

  return {
    tempRoot,
    store,
    session: store.loadSession("session-projection").session,
  };
}

test("dashboard projection: shape matches meridian.v2.dashboardLiveProjection.v1", () => {
  const { tempRoot, session } = createSessionWithGatewayRecords();
  try {
    const result = createDashboardLiveProjectionV1({ session });
    const validation = validateDashboardLiveProjectionV1(result.projection);

    assert.equal(result.ok, true, result.issues.join("\n"));
    assert.equal(validation.valid, true, validation.issues.join("\n"));
    assert.equal(
      result.projection.version,
      "meridian.v2.dashboardLiveProjection.v1"
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("dashboard projection: includes session, connection, current, entities, latest, events, and skins.outputs", () => {
  const { tempRoot, session } = createSessionWithGatewayRecords();
  try {
    const projection = createDashboardLiveProjectionV1({
      session,
      active_skin: "permitting",
    }).projection;

    assert.equal(projection.session.session_id, "session-projection");
    assert.equal(projection.connection.status, "connected");
    assert.equal(projection.current.active_skin, "permitting");
    assert.deepEqual(projection.entities.counts_by_type, { inspection: 1 });
    assert.deepEqual(projection.entities.changed_entity_ids, [
      "inspection-a2-projection",
    ]);
    assert.equal(projection.events.length, 2);
    assert.deepEqual(projection.skins.outputs, {});
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("dashboard projection: latest governance, authority, forensic, and absence placeholders exist", () => {
  const { tempRoot, session } = createSessionWithGatewayRecords();
  try {
    const projection = createDashboardLiveProjectionV1({ session }).projection;

    assert.equal(projection.latest.governance.governance_result.decision, "ALLOW");
    assert.equal(projection.latest.authority, null);
    assert.equal(projection.latest.forensic, null);
    assert.equal(projection.latest.absence, null);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("dashboard projection: foreman_context_seed exists and is inert", () => {
  const { tempRoot, session } = createSessionWithGatewayRecords();
  try {
    const projection = createDashboardLiveProjectionV1({ session }).projection;

    assert.equal(
      projection.foreman_context_seed.active_session_id,
      "session-projection"
    );
    assert.equal(
      projection.foreman_context_seed.public_boundary.mode,
      "inert_a2_projection_only"
    );
    assert.equal(
      projection.foreman_context_seed.public_boundary.no_model_api,
      true
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("dashboard projection: no src/skins or dashboard import is required", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/liveDashboardProjection.js"),
    "utf8"
  );

  assert.equal(/src[\\/]skins|require\(["'][^"']*skins/.test(source), false);
  assert.equal(/dashboard/.test(source), false);
});

test("dashboard projection: disconnected and holding connection states render without crashing", () => {
  const { tempRoot, session } = createSessionWithGatewayRecords();
  try {
    const disconnected = createDashboardLiveProjectionV1({
      session,
      connection_status: "disconnected",
    });
    const holding = createDashboardLiveProjectionV1({
      session: {
        ...session,
        status: "holding",
      },
      connection_status: "holding",
      hold_reason: "operator_review",
    });

    assert.equal(disconnected.ok, true, disconnected.issues.join("\n"));
    assert.equal(disconnected.projection.connection.status, "disconnected");
    assert.equal(holding.ok, true, holding.issues.join("\n"));
    assert.equal(holding.projection.session.status, "holding");
    assert.equal(holding.projection.connection.hold_reason, "operator_review");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
