const test = require("node:test");
const assert = require("node:assert/strict");

const ENTITY_SPECS = [
  {
    file: "action_request",
    entityType: "action_request",
    factory: "createActionRequest",
    validator: "validateActionRequest",
    hasLifecycleStates: true,
  },
  {
    file: "authority_grant",
    entityType: "authority_grant",
    factory: "createAuthorityGrant",
    validator: "validateAuthorityGrant",
    hasLifecycleStates: false,
  },
  {
    file: "corridor_zone",
    entityType: "corridor_zone",
    factory: "createCorridorZone",
    validator: "validateCorridorZone",
    hasLifecycleStates: false,
  },
  {
    file: "critical_site",
    entityType: "critical_site",
    factory: "createCriticalSite",
    validator: "validateCriticalSite",
    hasLifecycleStates: false,
  },
  {
    file: "decision_record",
    entityType: "decision_record",
    factory: "createDecisionRecord",
    validator: "validateDecisionRecord",
    hasLifecycleStates: true,
  },
  {
    file: "device",
    entityType: "device",
    factory: "createDevice",
    validator: "validateDevice",
    hasLifecycleStates: false,
  },
  {
    file: "incident_observation",
    entityType: "incident_observation",
    factory: "createIncidentObservation",
    validator: "validateIncidentObservation",
    hasLifecycleStates: true,
  },
  {
    file: "inspection",
    entityType: "inspection",
    factory: "createInspection",
    validator: "validateInspection",
    hasLifecycleStates: true,
  },
  {
    file: "obligation",
    entityType: "obligation",
    factory: "createObligation",
    validator: "validateObligation",
    hasLifecycleStates: true,
  },
  {
    file: "organization",
    entityType: "organization",
    factory: "createOrganization",
    validator: "validateOrganization",
    hasLifecycleStates: false,
  },
  {
    file: "permit_application",
    entityType: "permit_application",
    factory: "createPermitApplication",
    validator: "validatePermitApplication",
    hasLifecycleStates: true,
  },
  {
    file: "utility_asset",
    entityType: "utility_asset",
    factory: "createUtilityAsset",
    validator: "validateUtilityAsset",
    hasLifecycleStates: false,
  },
];

const DEFAULT_ENTITY_KEYS = [
  "entity_id",
  "org_id",
  "name",
  "entity_type",
  "status",
  "priority",
  "is_live",
  "governance",
  "signal_tree",
].sort();

const GOVERNANCE_KEYS = [
  "absence",
  "authority",
  "evidence",
  "obligation",
].sort();

const SIGNAL_TREE_KEYS = [
  "civic",
  "governance",
  "lineage",
].sort();

const GOVERNANCE_ERROR =
  "entity.governance must contain authority, evidence, obligation, and absence plain objects";

function loadEntityModule(spec) {
  return require(`../src/entities/${spec.file}.js`);
}

function createValidEntity(spec, extraOverrides = {}) {
  const entityModule = loadEntityModule(spec);
  return entityModule[spec.factory]({
    entity_id: "entity-1",
    org_id: "org-1",
    name: "Meridian Test Entity",
    ...extraOverrides,
  });
}

for (const spec of ENTITY_SPECS) {
  test(`${spec.file}: default factory output matches the locked structural floor`, () => {
    const entityModule = loadEntityModule(spec);
    const entity = entityModule[spec.factory]();

    assert.equal(typeof entity, "object");
    assert.notEqual(entity, null);
    assert.equal(Array.isArray(entity), false);
    assert.equal(entity.entity_type, entityModule.ENTITY_TYPE);
    assert.equal(entity.entity_type, spec.entityType);
    assert.deepEqual(Object.keys(entity).sort(), DEFAULT_ENTITY_KEYS);
    assert.deepEqual(Object.keys(entity.governance).sort(), GOVERNANCE_KEYS);
    assert.deepEqual(Object.keys(entity.signal_tree).sort(), SIGNAL_TREE_KEYS);
  });

  test(`${spec.file}: missing one governance shadow fails validation for the structural reason`, () => {
    const entityModule = loadEntityModule(spec);
    const entity = createValidEntity(spec);

    delete entity.governance.authority;

    const result = entityModule[spec.validator](entity);

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [GOVERNANCE_ERROR]);
  });

  test(`${spec.file}: status defaults to null`, () => {
    const entityModule = loadEntityModule(spec);
    const entity = entityModule[spec.factory]();

    assert.equal(entity.status, null);
  });

  test(`${spec.file}: arbitrary string status values are not lifecycle-bound`, () => {
    const entityModule = loadEntityModule(spec);
    const entity = createValidEntity(spec, {
      status: "totally-arbitrary-status",
    });

    const result = entityModule[spec.validator](entity);

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test(`${spec.file}: lifecycle export posture matches the approved allowlist`, () => {
    const entityModule = loadEntityModule(spec);

    assert.equal(
      Object.prototype.hasOwnProperty.call(entityModule, "LIFECYCLE_STATES"),
      spec.hasLifecycleStates
    );
  });
}
