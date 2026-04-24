const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  evaluateLiveAbsenceSession,
} = require("../../src/live/absence/liveAbsenceEvaluator");
const {
  createDashboardLiveProjectionV1,
} = require("../../src/live/liveDashboardProjection");
const { getLiveFeedEvents } = require("../../src/live/liveEventBus");
const {
  createLiveGovernanceGateway,
} = require("../../src/live/liveGovernanceGateway");
const { LiveSessionStore } = require("../../src/live/liveSessionStore");
const { createActionRequest } = require("../../src/entities/action_request");

function createClock() {
  let tick = 0;
  return () => {
    tick += 1;
    return `2026-04-24T11:00:${String(tick).padStart(2, "0")}.000Z`;
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

function withStore(callback) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a4-absence-"));
  try {
    const store = new LiveSessionStore({
      rootDirectory: path.join(tempRoot, ".meridian", "live-sessions"),
      now: createClock(),
      idGenerator: createIdGenerator(),
    });
    const created = store.createSession({ session_id: "session-a4-absence" });
    assert.equal(created.ok, true, created.issues.join("\n"));
    return callback(store, tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function createDelta(absenceInput) {
  const entity = createActionRequest({
    entity_id: "action-a4-utility",
    org_id: "fortworth-dev",
    name: "A4 live utility action",
    status: "requested",
  });

  return {
    version: "meridian.v2.entityDelta.v1",
    delta_id: "delta-a4-utility",
    session_id: "session-a4-absence",
    timestamp: "2026-04-24T11:00:00.000Z",
    operation: "proposed_creation",
    entity_type: "action_request",
    entity_id: entity.entity_id,
    entity,
    source: {
      type: "live_gateway",
      ref: "tests/live/liveAbsenceEvaluator.test.js",
    },
    governance_context: {
      absence_inputs: {
        utility_conflict_requires_authority_or_evidence: absenceInput,
      },
      request: {
        kind: "command_request",
        org_id: "fortworth-dev",
        entity_ref: {
          entity_id: entity.entity_id,
          entity_type: "action_request",
        },
        authority_context: {
          resolved: true,
          requested_by_role: "utility_coordinator",
          required_approvals: ["utility_owner"],
          resolved_approvals: ["utility_owner"],
          missing_approvals: [],
        },
        evidence_context: {
          required_count: 1,
          present_count: 1,
          missing_types: [],
        },
        confidence_context: null,
        candidate_signal_patch: null,
        raw_subject: "constellation.commands.fortworth-dev.action-a4-utility",
      },
    },
    authority_context: {},
  };
}

function appendDeltaThroughGateway(store, absenceInput) {
  const gateway = createLiveGovernanceGateway({
    store,
    now: () => "2026-04-24T11:01:00.000Z",
    idGenerator: createIdGenerator(),
    evaluateGovernanceRequest() {
      return {
        decision: "ALLOW",
        reason: "a4_test_allow",
        runtimeSubset: {
          civic: {},
        },
      };
    },
  });
  const result = gateway.evaluate(createDelta(absenceInput));
  assert.equal(result.ok, true, result.issues.join("\n"));
  return result;
}

test("live absence evaluator: reads current records and derives findings from session state", () =>
  withStore((store) => {
    appendDeltaThroughGateway(store, {
      touches_utility_asset: true,
      authority_or_evidence_present: false,
    });

    const result = evaluateLiveAbsenceSession({
      store,
      session_id: "session-a4-absence",
    });

    assert.equal(result.status, "PASS", result.issues.join("\n"));
    assert.equal(result.findings.length, 1);
    assert.equal(
      result.findings[0].rule_id,
      "utility_conflict_requires_authority_or_evidence"
    );
    assert.equal(result.findings[0].origin, "live_computed");
    assert.equal(result.state.entity_deltas.length, 1);
    assert.equal(result.state.governance_evaluations.length, 1);
  }));

test("live absence evaluator: appends absence.finding.created and event bus retrieves it", () =>
  withStore((store) => {
    appendDeltaThroughGateway(store, {
      touches_utility_asset: true,
      authority_or_evidence_present: false,
    });

    const result = evaluateLiveAbsenceSession({
      store,
      session_id: "session-a4-absence",
    });
    const events = getLiveFeedEvents({
      store,
      session_id: "session-a4-absence",
    });

    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].kind, "absence.finding.created");
    assert.ok(
      events.events.some((event) => event.kind === "absence.finding.created")
    );
  }));

test("live absence evaluator: dashboard projection can include latest live absence", () =>
  withStore((store) => {
    appendDeltaThroughGateway(store, {
      touches_utility_asset: true,
      authority_or_evidence_present: false,
    });
    const result = evaluateLiveAbsenceSession({
      store,
      session_id: "session-a4-absence",
    });
    const session = store.loadSession("session-a4-absence").session;
    const projection = createDashboardLiveProjectionV1({
      session,
      skins: {
        outputs: {
          permitting: {
            label: "Permitting snapshot",
          },
        },
      },
    }).projection;

    assert.equal(projection.latest.absence.finding_id, result.findings[0].finding_id);
    assert.equal(projection.latest.absence.origin, "live_computed");
    assert.deepEqual(projection.foreman_context_seed.latest_absence_refs, [
      result.findings[0].finding_id,
    ]);
    assert.deepEqual(projection.skins.outputs, {
      permitting: {
        label: "Permitting snapshot",
      },
    });
  }));

test("live absence evaluator: snapshot Absence Lens and live absence are distinguishable", () =>
  withStore((store) => {
    appendDeltaThroughGateway(store, {
      touches_utility_asset: true,
      authority_or_evidence_present: false,
    });
    const result = evaluateLiveAbsenceSession({
      store,
      session_id: "session-a4-absence",
    });

    assert.equal(result.findings[0].origin, "live_computed");
    assert.equal(result.events[0].kind, "absence.finding.created");
  }));

test("live absence evaluator: missing inputs produce HOLD posture", () =>
  withStore((store) => {
    appendDeltaThroughGateway(store, {
      touches_utility_asset: true,
    });

    const result = evaluateLiveAbsenceSession({
      store,
      session_id: "session-a4-absence",
    });
    const events = getLiveFeedEvents({
      store,
      session_id: "session-a4-absence",
    });

    assert.equal(result.status, "HOLD");
    assert.equal(result.findings.length, 0);
    assert.equal(result.holds.length, 1);
    assert.ok(events.events.some((event) => event.kind === "hold.raised"));
  }));

test("live absence evaluator: second run does not blindly duplicate findings", () =>
  withStore((store) => {
    appendDeltaThroughGateway(store, {
      touches_utility_asset: true,
      authority_or_evidence_present: false,
    });

    const first = evaluateLiveAbsenceSession({
      store,
      session_id: "session-a4-absence",
    });
    const second = evaluateLiveAbsenceSession({
      store,
      session_id: "session-a4-absence",
    });
    const events = getLiveFeedEvents({
      store,
      session_id: "session-a4-absence",
    }).events.filter((event) => event.kind === "absence.finding.created");

    assert.equal(first.events.length, 1);
    assert.equal(second.events.length, 0);
    assert.equal(events.length, 1);
  }));

test("live absence evaluator: no dashboard import, external API, Foreman, city seed, or replay behavior", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/absence/liveAbsenceEvaluator.js"),
    "utf8"
  );

  assert.equal(/require\(["'][^"']*(dashboard|src[\\/]skins|nats)/.test(source), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(source), false);
  assert.equal(/OpenAI|Whisper|Auth0|OpenFGA/i.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
  assert.equal(/citySeed|corridor\.generated|constellation\.replay/i.test(source), false);
});
