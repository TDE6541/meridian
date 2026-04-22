const crypto = require("node:crypto");
const { readdirSync, readFileSync } = require("node:fs");
const path = require("node:path");

const {
  RUNNER_MODE,
  STAGE_STATUS,
  TOP_LEVEL_STATUS,
  assertPipelineBridgeOutputV1,
  validateFixtureProvenance,
  validateRequiredScenarioFixtureSetFiles,
} = require("./contracts");
const { runPipelineBridge } = require("./pipelineBridge");
const { runCorridorScenario } = require("./corridorScenario");
const {
  ChainPersistence,
  GovernanceChainWriter,
} = require("../governance/forensic");

const CASCADE_RESULT_CONTRACT_VERSION = "wave8.cascadeResult.v1";
const CASCADE_PROFILE_VERSION = "wave8.packet4.cascadeProfiles.v1";
const DEFAULT_ORG_ID = "fortworth-dev";
const DEFAULT_REPOSITORY_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_FIXTURE_FILE_ORDER = Object.freeze([
  "afterState.json",
  "beforeState.json",
  "expectedMatches.json",
  "expectedScenarioSummary.json",
  "fixtureProvenance.json",
  "pipelineReplayOutput.json",
  "resolutionSequence.json",
  "scenario.json",
  "transcript.txt",
]);
const RENDERED_SKIN_IDS = Object.freeze([
  "permitting",
  "council",
  "operations",
  "dispatch",
  "public",
]);
const EXPLICIT_REVOKE_ACTION = "REVOKE";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function resolveEvaluatedAt(input) {
  if (isNonEmptyString(input.evaluatedAt)) {
    return input.evaluatedAt;
  }

  return new Date().toISOString();
}

function resolveFixtureRoot(fixtureRoot) {
  if (!isNonEmptyString(fixtureRoot)) {
    throw new TypeError(
      "fixtureRoot must be a non-empty string when fixtureSet is absent."
    );
  }

  return path.isAbsolute(fixtureRoot)
    ? fixtureRoot
    : path.resolve(DEFAULT_REPOSITORY_ROOT, fixtureRoot);
}

function buildFixturePaths(root) {
  return {
    root,
    scenarioPath: path.join(root, "scenario.json"),
    beforeStatePath: path.join(root, "beforeState.json"),
    afterStatePath: path.join(root, "afterState.json"),
    replayArtifactPath: path.join(root, "pipelineReplayOutput.json"),
    expectedMatchesPath: path.join(root, "expectedMatches.json"),
    resolutionSequencePath: path.join(root, "resolutionSequence.json"),
    expectedSummaryPath: path.join(root, "expectedScenarioSummary.json"),
    provenancePath: path.join(root, "fixtureProvenance.json"),
    transcriptPath: path.join(root, "transcript.txt"),
  };
}

function readScenarioFixtureSet(fixtureRoot) {
  const root = resolveFixtureRoot(fixtureRoot);
  const paths = buildFixturePaths(root);

  return {
    root,
    paths,
    fileNames: readdirSync(root),
    scenario: readJson(paths.scenarioPath),
    beforeState: readJson(paths.beforeStatePath),
    afterState: readJson(paths.afterStatePath),
    replayArtifact: readJson(paths.replayArtifactPath),
    expectedMatches: readJson(paths.expectedMatchesPath),
    resolutionSequence: readJson(paths.resolutionSequencePath),
    expectedSummary: readJson(paths.expectedSummaryPath),
    provenance: readJson(paths.provenancePath),
    transcript: readFileSync(paths.transcriptPath, "utf8"),
  };
}

function ensureFixturePaths(fixtureSet, fixtureRoot) {
  if (isPlainObject(fixtureSet?.paths)) {
    return fixtureSet;
  }

  if (!isNonEmptyString(fixtureRoot)) {
    return fixtureSet;
  }

  const root = resolveFixtureRoot(fixtureRoot);
  return {
    ...fixtureSet,
    root,
    paths: buildFixturePaths(root),
    fileNames: Array.isArray(fixtureSet?.fileNames)
      ? [...fixtureSet.fileNames]
      : readdirSync(root),
  };
}

function validateScenarioFixtureSet(fixtureSet) {
  const issues = [];
  const requiredFileValidation = validateRequiredScenarioFixtureSetFiles(
    Array.isArray(fixtureSet?.fileNames) ? fixtureSet.fileNames : []
  );

  if (!requiredFileValidation.valid) {
    issues.push(...requiredFileValidation.issues);
  }

  const provenanceValidation = validateFixtureProvenance(fixtureSet?.provenance);
  if (!provenanceValidation.valid) {
    issues.push(...provenanceValidation.issues);
  }

  if (!isPlainObject(fixtureSet?.scenario)) {
    issues.push("scenario fixture must expose scenario metadata.");
  }

  if (!isPlainObject(fixtureSet?.beforeState)) {
    issues.push("scenario fixture must expose beforeState.");
  }

  if (!isPlainObject(fixtureSet?.afterState)) {
    issues.push("scenario fixture must expose afterState.");
  }

  if (!isPlainObject(fixtureSet?.replayArtifact)) {
    issues.push("scenario fixture must expose replayArtifact.");
  }

  if (!isPlainObject(fixtureSet?.expectedSummary)) {
    issues.push("scenario fixture must expose expectedSummary.");
  }

  if (
    !isPlainObject(fixtureSet?.resolutionSequence) ||
    !Array.isArray(fixtureSet.resolutionSequence.steps)
  ) {
    issues.push("scenario fixture must expose resolutionSequence.steps.");
  }

  return issues;
}

function ensureScenarioIdentity(input, fixtureSet) {
  const issues = [];

  if (
    isNonEmptyString(input.scenarioId) &&
    fixtureSet.scenario?.scenarioId !== input.scenarioId
  ) {
    issues.push("input.scenarioId must match fixture scenarioId.");
  }

  if (
    isNonEmptyString(input.corridorId) &&
    fixtureSet.scenario?.corridorId !== input.corridorId
  ) {
    issues.push("input.corridorId must match fixture corridorId.");
  }

  return issues;
}

function findEntityByType(stateDocument, entityType) {
  return Array.isArray(stateDocument?.entities)
    ? stateDocument.entities.find(
        (entity) => isPlainObject(entity) && entity.entityType === entityType
      ) || null
    : null;
}

function findEntityById(stateDocument, entityId) {
  return Array.isArray(stateDocument?.entities)
    ? stateDocument.entities.find(
        (entity) => isPlainObject(entity) && entity.entityId === entityId
      ) || null
    : null;
}

function requireEntityIdByType(stateDocument, entityType) {
  const entity = findEntityByType(stateDocument, entityType);
  if (!isNonEmptyString(entity?.entityId)) {
    throw new Error(`Missing entityId for entityType ${entityType}.`);
  }

  return entity.entityId;
}

function updateEntityStatus(stateDocument, entityType, nextStatus) {
  const nextState = deepClone(stateDocument);
  const entity = findEntityByType(nextState, entityType);

  if (!entity) {
    throw new Error(`Missing entityType ${entityType} in scenario state.`);
  }

  entity.status = nextStatus;
  return nextState;
}

function updateManyEntityStatuses(stateDocument, updates) {
  let nextState = deepClone(stateDocument);

  for (const [entityType, nextStatus] of Object.entries(updates)) {
    nextState = updateEntityStatus(nextState, entityType, nextStatus);
  }

  return nextState;
}

function normalizeStateSnapshot(stateDocument) {
  const entities = Array.isArray(stateDocument?.entities)
    ? stateDocument.entities
        .filter((entity) => isPlainObject(entity))
        .map((entity) => ({
          entityType: entity.entityType || null,
          entityId: entity.entityId || null,
          status: entity.status || null,
        }))
        .sort((left, right) => {
          const leftKey = `${left.entityType}:${left.entityId}`;
          const rightKey = `${right.entityType}:${right.entityId}`;
          return leftKey.localeCompare(rightKey);
        })
    : [];

  return {
    scenarioId: stateDocument?.scenarioId || null,
    corridorId: stateDocument?.corridorId || null,
    entities,
  };
}

function buildStateFingerprint(stateDocument) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizeStateSnapshot(stateDocument)))
    .digest("hex");
}

function diffStates(previousState, nextState) {
  const previousEntities = new Map(
    (previousState?.entities || [])
      .filter((entity) => isPlainObject(entity) && isNonEmptyString(entity.entityId))
      .map((entity) => [entity.entityId, entity])
  );
  const nextEntities = new Map(
    (nextState?.entities || [])
      .filter((entity) => isPlainObject(entity) && isNonEmptyString(entity.entityId))
      .map((entity) => [entity.entityId, entity])
  );
  const changes = [];

  for (const [entityId, previousEntity] of previousEntities.entries()) {
    const nextEntity = nextEntities.get(entityId);

    if (!nextEntity) {
      changes.push({
        entityId,
        entityType: previousEntity.entityType || null,
        changeType: "REMOVED",
        fromStatus: previousEntity.status || null,
        toStatus: null,
      });
      continue;
    }

    if (previousEntity.status !== nextEntity.status) {
      changes.push({
        entityId,
        entityType: previousEntity.entityType || nextEntity.entityType || null,
        changeType: "UPDATED",
        fromStatus: previousEntity.status || null,
        toStatus: nextEntity.status || null,
      });
    }
  }

  for (const [entityId, nextEntity] of nextEntities.entries()) {
    if (previousEntities.has(entityId)) {
      continue;
    }

    changes.push({
      entityId,
      entityType: nextEntity.entityType || null,
      changeType: "CREATED",
      fromStatus: null,
      toStatus: nextEntity.status || null,
    });
  }

  changes.sort((left, right) => left.entityId.localeCompare(right.entityId));

  return {
    changed: changes.length > 0,
    changes,
  };
}

const LIFECYCLE_ORDER_BY_ENTITY_TYPE = Object.freeze({
  corridor_zone: Object.freeze([
    "UNDER_REVIEW",
    "ACTIVE_WORK_WINDOW",
    "CONTESTED",
    "CONDITIONED_ACCESS",
    "ACTIVE_TRAFFIC",
    "FOLLOW_UP_CONTROLLED",
  ]),
  organization: Object.freeze([
    "PARTICIPATING",
    "OWNER_CONFIRMED",
    "REQUESTING_ACCESS",
    "AUTHORIZED_WITH_CONDITIONS",
  ]),
  permit_application: Object.freeze(["SUBMITTED", "ISSUED"]),
  inspection: Object.freeze(["UNSCHEDULED", "SCHEDULED", "PASSED"]),
  authority_grant: Object.freeze([
    "PENDING",
    "APPROVED",
    "ACTIVE",
    "EXECUTED",
    "CLAIMED_ACTIVE",
    "REVOKED",
  ]),
  decision_record: Object.freeze(["DRAFT", "APPROVED", "DEFERRED", "RESOLVED"]),
  obligation: Object.freeze(["OPEN", "ACTIVE"]),
  action_request: Object.freeze([
    "SUBMITTED",
    "DEFERRED",
    "CONDITIONED",
    "RESOLVED_WITH_CONDITIONS",
  ]),
  incident_observation: Object.freeze(["OPEN", "ESCALATED", "CLOSED"]),
  utility_asset: Object.freeze(["FAILED", "REPAIRED"]),
  device: Object.freeze(["ALERTING", "NORMALIZED"]),
  critical_site: Object.freeze(["AT_RISK", "SERVICE_RESTORED"]),
});

function findStatusIndex(entityType, status) {
  const order = LIFECYCLE_ORDER_BY_ENTITY_TYPE[entityType];
  if (!Array.isArray(order)) {
    return -1;
  }

  return order.indexOf(status);
}

function evaluateLifecycleTransition(previousState, nextState, action) {
  const previousEntities = new Map(
    (previousState?.entities || [])
      .filter((entity) => isPlainObject(entity) && isNonEmptyString(entity.entityId))
      .map((entity) => [entity.entityId, entity])
  );
  const nextEntities = new Map(
    (nextState?.entities || [])
      .filter((entity) => isPlainObject(entity) && isNonEmptyString(entity.entityId))
      .map((entity) => [entity.entityId, entity])
  );
  const regressions = [];
  const allowedRevocations = [];

  for (const [entityId, previousEntity] of previousEntities.entries()) {
    const nextEntity = nextEntities.get(entityId);
    if (!nextEntity || previousEntity.status === nextEntity.status) {
      continue;
    }

    if (nextEntity.status === "REVOKED") {
      if (action === EXPLICIT_REVOKE_ACTION) {
        allowedRevocations.push({
          entityId,
          entityType: nextEntity.entityType || previousEntity.entityType || null,
          fromStatus: previousEntity.status || null,
          toStatus: nextEntity.status,
        });
      } else {
        regressions.push({
          entityId,
          entityType: nextEntity.entityType || previousEntity.entityType || null,
          fromStatus: previousEntity.status || null,
          toStatus: nextEntity.status,
          reason: "revocation_without_explicit_step",
        });
      }
      continue;
    }

    const previousIndex = findStatusIndex(
      previousEntity.entityType,
      previousEntity.status
    );
    const nextIndex = findStatusIndex(nextEntity.entityType, nextEntity.status);

    if (previousIndex >= 0 && nextIndex >= 0 && nextIndex < previousIndex) {
      regressions.push({
        entityId,
        entityType: nextEntity.entityType || previousEntity.entityType || null,
        fromStatus: previousEntity.status || null,
        toStatus: nextEntity.status || null,
        reason: "lifecycle_regression_without_revoke",
      });
    }
  }

  return {
    regressions,
    allowedRevocations,
  };
}

function normalizeInput(input) {
  if (!isPlainObject(input)) {
    return {};
  }

  return {
    scenarioId: isNonEmptyString(input.scenarioId) ? input.scenarioId : null,
    corridorId: isNonEmptyString(input.corridorId) ? input.corridorId : null,
    fixtureRoot: isNonEmptyString(input.fixtureRoot) ? input.fixtureRoot : null,
    fixtureSet: isPlainObject(input.fixtureSet) ? deepClone(input.fixtureSet) : null,
    bridgeInputOverrides: isPlainObject(input.bridgeInputOverrides)
      ? deepClone(input.bridgeInputOverrides)
      : {},
    bridgeOutputOverride: isPlainObject(input.bridgeOutputOverride)
      ? deepClone(input.bridgeOutputOverride)
      : null,
    stateOverrides: isPlainObject(input.stateOverrides)
      ? deepClone(input.stateOverrides)
      : {},
    outputDirectory: isNonEmptyString(input.outputDirectory)
      ? input.outputDirectory
      : null,
    mode:
      input.mode === RUNNER_MODE.LIVE ? RUNNER_MODE.LIVE : RUNNER_MODE.REPLAY,
    evaluatedAt: resolveEvaluatedAt(input),
  };
}

function buildSelectedMatchProvenance(selectedMatch) {
  if (!isPlainObject(selectedMatch)) {
    return null;
  }

  return {
    matchId: selectedMatch.matchId || null,
    captureItemId: selectedMatch.sourceExtraction?.captureItemId || null,
    clauseText: selectedMatch.sourceExtraction?.clauseText || null,
    matchType: selectedMatch.matchType || null,
    confidenceTier: selectedMatch.confidenceTier || null,
    targetEntityType: selectedMatch.targetGovernanceItem?.entityType || null,
    targetEntityId: selectedMatch.targetGovernanceItem?.entityId || null,
  };
}

function buildCandidateSignalPatch(context, absence = null) {
  const governanceHandoff = isPlainObject(
    context.bridgeOutput?.extractionOutput?.governance_handoff
  )
    ? deepClone(context.bridgeOutput.extractionOutput.governance_handoff)
    : {};
  const governance = {
    proof_mode: "wave8_packet4_resolution_cascade",
    scenario_id: context.fixtureSet.scenario.scenarioId,
    corridor_id: context.fixtureSet.scenario.corridorId,
    variant_name: context.profile.variantName,
    step_id: context.step.stepId,
    capture_handoff: governanceHandoff,
    selected_match: buildSelectedMatchProvenance(context.selectedMatch),
  };

  if (isPlainObject(absence) && Object.keys(absence).length > 0) {
    governance.absence = deepClone(absence);
  }

  return {
    governance,
  };
}

function createCommandRequest(options) {
  const authorityContext = {
    resolved:
      typeof options.authorityResolved === "boolean"
        ? options.authorityResolved
        : true,
    requested_by_role: options.requestedByRole,
    required_approvals: [...options.requiredApprovals],
    resolved_approvals: [...options.resolvedApprovals],
    missing_approvals: [...options.missingApprovals],
  };

  if (isPlainObject(options.domainContext)) {
    authorityContext.domain_context = deepClone(options.domainContext);
  }

  if (isPlainObject(options.actorContext)) {
    authorityContext.actor_context = deepClone(options.actorContext);
  }

  if (isPlainObject(options.authorityExtras)) {
    Object.assign(authorityContext, deepClone(options.authorityExtras));
  }

  return {
    kind: "command_request",
    org_id: DEFAULT_ORG_ID,
    entity_ref: {
      entity_id: options.entityId,
      entity_type:
        options.entityType === undefined ? null : options.entityType,
    },
    authority_context: authorityContext,
    evidence_context: {
      required_count: options.requiredCount,
      present_count: options.presentCount,
      missing_types: [...options.missingTypes],
    },
    confidence_context: null,
    candidate_signal_patch: deepClone(options.candidateSignalPatch || null),
    raw_subject: options.rawSubject,
  };
}

function buildPublicNoticeRequest(context, options = {}) {
  return createCommandRequest({
    entityId: options.entityId,
    entityType:
      Object.prototype.hasOwnProperty.call(options, "entityType")
        ? options.entityType
        : null,
    rawSubject: options.rawSubject,
    requestedByRole: options.requestedByRole,
    requiredApprovals: options.requiredApprovals || [],
    resolvedApprovals: options.resolvedApprovals || [],
    missingApprovals: options.missingApprovals || [],
    requiredCount: options.requiredCount ?? 0,
    presentCount: options.presentCount ?? 0,
    missingTypes: options.missingTypes || [],
    authorityResolved:
      typeof options.authorityResolved === "boolean"
        ? options.authorityResolved
        : true,
    actorContext: options.actorContext,
    authorityExtras: options.authorityExtras,
    candidateSignalPatch: buildCandidateSignalPatch(
      context,
      options.absence || null
    ),
  });
}

function buildAuthorityDomainContext(domainId, evaluatedAt, authorityGrant) {
  const domainContext = {
    domain_id: domainId,
    role_id: "city_manager",
    requester_org_id: "fw_city_manager",
    jurisdiction_id: "city",
    evaluation_time: evaluatedAt,
  };

  if (authorityGrant !== undefined) {
    domainContext.authority_grant = deepClone(authorityGrant);
  }

  return domainContext;
}

function buildActiveInspectionGrant(scopeDomainId = "inspection_resolution") {
  return {
    status: "active",
    jurisdiction: "city",
    scope_of_authority: [scopeDomainId],
    granted_by_entity_id: "grantor:fw-city-manager-office",
    delegation_chain_ids: ["delegation:fw-city-manager-office"],
  };
}

function buildRevokedInspectionGrant(
  evaluatedAt,
  scopeDomainId = "inspection_resolution"
) {
  return {
    status: "revoked",
    jurisdiction: "city",
    scope_of_authority: [scopeDomainId],
    granted_by_entity_id: "grantor:fw-city-manager-office",
    delegation_chain_ids: ["delegation:fw-city-manager-office"],
    revoked_at: evaluatedAt,
  };
}

function buildInspectionRequest(context, options = {}) {
  return createCommandRequest({
    entityId: options.entityId,
    entityType: "inspection",
    rawSubject: options.rawSubject,
    requestedByRole: options.requestedByRole || "city_manager",
    requiredApprovals: options.requiredApprovals || [],
    resolvedApprovals: options.resolvedApprovals || [],
    missingApprovals: options.missingApprovals || [],
    requiredCount: options.requiredCount ?? 0,
    presentCount: options.presentCount ?? 0,
    missingTypes: options.missingTypes || [],
    authorityResolved:
      typeof options.authorityResolved === "boolean"
        ? options.authorityResolved
        : true,
    domainContext: options.domainContext,
    candidateSignalPatch: buildCandidateSignalPatch(
      context,
      options.absence || null
    ),
  });
}

function buildUtilityCorridorRequest(context, options = {}) {
  return createCommandRequest({
    entityId: options.entityId,
    entityType: "action_request",
    rawSubject: options.rawSubject,
    requestedByRole: options.requestedByRole,
    requiredApprovals: options.requiredApprovals || [],
    resolvedApprovals: options.resolvedApprovals || [],
    missingApprovals: options.missingApprovals || [],
    requiredCount: options.requiredCount ?? 0,
    presentCount: options.presentCount ?? 0,
    missingTypes: options.missingTypes || [],
    authorityResolved:
      typeof options.authorityResolved === "boolean"
        ? options.authorityResolved
        : true,
    authorityExtras: options.authorityExtras,
    candidateSignalPatch: buildCandidateSignalPatch(
      context,
      options.absence || null
    ),
  });
}

function buildRoutineR1Request(context) {
  return buildPublicNoticeRequest(context, {
    entityId: requireEntityIdByType(context.state, "obligation"),
    rawSubject: "constellation.commands.fortworth-dev.public-notice-lancaster-reconstruction",
    requestedByRole: "planning_coordinator",
    requiredApprovals: ["planning_office"],
    resolvedApprovals: ["planning_office"],
    missingApprovals: [],
    requiredCount: 1,
    presentCount: 1,
    missingTypes: [],
    absence: {
      notice_missing: true,
    },
  });
}

function buildRoutineR2Request(context) {
  return buildInspectionRequest(context, {
    entityId: requireEntityIdByType(context.state, "inspection"),
    rawSubject:
      "constellation.commands.fortworth-dev.inspection-lancaster-site-visit-001",
    requestedByRole: "fire_inspector",
    requiredApprovals: ["fire_department"],
    resolvedApprovals: ["fire_department"],
    missingApprovals: [],
    requiredCount: 2,
    presentCount: 1,
    missingTypes: ["inspection_confirmation"],
  });
}

function buildRoutineR3Request(context) {
  return buildInspectionRequest(context, {
    entityId: requireEntityIdByType(context.state, "inspection"),
    rawSubject:
      "constellation.commands.fortworth-dev.inspection-lancaster-site-visit-001",
    requestedByRole: "fire_inspector",
    requiredApprovals: ["fire_department"],
    resolvedApprovals: ["fire_department"],
    missingApprovals: [],
    requiredCount: 2,
    presentCount: 2,
    missingTypes: [],
  });
}

function buildRoutineR4Request(context) {
  return createCommandRequest({
    entityId: requireEntityIdByType(context.state, "permit_application"),
    entityType: null,
    rawSubject: "constellation.commands.fortworth-dev.permit-lancaster-reconstruction-issuance",
    requestedByRole: "development_services",
    requiredApprovals: ["development_services"],
    resolvedApprovals: ["development_services"],
    missingApprovals: [],
    requiredCount: 2,
    presentCount: 2,
    missingTypes: [],
    candidateSignalPatch: buildCandidateSignalPatch(context),
  });
}

function buildContestedC1Request(context) {
  return buildPublicNoticeRequest(context, {
    entityId: requireEntityIdByType(context.state, "action_request"),
    entityType: "action_request",
    rawSubject:
      "constellation.commands.fortworth-dev.public-notice-hemphill-access-review",
    requestedByRole: "communications_coordinator",
    requiredApprovals: ["communications_office", "city_clerk"],
    resolvedApprovals: ["communications_office"],
    missingApprovals: ["city_clerk"],
    requiredCount: 2,
    presentCount: 1,
    missingTypes: ["public_hearing_record"],
    authorityResolved: false,
    absence: {
      notice_missing: true,
    },
  });
}

function buildContestedC2Request(context) {
  const authorityId =
    findEntityById(context.fixtureSet.afterState, "authority:hemphill-corrected-grant")
      ?.entityId || "authority:hemphill-corrected-grant";

  return buildPublicNoticeRequest(context, {
    entityId: authorityId,
    rawSubject:
      "constellation.commands.fortworth-dev.public-notice-hemphill-authority-review",
    requestedByRole: "communications_coordinator",
    requiredApprovals: ["communications_office", "city_clerk"],
    resolvedApprovals: ["communications_office"],
    missingApprovals: ["city_clerk"],
    requiredCount: 3,
    presentCount: 3,
    missingTypes: [],
    authorityResolved: false,
    actorContext: {
      actor_id: "actor:hemphill-partner-representative",
      target_id: authorityId,
      chain_depth_cap: 4,
      tuples: [
        {
          subject: "actor:hemphill-partner-representative",
          relation: "member_of",
          object: "org:hemphill-corridor-partnership",
        },
        {
          subject: "org:hemphill-corridor-partnership",
          relation: "member_of",
          object: "org:planning-review",
        },
      ],
    },
  });
}

function buildContestedC3Request(context) {
  return createCommandRequest({
    entityId: "permit:hemphill-authority-review",
    entityType: null,
    rawSubject:
      "constellation.commands.fortworth-dev.permit-hemphill-authority-review",
    requestedByRole: "city_manager",
    requiredApprovals: ["city_manager"],
    resolvedApprovals: ["city_manager"],
    missingApprovals: [],
    requiredCount: 1,
    presentCount: 1,
    missingTypes: [],
    domainContext: buildAuthorityDomainContext(
      "permit_authorization",
      context.evaluatedAt
    ),
    candidateSignalPatch: buildCandidateSignalPatch(context),
  });
}

function buildContestedC4Request(context) {
  return createCommandRequest({
    entityId: "permit:hemphill-authority-review",
    entityType: null,
    rawSubject:
      "constellation.commands.fortworth-dev.permit-hemphill-authority-review",
    requestedByRole: "city_manager",
    requiredApprovals: ["city_manager"],
    resolvedApprovals: ["city_manager"],
    missingApprovals: [],
    requiredCount: 1,
    presentCount: 1,
    missingTypes: [],
    domainContext: buildAuthorityDomainContext(
      "permit_authorization",
      context.evaluatedAt,
      buildRevokedInspectionGrant(context.evaluatedAt, "permit_authorization")
    ),
    candidateSignalPatch: buildCandidateSignalPatch(context),
  });
}

function buildContestedC5Request(context) {
  const authorityId =
    findEntityByType(context.state, "authority_grant")?.entityId ||
    "authority:hemphill-corrected-grant";

  return buildPublicNoticeRequest(context, {
    entityId: authorityId,
    rawSubject:
      "constellation.commands.fortworth-dev.public-notice-hemphill-authority-review",
    requestedByRole: "communications_coordinator",
    requiredApprovals: ["communications_office", "city_clerk"],
    resolvedApprovals: ["communications_office", "city_clerk"],
    missingApprovals: [],
    requiredCount: 3,
    presentCount: 3,
    missingTypes: [],
    actorContext: {
      actor_id: "actor:hemphill-partner-representative",
      target_id: authorityId,
      chain_depth_cap: 4,
      tuples: [
        {
          subject: "actor:hemphill-partner-representative",
          relation: "member_of",
          object: "org:hemphill-corridor-partnership",
        },
        {
          subject: "org:hemphill-corridor-partnership",
          relation: "authorizes",
          object: authorityId,
        },
      ],
    },
  });
}

function buildEmergencyE1Request(context) {
  return buildUtilityCorridorRequest(context, {
    entityId: "action-request:camp-bowie-emergency-window",
    rawSubject:
      "constellation.commands.fortworth-dev.utility-corridor-emergency-window",
    requestedByRole: "water_ops_supervisor",
    requiredApprovals: ["tpw_row", "development_services", "water_department"],
    resolvedApprovals: ["water_department"],
    missingApprovals: ["tpw_row", "development_services"],
    requiredCount: 3,
    presentCount: 2,
    missingTypes: ["utility_conflict_assessment"],
    authorityResolved: false,
    authorityExtras: {
      operations_context: {
        crew_status: {
          posture: "break_response",
        },
      },
    },
  });
}

function buildEmergencyE2Request(context) {
  const authorityId =
    findEntityByType(context.state, "authority_grant")?.entityId ||
    "authority:camp-bowie-emergency-window";

  return createCommandRequest({
    entityId: authorityId,
    entityType: null,
    rawSubject:
      "constellation.commands.fortworth-dev.inspection-camp-bowie-emergency-verification",
    requestedByRole: "city_manager",
    requiredApprovals: ["city_manager"],
    resolvedApprovals: ["city_manager"],
    missingApprovals: [],
    requiredCount: 1,
    presentCount: 1,
    missingTypes: [],
    actorContext: {
      actor_id: "actor:fw-city-manager",
      target_id: authorityId,
      chain_depth_cap: 4,
      tuples: [
        {
          subject: "actor:fw-city-manager",
          relation: "authorizes",
          object: authorityId,
        },
      ],
    },
    candidateSignalPatch: buildCandidateSignalPatch(context),
  });
}

function buildEmergencyE3Request(context) {
  return buildUtilityCorridorRequest(context, {
    entityId: "action-request:camp-bowie-emergency-window",
    rawSubject:
      "constellation.commands.fortworth-dev.utility-corridor-emergency-window",
    requestedByRole: "water_ops_supervisor",
    requiredApprovals: ["tpw_row", "development_services", "water_department"],
    resolvedApprovals: ["tpw_row", "development_services", "water_department"],
    missingApprovals: [],
    requiredCount: 3,
    presentCount: 3,
    missingTypes: [],
  });
}

function buildEmergencyE4Request(context) {
  return buildInspectionRequest(context, {
    entityId: "inspection:camp-bowie-repair-verification",
    rawSubject:
      "constellation.commands.fortworth-dev.inspection-camp-bowie-repair-verification",
    requiredApprovals: ["city_manager"],
    resolvedApprovals: ["city_manager"],
    missingApprovals: [],
    requiredCount: 1,
    presentCount: 1,
    missingTypes: [],
  });
}

function buildEmergencyE5Request(context) {
  return buildUtilityCorridorRequest(context, {
    entityId: requireEntityIdByType(context.state, "obligation"),
    rawSubject:
      "constellation.commands.fortworth-dev.utility-corridor-follow-up-restoration",
    requestedByRole: "water_ops_supervisor",
    requiredApprovals: ["tpw_row", "development_services", "water_department"],
    resolvedApprovals: ["tpw_row", "water_department"],
    missingApprovals: ["development_services"],
    requiredCount: 2,
    presentCount: 1,
    missingTypes: ["pavement_restoration_plan"],
    authorityResolved: false,
  });
}

function applyRoutineR1(currentState) {
  return updateEntityStatus(currentState, "decision_record", "APPROVED");
}

function applyRoutineR2(currentState) {
  return updateEntityStatus(currentState, "inspection", "SCHEDULED");
}

function applyRoutineR3(currentState) {
  return updateEntityStatus(currentState, "inspection", "PASSED");
}

function applyRoutineR4(currentState, fixtureSet) {
  return deepClone(fixtureSet.afterState);
}

function applyContestedC1(currentState) {
  return updateEntityStatus(currentState, "action_request", "DEFERRED");
}

function applyContestedC2(currentState) {
  return updateManyEntityStatuses(currentState, {
    action_request: "CONDITIONED",
    corridor_zone: "CONDITIONED_ACCESS",
  });
}

function applyNoop(currentState) {
  return deepClone(currentState);
}

function applyContestedC4(currentState) {
  return updateEntityStatus(currentState, "authority_grant", "REVOKED");
}

function applyContestedC5(currentState, fixtureSet) {
  return deepClone(fixtureSet.afterState);
}

function applyEmergencyE1(currentState) {
  return updateEntityStatus(currentState, "incident_observation", "ESCALATED");
}

function applyEmergencyE2(currentState) {
  return updateEntityStatus(currentState, "authority_grant", "APPROVED");
}

function applyEmergencyE4(currentState) {
  return updateManyEntityStatuses(currentState, {
    corridor_zone: "FOLLOW_UP_CONTROLLED",
    utility_asset: "REPAIRED",
    device: "NORMALIZED",
    critical_site: "SERVICE_RESTORED",
    incident_observation: "CLOSED",
    authority_grant: "EXECUTED",
  });
}

function applyEmergencyE5(currentState, fixtureSet) {
  return deepClone(fixtureSet.afterState);
}

const STEP_PROFILE_CATALOG = Object.freeze({
  "routine-lancaster-avenue-corridor-reconstruction": Object.freeze([
    Object.freeze({
      stepId: "R1",
      action: "APPROVE",
      selectedClauseText: "Approve the reconstruction package",
      captureItemId: "directive:S1:1",
      variantName: "routine-approve-public-notice-supervise",
      expectedDecision: "SUPERVISE",
      requestTemplateSource: "wave8.packet4.routine.approve.public_notice",
      buildRequest: buildRoutineR1Request,
      applyState: applyRoutineR1,
    }),
    Object.freeze({
      stepId: "R2",
      action: "INSPECTION_SCHEDULED",
      selectedClauseText: "schedule the corridor inspection",
      captureItemId: "directive:S1:1",
      variantName: "routine-inspection-scheduled-hold",
      expectedDecision: "HOLD",
      requestTemplateSource: "wave8.packet4.routine.inspection.evidence_gap",
      buildRequest: buildRoutineR2Request,
      applyState: applyRoutineR2,
    }),
    Object.freeze({
      stepId: "R3",
      action: "INSPECTION_PASSED",
      selectedClauseText: "the inspection pass",
      captureItemId: "directive:S2:1",
      variantName: "routine-inspection-passed-allow",
      expectedDecision: "ALLOW",
      requestTemplateSource: "wave8.packet4.routine.inspection.allow",
      buildRequest: buildRoutineR3Request,
      applyState: applyRoutineR3,
    }),
    Object.freeze({
      stepId: "R4",
      action: "PERMIT_ISSUED",
      selectedClauseText: "Issue the permit",
      captureItemId: "directive:S2:1",
      variantName: "routine-permit-issued-supervise",
      expectedDecision: "SUPERVISE",
      requestTemplateSource: "wave8.packet4.routine.permit.supervise",
      buildRequest: buildRoutineR4Request,
      applyState: applyRoutineR4,
    }),
  ]),
  "contested-hemphill-street-mixed-use-contested-authority": Object.freeze([
    Object.freeze({
      stepId: "C1",
      action: "DEFER",
      selectedClauseText: "Defer action",
      captureItemId: "hold:S1:1",
      variantName: "contested-defer-public-notice-hold",
      expectedDecision: "HOLD",
      requestTemplateSource: "wave8.packet4.contested.defer.public_notice",
      buildRequest: buildContestedC1Request,
      applyState: applyContestedC1,
    }),
    Object.freeze({
      stepId: "C2",
      action: "CONDITION",
      selectedClauseText: "a signed corridor operations grant",
      captureItemId: "hold:S2:1",
      variantName: "contested-condition-authority-hold",
      expectedDecision: "HOLD",
      requestTemplateSource: "wave8.packet4.contested.condition.authority_hold",
      buildRequest: buildContestedC2Request,
      applyState: applyContestedC2,
    }),
    Object.freeze({
      stepId: "C3",
      action: "PHANTOM_AUTHORITY_DETECTED",
      selectedClauseText: "phantom authority is removed",
      captureItemId: "hold:S1:1",
      variantName: "contested-phantom-authority-detected",
      expectedDecision: "HOLD",
      requestTemplateSource: "wave8.packet4.contested.phantom.authority_hold",
      buildRequest: buildContestedC3Request,
      applyState: applyNoop,
    }),
    Object.freeze({
      stepId: "C4",
      action: "REVOKE",
      selectedClauseText: "Revoke the phantom memo path",
      captureItemId: "directive:S3:1",
      variantName: "contested-revoke-authority",
      expectedDecision: "REVOKE",
      requestTemplateSource: "wave8.packet4.contested.revoke.authority",
      buildRequest: buildContestedC4Request,
      applyState: applyContestedC4,
    }),
    Object.freeze({
      stepId: "C5",
      action: "CONTESTED_AUTHORITY_RESOLVED",
      selectedClauseText: "a signed corridor operations grant",
      captureItemId: "hold:S2:1",
      variantName: "contested-authority-resolved-supervise",
      expectedDecision: "SUPERVISE",
      requestTemplateSource: "wave8.packet4.contested.resolved.supervise",
      buildRequest: buildContestedC5Request,
      applyState: applyContestedC5,
    }),
  ]),
  "emergency-camp-bowie-water-main-break": Object.freeze([
    Object.freeze({
      stepId: "E1",
      action: "ESCALATE",
      selectedClauseText: "Escalate the water main break",
      captureItemId: "directive:S1:1",
      variantName: "emergency-escalate-hold",
      expectedDecision: "HOLD",
      requestTemplateSource: "wave8.packet4.emergency.escalate.hold",
      buildRequest: buildEmergencyE1Request,
      applyState: applyEmergencyE1,
    }),
    Object.freeze({
      stepId: "E2",
      action: "EMERGENCY_AUTHORITY_APPROVED",
      selectedClauseText: "emergency authority is approved",
      captureItemId: "hold:S2:1",
      variantName: "emergency-authority-approved-allow",
      expectedDecision: "ALLOW",
      requestTemplateSource: "wave8.packet4.emergency.authority.allow",
      buildRequest: buildEmergencyE2Request,
      applyState: applyEmergencyE2,
    }),
    Object.freeze({
      stepId: "E3",
      action: "HARD_STOP",
      selectedClauseText: "Apply a hard stop to unrelated excavation",
      captureItemId: "hold:S2:1",
      variantName: "emergency-hard-stop-block",
      expectedDecision: "BLOCK",
      requestTemplateSource: "wave8.packet4.emergency.hard_stop.block",
      buildRequest: buildEmergencyE3Request,
      applyState: applyNoop,
    }),
    Object.freeze({
      stepId: "E4",
      action: "REPAIR_COMPLETED",
      selectedClauseText: "Complete the repair",
      captureItemId: "directive:S3:1",
      variantName: "emergency-repair-completed-allow",
      expectedDecision: "ALLOW",
      requestTemplateSource: "wave8.packet4.emergency.repair.allow",
      buildRequest: buildEmergencyE4Request,
      applyState: applyEmergencyE4,
    }),
    Object.freeze({
      stepId: "E5",
      action: "POST_REPAIR_OBLIGATION_CREATED",
      selectedClauseText: "carry forward the post-repair restoration obligation",
      captureItemId: "directive:S3:1",
      variantName: "emergency-post-repair-hold",
      expectedDecision: "HOLD",
      requestTemplateSource: "wave8.packet4.emergency.follow_up.hold",
      buildRequest: buildEmergencyE5Request,
      applyState: applyEmergencyE5,
    }),
  ]),
});

function assertScenarioStepProfile(definition) {
  if (
    !isPlainObject(definition) ||
    !isNonEmptyString(definition.stepId) ||
    !isNonEmptyString(definition.action) ||
    !isNonEmptyString(definition.selectedClauseText) ||
    !isNonEmptyString(definition.captureItemId) ||
    !isNonEmptyString(definition.variantName) ||
    !isNonEmptyString(definition.expectedDecision) ||
    !isNonEmptyString(definition.requestTemplateSource) ||
    typeof definition.buildRequest !== "function" ||
    typeof definition.applyState !== "function"
  ) {
    throw new TypeError("Invalid Packet 4 step profile definition.");
  }

  return definition;
}

function resolveScenarioStepProfiles(fixtureSet) {
  const definitions = STEP_PROFILE_CATALOG[fixtureSet.scenario.scenarioId];
  if (!Array.isArray(definitions)) {
    return null;
  }

  return definitions.map(assertScenarioStepProfile);
}

function buildCascadeProfile(stepProfile) {
  return {
    sourceVersion: CASCADE_PROFILE_VERSION,
    variantName: stepProfile.variantName,
    selectedClauseText: stepProfile.selectedClauseText,
    expectedDecision: stepProfile.expectedDecision,
    requestTemplateSource: stepProfile.requestTemplateSource,
    buildRequest(context) {
      return stepProfile.buildRequest({
        ...context,
        state: context.fixtureSet?.beforeState || null,
        step: {
          stepId: stepProfile.stepId,
          action: stepProfile.action,
        },
      });
    },
  };
}

function filterBridgeItems(baseBridgeOutput, stepProfile) {
  const extractionOutput = deepClone(baseBridgeOutput.extractionOutput || {});
  const captureArtifact = isPlainObject(extractionOutput.capture_artifact)
    ? extractionOutput.capture_artifact
    : null;
  const governanceHandoff = isPlainObject(extractionOutput.governance_handoff)
    ? extractionOutput.governance_handoff
    : null;

  if (captureArtifact && Array.isArray(captureArtifact.extracted_items)) {
    captureArtifact.extracted_items = captureArtifact.extracted_items
      .filter(
        (entry) =>
          entry?.capture_item_id === stepProfile.captureItemId
      )
      .map((entry) => ({
        ...deepClone(entry),
        summary: stepProfile.selectedClauseText,
      }));
  }

  if (governanceHandoff && Array.isArray(governanceHandoff.selected_items)) {
    governanceHandoff.selected_items = governanceHandoff.selected_items
      .filter(
        (entry) =>
          entry?.capture_item_id === stepProfile.captureItemId
      )
      .map((entry) => ({
        ...deepClone(entry),
        normalized_summary: stepProfile.selectedClauseText,
      }));
  }

  return assertPipelineBridgeOutputV1({
    ...deepClone(baseBridgeOutput),
    extractionOutput,
  });
}

function createSharedForensicContext(outputDirectory, scenarioId, evaluatedAt) {
  let persistence = null;

  if (isNonEmptyString(outputDirectory)) {
    persistence = new ChainPersistence({
      cwd: DEFAULT_REPOSITORY_ROOT,
      chainDirectory: outputDirectory,
      chainFileName: `${scenarioId}.forensic-chain.json`,
    });
  }

  return {
    persistence,
    writer: new GovernanceChainWriter({
      persistence,
      now: () => evaluatedAt,
    }),
  };
}

function buildInitialCascadeResult(input = {}) {
  return {
    contractVersion: CASCADE_RESULT_CONTRACT_VERSION,
    scenarioId: input.scenarioId || "unknown-scenario",
    corridorId: input.corridorId || "unknown-corridor",
    variantName: "resolution-cascade",
    mode: input.mode || RUNNER_MODE.REPLAY,
    status: TOP_LEVEL_STATUS.FAIL,
    steps: [],
    transitionEvidence: {
      steps: [],
    },
    holds: [],
    errors: [],
    summary: {
      totalSteps: 0,
      passedSteps: 0,
      heldSteps: 0,
      failedSteps: 0,
      stateChangingSteps: 0,
      finalForensicEntryCount: 0,
      finalTruthFingerprintDigest: null,
      expectedFinalStatus: null,
      expectedFinalDisposition: null,
    },
  };
}

function pushCascadeError(result, code, message, extra = {}) {
  result.errors.push({
    code,
    message,
    ...extra,
  });
}

function pushCascadeHold(result, code, message, extra = {}) {
  result.holds.push({
    code,
    message,
    ...extra,
  });
}

function finalizeCascadeStatus(result) {
  if (result.errors.length > 0) {
    result.status = TOP_LEVEL_STATUS.FAIL;
    return result;
  }

  if (result.steps.some((step) => step.status === TOP_LEVEL_STATUS.FAIL)) {
    result.status = TOP_LEVEL_STATUS.FAIL;
    return result;
  }

  const structuralHolds = result.holds.filter(
    (hold) => hold.expected !== true
  );
  result.status =
    structuralHolds.length > 0 ? TOP_LEVEL_STATUS.HOLD : TOP_LEVEL_STATUS.PASS;
  return result;
}

function summarizeCascade(result, fixtureSet) {
  const passedSteps = result.steps.filter(
    (step) => step.status === TOP_LEVEL_STATUS.PASS
  ).length;
  const heldSteps = result.steps.filter(
    (step) => step.status === TOP_LEVEL_STATUS.HOLD
  ).length;
  const failedSteps = result.steps.filter(
    (step) => step.status === TOP_LEVEL_STATUS.FAIL
  ).length;
  const stateChangingSteps = result.transitionEvidence.steps.filter(
    (step) => step.stateChanged === true
  ).length;
  const finalStep = result.steps[result.steps.length - 1] || null;

  result.summary = {
    totalSteps: result.steps.length,
    passedSteps,
    heldSteps,
    failedSteps,
    stateChangingSteps,
    finalForensicEntryCount: Array.isArray(finalStep?.forensic?.entries)
      ? finalStep.forensic.entries.length
      : 0,
    finalTruthFingerprintDigest:
      finalStep?.truthFingerprints?.permitting?.digest || null,
    expectedFinalStatus: fixtureSet?.expectedSummary?.finalStatus || null,
    expectedFinalDisposition: fixtureSet?.expectedSummary?.finalDisposition || null,
  };

  return result;
}

function buildBaseBridgeOutput(normalizedInput, fixtureSet) {
  if (normalizedInput.bridgeOutputOverride) {
    return assertPipelineBridgeOutputV1(normalizedInput.bridgeOutputOverride);
  }

  if (!isPlainObject(fixtureSet.paths)) {
    throw new TypeError(
      "fixtureSet.paths are required when bridgeOutputOverride is absent."
    );
  }

  return runPipelineBridge({
    scenarioId: fixtureSet.scenario.scenarioId,
    corridorId: fixtureSet.scenario.corridorId,
    transcriptPath: fixtureSet.paths.transcriptPath,
    replayArtifactPath: fixtureSet.paths.replayArtifactPath,
    outputDirectory: normalizedInput.outputDirectory,
    mode: normalizedInput.mode,
    ...(isPlainObject(normalizedInput.bridgeInputOverrides)
      ? deepClone(normalizedInput.bridgeInputOverrides)
      : {}),
  });
}

function alignResolutionSequence(fixtureSet, stepProfiles) {
  const frozenSteps = fixtureSet.resolutionSequence.steps;

  if (frozenSteps.length !== stepProfiles.length) {
    return {
      valid: false,
      issues: [
        "Packet 4 local step mapping count must match frozen resolution sequence.",
      ],
    };
  }

  const issues = [];
  for (let index = 0; index < frozenSteps.length; index += 1) {
    const frozenStep = frozenSteps[index];
    const profile = stepProfiles[index];

    if (frozenStep.stepId !== profile.stepId) {
      issues.push(
        `Step profile mismatch at index ${index}: expected ${frozenStep.stepId}, received ${profile.stepId}.`
      );
    }

    if (frozenStep.action !== profile.action) {
      issues.push(
        `Action mapping mismatch for ${frozenStep.stepId}: expected ${frozenStep.action}, received ${profile.action}.`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

function loadFixtureSet(normalizedInput) {
  let fixtureSet = normalizedInput.fixtureSet;
  if (!fixtureSet) {
    return readScenarioFixtureSet(normalizedInput.fixtureRoot);
  }

  fixtureSet = ensureFixturePaths(fixtureSet, normalizedInput.fixtureRoot);
  return fixtureSet;
}

function applyStepState(stepProfile, previousState, fixtureSet, stateOverrides) {
  if (isPlainObject(stateOverrides?.[stepProfile.stepId])) {
    return deepClone(stateOverrides[stepProfile.stepId]);
  }

  return stepProfile.applyState(previousState, fixtureSet);
}

function buildStepEvidence(stepResult, context) {
  const truthFingerprintDigest =
    stepResult.truthFingerprints?.permitting?.digest || null;
  const absencesBySkin = Object.fromEntries(
    RENDERED_SKIN_IDS.map((skinId) => [
      skinId,
      Array.isArray(stepResult.skins?.outputs?.[skinId]?.absences)
        ? stepResult.skins.outputs[skinId].absences.map(
            (entry) => entry.displayText || entry.id || null
          )
        : [],
    ])
  );

  return {
    stepId: context.frozenStep.stepId,
    action: context.frozenStep.action,
    expectedFixtureStatus: context.frozenStep.status,
    selectedClauseText: context.stepProfile.selectedClauseText,
    variantName: context.stepProfile.variantName,
    previousStepId: context.previousStepId,
    beforeStateFingerprint: context.beforeStateFingerprint,
    afterStateFingerprint: context.afterStateFingerprint,
    stateChanged: context.stateDiff.changed,
    changedEntities: context.stateDiff.changes,
    lifecycle: {
      regressions: context.lifecycle.regressions,
      allowedRevocations: context.lifecycle.allowedRevocations,
    },
    forensicEntryCount: Array.isArray(stepResult.forensic?.entries)
      ? stepResult.forensic.entries.length
      : 0,
    forensicEntryRefs: Array.isArray(stepResult.forensic?.entryRefs)
      ? [...stepResult.forensic.entryRefs]
      : [],
    truthFingerprintDigest,
    governanceDecision: stepResult.governance?.result?.decision || null,
    authorityDecision: stepResult.authority?.resolution?.decision || null,
    absenceBySkin: absencesBySkin,
  };
}

function hasFailedStepStage(stepResult) {
  return Object.values(stepResult?.stageStatus || {}).some(
    (stage) => stage?.status === STAGE_STATUS.FAIL
  );
}

function isUnexpectedStepOutcome(stepResult) {
  return (
    !isPlainObject(stepResult) ||
    hasFailedStepStage(stepResult) ||
    Array.isArray(stepResult.errors) && stepResult.errors.length > 0 ||
    stepResult.governance?.matchedExpectedDecision !== true
  );
}

function runResolutionCascade(input = {}) {
  const normalizedInput = normalizeInput(input);
  const result = buildInitialCascadeResult(normalizedInput);

  try {
    const fixtureSet = loadFixtureSet(normalizedInput);
    const fixtureIssues = validateScenarioFixtureSet(fixtureSet).concat(
      ensureScenarioIdentity(normalizedInput, fixtureSet)
    );

    result.scenarioId = fixtureSet.scenario?.scenarioId || result.scenarioId;
    result.corridorId = fixtureSet.scenario?.corridorId || result.corridorId;
    result.mode = normalizedInput.mode;

    if (fixtureIssues.length > 0) {
      pushCascadeError(
        result,
        "scenario_fixture_invalid",
        fixtureIssues.join(" ")
      );
      summarizeCascade(result, fixtureSet);
      return finalizeCascadeStatus(result);
    }

    const stepProfiles = resolveScenarioStepProfiles(fixtureSet);
    if (!stepProfiles) {
      pushCascadeHold(
        result,
        "scenario_step_mapping_missing",
        "Packet 4 step mapping is missing for the frozen scenario fixture."
      );
      summarizeCascade(result, fixtureSet);
      return finalizeCascadeStatus(result);
    }

    const sequenceAlignment = alignResolutionSequence(fixtureSet, stepProfiles);
    if (!sequenceAlignment.valid) {
      pushCascadeHold(
        result,
        "resolution_sequence_mapping_invalid",
        sequenceAlignment.issues.join(" ")
      );
      summarizeCascade(result, fixtureSet);
      return finalizeCascadeStatus(result);
    }

    const baseBridgeOutput = buildBaseBridgeOutput(normalizedInput, fixtureSet);
    if (baseBridgeOutput.status !== TOP_LEVEL_STATUS.PASS) {
      for (const hold of baseBridgeOutput.holds || []) {
        pushCascadeHold(
          result,
          hold.code || "pipeline_bridge_hold",
          hold.message || "Pipeline bridge returned a hold.",
          {
            stage: "pipeline",
          }
        );
      }

      for (const error of baseBridgeOutput.errors || []) {
        pushCascadeError(
          result,
          error.code || "pipeline_bridge_error",
          error.message || "Pipeline bridge failed.",
          {
            stage: "pipeline",
          }
        );
      }

      summarizeCascade(result, fixtureSet);
      return finalizeCascadeStatus(result);
    }

    const sharedForensicContext = createSharedForensicContext(
      normalizedInput.outputDirectory,
      fixtureSet.scenario.scenarioId,
      normalizedInput.evaluatedAt
    );
    let currentState = deepClone(fixtureSet.beforeState);
    let previousStepId = null;

    for (let index = 0; index < stepProfiles.length; index += 1) {
      const stepProfile = stepProfiles[index];
      const frozenStep = fixtureSet.resolutionSequence.steps[index];
      const previousState = deepClone(currentState);
      const nextState = applyStepState(
        stepProfile,
        previousState,
        fixtureSet,
        normalizedInput.stateOverrides
      );
      const stateDiff = diffStates(previousState, nextState);
      const lifecycle = evaluateLifecycleTransition(
        previousState,
        nextState,
        frozenStep.action
      );

      if (lifecycle.regressions.length > 0) {
        pushCascadeHold(
          result,
          "lifecycle_regression_without_revoke",
          "Lifecycle regression detected outside an explicit REVOKE step.",
          {
            stepId: frozenStep.stepId,
            regressions: deepClone(lifecycle.regressions),
          }
        );
        currentState = nextState;
        break;
      }

      const filteredBridgeOutput = filterBridgeItems(baseBridgeOutput, stepProfile);
      const stepFixtureSet = {
        ...deepClone(fixtureSet),
        beforeState: deepClone(nextState),
      };
      const stepProfileOverride = buildCascadeProfile(stepProfile);
      const stepResult = runCorridorScenario({
        scenarioId: fixtureSet.scenario.scenarioId,
        corridorId: fixtureSet.scenario.corridorId,
        fixtureSet: stepFixtureSet,
        bridgeOutputOverride: filteredBridgeOutput,
        mode: normalizedInput.mode,
        evaluatedAt: normalizedInput.evaluatedAt,
        profileOverride: stepProfileOverride,
        forensicContext: {
          writer: sharedForensicContext.writer,
          persistence: sharedForensicContext.persistence,
          cumulativeEntries: true,
        },
      });

      result.steps.push(stepResult);

      if (Array.isArray(stepResult.holds) && stepResult.holds.length > 0) {
        for (const hold of stepResult.holds) {
          pushCascadeHold(
            result,
            hold.code || "expected_step_hold",
            hold.message || "Step preserved an expected bounded hold.",
            {
              stepId: frozenStep.stepId,
              expected: true,
            }
          );
        }
      }

      if (isUnexpectedStepOutcome(stepResult)) {
        if (Array.isArray(stepResult.errors) && stepResult.errors.length > 0) {
          for (const error of stepResult.errors) {
            pushCascadeError(
              result,
              error.code || "step_error",
              error.message || "Cascade step returned FAIL.",
              {
                stepId: frozenStep.stepId,
              }
            );
          }
        } else {
          pushCascadeHold(
            result,
            "step_outcome_unexpected",
            "Cascade step produced an unexpected bounded outcome.",
            {
              stepId: frozenStep.stepId,
            }
          );
        }
        currentState = nextState;
        break;
      }

      const beforeStateFingerprint = buildStateFingerprint(previousState);
      const afterStateFingerprint = buildStateFingerprint(nextState);
      result.transitionEvidence.steps.push(
        buildStepEvidence(stepResult, {
          frozenStep,
          stepProfile,
          previousStepId,
          beforeStateFingerprint,
          afterStateFingerprint,
          stateDiff,
          lifecycle,
        })
      );

      currentState = nextState;
      previousStepId = frozenStep.stepId;
    }

    summarizeCascade(result, fixtureSet);
    return finalizeCascadeStatus(result);
  } catch (error) {
    pushCascadeError(
      result,
      "resolution_cascade_unhandled_error",
      error.message
    );
    return finalizeCascadeStatus(result);
  }
}

module.exports = {
  runResolutionCascade,
};
