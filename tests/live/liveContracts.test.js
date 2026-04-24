const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CONTRACT_VERSIONS,
  IMPLEMENTED_CONTRACT_VERSIONS,
  LIVE_FEED_EVENT_KINDS,
  LIVE_FEED_SEVERITIES,
  LIVE_FEED_SOURCE_TYPES,
  LIVE_FEED_VISIBILITIES,
  LIVE_SESSION_STATUSES,
  RESERVED_CONTRACT_VERSIONS,
  validateImplementedContractVersion,
  validateLiveFeedEventKind,
  validateLiveFeedSeverity,
  validateLiveFeedSource,
  validateLiveFeedVisibility,
  validateLiveSessionStatus,
} = require("../../src/live/contracts.js");

test("live contracts: exposes implemented V2-A contract version constants", () => {
  assert.equal(CONTRACT_VERSIONS.LIVE_SESSION, "meridian.v2.liveSession.v1");
  assert.equal(
    CONTRACT_VERSIONS.LIVE_SESSION_RECORD,
    "meridian.v2.liveSessionRecord.v1"
  );
  assert.equal(
    CONTRACT_VERSIONS.LIVE_FEED_EVENT,
    "meridian.v2.liveFeedEvent.v1"
  );
  assert.deepEqual(IMPLEMENTED_CONTRACT_VERSIONS, [
    "meridian.v2.liveSession.v1",
    "meridian.v2.liveSessionRecord.v1",
    "meridian.v2.liveFeedEvent.v1",
  ]);
});

test("live contracts: exposes allowed enum values", () => {
  assert.deepEqual(LIVE_SESSION_STATUSES, ["open", "holding", "closed"]);
  assert.deepEqual(LIVE_FEED_SEVERITIES, [
    "INFO",
    "WATCH",
    "GAP",
    "HOLD",
    "BLOCK",
    "REVOKE",
  ]);
  assert.deepEqual(LIVE_FEED_VISIBILITIES, [
    "internal",
    "public_safe",
    "restricted",
  ]);
  assert.deepEqual(LIVE_FEED_SOURCE_TYPES, [
    "holdpoint_artifact",
    "live_gateway",
    "absence_rule",
    "city_seed",
    "constellation_replay",
    "dashboard",
    "system",
  ]);
  assert.deepEqual(LIVE_FEED_EVENT_KINDS, [
    "session.created",
    "capture.artifact_ingested",
    "entity.delta.accepted",
    "governance.evaluated",
    "authority.evaluated",
    "forensic.receipt",
    "absence.finding.created",
    "skins.outputs.projected",
    "cityData.seed.loaded",
    "corridor.generated",
    "constellation.replay.received",
    "hold.raised",
    "error.hold",
  ]);
});

test("live contracts: unknown implemented version fails closed", () => {
  const validation = validateImplementedContractVersion(
    "meridian.v2.unknown.v1"
  );

  assert.equal(validation.valid, false);
  assert.match(validation.issues[0], /version is not allowed/);
});

test("live contracts: unknown enum values fail closed", () => {
  assert.equal(validateLiveSessionStatus("pending").valid, false);
  assert.equal(validateLiveFeedEventKind("dashboard.liveMode.enabled").valid, false);
  assert.equal(validateLiveFeedSeverity("KILL").valid, false);
  assert.equal(validateLiveFeedVisibility("public").valid, false);

  const source = validateLiveFeedSource({
    type: "foreman",
    ref: "source-1",
  });
  assert.equal(source.valid, false);
});

test("live contracts: malformed source fails closed", () => {
  const validation = validateLiveFeedSource({
    type: "system",
  });

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /source.ref/);
});

test("live contracts: reserved contract constants exist without implemented behavior", () => {
  assert.equal(
    RESERVED_CONTRACT_VERSIONS.ENTITY_DELTA,
    "meridian.v2.entityDelta.v1"
  );
  assert.equal(
    RESERVED_CONTRACT_VERSIONS.LIVE_GOVERNANCE_EVALUATION,
    "meridian.v2.liveGovernanceEvaluation.v1"
  );
  assert.equal(
    RESERVED_CONTRACT_VERSIONS.LIVE_ABSENCE_FINDING,
    "meridian.v2.liveAbsenceFinding.v1"
  );
  assert.equal(
    RESERVED_CONTRACT_VERSIONS.DASHBOARD_LIVE_PROJECTION,
    "meridian.v2.dashboardLiveProjection.v1"
  );
  assert.equal(
    RESERVED_CONTRACT_VERSIONS.CITY_SEED_MANIFEST,
    "meridian.v2.citySeedManifest.v1"
  );
  assert.equal(
    RESERVED_CONTRACT_VERSIONS.CONSTELLATION_REPLAY,
    "meridian.v2.constellationReplay.v1"
  );

  for (const version of Object.values(RESERVED_CONTRACT_VERSIONS)) {
    assert.equal(validateImplementedContractVersion(version).valid, false);
  }
});
