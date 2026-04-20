const crypto = require("node:crypto");

const CIVIC_SKIN_INPUT_SCHEMA_VERSION = "wave7.civicSkinInput.v1";
const CIVIC_TRUTH_FINGERPRINT_SCHEMA_VERSION = "wave7.civicTruthFingerprint.v1";

const CIVIC_SKIN_VIEW_TYPES = Object.freeze([
  "governance-decision",
  "authority-evaluation",
  "revocation-status",
  "promise-status",
  "sweep-result",
]);

const CIVIC_SKIN_SOURCE_KINDS = Object.freeze([
  "runtime-evaluation",
  "governance-sweep",
  "fixture",
]);

const CIVIC_SKIN_AUDIENCES = Object.freeze(["internal", "public"]);

const CIVIC_SOURCE_REF_KINDS = Object.freeze([
  "runtimeSubset.civic",
  "governanceSweep",
  "authorityContext",
  "revocationProjection",
  "fixture",
  "rawInput",
]);

const CIVIC_CLAIM_KINDS = Object.freeze([
  "presented-source-truth",
  "label-translation",
  "derived-runtime-truth",
  "absence-notice",
]);

const CIVIC_ABSENCE_REASONS = Object.freeze([
  "SOURCE_FIELD_ABSENT",
  "UNSUPPORTED_VIEW",
  "NOT_IN_CURRENT_INPUT",
  "PUBLIC_DISCLOSURE_HOLD",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => deepClone(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const clone = {};
  for (const [key, entry] of Object.entries(value)) {
    clone[key] = deepClone(entry);
  }

  return clone;
}

function toUniqueSortedStrings(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter(isNonEmptyString))].sort();
}

function normalizePromiseStatus(value) {
  if (!isPlainObject(value)) {
    return {
      conditions_total: null,
      conditions_satisfied: null,
      oldest_open_condition_at: null,
    };
  }

  return {
    conditions_total:
      Number.isInteger(value.conditions_total) && value.conditions_total >= 0
        ? value.conditions_total
        : null,
    conditions_satisfied:
      Number.isInteger(value.conditions_satisfied) && value.conditions_satisfied >= 0
        ? value.conditions_satisfied
        : null,
    oldest_open_condition_at: isNonEmptyString(value.oldest_open_condition_at)
      ? value.oldest_open_condition_at
      : null,
  };
}

function normalizeConfidence(value) {
  if (!isPlainObject(value)) {
    return {
      tier: null,
      rationale: null,
    };
  }

  return {
    tier: isNonEmptyString(value.tier) ? value.tier : null,
    rationale: isNonEmptyString(value.rationale) ? value.rationale : null,
  };
}

function normalizeOmissionSummary(value) {
  if (!isPlainObject(value)) {
    return {
      activeOmissionPackIds: [],
      findingCount: 0,
    };
  }

  return {
    activeOmissionPackIds: toUniqueSortedStrings(value.activeOmissionPackIds),
    findingCount: Number.isInteger(value.findingCount) && value.findingCount >= 0
      ? value.findingCount
      : 0,
  };
}

function normalizeStandingRiskSummary(value) {
  if (!isPlainObject(value)) {
    return {
      blockingItemCount: 0,
      blockingEntryIds: [],
    };
  }

  return {
    blockingItemCount:
      Number.isInteger(value.blockingItemCount) && value.blockingItemCount >= 0
        ? value.blockingItemCount
        : 0,
    blockingEntryIds: toUniqueSortedStrings(value.blockingEntryIds),
  };
}

function normalizeAuthorityResolution(value) {
  if (!isPlainObject(value)) {
    return {
      decision: null,
      reason: null,
      conditions_total: null,
      conditions_satisfied: null,
      domainDecision: null,
      actorDecision: null,
      domainId: null,
    };
  }

  return {
    decision: isNonEmptyString(value.decision) ? value.decision : null,
    reason: isNonEmptyString(value.reason) ? value.reason : null,
    conditions_total:
      Number.isInteger(value.conditions_total) && value.conditions_total >= 0
        ? value.conditions_total
        : null,
    conditions_satisfied:
      Number.isInteger(value.conditions_satisfied) && value.conditions_satisfied >= 0
        ? value.conditions_satisfied
        : null,
    domainDecision: isNonEmptyString(value.domain?.decision)
      ? value.domain.decision
      : null,
    actorDecision: isNonEmptyString(value.actor?.decision)
      ? value.actor.decision
      : null,
    domainId: isNonEmptyString(value.domain?.domain_id)
      ? value.domain.domain_id
      : null,
  };
}

function normalizeRevocation(value) {
  if (!isPlainObject(value)) {
    return {
      active: false,
      decision: null,
      reason: null,
      rationale: null,
      provenance_status: null,
      provenance_reason: null,
    };
  }

  return {
    active: value.active === true,
    decision: isNonEmptyString(value.decision) ? value.decision : null,
    reason: isNonEmptyString(value.reason) ? value.reason : null,
    rationale: isNonEmptyString(value.rationale) ? value.rationale : null,
    provenance_status: isNonEmptyString(value.provenance_status)
      ? value.provenance_status
      : null,
    provenance_reason: isNonEmptyString(value.provenance_reason)
      ? value.provenance_reason
      : null,
  };
}

function normalizeEvaluationToCivicProjection(source) {
  const runtimeSubset = isPlainObject(source.runtimeSubset) ? source.runtimeSubset : {};
  const civicProjection = isPlainObject(runtimeSubset.civic) ? runtimeSubset.civic : {};
  const standingRisk = isPlainObject(runtimeSubset.standingRisk)
    ? runtimeSubset.standingRisk
    : {};
  const omissions = isPlainObject(runtimeSubset.omissions) ? runtimeSubset.omissions : {};
  const blockingItems = Array.isArray(standingRisk.blockingItems)
    ? standingRisk.blockingItems
    : [];

  return {
    decision: isNonEmptyString(source.decision) ? source.decision : null,
    reason: isNonEmptyString(source.reason) ? source.reason : null,
    rationale: isNonEmptyString(civicProjection.rationale?.decision)
      ? civicProjection.rationale.decision
      : null,
    promise_status: isPlainObject(civicProjection.promise_status)
      ? deepClone(civicProjection.promise_status)
      : null,
    confidence: isPlainObject(civicProjection.confidence)
      ? deepClone(civicProjection.confidence)
      : null,
    authority_resolution: isPlainObject(civicProjection.authority_resolution)
      ? deepClone(civicProjection.authority_resolution)
      : null,
    revocation: isPlainObject(civicProjection.revocation)
      ? deepClone(civicProjection.revocation)
      : null,
    omission_summary: {
      activeOmissionPackIds: Array.isArray(omissions.activeOmissionPackIds)
        ? [...omissions.activeOmissionPackIds]
        : [],
      findingCount: Array.isArray(omissions.findings) ? omissions.findings.length : 0,
    },
    standing_risk_summary: {
      blockingItemCount: blockingItems.length,
      blockingEntryIds: blockingItems
        .map((entry) => entry?.entryId)
        .filter(isNonEmptyString),
    },
  };
}

function normalizeSweepSummaryToCivicProjection(source) {
  return {
    decision: isNonEmptyString(source.decision) ? source.decision : null,
    reason: isNonEmptyString(source.reason) ? source.reason : null,
    rationale: isNonEmptyString(source.rationale) ? source.rationale : null,
    promise_status: isPlainObject(source.promiseStatus)
      ? deepClone(source.promiseStatus)
      : null,
    confidence: isNonEmptyString(source.confidenceTier)
      ? {
          tier: source.confidenceTier,
          rationale: null,
        }
      : null,
    authority_resolution: null,
    revocation: null,
    omission_summary: isPlainObject(source.omissionSummary)
      ? deepClone(source.omissionSummary)
      : null,
    standing_risk_summary: isPlainObject(source.standingRiskSummary)
      ? deepClone(source.standingRiskSummary)
      : null,
  };
}

function looksLikeCivicSkinInput(source) {
  return (
    isPlainObject(source) &&
    isNonEmptyString(source.viewType) &&
    isNonEmptyString(source.sourceKind) &&
    isNonEmptyString(source.sourceId) &&
    isPlainObject(source.civic) &&
    isPlainObject(source.raw)
  );
}

function looksLikeGovernanceEvaluation(source) {
  return (
    isPlainObject(source) &&
    isNonEmptyString(source.decision) &&
    Object.prototype.hasOwnProperty.call(source, "runtimeSubset")
  );
}

function looksLikeSweepSummary(source) {
  return (
    isPlainObject(source) &&
    isNonEmptyString(source.scenarioId) &&
    isNonEmptyString(source.decision) &&
    Object.prototype.hasOwnProperty.call(source, "promiseStatus")
  );
}

function normalizeMetadata(metadataInput = {}) {
  if (!isPlainObject(metadataInput)) {
    throw new TypeError("CivicSkinInput.metadata must be a plain object");
  }

  const metadata = {
    generatedAt: null,
    fixtureName: null,
    schemaVersion: CIVIC_SKIN_INPUT_SCHEMA_VERSION,
  };

  if (metadataInput.generatedAt !== undefined && metadataInput.generatedAt !== null) {
    if (!isNonEmptyString(metadataInput.generatedAt)) {
      throw new TypeError("CivicSkinInput.metadata.generatedAt must be a string or null");
    }

    metadata.generatedAt = metadataInput.generatedAt;
  }

  if (metadataInput.fixtureName !== undefined && metadataInput.fixtureName !== null) {
    if (!isNonEmptyString(metadataInput.fixtureName)) {
      throw new TypeError("CivicSkinInput.metadata.fixtureName must be a string or null");
    }

    metadata.fixtureName = metadataInput.fixtureName;
  }

  if (
    metadataInput.schemaVersion !== undefined &&
    metadataInput.schemaVersion !== CIVIC_SKIN_INPUT_SCHEMA_VERSION
  ) {
    throw new TypeError(
      `CivicSkinInput.metadata.schemaVersion must be ${CIVIC_SKIN_INPUT_SCHEMA_VERSION}`
    );
  }

  return metadata;
}

/**
 * @typedef {Object} CivicSkinInput
 * @property {"governance-decision"|"authority-evaluation"|"revocation-status"|"promise-status"|"sweep-result"} viewType
 * @property {"runtime-evaluation"|"governance-sweep"|"fixture"} sourceKind
 * @property {string} sourceId
 * @property {Object} civic
 * @property {Object} raw
 * @property {"internal"|"public"} audience
 * @property {{generatedAt: string|null, fixtureName: string|null, schemaVersion: "wave7.civicSkinInput.v1"}} metadata
 */
function normalizeCivicSkinInput(input) {
  if (!isPlainObject(input)) {
    throw new TypeError("CivicSkinInput must be a plain object");
  }

  if (!CIVIC_SKIN_VIEW_TYPES.includes(input.viewType)) {
    throw new TypeError(
      `CivicSkinInput.viewType must be one of: ${CIVIC_SKIN_VIEW_TYPES.join(", ")}`
    );
  }

  if (!CIVIC_SKIN_SOURCE_KINDS.includes(input.sourceKind)) {
    throw new TypeError(
      `CivicSkinInput.sourceKind must be one of: ${CIVIC_SKIN_SOURCE_KINDS.join(", ")}`
    );
  }

  if (!isNonEmptyString(input.sourceId)) {
    throw new TypeError("CivicSkinInput.sourceId must be a non-empty string");
  }

  if (!isPlainObject(input.civic)) {
    throw new TypeError("CivicSkinInput.civic must be a plain object");
  }

  if (!isPlainObject(input.raw)) {
    throw new TypeError("CivicSkinInput.raw must be a plain object");
  }

  const audience = input.audience || "internal";
  if (!CIVIC_SKIN_AUDIENCES.includes(audience)) {
    throw new TypeError(
      `CivicSkinInput.audience must be one of: ${CIVIC_SKIN_AUDIENCES.join(", ")}`
    );
  }

  const metadata = normalizeMetadata(isPlainObject(input.metadata) ? input.metadata : {});

  return {
    viewType: input.viewType,
    sourceKind: input.sourceKind,
    sourceId: input.sourceId,
    civic: deepClone(input.civic),
    raw: deepClone(input.raw),
    audience,
    metadata,
  };
}

function buildCivicSkinInput(source, options = {}) {
  if (looksLikeCivicSkinInput(source)) {
    const candidate = deepClone(source);

    if (isPlainObject(options.metadata)) {
      candidate.metadata = {
        ...(isPlainObject(candidate.metadata) ? candidate.metadata : {}),
        ...options.metadata,
      };
    }

    if (isNonEmptyString(options.audience)) {
      candidate.audience = options.audience;
    }

    return normalizeCivicSkinInput(candidate);
  }

  if (!isPlainObject(source)) {
    throw new TypeError("buildCivicSkinInput source must be a plain object");
  }

  const metadataCandidate = isPlainObject(options.metadata) ? options.metadata : {};
  const metadata = normalizeMetadata({
    ...metadataCandidate,
    generatedAt:
      metadataCandidate.generatedAt !== undefined
        ? metadataCandidate.generatedAt
        : source.evaluated_at || source.evaluatedAt || null,
    fixtureName:
      metadataCandidate.fixtureName !== undefined
        ? metadataCandidate.fixtureName
        : null,
  });

  if (looksLikeGovernanceEvaluation(source)) {
    const sourceId =
      options.sourceId ||
      source.sourceId ||
      source.entityId ||
      source.entity_id ||
      source.entity_ref?.entity_id ||
      source.raw_subject;

    return normalizeCivicSkinInput({
      viewType: options.viewType || "governance-decision",
      sourceKind: options.sourceKind || "runtime-evaluation",
      sourceId: isNonEmptyString(sourceId)
        ? sourceId
        : "runtime-evaluation-unknown-source",
      civic: normalizeEvaluationToCivicProjection(source),
      raw: isPlainObject(options.raw) ? options.raw : source,
      audience: options.audience || "internal",
      metadata,
    });
  }

  if (looksLikeSweepSummary(source)) {
    return normalizeCivicSkinInput({
      viewType: options.viewType || "sweep-result",
      sourceKind: options.sourceKind || "governance-sweep",
      sourceId: options.sourceId || source.scenarioId,
      civic: normalizeSweepSummaryToCivicProjection(source),
      raw: isPlainObject(options.raw) ? options.raw : source,
      audience: options.audience || "internal",
      metadata,
    });
  }

  if (
    isNonEmptyString(options.viewType) &&
    isNonEmptyString(options.sourceKind) &&
    isNonEmptyString(options.sourceId)
  ) {
    return normalizeCivicSkinInput({
      viewType: options.viewType,
      sourceKind: options.sourceKind,
      sourceId: options.sourceId,
      civic: isPlainObject(options.civic) ? options.civic : {},
      raw: isPlainObject(options.raw) ? options.raw : source,
      audience: options.audience || "internal",
      metadata,
    });
  }

  throw new TypeError(
    "buildCivicSkinInput source is unsupported; provide a runtime evaluation, a sweep summary, or explicit viewType/sourceKind/sourceId options"
  );
}

function toCanonicalValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => toCanonicalValue(entry));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const canonical = {};
  for (const key of Object.keys(value).sort()) {
    canonical[key] = toCanonicalValue(value[key]);
  }

  return canonical;
}

function hashCanonicalTruth(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(toCanonicalValue(value)))
    .digest("hex");
}

function buildCanonicalTruth(input) {
  const promiseStatus = normalizePromiseStatus(input.civic.promise_status);
  const confidence = normalizeConfidence(input.civic.confidence);
  const authorityResolution = normalizeAuthorityResolution(
    input.civic.authority_resolution
  );
  const revocation = normalizeRevocation(input.civic.revocation);
  const omissionSummary = normalizeOmissionSummary(input.civic.omission_summary);
  const standingRiskSummary = normalizeStandingRiskSummary(
    input.civic.standing_risk_summary
  );

  return {
    decision: isNonEmptyString(input.civic.decision) ? input.civic.decision : null,
    reason: isNonEmptyString(input.civic.reason) ? input.civic.reason : null,
    rationale: isNonEmptyString(input.civic.rationale) ? input.civic.rationale : null,
    confidenceTier: confidence.tier,
    promiseStatus,
    omissionSummary,
    standingRiskSummary,
    authorityResolution,
    revocation,
  };
}

function buildTruthFingerprint(source, options = {}) {
  const input = looksLikeCivicSkinInput(source)
    ? normalizeCivicSkinInput(source)
    : buildCivicSkinInput(source, options);
  const canonicalTruth = buildCanonicalTruth(input);

  return {
    schemaVersion: CIVIC_TRUTH_FINGERPRINT_SCHEMA_VERSION,
    decision: canonicalTruth.decision,
    confidenceTier: canonicalTruth.confidenceTier,
    canonicalTruth,
    digest: hashCanonicalTruth(canonicalTruth),
  };
}

function normalizeSourceRef(sourceRef) {
  if (!isPlainObject(sourceRef)) {
    throw new TypeError("SourceRef must be a plain object");
  }

  if (!isNonEmptyString(sourceRef.path)) {
    throw new TypeError("SourceRef.path must be a non-empty string");
  }

  if (!CIVIC_SOURCE_REF_KINDS.includes(sourceRef.sourceKind)) {
    throw new TypeError(
      `SourceRef.sourceKind must be one of: ${CIVIC_SOURCE_REF_KINDS.join(", ")}`
    );
  }

  if (typeof sourceRef.required !== "boolean") {
    throw new TypeError("SourceRef.required must be a boolean");
  }

  return {
    path: sourceRef.path,
    sourceKind: sourceRef.sourceKind,
    required: sourceRef.required,
  };
}

function normalizeSourceRefList(sourceRefs) {
  if (!Array.isArray(sourceRefs)) {
    return [];
  }

  const dedupe = new Map();
  for (const sourceRef of sourceRefs) {
    const normalized = normalizeSourceRef(sourceRef);
    const key = `${normalized.path}|${normalized.sourceKind}|${normalized.required}`;
    dedupe.set(key, normalized);
  }

  return [...dedupe.values()].sort((left, right) => {
    const leftKey = `${left.path}|${left.sourceKind}|${left.required}`;
    const rightKey = `${right.path}|${right.sourceKind}|${right.required}`;
    return leftKey.localeCompare(rightKey);
  });
}

function normalizeStringIdList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isNonEmptyString);
}

function normalizeClaim(claim) {
  if (!isPlainObject(claim)) {
    throw new TypeError("CivicSkinClaim must be a plain object");
  }

  if (!isNonEmptyString(claim.id)) {
    throw new TypeError("CivicSkinClaim.id must be a non-empty string");
  }

  if (!isNonEmptyString(claim.text)) {
    throw new TypeError("CivicSkinClaim.text must be a non-empty string");
  }

  if (!CIVIC_CLAIM_KINDS.includes(claim.claimKind)) {
    throw new TypeError(
      `CivicSkinClaim.claimKind must be one of: ${CIVIC_CLAIM_KINDS.join(", ")}`
    );
  }

  const allowedAudience = Array.isArray(claim.allowedAudience)
    ? claim.allowedAudience.filter((entry) => CIVIC_SKIN_AUDIENCES.includes(entry))
    : CIVIC_SKIN_AUDIENCES.includes(claim.allowedAudience)
      ? [claim.allowedAudience]
      : ["internal"];

  const confidenceTier = isNonEmptyString(claim.confidenceTier)
    ? claim.confidenceTier
    : null;

  return {
    id: claim.id,
    text: claim.text,
    claimKind: claim.claimKind,
    sourceRefs: normalizeSourceRefList(claim.sourceRefs),
    allowedAudience,
    confidenceTier,
  };
}

function normalizeAbsence(absence) {
  if (!isPlainObject(absence)) {
    throw new TypeError("CivicSkinAbsence must be a plain object");
  }

  if (!isNonEmptyString(absence.id)) {
    throw new TypeError("CivicSkinAbsence.id must be a non-empty string");
  }

  if (!isNonEmptyString(absence.path)) {
    throw new TypeError("CivicSkinAbsence.path must be a non-empty string");
  }

  if (!CIVIC_ABSENCE_REASONS.includes(absence.reason)) {
    throw new TypeError(
      `CivicSkinAbsence.reason must be one of: ${CIVIC_ABSENCE_REASONS.join(", ")}`
    );
  }

  if (!isNonEmptyString(absence.displayText)) {
    throw new TypeError("CivicSkinAbsence.displayText must be a non-empty string");
  }

  return {
    id: absence.id,
    path: absence.path,
    reason: absence.reason,
    displayText: absence.displayText,
    sourceRefs: normalizeSourceRefList(absence.sourceRefs),
  };
}

function normalizeSection(section) {
  if (!isPlainObject(section)) {
    throw new TypeError("CivicSkinSection must be a plain object");
  }

  if (!isNonEmptyString(section.id)) {
    throw new TypeError("CivicSkinSection.id must be a non-empty string");
  }

  if (!isNonEmptyString(section.title)) {
    throw new TypeError("CivicSkinSection.title must be a non-empty string");
  }

  if (
    !isNonEmptyString(section.body) &&
    !isPlainObject(section.body) &&
    !Array.isArray(section.body)
  ) {
    throw new TypeError("CivicSkinSection.body must be a string, object, or array");
  }

  return {
    id: section.id,
    title: section.title,
    body: deepClone(section.body),
    sourceRefs: normalizeSourceRefList(section.sourceRefs),
    claimIds: normalizeStringIdList(section.claimIds),
    absenceIds: normalizeStringIdList(section.absenceIds),
    disclosureNoticeIds: normalizeStringIdList(section.disclosureNoticeIds),
  };
}

function normalizeFallback(fallback) {
  if (!isPlainObject(fallback)) {
    return {
      active: false,
      code: null,
      message: null,
    };
  }

  if (typeof fallback.active !== "boolean") {
    throw new TypeError("CivicSkinRenderResult.fallback.active must be a boolean");
  }

  return {
    active: fallback.active,
    code: isNonEmptyString(fallback.code) ? fallback.code : null,
    message: isNonEmptyString(fallback.message) ? fallback.message : null,
  };
}

function normalizeRedactions(redactions) {
  if (!Array.isArray(redactions)) {
    return [];
  }

  return redactions.map((entry) => deepClone(entry));
}

function collectOutputSourceRefs(sections, claims, absences, sourceRefs) {
  const aggregate = [];
  aggregate.push(...(Array.isArray(sourceRefs) ? sourceRefs : []));
  for (const section of sections) {
    aggregate.push(...section.sourceRefs);
  }
  for (const claim of claims) {
    aggregate.push(...claim.sourceRefs);
  }
  for (const absence of absences) {
    aggregate.push(...absence.sourceRefs);
  }

  return normalizeSourceRefList(aggregate);
}

function validateSkinDescriptor(skinDescriptor) {
  if (!isPlainObject(skinDescriptor)) {
    throw new TypeError("skinDescriptor must be a plain object");
  }

  if (!isNonEmptyString(skinDescriptor.skinId)) {
    throw new TypeError("skinDescriptor.skinId must be a non-empty string");
  }

  if (typeof skinDescriptor.supports !== "function") {
    throw new TypeError("skinDescriptor.supports must be a function");
  }

  if (typeof skinDescriptor.render !== "function") {
    throw new TypeError("skinDescriptor.render must be a function");
  }

  return skinDescriptor;
}

function registerSkin(registry, skinDescriptor) {
  if (!(registry instanceof Map)) {
    throw new TypeError("registry must be a Map");
  }

  const descriptor = validateSkinDescriptor(skinDescriptor);
  registry.set(descriptor.skinId, descriptor);
  return registry;
}

function resolveSkin(registry, skinId) {
  if (!(registry instanceof Map)) {
    throw new TypeError("registry must be a Map");
  }

  if (!isNonEmptyString(skinId)) {
    throw new TypeError("skinId must be a non-empty string");
  }

  return registry.get(skinId) || null;
}

function renderFallbackResult(input, skinId, truthFingerprint, reason, code, message) {
  const absence = normalizeAbsence({
    id: `absence.${code.toLowerCase()}`,
    path: "viewType",
    reason,
    displayText: message,
    sourceRefs: [
      {
        path: "viewType",
        sourceKind: "rawInput",
        required: true,
      },
    ],
  });

  return {
    skinId,
    viewType: input.viewType,
    audience: input.audience,
    truthFingerprint,
    sections: [],
    claims: [],
    absences: [absence],
    redactions: [],
    fallback: {
      active: true,
      code,
      message,
    },
    sourceRefs: absence.sourceRefs,
  };
}

/**
 * @typedef {Object} CivicSkinRenderResult
 * @property {string} skinId
 * @property {string} viewType
 * @property {string} audience
 * @property {Object} truthFingerprint
 * @property {Array} sections
 * @property {Array} claims
 * @property {Array} absences
 * @property {Array} redactions
 * @property {Object} fallback
 * @property {Array} sourceRefs
 */
function renderSkin(source, skinDescriptor, options = {}) {
  const descriptor = validateSkinDescriptor(skinDescriptor);
  const input = looksLikeCivicSkinInput(source)
    ? normalizeCivicSkinInput(source)
    : buildCivicSkinInput(source, options);
  const truthFingerprint = buildTruthFingerprint(input);

  if (input.audience === "public") {
    return renderFallbackResult(
      input,
      descriptor.skinId,
      truthFingerprint,
      "PUBLIC_DISCLOSURE_HOLD",
      "PUBLIC_RENDERING_RESERVED",
      "Public audience rendering is reserved for a later packet."
    );
  }

  if (descriptor.supports(input) !== true) {
    return renderFallbackResult(
      input,
      descriptor.skinId,
      truthFingerprint,
      "UNSUPPORTED_VIEW",
      "UNSUPPORTED_VIEW_INTERNAL",
      `Skin ${descriptor.skinId} does not support this internal input/view combination.`
    );
  }

  const rendered = descriptor.render(input, {
    normalizeSourceRefList,
    normalizeClaim,
    normalizeAbsence,
    normalizeSection,
  });

  const sections = Array.isArray(rendered?.sections)
    ? rendered.sections.map((entry) => normalizeSection(entry))
    : [];
  const claims = Array.isArray(rendered?.claims)
    ? rendered.claims.map((entry) => normalizeClaim(entry))
    : [];
  const absences = Array.isArray(rendered?.absences)
    ? rendered.absences.map((entry) => normalizeAbsence(entry))
    : [];
  const redactions = normalizeRedactions(rendered?.redactions);
  const fallback = normalizeFallback(rendered?.fallback);
  const sourceRefs = collectOutputSourceRefs(
    sections,
    claims,
    absences,
    rendered?.sourceRefs
  );

  return {
    skinId: descriptor.skinId,
    viewType: input.viewType,
    audience: input.audience,
    truthFingerprint,
    sections,
    claims,
    absences,
    redactions,
    fallback,
    sourceRefs,
  };
}

module.exports = {
  CIVIC_ABSENCE_REASONS,
  CIVIC_CLAIM_KINDS,
  CIVIC_SKIN_AUDIENCES,
  CIVIC_SKIN_INPUT_SCHEMA_VERSION,
  CIVIC_SKIN_SOURCE_KINDS,
  CIVIC_SKIN_VIEW_TYPES,
  CIVIC_SOURCE_REF_KINDS,
  CIVIC_TRUTH_FINGERPRINT_SCHEMA_VERSION,
  buildCivicSkinInput,
  buildTruthFingerprint,
  normalizeCivicSkinInput,
  registerSkin,
  renderSkin,
  resolveSkin,
};
