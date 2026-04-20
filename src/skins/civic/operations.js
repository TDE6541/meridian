const {
  CIVIC_SKIN_VIEW_TYPES,
} = require("../CivicSkinFramework");

const OPERATIONS_SKIN_ID = "civic.operations";

const VIEW_TYPES = new Set(CIVIC_SKIN_VIEW_TYPES);
const SUPPORTED_DOMAIN_IDS = new Set([
  "permit_authorization",
  "inspection_resolution",
  "utility_corridor_action",
  "decision_closure",
]);

const LABEL_MAP = Object.freeze({
  action_without_authority: "Action without required authority",
  authority_and_evidence_resolved: "Authority and evidence resolved",
  authority_expired_mid_action: "Authority expired during action window",
  authority_jurisdiction_mismatch: "Authority jurisdiction mismatch",
  authority_revoked_mid_action: "Authority revoked during action window",
  cross_jurisdiction_resolved_against_requester:
    "Cross-jurisdiction resolution removed requester authority",
  permit_superseded_by_overlap: "Permit authority superseded by overlap",
  utility_corridor_action: "Utility corridor action",
  inspection_resolution: "Inspection resolution",
  decision_closure: "Decision closure",
  fire_department: "Fire Department",
  development_services: "Development Services",
  tpw_row: "Transportation and Public Works right-of-way",
  water_department: "Water Department",
});

const SECTION_IDS = Object.freeze({
  WORK_ORDER_SUMMARY: "work-order-summary",
  CORRIDOR_STATUS: "corridor-status",
  ASSET_UTILITY_CONTEXT: "asset-utility-context",
  MAINTENANCE_PRIORITY: "maintenance-priority",
  RESPONSIBLE_OFFICE: "responsible-office",
  AUTHORITY_GAP_QUEUE: "authority-gap-hold-queue",
  REVOCATION_ESCALATION_NOTICE: "revocation-escalation-notice",
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
  return String(value)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
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

function getOperationsContext(input) {
  const rawRequest = getRawRequest(input);
  return isPlainObject(rawRequest.authority_context?.operations_context)
    ? rawRequest.authority_context.operations_context
    : null;
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

function getDomainContextSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("domain_context", "governanceSweep", false)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("authority_context.domain_context", "fixture", false)];
  }

  return [makeSourceRef("authority_context.domain_context", "authorityContext", false)];
}

function getOperationsContextSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("operations_context", "governanceSweep", false)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("authority_context.operations_context", "fixture", false)];
  }

  return [makeSourceRef("authority_context.operations_context", "authorityContext", false)];
}

function getAuthorityGapSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [
      makeSourceRef("reason", "governanceSweep", true),
      makeSourceRef("omissionSummary", "governanceSweep", true),
    ];
  }

  if (input.sourceKind === "fixture") {
    return [
      makeSourceRef("authority_context.missing_approvals", "fixture", false),
      makeSourceRef("evidence_context.missing_types", "fixture", false),
    ];
  }

  return [
    makeSourceRef("authority_context.missing_approvals", "authorityContext", false),
    makeSourceRef("evidence_context.missing_types", "rawInput", false),
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

function buildDecisionClaims(input) {
  const sourceRefs = getDecisionSourceRefs(input);
  const confidenceTier = getConfidenceTier(input);
  return [
    createClaim(
      "claim.operations-work-order-decision",
      `Work-order posture is ${getDecision(input)}.`,
      "presented-source-truth",
      sourceRefs,
      confidenceTier
    ),
    createClaim(
      "claim.operations-work-order-reason",
      `Work-order reason label: ${translateLabel(getReason(input))}.`,
      "label-translation",
      sourceRefs,
      confidenceTier
    ),
  ];
}

function mapMaintenancePriority(confidenceTier) {
  if (confidenceTier === "KILL") {
    return "Stop-work priority";
  }

  if (confidenceTier === "HOLD") {
    return "High-priority remediation queue";
  }

  if (confidenceTier === "GAP") {
    return "Supervised maintenance review";
  }

  if (confidenceTier === "WATCH") {
    return "Routine maintenance posture";
  }

  return "Priority posture unavailable";
}

function buildMaintenancePriorityClaim(input) {
  const confidenceTier = getConfidenceTier(input);
  if (!isNonEmptyString(confidenceTier)) {
    return null;
  }

  return createClaim(
    "claim.operations-maintenance-priority",
    `Maintenance priority label is ${mapMaintenancePriority(confidenceTier)}.`,
    "label-translation",
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
    "claim.operations-obligation-status",
    `Operational obligations are ${promiseStatus.conditions_satisfied}/${promiseStatus.conditions_total} satisfied.`,
    "derived-runtime-truth",
    getPromiseSourceRefs(input),
    getConfidenceTier(input)
  );
}

function buildResponsibleOfficeClaim(input) {
  const rawRequest = getRawRequest(input);
  const role = rawRequest.authority_context?.requested_by_role;
  if (!isNonEmptyString(role)) {
    return null;
  }

  return createClaim(
    "claim.operations-responsible-office",
    `Responsible office role is ${translateLabel(role)}.`,
    "label-translation",
    [makeSourceRef("authority_context.requested_by_role", "authorityContext", true)],
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
              "absence.operations-authority.not-in-input",
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
      "claim.operations-authority-status",
      `Authority status is ${authorityResolution.decision || "UNKNOWN"} (${translateLabel(
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
              "absence.operations-revocation.not-in-input",
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
      "claim.operations-revocation-status",
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

function buildResourceBundle(input) {
  const operationsContext = getOperationsContext(input);
  const claims = [];
  const absences = [];

  const resources = [
    {
      key: "crew_status",
      claimId: "claim.operations-crew-status",
      absenceId: "absence.operations-crew-status.missing",
      label: "Crew",
    },
    {
      key: "equipment_status",
      claimId: "claim.operations-equipment-status",
      absenceId: "absence.operations-equipment-status.missing",
      label: "Equipment",
    },
    {
      key: "resource_status",
      claimId: "claim.operations-resource-status",
      absenceId: "absence.operations-resource-status.missing",
      label: "Resource",
    },
  ];

  for (const resource of resources) {
    const sourceRefs = [
      makeSourceRef(
        `authority_context.operations_context.${resource.key}`,
        "authorityContext",
        false
      ),
    ];
    const value = operationsContext?.[resource.key];

    if (isPlainObject(value) || Array.isArray(value) || isNonEmptyString(value)) {
      claims.push(
        createClaim(
          resource.claimId,
          `${resource.label} context is present in current source input.`,
          "presented-source-truth",
          sourceRefs,
          getConfidenceTier(input)
        )
      );
      continue;
    }

    absences.push(
      createAbsence(
        resource.absenceId,
        `authority_context.operations_context.${resource.key}`,
        "SOURCE_FIELD_ABSENT",
        `${resource.label} context is absent from current source input.`,
        sourceRefs
      )
    );
  }

  return { claims, absences };
}

function collectIds(values) {
  return values.filter(isNonEmptyString);
}

function buildSections(input, claims, absences) {
  const rawRequest = getRawRequest(input);
  const decision = getDecision(input);
  const reason = getReason(input);
  const domainId =
    rawRequest.authority_context?.domain_context?.domain_id ||
    getAuthorityResolution(input)?.domain?.domain_id ||
    "domain_not_supplied";
  const jurisdictionId =
    rawRequest.authority_context?.domain_context?.jurisdiction_id || "jurisdiction_not_supplied";
  const missingApprovals = toArray(rawRequest.authority_context?.missing_approvals)
    .filter(isNonEmptyString)
    .map((entry) => translateLabel(entry));
  const missingTypes = toArray(rawRequest.evidence_context?.missing_types)
    .filter(isNonEmptyString)
    .map((entry) => translateLabel(entry));
  const requiredCount = Number.isInteger(rawRequest.evidence_context?.required_count)
    ? rawRequest.evidence_context.required_count
    : 0;
  const presentCount = Number.isInteger(rawRequest.evidence_context?.present_count)
    ? rawRequest.evidence_context.present_count
    : 0;
  const evidenceGap = Math.max(requiredCount - presentCount, 0);
  const maintenancePriority = mapMaintenancePriority(getConfidenceTier(input));
  const authorityClaim = claims.find((claim) => claim.id === "claim.operations-authority-status");
  const revocationClaim = claims.find((claim) => claim.id === "claim.operations-revocation-status");

  return [
    {
      id: SECTION_IDS.WORK_ORDER_SUMMARY,
      title: "Work Order Summary",
      body: `Work-order posture is ${decision} (${translateLabel(reason)}).`,
      sourceRefs: getDecisionSourceRefs(input),
      claimIds: ["claim.operations-work-order-decision", "claim.operations-work-order-reason"],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.CORRIDOR_STATUS,
      title: "Corridor Status",
      body: `Domain ${translateLabel(domainId)} in jurisdiction ${translateLabel(jurisdictionId)}.`,
      sourceRefs: getDomainContextSourceRefs(input),
      claimIds: [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.ASSET_UTILITY_CONTEXT,
      title: "Asset / Utility Context",
      body:
        missingTypes.length > 0
          ? `Missing asset/utility evidence: ${missingTypes.join(", ")}.`
          : "No missing asset/utility evidence fields are present in current input.",
      sourceRefs: getAuthorityGapSourceRefs(input).concat(getOperationsContextSourceRefs(input)),
      claimIds: collectIds(
        ["claim.operations-crew-status", "claim.operations-equipment-status", "claim.operations-resource-status"]
          .filter((claimId) => claims.some((claim) => claim.id === claimId))
      ),
      absenceIds: collectIds(
        [
          "absence.operations-crew-status.missing",
          "absence.operations-equipment-status.missing",
          "absence.operations-resource-status.missing",
        ].filter((absenceId) => absences.some((absence) => absence.id === absenceId))
      ),
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.MAINTENANCE_PRIORITY,
      title: "Maintenance Priority",
      body: `Maintenance priority is ${maintenancePriority}.`,
      sourceRefs: getConfidenceSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.operations-maintenance-priority")
        ? ["claim.operations-maintenance-priority"]
        : [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.RESPONSIBLE_OFFICE,
      title: "Responsible Office",
      body: claims.some((claim) => claim.id === "claim.operations-responsible-office")
        ? claims.find((claim) => claim.id === "claim.operations-responsible-office").text
        : "Responsible office role is not present in current input.",
      sourceRefs: [makeSourceRef("authority_context.requested_by_role", "authorityContext", false)],
      claimIds: claims.some((claim) => claim.id === "claim.operations-responsible-office")
        ? ["claim.operations-responsible-office"]
        : [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.AUTHORITY_GAP_QUEUE,
      title: "Authority Gap / HOLD Queue",
      body:
        missingApprovals.length > 0 || evidenceGap > 0
          ? `Missing approvals: ${
              missingApprovals.length > 0 ? missingApprovals.join(", ") : "none"
            }; evidence gap: ${evidenceGap}.`
          : "No authority gaps or HOLD queue entries are present in current input.",
      sourceRefs: getAuthorityGapSourceRefs(input),
      claimIds: collectIds([
        claims.some((claim) => claim.id === "claim.operations-obligation-status")
          ? "claim.operations-obligation-status"
          : null,
      ]),
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.REVOCATION_ESCALATION_NOTICE,
      title: "Revocation or Escalation Notice",
      body:
        revocationClaim?.text ||
        authorityClaim?.text ||
        (decision === "HOLD" || decision === "REVOKE" || decision === "BLOCK"
          ? `Decision ${decision} keeps escalation handling active.`
          : "No revocation or escalation notice is active in current input."),
      sourceRefs: getAuthoritySourceRefs(input)
        .concat(getRevocationSourceRefs(input))
        .concat(getDecisionSourceRefs(input)),
      claimIds: collectIds([
        authorityClaim ? authorityClaim.id : null,
        revocationClaim ? revocationClaim.id : null,
      ]),
      absenceIds: collectIds([
        absences.some((absence) => absence.id === "absence.operations-authority.not-in-input")
          ? "absence.operations-authority.not-in-input"
          : null,
        absences.some((absence) => absence.id === "absence.operations-revocation.not-in-input")
          ? "absence.operations-revocation.not-in-input"
          : null,
      ]),
      disclosureNoticeIds: [],
    },
  ];
}

const operationsSkinDescriptor = Object.freeze({
  skinId: OPERATIONS_SKIN_ID,
  title: "Civic Operations Skin",
  supports(input) {
    if (!isPlainObject(input) || !VIEW_TYPES.has(input.viewType)) {
      return false;
    }

    const explicitDomainId = getExplicitDomainId(input);
    if (isNonEmptyString(explicitDomainId) && !SUPPORTED_DOMAIN_IDS.has(explicitDomainId)) {
      return false;
    }

    return true;
  },
  render(input) {
    const claims = [];
    const absences = [];

    claims.push(...buildDecisionClaims(input));

    const maintenancePriorityClaim = buildMaintenancePriorityClaim(input);
    if (maintenancePriorityClaim) {
      claims.push(maintenancePriorityClaim);
    }

    const promiseClaim = buildPromiseClaim(input);
    if (promiseClaim) {
      claims.push(promiseClaim);
    }

    const responsibleOfficeClaim = buildResponsibleOfficeClaim(input);
    if (responsibleOfficeClaim) {
      claims.push(responsibleOfficeClaim);
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

    const resourceBundle = buildResourceBundle(input);
    claims.push(...resourceBundle.claims);
    absences.push(...resourceBundle.absences);

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
        .concat(getDomainContextSourceRefs(input))
        .concat(getOperationsContextSourceRefs(input))
        .concat(getAuthorityGapSourceRefs(input)),
    };
  },
});

module.exports = {
  OPERATIONS_SKIN_ID,
  operationsSkinDescriptor,
};
