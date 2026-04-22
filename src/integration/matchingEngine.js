const MATCH_RESULT_CONTRACT_VERSION = "wave8.matchResult.v1";

const MATCH_TYPES = Object.freeze([
  "CONFIRMATION",
  "CONDITION",
  "RESOLUTION",
  "PROPOSED_CREATION",
  "REJECTION",
  "DEFERRAL",
  "AMENDMENT",
  "UNMATCHED",
]);

const CONFIDENCE_TIERS = Object.freeze([
  "EXACT",
  "STRONG",
  "WEAK",
  "AMBIGUOUS",
  "UNMATCHED",
]);

const ACTION_SIGNAL_PATTERNS = Object.freeze([
  { verb: "defer", matchType: "DEFERRAL", regex: /\bdefer(?:red)?\b/i },
  {
    verb: "condition",
    matchType: "CONDITION",
    regex: /\bcondition(?:ed|s|ing)?\b/i,
  },
  {
    verb: "hard_stop",
    matchType: "REJECTION",
    regex: /\bhard stop\b|\bblock(?:ed|ing)?\b/i,
  },
  {
    verb: "revoke",
    matchType: "REJECTION",
    regex: /\brevoke(?:d)?\b|\bdeny(?:ing|ied)?\b|\bremove(?:d)?\b/i,
  },
  {
    verb: "schedule",
    matchType: "AMENDMENT",
    regex: /\bschedule(?:d)?\b|\breschedule(?:d)?\b/i,
  },
  {
    verb: "carry_forward",
    matchType: "AMENDMENT",
    regex: /\bcarry forward\b|\bcarry-forward\b/i,
  },
  {
    verb: "keep",
    matchType: "CONFIRMATION",
    regex: /\bkeep\b|\bmaintain\b|\bprotect\b|\bremain(?:s|ed)?\b/i,
  },
  {
    verb: "issue",
    matchType: "RESOLUTION",
    regex: /\bissue(?:d)?\b|\bissued\b/i,
  },
  {
    verb: "approve",
    matchType: "RESOLUTION",
    regex: /\bapprove(?:d)?\b|\bapproved\b/i,
  },
  {
    verb: "resolve",
    matchType: "RESOLUTION",
    regex: /\bresolve(?:d)?\b|\bresolved\b/i,
  },
  {
    verb: "complete",
    matchType: "RESOLUTION",
    regex: /\bcomplete(?:d)?\b|\bcompleted\b/i,
  },
  {
    verb: "repair",
    matchType: "RESOLUTION",
    regex: /\brepair(?:ed)?\b|\brestored?\b/i,
  },
  {
    verb: "pass",
    matchType: "CONFIRMATION",
    regex: /\bpass(?:ed)?\b|\bpassed\b/i,
  },
  {
    verb: "escalate",
    matchType: "RESOLUTION",
    regex: /\bescalate(?:d)?\b|\bescalated\b/i,
  },
]);

const ACTION_ENTITY_SCORES = Object.freeze({
  approve: Object.freeze({
    decision_record: 18,
    permit_application: 10,
    authority_grant: 18,
  }),
  issue: Object.freeze({
    permit_application: 30,
    authority_grant: 20,
  }),
  schedule: Object.freeze({
    inspection: 30,
  }),
  pass: Object.freeze({
    inspection: 24,
  }),
  keep: Object.freeze({
    obligation: 26,
    critical_site: 18,
  }),
  defer: Object.freeze({
    action_request: 28,
    decision_record: 24,
  }),
  condition: Object.freeze({
    action_request: 28,
    obligation: 24,
    corridor_zone: 22,
  }),
  revoke: Object.freeze({
    authority_grant: 32,
    action_request: 18,
  }),
  resolve: Object.freeze({
    action_request: 24,
    decision_record: 22,
    corridor_zone: 20,
    authority_grant: 18,
  }),
  escalate: Object.freeze({
    incident_observation: 26,
    critical_site: 18,
    utility_asset: 16,
  }),
  complete: Object.freeze({
    utility_asset: 30,
    incident_observation: 16,
  }),
  repair: Object.freeze({
    utility_asset: 30,
    critical_site: 16,
  }),
  hard_stop: Object.freeze({
    corridor_zone: 24,
    action_request: 20,
  }),
  carry_forward: Object.freeze({
    obligation: 28,
  }),
});

const DEFAULT_OPEN_STATUSES = Object.freeze([
  "OPEN",
  "PENDING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "UNSCHEDULED",
  "DEFERRED",
  "CONTESTED",
  "REQUESTING_ACCESS",
  "FAILED",
  "ALERTING",
  "AT_RISK",
  "DRAFT",
  "CLAIMED_ACTIVE",
  "ACTIVE_TRAFFIC",
]);

const DEFAULT_CONFIG = Object.freeze({
  weakScore: 35,
  strongScore: 55,
  ambiguousDelta: 3,
  openStatuses: DEFAULT_OPEN_STATUSES,
});

const GENERIC_STATUS_TOKENS = new Set([
  "open",
  "pending",
  "submitted",
  "under",
  "review",
  "unscheduled",
  "deferred",
  "contested",
  "requesting",
  "access",
  "failed",
  "alerting",
  "draft",
  "active",
  "closed",
  "resolved",
  "approved",
  "issued",
  "passed",
  "owner",
  "confirmed",
  "executed",
  "repaired",
  "normalized",
  "service",
  "restored",
  "follow",
  "up",
  "controlled",
]);

const ENTITY_TYPE_GENERIC_TOKENS = new Set([
  "action",
  "application",
  "asset",
  "authority",
  "critical",
  "decision",
  "device",
  "entity",
  "grant",
  "incident",
  "inspection",
  "obligation",
  "observation",
  "organization",
  "permit",
  "record",
  "request",
  "site",
  "utility",
  "zone",
  "corridor",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function requireNonEmptyString(value, fieldName) {
  if (!isNonEmptyString(value)) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function tokenize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => token.split(/[:_-]+/).filter(Boolean));
}

function normalizePhrase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniq(values) {
  return [...new Set(values)];
}

function normalizeArrayRecord(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      Array.isArray(entryValue)
        ? entryValue.filter(isNonEmptyString)
        : isNonEmptyString(entryValue)
          ? [entryValue]
          : [],
    ])
  );
}

function normalizeAliasTables(aliasTables) {
  if (!isPlainObject(aliasTables)) {
    return {
      corridors: {},
      entities: {},
      entityTypes: {},
    };
  }

  return {
    corridors: normalizeArrayRecord(aliasTables.corridors),
    entities: normalizeArrayRecord(aliasTables.entities),
    entityTypes: normalizeArrayRecord(aliasTables.entityTypes),
  };
}

function normalizeConfig(config) {
  if (!isPlainObject(config)) {
    return {
      ...DEFAULT_CONFIG,
      openStatuses: [...DEFAULT_OPEN_STATUSES],
    };
  }

  return {
    weakScore:
      Number.isFinite(config.weakScore) && config.weakScore > 0
        ? config.weakScore
        : DEFAULT_CONFIG.weakScore,
    strongScore:
      Number.isFinite(config.strongScore) && config.strongScore > 0
        ? config.strongScore
        : DEFAULT_CONFIG.strongScore,
    ambiguousDelta:
      Number.isFinite(config.ambiguousDelta) && config.ambiguousDelta >= 0
        ? config.ambiguousDelta
        : DEFAULT_CONFIG.ambiguousDelta,
    openStatuses: Array.isArray(config.openStatuses)
      ? config.openStatuses.filter(isNonEmptyString)
      : [...DEFAULT_OPEN_STATUSES],
  };
}

function extractItems(extractionOutput) {
  if (!isPlainObject(extractionOutput)) {
    throw new TypeError("extractionOutput must be a plain object.");
  }

  if (
    isPlainObject(extractionOutput.capture_artifact) &&
    Array.isArray(extractionOutput.capture_artifact.extracted_items)
  ) {
    return extractionOutput.capture_artifact.extracted_items.map((entry, index) =>
      normalizeExtractionItem(entry, index)
    );
  }

  if (
    isPlainObject(extractionOutput.governance_handoff) &&
    Array.isArray(extractionOutput.governance_handoff.selected_items)
  ) {
    return extractionOutput.governance_handoff.selected_items.map((entry, index) =>
      normalizeExtractionItem(
        {
          capture_item_id: entry.capture_item_id,
          item_kind: entry.normalized_item_type,
          summary: entry.normalized_summary,
          lineage: entry.lineage,
        },
        index
      )
    );
  }

  if (Array.isArray(extractionOutput.extracted_items)) {
    return extractionOutput.extracted_items.map((entry, index) =>
      normalizeExtractionItem(entry, index)
    );
  }

  return [];
}

function normalizeExtractionItem(entry, index) {
  if (!isPlainObject(entry)) {
    throw new TypeError(`extracted item at index ${index} must be a plain object.`);
  }

  return {
    captureItemId: requireNonEmptyString(
      entry.capture_item_id || entry.captureItemId || `synthetic:${index}`,
      `extracted_items[${index}].capture_item_id`
    ),
    itemKind: isNonEmptyString(entry.item_kind || entry.itemKind)
      ? String(entry.item_kind || entry.itemKind).trim().toLowerCase()
      : "directive",
    summary: requireNonEmptyString(
      entry.summary || entry.normalized_summary,
      `extracted_items[${index}].summary`
    ),
    lineage: isPlainObject(entry.lineage) ? { ...entry.lineage } : {},
  };
}

function normalizeGovernanceItems(governanceState) {
  if (Array.isArray(governanceState)) {
    return governanceState.map(normalizeGovernanceItem);
  }

  if (isPlainObject(governanceState) && Array.isArray(governanceState.entities)) {
    return governanceState.entities.map(normalizeGovernanceItem);
  }

  throw new TypeError(
    "governanceState must be a plain object with an entities array or an entities array."
  );
}

function normalizeGovernanceItem(entry, index) {
  if (!isPlainObject(entry)) {
    throw new TypeError(`governanceState.entities[${index}] must be a plain object.`);
  }

  return {
    entityType: requireNonEmptyString(
      entry.entityType,
      `governanceState.entities[${index}].entityType`
    ),
    entityId: requireNonEmptyString(
      entry.entityId,
      `governanceState.entities[${index}].entityId`
    ),
    status: isNonEmptyString(entry.status) ? entry.status.trim() : null,
  };
}

function buildClauses(extractionItem) {
  const clauses = [];
  const summary = extractionItem.summary.trim();
  const firstPass = summary
    .replace(/[.;]+/g, " ")
    .split(/\b(?:and|after|until|then)\b/gi)
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const chunk of firstPass.length > 0 ? firstPass : [summary]) {
    if (/^condition\b/i.test(chunk) && /\bon\b/i.test(chunk)) {
      const pieces = chunk
        .split(/\bon\b/i)
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (pieces.length > 1) {
        clauses.push(...pieces);
        continue;
      }
    }

    clauses.push(chunk);
  }

  return clauses.map((clauseText, index) => {
    const normalizedText = normalizePhrase(clauseText);
    const tokens = uniq(tokenize(clauseText));
    return {
      clauseIndex: index,
      clauseText: clauseText.trim(),
      normalizedText,
      tokens,
    };
  });
}

function extractExplicitRefs(text) {
  return uniq(String(text).match(/[a-z_]+:[a-z0-9-]+/gi) || []);
}

function extractExplicitCorridorRefs(text) {
  return uniq(String(text).match(/corridor-fw-[a-z0-9-]+/gi) || []);
}

function collectAliasHits(normalizedText, aliasRecord, expectedTargets) {
  const hits = [];
  for (const [alias, targets] of Object.entries(aliasRecord)) {
    if (
      normalizePhrase(alias) &&
      normalizedText.includes(normalizePhrase(alias)) &&
      targets.some((target) => expectedTargets.includes(target))
    ) {
      hits.push(alias);
    }
  }

  return hits.sort();
}

function buildCorridorAlignment({
  clauseText,
  normalizedText,
  corridorId,
  aliasTables,
}) {
  const explicitRefs = extractExplicitCorridorRefs(clauseText);
  const aliasHits = collectAliasHits(normalizedText, aliasTables.corridors, [
    corridorId,
  ]);
  const outOfScopeRefs = explicitRefs.filter((ref) => ref !== corridorId);
  const hasExplicitMatch = explicitRefs.includes(corridorId);
  const aliasMatched = aliasHits.length > 0;

  return {
    extractionCorridorRefs: explicitRefs,
    matchedCorridorId:
      hasExplicitMatch || aliasMatched || explicitRefs.length === 0
        ? corridorId
        : null,
    expectedCorridorId: corridorId,
    aliasMatched,
    aliasHits,
    matched: hasExplicitMatch || aliasMatched || explicitRefs.length === 0,
    outOfScope: outOfScopeRefs.length > 0,
    outOfScopeRefs,
  };
}

function extractActionSignals(clauseText) {
  const matches = ACTION_SIGNAL_PATTERNS.map((entry, index) => {
    const match = clauseText.match(entry.regex);
    return match
      ? {
          ...entry,
          matchIndex: typeof match.index === "number" ? match.index : Number.MAX_SAFE_INTEGER,
          patternIndex: index,
        }
      : null;
  })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.matchIndex !== right.matchIndex) {
        return left.matchIndex - right.matchIndex;
      }

      return left.patternIndex - right.patternIndex;
    });

  if (matches.length === 0) {
    return {
      verbs: [],
      primaryVerb: null,
      requestedMatchType: null,
    };
  }

  return {
    verbs: matches.map((entry) => entry.verb),
    primaryVerb: matches[0].verb,
    requestedMatchType: matches[0].matchType,
  };
}

function inferEntityTypeFromClause(clause, governanceItems, aliasTables) {
  const types = uniq(governanceItems.map((entry) => entry.entityType));
  const ranked = types
    .map((entityType) => {
      const typeTokens = tokenize(entityType);
      const aliasHits = collectAliasHits(
        clause.normalizedText,
        aliasTables.entityTypes,
        [entityType]
      );
      const tokenHits = typeTokens.filter((token) => clause.tokens.includes(token));
      return {
        entityType,
        score: tokenHits.length * 10 + aliasHits.length * 15,
        tokenHits,
        aliasHits,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.entityType.localeCompare(right.entityType);
    });

  return ranked[0] || null;
}

function buildCandidateTokens(candidate) {
  return uniq(
    tokenize(`${candidate.entityType} ${candidate.entityId} ${candidate.status || ""}`)
  );
}

function buildSpecificCandidateTokens(candidate) {
  const entityTypeTokens = new Set(tokenize(candidate.entityType));
  return buildCandidateTokens(candidate).filter(
    (token) =>
      !entityTypeTokens.has(token) &&
      !ENTITY_TYPE_GENERIC_TOKENS.has(token) &&
      !GENERIC_STATUS_TOKENS.has(token)
  );
}

function intersect(left, right) {
  const rightSet = new Set(right);
  return left.filter((entry) => rightSet.has(entry));
}

function getActionScore(primaryVerb, entityType) {
  if (!primaryVerb || !ACTION_ENTITY_SCORES[primaryVerb]) {
    return 0;
  }

  return ACTION_ENTITY_SCORES[primaryVerb][entityType] || 0;
}

function hasCreationHint(clauseText) {
  return (
    /\bcarry forward\b/i.test(clauseText) ||
    /\bsigned\b/i.test(clauseText) ||
    /\bcorrected\b/i.test(clauseText) ||
    /\bnew\b/i.test(clauseText) ||
    /\bpost-repair\b/i.test(clauseText) ||
    /\brestoration\b/i.test(clauseText) ||
    /\bmonitoring\b/i.test(clauseText)
  );
}

function evaluateCandidate({
  clause,
  extractionItem,
  candidate,
  corridorId,
  aliasTables,
}) {
  const explicitEntityRefs = extractExplicitRefs(clause.clauseText);
  const candidateTokens = buildCandidateTokens(candidate);
  const specificCandidateTokens = buildSpecificCandidateTokens(candidate);
  const overlapTokens = intersect(clause.tokens, candidateTokens);
  const specificOverlapTokens = intersect(clause.tokens, specificCandidateTokens);
  const typeTokens = tokenize(candidate.entityType);
  const typeOverlapTokens = intersect(clause.tokens, typeTokens);
  const explicitRefMatched = explicitEntityRefs.includes(candidate.entityId);
  const entityAliasHits = collectAliasHits(
    clause.normalizedText,
    aliasTables.entities,
    [candidate.entityId]
  );
  const entityTypeAliasHits = collectAliasHits(
    clause.normalizedText,
    aliasTables.entityTypes,
    [candidate.entityType]
  );
  const corridorAlignment = buildCorridorAlignment({
    clauseText: clause.clauseText,
    normalizedText: clause.normalizedText,
    corridorId,
    aliasTables,
  });

  const entityTypeScore =
    explicitRefMatched ||
    typeOverlapTokens.length > 0 ||
    entityTypeAliasHits.length > 0
      ? 20
      : 0;
  const aliasScore = entityAliasHits.length > 0 ? 15 : 0;
  const actionScore = getActionScore(
    clause.actionSignals.primaryVerb,
    candidate.entityType
  );
  const tokenRatio =
    overlapTokens.length /
    Math.max(1, uniq([...clause.tokens, ...candidateTokens]).length);
  const tokenScore = Math.round(tokenRatio * 40);
  const corridorScore = corridorAlignment.outOfScope
    ? 0
    : corridorAlignment.extractionCorridorRefs.length > 0 ||
        corridorAlignment.aliasMatched
      ? 10
      : 5;
  const holdBonus =
    extractionItem.itemKind === "hold" &&
    (clause.actionSignals.requestedMatchType === "DEFERRAL" ||
      clause.actionSignals.requestedMatchType === "CONDITION")
      ? 4
      : 0;

  const totalScore =
    (explicitRefMatched ? 100 : 0) +
    entityTypeScore +
    aliasScore +
    actionScore +
    tokenScore +
    corridorScore +
    holdBonus;

  return {
    candidate,
    totalScore,
    specificOverlapTokens,
    explicitRefMatched,
    actionScore,
    evidence: {
      entityTypeAlignment: {
        requestedEntityType:
          inferEntityTypeFromClause(
            clause,
            [candidate],
            aliasTables
          )?.entityType || null,
        candidateEntityType: candidate.entityType,
        matched: explicitRefMatched || typeOverlapTokens.length > 0 || entityTypeAliasHits.length > 0,
        matchedTokens: uniq([...typeOverlapTokens, ...entityTypeAliasHits]).sort(),
        score: entityTypeScore,
      },
      corridorAlignment,
      actionAlignment: {
        verbs: [...clause.actionSignals.verbs],
        primaryVerb: clause.actionSignals.primaryVerb,
        matched: actionScore > 0,
        score: actionScore,
      },
      explicitReferenceAlignment: {
        extractionEntityRefs: explicitEntityRefs,
        matchedEntityId: explicitRefMatched ? candidate.entityId : null,
        matched: explicitRefMatched,
      },
      tokenOverlap: {
        extractionTokens: [...clause.tokens],
        candidateTokens,
        overlapTokens: overlapTokens.sort(),
        ratio: Number(tokenRatio.toFixed(3)),
      },
      aliasAlignment: {
        matched: entityAliasHits.length > 0,
        aliasHits: entityAliasHits,
        candidateAliases: entityAliasHits,
      },
    },
  };
}

function inferConfidenceTier(score, explicitRefMatched, config) {
  if (explicitRefMatched) {
    return "EXACT";
  }

  if (score >= config.strongScore) {
    return "STRONG";
  }

  if (score >= config.weakScore) {
    return "WEAK";
  }

  return "UNMATCHED";
}

function inferTargetStatus(matchType, primaryVerb, entityType) {
  if (matchType === "UNMATCHED") {
    return null;
  }

  if (matchType === "PROPOSED_CREATION") {
    if (entityType === "obligation") {
      return "ACTIVE";
    }

    if (entityType === "authority_grant") {
      return "ACTIVE";
    }

    return "PROPOSED";
  }

  switch (primaryVerb) {
    case "defer":
      return "DEFERRED";
    case "condition":
      return "CONDITIONED";
    case "hard_stop":
      return "BLOCKED";
    case "revoke":
      return "REVOKED";
    case "schedule":
      return "SCHEDULED";
    case "carry_forward":
      return "ACTIVE";
    case "keep":
      return "ACTIVE";
    case "issue":
      return "ISSUED";
    case "approve":
      return "APPROVED";
    case "resolve":
      return "RESOLVED";
    case "repair":
      return entityType === "utility_asset" ? "REPAIRED" : "COMPLETED";
    case "complete":
      return entityType === "utility_asset" ? "REPAIRED" : "COMPLETED";
    case "pass":
      return "PASSED";
    case "escalate":
      return "ESCALATED";
    default:
      return null;
  }
}

function buildEvidenceRefs({ extractionItem, targetEntityId }) {
  const refs = [
    { kind: "capture_item_id", ref: extractionItem.captureItemId },
  ];

  if (isNonEmptyString(extractionItem.lineage.segment_id)) {
    refs.push({ kind: "segment_id", ref: extractionItem.lineage.segment_id });
  }

  if (isNonEmptyString(extractionItem.lineage.transcript_hash)) {
    refs.push({
      kind: "transcript_hash",
      ref: extractionItem.lineage.transcript_hash,
    });
  }

  if (isNonEmptyString(targetEntityId)) {
    refs.push({ kind: "governance_entity_id", ref: targetEntityId });
  }

  return refs;
}

function buildSourceExtraction(extractionItem, clause) {
  return {
    captureItemId: extractionItem.captureItemId,
    itemKind: extractionItem.itemKind,
    summary: extractionItem.summary,
    clauseIndex: clause.clauseIndex,
    clauseText: clause.clauseText,
    lineage: { ...extractionItem.lineage },
  };
}

function buildMatchId({
  scenarioId,
  corridorId,
  extractionItem,
  clause,
  matchType,
  targetKey,
}) {
  return [
    scenarioId,
    corridorId,
    extractionItem.captureItemId,
    `clause-${clause.clauseIndex}`,
    matchType,
    targetKey || "no-target",
  ].join("::");
}

function buildUnmatchedResult({
  scenarioId,
  corridorId,
  extractionItem,
  clause,
  reasonCode,
  confidenceTier,
  competingCandidates = [],
  corridorAlignment,
}) {
  const holds = [{ code: reasonCode }];
  const targetGovernanceItem =
    competingCandidates.length === 1
      ? {
          entityType: competingCandidates[0].candidate.entityType,
          entityId: competingCandidates[0].candidate.entityId,
          status: competingCandidates[0].candidate.status,
          targetMode: "COMPETING_CANDIDATE",
        }
      : null;

  return {
    contractVersion: MATCH_RESULT_CONTRACT_VERSION,
    matchId: buildMatchId({
      scenarioId,
      corridorId,
      extractionItem,
      clause,
      matchType: "UNMATCHED",
      targetKey:
        targetGovernanceItem && targetGovernanceItem.entityId
          ? targetGovernanceItem.entityId
          : reasonCode,
    }),
    scenarioId,
    corridorId,
    matchType: "UNMATCHED",
    confidenceTier,
    confidenceEvidence: {
      entityTypeAlignment: {
        requestedEntityType: null,
        candidateEntityType: targetGovernanceItem?.entityType || null,
        matched: false,
        matchedTokens: [],
        score: 0,
      },
      corridorAlignment: corridorAlignment || {
        extractionCorridorRefs: [],
        matchedCorridorId: corridorId,
        expectedCorridorId: corridorId,
        aliasMatched: false,
        aliasHits: [],
        matched: true,
        outOfScope: false,
        outOfScopeRefs: [],
      },
      actionAlignment: {
        verbs: [...clause.actionSignals.verbs],
        primaryVerb: clause.actionSignals.primaryVerb,
        matched: false,
        score: 0,
      },
      explicitReferenceAlignment: {
        extractionEntityRefs: extractExplicitRefs(clause.clauseText),
        matchedEntityId: null,
        matched: false,
      },
      tokenOverlap: {
        extractionTokens: [...clause.tokens],
        candidateTokens:
          targetGovernanceItem && targetGovernanceItem.entityId
            ? buildCandidateTokens(targetGovernanceItem)
            : [],
        overlapTokens: [],
        ratio: 0,
      },
      aliasAlignment: {
        matched: false,
        aliasHits: [],
        candidateAliases: [],
      },
    },
    sourceExtraction: buildSourceExtraction(extractionItem, clause),
    targetGovernanceItem,
    proposedAction: {
      verb: clause.actionSignals.primaryVerb,
      actionFamily: "UNMATCHED",
      reasonCode,
    },
    proposedStateTransition: {
      fromStatus: targetGovernanceItem?.status || null,
      toStatus: null,
      transitionBasis: "unsupported_or_ambiguous_evidence",
    },
    holds,
    evidenceRefs: buildEvidenceRefs({
      extractionItem,
      targetEntityId: targetGovernanceItem?.entityId || null,
    }),
  };
}

function buildProposedCreationResult({
  scenarioId,
  corridorId,
  extractionItem,
  clause,
  inferredEntityType,
  corridorAlignment,
  confidenceTier,
}) {
  const targetGovernanceItem = {
    entityType: inferredEntityType,
    entityId: null,
    status: null,
    targetMode: "PROPOSED_CREATION",
  };

  return {
    contractVersion: MATCH_RESULT_CONTRACT_VERSION,
    matchId: buildMatchId({
      scenarioId,
      corridorId,
      extractionItem,
      clause,
      matchType: "PROPOSED_CREATION",
      targetKey: inferredEntityType,
    }),
    scenarioId,
    corridorId,
    matchType: "PROPOSED_CREATION",
    confidenceTier,
    confidenceEvidence: {
      entityTypeAlignment: {
        requestedEntityType: inferredEntityType,
        candidateEntityType: inferredEntityType,
        matched: true,
        matchedTokens: intersect(clause.tokens, tokenize(inferredEntityType)).sort(),
        score: 20,
      },
      corridorAlignment,
      actionAlignment: {
        verbs: [...clause.actionSignals.verbs],
        primaryVerb: clause.actionSignals.primaryVerb,
        matched: true,
        score: getActionScore(clause.actionSignals.primaryVerb, inferredEntityType),
      },
      explicitReferenceAlignment: {
        extractionEntityRefs: extractExplicitRefs(clause.clauseText),
        matchedEntityId: null,
        matched: false,
      },
      tokenOverlap: {
        extractionTokens: [...clause.tokens],
        candidateTokens: tokenize(inferredEntityType),
        overlapTokens: intersect(clause.tokens, tokenize(inferredEntityType)).sort(),
        ratio: Number(
          (
            intersect(clause.tokens, tokenize(inferredEntityType)).length /
            Math.max(1, uniq([...clause.tokens, ...tokenize(inferredEntityType)]).length)
          ).toFixed(3)
        ),
      },
      aliasAlignment: {
        matched: false,
        aliasHits: [],
        candidateAliases: [],
      },
    },
    sourceExtraction: buildSourceExtraction(extractionItem, clause),
    targetGovernanceItem,
    proposedAction: {
      verb: clause.actionSignals.primaryVerb,
      actionFamily: "PROPOSED_CREATION",
      reasonCode: "EXPLICIT_FUTURE_ITEM_SIGNAL",
    },
    proposedStateTransition: {
      fromStatus: null,
      toStatus: inferTargetStatus(
        "PROPOSED_CREATION",
        clause.actionSignals.primaryVerb,
        inferredEntityType
      ),
      transitionBasis: "deterministic_creation_inference",
    },
    holds: [],
    evidenceRefs: buildEvidenceRefs({
      extractionItem,
      targetEntityId: null,
    }),
  };
}

function buildMatchedResult({
  scenarioId,
  corridorId,
  extractionItem,
  clause,
  candidateEvaluation,
  matchType,
  confidenceTier,
}) {
  const { candidate, evidence } = candidateEvaluation;

  return {
    contractVersion: MATCH_RESULT_CONTRACT_VERSION,
    matchId: buildMatchId({
      scenarioId,
      corridorId,
      extractionItem,
      clause,
      matchType,
      targetKey: candidate.entityId,
    }),
    scenarioId,
    corridorId,
    matchType,
    confidenceTier,
    confidenceEvidence: evidence,
    sourceExtraction: buildSourceExtraction(extractionItem, clause),
    targetGovernanceItem: {
      entityType: candidate.entityType,
      entityId: candidate.entityId,
      status: candidate.status,
      targetMode: "EXISTING_GOVERNANCE_ITEM",
    },
    proposedAction: {
      verb: clause.actionSignals.primaryVerb,
      actionFamily: matchType,
      reasonCode: "EXPLICIT_ALIGNMENT_SUPPORTED",
    },
    proposedStateTransition: {
      fromStatus: candidate.status,
      toStatus: inferTargetStatus(
        matchType,
        clause.actionSignals.primaryVerb,
        candidate.entityType
      ),
      transitionBasis: "deterministic_local_alignment",
    },
    holds: [],
    evidenceRefs: buildEvidenceRefs({
      extractionItem,
      targetEntityId: candidate.entityId,
    }),
  };
}

function resolveClause({
  scenarioId,
  corridorId,
  extractionItem,
  clause,
  governanceItems,
  aliasTables,
  config,
}) {
  const corridorAlignment = buildCorridorAlignment({
    clauseText: clause.clauseText,
    normalizedText: clause.normalizedText,
    corridorId,
    aliasTables,
  });

  clause.actionSignals = extractActionSignals(clause.clauseText);

  if (corridorAlignment.outOfScope) {
    return buildUnmatchedResult({
      scenarioId,
      corridorId,
      extractionItem,
      clause,
      reasonCode: "OUT_OF_SCOPE_CORRIDOR",
      confidenceTier: "UNMATCHED",
      corridorAlignment,
    });
  }

  const candidateEvaluations = governanceItems
    .map((candidate) =>
      evaluateCandidate({
        clause,
        extractionItem,
        candidate,
        corridorId,
        aliasTables,
      })
    )
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (left.candidate.entityType !== right.candidate.entityType) {
        return left.candidate.entityType.localeCompare(right.candidate.entityType);
      }

      return left.candidate.entityId.localeCompare(right.candidate.entityId);
    });

  const topCandidate = candidateEvaluations[0] || null;
  const competingCandidates = topCandidate
    ? candidateEvaluations.filter(
        (entry) =>
          entry.totalScore >= config.weakScore &&
          Math.abs(entry.totalScore - topCandidate.totalScore) <= config.ambiguousDelta
      )
    : [];

  if (competingCandidates.length > 1 && !competingCandidates.some((entry) => entry.explicitRefMatched)) {
    return buildUnmatchedResult({
      scenarioId,
      corridorId,
      extractionItem,
      clause,
      reasonCode: "AMBIGUOUS_CANDIDATES",
      confidenceTier: "AMBIGUOUS",
      competingCandidates,
      corridorAlignment,
    });
  }

  const inferredEntityType = inferEntityTypeFromClause(
    clause,
    governanceItems,
    aliasTables
  )?.entityType;
  const creationHint = hasCreationHint(clause.clauseText);
  if (
    inferredEntityType &&
    creationHint &&
    (!topCandidate ||
      topCandidate.totalScore < config.weakScore ||
      topCandidate.specificOverlapTokens.length === 0)
  ) {
    const creationConfidence =
      clause.actionSignals.primaryVerb || creationHint ? "STRONG" : "WEAK";
    return buildProposedCreationResult({
      scenarioId,
      corridorId,
      extractionItem,
      clause,
      inferredEntityType,
      corridorAlignment,
      confidenceTier: creationConfidence,
    });
  }

  if (!topCandidate || topCandidate.totalScore < config.weakScore) {
    return buildUnmatchedResult({
      scenarioId,
      corridorId,
      extractionItem,
      clause,
      reasonCode: "NO_SUPPORTED_CANDIDATE",
      confidenceTier: "UNMATCHED",
      corridorAlignment,
    });
  }

  const requestedMatchType = clause.actionSignals.requestedMatchType
    ? clause.actionSignals.requestedMatchType
    : extractionItem.itemKind === "hold"
      ? "CONDITION"
      : "RESOLUTION";

  const confidenceTier = inferConfidenceTier(
    topCandidate.totalScore,
    topCandidate.explicitRefMatched,
    config
  );

  return buildMatchedResult({
    scenarioId,
    corridorId,
    extractionItem,
    clause,
    candidateEvaluation: topCandidate,
    matchType: requestedMatchType,
    confidenceTier,
  });
}

function isOpenGovernanceItem(item, openStatuses) {
  return isNonEmptyString(item.status) && openStatuses.includes(item.status);
}

function buildUnmatchedGovernanceItems({
  scenarioId,
  corridorId,
  governanceItems,
  addressedEntityIds,
  openStatuses,
}) {
  return governanceItems
    .filter((item) => isOpenGovernanceItem(item, openStatuses))
    .filter((item) => !addressedEntityIds.has(item.entityId))
    .map((item) => ({
      scenarioId,
      corridorId,
      entityType: item.entityType,
      entityId: item.entityId,
      status: item.status,
      reasonCode: "OPEN_GOVERNANCE_ITEM_NOT_ADDRESSED",
      evidenceRefs: [{ kind: "governance_entity_id", ref: item.entityId }],
    }));
}

function buildSummary({
  extractionItems,
  matchResults,
  unmatchedExtractions,
  unmatchedGovernanceItems,
}) {
  const byMatchType = Object.fromEntries(MATCH_TYPES.map((entry) => [entry, 0]));
  const byConfidenceTier = Object.fromEntries(
    CONFIDENCE_TIERS.map((entry) => [entry, 0])
  );

  for (const result of matchResults) {
    byMatchType[result.matchType] += 1;
    byConfidenceTier[result.confidenceTier] += 1;
  }

  return {
    extractionCount: extractionItems.length,
    matchResultCount: matchResults.length,
    unmatchedExtractionCount: unmatchedExtractions.length,
    unmatchedGovernanceItemCount: unmatchedGovernanceItems.length,
    byMatchType,
    byConfidenceTier,
  };
}

function runDeterministicMatching(input) {
  if (!isPlainObject(input)) {
    throw new TypeError("runDeterministicMatching input must be a plain object.");
  }

  const scenarioId = requireNonEmptyString(input.scenarioId, "scenarioId");
  const corridorId = requireNonEmptyString(input.corridorId, "corridorId");
  const extractionItems = extractItems(input.extractionOutput);
  const governanceItems = normalizeGovernanceItems(input.governanceState);
  const aliasTables = normalizeAliasTables(input.aliasTables);
  const config = normalizeConfig(input.config);

  const matchResults = [];
  const unmatchedExtractions = [];
  const addressedEntityIds = new Set();

  for (const extractionItem of extractionItems) {
    const clauses = buildClauses(extractionItem);
    for (const clause of clauses) {
      const result = resolveClause({
        scenarioId,
        corridorId,
        extractionItem,
        clause,
        governanceItems,
        aliasTables,
        config,
      });

      matchResults.push(result);

      if (
        result.matchType !== "UNMATCHED" &&
        result.targetGovernanceItem &&
        isNonEmptyString(result.targetGovernanceItem.entityId)
      ) {
        addressedEntityIds.add(result.targetGovernanceItem.entityId);
      }

      if (result.matchType === "UNMATCHED") {
        unmatchedExtractions.push({
          captureItemId: result.sourceExtraction.captureItemId,
          clauseIndex: result.sourceExtraction.clauseIndex,
          clauseText: result.sourceExtraction.clauseText,
          confidenceTier: result.confidenceTier,
          holds: [...result.holds],
          evidenceRefs: [...result.evidenceRefs],
        });
      }
    }
  }

  const unmatchedGovernanceItems = buildUnmatchedGovernanceItems({
    scenarioId,
    corridorId,
    governanceItems,
    addressedEntityIds,
    openStatuses: config.openStatuses,
  });

  return {
    scenarioId,
    corridorId,
    matchResults,
    unmatchedExtractions,
    unmatchedGovernanceItems,
    matchSummary: buildSummary({
      extractionItems,
      matchResults,
      unmatchedExtractions,
      unmatchedGovernanceItems,
    }),
  };
}

module.exports = {
  runDeterministicMatching,
};
