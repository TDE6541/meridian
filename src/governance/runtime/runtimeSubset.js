const { GOVERNANCE_DECISIONS } = require("./decisionVocabulary");
const { deriveCivicConfidence, deriveDecisionRationale } = require("./deriveCivicConfidence");
const { derivePromiseStatus } = require("./derivePromiseStatus");
const MERIDIAN_GOVERNANCE_CONFIG = require("./meridian-governance-config");

const ROD_PRIORITY = Object.freeze({
  FULL_AUTO: 1,
  SUPERVISED: 2,
  HARD_STOP: 3,
});

const RESOLVED_OUTCOME_TO_STATE = Object.freeze({
  resolve: "RESOLVED",
  dismiss: "DISMISSED",
  explicitly_accept: "EXPLICITLY_ACCEPTED",
});

const OPEN_ITEMS_GROUPS = Object.freeze({
  MISSING_NOW: "Missing now",
  STILL_UNRESOLVED: "Still unresolved",
  AGING_INTO_RISK: "Aging into risk",
  RESOLVED_THIS_SESSION: "Resolved this session",
});

const OPEN_ITEMS_PRECEDENCE = Object.freeze([
  OPEN_ITEMS_GROUPS.RESOLVED_THIS_SESSION,
  OPEN_ITEMS_GROUPS.AGING_INTO_RISK,
  OPEN_ITEMS_GROUPS.STILL_UNRESOLVED,
  OPEN_ITEMS_GROUPS.MISSING_NOW,
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isStringArray(value) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  );
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function uniqueStrings(values) {
  const result = [];
  const seen = new Set();

  for (const value of values) {
    if (!isNonEmptyString(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

function getConfidenceContext(request) {
  return isPlainObject(request.confidence_context) ? request.confidence_context : null;
}

function getCandidateSignalPatch(request) {
  return isPlainObject(request.candidate_signal_patch)
    ? request.candidate_signal_patch
    : null;
}

function getAbsenceFlags(request) {
  const absence = getCandidateSignalPatch(request)?.governance?.absence;
  const missingTypes = isStringArray(request.evidence_context?.missing_types)
    ? request.evidence_context.missing_types.map((value) => value.toLowerCase())
    : [];

  return {
    inspectionMissing:
      (isPlainObject(absence) && absence.inspection_missing === true) ||
      missingTypes.some((value) => value.includes("inspection")),
    noticeMissing:
      (isPlainObject(absence) && absence.notice_missing === true) ||
      missingTypes.some(
        (value) => value.includes("notice") || value.includes("disclosure")
      ),
    supersessionMissing:
      isPlainObject(absence) && absence.supersession_missing === true,
  };
}

function deriveRequestFacts(request) {
  const missingApprovals = isStringArray(request.authority_context?.missing_approvals)
    ? request.authority_context.missing_approvals
    : [];
  const missingTypes = isStringArray(request.evidence_context?.missing_types)
    ? request.evidence_context.missing_types
    : [];
  const requiredCount = isNonNegativeInteger(request.evidence_context?.required_count)
    ? request.evidence_context.required_count
    : 0;
  const presentCount = isNonNegativeInteger(request.evidence_context?.present_count)
    ? request.evidence_context.present_count
    : 0;
  const evidenceGap = requiredCount - presentCount;
  const authorityResolved =
    request.authority_context?.resolved === true && missingApprovals.length === 0;
  const evidenceResolved = evidenceGap <= 0 && missingTypes.length === 0;

  return {
    missingApprovals,
    missingTypes,
    requiredCount,
    presentCount,
    evidenceGap,
    authorityResolved,
    evidenceResolved,
    absenceFlags: getAbsenceFlags(request),
  };
}

function normalizePolicyContext(policyContext) {
  if (!isPlainObject(policyContext)) {
    return {
      domainIds: [],
      constraintIds: [],
      omissionPackIds: [],
    };
  }

  return {
    domainIds: Array.isArray(policyContext.domainIds) ? policyContext.domainIds : [],
    constraintIds: Array.isArray(policyContext.constraintIds)
      ? policyContext.constraintIds
      : [],
    omissionPackIds: Array.isArray(policyContext.omissionPackIds)
      ? policyContext.omissionPackIds
      : [],
  };
}

function evaluateControlRodMode(
  policyContext,
  config = MERIDIAN_GOVERNANCE_CONFIG
) {
  const normalizedPolicyContext = normalizePolicyContext(policyContext);
  const domainIdSet = new Set(normalizedPolicyContext.domainIds);
  const matchedDomains = [];

  for (const [domainId, domain] of Object.entries(config.domains || {})) {
    if (!domainIdSet.has(domainId)) {
      continue;
    }

    matchedDomains.push({
      domainId,
      rodPosition: domain.rodPosition,
      description: domain.description,
    });
  }

  let effectiveDomain = null;
  for (const domain of matchedDomains) {
    if (
      !effectiveDomain ||
      (ROD_PRIORITY[domain.rodPosition] || 0) >
        (ROD_PRIORITY[effectiveDomain.rodPosition] || 0)
    ) {
      effectiveDomain = domain;
    }
  }

  return {
    matchedDomainIds: matchedDomains.map((domain) => domain.domainId),
    matchedDomains,
    effectiveDomainId: effectiveDomain?.domainId || null,
    effectivePosture: effectiveDomain?.rodPosition || null,
    hasMatchedDomain: matchedDomains.length > 0,
  };
}

function evaluateConstraintsRegistry(
  policyContext,
  config = MERIDIAN_GOVERNANCE_CONFIG
) {
  const normalizedPolicyContext = normalizePolicyContext(policyContext);
  const findings = normalizedPolicyContext.constraintIds
    .filter((constraintId) => isPlainObject(config.constraints?.[constraintId]))
    .map((constraintId) => ({
      constraintId,
      description: config.constraints[constraintId].description,
      defaultDecision: config.constraints[constraintId].defaultDecision,
      requiredFacts: Array.isArray(config.constraints[constraintId].requiredFacts)
        ? [...config.constraints[constraintId].requiredFacts]
        : [],
    }));

  let effectiveDecision = null;
  if (
    findings.some(
      (finding) => finding.defaultDecision === GOVERNANCE_DECISIONS.BLOCK
    )
  ) {
    effectiveDecision = GOVERNANCE_DECISIONS.BLOCK;
  } else if (
    findings.some(
      (finding) => finding.defaultDecision === GOVERNANCE_DECISIONS.HOLD
    )
  ) {
    effectiveDecision = GOVERNANCE_DECISIONS.HOLD;
  }

  return {
    triggeredConstraintIds: findings.map((finding) => finding.constraintId),
    findings,
    effectiveDecision,
  };
}

function buildOmissionEvidenceRefs(omissionPackId, requestFacts) {
  const evidenceRefs = [];

  if (omissionPackId === "action_without_authority") {
    if (!requestFacts.authorityResolved) {
      evidenceRefs.push("authority_context.resolved=false");
    }

    for (const approval of requestFacts.missingApprovals) {
      evidenceRefs.push(`missing_approval:${approval}`);
    }
  }

  if (omissionPackId === "permit_without_inspection") {
    if (requestFacts.absenceFlags.inspectionMissing) {
      evidenceRefs.push("candidate_signal_patch.governance.absence.inspection_missing");
    }

    for (const missingType of requestFacts.missingTypes) {
      if (missingType.toLowerCase().includes("inspection")) {
        evidenceRefs.push(`missing_evidence_type:${missingType}`);
      }
    }
  }

  if (omissionPackId === "closure_without_evidence") {
    for (const missingType of requestFacts.missingTypes) {
      evidenceRefs.push(`missing_evidence_type:${missingType}`);
    }
  }

  return evidenceRefs.length > 0
    ? evidenceRefs
    : [`omission_pack:${omissionPackId}`];
}

function evaluateOmissionCoverage(
  request,
  policyContext,
  config = MERIDIAN_GOVERNANCE_CONFIG,
  requestFacts = deriveRequestFacts(request)
) {
  const normalizedPolicyContext = normalizePolicyContext(policyContext);
  const entityId = request.entity_ref?.entity_id || "unknown_entity";
  const findings = normalizedPolicyContext.omissionPackIds
    .filter((omissionPackId) => isPlainObject(config.omissionPacks?.[omissionPackId]))
    .map((omissionPackId) => ({
      findingId: `${omissionPackId}:${entityId}`,
      omissionPackId,
      summary: config.omissionPacks[omissionPackId].detects,
      consequence: config.omissionPacks[omissionPackId].defaultConsequence,
      relevantDomains: Array.isArray(config.omissionPacks[omissionPackId].relevantDomains)
        ? [...config.omissionPacks[omissionPackId].relevantDomains]
        : [],
      sourceRefs: [`config.omissionPacks.${omissionPackId}`],
      evidenceRefs: buildOmissionEvidenceRefs(omissionPackId, requestFacts),
    }));

  return {
    activeOmissionPackIds: findings.map((finding) => finding.omissionPackId),
    findings,
    effectiveDecision: findings.some(
      (finding) => finding.consequence === GOVERNANCE_DECISIONS.HOLD
    )
      ? GOVERNANCE_DECISIONS.HOLD
      : null,
  };
}

function normalizeContinuityEntry(input) {
  if (
    !isPlainObject(input) ||
    !isNonEmptyString(input.entry_id) ||
    !isNonEmptyString(input.entry_type) ||
    !isNonEmptyString(input.summary) ||
    !isNonEmptyString(input.origin_session_id) ||
    !isNonEmptyString(input.last_seen_session_id) ||
    !isNonNegativeInteger(input.session_count) ||
    input.session_count === 0 ||
    !isNonNegativeInteger(input.carry_count) ||
    !isStringArray(input.source_refs)
  ) {
    return null;
  }

  if (
    input.evidence_refs !== undefined &&
    !isStringArray(input.evidence_refs) &&
    !(Array.isArray(input.evidence_refs) && input.evidence_refs.length === 0)
  ) {
    return null;
  }

  if (
    input.operator_outcome !== undefined &&
    !Object.prototype.hasOwnProperty.call(
      RESOLVED_OUTCOME_TO_STATE,
      input.operator_outcome
    )
  ) {
    return null;
  }

  return {
    entryId: input.entry_id,
    entryType: input.entry_type,
    summary: input.summary,
    originSessionId: input.origin_session_id,
    lastSeenSessionId: input.last_seen_session_id,
    sessionCount: input.session_count,
    carryCount: input.carry_count,
    sourceRefs: uniqueStrings(input.source_refs),
    evidenceRefs: uniqueStrings(input.evidence_refs || []),
    operatorOutcome: input.operator_outcome,
  };
}

function normalizeContinuationSignal(input) {
  if (
    !isPlainObject(input) ||
    !isNonEmptyString(input.entry_id) ||
    typeof input.relevant_work_continued !== "boolean" ||
    typeof input.blast_radius_still_exists !== "boolean" ||
    !Array.isArray(input.evidence_refs) ||
    !input.evidence_refs.every(
      (entry) => typeof entry === "string" && entry.trim() !== ""
    )
  ) {
    return null;
  }

  return {
    entryId: input.entry_id,
    relevantWorkContinued: input.relevant_work_continued,
    blastRadiusStillExists: input.blast_radius_still_exists,
    evidenceRefs: uniqueStrings(input.evidence_refs),
  };
}

function normalizeResolvedOutcome(input) {
  if (
    !isPlainObject(input) ||
    !isNonEmptyString(input.entry_id) ||
    !isNonEmptyString(input.summary) ||
    !Object.prototype.hasOwnProperty.call(RESOLVED_OUTCOME_TO_STATE, input.outcome) ||
    !isStringArray(input.source_refs)
  ) {
    return null;
  }

  if (
    input.evidence_refs !== undefined &&
    !isStringArray(input.evidence_refs) &&
    !(Array.isArray(input.evidence_refs) && input.evidence_refs.length === 0)
  ) {
    return null;
  }

  return {
    entryId: input.entry_id,
    summary: input.summary,
    outcome: input.outcome,
    sourceRefs: uniqueStrings(input.source_refs),
    evidenceRefs: uniqueStrings(input.evidence_refs || []),
  };
}

function normalizeSyntheticRuntimeContext(request) {
  const confidenceContext = getConfidenceContext(request);
  const defaultEvaluationSessionId = `${request.org_id}:${request.entity_ref?.entity_id}`;
  const normalized = {
    evaluationSessionId: defaultEvaluationSessionId,
    continuityEntries: [],
    continuationSignals: [],
    currentSessionResolvedOutcomes: [],
    invalidReason: null,
  };

  if (!confidenceContext) {
    return normalized;
  }

  if (
    confidenceContext.evaluation_session_id !== undefined &&
    !isNonEmptyString(confidenceContext.evaluation_session_id)
  ) {
    normalized.invalidReason = "confidence_context_evaluation_session_id_invalid";
    return normalized;
  }

  if (isNonEmptyString(confidenceContext.evaluation_session_id)) {
    normalized.evaluationSessionId = confidenceContext.evaluation_session_id;
  }

  if (
    confidenceContext.continuity_entries !== undefined &&
    !Array.isArray(confidenceContext.continuity_entries)
  ) {
    normalized.invalidReason = "confidence_context_continuity_entries_invalid";
    return normalized;
  }

  if (
    confidenceContext.continuation_signals !== undefined &&
    !Array.isArray(confidenceContext.continuation_signals)
  ) {
    normalized.invalidReason = "confidence_context_continuation_signals_invalid";
    return normalized;
  }

  if (
    confidenceContext.current_session_resolved_outcomes !== undefined &&
    !Array.isArray(confidenceContext.current_session_resolved_outcomes)
  ) {
    normalized.invalidReason =
      "confidence_context_current_session_resolved_outcomes_invalid";
    return normalized;
  }

  for (const entryInput of confidenceContext.continuity_entries || []) {
    const entry = normalizeContinuityEntry(entryInput);
    if (!entry) {
      normalized.invalidReason = "confidence_context_continuity_entries_invalid";
      return normalized;
    }

    normalized.continuityEntries.push(entry);
  }

  for (const signalInput of confidenceContext.continuation_signals || []) {
    const signal = normalizeContinuationSignal(signalInput);
    if (!signal) {
      normalized.invalidReason = "confidence_context_continuation_signals_invalid";
      return normalized;
    }

    normalized.continuationSignals.push(signal);
  }

  for (const outcomeInput of confidenceContext.current_session_resolved_outcomes || []) {
    const outcome = normalizeResolvedOutcome(outcomeInput);
    if (!outcome) {
      normalized.invalidReason =
        "confidence_context_current_session_resolved_outcomes_invalid";
      return normalized;
    }

    normalized.currentSessionResolvedOutcomes.push(outcome);
  }

  return normalized;
}

function buildDerivedContinuityEntries(omissionCoverage, evaluationSessionId) {
  return omissionCoverage.findings.map((finding) => ({
    entryId: `omission:${finding.findingId}`,
    entryType: "omission_finding",
    summary: finding.summary,
    originSessionId: evaluationSessionId,
    lastSeenSessionId: evaluationSessionId,
    sessionCount: 1,
    carryCount: 0,
    sourceRefs: [...finding.sourceRefs],
    evidenceRefs: [...finding.evidenceRefs],
    operatorOutcome: undefined,
  }));
}

function evaluateContinuityLedger(syntheticContext, omissionCoverage) {
  const entriesById = new Map();

  for (const entry of syntheticContext.continuityEntries) {
    if (!entriesById.has(entry.entryId)) {
      entriesById.set(entry.entryId, entry);
    }
  }

  for (const entry of buildDerivedContinuityEntries(
    omissionCoverage,
    syntheticContext.evaluationSessionId
  )) {
    if (!entriesById.has(entry.entryId)) {
      entriesById.set(entry.entryId, entry);
    }
  }

  return {
    evaluationSessionId: syntheticContext.evaluationSessionId,
    entries: Array.from(entriesById.values()),
  };
}

function deriveStandingRiskState(entry, continuationSignal, evaluationSessionId) {
  if (entry.operatorOutcome) {
    return {
      state: RESOLVED_OUTCOME_TO_STATE[entry.operatorOutcome],
      triadSatisfied: false,
      relevantWorkContinued: false,
      blastRadiusStillExists: false,
      evidenceRefs: [],
      rationale: "Terminal operator outcome is already recorded for this entry.",
    };
  }

  const hasLaterSession = entry.lastSeenSessionId !== entry.originSessionId;
  const sessionMatchesEvaluation =
    entry.lastSeenSessionId === evaluationSessionId;
  const relevantWorkContinued =
    hasLaterSession &&
    sessionMatchesEvaluation &&
    continuationSignal?.relevantWorkContinued === true;
  const blastRadiusStillExists =
    continuationSignal?.blastRadiusStillExists === true;
  const triadSatisfied = relevantWorkContinued && blastRadiusStillExists;

  if (!triadSatisfied) {
    return {
      state: "OPEN",
      triadSatisfied,
      relevantWorkContinued,
      blastRadiusStillExists,
      evidenceRefs: continuationSignal?.evidenceRefs || [],
      rationale: "Escalation triad is incomplete; derived state remains OPEN.",
    };
  }

  if (entry.carryCount >= 2) {
    return {
      state: "STANDING",
      triadSatisfied,
      relevantWorkContinued,
      blastRadiusStillExists,
      evidenceRefs: continuationSignal.evidenceRefs,
      rationale:
        "Escalation triad is satisfied and carryCount>=2; derived state is STANDING.",
    };
  }

  if (entry.carryCount >= 1) {
    return {
      state: "CARRIED",
      triadSatisfied,
      relevantWorkContinued,
      blastRadiusStillExists,
      evidenceRefs: continuationSignal.evidenceRefs,
      rationale:
        "Escalation triad is satisfied and carryCount>=1; derived state is CARRIED.",
    };
  }

  return {
    state: "OPEN",
    triadSatisfied,
    relevantWorkContinued,
    blastRadiusStillExists,
    evidenceRefs: continuationSignal?.evidenceRefs || [],
    rationale:
      "Escalation triad is satisfied but carryCount=0; derived state remains OPEN.",
    };
}

function evaluateStandingRisk(
  continuityLedger,
  syntheticContext,
  config = MERIDIAN_GOVERNANCE_CONFIG
) {
  const signalsByEntryId = new Map(
    syntheticContext.continuationSignals.map((signal) => [signal.entryId, signal])
  );
  const blockingStates = Array.isArray(config.runtimeSubset?.standingRisk?.blockingStates)
    ? [...config.runtimeSubset.standingRisk.blockingStates]
    : [];
  const view = continuityLedger.entries.map((entry) => {
    const derivedState = deriveStandingRiskState(
      entry,
      signalsByEntryId.get(entry.entryId),
      continuityLedger.evaluationSessionId
    );

    return {
      entryId: entry.entryId,
      entryType: entry.entryType,
      summary: entry.summary,
      state: derivedState.state,
      originSessionId: entry.originSessionId,
      lastSeenSessionId: entry.lastSeenSessionId,
      sessionCount: entry.sessionCount,
      carryCount: entry.carryCount,
      triadSatisfied: derivedState.triadSatisfied,
      relevantWorkContinued: derivedState.relevantWorkContinued,
      blastRadiusStillExists: derivedState.blastRadiusStillExists,
      evidenceRefs: uniqueStrings([
        ...entry.evidenceRefs,
        ...derivedState.evidenceRefs,
      ]),
      sourceRefs: [...entry.sourceRefs],
      rationale: derivedState.rationale,
    };
  });

  return {
    blockingStates,
    view,
    blockingItems: view.filter((item) => blockingStates.includes(item.state)),
  };
}

function evaluateSafetyInterlocks(
  controlRod,
  config = MERIDIAN_GOVERNANCE_CONFIG
) {
  const evaluations = Object.entries(config.runtimeSubset?.interlocks || {}).map(
    ([interlockId, interlock]) => {
      const triggered =
        Array.isArray(interlock.appliesToRodPositions) &&
        interlock.appliesToRodPositions.includes(controlRod.effectivePosture);
      const decision = triggered ? interlock.defaultOutcome : null;

      return {
        interlockId,
        triggered,
        appliesToRodPositions: Array.isArray(interlock.appliesToRodPositions)
          ? [...interlock.appliesToRodPositions]
          : [],
        defaultOutcome: decision,
        emittedDecision: triggered ? interlock.emittedDecision : null,
        reason: triggered ? interlock.reason : null,
        description: interlock.description || null,
        requiresAuthorization: decision === "require_authorization",
        mayProceed: decision === "allow_with_receipt",
      };
    }
  );

  const effective =
    evaluations.find(
      (evaluation) => evaluation.triggered && evaluation.defaultOutcome === "stop"
    ) ||
    evaluations.find(
      (evaluation) =>
        evaluation.triggered &&
        evaluation.defaultOutcome === "require_authorization"
    ) ||
    null;

  return {
    evaluations,
    effective,
  };
}

function composeHoldReason(requestFacts, omissionCoverage, standingRisk) {
  const reasonParts = [];

  if (!requestFacts.authorityResolved) {
    if (requestFacts.missingApprovals.length > 0) {
      reasonParts.push(
        `missing_approvals=${requestFacts.missingApprovals.join(",")}`
      );
    } else {
      reasonParts.push("authority_unresolved");
    }
  }

  if (requestFacts.evidenceGap > 0) {
    reasonParts.push(
      `evidence_gap=${requestFacts.presentCount}/${requestFacts.requiredCount}`
    );
  }

  if (requestFacts.missingTypes.length > 0) {
    reasonParts.push(
      `missing_evidence_types=${requestFacts.missingTypes.join(",")}`
    );
  }

  if (reasonParts.length === 0 && omissionCoverage.findings.length > 0) {
    reasonParts.push(
      `omission_findings=${omissionCoverage.findings
        .map((finding) => finding.omissionPackId)
        .join(",")}`
    );
  }

  if (reasonParts.length === 0 && standingRisk.blockingItems.length > 0) {
    reasonParts.push(
      `standing_risk_states=${standingRisk.blockingItems
        .map((item) => `${item.entryId}:${item.state}`)
        .join(",")}`
    );
  }

  return reasonParts.join(";");
}

function buildHoldEvidence(requestFacts, omissionCoverage, standingRisk) {
  return uniqueStrings([
    ...requestFacts.missingApprovals.map((approval) => `missing_approval:${approval}`),
    ...requestFacts.missingTypes.map((missingType) => `missing_evidence_type:${missingType}`),
    ...omissionCoverage.findings.flatMap((finding) => finding.evidenceRefs),
    ...standingRisk.blockingItems.flatMap((item) => item.evidenceRefs),
  ]);
}

function buildHoldOptions(requestFacts, omissionCoverage, standingRisk) {
  const options = [];

  if (requestFacts.missingApprovals.length > 0) {
    options.push("resolve_required_approvals");
  }

  if (requestFacts.evidenceGap > 0 || requestFacts.missingTypes.length > 0) {
    options.push("supply_required_evidence");
  }

  if (omissionCoverage.findings.length > 0) {
    options.push("clear_omission_findings");
  }

  if (standingRisk.blockingItems.length > 0) {
    options.push("resolve_standing_risk_entries");
  }

  return uniqueStrings(options);
}

function buildHoldSummary(controlRod, omissionCoverage, standingRisk) {
  if (standingRisk.blockingItems.length > 0) {
    return "Standing-risk escalation requires HOLD before this request may proceed.";
  }

  if (omissionCoverage.findings.length > 0) {
    return "Deterministic omission findings require HOLD before this request may proceed.";
  }

  if (controlRod.effectivePosture === "SUPERVISED") {
    return "SUPERVISED domain remains on HOLD until missing authority or evidence resolves.";
  }

  return "Governance request remains on HOLD until required conditions resolve.";
}

function createHoldProjection(
  request,
  controlRod,
  reason,
  requestFacts,
  omissionCoverage,
  standingRisk,
  config = MERIDIAN_GOVERNANCE_CONFIG
) {
  return {
    holdId: `governance-hold:${request.org_id}:${request.entity_ref.entity_id}`,
    status: config.runtimeSubset?.hold?.defaultStatus || "active",
    blocking: true,
    summary: buildHoldSummary(controlRod, omissionCoverage, standingRisk),
    reason,
    impact:
      config.runtimeSubset?.hold?.impact ||
      "Request remains gated until the blocking governance conditions are resolved.",
    resolutionPath:
      config.runtimeSubset?.hold?.resolutionPath ||
      "Resolve missing approvals, required evidence, omission findings, or standing-risk conditions and re-evaluate.",
    evidence: buildHoldEvidence(requestFacts, omissionCoverage, standingRisk),
    options: buildHoldOptions(requestFacts, omissionCoverage, standingRisk),
  };
}

function makeOpenItemsGroups() {
  return {
    [OPEN_ITEMS_GROUPS.MISSING_NOW]: [],
    [OPEN_ITEMS_GROUPS.STILL_UNRESOLVED]: [],
    [OPEN_ITEMS_GROUPS.AGING_INTO_RISK]: [],
    [OPEN_ITEMS_GROUPS.RESOLVED_THIS_SESSION]: [],
  };
}

function projectOpenItemsBoard(
  omissionCoverage,
  continuityLedger,
  standingRisk,
  resolvedOutcomes
) {
  const groups = makeOpenItemsGroups();
  const seenKeys = new Set();
  const continuityByEntryId = new Map(
    continuityLedger.entries.map((entry) => [entry.entryId, entry])
  );

  for (const outcome of resolvedOutcomes) {
    const dedupeKey = `entry:${outcome.entryId}`;
    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    groups[OPEN_ITEMS_GROUPS.RESOLVED_THIS_SESSION].push({
      itemId: outcome.entryId,
      summary: outcome.summary,
      stateLabel: OPEN_ITEMS_GROUPS.RESOLVED_THIS_SESSION,
      sourceRefs: [...outcome.sourceRefs],
      evidenceRefs: [...outcome.evidenceRefs],
    });
    seenKeys.add(dedupeKey);
  }

  for (const item of standingRisk.view) {
    if (item.state !== "OPEN" && item.state !== "CARRIED" && item.state !== "STANDING") {
      continue;
    }

    const dedupeKey = `entry:${item.entryId}`;
    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    const targetGroup =
      item.state === "STANDING"
        ? OPEN_ITEMS_GROUPS.AGING_INTO_RISK
        : OPEN_ITEMS_GROUPS.STILL_UNRESOLVED;
    const continuityEntry = continuityByEntryId.get(item.entryId);

    groups[targetGroup].push({
      itemId: item.entryId,
      summary: continuityEntry?.summary || item.summary,
      stateLabel: item.state,
      sourceRefs: continuityEntry ? [...continuityEntry.sourceRefs] : [],
      evidenceRefs: [...item.evidenceRefs],
    });
    seenKeys.add(dedupeKey);
  }

  for (const finding of omissionCoverage.findings) {
    const dedupeKey = `finding:${finding.findingId}`;
    if (seenKeys.has(dedupeKey)) {
      continue;
    }

    groups[OPEN_ITEMS_GROUPS.MISSING_NOW].push({
      itemId: finding.findingId,
      summary: finding.summary,
      missingItemCode: finding.omissionPackId,
      sourceRefs: [...finding.sourceRefs],
      evidenceRefs: [...finding.evidenceRefs],
    });
    seenKeys.add(dedupeKey);
  }

  return {
    boardLabel: "Open Items Board",
    sessionId: continuityLedger.evaluationSessionId,
    precedence: [...OPEN_ITEMS_PRECEDENCE],
    groups,
  };
}

function buildRuntimeSubsetDetails(
  controlRod,
  constraints,
  omissions,
  continuity,
  standingRisk,
  interlocks,
  openItemsBoard
) {
  return {
    controlRod,
    constraints,
    omissions,
    continuity,
    standingRisk,
    interlocks,
    openItemsBoard,
  };
}

function attachCivicProjection(
  runtimeSubset,
  request,
  requestFacts,
  omissions,
  standingRisk,
  controlRod,
  decision,
  reason,
  hold,
  config = MERIDIAN_GOVERNANCE_CONFIG
) {
  const confidence = deriveCivicConfidence(
    {
      decision,
      reason,
      hold,
      standingRisk,
    },
    config
  );

  return {
    ...runtimeSubset,
    civic: {
      promise_status: derivePromiseStatus(
        request,
        requestFacts,
        omissions,
        standingRisk
      ),
      confidence,
      rationale: {
        decision: deriveDecisionRationale({
          decision,
          reason,
          requestFacts,
          omissions,
          standingRisk,
          controlRod,
        }),
      },
    },
  };
}

function evaluateRuntimeSubset(
  request,
  policyContext,
  config = MERIDIAN_GOVERNANCE_CONFIG
) {
  const requestFacts = deriveRequestFacts(request);
  const syntheticContext = normalizeSyntheticRuntimeContext(request);
  const controlRod = evaluateControlRodMode(policyContext, config);
  const constraints = evaluateConstraintsRegistry(policyContext, config);
  const omissions = evaluateOmissionCoverage(
    request,
    policyContext,
    config,
    requestFacts
  );
  const continuity = evaluateContinuityLedger(syntheticContext, omissions);
  const standingRisk = evaluateStandingRisk(continuity, syntheticContext, config);
  const interlocks = evaluateSafetyInterlocks(controlRod, config);
  const openItemsBoard =
    config.runtimeSubset?.openItemsBoard?.enabled === false
      ? null
      : projectOpenItemsBoard(
          omissions,
          continuity,
          standingRisk,
          syntheticContext.currentSessionResolvedOutcomes
        );
  const runtimeSubset = buildRuntimeSubsetDetails(
    controlRod,
    constraints,
    omissions,
    continuity,
    standingRisk,
    interlocks,
    openItemsBoard
  );

  if (syntheticContext.invalidReason) {
    return {
      decision: GOVERNANCE_DECISIONS.BLOCK,
      reason: syntheticContext.invalidReason,
      runtimeSubset: attachCivicProjection(
        runtimeSubset,
        request,
        requestFacts,
        omissions,
        standingRisk,
        controlRod,
        GOVERNANCE_DECISIONS.BLOCK,
        syntheticContext.invalidReason,
        null,
        config
      ),
    };
  }

  if (!controlRod.hasMatchedDomain) {
    return {
      decision: GOVERNANCE_DECISIONS.BLOCK,
      reason: "unsupported_request_domain",
      runtimeSubset: attachCivicProjection(
        runtimeSubset,
        request,
        requestFacts,
        omissions,
        standingRisk,
        controlRod,
        GOVERNANCE_DECISIONS.BLOCK,
        "unsupported_request_domain",
        null,
        config
      ),
    };
  }

  const blockingConstraint = constraints.findings.find(
    (finding) => finding.defaultDecision === GOVERNANCE_DECISIONS.BLOCK
  );

  if (blockingConstraint) {
    return {
      decision: GOVERNANCE_DECISIONS.BLOCK,
      reason: blockingConstraint.constraintId,
      runtimeSubset: attachCivicProjection(
        runtimeSubset,
        request,
        requestFacts,
        omissions,
        standingRisk,
        controlRod,
        GOVERNANCE_DECISIONS.BLOCK,
        blockingConstraint.constraintId,
        null,
        config
      ),
    };
  }

  const shouldHold =
    constraints.effectiveDecision === GOVERNANCE_DECISIONS.HOLD ||
    omissions.effectiveDecision === GOVERNANCE_DECISIONS.HOLD ||
    standingRisk.blockingItems.length > 0;

  if (shouldHold) {
    const reason = composeHoldReason(requestFacts, omissions, standingRisk);
    const hold = createHoldProjection(
      request,
      controlRod,
      reason,
      requestFacts,
      omissions,
      standingRisk,
      config
    );

    return {
      decision: GOVERNANCE_DECISIONS.HOLD,
      reason,
      hold,
      runtimeSubset: attachCivicProjection(
        runtimeSubset,
        request,
        requestFacts,
        omissions,
        standingRisk,
        controlRod,
        GOVERNANCE_DECISIONS.HOLD,
        reason,
        hold,
        config
      ),
    };
  }

  if (interlocks.effective?.emittedDecision === GOVERNANCE_DECISIONS.BLOCK) {
    return {
      decision: GOVERNANCE_DECISIONS.BLOCK,
      reason: interlocks.effective.reason,
      runtimeSubset: attachCivicProjection(
        runtimeSubset,
        request,
        requestFacts,
        omissions,
        standingRisk,
        controlRod,
        GOVERNANCE_DECISIONS.BLOCK,
        interlocks.effective.reason,
        null,
        config
      ),
    };
  }

  if (interlocks.effective?.emittedDecision === GOVERNANCE_DECISIONS.SUPERVISE) {
    return {
      decision: GOVERNANCE_DECISIONS.SUPERVISE,
      reason: interlocks.effective.reason,
      runtimeSubset: attachCivicProjection(
        runtimeSubset,
        request,
        requestFacts,
        omissions,
        standingRisk,
        controlRod,
        GOVERNANCE_DECISIONS.SUPERVISE,
        interlocks.effective.reason,
        null,
        config
      ),
    };
  }

  return {
    decision: GOVERNANCE_DECISIONS.ALLOW,
    reason: "authority_and_evidence_resolved",
    runtimeSubset: attachCivicProjection(
      runtimeSubset,
      request,
      requestFacts,
      omissions,
      standingRisk,
      controlRod,
      GOVERNANCE_DECISIONS.ALLOW,
      "authority_and_evidence_resolved",
      null,
      config
    ),
  };
}

module.exports = {
  OPEN_ITEMS_GROUPS,
  OPEN_ITEMS_PRECEDENCE,
  evaluateRuntimeSubset,
};
