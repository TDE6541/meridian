const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  createFortWorthSeedManifest,
} = require("../../src/live/cityData/fortWorthSeedManifest");
const {
  createFortWorthSeedPack,
  validateFortWorthSeedPack,
} = require("../../src/live/cityData/fortWorthSeedPack");
const { createEntityDeltaV1 } = require("../../src/live/liveEntityDelta");

const repoRoot = path.join(__dirname, "../..");

function createTestDelta(seedEntity) {
  return createEntityDeltaV1({
    delta_id: `delta-test-${seedEntity.entity_id}`,
    session_id: "session-a6-seed-pack",
    timestamp: "2026-04-24T00:00:00.000Z",
    operation: "proposed_creation",
    entity_type: seedEntity.entity_type,
    entity_id: seedEntity.entity_id,
    entity: seedEntity.entity,
    source: {
      type: "city_seed",
      ref: `test#${seedEntity.entity_id}`,
    },
    governance_context: {
      request: {
        kind: "command_request",
        org_id: seedEntity.entity.org_id,
        entity_ref: {
          entity_id: seedEntity.entity_id,
          entity_type: seedEntity.entity_type,
        },
        authority_context: {
          resolved: true,
          requested_by_role: "local_demo_seed_pack_test",
          required_approvals: [],
          resolved_approvals: [],
          missing_approvals: [],
        },
        evidence_context: {
          required_count: 1,
          present_count: 1,
          missing_types: [],
        },
        confidence_context: null,
        candidate_signal_patch: null,
        raw_subject: `live://city-seed/test/${seedEntity.entity_type}/${seedEntity.entity_id}`,
      },
    },
    authority_context: {},
  });
}

test("fort worth seed pack: validates against manifest source refs", () => {
  const manifest = createFortWorthSeedManifest().manifest;
  const packResult = createFortWorthSeedPack({ manifest });

  assert.equal(packResult.ok, true, packResult.issues.join("\n"));
  assert.equal(
    validateFortWorthSeedPack(packResult.seed_pack, manifest).valid,
    true
  );
  assert.equal(packResult.seed_pack.manifest_id, manifest.manifest_id);

  const manifestRefIds = new Set(manifest.source_refs.map((sourceRef) => sourceRef.ref_id));
  for (const seedEntity of packResult.seed_pack.seed_entities) {
    assert.ok(seedEntity.source_ref_ids.length > 0);
    assert.ok(seedEntity.source_ref_ids.every((sourceRefId) => manifestRefIds.has(sourceRefId)));
  }
});

test("fort worth seed pack: includes corridor-ready seed entities", () => {
  const pack = createFortWorthSeedPack().seed_pack;
  const entityTypes = new Set(pack.seed_entities.map((seedEntity) => seedEntity.entity_type));

  assert.equal(entityTypes.has("corridor_zone"), true);
  assert.equal(entityTypes.has("utility_asset"), true);
  assert.equal(entityTypes.has("organization"), true);
  assert.equal(entityTypes.has("authority_grant"), true);
});

test("fort worth seed pack: seed entities validate through EntityDeltaV1", () => {
  const pack = createFortWorthSeedPack().seed_pack;
  const deltaResults = pack.seed_entities.map(createTestDelta);

  assert.ok(deltaResults.length > 0);
  assert.deepEqual(
    deltaResults.map((result) => result.ok),
    deltaResults.map(() => true),
    deltaResults.flatMap((result) => result.issues).join("\n")
  );
});

test("fort worth seed pack: limitations are preserved", () => {
  const pack = createFortWorthSeedPack().seed_pack;

  assert.equal(pack.not_live_city_integration, true);
  assert.equal(pack.not_official_city_record, true);
  assert.equal(pack.no_accela_automation, true);
  assert.equal(pack.no_gis_automation, true);
  assert.ok(pack.limitations.length >= 2);
  assert.ok(
    pack.seed_entities.every((seedEntity) => seedEntity.limitations.length > 0)
  );
});

test("fort worth seed pack: no real permit, parcel, coordinate, or automation ids are asserted", () => {
  const pack = createFortWorthSeedPack().seed_pack;

  for (const seedEntity of pack.seed_entities) {
    assert.match(seedEntity.entity_id, /^local-demo-/);
    assert.equal(/permit|parcel|coordinate|latitude|longitude/i.test(seedEntity.entity_id), false);
    assert.equal(/accela|gis/i.test(seedEntity.entity_id), false);
  }
});

test("fort worth seed pack: no external api or live integration behavior", () => {
  const source = readFileSync(
    path.join(repoRoot, "src/live/cityData/fortWorthSeedPack.js"),
    "utf8"
  );

  assert.equal(/fetch\s*\(|require\(["']node:(http|https)["']\)/i.test(source), false);
  assert.equal(/require\(["'][^"']*(dashboard|nats|src[\\/]skins)/.test(source), false);
  assert.equal(/OpenAI|Whisper|Auth0|OpenFGA|Socrata|api\.fortworth|One Address|open data/.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
});
