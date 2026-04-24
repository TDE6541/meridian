const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  DEFAULT_LIVE_ABSENCE_PROFILE_ID,
  MINIMUM_LIVE_ABSENCE_RULE_IDS,
  createDefaultLiveAbsenceProfile,
  validateLiveAbsenceProfile,
} = require("../../src/live/absence/liveAbsenceProfiles");
const { LIVE_FEED_SEVERITIES } = require("../../src/live/contracts");

test("live absence profiles: default A4 civic profile exists", () => {
  const profile = createDefaultLiveAbsenceProfile();

  assert.equal(profile.profile_id, DEFAULT_LIVE_ABSENCE_PROFILE_ID);
  assert.equal(profile.finding_version, "meridian.v2.liveAbsenceFinding.v1");
  assert.equal(validateLiveAbsenceProfile(profile).valid, true);
});

test("live absence profiles: six minimum rule ids exist", () => {
  const profile = createDefaultLiveAbsenceProfile();
  const ruleIds = profile.rules.map((rule) => rule.rule_id);

  assert.deepEqual(ruleIds, [...MINIMUM_LIVE_ABSENCE_RULE_IDS]);
});

test("live absence profiles: every rule has deterministic fields", () => {
  const profile = createDefaultLiveAbsenceProfile();

  for (const rule of profile.rules) {
    assert.equal(typeof rule.expected_signal, "string");
    assert.equal(rule.expected_signal.length > 0, true);
    assert.equal(LIVE_FEED_SEVERITIES.includes(rule.severity), true);
    assert.equal(typeof rule.resolution_path, "string");
    assert.equal(rule.resolution_path.length > 0, true);
    assert.equal(typeof rule.why_this_matters, "string");
    assert.equal(rule.why_this_matters.length > 0, true);
  }
});

test("live absence profiles: malformed profile fails closed", () => {
  const profile = createDefaultLiveAbsenceProfile();
  delete profile.rules[0].why_this_matters;

  const validation = validateLiveAbsenceProfile(profile);

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /why_this_matters/);
});

test("live absence profiles: no model, API, network, dashboard, or skins behavior", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/absence/liveAbsenceProfiles.js"),
    "utf8"
  );

  assert.equal(/require\(["'][^"']*(dashboard|src[\\/]skins|nats)/.test(source), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(source), false);
  assert.equal(/OpenAI|Whisper|Auth0|OpenFGA/i.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
});
