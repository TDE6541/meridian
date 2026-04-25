const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const {
  CITY_SEED_MANIFEST_CONTRACT_VERSION,
  createFortWorthSeedManifest,
  validateCitySeedManifestV1,
} = require("../../src/live/cityData/fortWorthSeedManifest");

const repoRoot = path.join(__dirname, "../..");

function readFixture() {
  return JSON.parse(
    readFileSync(
      path.join(
        repoRoot,
        "tests/fixtures/city-data/fort-worth/fort-worth-seed-manifest.sample.json"
      ),
      "utf8"
    )
  );
}

test("fort worth seed manifest: default and fixture validate", () => {
  const result = createFortWorthSeedManifest();
  const fixture = readFixture();

  assert.equal(result.ok, true, result.issues.join("\n"));
  assert.equal(result.manifest.version, CITY_SEED_MANIFEST_CONTRACT_VERSION);
  assert.equal(validateCitySeedManifestV1(fixture).valid, true);
});

test("fort worth seed manifest: source refs exist and include limitations", () => {
  const manifest = createFortWorthSeedManifest().manifest;

  assert.ok(manifest.source_refs.length >= 5);
  assert.ok(
    manifest.source_refs.some(
      (sourceRef) => sourceRef.ref_id === "repo.fort_worth_proof_fixtures"
    )
  );
  assert.ok(
    manifest.source_refs.some(
      (sourceRef) => sourceRef.ref_id === "manual.demo_seed_placeholder"
    )
  );

  for (const sourceRef of manifest.source_refs) {
    assert.ok(sourceRef.limitations.length > 0, sourceRef.ref_id);
    for (const sourcePath of sourceRef.paths) {
      assert.equal(
        existsSync(path.join(repoRoot, sourcePath)),
        true,
        `${sourceRef.ref_id} path missing: ${sourcePath}`
      );
    }
  }
});

test("fort worth seed manifest: explicit no-live and no-automation flags exist", () => {
  const manifest = createFortWorthSeedManifest().manifest;

  assert.equal(manifest.not_live_city_integration, true);
  assert.equal(manifest.not_official_city_record, true);
  assert.equal(manifest.no_accela_automation, true);
  assert.equal(manifest.no_gis_automation, true);
  assert.ok(
    manifest.limitations.some((limitation) =>
      /not a live Fort Worth city integration/i.test(limitation)
    )
  );
});

test("fort worth seed manifest: malformed manifests fail closed", () => {
  const manifest = createFortWorthSeedManifest().manifest;
  const malformed = {
    ...manifest,
    not_live_city_integration: false,
    source_refs: [],
  };
  const validation = validateCitySeedManifestV1(malformed);

  assert.equal(validation.valid, false);
  assert.match(validation.issues.join("\n"), /not_live_city_integration/);
  assert.match(validation.issues.join("\n"), /source_refs/);
});

test("fort worth seed manifest: no network, api, or official-record behavior", () => {
  const source = readFileSync(
    path.join(repoRoot, "src/live/cityData/fortWorthSeedManifest.js"),
    "utf8"
  );
  const manifest = createFortWorthSeedManifest().manifest;

  assert.equal(/fetch\s*\(|require\(["']node:(http|https)["']\)/i.test(source), false);
  assert.equal(/axios|Socrata|api\.fortworth|One Address|open data/.test(source), false);
  assert.equal(manifest.not_official_city_record, true);
  assert.equal(
    manifest.limitations.some((limitation) => /official city record/i.test(limitation)),
    true
  );
});
