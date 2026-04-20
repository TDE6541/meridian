const {
  CIVIC_SKIN_VIEW_TYPES,
} = require("../CivicSkinFramework");

const COUNCIL_SKIN_ID = "civic.council";

const VIEW_TYPES = new Set(CIVIC_SKIN_VIEW_TYPES);
const SUPPORTED_DOMAIN_IDS = new Set([
  "permit_authorization",
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
  public_notice_action: "Public notice action",
  decision_closure: "Decision closure",
  development_services: "Development Services",
  tpw_row: "Transportation and Public Works right-of-way",
  water_department: "Water Department",
});

const SECTION_IDS = Object.freeze({
  RESOLUTION_SUMMARY: "resolution-summary",
  OBLIGATION_STATUS: "obligation-status",
  GOVERNANCE_RATIONALE: "governance-rationale",
  PUBLIC_COMMENT_CONTEXT: "public-comment-context",
  VOTING_RECORD_CONTEXT: "voting-record-context",
  AUTHORITY_REVOCATION_NOTICE: "authority-revocation-notice",
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

function getRationale(input) {
  return isNonEmptyString(input.civic?.rationale)
    ? input.civic.rationale
    : "Governance rationale is not present in current input.";
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

function getPublicCommentContext(input) {
  const rawRequest = getRawRequest(input);
  return isPlainObject(rawRequest.authority_context?.public_comment_context)
    ? rawRequest.authority_context.public_comment_context
    : null;
}

function getVotingRecordContext(input) {
  const rawRequest = getRawRequest(input);
  return isPlainObject(rawRequest.authority_context?.voting_record_context)
    ? rawRequest.authority_context.voting_record_context
    : null;
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

function getPublicCommentSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("public_comment_context", "governanceSweep", false)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("authority_context.public_comment_context", "fixture", false)];
  }

  return [makeSourceRef("authority_context.public_comment_context", "authorityContext", false)];
}

function getVotingRecordSourceRefs(input) {
  if (input.sourceKind === "governance-sweep") {
    return [makeSourceRef("voting_record_context", "governanceSweep", false)];
  }

  if (input.sourceKind === "fixture") {
    return [makeSourceRef("authority_context.voting_record_context", "fixture", false)];
  }

  return [makeSourceRef("authority_context.voting_record_context", "authorityContext", false)];
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
      "claim.council-resolution",
      `Resolution posture is ${getDecision(input)}.`,
      "presented-source-truth",
      sourceRefs,
      confidenceTier
    ),
    createClaim(
      "claim.council-reason-label",
      `Resolution reason label: ${translateLabel(getReason(input))}.`,
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
    "claim.council-confidence-tier",
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
    "claim.council-obligation-status",
    `Obligation status ${promiseStatus.conditions_satisfied}/${promiseStatus.conditions_total} conditions satisfied.`,
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
              "absence.council-authority.not-in-input",
              "runtimeSubset.civic.authority_resolution",
              "NOT_IN_CURRENT_INPUT",
              "Authority context is not present in current input.",
              getAuthoritySourceRefs(input)
            )
          : null,
    };
  }

  return {
    claim: createClaim(
      "claim.council-authority-status",
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
              "absence.council-revocation.not-in-input",
              "runtimeSubset.civic.revocation",
              "NOT_IN_CURRENT_INPUT",
              "Revocation status is not present in current input.",
              getRevocationSourceRefs(input)
            )
          : null,
    };
  }

  return {
    claim: createClaim(
      "claim.council-revocation-status",
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

function buildPublicCommentBundle(input) {
  const context = getPublicCommentContext(input);
  if (!context) {
    return {
      claim: null,
      absence: createAbsence(
        "absence.council-public-comment.missing",
        "authority_context.public_comment_context",
        "SOURCE_FIELD_ABSENT",
        "Public hearing/comment context is absent from current source input.",
        getPublicCommentSourceRefs(input)
      ),
    };
  }

  const commentCount = Number.isInteger(context.comment_count)
    ? context.comment_count
    : null;
  const channels = toArray(context.channels).filter(isNonEmptyString).map(translateLabel);
  const summaryParts = [];

  if (commentCount !== null) {
    summaryParts.push(`comment count ${commentCount}`);
  }

  if (channels.length > 0) {
    summaryParts.push(`channels ${channels.join(", ")}`);
  }

  return {
    claim: createClaim(
      "claim.council-public-comment",
      summaryParts.length > 0
        ? `Public hearing/comment context present (${summaryParts.join("; ")}).`
        : "Public hearing/comment context is present in current source input.",
      "presented-source-truth",
      getPublicCommentSourceRefs(input),
      getConfidenceTier(input)
    ),
    absence: null,
  };
}

function buildVotingRecordBundle(input) {
  const context = getVotingRecordContext(input);
  if (!context) {
    return {
      claim: null,
      absence: createAbsence(
        "absence.council-voting-record.missing",
        "authority_context.voting_record_context",
        "SOURCE_FIELD_ABSENT",
        "Voting record context is absent from current source input.",
        getVotingRecordSourceRefs(input)
      ),
    };
  }

  const yesVotes = Number.isInteger(context.yes_votes) ? context.yes_votes : null;
  const noVotes = Number.isInteger(context.no_votes) ? context.no_votes : null;
  const abstainVotes = Number.isInteger(context.abstain_votes) ? context.abstain_votes : null;
  const voteSummary = [yesVotes, noVotes, abstainVotes].every((value) => value !== null)
    ? `yes/no/abstain: ${yesVotes}/${noVotes}/${abstainVotes}`
    : "counts are partially unavailable";

  return {
    claim: createClaim(
      "claim.council-voting-record",
      `Voting record context present (${voteSummary}).`,
      "presented-source-truth",
      getVotingRecordSourceRefs(input),
      getConfidenceTier(input)
    ),
    absence: null,
  };
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
  const promiseStatus = getPromiseStatus(input);
  const decision = getDecision(input);
  const reason = getReason(input);
  const commentAbsence = absences.find(
    (absence) => absence.id === "absence.council-public-comment.missing"
  );
  const votingAbsence = absences.find(
    (absence) => absence.id === "absence.council-voting-record.missing"
  );
  const authorityClaim = claims.find(
    (claim) => claim.id === "claim.council-authority-status"
  );
  const revocationClaim = claims.find(
    (claim) => claim.id === "claim.council-revocation-status"
  );
  const absenceSourceRefs = collectAbsenceSourceRefs(absences);

  return [
    {
      id: SECTION_IDS.RESOLUTION_SUMMARY,
      title: "Resolution Summary",
      body: `Council resolution posture is ${decision} (${translateLabel(reason)}).`,
      sourceRefs: getDecisionSourceRefs(input).concat(getConfidenceSourceRefs(input)),
      claimIds: collectIds([
        "claim.council-resolution",
        "claim.council-reason-label",
        claims.some((claim) => claim.id === "claim.council-confidence-tier")
          ? "claim.council-confidence-tier"
          : null,
      ]),
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.OBLIGATION_STATUS,
      title: "Obligation Status",
      body: promiseStatus
        ? `Obligations satisfied: ${promiseStatus.conditions_satisfied}/${promiseStatus.conditions_total}.`
        : "Obligation status is not present in current input.",
      sourceRefs: getPromiseSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.council-obligation-status")
        ? ["claim.council-obligation-status"]
        : [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.GOVERNANCE_RATIONALE,
      title: "Governance Rationale",
      body: getRationale(input),
      sourceRefs: getDecisionSourceRefs(input),
      claimIds: [],
      absenceIds: [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.PUBLIC_COMMENT_CONTEXT,
      title: "Public Hearing / Comment Context",
      body: commentAbsence
        ? commentAbsence.displayText
        : "Public hearing/comment context is present in current source input.",
      sourceRefs: getPublicCommentSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.council-public-comment")
        ? ["claim.council-public-comment"]
        : [],
      absenceIds: commentAbsence ? [commentAbsence.id] : [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.VOTING_RECORD_CONTEXT,
      title: "Voting Record Context",
      body: votingAbsence
        ? votingAbsence.displayText
        : "Voting record context is present in current source input.",
      sourceRefs: getVotingRecordSourceRefs(input),
      claimIds: claims.some((claim) => claim.id === "claim.council-voting-record")
        ? ["claim.council-voting-record"]
        : [],
      absenceIds: votingAbsence ? [votingAbsence.id] : [],
      disclosureNoticeIds: [],
    },
    {
      id: SECTION_IDS.AUTHORITY_REVOCATION_NOTICE,
      title: "Authority / Revocation Notice",
      body:
        revocationClaim?.text ||
        authorityClaim?.text ||
        (decision === "HOLD" || decision === "REVOKE" || decision === "BLOCK"
          ? `Decision ${decision} keeps authority/revocation handling active.`
          : "No active authority or revocation notices in current input."),
      sourceRefs: getAuthoritySourceRefs(input)
        .concat(getRevocationSourceRefs(input))
        .concat(getDecisionSourceRefs(input)),
      claimIds: collectIds([
        authorityClaim ? authorityClaim.id : null,
        revocationClaim ? revocationClaim.id : null,
      ]),
      absenceIds: collectIds([
        absences.some((absence) => absence.id === "absence.council-authority.not-in-input")
          ? "absence.council-authority.not-in-input"
          : null,
        absences.some((absence) => absence.id === "absence.council-revocation.not-in-input")
          ? "absence.council-revocation.not-in-input"
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

const councilSkinDescriptor = Object.freeze({
  skinId: COUNCIL_SKIN_ID,
  title: "Civic Council Skin",
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

    const publicCommentBundle = buildPublicCommentBundle(input);
    if (publicCommentBundle.claim) {
      claims.push(publicCommentBundle.claim);
    }
    if (publicCommentBundle.absence) {
      absences.push(publicCommentBundle.absence);
    }

    const votingBundle = buildVotingRecordBundle(input);
    if (votingBundle.claim) {
      claims.push(votingBundle.claim);
    }
    if (votingBundle.absence) {
      absences.push(votingBundle.absence);
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
        .concat(getPublicCommentSourceRefs(input))
        .concat(getVotingRecordSourceRefs(input)),
    };
  },
});

module.exports = {
  COUNCIL_SKIN_ID,
  councilSkinDescriptor,
};
