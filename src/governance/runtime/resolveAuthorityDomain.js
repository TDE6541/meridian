const {
  getFortWorthOrganization,
  getFortWorthRoleDomainDeclaration,
  resolveFortWorthJurisdiction,
  FORT_WORTH_AUTHORITY_TOPOLOGY,
} = require("./fortWorthAuthorityTopology");

const DOMAIN_DECISIONS = Object.freeze({
  ALLOW: "ALLOW",
  SUPERVISE: "SUPERVISE",
  HOLD: "HOLD",
  BLOCK: "BLOCK",
});

const PORTFOLIO_STATUSES = Object.freeze({
  MATCH: "match",
  MISMATCH: "mismatch",
  CROSS_PORTFOLIO_REVIEW: "cross_portfolio_review",
  NOT_APPLICABLE: "not_applicable",
});

const PERMIT_STATE_TRANSITIONS = Object.freeze({
  portfolio_review: {
    permit_application: {
      submitted: ["in_review"],
      in_review: ["in_review"],
    },
  },
  city_manager_final: {
    permit_application: {
      in_review: ["approved"],
      approved: ["issued"],
    },
  },
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

function sortUniqueStrings(values) {
  return [...new Set(values)].sort();
}

function getRequestedRoleId(request) {
  return request?.authority_context?.domain_context?.role_id ||
    request?.authority_context?.requested_by_role ||
    null;
}

function resolvePolicyDomainId(policyContext) {
  if (!Array.isArray(policyContext?.domainIds) || policyContext.domainIds.length !== 1) {
    return null;
  }

  return policyContext.domainIds[0];
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

function normalizeAuthorityGrant(grant) {
  if (!isPlainObject(grant)) {
    return null;
  }

  if (
    grant.status !== undefined &&
    grant.status !== null &&
    !isNonEmptyString(grant.status)
  ) {
    return null;
  }

  if (
    grant.expires_at !== undefined &&
    !isNullableNonEmptyString(grant.expires_at)
  ) {
    return null;
  }

  if (
    grant.jurisdiction !== undefined &&
    !isNullableNonEmptyString(grant.jurisdiction)
  ) {
    return null;
  }

  if (
    grant.scope_of_authority !== undefined &&
    !isStringArray(grant.scope_of_authority)
  ) {
    return null;
  }

  return {
    status: grant.status || null,
    expiresAt: grant.expires_at || null,
    jurisdiction: grant.jurisdiction || null,
    scopeOfAuthority: Array.isArray(grant.scope_of_authority)
      ? [...grant.scope_of_authority]
      : null,
  };
}

function normalizeStateTransition(stateTransition) {
  if (!isPlainObject(stateTransition)) {
    return null;
  }

  if (!isNonEmptyString(stateTransition.entity_type)) {
    return null;
  }

  if (!isNullableNonEmptyString(stateTransition.from_state)) {
    return null;
  }

  if (!isNonEmptyString(stateTransition.to_state)) {
    return null;
  }

  return {
    entityType: stateTransition.entity_type,
    fromState: stateTransition.from_state || null,
    toState: stateTransition.to_state,
  };
}

function getSubjectPortfolioOrgId(domainContext) {
  if (isNonEmptyString(domainContext.subject_department_id)) {
    return (
      FORT_WORTH_AUTHORITY_TOPOLOGY.departments[domainContext.subject_department_id]
        ?.portfolio_org_id || null
    );
  }

  if (isNonEmptyString(domainContext.subject_org_id)) {
    const organization = getFortWorthOrganization(domainContext.subject_org_id);
    if (organization) {
      return organization.portfolio_org_id || organization.org_id;
    }
  }

  if (isNonEmptyString(domainContext.subject_portfolio_org_id)) {
    return domainContext.subject_portfolio_org_id;
  }

  return null;
}

function evaluatePortfolioAlignment(requesterOrganization, subjectPortfolioOrgId) {
  const requesterPortfolioOrgId =
    requesterOrganization.portfolio_org_id || requesterOrganization.org_id;

  if (!subjectPortfolioOrgId) {
    return {
      requesterPortfolioOrgId,
      subjectPortfolioOrgId: null,
      status: PORTFOLIO_STATUSES.NOT_APPLICABLE,
      reason: "authority_portfolio_not_applicable",
    };
  }

  if (requesterOrganization.org_id === "fw_city_manager") {
    return {
      requesterPortfolioOrgId,
      subjectPortfolioOrgId,
      status: PORTFOLIO_STATUSES.CROSS_PORTFOLIO_REVIEW,
      reason: "authority_cross_portfolio_review",
    };
  }

  if (requesterPortfolioOrgId === subjectPortfolioOrgId) {
    return {
      requesterPortfolioOrgId,
      subjectPortfolioOrgId,
      status: PORTFOLIO_STATUSES.MATCH,
      reason: "authority_portfolio_match",
    };
  }

  return {
    requesterPortfolioOrgId,
    subjectPortfolioOrgId,
    status: PORTFOLIO_STATUSES.MISMATCH,
    reason: "authority_portfolio_mismatch",
  };
}

function evaluateJurisdiction(domainId, declaration, grant, jurisdictionId) {
  const jurisdiction = isNonEmptyString(jurisdictionId)
    ? resolveFortWorthJurisdiction(jurisdictionId)
    : null;
  const declarationSupportsJurisdiction =
    !jurisdictionId ||
    (Array.isArray(declaration?.jurisdiction_ids) &&
      declaration.jurisdiction_ids.includes(jurisdictionId));
  const jurisdictionSupportsDomain =
    !jurisdictionId ||
    (Array.isArray(jurisdiction?.supported_domain_ids) &&
      jurisdiction.supported_domain_ids.includes(domainId));
  const grantMatchesJurisdiction =
    !jurisdictionId || !grant?.jurisdiction || grant.jurisdiction === jurisdictionId;
  const matched =
    (!jurisdictionId || !!jurisdiction) &&
    declarationSupportsJurisdiction &&
    jurisdictionSupportsDomain &&
    grantMatchesJurisdiction;

  return {
    jurisdictionId: jurisdictionId || null,
    matched,
    resolverFound: jurisdiction !== null,
    omission: matched
      ? null
      : {
          omission_id: "authority_jurisdiction_mismatch",
          reason: "authority_jurisdiction_mismatch",
        },
  };
}

function evaluateGrant(domainId, grant, evaluationTime) {
  if (!grant) {
    return {
      omission: null,
      scopeAuthorized: true,
    };
  }

  if (
    Array.isArray(grant.scopeOfAuthority) &&
    grant.scopeOfAuthority.length > 0 &&
    !grant.scopeOfAuthority.includes(domainId)
  ) {
    return {
      omission: null,
      scopeAuthorized: false,
    };
  }

  if (grant.status === "expired") {
    return {
      omission: {
        omission_id: "authority_expired_mid_action",
        reason: "authority_expired_mid_action",
      },
      scopeAuthorized: true,
    };
  }

  const evaluationTimestamp = parseIsoTimestamp(evaluationTime);
  const expiryTimestamp = parseIsoTimestamp(grant.expiresAt);
  const expiredByTime =
    evaluationTimestamp.valid &&
    expiryTimestamp.valid &&
    expiryTimestamp.value <= evaluationTimestamp.value;

  return {
    omission: expiredByTime
      ? {
          omission_id: "authority_expired_mid_action",
          reason: "authority_expired_mid_action",
        }
      : null,
    scopeAuthorized: true,
  };
}

function evaluateStateTransition(domainId, declarationMode, stateTransition) {
  if (domainId !== "permit_authorization" || !stateTransition) {
    return {
      applicable: false,
      valid: true,
      reason: "authority_state_transition_not_applicable",
      entityType: stateTransition?.entityType || null,
      fromState: stateTransition?.fromState || null,
      toState: stateTransition?.toState || null,
    };
  }

  const allowedTransitions =
    PERMIT_STATE_TRANSITIONS[declarationMode]?.[stateTransition.entityType]?.[
      stateTransition.fromState || "__missing__"
    ] || [];

  if (allowedTransitions.includes(stateTransition.toState)) {
    return {
      applicable: true,
      valid: true,
      reason: "authority_state_transition_valid",
      entityType: stateTransition.entityType,
      fromState: stateTransition.fromState,
      toState: stateTransition.toState,
    };
  }

  return {
    applicable: true,
    valid: false,
    reason: "authority_invalid_state_transition",
    entityType: stateTransition.entityType,
    fromState: stateTransition.fromState,
    toState: stateTransition.toState,
  };
}

function inactiveResolution() {
  return {
    active: false,
    decision: null,
    reason: "authority_domain_not_requested",
  };
}

function resolveAuthorityDomain(request, policyContext = {}) {
  const authorityContext = request?.authority_context;

  if (
    !isPlainObject(authorityContext) ||
    !hasOwnProperty(authorityContext, "domain_context")
  ) {
    return inactiveResolution();
  }

  if (!isPlainObject(authorityContext.domain_context)) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  const domainContext = authorityContext.domain_context;
  const roleId = getRequestedRoleId(request);
  const domainId = domainContext.domain_id || resolvePolicyDomainId(policyContext);
  const requesterOrgId = domainContext.requester_org_id;
  const evaluationTime = domainContext.evaluation_time || null;
  const authorityGrant = normalizeAuthorityGrant(domainContext.authority_grant);
  const stateTransition = hasOwnProperty(domainContext, "state_transition")
    ? normalizeStateTransition(domainContext.state_transition)
    : null;

  if (!isNonEmptyString(requesterOrgId)) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  if (hasOwnProperty(domainContext, "authority_grant") && !authorityGrant) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  if (hasOwnProperty(domainContext, "state_transition") && !stateTransition) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  if (
    hasOwnProperty(domainContext, "evaluation_time") &&
    !isNullableNonEmptyString(domainContext.evaluation_time)
  ) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  if (
    hasOwnProperty(domainContext, "subject_department_id") &&
    !isNullableNonEmptyString(domainContext.subject_department_id)
  ) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  if (
    hasOwnProperty(domainContext, "subject_org_id") &&
    !isNullableNonEmptyString(domainContext.subject_org_id)
  ) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  if (
    hasOwnProperty(domainContext, "subject_portfolio_org_id") &&
    !isNullableNonEmptyString(domainContext.subject_portfolio_org_id)
  ) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  if (
    evaluationTime !== null &&
    !parseIsoTimestamp(evaluationTime).valid
  ) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_context_invalid",
    };
  }

  if (!isNonEmptyString(roleId)) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_role_unrecognized",
    };
  }

  if (!isNonEmptyString(domainId)) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_domain_unsupported",
    };
  }

  const role = FORT_WORTH_AUTHORITY_TOPOLOGY.roles[roleId] || null;
  if (!role) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_role_unrecognized",
      domain_id: domainId,
      requested_role_id: roleId,
    };
  }

  const requesterOrganization = getFortWorthOrganization(requesterOrgId);
  if (!requesterOrganization || requesterOrganization.org_id !== role.org_id) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_role_org_mismatch",
      domain_id: domainId,
      requested_role_id: roleId,
      requester_org_id: requesterOrgId,
    };
  }

  const declaration = getFortWorthRoleDomainDeclaration(roleId, domainId);
  if (!declaration) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_role_unauthorized_for_domain",
      domain_id: domainId,
      requested_role_id: roleId,
      requester_org_id: requesterOrgId,
    };
  }

  const grantEvaluation = evaluateGrant(domainId, authorityGrant, evaluationTime);
  if (!grantEvaluation.scopeAuthorized) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: "authority_grant_scope_unauthorized_for_domain",
      domain_id: domainId,
      requested_role_id: roleId,
      requester_org_id: requesterOrgId,
      declaration_mode: declaration.declaration_mode,
    };
  }

  const jurisdiction = evaluateJurisdiction(
    domainId,
    declaration,
    authorityGrant,
    domainContext.jurisdiction_id || null
  );
  const portfolio = evaluatePortfolioAlignment(
    requesterOrganization,
    getSubjectPortfolioOrgId(domainContext)
  );
  const stateTransitionResolution = evaluateStateTransition(
    domainId,
    declaration.declaration_mode,
    stateTransition
  );
  const omissions = sortUniqueStrings(
    [grantEvaluation.omission?.omission_id, jurisdiction.omission?.omission_id].filter(
      Boolean
    )
  ).map((omissionId) => ({
    omission_id: omissionId,
    reason: omissionId,
  }));

  if (!stateTransitionResolution.valid) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.BLOCK,
      reason: stateTransitionResolution.reason,
      domain_id: domainId,
      requested_role_id: roleId,
      requester_org_id: requesterOrgId,
      declaration_mode: declaration.declaration_mode,
      portfolio_status: portfolio.status,
      omissions,
      state_transition: stateTransitionResolution,
    };
  }

  if (portfolio.status === PORTFOLIO_STATUSES.MISMATCH || omissions.length > 0) {
    return {
      active: true,
      decision: DOMAIN_DECISIONS.HOLD,
      reason:
        omissions.length > 0
          ? omissions.map((entry) => entry.reason).join(",")
          : portfolio.reason,
      domain_id: domainId,
      requested_role_id: roleId,
      requester_org_id: requesterOrgId,
      declaration_mode: declaration.declaration_mode,
      portfolio_status: portfolio.status,
      requester_portfolio_org_id: portfolio.requesterPortfolioOrgId,
      subject_portfolio_org_id: portfolio.subjectPortfolioOrgId,
      omissions,
      jurisdiction,
      state_transition: stateTransitionResolution,
    };
  }

  const decision =
    declaration.declaration_mode === "portfolio_review"
      ? DOMAIN_DECISIONS.SUPERVISE
      : DOMAIN_DECISIONS.ALLOW;

  return {
    active: true,
    decision,
    reason:
      decision === DOMAIN_DECISIONS.SUPERVISE
        ? "authority_portfolio_review_required"
        : "authority_domain_resolved",
    domain_id: domainId,
    requested_role_id: roleId,
    requester_org_id: requesterOrgId,
    declaration_mode: declaration.declaration_mode,
    portfolio_status: portfolio.status,
    requester_portfolio_org_id: portfolio.requesterPortfolioOrgId,
    subject_portfolio_org_id: portfolio.subjectPortfolioOrgId,
    omissions,
    jurisdiction,
    state_transition: stateTransitionResolution,
  };
}

module.exports = {
  DOMAIN_DECISIONS,
  PORTFOLIO_STATUSES,
  resolveAuthorityDomain,
};
