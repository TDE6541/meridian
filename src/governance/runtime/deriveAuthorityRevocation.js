const { GOVERNANCE_DECISIONS } = require("./decisionVocabulary");

const AUTHORITY_PROVENANCE_DEPTH_CAP = 4;

const AUTHORITY_REVOCATION_REASONS = Object.freeze({
  REVOKED: "authority_revoked_mid_action",
  SUPERSEDED: "permit_superseded_by_overlap",
  CROSS_JURISDICTION: "cross_jurisdiction_resolved_against_requester",
  PHANTOM: "phantom_authority_detected",
  INVALID_PROVENANCE: "authority_provenance_invalid",
  DEPTH_EXCEEDED: "authority_provenance_depth_exceeded",
});

function hasOwnProperty(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isNullableNonEmptyString(value) {
  return value === null || value === undefined || isNonEmptyString(value);
}

function isStringArray(value) {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.trim() !== "")
  );
}

function parseIsoTimestamp(value) {
  if (!isNonEmptyString(value)) {
    return {
      valid: false,
      value: null,
    };
  }

  const timestamp = Date.parse(value);

  return {
    valid: Number.isFinite(timestamp),
    value: Number.isFinite(timestamp) ? timestamp : null,
  };
}

function hasUniqueStrings(values) {
  return new Set(values).size === values.length;
}

function normalizeAuthorityGrant(grant) {
  if (!isPlainObject(grant)) {
    return null;
  }

  if (
    hasOwnProperty(grant, "status") &&
    grant.status !== null &&
    grant.status !== undefined &&
    !isNonEmptyString(grant.status)
  ) {
    return null;
  }

  const nullableStringFields = [
    "expires_at",
    "revoked_at",
    "superseded_at",
    "granted_by_entity_id",
    "jurisdiction",
  ];

  for (const field of nullableStringFields) {
    if (hasOwnProperty(grant, field) && !isNullableNonEmptyString(grant[field])) {
      return null;
    }
  }

  if (
    hasOwnProperty(grant, "scope_of_authority") &&
    !isStringArray(grant.scope_of_authority)
  ) {
    return null;
  }

  if (
    hasOwnProperty(grant, "delegation_chain_ids") &&
    !isStringArray(grant.delegation_chain_ids)
  ) {
    return null;
  }

  if (
    hasOwnProperty(grant, "supersedes_grant_ids") &&
    !isStringArray(grant.supersedes_grant_ids)
  ) {
    return null;
  }

  return {
    status: grant.status || null,
    expiresAt: grant.expires_at || null,
    revokedAt: grant.revoked_at || null,
    supersededAt: grant.superseded_at || null,
    grantedByEntityId: grant.granted_by_entity_id || null,
    jurisdiction: grant.jurisdiction || null,
    scopeOfAuthority: Array.isArray(grant.scope_of_authority)
      ? [...grant.scope_of_authority]
      : [],
    delegationChainIds: Array.isArray(grant.delegation_chain_ids)
      ? [...grant.delegation_chain_ids]
      : [],
    supersedesGrantIds: Array.isArray(grant.supersedes_grant_ids)
      ? [...grant.supersedes_grant_ids]
      : [],
  };
}

function createInactiveRevocation(provenance = null) {
  return {
    active: false,
    decision: null,
    reason: null,
    rationale: null,
    provenance:
      provenance || {
        status: "not_applicable",
        reason: null,
        depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
        checkedChainDepth: 0,
      },
  };
}

function assessAuthorityProvenance(request, baseResolution, authorityGrant) {
  const domainContext = request?.authority_context?.domain_context;

  if (!isPlainObject(domainContext)) {
    return {
      status: "not_applicable",
      reason: null,
      depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
      checkedChainDepth: 0,
    };
  }

  if (!hasOwnProperty(domainContext, "authority_grant")) {
    return baseResolution?.domain?.active === true
      ? {
          status: "phantom",
          reason: AUTHORITY_REVOCATION_REASONS.PHANTOM,
          depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
          checkedChainDepth: 0,
        }
      : {
          status: "not_applicable",
          reason: null,
          depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
          checkedChainDepth: 0,
        };
  }

  if (!authorityGrant) {
    return {
      status: "invalid",
      reason: AUTHORITY_REVOCATION_REASONS.INVALID_PROVENANCE,
      depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
      checkedChainDepth: 0,
    };
  }

  const checkedChainDepth = Math.max(
    authorityGrant.delegationChainIds.length,
    authorityGrant.supersedesGrantIds.length
  );
  const rawGrant = isPlainObject(domainContext.authority_grant)
    ? domainContext.authority_grant
    : {};
  const provenanceFieldsSupplied =
    hasOwnProperty(rawGrant, "granted_by_entity_id") ||
    hasOwnProperty(rawGrant, "delegation_chain_ids") ||
    hasOwnProperty(rawGrant, "supersedes_grant_ids");

  if (
    authorityGrant.delegationChainIds.length > AUTHORITY_PROVENANCE_DEPTH_CAP ||
    authorityGrant.supersedesGrantIds.length > AUTHORITY_PROVENANCE_DEPTH_CAP
  ) {
    return {
      status: "invalid",
      reason: AUTHORITY_REVOCATION_REASONS.DEPTH_EXCEEDED,
      depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
      checkedChainDepth,
    };
  }

  if (
    !hasUniqueStrings(authorityGrant.delegationChainIds) ||
    !hasUniqueStrings(authorityGrant.supersedesGrantIds)
  ) {
    return {
      status: "invalid",
      reason: AUTHORITY_REVOCATION_REASONS.INVALID_PROVENANCE,
      depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
      checkedChainDepth,
    };
  }

  const lineageRequired =
    provenanceFieldsSupplied ||
    authorityGrant.status === "revoked" ||
    authorityGrant.status === "superseded" ||
    authorityGrant.revokedAt !== null ||
    authorityGrant.supersededAt !== null;

  if (
    lineageRequired &&
    (!isNonEmptyString(authorityGrant.grantedByEntityId) ||
      authorityGrant.delegationChainIds.length === 0)
  ) {
    return {
      status: "invalid",
      reason: AUTHORITY_REVOCATION_REASONS.INVALID_PROVENANCE,
      depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
      checkedChainDepth,
    };
  }

  return {
    status: "valid",
    reason: null,
    depthCap: AUTHORITY_PROVENANCE_DEPTH_CAP,
    checkedChainDepth,
  };
}

function hasDomainOmission(domainResolution, omissionId) {
  return (
    Array.isArray(domainResolution?.omissions) &&
    domainResolution.omissions.some(
      (entry) => entry?.omission_id === omissionId
    )
  );
}

function isEffectiveAt(timestamp, evaluationTime) {
  const effectiveTimestamp = parseIsoTimestamp(timestamp);
  const evaluationTimestamp = parseIsoTimestamp(evaluationTime);

  return (
    effectiveTimestamp.valid &&
    evaluationTimestamp.valid &&
    effectiveTimestamp.value <= evaluationTimestamp.value
  );
}

function deriveAuthorityRevocation(request, baseResolution) {
  const authorityGrant = normalizeAuthorityGrant(
    request?.authority_context?.domain_context?.authority_grant
  );
  const provenance = assessAuthorityProvenance(
    request,
    baseResolution,
    authorityGrant
  );

  if (provenance.status !== "valid") {
    return createInactiveRevocation(provenance);
  }

  const evaluationTime =
    request?.authority_context?.domain_context?.evaluation_time || null;
  const domainId =
    baseResolution?.domain?.domain_id ||
    request?.authority_context?.domain_context?.domain_id ||
    null;
  const jurisdiction = baseResolution?.domain?.jurisdiction || null;
  const revocationChecks = [
    {
      active:
        authorityGrant.status === "revoked" ||
        isEffectiveAt(authorityGrant.revokedAt, evaluationTime),
      reason: AUTHORITY_REVOCATION_REASONS.REVOKED,
      rationale: "Authority was revoked before the action completed.",
    },
    {
      active:
        domainId === "permit_authorization" &&
        (authorityGrant.status === "superseded" ||
          isEffectiveAt(authorityGrant.supersededAt, evaluationTime)),
      reason: AUTHORITY_REVOCATION_REASONS.SUPERSEDED,
      rationale: "Permit authority was superseded by an overlapping grant.",
    },
    {
      active:
        baseResolution?.actor?.active === true &&
        jurisdiction?.resolverFound === true &&
        jurisdiction?.matched === false &&
        hasDomainOmission(
          baseResolution?.domain,
          "authority_jurisdiction_mismatch"
        ),
      reason: AUTHORITY_REVOCATION_REASONS.CROSS_JURISDICTION,
      rationale:
        "Cross-jurisdiction resolution removed authority for this requester.",
    },
  ];
  const activeCheck = revocationChecks.find((check) => check.active) || null;

  if (!activeCheck) {
    return createInactiveRevocation(provenance);
  }

  return {
    active: true,
    decision: GOVERNANCE_DECISIONS.REVOKE,
    reason: activeCheck.reason,
    rationale: activeCheck.rationale,
    provenance,
  };
}

module.exports = {
  AUTHORITY_PROVENANCE_DEPTH_CAP,
  AUTHORITY_REVOCATION_REASONS,
  deriveAuthorityRevocation,
};
