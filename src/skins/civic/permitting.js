const {
  CIVIC_SKIN_VIEW_TYPES,
} = require("../CivicSkinFramework");

const PERMITTING_SKIN_ID = "civic.permitting";

const VIEW_TYPES = new Set(CIVIC_SKIN_VIEW_TYPES);

const LABEL_MAP = Object.freeze({
  action_without_authority: "Action without required authority",
  authority_and_evidence_resolved: "Authority and evidence resolved",
  authority_expired_mid_action: "Authority expired during action window",
  authority_jurisdiction_mismatch: "Authority jurisdiction mismatch",
  authority_revoked_mid_action: "Authority revoked during action window",
  cross_jurisdiction_resolved_against_requester:
    "Cross-jurisdiction resolution removed requester authority",
  development_services: "Development Services approval",
  missing_approvals: "Missing required approvals",
  permit_superseded_by_overlap: "Permit authority superseded by overlap",
  tpw_row: "Transportation and Public Works right-of-way approval",
  utility_conflict_assessment: "Utility conflict assessment",
  water_department: "Water Department approval",
});

const SECTION_IDS = Object.freeze({
  PERMIT_STATUS: "permit-status",
  INSPECTION_FINDINGS: "inspection-findings",
  AUTHORITY_CHAIN: "authority-chain",
  GOVERNANCE_DECISION: "governance-decision",
  CONFIDENCE_ASSESSMENT: "confidence-assessment",
  PROMISE_STATUS: "promise-obligation-status",
  REVOCATION_HOLD: "revocation-hold-notice",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIdentifier(value) {
  return String(value).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function translateLabel(token) {
  if (!isNonEmptyString(token)) {
    return "Unknown";
  }

  return LABEL_MAP[token] || token;
}

function getRawRequest(input) {
  if (isPlainObject(input.raw?.request)) {
    return input.raw.request;
  }

  return isPlainObject(input.raw) ? input.raw : {};
}

function getDecision(input) {
  return isNonEmptyString(input.civic?.decision) ? input.civic.decision : "UNKNOWN";
}

function getReason(input) {
  return isNonEmptyString(input.civic?.reason) ? input.civic.reason : "reason_not_available";
}

function getRationale(input) {
  return isNonEmptyString(input.civic?.rationale)
    ? input.civic.rationale
    : "Rationale not provided in current input.";
}

function getConfidenceTier(input) {
  return isNonEmptyString(input.civic?.confidence?.tier)
    ? input.civic.confidence.tier
    : null;
}

function getPromiseStatus(input) {
  return isPlainObject(input.civic?.promise_status) ? input.civic.promise_status : null;
}

function getAuthorityResolution(input) {
  return isPlainObject(input.civic?.authority_resolution)
    ? input.civic.authority_resolution
    : null;
}

function getRevocationProjection(input) {
  return isPlainObject(input.civic?.revocation) ? input.civic.revocation : null;
}

function getExplicitDomainId(input) {
  const rawRequest = getRawRequest(input);

  if (isNonEmptyString(rawRequest.authority_context?.domain_context?.domain_id)) {
    return rawRequest.authority_context.domain_context.domain_id;
  }

  if (isNonEmptyString(input.civic?.authority_resolution?.domain?.domain_id)) {
    return input.civic.authority_resolution.domain.domain_id;
  }

  return null;
}

function makeSourceRef(path, sourceKind, required = true) {
  return {
    path,
    sourceKind,
    required,
  };
}

function getDecisionSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [
      makeSourceRef("decision", "governanceSweep", true),
      makeSourceRef("reason", "governanceSweep", true),
    ];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("decision", "fixture", true)];
  }

  return [
    makeSourceRef("decision", "rawInput", true),
    makeSourceRef("reason", "rawInput", true),
  ];
}

function getPromiseSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("promiseStatus", "governanceSweep", true)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("runtimeSubset.civic.promise_status", "fixture", false)];
  }

  return [makeSourceRef("runtimeSubset.civic.promise_status", "runtimeSubset.civic", true)];
}

function getConfidenceSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("confidenceTier", "governanceSweep", true)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("runtimeSubset.civic.confidence", "fixture", false)];
  }

  return [makeSourceRef("runtimeSubset.civic.confidence", "runtimeSubset.civic", true)];
}

function getAuthoritySourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("authority_resolution", "governanceSweep", false)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("runtimeSubset.civic.authority_resolution", "fixture", false)];
  }

  return [
    makeSourceRef("runtimeSubset.civic.authority_resolution", "runtimeSubset.civic", false),
    makeSourceRef("authority_context", "authorityContext", false),
  ];
}

function getRevocationSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("revocation", "governanceSweep", false)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("runtimeSubset.civic.revocation", "fixture", false)];
  }

  return [
    makeSourceRef("runtimeSubset.civic.revocation", "revocationProjection", false),
    makeSourceRef("runtimeSubset.civic.revocation", "runtimeSubset.civic", false),
  ];
}

function createClaim(id, text, claimKind, sourceRefs, confidenceTier = null) {
  return {
    id,
    text,
    claimKind,
    sourceRefs,
    allowedAudience: ["internal"],
    confidenceTier,
  };
}

function createAbsence(id, path, reason, displayText, sourceRefs) {
  return {
    id,
    path,
    reason,
    displayText,
    sourceRefs,
  };
}

function buildApprovalClaimsAndAbsences(input) {
  const rawRequest = getRawRequest(input);
  const requiredApprovals = toArray(rawRequest.authority_context?.required_approvals);
  const missingApprovals = toArray(rawRequest.authority_context?.missing_approvals);
  const claims = [];
  const absences = [];

  for (const approval of requiredApprovals) {
    if (!isNonEmptyString(approval)) {
      continue;
    }

    claims.push(
      createClaim(
        `claim.required-approval.${normalizeIdentifier(approval)}`,
        `Required approval present in source: ${translateLabel(approval)}.`,
        "presented-source-truth",
        [makeSourceRef("authority_context.required_approvals", "authorityContext", true)],
        null
      )
    );
  }

  for (const approval of missingApprovals) {
    if (!isNonEmptyString(approval)) {
      continue;
    }

    absences.push(
      createAbsence(
        `absence.missing-approval.${normalizeIdentifier(approval)}`,
        "authority_context.missing_approvals",
        "SOURCE_FIELD_ABSENT",
        `Missing required approval: ${translateLabel(approval)}.`,
        [makeSourceRef("authority_context.missing_approvals", "authorityContext", true)]
      )
    );
  }

  return {
    claims,
    absences,
  };
}

function buildEvidenceAbsences(input) {
  const rawRequest = getRawRequest(input);
  const missingTypes = toArray(rawRequest.evidence_context?.missing_types);
  const absences = [];

  for (const missingType of missingTypes) {
    if (!isNonEmptyString(missingType)) {
      continue;
    }

    absences.push(
      createAbsence(
        `absence.missing-evidence.${normalizeIdentifier(missingType)}`,
        "evidence_context.missing_types",
        "SOURCE_FIELD_ABSENT",
        `Missing evidence type: ${translateLabel(missingType)}.`,
        [makeSourceRef("evidence_context.missing_types", "rawInput", true)]
      )
    );
  }

  return absences;
}

function buildDecisionClaims(input) {
  const decision = getDecision(input);
  const reason = getReason(input);
  const confidenceTier = getConfidenceTier(input);
  const sourceRefs = getDecisionSourceRefs(input);

  return [
    createClaim(
      "claim.governance-decision",
      `Governance decision is ${decision}.`,
      "presented-source-truth",
      sourceRefs,
      confidenceTier
    ),
    createClaim(
      "claim.decision-label-translation",
      `Decision reason label: ${translateLabel(reason)}.`,
      "label-translation",
      sourceRefs,
      confidenceTier
    ),
  ];
}

function buildConfidenceClaim(input) {
  const confidenceTier = getConfidenceTier(input);
  if (!isNonEmptyString(confidenceTier)) {
    return null;
  }

  return createClaim(
    "claim.confidence-tier",
    `Confidence tier is ${confidenceTier}.`,
    "presented-source-truth",
    getConfidenceSourceRefs(input),
    confidenceTier
  );
}

function buildPromiseClaim(input) {
  const promiseStatus = getPromiseStatus(input);
  if (!promiseStatus) {
    return null;
  }

  return createClaim(
    "claim.promise-status",
    `Promise status ${promiseStatus.conditions_satisfied}/${promiseStatus.conditions_total} conditions satisfied.`,
    "derived-runtime-truth",
    getPromiseSourceRefs(input),
    getConfidenceTier(input)
  );
}

function buildAuthorityClaimOrAbsence(input) {
  const authorityResolution = getAuthorityResolution(input);
  if (!authorityResolution) {
    return {
      claim: null,
      absence:
        input.viewType === "authority-evaluation"
          ? createAbsence(
              "absence.authority-resolution.not-in-input",
              "runtimeSubset.civic.authority_resolution",
              "NOT_IN_CURRENT_INPUT",
              "Authority resolution is not present in current input.",
              getAuthoritySourceRefs(input)
            )
          : null,
    };
  }

  return {
    claim: createClaim(
      "claim.authority-resolution",
      `Authority resolution is ${authorityResolution.decision || "UNKNOWN"} (${translateLabel(
        authorityResolution.reason || "reason_not_available"
      )}).`,
      "presented-source-truth",
      getAuthoritySourceRefs(input),
      getConfidenceTier(input)
    ),
    absence: null,
  };
}

function buildRevocationClaimOrAbsence(input) {
  const revocation = getRevocationProjection(input);
  if (!revocation) {
    return {
      claim: null,
      absence:
        input.viewType === "revocation-status"
          ? createAbsence(
              "absence.revocation.not-in-input",
              "runtimeSubset.civic.revocation",
              "NOT_IN_CURRENT_INPUT",
              "Revocation projection is not present in current input.",
              getRevocationSourceRefs(input)
            )
          : null,
    };
  }

  return {
    claim: createClaim(
      "claim.revocation-status",
      revocation.active === true
        ? `Revocation is active: ${translateLabel(revocation.reason || "revocation_active")}.`
        : "Revocation is inactive in current input.",
      "presented-source-truth",
      getRevocationSourceRefs(input),
      getConfidenceTier(input)
    ),
    absence: null,
  };
}

function collectIds(values) {
  return values.filter(isNonEmptyString);
}

function buildSections(input, claims, absences) {
  const rawRequest = getRawRequest(input);
  const requiredApprovals = toArray(rawRequest.authority_context?.required_approvals)
    .filter(isNonEmptyString)
    .map((entry) => translateLabel(entry));
  const resolvedApprovals = toArray(rawRequest.authority_context?.resolved_approvals)
    .filter(isNonEmptyString)
    .map((entry) => translateLabel(entry));
  const missingEvidence = toArray(rawRequest.evidence_context?.missing_types)
    .filter(isNonEmptyString)
    .map((entry) => translateLabel(entry));
  const decision = getDecision(input);
  const reason = getReason(input);
  const rationale = getRationale(input);
  const confidenceTier = getConfidenceTier(input) || "UNKNOWN";
  const promiseStatus = getPromiseStatus(input);
  const revocation = getRevocationProjection(input);
  const isHoldLike = decision === "HOLD" || decision === "REVOKE" || decision === "BLOCK";

  return [
    {
      id: SECTION_IDS.PERMIT_STATUS,
      title: "Permit Status",
      body: `Decision ${decision} (${translateLabel(reason)}).`,
      sourceRefs: getDecisionSourceRefs(input),
      claimIds: collectIds([
        "claim.governance-decision",
        "claim.decision-label-translation",
      ]),
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.INSPECTION_FINDINGS,
      title: "Inspection Findings",
      body:
        missingEvidence.length > 0
          ? `Missing inspection/evidence items: ${missingEvidence.join(", ")}.`
          : "No missing inspection/evidence items are present in current input.",
      sourceRefs: [makeSourceRef("evidence_context.missing_types", "rawInput", true)],
      claimIds: [],
      absenceIds: absences
        .filter((absence) => absence.path === "evidence_context.missing_types")
        .map((absence) => absence.id),
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.AUTHORITY_CHAIN,
      title: "Authority Chain",
      body:
        requiredApprovals.length > 0
          ? `Required approvals: ${requiredApprovals.join(", ")}. Resolved approvals: ${
              resolvedApprovals.length > 0 ? resolvedApprovals.join(", ") : "none"
            }.`
          : "Authority chain details are not present in current input.",
      sourceRefs: [
        makeSourceRef("authority_context.required_approvals", "authorityContext", false),
        makeSourceRef("authority_context.missing_approvals", "authorityContext", false),
      ],
      claimIds: claims
        .filter((claim) => claim.id.startsWith("claim.required-approval"))
        .map((claim) => claim.id)
        .concat(claims.some((claim) => claim.id === "claim.authority-resolution")
          ? ["claim.authority-resolution"]
          : []),
      absenceIds: absences
        .filter((absence) => absence.path === "authority_context.missing_approvals")
        .map((absence) => absence.id)
        .concat(
          absences.some((absence) => absence.id === "absence.authority-resolution.not-in-input")
            ? ["absence.authority-resolution.not-in-input"]
            : []
        ),
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.GOVERNANCE_DECISION,
      title: "Governance Decision",
      body: rationale,
      sourceRefs: getDecisionSourceRefs(input),
      claimIds: ["claim.governance-decision", "claim.decision-label-translation"],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.CONFIDENCE_ASSESSMENT,
      title: "Confidence Assessment",
      body: `Confidence tier: ${confidenceTier}.`,
      sourceRefs: getConfidenceSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.confidence-tier")
        ? ["claim.confidence-tier"]
        : [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.PROMISE_STATUS,
      title: "Promise / Obligation Status",
      body: promiseStatus
        ? `Conditions satisfied: ${promiseStatus.conditions_satisfied}/${promiseStatus.conditions_total}.`
        : "Promise status is not present in current input.",
      sourceRefs: getPromiseSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.promise-status")
        ? ["claim.promise-status"]
        : [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.REVOCATION_HOLD,
      title: "Revocation or Hold Notice",
      body: revocation?.active === true
        ? `Revocation active: ${translateLabel(revocation.reason || "revocation_active")}.`
        : isHoldLike
          ? `Current decision ${decision} requires hold/revocation notice handling.`
          : "No active revocation or hold notice in current input.",
      sourceRefs: getRevocationSourceRefs(input).concat(getDecisionSourceRefs(input)),
      claimIds: collectIds(
        [
          claims.some((claim) => claim.id === "claim.revocation-status")
            ? "claim.revocation-status"
            : null,
        ].filter(Boolean)
      ),
      absenceIds: collectIds(
        [
          absences.some((absence) => absence.id === "absence.revocation.not-in-input")
            ? "absence.revocation.not-in-input"
            : null,
        ].filter(Boolean)
      ),
      disclosureNoticeIds: [],
    },
  ];
}

const permittingSkinDescriptor = Object.freeze({
  skinId: PERMITTING_SKIN_ID,
  title: "Civic Permitting Skin",
  supports(input) {
    if (!isPlainObject(input) || !VIEW_TYPES.has(input.viewType)) {
      return false;
    }

    const explicitDomainId = getExplicitDomainId(input);
    if (isNonEmptyString(explicitDomainId) && explicitDomainId !== "permit_authorization") {
      return false;
    }

    return true;
  },
  render(input) {
    const claims = [];
    const absences = [];

    claims.push(...buildDecisionClaims(input));

    const approvalBundle = buildApprovalClaimsAndAbsences(input);
    claims.push(...approvalBundle.claims);
    absences.push(...approvalBundle.absences);
    absences.push(...buildEvidenceAbsences(input));

    const confidenceClaim = buildConfidenceClaim(input);
    if (confidenceClaim) {
      claims.push(confidenceClaim);
    }

    const promiseClaim = buildPromiseClaim(input);
    if (promiseClaim) {
      claims.push(promiseClaim);
    }

    const authorityBundle = buildAuthorityClaimOrAbsence(input);
    if (authorityBundle.claim) {
      claims.push(authorityBundle.claim);
    }
    if (authorityBundle.absence) {
      absences.push(authorityBundle.absence);
    }

    const revocationBundle = buildRevocationClaimOrAbsence(input);
    if (revocationBundle.claim) {
      claims.push(revocationBundle.claim);
    }
    if (revocationBundle.absence) {
      absences.push(revocationBundle.absence);
    }

    const sections = buildSections(input, claims, absences);

    return {
      sections,
      claims,
      absences,
      redactions: [],
      fallback: {
        active: false,
        code: null,
        message: null,
      },
      sourceRefs: []
        .concat(getDecisionSourceRefs(input))
        .concat(getPromiseSourceRefs(input))
        .concat(getConfidenceSourceRefs(input))
        .concat(getAuthoritySourceRefs(input))
        .concat(getRevocationSourceRefs(input))
        .concat([
          makeSourceRef("authority_context.required_approvals", "authorityContext", false),
          makeSourceRef("authority_context.missing_approvals", "authorityContext", false),
          makeSourceRef("evidence_context.missing_types", "rawInput", false),
        ]),
    };
  },
});

module.exports = {
  PERMITTING_SKIN_ID,
  permittingSkinDescriptor,
};
