const {
  CIVIC_SKIN_VIEW_TYPES,
} = require("../CivicSkinFramework");

const DISPATCH_SKIN_ID = "civic.dispatch";

const VIEW_TYPES = new Set(CIVIC_SKIN_VIEW_TYPES);
const SUPPORTED_DOMAIN_IDS = new Set([
  "inspection_resolution",
  "utility_corridor_action",
  "decision_closure",
  "public_notice_action",
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
  public_notice_action: "Public notice action",
  HOLD: "Hold queue active",
  REVOKE: "Override intervention active",
  BLOCK: "Manual intervention required",
  ALLOW: "No active hold queue",
  SUPERVISE: "Supervised routing required",
});

const SECTION_IDS = Object.freeze({
  ACTIVE_HOLD_QUEUE: "active-hold-queue",
  PRIORITY_POSTURE: "priority-posture",
  GOVERNANCE_OVERRIDE_STATUS: "governance-override-status",
  RESPONSIBLE_OFFICE: "responsible-office",
  ROUTING_SUMMARY: "dispatch-routing-summary",
  RESOURCE_UNIT_CONTEXT: "resource-unit-context",
  ABSENCE_NOTICES: "absence-notices",
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

function getDispatchContext(input) {
  const rawRequest = getRawRequest(input);
  return isPlainObject(rawRequest.authority_context?.dispatch_context)
    ? rawRequest.authority_context.dispatch_context
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

function getAuthorityContextSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("authority_context", "governanceSweep", false)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("authority_context", "fixture", false)];
  }

  return [makeSourceRef("authority_context", "authorityContext", false)];
}

function getDispatchContextSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("dispatch_context", "governanceSweep", false)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("authority_context.dispatch_context", "fixture", false)];
  }

  return [makeSourceRef("authority_context.dispatch_context", "authorityContext", false)];
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

function buildDecisionClaim(input) {
  return createClaim(
    "claim.dispatch-decision",
    `Dispatch posture is ${getDecision(input)} (${translateLabel(getReason(input))}).`,
    "presented-source-truth",
    getDecisionSourceRefs(input),
    getConfidenceTier(input)
  );
}

function mapPriorityPosture(confidenceTier) {
  if (confidenceTier === "KILL") {
    return "Priority stop posture";
  }

  if (confidenceTier === "HOLD") {
    return "Priority hold posture";
  }

  if (confidenceTier === "GAP") {
    return "Supervised priority posture";
  }

  if (confidenceTier === "WATCH") {
    return "Routine priority posture";
  }

  return "Priority posture unavailable";
}

function buildPriorityClaim(input) {
  const confidenceTier = getConfidenceTier(input);
  if (!isNonEmptyString(confidenceTier)) {
    return null;
  }

  return createClaim(
    "claim.dispatch-priority-posture",
    `Priority posture label is ${mapPriorityPosture(confidenceTier)}.`,
    "label-translation",
    getConfidenceSourceRefs(input),
    confidenceTier
  );
}

function buildResponsibleOfficeClaim(input) {
  const rawRequest = getRawRequest(input);
  const role = rawRequest.authority_context?.requested_by_role;
  if (!isNonEmptyString(role)) {
    return null;
  }

  return createClaim(
    "claim.dispatch-responsible-office",
    `Responsible office role is ${translateLabel(role)}.`,
    "label-translation",
    [makeSourceRef("authority_context.requested_by_role", "authorityContext", true)],
    getConfidenceTier(input)
  );
}

function buildRoutingClaim(input) {
  const rawRequest = getRawRequest(input);
  const domainId =
    rawRequest.authority_context?.domain_context?.domain_id ||
    getAuthorityResolution(input)?.domain?.domain_id ||
    null;

  if (!isNonEmptyString(domainId)) {
    return null;
  }

  return createClaim(
    "claim.dispatch-routing-summary",
    `Routing summary is ${translateLabel(domainId)} lane.`,
    "label-translation",
    [makeSourceRef("authority_context.domain_context.domain_id", "authorityContext", false)],
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
              "absence.dispatch-authority.not-in-input",
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
      "claim.dispatch-governance-override",
      `Governance override status is ${authorityResolution.decision || "UNKNOWN"} (${translateLabel(
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
              "absence.dispatch-revocation.not-in-input",
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
      "claim.dispatch-revocation-status",
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

function buildResourceUnitBundle(input) {
  const dispatchContext = getDispatchContext(input);
  const claims = [];
  const absences = [];
  const sourceRefs = getDispatchContextSourceRefs(input);

  const resourceUnitContext = dispatchContext?.resource_unit_context;
  if (isPlainObject(resourceUnitContext) || Array.isArray(resourceUnitContext)) {
    claims.push(
      createClaim(
        "claim.dispatch-resource-unit-context",
        "Resource/unit context is present in current source input.",
        "presented-source-truth",
        sourceRefs,
        getConfidenceTier(input)
      )
    );
  } else {
    absences.push(
      createAbsence(
        "absence.dispatch-resource-unit.missing",
        "authority_context.dispatch_context.resource_unit_context",
        "SOURCE_FIELD_ABSENT",
        "Resource/unit context is absent from current source input.",
        sourceRefs
      )
    );
  }

  const incidentContext = dispatchContext?.incident_context;
  if (!(isPlainObject(incidentContext) || Array.isArray(incidentContext))) {
    absences.push(
      createAbsence(
        "absence.dispatch-incident-context.missing",
        "authority_context.dispatch_context.incident_context",
        "SOURCE_FIELD_ABSENT",
        "Incident context is absent from current source input.",
        sourceRefs
      )
    );
  }

  return { claims, absences };
}

function collectIds(values) {
  return values.filter(isNonEmptyString);
}

function collectAbsenceSourceRefs(absences) {
  const dedupe = new Map();
  for (const absence of absences) {
    for (const sourceRef of absence.sourceRefs) {
      const key = `${sourceRef.path}|${sourceRef.sourceKind}|${sourceRef.required}`;
      dedupe.set(key, sourceRef);
    }
  }

  return [...dedupe.values()];
}

function buildSections(input, claims, absences) {
  const rawRequest = getRawRequest(input);
  const decision = getDecision(input);
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
  const authorityClaim = claims.find(
    (claim) => claim.id === "claim.dispatch-governance-override"
  );
  const revocationClaim = claims.find(
    (claim) => claim.id === "claim.dispatch-revocation-status"
  );
  const absenceSourceRefs = collectAbsenceSourceRefs(absences);

  return [
    {
      id: SECTION_IDS.ACTIVE_HOLD_QUEUE,
      title: "Active Hold Queue",
      body:
        decision === "HOLD" || decision === "REVOKE" || decision === "BLOCK"
          ? `Active queue status: ${translateLabel(decision)}. Missing approvals ${
              missingApprovals.length > 0 ? missingApprovals.join(", ") : "none"
            }; evidence gap ${evidenceGap}.`
          : "No active hold queue entries in current input.",
      sourceRefs: getDecisionSourceRefs(input).concat(getAuthorityContextSourceRefs(input)),
      claimIds: ["claim.dispatch-decision"],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.PRIORITY_POSTURE,
      title: "Priority Posture",
      body: `Priority posture is ${mapPriorityPosture(getConfidenceTier(input))}.`,
      sourceRefs: getConfidenceSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.dispatch-priority-posture")
        ? ["claim.dispatch-priority-posture"]
        : [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.GOVERNANCE_OVERRIDE_STATUS,
      title: "Governance Override Status",
      body:
        revocationClaim?.text ||
        authorityClaim?.text ||
        "No governance override context is active in current input.",
      sourceRefs: getAuthoritySourceRefs(input).concat(getRevocationSourceRefs(input)),
      claimIds: collectIds([
        authorityClaim ? authorityClaim.id : null,
        revocationClaim ? revocationClaim.id : null,
      ]),
      absenceIds: collectIds([
        absences.some((absence) => absence.id === "absence.dispatch-authority.not-in-input")
          ? "absence.dispatch-authority.not-in-input"
          : null,
        absences.some((absence) => absence.id === "absence.dispatch-revocation.not-in-input")
          ? "absence.dispatch-revocation.not-in-input"
          : null,
      ]),
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.RESPONSIBLE_OFFICE,
      title: "Responsible Office",
      body: claims.some((claim) => claim.id === "claim.dispatch-responsible-office")
        ? claims.find((claim) => claim.id === "claim.dispatch-responsible-office").text
        : "Responsible office role is not present in current input.",
      sourceRefs: [makeSourceRef("authority_context.requested_by_role", "authorityContext", false)],
      claimIds: claims.some((claim) => claim.id === "claim.dispatch-responsible-office")
        ? ["claim.dispatch-responsible-office"]
        : [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.ROUTING_SUMMARY,
      title: "Dispatch-Style Routing Summary",
      body: claims.some((claim) => claim.id === "claim.dispatch-routing-summary")
        ? claims.find((claim) => claim.id === "claim.dispatch-routing-summary").text
        : `Routing summary unavailable; missing evidence hints: ${
            missingTypes.length > 0 ? missingTypes.join(", ") : "none"
          }.`,
      sourceRefs: getAuthorityContextSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.dispatch-routing-summary")
        ? ["claim.dispatch-routing-summary"]
        : [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.RESOURCE_UNIT_CONTEXT,
      title: "Resource / Unit Context",
      body: claims.some((claim) => claim.id === "claim.dispatch-resource-unit-context")
        ? "Resource/unit context is source-backed in current input."
        : "Resource/unit context is not source-backed in current input.",
      sourceRefs: getDispatchContextSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.dispatch-resource-unit-context")
        ? ["claim.dispatch-resource-unit-context"]
        : [],
      absenceIds: collectIds([
        absences.some((absence) => absence.id === "absence.dispatch-resource-unit.missing")
          ? "absence.dispatch-resource-unit.missing"
          : null,
        absences.some((absence) => absence.id === "absence.dispatch-incident-context.missing")
          ? "absence.dispatch-incident-context.missing"
          : null,
      ]),
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.ABSENCE_NOTICES,
      title: "Absence Notices",
      body:
        absences.length > 0
          ? absences.map((absence) => absence.displayText).join(" ")
          : "No deterministic absence notices are active in current input.",
      sourceRefs:
        absenceSourceRefs.length > 0 ? absenceSourceRefs : getDecisionSourceRefs(input),
      claimIds: [],
      absenceIds: absences.map((absence) => absence.id),
      disclosureNoticeIds: [],
    },
  ];
}

const dispatchSkinDescriptor = Object.freeze({
  skinId: DISPATCH_SKIN_ID,
  title: "Civic Dispatch Skin",
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

    claims.push(buildDecisionClaim(input));

    const priorityClaim = buildPriorityClaim(input);
    if (priorityClaim) {
      claims.push(priorityClaim);
    }

    const responsibleOfficeClaim = buildResponsibleOfficeClaim(input);
    if (responsibleOfficeClaim) {
      claims.push(responsibleOfficeClaim);
    }

    const routingClaim = buildRoutingClaim(input);
    if (routingClaim) {
      claims.push(routingClaim);
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

    const resourceBundle = buildResourceUnitBundle(input);
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
        .concat(getConfidenceSourceRefs(input))
        .concat(getAuthoritySourceRefs(input))
        .concat(getRevocationSourceRefs(input))
        .concat(getAuthorityContextSourceRefs(input))
        .concat(getDispatchContextSourceRefs(input)),
    };
  },
});

module.exports = {
  DISPATCH_SKIN_ID,
  dispatchSkinDescriptor,
};
