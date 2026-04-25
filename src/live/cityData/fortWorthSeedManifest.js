const {
  RESERVED_CONTRACT_VERSIONS,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");

const CITY_SEED_MANIFEST_CONTRACT_VERSION =
  RESERVED_CONTRACT_VERSIONS.CITY_SEED_MANIFEST;
const FORT_WORTH_SEED_MANIFEST_ID =
  "fort-worth-local-demo-seed-manifest-v1";
const FORT_WORTH_SEED_MANIFEST_COMPILED_AT =
  "2026-04-24T00:00:00.000Z";
const SOURCE_MANIFESTED_LOCAL_DEMO_SEED =
  "source-manifested local demo seed";

const REQUIRED_LIMITATIONS = Object.freeze([
  "Local demo seed only; not a live Fort Worth city integration.",
  "Not an official city record and not a permit, parcel, or utility system of record.",
  "No accela automation, lookup, import, or sync is performed.",
  "No gis automation, coordinates, parcel lookup, or geometry import is performed.",
  "Source expansion for official permit and utility records is intentionally deferred.",
]);

const DEFAULT_FORT_WORTH_SOURCE_REFS = Object.freeze([
  {
    ref_id: "repo.wave8.corridor_scenarios",
    category: "repo.wave8.corridor_scenarios",
    source_type: "repo_fixture",
    label: "Wave 8 corridor scenario fixtures and spec",
    paths: Object.freeze([
      "docs/specs/WAVE8_CORRIDOR_SCENARIO.md",
      "tests/fixtures/scenarios",
    ]),
    retrieval_date: null,
    reference_date: "2026-04-21",
    limitations: Object.freeze([
      "Wave 8 corridor scenarios are frozen repo fixtures, not live source pulls.",
      "Scenario data is synthetic and hand-curated for Meridian proof behavior.",
    ]),
  },
  {
    ref_id: "repo.wave9.dashboard_snapshots",
    category: "repo.wave9.dashboard_snapshots",
    source_type: "repo_fixture",
    label: "Wave 9 dashboard snapshot fixtures",
    paths: Object.freeze(["dashboard/public/scenarios"]),
    retrieval_date: null,
    reference_date: "2026-04-24",
    limitations: Object.freeze([
      "Dashboard snapshots are committed local artifacts.",
      "Snapshots do not imply browser-side city-data generation or live integration.",
    ]),
  },
  {
    ref_id: "repo.fort_worth_proof_fixtures",
    category: "repo.fort_worth_proof_fixtures",
    source_type: "repo_fixture",
    label: "Fort Worth proof fixtures already present in repo",
    paths: Object.freeze([
      "tests/pipeline/fixtures/fort_worth_proof/fort_worth_official_agenda_excerpt.txt",
      "tests/pipeline/fixtures/fort_worth_proof/fort_worth_official_agenda_provenance.json",
      "tests/pipeline/fixtures/fort_worth_proof/fort_worth_motion_video_excerpt.txt",
      "tests/pipeline/fixtures/fort_worth_proof/fort_worth_motion_video_provenance.json",
    ]),
    retrieval_date: "2026-04-16",
    reference_date: "2025-09-30",
    limitations: Object.freeze([
      "Repo fixtures are bounded excerpts and provenance records.",
      "Motion-video proof remains a local reconstructed fixture where marked by provenance.",
      "No fresh external source refresh is performed in Packet A6.",
    ]),
  },
  {
    ref_id: "repo.ontology",
    category: "repo.ontology",
    source_type: "repo_contract",
    label: "Meridian entity ontology and validators",
    paths: Object.freeze([
      "docs/specs/ENTITY_ONTOLOGY.md",
      "tests/entities.test.js",
      "src/entities",
    ]),
    retrieval_date: null,
    reference_date: "2026-04-24",
    limitations: Object.freeze([
      "Ontology refs describe local entity validation shape only.",
      "Ontology refs do not supply official city-system field values.",
    ]),
  },
  {
    ref_id: "manual.demo_seed_placeholder",
    category: "manual.demo_seed_placeholder",
    source_type: "manual_placeholder",
    label: "Manual local demo placeholder for missing official source expansion",
    paths: Object.freeze([]),
    retrieval_date: null,
    reference_date: "2026-04-24",
    limitations: Object.freeze([
      "Manual placeholder values are synthetic local demo values.",
      "Placeholder values must not be treated as official Fort Worth records.",
    ]),
  },
]);

function cloneJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  if (isPlainObject(value)) {
    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        clone[key] = cloneJsonValue(entry);
      }
    }
    return clone;
  }

  return value;
}

function validateStringArray(value, fieldName, issues) {
  if (!Array.isArray(value)) {
    issues.push(`${fieldName} must be an array.`);
    return;
  }

  if (!value.every(isNonEmptyString)) {
    issues.push(`${fieldName} must contain only non-empty strings.`);
  }
}

function validateNullableDate(value, fieldName, issues) {
  if (value !== null && !isNonEmptyString(value)) {
    issues.push(`${fieldName} must be null or a non-empty string.`);
  }
}

function validateSeedManifestSourceRef(sourceRef, index) {
  const issues = [];
  const prefix = `source_refs[${index}]`;

  if (!isPlainObject(sourceRef)) {
    return [`${prefix} must be a plain object.`];
  }

  for (const fieldName of ["ref_id", "category", "source_type", "label"]) {
    if (!isNonEmptyString(sourceRef[fieldName])) {
      issues.push(`${prefix}.${fieldName} must be a non-empty string.`);
    }
  }

  if (!Object.prototype.hasOwnProperty.call(sourceRef, "paths")) {
    issues.push(`${prefix}.paths is required.`);
  } else {
    validateStringArray(sourceRef.paths, `${prefix}.paths`, issues);
  }

  if (!Object.prototype.hasOwnProperty.call(sourceRef, "retrieval_date")) {
    issues.push(`${prefix}.retrieval_date is required.`);
  } else {
    validateNullableDate(sourceRef.retrieval_date, `${prefix}.retrieval_date`, issues);
  }

  if (!Object.prototype.hasOwnProperty.call(sourceRef, "reference_date")) {
    issues.push(`${prefix}.reference_date is required.`);
  } else {
    validateNullableDate(sourceRef.reference_date, `${prefix}.reference_date`, issues);
  }

  if (!Object.prototype.hasOwnProperty.call(sourceRef, "limitations")) {
    issues.push(`${prefix}.limitations is required.`);
  } else {
    validateStringArray(sourceRef.limitations, `${prefix}.limitations`, issues);
    if (Array.isArray(sourceRef.limitations) && sourceRef.limitations.length === 0) {
      issues.push(`${prefix}.limitations must not be empty.`);
    }
  }

  return issues;
}

function validateCitySeedManifestV1(manifest) {
  const issues = [];

  if (!isPlainObject(manifest)) {
    return createValidationResult([
      "CitySeedManifestV1 must be a plain object.",
    ]);
  }

  if (manifest.version !== CITY_SEED_MANIFEST_CONTRACT_VERSION) {
    issues.push(`version must equal ${CITY_SEED_MANIFEST_CONTRACT_VERSION}.`);
  }

  for (const fieldName of ["manifest_id", "compiled_at", "seed_classification"]) {
    if (!isNonEmptyString(manifest[fieldName])) {
      issues.push(`${fieldName} must be a non-empty string.`);
    }
  }

  for (const fieldName of [
    "not_live_city_integration",
    "not_official_city_record",
    "no_accela_automation",
    "no_gis_automation",
  ]) {
    if (manifest[fieldName] !== true) {
      issues.push(`${fieldName} must be true.`);
    }
  }

  if (!Array.isArray(manifest.source_refs)) {
    issues.push("source_refs must be an array.");
  } else if (manifest.source_refs.length === 0) {
    issues.push("source_refs must not be empty.");
  } else {
    manifest.source_refs.forEach((sourceRef, index) => {
      issues.push(...validateSeedManifestSourceRef(sourceRef, index));
    });
  }

  if (!Object.prototype.hasOwnProperty.call(manifest, "limitations")) {
    issues.push("limitations is required.");
  } else {
    validateStringArray(manifest.limitations, "limitations", issues);
    if (Array.isArray(manifest.limitations) && manifest.limitations.length === 0) {
      issues.push("limitations must not be empty.");
    }
  }

  return createValidationResult(issues);
}

function createFortWorthSeedManifest(input = {}) {
  const manifest = {
    version: CITY_SEED_MANIFEST_CONTRACT_VERSION,
    manifest_id: input.manifest_id || FORT_WORTH_SEED_MANIFEST_ID,
    compiled_at: input.compiled_at || FORT_WORTH_SEED_MANIFEST_COMPILED_AT,
    seed_classification:
      input.seed_classification || SOURCE_MANIFESTED_LOCAL_DEMO_SEED,
    not_live_city_integration: true,
    not_official_city_record: true,
    no_accela_automation: true,
    no_gis_automation: true,
    source_refs: cloneJsonValue(
      input.source_refs || DEFAULT_FORT_WORTH_SOURCE_REFS
    ),
    limitations: cloneJsonValue(input.limitations || REQUIRED_LIMITATIONS),
  };
  const validation = validateCitySeedManifestV1(manifest);

  return {
    ok: validation.valid,
    valid: validation.valid,
    manifest: validation.valid ? manifest : null,
    issues: validation.issues,
  };
}

function getDefaultFortWorthSeedManifest() {
  return createFortWorthSeedManifest().manifest;
}

module.exports = {
  CITY_SEED_MANIFEST_CONTRACT_VERSION,
  DEFAULT_FORT_WORTH_SOURCE_REFS,
  FORT_WORTH_SEED_MANIFEST_COMPILED_AT,
  FORT_WORTH_SEED_MANIFEST_ID,
  SOURCE_MANIFESTED_LOCAL_DEMO_SEED,
  createFortWorthSeedManifest,
  getDefaultFortWorthSeedManifest,
  validateCitySeedManifestV1,
};
