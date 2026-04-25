const {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");
const { validateEntityPayload } = require("../liveEntityDelta");
const { createAuthorityGrant } = require("../../entities/authority_grant");
const { createCorridorZone } = require("../../entities/corridor_zone");
const { createCriticalSite } = require("../../entities/critical_site");
const { createOrganization } = require("../../entities/organization");
const { createUtilityAsset } = require("../../entities/utility_asset");
const {
  FORT_WORTH_SEED_MANIFEST_COMPILED_AT,
  SOURCE_MANIFESTED_LOCAL_DEMO_SEED,
  getDefaultFortWorthSeedManifest,
  validateCitySeedManifestV1,
} = require("./fortWorthSeedManifest");

const FORT_WORTH_SEED_PACK_ID = "fort-worth-local-demo-seed-pack-v1";
const FORT_WORTH_LOCAL_DEMO_ORG_ID = "fortworth-local-demo";
const MANUAL_PLACEHOLDER_REF_ID = "manual.demo_seed_placeholder";
const PROOF_FIXTURE_REF_ID = "repo.fort_worth_proof_fixtures";
const ONTOLOGY_REF_ID = "repo.ontology";
const WAVE8_REF_ID = "repo.wave8.corridor_scenarios";

const SEED_ENTITY_LIMITATIONS = Object.freeze([
  "Synthetic local demo entity; not an official city record.",
  "No live city-system lookup, sync, or source refresh was performed.",
  "No permit, parcel, accela, gis, inspection, or utility asset identifier is asserted.",
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

function createSeedEntity(input) {
  return {
    seed_entity_id: `${input.entity.entity_type}:${input.entity.entity_id}`,
    entity_type: input.entity.entity_type,
    entity_id: input.entity.entity_id,
    entity: cloneJsonValue(input.entity),
    source_ref_ids: [...input.source_ref_ids],
    seed_classification: SOURCE_MANIFESTED_LOCAL_DEMO_SEED,
    limitations: cloneJsonValue(input.limitations || SEED_ENTITY_LIMITATIONS),
  };
}

function createDefaultSeedEntities() {
  return [
    createSeedEntity({
      entity: createCorridorZone({
        entity_id: "local-demo-corridor-zone-fort-worth-main",
        org_id: FORT_WORTH_LOCAL_DEMO_ORG_ID,
        name: "Fort Worth local demo corridor zone",
        status: null,
        priority: "medium",
        corridor_name: "Fort Worth local demo utility corridor",
      }),
      source_ref_ids: [WAVE8_REF_ID, PROOF_FIXTURE_REF_ID, MANUAL_PLACEHOLDER_REF_ID],
    }),
    createSeedEntity({
      entity: createUtilityAsset({
        entity_id: "local-demo-utility-asset-water-main",
        org_id: FORT_WORTH_LOCAL_DEMO_ORG_ID,
        name: "Local demo water utility asset",
        status: "operational",
        priority: "high",
        asset_context: "synthetic local demo utility conflict seed",
      }),
      source_ref_ids: [PROOF_FIXTURE_REF_ID, MANUAL_PLACEHOLDER_REF_ID],
    }),
    createSeedEntity({
      entity: createOrganization({
        entity_id: "local-demo-organization-corridor-operations",
        org_id: FORT_WORTH_LOCAL_DEMO_ORG_ID,
        name: "Local demo corridor operations organization",
        status: null,
        priority: "medium",
        org_type: "local_demo_operations",
        authorized_domains: ["utility_corridor_action"],
      }),
      source_ref_ids: [ONTOLOGY_REF_ID, MANUAL_PLACEHOLDER_REF_ID],
    }),
    createSeedEntity({
      entity: createAuthorityGrant({
        entity_id: "local-demo-authority-grant-corridor-review",
        org_id: FORT_WORTH_LOCAL_DEMO_ORG_ID,
        name: "Local demo corridor review authority context",
        status: "pending",
        priority: "medium",
        granted_role: "local_demo_corridor_reviewer",
        jurisdiction: "local_demo_jurisdiction",
        scope_of_authority: ["utility_corridor_action"],
        granted_at: null,
        expires_at: null,
        revoked_at: null,
        superseded_at: null,
        granted_by_entity_id: null,
        supersedes_grant_ids: [],
        delegation_chain_ids: [],
      }),
      source_ref_ids: [ONTOLOGY_REF_ID, MANUAL_PLACEHOLDER_REF_ID],
    }),
    createSeedEntity({
      entity: createCriticalSite({
        entity_id: "local-demo-critical-site-traffic-control",
        org_id: FORT_WORTH_LOCAL_DEMO_ORG_ID,
        name: "Local demo traffic-control critical site",
        status: null,
        priority: "medium",
        site_context: "synthetic local demo public visibility seed",
      }),
      source_ref_ids: [WAVE8_REF_ID, MANUAL_PLACEHOLDER_REF_ID],
    }),
  ];
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

function validateSeedEntity(seedEntity, index, sourceRefIds) {
  const issues = [];
  const prefix = `seed_entities[${index}]`;

  if (!isPlainObject(seedEntity)) {
    return [`${prefix} must be a plain object.`];
  }

  for (const fieldName of [
    "seed_entity_id",
    "entity_type",
    "entity_id",
    "seed_classification",
  ]) {
    if (!isNonEmptyString(seedEntity[fieldName])) {
      issues.push(`${prefix}.${fieldName} must be a non-empty string.`);
    }
  }

  if (seedEntity.seed_classification !== SOURCE_MANIFESTED_LOCAL_DEMO_SEED) {
    issues.push(`${prefix}.seed_classification must mark local demo seed.`);
  }

  if (!isPlainObject(seedEntity.entity)) {
    issues.push(`${prefix}.entity must be a plain object.`);
  } else {
    if (seedEntity.entity.entity_id !== seedEntity.entity_id) {
      issues.push(`${prefix}.entity.entity_id must match entity_id.`);
    }
    if (seedEntity.entity.entity_type !== seedEntity.entity_type) {
      issues.push(`${prefix}.entity.entity_type must match entity_type.`);
    }
    issues.push(
      ...validateEntityPayload(seedEntity.entity_type, seedEntity.entity).issues
    );
  }

  validateStringArray(seedEntity.source_ref_ids, `${prefix}.source_ref_ids`, issues);
  if (Array.isArray(seedEntity.source_ref_ids)) {
    for (const sourceRefId of seedEntity.source_ref_ids) {
      if (!sourceRefIds.has(sourceRefId)) {
        issues.push(`${prefix}.source_ref_ids contains unknown ref: ${sourceRefId}`);
      }
    }
  }

  validateStringArray(seedEntity.limitations, `${prefix}.limitations`, issues);
  if (Array.isArray(seedEntity.limitations) && seedEntity.limitations.length === 0) {
    issues.push(`${prefix}.limitations must not be empty.`);
  }

  return issues;
}

function summarizeSeedPack(seedPack) {
  const entityTypeCounts = {};
  for (const seedEntity of seedPack.seed_entities || []) {
    entityTypeCounts[seedEntity.entity_type] =
      (entityTypeCounts[seedEntity.entity_type] || 0) + 1;
  }

  return {
    pack_id: seedPack.pack_id,
    manifest_id: seedPack.manifest_id,
    seed_entity_count: (seedPack.seed_entities || []).length,
    entity_type_counts: entityTypeCounts,
    source_ref_ids: (seedPack.source_refs || []).map((sourceRef) => sourceRef.ref_id),
  };
}

function validateFortWorthSeedPack(seedPack, manifest = null) {
  const issues = [];
  const manifestToValidate = manifest || seedPack?.manifest || null;
  const manifestValidation = validateCitySeedManifestV1(manifestToValidate);

  if (!manifestValidation.valid) {
    issues.push(...manifestValidation.issues.map((issue) => `manifest: ${issue}`));
  }

  if (!isPlainObject(seedPack)) {
    return createValidationResult([
      "FortWorthSeedPack must be a plain object.",
      ...issues,
    ]);
  }

  for (const fieldName of ["pack_id", "manifest_id", "generated_at", "seed_classification"]) {
    if (!isNonEmptyString(seedPack[fieldName])) {
      issues.push(`${fieldName} must be a non-empty string.`);
    }
  }

  if (seedPack.pack_id !== FORT_WORTH_SEED_PACK_ID) {
    issues.push(`pack_id must equal ${FORT_WORTH_SEED_PACK_ID}.`);
  }

  if (
    isPlainObject(manifestToValidate) &&
    seedPack.manifest_id !== manifestToValidate.manifest_id
  ) {
    issues.push("manifest_id must match manifest.manifest_id.");
  }

  for (const fieldName of [
    "not_live_city_integration",
    "not_official_city_record",
    "no_accela_automation",
    "no_gis_automation",
  ]) {
    if (seedPack[fieldName] !== true) {
      issues.push(`${fieldName} must be true.`);
    }
  }

  if (!Array.isArray(seedPack.source_refs) || seedPack.source_refs.length === 0) {
    issues.push("source_refs must be a non-empty array.");
  }

  const sourceRefIds = new Set(
    Array.isArray(seedPack.source_refs)
      ? seedPack.source_refs.map((sourceRef) => sourceRef.ref_id)
      : []
  );

  if (!Array.isArray(seedPack.seed_entities)) {
    issues.push("seed_entities must be an array.");
  } else if (seedPack.seed_entities.length === 0) {
    issues.push("seed_entities must not be empty.");
  } else {
    seedPack.seed_entities.forEach((seedEntity, index) => {
      issues.push(...validateSeedEntity(seedEntity, index, sourceRefIds));
    });
  }

  validateStringArray(seedPack.limitations, "limitations", issues);
  if (Array.isArray(seedPack.limitations) && seedPack.limitations.length === 0) {
    issues.push("limitations must not be empty.");
  }

  const requiredEntityTypes = new Set([
    "corridor_zone",
    "utility_asset",
    "organization",
  ]);
  const hasAuthorityContext = Array.isArray(seedPack.seed_entities)
    ? seedPack.seed_entities.some(
        (seedEntity) => seedEntity.entity_type === "authority_grant"
      )
    : false;

  if (!hasAuthorityContext) {
    issues.push("seed_entities must include authority_grant context.");
  }

  for (const entityType of requiredEntityTypes) {
    if (
      !Array.isArray(seedPack.seed_entities) ||
      !seedPack.seed_entities.some((seedEntity) => seedEntity.entity_type === entityType)
    ) {
      issues.push(`seed_entities must include ${entityType}.`);
    }
  }

  return createValidationResult(issues);
}

function createFortWorthSeedPack(input = {}) {
  const manifest = input.manifest || getDefaultFortWorthSeedManifest();
  const manifestValidation = validateCitySeedManifestV1(manifest);
  if (!manifestValidation.valid) {
    return {
      ok: false,
      valid: false,
      status: "HOLD",
      seed_pack: null,
      pack: null,
      summary: null,
      issues: manifestValidation.issues,
    };
  }

  const seedPack = {
    pack_id: FORT_WORTH_SEED_PACK_ID,
    manifest_id: manifest.manifest_id,
    generated_at:
      input.generated_at || FORT_WORTH_SEED_MANIFEST_COMPILED_AT,
    seed_classification: SOURCE_MANIFESTED_LOCAL_DEMO_SEED,
    not_live_city_integration: true,
    not_official_city_record: true,
    no_accela_automation: true,
    no_gis_automation: true,
    source_refs: cloneJsonValue(manifest.source_refs),
    seed_entities: cloneJsonValue(input.seed_entities || createDefaultSeedEntities()),
    limitations: cloneJsonValue([
      ...manifest.limitations,
      "Fort Worth seed pack contains only source-manifested local demo entities.",
      "Seed entities are corridor-ready test inputs, not official system records.",
    ]),
  };
  const validation = validateFortWorthSeedPack(seedPack, manifest);

  return {
    ok: validation.valid,
    valid: validation.valid,
    status: validation.valid ? "PASS" : "HOLD",
    seed_pack: validation.valid ? seedPack : null,
    pack: validation.valid ? seedPack : null,
    summary: validation.valid ? summarizeSeedPack(seedPack) : null,
    issues: validation.issues,
  };
}

module.exports = {
  FORT_WORTH_LOCAL_DEMO_ORG_ID,
  FORT_WORTH_SEED_PACK_ID,
  SEED_ENTITY_LIMITATIONS,
  createDefaultSeedEntities,
  createFortWorthSeedPack,
  summarizeSeedPack,
  validateFortWorthSeedPack,
};
