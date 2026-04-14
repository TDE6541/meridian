const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_PATH = path.join(__dirname, "..", "package.json");
const CONSTELLATION_PATH = path.join(
  __dirname,
  "..",
  "src",
  "config",
  "constellation.js"
);

const EXPECTED_PACKAGE_KEYS = [
  "description",
  "license",
  "name",
  "repository",
  "scripts",
  "version",
].sort();

const EXPECTED_CONSTELLATION_EXPORTS = [
  "CONNECTION_CONFIG",
  "DISCLOSURE_EVENTS",
  "EVIDENCE_EVENTS",
  "GOVERNANCE_EVENTS",
  "buildDisclosureSubject",
  "buildEvidenceSubject",
  "buildGovernanceSubject",
].sort();

test("package.json stays at the locked minimum surface", () => {
  assert.equal(fs.existsSync(PACKAGE_PATH), true);

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));

  assert.deepEqual(Object.keys(packageJson).sort(), EXPECTED_PACKAGE_KEYS);
  assert.deepEqual(packageJson.scripts, {
    test: "node --test tests/**/*.test.js",
  });
  assert.equal(
    Object.prototype.hasOwnProperty.call(packageJson, "dependencies"),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(packageJson, "devDependencies"),
    false
  );
});

test("constellation config exports exactly the approved Wave 1 surface", () => {
  const constellation = require("../src/config/constellation.js");

  assert.deepEqual(
    Object.keys(constellation).sort(),
    EXPECTED_CONSTELLATION_EXPORTS
  );
});

test("constellation builders stay on the three approved Meridian stream families", () => {
  const constellation = require("../src/config/constellation.js");

  assert.equal(
    constellation.buildGovernanceSubject("org", "entity", "decision"),
    "constellation.governance.org.entity.decision"
  );
  assert.equal(
    constellation.buildEvidenceSubject("org", "entity", "linked"),
    "constellation.evidence.org.entity.linked"
  );
  assert.equal(
    constellation.buildDisclosureSubject("org", "entity", "notice-issued"),
    "constellation.disclosures.org.entity.notice-issued"
  );
});

test("constellation config omits the upstream helper and runtime messaging surfaces", () => {
  const constellation = require("../src/config/constellation.js");
  const sourceText = fs.readFileSync(CONSTELLATION_PATH, "utf8");

  assert.equal(Object.prototype.hasOwnProperty.call(constellation, "ENTITIES"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(constellation, "EVENTS"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(constellation, "TELEMETRY"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(constellation, "COMMANDS"), false);
  assert.equal(
    Object.prototype.hasOwnProperty.call(constellation, "GLOBAL_STATE"),
    false
  );
  assert.match(sourceText, /^((?!\bconnect\b).)*$/s);
  assert.match(sourceText, /^((?!\bpublish\b).)*$/s);
  assert.match(sourceText, /^((?!\bsubscribe\b).)*$/s);
});
