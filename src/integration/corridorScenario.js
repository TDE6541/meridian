const { existsSync, readdirSync, readFileSync } = require("node:fs");
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
const { runDeterministicMatching } = require("./matchingEngine");
const { evaluateGovernanceRequest } = require("../governance/runtime");
const {
  ChainPersistence,
  GovernanceChainWriter,
} = require("../governance/forensic");
const {
  buildCivicSkinInput,
  renderDefaultSkin,
  renderSkin,
} = require("../skins");
const { councilSkinDescriptor } = require("../skins/civic/council");
const { operationsSkinDescriptor } = require("../skins/civic/operations");
const { dispatchSkinDescriptor } = require("../skins/civic/dispatch");
const { renderPublicSkin } = require("../skins/civic/public");

const SCENARIO_RESULT_CONTRACT_VERSION = "wave8.scenarioResult.v1";
const SCENARIO_PROFILE_VERSION = "wave8.packet3.singleStateProfiles.v1";
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
const DEFAULT_SKIN_ORDER = Object.freeze([
  "permitting",
  "council",
  "operations",
  "dispatch",
  "public",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toSortedUniqueStrings(values) {
  return [...new Set(values.filter(isNonEmptyString))].sort();
}

function buildEmptyStageSection(reason) {
  return {
    status: STAGE_STATUS.SKIPPED,
    reason,
  };
}

function buildInitialResult(input = {}) {
  return {
    contractVersion: SCENARIO_RESULT_CONTRACT_VERSION,
    scenarioId: isNonEmptyString(input.scenarioId) ? input.scenarioId : "unknown-scenario",
    corridorId: isNonEmptyString(input.corridorId) ? input.corridorId : "unknown-corridor",
    variantName: "unresolved",
    mode: RUNNER_MODE.REPLAY,
    status: TOP_LEVEL_STATUS.FAIL,
    stageStatus: {
      pipeline: buildEmptyStageSection("pipeline_not_started"),
      matching: buildEmptyStageSection("matching_not_started"),
      governance: buildEmptyStageSection("governance_not_started"),
      authority: buildEmptyStageSection("authority_not_started"),
      forensic: buildEmptyStageSection("forensic_not_started"),
      skins: buildEmptyStageSection("skins_not_started"),
    },
    pipeline: {
      status: STAGE_STATUS.SKIPPED,
      reason: "pipeline_not_started",
      bridgeStatus: null,
      output: {},
      artifactRefs: {},
      commandInfo: {},
      envInfo: {},
      holds: [],
      errors: [],
      provenance: {},
    },
    matching: {
      status: STAGE_STATUS.SKIPPED,
      reason: "matching_not_started",
      selectedMatch: {},
      result: {
        matchResults: [],
        unmatchedExtractions: [],
        unmatchedGovernanceItems: [],
        matchSummary: {},
      },
    },
    governance: {
      status: STAGE_STATUS.SKIPPED,
      reason: "governance_not_started",
      expectedDecision: null,
      matchedExpectedDecision: false,
      request: {},
      result: {},
    },
    authority: {
      status: STAGE_STATUS.SKIPPED,
      reason: "authority_not_started",
      relevant: false,
      resolution: {
        active: false,
        decision: null,
        reason: "not_started",
      },
      revocation: {
        active: false,
        decision: null,
        reason: null,
      },
    },
    forensic: {
      status: STAGE_STATUS.SKIPPED,
      reason: "forensic_not_started",
      chainWriteStatus: null,
      entryRefs: [],
      warnings: [],
      entries: [],
      expectedEntryCount: 0,
      persistedPath: null,
    },
    skins: {
      status: STAGE_STATUS.SKIPPED,
      reason: "skins_not_started",
      outputs: {},
      parityHolds: false,
      fallbackSkinIds: [],
      renderedSkinIds: [],
    },
    holds: [],
    errors: [],
    provenance: {
      fixture: {},
      profile: {},
      selectedMatch: {},
    },
    artifacts: {},
    truthFingerprints: {},
    summary: {
      expectedDecision: null,
      actualDecision: null,
      selectedClauseText: null,
      selectedMatchType: null,
      selectedEntityType: null,
      selectedEntityId: null,
      selectedMatchTouchesAuthority: false,
      expectedScenarioFinalStatus: null,
      expectedFinalDisposition: null,
      expectedDecisionMatched: false,
      skinParityHolds: false,
      forensicEntryCount: 0,
    },
  };
}

function resolveEvaluatedAt(input) {
  if (isNonEmptyString(input.evaluatedAt)) {
    return input.evaluatedAt;
  }

  if (typeof input.now === "function") {
    const resolved = input.now();
    if (isNonEmptyString(resolved)) {
      return resolved;
    }
  }

  return new Date().toISOString();
}

function resolveMode(input, fixtureSet) {
  if (input.mode === RUNNER_MODE.LIVE) {
    return RUNNER_MODE.LIVE;
  }

  if (input.mode === RUNNER_MODE.REPLAY) {
    return RUNNER_MODE.REPLAY;
  }

  if (fixtureSet?.scenario?.bridgeMode === RUNNER_MODE.LIVE) {
    return RUNNER_MODE.LIVE;
  }

  return RUNNER_MODE.REPLAY;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function resolveFixtureRoot(fixtureRoot) {
  if (!isNonEmptyString(fixtureRoot)) {
    throw new TypeError("fixtureRoot must be a non-empty string when fixtureSet is absent.");
  }

  return path.isAbsolute(fixtureRoot)
    ? fixtureRoot
    : path.resolve(DEFAULT_REPOSITORY_ROOT, fixtureRoot);
}

function readScenarioFixtureSet(fixtureRoot) {
  const root = resolveFixtureRoot(fixtureRoot);
  const paths = {
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

  return {
    root,
    fileNames: readdirSync(root),
    paths,
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

function validateScenarioFixtureSet(fixtureSet) {
  const issues = [];

  const requiredFileValidation = validateRequiredScenarioFixtureSetFiles(
    Array.isArray(fixtureSet.fileNames) ? fixtureSet.fileNames : []
  );
  if (!requiredFileValidation.valid) {
    issues.push(...requiredFileValidation.issues);
  }

  const provenanceValidation = validateFixtureProvenance(fixtureSet.provenance);
  if (!provenanceValidation.valid) {
    issues.push(...provenanceValidation.issues);
  }

  if (!isPlainObject(fixtureSet.scenario)) {
    issues.push("scenario fixture must expose scenario metadata.");
  }

  if (!isPlainObject(fixtureSet.beforeState)) {
    issues.push("scenario fixture must expose beforeState.");
  }

  if (!isPlainObject(fixtureSet.afterState)) {
    issues.push("scenario fixture must expose afterState.");
  }

  if (!isPlainObject(fixtureSet.replayArtifact)) {
    issues.push("scenario fixture must expose replayArtifact.");
  }

  if (!isPlainObject(fixtureSet.expectedSummary)) {
    issues.push("scenario fixture must expose expectedSummary.");
  }

  return issues;
}

function ensureScenarioIdentity(normalizedInput, fixtureSet) {
  const issues = [];

  if (
    isNonEmptyString(normalizedInput.scenarioId) &&
    fixtureSet.scenario.scenarioId !== normalizedInput.scenarioId
  ) {
    issues.push("input.scenarioId must match fixture scenarioId.");
  }

  if (
    isNonEmptyString(normalizedInput.corridorId) &&
    fixtureSet.scenario.corridorId !== normalizedInput.corridorId
  ) {
    issues.push("input.corridorId must match fixture corridorId.");
  }

  return issues;
}

function findEntityIdByType(stateDocument, entityType) {
  const entity = Array.isArray(stateDocument?.entities)
    ? stateDocument.entities.find(
        (entry) => isPlainObject(entry) && entry.entityType === entityType
      )
    : null;

  return isNonEmptyString(entity?.entityId) ? entity.entityId : null;
}

function matchTouchesAuthority(selectedMatch) {
  return selectedMatch?.targetGovernanceItem?.entityType === "authority_grant";
}

function createStableRefs(scenarioId, variantName, authorityRelevant) {
  const prefix = `${scenarioId}:${variantName}`;
  const stableRefs = {
    requestId: `${prefix}:request`,
    governanceEntryId: `${prefix}:governance`,
  };

  if (authorityRelevant) {
    stableRefs.authorityEntryId = `${prefix}:authority`;
  }

  return stableRefs;
}

function buildSelectedMatchProvenance(selectedMatch) {
  return {
    matchId: selectedMatch.matchId,
    captureItemId: selectedMatch.sourceExtraction.captureItemId,
    clauseText: selectedMatch.sourceExtraction.clauseText,
    matchType: selectedMatch.matchType,
    confidenceTier: selectedMatch.confidenceTier,
    targetEntityType: selectedMatch.targetGovernanceItem?.entityType || null,
    targetEntityId: selectedMatch.targetGovernanceItem?.entityId || null,
  };
}

function buildCandidateSignalPatch(context) {
  const governanceHandoff = isPlainObject(
    context.bridgeOutput?.extractionOutput?.governance_handoff
  )
    ? deepClone(context.bridgeOutput.extractionOutput.governance_handoff)
    : {};

  return {
    governance: {
      proof_mode: "wave8_packet3_single_state",
      scenario_id: context.fixtureSet.scenario.scenarioId,
      corridor_id: context.fixtureSet.scenario.corridorId,
      variant_name: context.profile.variantName,
      capture_handoff: governanceHandoff,
      selected_match: buildSelectedMatchProvenance(context.selectedMatch),
    },
  };
}

function createCommandRequest(options) {
  return {
    kind: "command_request",
    org_id: DEFAULT_ORG_ID,
    entity_ref: {
      entity_id: options.entityId,
      entity_type:
        options.entityType === undefined ? null : options.entityType,
    },
    authority_context: {
      resolved:
        typeof options.authorityResolved === "boolean"
          ? options.authorityResolved
          : true,
      requested_by_role: options.requestedByRole,
      required_approvals: [...options.requiredApprovals],
      resolved_approvals: [...options.resolvedApprovals],
      missing_approvals: [...options.missingApprovals],
      ...(isPlainObject(options.extraAuthorityContext)
        ? deepClone(options.extraAuthorityContext)
        : {}),
    },
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

function createRoutineGovernanceRequest(context) {
  const entityId =
    context.selectedMatch.targetGovernanceItem?.entityId ||
    findEntityIdByType(context.fixtureSet.beforeState, "inspection") ||
    "inspection:routine-single-state";

  return createCommandRequest({
    entityId,
    entityType: "inspection",
    rawSubject: `constellation.commands.${DEFAULT_ORG_ID}.${entityId}`,
    requestedByRole: "fire_inspector",
    requiredApprovals: ["fire_department"],
    resolvedApprovals: ["fire_department"],
    missingApprovals: [],
    requiredCount: 2,
    presentCount: 2,
    missingTypes: [],
    candidateSignalPatch: buildCandidateSignalPatch(context),
  });
}

function createContestedGovernanceRequest(context) {
  const createdAuthorityId =
    findEntityIdByType(context.fixtureSet.afterState, "authority_grant") ||
    "authority:contested-single-state";

  return createCommandRequest({
    entityId: createdAuthorityId,
    entityType: null,
    rawSubject:
      `constellation.commands.${DEFAULT_ORG_ID}.public-notice-` +
      `${context.fixtureSet.scenario.corridorId}-authority-review`,
    authorityResolved: false,
    requestedByRole: "communications_coordinator",
    requiredApprovals: ["communications_office", "city_clerk"],
    resolvedApprovals: ["communications_office"],
    missingApprovals: ["city_clerk"],
    requiredCount: 3,
    presentCount: 3,
    missingTypes: [],
    extraAuthorityContext: {
      actor_context: {
        actor_id: "actor:hemphill-partner-representative",
        target_id: createdAuthorityId,
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
      public_comment_context: {
        comment_count: 2,
        channels: ["public hearing", "written comment"],
      },
      voting_record_context: {
        yes_votes: 3,
        no_votes: 1,
        abstain_votes: 0,
      },
    },
    candidateSignalPatch: buildCandidateSignalPatch(context),
  });
}

function createEmergencyGovernanceRequest(context) {
  const obligationId =
    findEntityIdByType(context.fixtureSet.afterState, "obligation") ||
    "obligation:emergency-follow-up";

  return createCommandRequest({
    entityId: obligationId,
    entityType: null,
    rawSubject:
      `constellation.commands.${DEFAULT_ORG_ID}.utility-corridor-` +
      `${context.fixtureSet.scenario.corridorId}-follow-up`,
    requestedByRole: "water_ops_supervisor",
    requiredApprovals: ["tpw_row", "development_services", "water_department"],
    resolvedApprovals: ["water_department"],
    missingApprovals: ["tpw_row", "development_services"],
    requiredCount: 3,
    presentCount: 2,
    missingTypes: ["utility_conflict_assessment"],
    extraAuthorityContext: {
      operations_context: {
        crew_status: {
          posture: "follow_up_queue",
        },
        equipment_status: {
          traffic_control: "staged",
        },
        resource_status: {
          pavement_restoration: "pending",
        },
      },
      dispatch_context: {
        resource_unit_context: {
          queue: "follow_up_control",
        },
        incident_context: {
          incident_id: "incident:camp-bowie-break-001",
        },
      },
    },
    candidateSignalPatch: buildCandidateSignalPatch(context),
  });
}

// Packet 3 stays scenario-profiled so the orchestrator remains a thin composition
// layer over frozen Packet 1/2 fixtures and shipped runtime lanes.
const SCENARIO_PROFILES = Object.freeze({
  "routine-lancaster-avenue-corridor-reconstruction": Object.freeze({
    variantName: "inspection-resolution-pass",
    selectedClauseText: "the inspection pass",
    expectedDecision: "ALLOW",
    requestTemplateSource: "wave4a.safe-pass-shape",
    buildRequest: createRoutineGovernanceRequest,
  }),
  "contested-hemphill-street-mixed-use-contested-authority": Object.freeze({
    variantName: "conditioned-authority-hold",
    selectedClauseText: "a signed corridor operations grant",
    expectedDecision: "HOLD",
    requestTemplateSource: "wave4a.supervised-shape.plus-actor-context",
    buildRequest: createContestedGovernanceRequest,
  }),
  "emergency-camp-bowie-water-main-break": Object.freeze({
    variantName: "post-repair-follow-up-hold",
    selectedClauseText: "carry forward the post-repair restoration obligation",
    expectedDecision: "HOLD",
    requestTemplateSource: "wave4a.refusal-shape.utility-follow-up",
    buildRequest: createEmergencyGovernanceRequest,
  }),
});

function resolveScenarioProfile(scenarioId, profileOverride) {
  const profile =
    isPlainObject(profileOverride) && typeof profileOverride.buildRequest === "function"
      ? profileOverride
      : SCENARIO_PROFILES[scenarioId] || null;

  if (!profile) {
    return null;
  }

  if (
    !isNonEmptyString(profile.variantName) ||
    !isNonEmptyString(profile.selectedClauseText) ||
    !isNonEmptyString(profile.expectedDecision) ||
    !isNonEmptyString(profile.requestTemplateSource) ||
    typeof profile.buildRequest !== "function"
  ) {
    throw new TypeError(
      "scenario profile must define variantName, selectedClauseText, expectedDecision, requestTemplateSource, and buildRequest."
    );
  }

  return profile;
}

function determineGovernanceStageStatus(governanceResult) {
  if (!isPlainObject(governanceResult) || !isNonEmptyString(governanceResult.decision)) {
    return STAGE_STATUS.FAIL;
  }

  if (governanceResult.decision === "ALLOW" || governanceResult.decision === "SUPERVISE") {
    return STAGE_STATUS.PASS;
  }

  if (
    governanceResult.decision === "HOLD" ||
    governanceResult.decision === "BLOCK" ||
    governanceResult.decision === "REVOKE"
  ) {
    return STAGE_STATUS.HOLD;
  }

  return STAGE_STATUS.FAIL;
}

function determineAuthorityStage(authorityRelevant, governanceResult) {
  const authorityResolution = deepClone(
    governanceResult?.runtimeSubset?.civic?.authority_resolution || {
      active: false,
      decision: null,
      reason: "authority_not_requested",
    }
  );
  const revocation = deepClone(
    governanceResult?.runtimeSubset?.civic?.revocation || {
      active: false,
      decision: null,
      reason: null,
    }
  );

  if (!authorityRelevant) {
    return {
      status: STAGE_STATUS.SKIPPED,
      reason: "selected_match_not_authority_bound",
      relevant: false,
      resolution: authorityResolution,
      revocation,
    };
  }

  if (authorityResolution.active !== true) {
    return {
      status: STAGE_STATUS.HOLD,
      reason: "authority_resolution_missing_for_authority_bound_match",
      relevant: true,
      resolution: authorityResolution,
      revocation,
    };
  }

  return {
    status: determineGovernanceStageStatus(authorityResolution),
    reason: authorityResolution.reason || "authority_resolution_completed",
    relevant: true,
    resolution: authorityResolution,
    revocation,
  };
}

function normalizeAuthorityProjection(governanceResult, authorityRelevant) {
  const normalizedResult = deepClone(governanceResult || {});
  const authorityResolution =
    normalizedResult?.runtimeSubset?.civic?.authority_resolution;

  if (!authorityRelevant || !isPlainObject(authorityResolution)) {
    return normalizedResult;
  }

  if (
    typeof authorityResolution.active !== "boolean" &&
    (
      isNonEmptyString(authorityResolution.decision) ||
      isNonEmptyString(authorityResolution.reason) ||
      isPlainObject(authorityResolution.domain) ||
      isPlainObject(authorityResolution.actor)
    )
  ) {
    // Runtime subset authority projection omits `active`; Packet 3 rehydrates it
    // locally so the shipped forensic writer and stage reporter can consume it.
    authorityResolution.active = true;
  }

  return normalizedResult;
}

function determineForensicStage(
  sidecar,
  entries,
  expectedEntryCount,
  options = {}
) {
  if (!isPlainObject(sidecar)) {
    return {
      status: STAGE_STATUS.FAIL,
      reason: "forensic_sidecar_missing",
    };
  }

  if (sidecar.status === "SKIPPED") {
    return {
      status: STAGE_STATUS.HOLD,
      reason: "forensic_chain_write_skipped",
    };
  }

  const cumulativeEntries = options.cumulativeEntries === true;
  const entryCountValid =
    Array.isArray(entries) &&
    (cumulativeEntries
      ? entries.length >= expectedEntryCount
      : entries.length === expectedEntryCount);
  const appendedCountValid =
    Array.isArray(sidecar.entryRefs) &&
    sidecar.entryRefs.length === expectedEntryCount;

  if (!entryCountValid || !appendedCountValid) {
    return {
      status: STAGE_STATUS.HOLD,
      reason: "forensic_entry_count_mismatch",
    };
  }

  if (sidecar.status === "FAILED") {
    return {
      status: STAGE_STATUS.HOLD,
      reason: "forensic_persistence_warning",
    };
  }

  if (Array.isArray(sidecar.warnings) && sidecar.warnings.length > 0) {
    return {
      status: STAGE_STATUS.HOLD,
      reason: "forensic_warnings_present",
    };
  }

  return {
    status: STAGE_STATUS.PASS,
    reason: "forensic_entries_recorded",
  };
}

function renderScenarioSkins(governanceResult, governanceRequest, scenarioId, variantName, evaluatedAt) {
  const skinInput = buildCivicSkinInput(governanceResult, {
    viewType: "governance-decision",
    sourceKind: "runtime-evaluation",
    sourceId: `${scenarioId}:${variantName}`,
    raw: {
      ...deepClone(governanceResult),
      request: deepClone(governanceRequest),
    },
    metadata: {
      generatedAt: evaluatedAt,
      fixtureName: `${scenarioId}.fixture`,
    },
  });
  const outputs = {
    permitting: renderDefaultSkin(skinInput),
    council: renderSkin(skinInput, councilSkinDescriptor),
    operations: renderSkin(skinInput, operationsSkinDescriptor),
    dispatch: renderSkin(skinInput, dispatchSkinDescriptor),
    public: renderPublicSkin(skinInput),
  };
  const truthFingerprints = Object.fromEntries(
    Object.entries(outputs).map(([skinId, output]) => [
      skinId,
      deepClone(output.truthFingerprint),
    ])
  );
  const fingerprintDigests = toSortedUniqueStrings(
    Object.values(outputs).map((output) => output.truthFingerprint?.digest)
  );
  const fallbackSkinIds = Object.entries(outputs)
    .filter(([, output]) => output?.fallback?.active === true)
    .map(([skinId]) => skinId);

  return {
    input: skinInput,
    outputs,
    truthFingerprints,
    parityHolds: fingerprintDigests.length === 1,
    fallbackSkinIds,
  };
}

function determineSkinsStage(skinResult) {
  if (!isPlainObject(skinResult) || !isPlainObject(skinResult.outputs)) {
    return {
      status: STAGE_STATUS.FAIL,
      reason: "skin_render_outputs_missing",
    };
  }

  if (DEFAULT_SKIN_ORDER.some((skinId) => !isPlainObject(skinResult.outputs[skinId]))) {
    return {
      status: STAGE_STATUS.FAIL,
      reason: "incomplete_skin_render_set",
    };
  }

  if (skinResult.parityHolds !== true) {
    return {
      status: STAGE_STATUS.HOLD,
      reason: "truth_fingerprint_parity_failed",
    };
  }

  if (skinResult.fallbackSkinIds.length > 0) {
    return {
      status: STAGE_STATUS.HOLD,
      reason: "skin_fallbacks_present",
    };
  }

  return {
    status: STAGE_STATUS.PASS,
    reason: "all_five_skins_rendered_with_parity",
  };
}

function buildBridgeInput(normalizedInput, fixtureSet, mode) {
  return {
    scenarioId: fixtureSet.scenario.scenarioId,
    corridorId: fixtureSet.scenario.corridorId,
    transcriptPath: fixtureSet.paths.transcriptPath,
    mode,
    replayArtifactPath: fixtureSet.paths.replayArtifactPath,
    outputDirectory: normalizedInput.outputDirectory,
    ...(isPlainObject(normalizedInput.bridgeInputOverrides)
      ? deepClone(normalizedInput.bridgeInputOverrides)
      : {}),
  };
}

function findSelectedMatch(matchingResult, profile) {
  return Array.isArray(matchingResult?.matchResults)
    ? matchingResult.matchResults.find(
        (entry) => entry?.sourceExtraction?.clauseText === profile.selectedClauseText
      ) || null
    : null;
}

function aggregateTopLevelHolds(result) {
  const holds = [];

  for (const hold of result.pipeline.holds || []) {
    holds.push({
      stage: "pipeline",
      ...deepClone(hold),
    });
  }

  if (result.matching.status === STAGE_STATUS.HOLD) {
    holds.push({
      stage: "matching",
      code: result.matching.reason,
      message: "Matching stage requires review before governance composition can proceed.",
    });
  }

  if (result.governance.status === STAGE_STATUS.HOLD) {
    holds.push({
      stage: "governance",
      code: result.governance.result.reason || result.governance.reason,
      message: "Governance runtime produced a bounded hold-like outcome.",
    });
  }

  if (result.authority.status === STAGE_STATUS.HOLD) {
    holds.push({
      stage: "authority",
      code: result.authority.reason,
      message: "Authority resolution produced a bounded hold-like outcome.",
    });
  }

  if (result.forensic.status === STAGE_STATUS.HOLD) {
    holds.push({
      stage: "forensic",
      code: result.forensic.reason,
      message: "Forensic recording completed with bounded warnings or count mismatches.",
    });
  }

  if (result.skins.status === STAGE_STATUS.HOLD) {
    holds.push({
      stage: "skins",
      code: result.skins.reason,
      message: "Skin rendering completed with bounded fallback or parity issues.",
    });
  }

  return holds;
}

function aggregateTopLevelErrors(result) {
  const errors = [];

  for (const error of result.pipeline.errors || []) {
    errors.push({
      stage: "pipeline",
      ...deepClone(error),
    });
  }

  for (const stageKey of ["matching", "governance", "authority", "forensic", "skins"]) {
    if (result[stageKey]?.status === STAGE_STATUS.FAIL) {
      errors.push({
        stage: stageKey,
        code: result[stageKey].reason,
        message: `${stageKey} stage failed.`,
      });
    }
  }

  return errors;
}

function deriveTopLevelStatus(result) {
  const failedStages = Object.values(result.stageStatus).filter(
    (entry) => entry.status === STAGE_STATUS.FAIL
  );
  if (failedStages.length > 0) {
    return TOP_LEVEL_STATUS.FAIL;
  }

  const expectedDecisionMatched = result.summary.expectedDecisionMatched === true;
  const passPrerequisites =
    result.stageStatus.pipeline.status === STAGE_STATUS.PASS &&
    result.stageStatus.matching.status === STAGE_STATUS.PASS &&
    result.stageStatus.forensic.status === STAGE_STATUS.PASS &&
    result.stageStatus.skins.status === STAGE_STATUS.PASS &&
    result.stageStatus.governance.status !== STAGE_STATUS.FAIL &&
    result.stageStatus.authority.status !== STAGE_STATUS.FAIL;

  if (expectedDecisionMatched && passPrerequisites) {
    return TOP_LEVEL_STATUS.PASS;
  }

  return TOP_LEVEL_STATUS.HOLD;
}

function buildSummary(result, fixtureSet, profile, selectedMatch, skinResult) {
  return {
    expectedDecision: profile?.expectedDecision || null,
    actualDecision: result.governance.result.decision || null,
    selectedClauseText: selectedMatch?.sourceExtraction?.clauseText || null,
    selectedMatchType: selectedMatch?.matchType || null,
    selectedEntityType: selectedMatch?.targetGovernanceItem?.entityType || null,
    selectedEntityId: selectedMatch?.targetGovernanceItem?.entityId || null,
    selectedMatchTouchesAuthority: matchTouchesAuthority(selectedMatch),
    expectedScenarioFinalStatus: fixtureSet?.expectedSummary?.finalStatus || null,
    expectedFinalDisposition: fixtureSet?.expectedSummary?.finalDisposition || null,
    expectedDecisionMatched:
      result.governance.result.decision === profile?.expectedDecision,
    skinParityHolds: skinResult?.parityHolds === true,
    forensicEntryCount: Array.isArray(result.forensic.entries)
      ? result.forensic.entries.length
      : 0,
  };
}

function buildFixtureProvenance(fixtureSet) {
  return {
    root: fixtureSet.root,
    scenarioName: fixtureSet.scenario.scenarioName || null,
    category: fixtureSet.scenario.category || null,
    fixtureIntent: fixtureSet.scenario.fixtureIntent || null,
    minimumCascadeSteps: fixtureSet.scenario.minimumCascadeSteps || null,
    expectedSummary: deepClone(fixtureSet.expectedSummary || {}),
    fixtureProvenance: deepClone(fixtureSet.provenance?.fixtureProvenance || {}),
    requiredFiles: [...DEFAULT_FIXTURE_FILE_ORDER],
  };
}

function updateSkippedDownstreamStages(result, reason) {
  for (const stageKey of ["matching", "governance", "authority", "forensic", "skins"]) {
    if (result.stageStatus[stageKey].status === STAGE_STATUS.SKIPPED) {
      result.stageStatus[stageKey] = buildEmptyStageSection(reason);
      result[stageKey] = {
        ...result[stageKey],
        status: STAGE_STATUS.SKIPPED,
        reason,
      };
    }
  }
}

function createForensicWriter(outputDirectory, scenarioId, evaluatedAt) {
  if (!isNonEmptyString(outputDirectory)) {
    return {
      persistence: null,
      writer: new GovernanceChainWriter({
        now: () => evaluatedAt,
      }),
    };
  }

  const persistence = new ChainPersistence({
    cwd: DEFAULT_REPOSITORY_ROOT,
    chainDirectory: outputDirectory,
    chainFileName: `${scenarioId}.forensic-chain.json`,
  });

  return {
    persistence,
    writer: new GovernanceChainWriter({
      persistence,
      now: () => evaluatedAt,
    }),
  };
}

function normalizeRunInput(input) {
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
    outputDirectory: isNonEmptyString(input.outputDirectory)
      ? input.outputDirectory
      : null,
    profileOverride:
      isPlainObject(input.profileOverride) &&
      typeof input.profileOverride.buildRequest === "function"
        ? {
            ...input.profileOverride,
            buildRequest: input.profileOverride.buildRequest,
          }
        : null,
    forensicContext: isPlainObject(input.forensicContext)
      ? {
          writer: input.forensicContext.writer || null,
          persistence:
            Object.prototype.hasOwnProperty.call(
              input.forensicContext,
              "persistence"
            )
              ? input.forensicContext.persistence
              : undefined,
          cumulativeEntries: input.forensicContext.cumulativeEntries === true,
        }
      : null,
    mode:
      input.mode === RUNNER_MODE.LIVE ? RUNNER_MODE.LIVE : RUNNER_MODE.REPLAY,
    evaluatedAt: resolveEvaluatedAt(input),
  };
}

function buildFixtureInvalidResult(result, issueMessage) {
  result.stageStatus.pipeline = {
    status: STAGE_STATUS.FAIL,
    reason: "scenario_fixture_invalid",
  };
  result.pipeline = {
    ...result.pipeline,
    status: STAGE_STATUS.FAIL,
    reason: "scenario_fixture_invalid",
    errors: [
      {
        code: "scenario_fixture_invalid",
        message: issueMessage,
      },
    ],
  };
  updateSkippedDownstreamStages(result, "scenario_fixture_invalid");
  result.errors = aggregateTopLevelErrors(result);
  result.status = deriveTopLevelStatus(result);

  return result;
}

function runCorridorScenario(input = {}) {
  const normalizedInput = normalizeRunInput(input);
  const result = buildInitialResult(normalizedInput);

  try {
    let fixtureSet = normalizedInput.fixtureSet;
    if (!fixtureSet) {
      try {
        fixtureSet = readScenarioFixtureSet(normalizedInput.fixtureRoot);
      } catch (error) {
        if (
          error instanceof SyntaxError ||
          error instanceof TypeError ||
          error?.code === "ENOENT"
        ) {
          return buildFixtureInvalidResult(result, error.message);
        }

        throw error;
      }
    }
    const fixtureIssues = validateScenarioFixtureSet(fixtureSet).concat(
      ensureScenarioIdentity(normalizedInput, fixtureSet)
    );

    result.scenarioId = fixtureSet.scenario?.scenarioId || result.scenarioId;
    result.corridorId = fixtureSet.scenario?.corridorId || result.corridorId;
    result.mode = resolveMode(normalizedInput, fixtureSet);
    result.provenance.fixture = buildFixtureProvenance(fixtureSet);

    if (fixtureIssues.length > 0) {
      return buildFixtureInvalidResult(result, fixtureIssues.join(" "));
    }

    const profile = resolveScenarioProfile(
      fixtureSet.scenario.scenarioId,
      normalizedInput.profileOverride
    );
    if (!profile) {
      result.stageStatus.governance = {
        status: STAGE_STATUS.HOLD,
        reason: "scenario_profile_missing",
      };
      result.governance = {
        ...result.governance,
        status: STAGE_STATUS.HOLD,
        reason: "scenario_profile_missing",
      };
      result.variantName = "unprofiled";
      result.provenance.profile = {
        sourceVersion: SCENARIO_PROFILE_VERSION,
        missing: true,
      };
      updateSkippedDownstreamStages(result, "scenario_profile_missing");
      result.holds = aggregateTopLevelHolds(result);
      result.errors = aggregateTopLevelErrors(result);
      result.summary = buildSummary(result, fixtureSet, null, null, null);
      result.status = deriveTopLevelStatus(result);
      return result;
    }

    result.variantName = profile.variantName;
    result.provenance.profile = {
      sourceVersion: profile.sourceVersion || SCENARIO_PROFILE_VERSION,
      variantName: profile.variantName,
      selectedClauseText: profile.selectedClauseText,
      expectedDecision: profile.expectedDecision,
      requestTemplateSource: profile.requestTemplateSource,
    };

    const bridgeOutput = normalizedInput.bridgeOutputOverride
      ? assertPipelineBridgeOutputV1(normalizedInput.bridgeOutputOverride)
      : runPipelineBridge(buildBridgeInput(normalizedInput, fixtureSet, result.mode));
    const pipelineStageStatus =
      bridgeOutput.status === TOP_LEVEL_STATUS.PASS
        ? STAGE_STATUS.PASS
        : bridgeOutput.status === TOP_LEVEL_STATUS.HOLD
          ? STAGE_STATUS.HOLD
          : STAGE_STATUS.FAIL;
    result.stageStatus.pipeline = {
      status: pipelineStageStatus,
      reason: bridgeOutput.status === TOP_LEVEL_STATUS.PASS
        ? "pipeline_bridge_completed"
        : bridgeOutput.errors?.[0]?.code || bridgeOutput.holds?.[0]?.code || "pipeline_bridge_not_pass",
    };
    result.pipeline = {
      status: pipelineStageStatus,
      reason: result.stageStatus.pipeline.reason,
      bridgeStatus: bridgeOutput.status,
      output: deepClone(bridgeOutput.extractionOutput || {}),
      artifactRefs: deepClone(bridgeOutput.artifactRefs || {}),
      commandInfo: deepClone(bridgeOutput.commandInfo || {}),
      envInfo: deepClone(bridgeOutput.envInfo || {}),
      holds: deepClone(bridgeOutput.holds || []),
      errors: deepClone(bridgeOutput.errors || []),
      provenance: deepClone(bridgeOutput.provenance || {}),
    };
    result.artifacts = {
      transcriptPath: bridgeOutput.artifactRefs?.transcriptPath || fixtureSet.paths.transcriptPath,
      replayArtifactPath:
        bridgeOutput.artifactRefs?.replayArtifactPath || fixtureSet.paths.replayArtifactPath,
      liveOutputPath: bridgeOutput.artifactRefs?.liveOutputPath || null,
      forensicChainPath: null,
    };

    if (pipelineStageStatus !== STAGE_STATUS.PASS) {
      updateSkippedDownstreamStages(result, "pipeline_bridge_not_pass");
      result.holds = aggregateTopLevelHolds(result);
      result.errors = aggregateTopLevelErrors(result);
      result.summary = buildSummary(result, fixtureSet, profile, null, null);
      result.status = deriveTopLevelStatus(result);
      return result;
    }

    const matchingResult = runDeterministicMatching({
      scenarioId: fixtureSet.scenario.scenarioId,
      corridorId: fixtureSet.scenario.corridorId,
      extractionOutput: bridgeOutput.extractionOutput,
      governanceState: fixtureSet.beforeState,
    });
    const selectedMatch = findSelectedMatch(matchingResult, profile);

    if (!selectedMatch) {
      result.stageStatus.matching = {
        status: STAGE_STATUS.HOLD,
        reason: "selected_match_clause_missing",
      };
      result.matching = {
        status: STAGE_STATUS.HOLD,
        reason: "selected_match_clause_missing",
        selectedMatch: {},
        result: deepClone(matchingResult),
      };
      updateSkippedDownstreamStages(result, "selected_match_clause_missing");
      result.holds = aggregateTopLevelHolds(result);
      result.errors = aggregateTopLevelErrors(result);
      result.summary = buildSummary(result, fixtureSet, profile, null, null);
      result.status = deriveTopLevelStatus(result);
      return result;
    }

    result.stageStatus.matching = {
      status: STAGE_STATUS.PASS,
      reason: "selected_match_resolved",
    };
    result.matching = {
      status: STAGE_STATUS.PASS,
      reason: "selected_match_resolved",
      selectedMatch: deepClone(selectedMatch),
      result: deepClone(matchingResult),
    };
    result.provenance.selectedMatch = buildSelectedMatchProvenance(selectedMatch);

    const governanceRequest = profile.buildRequest({
      fixtureSet,
      bridgeOutput,
      matchingResult,
      selectedMatch,
      profile,
      evaluatedAt: normalizedInput.evaluatedAt,
    });
    const authorityRelevant = matchTouchesAuthority(selectedMatch);
    const governanceResult = normalizeAuthorityProjection(
      evaluateGovernanceRequest(governanceRequest),
      authorityRelevant
    );
    const governanceStageStatus = determineGovernanceStageStatus(governanceResult);

    result.stageStatus.governance = {
      status: governanceStageStatus,
      reason: governanceResult.reason || "governance_result_missing_reason",
    };
    result.governance = {
      status: governanceStageStatus,
      reason: governanceResult.reason || "governance_result_missing_reason",
      expectedDecision: profile.expectedDecision,
      matchedExpectedDecision: governanceResult.decision === profile.expectedDecision,
      request: deepClone(governanceRequest),
      result: deepClone(governanceResult),
    };

    const authorityStage = determineAuthorityStage(authorityRelevant, governanceResult);
    result.stageStatus.authority = {
      status: authorityStage.status,
      reason: authorityStage.reason,
    };
    result.authority = authorityStage;

    const stableRefs = createStableRefs(
      fixtureSet.scenario.scenarioId,
      profile.variantName,
      authorityStage.relevant === true
    );
    const providedForensicContext = normalizedInput.forensicContext;
    const useCumulativeForensicEntries =
      providedForensicContext?.cumulativeEntries === true &&
      Boolean(providedForensicContext?.writer);
    let writer = providedForensicContext?.writer || null;
    let persistence =
      providedForensicContext &&
      Object.prototype.hasOwnProperty.call(providedForensicContext, "persistence")
        ? providedForensicContext.persistence
        : undefined;

    if (!writer) {
      const createdForensicWriter = createForensicWriter(
        normalizedInput.outputDirectory,
        fixtureSet.scenario.scenarioId,
        normalizedInput.evaluatedAt
      );
      writer = createdForensicWriter.writer;
      persistence = createdForensicWriter.persistence;
    } else if (persistence === undefined) {
      persistence = writer.persistence || null;
    }

    const sidecar = writer.recordGovernanceResult({
      request: governanceRequest,
      governanceResult,
      stableRefs,
      occurredAt: normalizedInput.evaluatedAt,
    });
    const forensicEntries = writer.chain.getEntries();
    const expectedForensicEntryCount =
      authorityStage.relevant === true && authorityStage.resolution.active === true
        ? 2
        : 1;
    const forensicStage = determineForensicStage(
      sidecar,
      forensicEntries,
      expectedForensicEntryCount,
      {
        cumulativeEntries: useCumulativeForensicEntries,
      }
    );

    result.stageStatus.forensic = {
      status: forensicStage.status,
      reason: forensicStage.reason,
    };
    result.forensic = {
      status: forensicStage.status,
      reason: forensicStage.reason,
      chainWriteStatus: sidecar.status,
      entryRefs: deepClone(sidecar.entryRefs || []),
      warnings: deepClone(sidecar.warnings || []),
      entries: deepClone(forensicEntries),
      expectedEntryCount: expectedForensicEntryCount,
      persistedPath:
        persistence && existsSync(persistence.resolveFilePath())
          ? persistence.resolveFilePath()
          : null,
    };

    if (result.forensic.persistedPath) {
      result.artifacts.forensicChainPath = result.forensic.persistedPath;
    }

    const skinResult = renderScenarioSkins(
      governanceResult,
      governanceRequest,
      fixtureSet.scenario.scenarioId,
      profile.variantName,
      normalizedInput.evaluatedAt
    );
    const skinStage = determineSkinsStage(skinResult);

    result.stageStatus.skins = {
      status: skinStage.status,
      reason: skinStage.reason,
    };
    result.skins = {
      status: skinStage.status,
      reason: skinStage.reason,
      outputs: skinResult.outputs,
      parityHolds: skinResult.parityHolds,
      fallbackSkinIds: [...skinResult.fallbackSkinIds],
      renderedSkinIds: [...DEFAULT_SKIN_ORDER],
    };
    result.truthFingerprints = skinResult.truthFingerprints;

    result.summary = buildSummary(
      result,
      fixtureSet,
      profile,
      selectedMatch,
      skinResult
    );
    result.holds = aggregateTopLevelHolds(result);
    result.errors = aggregateTopLevelErrors(result);
    result.status = deriveTopLevelStatus(result);

    return result;
  } catch (error) {
    result.stageStatus.pipeline = {
      status: STAGE_STATUS.FAIL,
      reason: "corridor_scenario_unhandled_error",
    };
    result.pipeline = {
      ...result.pipeline,
      status: STAGE_STATUS.FAIL,
      reason: "corridor_scenario_unhandled_error",
      errors: [
        {
          code: "corridor_scenario_unhandled_error",
          message: error.message,
        },
      ],
    };
    updateSkippedDownstreamStages(result, "corridor_scenario_unhandled_error");
    result.holds = aggregateTopLevelHolds(result);
    result.errors = aggregateTopLevelErrors(result);
    result.summary = {
      ...result.summary,
      expectedDecisionMatched: false,
    };
    result.status = deriveTopLevelStatus(result);

    return result;
  }
}

module.exports = {
  runCorridorScenario,
};
