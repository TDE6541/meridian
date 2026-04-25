const test = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  generateFortWorthCorridor,
  validateCorridorGeneratorInput,
} = require("../../src/live/corridorGenerator");
const { getLiveFeedEvents } = require("../../src/live/liveEventBus");
const { LiveSessionStore } = require("../../src/live/liveSessionStore");

const repoRoot = path.join(__dirname, "../..");

function createClock() {
  let tick = 0;
  return () => {
    tick += 1;
    return `2026-04-24T12:00:${String(tick).padStart(2, "0")}.000Z`;
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

function readInputFixture() {
  return JSON.parse(
    readFileSync(
      path.join(
        repoRoot,
        "tests/fixtures/city-data/fort-worth/corridor-generator-input.sample.json"
      ),
      "utf8"
    )
  );
}

function withStore(callback) {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "meridian-a6-corridor-"));
  try {
    const store = new LiveSessionStore({
      rootDirectory: path.join(tempRoot, ".meridian", "live-sessions"),
      now: createClock(),
      idGenerator: createIdGenerator(),
    });
    const created = store.createSession({
      session_id: "session-a6-fort-worth-demo",
    });
    assert.equal(created.ok, true, created.issues.join("\n"));
    return callback(store, tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function allowEvaluator() {
  return {
    decision: "ALLOW",
    reason: "a6_test_allow",
    runtimeSubset: {
      civic: {},
    },
  };
}

test("corridor generator: accepts parameterized sample input", () => {
  const input = readInputFixture();
  const validation = validateCorridorGeneratorInput(input);

  assert.equal(validation.valid, true, validation.issues.join("\n"));
  assert.equal(input.utility_conflict, true);
  assert.equal(input.public_visibility, true);
  assert.equal(input.obligation_owner_present, false);
});

test("corridor generator: generated deltas validate and pass through A2 gateway", () =>
  withStore((store) => {
    const result = generateFortWorthCorridor(
      {
        ...readInputFixture(),
        store,
      },
      {
        now: () => "2026-04-24T12:30:00.000Z",
        idGenerator: createIdGenerator(),
        evaluateGovernanceRequest: allowEvaluator,
      }
    );
    const events = getLiveFeedEvents({
      store,
      session_id: "session-a6-fort-worth-demo",
    });

    assert.equal(result.ok, true, JSON.stringify(result.holds, null, 2));
    assert.ok(result.generated_deltas.length >= 7);
    assert.equal(result.gateway_results.length, result.generated_deltas.length);
    assert.ok(result.gateway_results.every((gatewayResult) => gatewayResult.ok));
    assert.ok(
      result.gateway_results.every((gatewayResult) =>
        gatewayResult.event_kinds.includes("entity.delta.accepted")
      )
    );
    assert.ok(
      result.gateway_results.every((gatewayResult) =>
        gatewayResult.event_kinds.includes("governance.evaluated")
      )
    );
    assert.ok(
      events.events.some((event) => event.kind === "cityData.seed.loaded")
    );
    assert.ok(events.events.some((event) => event.kind === "corridor.generated"));
  }));

test("corridor generator: preserves source refs, limitations, and local-demo posture", () =>
  withStore((store) => {
    const result = generateFortWorthCorridor(
      {
        ...readInputFixture(),
        store,
      },
      {
        evaluateGovernanceRequest: allowEvaluator,
      }
    );

    assert.equal(result.status, "PASS");
    assert.equal(result.manifest.not_live_city_integration, true);
    assert.equal(result.manifest.not_official_city_record, true);
    assert.equal(result.manifest.no_accela_automation, true);
    assert.equal(result.manifest.no_gis_automation, true);
    assert.ok(result.seed_summary.source_ref_ids.includes("repo.ontology"));
    assert.ok(
      result.limitations.some((limitation) => /local demo/i.test(limitation))
    );
  }));

test("corridor generator: invalid parameters return structured HOLD/BLOCK", () =>
  withStore((store) => {
    const result = generateFortWorthCorridor({
      ...readInputFixture(),
      store,
      utility_conflict: "yes",
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "HOLD");
    assert.equal(result.holds[0].posture, "BLOCK");
    assert.equal(result.holds[0].reason, "invalid_corridor_generator_input");
    assert.match(result.issues.join("\n"), /utility_conflict/);
  }));

test("corridor generator: output is parameterized by corridor name", () =>
  withStore((store) => {
    const first = generateFortWorthCorridor(
      {
        ...readInputFixture(),
        store,
      },
      {
        evaluateGovernanceRequest: allowEvaluator,
      }
    );
    const secondSession = store.createSession({ session_id: "session-a6-second" });
    assert.equal(secondSession.ok, true, secondSession.issues.join("\n"));
    const second = generateFortWorthCorridor(
      {
        ...readInputFixture(),
        store,
        session_id: "session-a6-second",
        corridor_name: "Fort Worth Local Demo East Corridor",
        emergency: false,
      },
      {
        evaluateGovernanceRequest: allowEvaluator,
      }
    );

    const firstAction = first.generated_deltas.find(
      (delta) => delta.entity_type === "action_request"
    );
    const secondAction = second.generated_deltas.find(
      (delta) => delta.entity_type === "action_request"
    );

    assert.notEqual(firstAction.entity_id, secondAction.entity_id);
    assert.notEqual(firstAction.entity.name, secondAction.entity.name);
    assert.equal(second.generated_deltas.some((delta) => delta.entity_type === "incident_observation"), false);
  }));

test("corridor generator: dashboard event rail can display A6 event kinds", () => {
  const liveTypes = readFileSync(
    path.join(repoRoot, "dashboard/src/live/liveTypes.ts"),
    "utf8"
  );
  const eventRail = readFileSync(
    path.join(repoRoot, "dashboard/src/components/LiveEventRail.tsx"),
    "utf8"
  );

  assert.match(liveTypes, /"cityData\.seed\.loaded"/);
  assert.match(liveTypes, /"corridor\.generated"/);
  assert.match(eventRail, /"cityData\.seed\.loaded": "City seed event"/);
  assert.match(eventRail, /"corridor\.generated": "Corridor event"/);
  assert.match(eventRail, /Generic live event/);
});

test("corridor generator: no external api, nats, bridge, dashboard import, replay, or foreman behavior", () => {
  const source = readFileSync(
    path.join(repoRoot, "src/live/corridorGenerator.js"),
    "utf8"
  );

  assert.equal(/fetch\s*\(|require\(["']node:(http|https)["']\)/i.test(source), false);
  assert.equal(/require\(["'][^"']*(dashboard|nats|src[\\/]skins|src[\\/]bridge)/.test(source), false);
  assert.equal(/OpenAI|Whisper|Auth0|OpenFGA|Socrata|api\.fortworth|One Address|open data/.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
  assert.equal(/constellation\.replay|constellationReplay/i.test(source), false);
});
