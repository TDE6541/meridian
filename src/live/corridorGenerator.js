const {
  createEmptyLiveFeedRefs,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
} = require("./contracts");
const {
  createEntityDeltaV1,
  validateEntityDeltaV1,
} = require("./liveEntityDelta");
const {
  createLiveFeedEventFromRecordV1,
} = require("./liveFeedEvent");
const {
  createLiveGovernanceGateway,
} = require("./liveGovernanceGateway");
const { createActionRequest } = require("../entities/action_request");
const { createIncidentObservation } = require("../entities/incident_observation");
const { createObligation } = require("../entities/obligation");
const {
  createFortWorthSeedManifest,
  validateCitySeedManifestV1,
} = require("./cityData/fortWorthSeedManifest");
const {
  FORT_WORTH_LOCAL_DEMO_ORG_ID,
  createFortWorthSeedPack,
  summarizeSeedPack,
  validateFortWorthSeedPack,
} = require("./cityData/fortWorthSeedPack");

const CORRIDOR_GENERATOR_ID =
  "fort-worth-local-demo-corridor-generator-v1";
const CORRIDOR_GENERATOR_TIMESTAMP = "2026-04-24T00:00:00.000Z";
const ALLOWED_SCENARIO_KINDS = Object.freeze([
  "routine",
  "contested",
  "emergency",
  "local_demo",
]);
const BOOLEAN_PARAMETER_FIELDS = Object.freeze([
  "utility_conflict",
  "emergency",
  "public_visibility",
  "franchise_asset_conflict",
  "obligation_owner_present",
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

function slugify(value) {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "corridor";
}

function createGeneratorResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function normalizeBooleanParameter(input, fieldName, issues) {
  if (!Object.prototype.hasOwnProperty.call(input, fieldName)) {
    return false;
  }

  if (typeof input[fieldName] !== "boolean") {
    issues.push(`${fieldName} must be boolean when supplied.`);
    return false;
  }

  return input[fieldName];
}

function validateCorridorGeneratorInput(input = {}) {
  const issues = [];

  if (!isPlainObject(input)) {
    return createValidationResult([
      "corridor generator input must be a plain object.",
    ]);
  }

  if (!isNonEmptyString(input.session_id)) {
    issues.push("session_id must be a non-empty string.");
  }

  if (!isNonEmptyString(input.corridor_name)) {
    issues.push("corridor_name must be a non-empty string.");
  }

  if (
    input.scenario_kind !== undefined &&
    !ALLOWED_SCENARIO_KINDS.includes(input.scenario_kind)
  ) {
    issues.push(`scenario_kind is not allowed: ${String(input.scenario_kind)}`);
  }

  for (const fieldName of BOOLEAN_PARAMETER_FIELDS) {
    normalizeBooleanParameter(input, fieldName, issues);
  }

  if (
    input.store !== undefined &&
    (!isPlainObject(input.store) ||
      typeof input.store.appendRecord !== "function")
  ) {
    issues.push("store.appendRecord is required when store is supplied.");
  }

  return createValidationResult(issues);
}

function normalizeInput(input, options) {
  const issues = [];
  const validation = validateCorridorGeneratorInput(input);
  issues.push(...validation.issues);

  return {
    valid: issues.length === 0,
    issues,
    parameters: {
      session_id: input.session_id,
      corridor_name: input.corridor_name,
      scenario_kind: input.scenario_kind || "local_demo",
      utility_conflict: normalizeBooleanParameter(input, "utility_conflict", []),
      emergency: normalizeBooleanParameter(input, "emergency", []),
      public_visibility: normalizeBooleanParameter(input, "public_visibility", []),
      franchise_asset_conflict: normalizeBooleanParameter(
        input,
        "franchise_asset_conflict",
        []
      ),
      obligation_owner_present: Object.prototype.hasOwnProperty.call(
        input,
        "obligation_owner_present"
      )
        ? normalizeBooleanParameter(input, "obligation_owner_present", [])
        : true,
    },
    store: input.store || options.store || null,
  };
}

function buildRefs(overrides = {}) {
  return {
    ...createEmptyLiveFeedRefs(),
    ...cloneJsonValue(overrides),
  };
}

function appendGeneratorEvent(store, sessionId, input) {
  const appended = store.appendRecord(sessionId, {
    type: input.kind,
    source: {
      type: "city_seed",
      ref: input.source_ref || CORRIDOR_GENERATOR_ID,
    },
    payload: {
      ...cloneJsonValue(input.payload || {}),
      live_feed_event: {
        kind: input.kind,
        severity: input.severity || "INFO",
        title: input.title,
        summary: input.summary,
        refs: buildRefs(input.refs),
        visibility: input.visibility || "internal",
        foreman_hints: {
          narration_eligible: false,
          priority: 0,
          reason: "not_requested",
        },
      },
    },
    dashboard_visible: true,
  });

  if (!appended.ok) {
    return {
      ok: false,
      record: null,
      event: null,
      session: appended.session || null,
      issues: appended.issues,
    };
  }

  const eventResult = createLiveFeedEventFromRecordV1(appended.record);
  return {
    ok: eventResult.valid,
    record: appended.record,
    event: eventResult.event,
    session: appended.session,
    issues: eventResult.issues,
  };
}

function buildAuthorityContext(parameters) {
  const missingApprovals = [];
  const requiredApprovals = [];

  if (parameters.utility_conflict) {
    requiredApprovals.push("local_demo_utility_owner_review");
    missingApprovals.push("local_demo_utility_owner_review");
  }

  if (parameters.franchise_asset_conflict) {
    requiredApprovals.push("local_demo_franchise_jurisdiction_review");
    missingApprovals.push("local_demo_franchise_jurisdiction_review");
  }

  return {
    resolved: missingApprovals.length === 0,
    requested_by_role: "local_demo_corridor_generator",
    required_approvals: requiredApprovals,
    resolved_approvals: [],
    missing_approvals: missingApprovals,
  };
}

function buildEvidenceContext(parameters) {
  const missingTypes = [];

  if (parameters.utility_conflict) {
    missingTypes.push("utility_conflict_assessment");
  }

  if (parameters.public_visibility) {
    missingTypes.push("public_disclosure_boundary");
  }

  if (parameters.emergency) {
    missingTypes.push("public_notice_posture");
  }

  if (parameters.franchise_asset_conflict) {
    missingTypes.push("jurisdiction_clarification");
  }

  return {
    required_count: missingTypes.length > 0 ? missingTypes.length : 1,
    present_count: 0,
    missing_types: missingTypes,
  };
}

function buildAbsenceInputs(parameters, sourceRefIds) {
  const absenceInputs = {};

  if (parameters.utility_conflict) {
    absenceInputs.utility_conflict_requires_authority_or_evidence = {
      touches_utility_asset: true,
      authority_or_evidence_present: false,
      source_refs: [...sourceRefIds],
    };
  }

  if (parameters.emergency) {
    absenceInputs.emergency_utility_incident_requires_public_notice_posture = {
      emergency_utility_incident: true,
      public_notice_posture_present: false,
      source_refs: [...sourceRefIds],
    };
  }

  if (parameters.public_visibility) {
    absenceInputs.public_disclosure_requires_redaction_boundary = {
      public_facing_output: true,
      redaction_boundary_present: false,
      source_refs: [...sourceRefIds],
    };
  }

  if (parameters.franchise_asset_conflict) {
    absenceInputs.franchise_asset_conflict_requires_jurisdiction_clarification = {
      franchise_asset_conflict: true,
      jurisdiction_clarification_present: false,
      source_refs: [...sourceRefIds],
    };
  }

  return absenceInputs;
}

function buildGovernanceContext(entity, parameters, sourceRefIds) {
  return {
    generator: {
      generator_id: CORRIDOR_GENERATOR_ID,
      corridor_name: parameters.corridor_name,
      scenario_kind: parameters.scenario_kind,
      source_ref_ids: [...sourceRefIds],
      limitations: [
        "Governance context is local demo corridor posture, not live city integration.",
      ],
    },
    absence_inputs: buildAbsenceInputs(parameters, sourceRefIds),
    request: {
      kind: "command_request",
      org_id: entity.org_id || FORT_WORTH_LOCAL_DEMO_ORG_ID,
      entity_ref: {
        entity_id: entity.entity_id,
        entity_type: entity.entity_type,
      },
      authority_context: buildAuthorityContext(parameters),
      evidence_context: buildEvidenceContext(parameters),
      confidence_context: null,
      candidate_signal_patch: null,
      raw_subject:
        `live://city-seed/${parameters.scenario_kind}/` +
        `${entity.entity_type}/${entity.entity_id}`,
    },
  };
}

function buildActionEntity(parameters, slug, seedSummary) {
  return createActionRequest({
    entity_id: `local-demo-action-request-${slug}`,
    org_id: FORT_WORTH_LOCAL_DEMO_ORG_ID,
    name: `${parameters.corridor_name} local demo corridor action`,
    status: "requested",
    priority: parameters.emergency ? "high" : "medium",
    corridor_name: parameters.corridor_name,
    scenario_kind: parameters.scenario_kind,
    seed_pack_id: seedSummary.pack_id,
    local_demo_seed: true,
  });
}

function buildObligationEntity(parameters, slug) {
  const ownerFields = parameters.obligation_owner_present
    ? {
        owner_id: "local-demo-organization-corridor-operations",
        owner: "Local demo corridor operations organization",
      }
    : {};

  return createObligation({
    entity_id: `local-demo-obligation-${slug}-public-posture`,
    org_id: FORT_WORTH_LOCAL_DEMO_ORG_ID,
    name: `${parameters.corridor_name} local demo public posture obligation`,
    status: "active",
    priority: parameters.public_visibility ? "high" : "medium",
    corridor_name: parameters.corridor_name,
    obligation_kind: "local_demo_public_posture",
    ...ownerFields,
  });
}

function buildIncidentEntity(parameters, slug) {
  if (!parameters.emergency) {
    return null;
  }

  return createIncidentObservation({
    entity_id: `local-demo-incident-${slug}-utility-conflict`,
    org_id: FORT_WORTH_LOCAL_DEMO_ORG_ID,
    name: `${parameters.corridor_name} local demo utility incident`,
    status: "detected",
    priority: "high",
    corridor_name: parameters.corridor_name,
    incident_kind: "local_demo_utility_conflict",
  });
}

function createDeltaForEntity(entity, parameters, sourceRefIds, index) {
  return createEntityDeltaV1({
    delta_id: `delta-a6-${slugify(parameters.corridor_name)}-${index}-${entity.entity_type}`,
    session_id: parameters.session_id,
    timestamp: CORRIDOR_GENERATOR_TIMESTAMP,
    operation: "proposed_creation",
    entity_type: entity.entity_type,
    entity_id: entity.entity_id,
    entity,
    source: {
      type: "city_seed",
      ref: `${CORRIDOR_GENERATOR_ID}#${entity.entity_id}`,
    },
    governance_context: buildGovernanceContext(entity, parameters, sourceRefIds),
    authority_context: buildAuthorityContext(parameters),
  });
}

function buildGeneratedDeltas(parameters, seedPack) {
  const slug = slugify(parameters.corridor_name);
  const seedSummary = summarizeSeedPack(seedPack);
  const sourceRefIds = seedSummary.source_ref_ids;
  const seedEntities = seedPack.seed_entities.map((seedEntity) => seedEntity.entity);
  const generatedEntities = [
    ...seedEntities,
    buildActionEntity(parameters, slug, seedSummary),
    buildObligationEntity(parameters, slug),
    buildIncidentEntity(parameters, slug),
  ].filter(Boolean);

  return generatedEntities.map((entity, index) => ({
    entity_id: entity.entity_id,
    entity_type: entity.entity_type,
    source_ref_ids: [...sourceRefIds],
    result: createDeltaForEntity(entity, parameters, sourceRefIds, index + 1),
  }));
}

function normalizeGatewayResult(gatewayResult) {
  return {
    ok: gatewayResult.ok,
    status: gatewayResult.status,
    decision: gatewayResult.decision,
    reason: gatewayResult.reason,
    issues: [...(gatewayResult.issues || [])],
    event_kinds: Array.isArray(gatewayResult.events)
      ? gatewayResult.events.map((event) => event.kind)
      : [],
    governance_evaluation: gatewayResult.governance_evaluation || null,
  };
}

function generateFortWorthCorridor(input = {}, options = {}) {
  const normalized = normalizeInput(input, options);
  const holds = [];
  const events = [];

  if (!normalized.valid) {
    return createGeneratorResult(
      false,
      {
        session_id: input.session_id || null,
        manifest: null,
        seed_summary: null,
        generated_deltas: [],
        gateway_results: [],
        events,
        holds: normalized.issues.map((issue) => ({
          posture: "BLOCK",
          reason: "invalid_corridor_generator_input",
          issue,
        })),
        limitations: [],
      },
      normalized.issues
    );
  }

  if (!normalized.store || typeof normalized.store.appendRecord !== "function") {
    return createGeneratorResult(
      false,
      {
        session_id: normalized.parameters.session_id,
        manifest: null,
        seed_summary: null,
        generated_deltas: [],
        gateway_results: [],
        events,
        holds: [
          {
            posture: "BLOCK",
            reason: "live_session_store_required",
            issue: "store.appendRecord is required.",
          },
        ],
        limitations: [],
      },
      ["store.appendRecord is required."]
    );
  }

  const manifestResult = input.manifest
    ? {
        ok: validateCitySeedManifestV1(input.manifest).valid,
        manifest: cloneJsonValue(input.manifest),
        issues: validateCitySeedManifestV1(input.manifest).issues,
      }
    : createFortWorthSeedManifest();

  if (!manifestResult.ok) {
    return createGeneratorResult(
      false,
      {
        session_id: normalized.parameters.session_id,
        manifest: null,
        seed_summary: null,
        generated_deltas: [],
        gateway_results: [],
        events,
        holds: manifestResult.issues.map((issue) => ({
          posture: "BLOCK",
          reason: "seed_manifest_invalid",
          issue,
        })),
        limitations: [],
      },
      manifestResult.issues
    );
  }

  const seedPackResult = input.seed_pack
    ? {
        ok: validateFortWorthSeedPack(input.seed_pack, manifestResult.manifest).valid,
        seed_pack: cloneJsonValue(input.seed_pack),
        summary: summarizeSeedPack(input.seed_pack),
        issues: validateFortWorthSeedPack(input.seed_pack, manifestResult.manifest).issues,
      }
    : createFortWorthSeedPack({ manifest: manifestResult.manifest });

  if (!seedPackResult.ok) {
    return createGeneratorResult(
      false,
      {
        session_id: normalized.parameters.session_id,
        manifest: manifestResult.manifest,
        seed_summary: null,
        generated_deltas: [],
        gateway_results: [],
        events,
        holds: seedPackResult.issues.map((issue) => ({
          posture: "BLOCK",
          reason: "seed_pack_invalid",
          issue,
        })),
        limitations: manifestResult.manifest.limitations,
      },
      seedPackResult.issues
    );
  }

  const seedEvent = appendGeneratorEvent(normalized.store, normalized.parameters.session_id, {
    kind: "cityData.seed.loaded",
    title: "City seed loaded",
    summary: "Fort Worth local demo seed pack loaded for corridor generation.",
    source_ref: seedPackResult.seed_pack.pack_id,
    refs: {
      entity_ids: seedPackResult.seed_pack.seed_entities.map(
        (seedEntity) => seedEntity.entity_id
      ),
    },
    payload: {
      manifest: manifestResult.manifest,
      seed_summary: seedPackResult.summary,
      limitations: seedPackResult.seed_pack.limitations,
    },
  });

  if (!seedEvent.ok) {
    holds.push({
      posture: "BLOCK",
      reason: "city_seed_event_append_failed",
      issues: [...seedEvent.issues],
    });
  } else {
    events.push(seedEvent.event);
  }

  const generatedDeltaResults = buildGeneratedDeltas(
    normalized.parameters,
    seedPackResult.seed_pack
  );
  const validDeltas = [];
  for (const entry of generatedDeltaResults) {
    if (!entry.result.ok) {
      holds.push({
        posture: "BLOCK",
        reason: "generated_delta_invalid",
        entity_id: entry.entity_id,
        entity_type: entry.entity_type,
        issues: [...entry.result.issues],
      });
    } else {
      const validation = validateEntityDeltaV1(entry.result.delta);
      if (!validation.valid) {
        holds.push({
          posture: "BLOCK",
          reason: "generated_delta_failed_validation",
          entity_id: entry.entity_id,
          entity_type: entry.entity_type,
          issues: [...validation.issues],
        });
      } else {
        validDeltas.push(entry.result.delta);
      }
    }
  }

  const gateway = createLiveGovernanceGateway({
    store: normalized.store,
    now: options.now,
    idGenerator: options.idGenerator,
    evaluateGovernanceRequest: options.evaluateGovernanceRequest,
    forensicWriter: options.forensicWriter,
  });
  const gatewayResults = [];
  for (const delta of validDeltas) {
    const gatewayResult = gateway.evaluate(delta, {
      session_id: normalized.parameters.session_id,
    });
    gatewayResults.push(normalizeGatewayResult(gatewayResult));

    if (!gatewayResult.ok) {
      holds.push({
        posture: "BLOCK",
        reason: "gateway_evaluation_failed",
        entity_id: delta.entity_id,
        issues: [...gatewayResult.issues],
      });
    }
  }

  const corridorEvent = appendGeneratorEvent(normalized.store, normalized.parameters.session_id, {
    kind: "corridor.generated",
    title: "Corridor generated",
    summary: `${normalized.parameters.corridor_name} generated as local demo corridor deltas.`,
    refs: {
      entity_ids: validDeltas.map((delta) => delta.entity_id),
    },
    payload: {
      generator_id: CORRIDOR_GENERATOR_ID,
      parameters: cloneJsonValue(normalized.parameters),
      generated_delta_count: validDeltas.length,
      gateway_result_count: gatewayResults.length,
      holds: cloneJsonValue(holds),
      limitations: seedPackResult.seed_pack.limitations,
    },
  });

  if (!corridorEvent.ok) {
    holds.push({
      posture: "BLOCK",
      reason: "corridor_generated_event_append_failed",
      issues: [...corridorEvent.issues],
    });
  } else {
    events.push(corridorEvent.event);
  }

  return createGeneratorResult(
    holds.length === 0,
    {
      session_id: normalized.parameters.session_id,
      manifest: manifestResult.manifest,
      seed_summary: seedPackResult.summary,
      generated_deltas: validDeltas,
      generated_delta_results: generatedDeltaResults.map((entry) => ({
        entity_id: entry.entity_id,
        entity_type: entry.entity_type,
        ok: entry.result.ok,
        issues: [...entry.result.issues],
      })),
      gateway_results: gatewayResults,
      events,
      holds,
      limitations: seedPackResult.seed_pack.limitations,
    },
    []
  );
}

module.exports = {
  ALLOWED_SCENARIO_KINDS,
  CORRIDOR_GENERATOR_ID,
  generateFortWorthCorridor,
  validateCorridorGeneratorInput,
};
