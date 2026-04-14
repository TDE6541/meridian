const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createEmptySignalTree,
  createTypedSignalTree,
  validateMinimalSignalTree,
  validateTypedSignalTree,
} = require("../src/governance/shadows");

const ENTITY_SPECS = [
  {
    file: "action_request",
    entityType: "action_request",
    factory: "createActionRequest",
    validator: "validateActionRequest",
    hasLifecycleStates: true,
    lifecycleStates: [
      "requested",
      "held",
      "authorized",
      "blocked",
      "executed",
      "cancelled",
    ],
  },
  {
    file: "authority_grant",
    entityType: "authority_grant",
    factory: "createAuthorityGrant",
    validator: "validateAuthorityGrant",
    hasLifecycleStates: false,
    lifecycleStates: null,
  },
  {
    file: "corridor_zone",
    entityType: "corridor_zone",
    factory: "createCorridorZone",
    validator: "validateCorridorZone",
    hasLifecycleStates: false,
    lifecycleStates: null,
  },
  {
    file: "critical_site",
    entityType: "critical_site",
    factory: "createCriticalSite",
    validator: "validateCriticalSite",
    hasLifecycleStates: false,
    lifecycleStates: null,
  },
  {
    file: "decision_record",
    entityType: "decision_record",
    factory: "createDecisionRecord",
    validator: "validateDecisionRecord",
    hasLifecycleStates: true,
    lifecycleStates: [
      "proposed",
      "ratified",
      "superseded",
      "rescinded",
      "expired",
    ],
  },
  {
    file: "device",
    entityType: "device",
    factory: "createDevice",
    validator: "validateDevice",
    hasLifecycleStates: false,
    lifecycleStates: null,
  },
  {
    file: "evidence_artifact",
    entityType: "evidence_artifact",
    factory: "createEvidenceArtifact",
    validator: "validateEvidenceArtifact",
    hasLifecycleStates: true,
    lifecycleStates: [
      "created",
      "linked",
      "verified",
      "contested",
      "superseded",
    ],
  },
  {
    file: "incident_observation",
    entityType: "incident_observation",
    factory: "createIncidentObservation",
    validator: "validateIncidentObservation",
    hasLifecycleStates: true,
    lifecycleStates: [
      "detected",
      "triaged",
      "verified",
      "mitigated",
      "resolved",
      "closed",
    ],
  },
  {
    file: "inspection",
    entityType: "inspection",
    factory: "createInspection",
    validator: "validateInspection",
    hasLifecycleStates: true,
    lifecycleStates: [
      "scheduled",
      "in_progress",
      "passed",
      "failed",
      "conditional",
      "reinspection_required",
      "closed",
    ],
  },
  {
    file: "obligation",
    entityType: "obligation",
    factory: "createObligation",
    validator: "validateObligation",
    hasLifecycleStates: true,
    lifecycleStates: [
      "proposed",
      "active",
      "due",
      "overdue",
      "satisfied",
      "waived",
    ],
  },
  {
    file: "organization",
    entityType: "organization",
    factory: "createOrganization",
    validator: "validateOrganization",
    hasLifecycleStates: false,
    lifecycleStates: null,
  },
  {
    file: "permit_application",
    entityType: "permit_application",
    factory: "createPermitApplication",
    validator: "validatePermitApplication",
    hasLifecycleStates: true,
    lifecycleStates: [
      "scoping",
      "submitted",
      "in_review",
      "approved",
      "issued",
      "active",
      "expired",
      "revoked",
      "closed",
    ],
  },
  {
    file: "utility_asset",
    entityType: "utility_asset",
    factory: "createUtilityAsset",
    validator: "validateUtilityAsset",
    hasLifecycleStates: true,
    lifecycleStates: [
      "proposed",
      "operational",
      "under_maintenance",
      "failed",
      "retired",
    ],
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
const SIGNAL_TREE_ERROR =
  "entity.signal_tree must match the typed Meridian signal_tree subset";

test("shadows: createEmptySignalTree preserves the Wave 1 compatibility shape", () => {
  assert.deepEqual(createEmptySignalTree(), {
    governance: {},
    civic: {},
    lineage: {},
  });
});

test("shadows: validateMinimalSignalTree preserves the Wave 1 compatibility shim", () => {
  assert.equal(validateMinimalSignalTree(createEmptySignalTree()), true);
  assert.equal(validateMinimalSignalTree({ governance: {}, civic: {} }), false);
});

test("shadows: typed signal_tree defaults are locked", () => {
  assert.deepEqual(createTypedSignalTree(), {
    governance: {
      decision_state: null,
      authority_chain: {
        requested_by_role: null,
        required_approvals: [],
        resolved_approvals: [],
        missing_approvals: [],
      },
      evidence: {
        required_count: 0,
        present_count: 0,
        missing_types: [],
      },
      absence: {
        inspection_missing: false,
        notice_missing: false,
        supersession_missing: false,
      },
    },
    civic: {
      promise_status: {
        conditions_total: 0,
        conditions_satisfied: 0,
        oldest_open_condition_at: null,
      },
      related_zone_ids: [],
      related_asset_ids: [],
    },
    lineage: {
      decision_record_ids: [],
      evidence_ids: [],
    },
  });
});

test("shadows: validateTypedSignalTree accepts typed defaults and rejects invalid typed fields", () => {
  const typedSignalTree = createTypedSignalTree();
  const invalidTypedSignalTree = createTypedSignalTree();

  invalidTypedSignalTree.governance.evidence.required_count = "1";

  assert.equal(validateTypedSignalTree(typedSignalTree), true);
  assert.equal(validateTypedSignalTree(invalidTypedSignalTree), false);
});

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
    assert.deepEqual(entity.signal_tree, createTypedSignalTree());
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

  test(`${spec.file}: a valid entity with the typed signal_tree default passes validation`, () => {
    const entityModule = loadEntityModule(spec);
    const entity = createValidEntity(spec);

    const result = entityModule[spec.validator](entity);

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  test(`${spec.file}: lifecycle binding matches the approved status rules`, () => {
    const entityModule = loadEntityModule(spec);

    if (spec.hasLifecycleStates) {
      const activeEntity = createValidEntity(spec, {
        status: spec.lifecycleStates[0],
      });
      const invalidEntity = createValidEntity(spec, {
        status: "totally-arbitrary-status",
      });

      assert.equal(entityModule[spec.validator](activeEntity).valid, true);
      assert.deepEqual(entityModule[spec.validator](activeEntity).errors, []);
      assert.equal(entityModule[spec.validator](invalidEntity).valid, false);
      assert.deepEqual(entityModule[spec.validator](invalidEntity).errors, [
        "entity.status must be null or one of LIFECYCLE_STATES",
      ]);
      return;
    }

    const invalidEntity = createValidEntity(spec, {
      status: "unexpected-status",
    });

    assert.equal(entityModule[spec.validator](invalidEntity).valid, false);
    assert.deepEqual(entityModule[spec.validator](invalidEntity).errors, [
      "entity.status must be null for stateless entities",
    ]);
  });

  test(`${spec.file}: lifecycle export posture matches the approved allowlist`, () => {
    const entityModule = loadEntityModule(spec);

    assert.equal(
      Object.prototype.hasOwnProperty.call(entityModule, "LIFECYCLE_STATES"),
      spec.hasLifecycleStates
    );

    if (spec.hasLifecycleStates) {
      assert.deepEqual(entityModule.LIFECYCLE_STATES, spec.lifecycleStates);
      return;
    }

    assert.equal(spec.lifecycleStates, null);
  });

  test(`${spec.file}: typed signal_tree validation rejects the Wave 1 minimal shim shape`, () => {
    const entityModule = loadEntityModule(spec);
    const entity = createValidEntity(spec, {
      signal_tree: createEmptySignalTree(),
    });

    const result = entityModule[spec.validator](entity);

    assert.equal(result.valid, false);
    assert.deepEqual(result.errors, [SIGNAL_TREE_ERROR]);
  });
}
