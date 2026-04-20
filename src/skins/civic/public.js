const {
  CIVIC_SKIN_VIEW_TYPES,
  buildCivicSkinInput,
  buildTruthFingerprint,
  normalizeCivicSkinInput,
} = require("../CivicSkinFramework");
const {
  PUBLIC_REDACTION_MARKERS,
  applyPublicRedaction,
  buildPublicDisclosureNotice,
  isApprovedPublicClaimLanguage,
} = require("../redaction");

const PUBLIC_SKIN_ID = "civic.public";

const VIEW_TYPES = new Set(CIVIC_SKIN_VIEW_TYPES);

const LABEL_MAP = Object.freeze({
  ALLOW: "Allow",
  BLOCK: "Block",
  GAP: "Gap",
  HOLD: "Hold",
  KILL: "Kill",
  REVOKE: "Revoke",
  SUPERVISE: "Supervise",
  WATCH: "Watch",
  authority_and_evidence_resolved: "Authority and evidence resolved",
  city_clerk: "City clerk",
  communications_coordinator: "Communications coordinator",
  communications_office: "Communications Office approval",
  decision_closure: "Decision closure",
  development_services: "Development Services approval",
  fire_department: "Fire Department approval",
  fire_inspector: "Fire inspector",
  hard_stop_domain_requires_manual_lane: "Manual lane required",
  inspection_resolution: "Inspection resolution",
  permit_authorization: "Permit authorization",
  public_notice_action: "Public notice action",
  records_office: "Records Office approval",
  supervised_domain_requires_operator_review: "Operator review required",
  tpw_row: "Transportation and Public Works right-of-way approval",
  utility_conflict_assessment: "Utility conflict assessment",
  water_department: "Water Department approval",
  water_ops_supervisor: "Water operations supervisor",
});

const SECTION_IDS = Object.freeze({
  DECISION_SUMMARY: "public-decision-summary",
  AUTHORITY_CONTEXT: "public-authority-context",
  CONFIDENCE_TIER: "public-confidence-tier",
  PROMISE_STATUS: "public-promise-status",
  REVOCATION_NOTICE: "public-revocation-notice",
  DISCLOSURE_BOUNDARY: "public-disclosure-boundary",
  DISCLOSURE_HOLD_NOTICES: "public-disclosure-hold-notices",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function normalizeIdentifier(value) {
  return String(value || "unknown")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function makeSourceRef(path, sourceKind, required = true) {
  return {
    path,
    sourceKind,
    required,
  };
}

function collectOutputSourceRefs(sections, claims, absences, redactions) {
  const dedupe = new Map();

  function addSourceRefs(sourceRefs) {
    for (const sourceRef of Array.isArray(sourceRefs) ? sourceRefs : []) {
      if (!isPlainObject(sourceRef)) {
        continue;
      }

      const key = `${sourceRef.path}|${sourceRef.sourceKind}|${sourceRef.required}`;
      dedupe.set(key, {
        path: sourceRef.path,
        sourceKind: sourceRef.sourceKind,
        required: sourceRef.required === true,
      });
    }
  }

  for (const section of sections) {
    addSourceRefs(section.sourceRefs);
  }

  for (const claim of claims) {
    addSourceRefs(claim.sourceRefs);
  }

  for (const absence of absences) {
    addSourceRefs(absence.sourceRefs);
  }

  for (const redaction of redactions) {
    addSourceRefs(redaction.sourceRefs);
  }

  return [...dedupe.values()].sort((left, right) => {
    const leftKey = `${left.path}|${left.sourceKind}|${left.required}`;
    const rightKey = `${right.path}|${right.sourceKind}|${right.required}`;
    return leftKey.localeCompare(rightKey);
  });
}

function getRawRequest(input) {
  if (isPlainObject(input.raw?.request)) {
    return input.raw.request;
  }

  if (isPlainObject(input.raw) && isNonEmptyString(input.raw.kind)) {
    return input.raw;
  }

  return {};
}

function assertApprovedLanguage(text) {
  if (!isApprovedPublicClaimLanguage(text)) {
    throw new Error(`Rejected public claim language detected: ${text}`);
  }

  return text;
}

function createClaim(id, text, claimKind, sourceRefs, confidenceTier = null) {
  return {
    id,
    text: assertApprovedLanguage(text),
    claimKind,
    sourceRefs,
    allowedAudience: ["public"],
    confidenceTier: isNonEmptyString(confidenceTier) ? confidenceTier : null,
  };
}

function createAbsence(id, path, displayText, sourceRefs) {
  return {
    id,
    path,
    reason: "PUBLIC_DISCLOSURE_HOLD",
    displayText: assertApprovedLanguage(displayText),
    sourceRefs,
  };
}

function createSection(id, title, bodyLines, sourceRefs, claimIds, absenceIds, disclosureNoticeIds) {
  return {
    id,
    title,
    body: bodyLines.map((line) => assertApprovedLanguage(line)),
    sourceRefs,
    claimIds,
    absenceIds,
    disclosureNoticeIds,
  };
}

function translateLabel(token, fallback = "Detail withheld") {
  if (!isNonEmptyString(token)) {
    return fallback;
  }

  return LABEL_MAP[token] || fallback;
}

function translateDecisionReason(reason) {
  if (!isNonEmptyString(reason)) {
    return null;
  }

  if (LABEL_MAP[reason]) {
    return LABEL_MAP[reason];
  }

  if (reason.startsWith("missing_approvals=") || reason.includes("missing_evidence_types=")) {
    return "Unresolved approvals or evidence remain";
  }

  if (reason.includes("evidence_gap=")) {
    return "Evidence gap remains unresolved";
  }

  return null;
}

function isSafePublicText(text, redLineTokens) {
  if (!isNonEmptyString(text) || text.length > 180) {
    return false;
  }

  if (/[_=;]/.test(text)) {
    return false;
  }

  return redLineTokens.every((token) => !isNonEmptyString(token) || !text.includes(token));
}

function createDisclosureRedaction(path, category, sourceRefs) {
  const notice = buildPublicDisclosureNotice(category, path);

  return {
    id: `redaction.${normalizeIdentifier(category)}.${normalizeIdentifier(path)}`,
    path: notice.path,
    category: notice.category,
    marker: PUBLIC_REDACTION_MARKERS[notice.category],
    noticeId: notice.id,
    basis: notice.basis,
    text: notice.text,
    sourceRefs,
  };
}

function buildRequiredCanonicalAbsences(input) {
  const absences = [];
  const requiredFields = [
    {
      path: "civic.decision",
      ok: isNonEmptyString(input.civic?.decision),
      text: "Public disclosure hold: decision detail is missing from canonical truth.",
    },
    {
      path: "civic.reason",
      ok: isNonEmptyString(input.civic?.reason),
      text: "Public disclosure hold: decision reason detail is missing from canonical truth.",
    },
    {
      path: "civic.rationale",
      ok: isNonEmptyString(input.civic?.rationale),
      text: "Public disclosure hold: rationale detail is missing from canonical truth.",
    },
    {
      path: "civic.confidence.tier",
      ok: isNonEmptyString(input.civic?.confidence?.tier),
      text: "Public disclosure hold: confidence tier detail is missing from canonical truth.",
    },
    {
      path: "civic.promise_status.conditions_total",
      ok: isNonNegativeInteger(input.civic?.promise_status?.conditions_total),
      text: "Public disclosure hold: promise-status total count is missing from canonical truth.",
    },
    {
      path: "civic.promise_status.conditions_satisfied",
      ok: isNonNegativeInteger(input.civic?.promise_status?.conditions_satisfied),
      text: "Public disclosure hold: promise-status satisfied count is missing from canonical truth.",
    },
  ];

  for (const field of requiredFields) {
    if (field.ok) {
      continue;
    }

    absences.push(
      createAbsence(
        `absence.public-disclosure-hold.${normalizeIdentifier(field.path)}`,
        field.path,
        field.text,
        [makeSourceRef(field.path.replace(/^civic\./, "runtimeSubset.civic."), "runtimeSubset.civic", true)]
      )
    );
  }

  return absences;
}

function buildPublicRenderPayload(input) {
  const request = getRawRequest(input);
  const confidenceTier = isNonEmptyString(input.civic?.confidence?.tier)
    ? input.civic.confidence.tier
    : null;
  const redLineTokens = [
    request.org_id,
    request.entity_ref?.entity_id,
    request.raw_subject,
  ];

  const claims = [];
  const absences = buildRequiredCanonicalAbsences(input);
  const boundaryBundle = applyPublicRedaction(input);
  const redactions = boundaryBundle.redactions.slice();

  const decisionLabel = translateLabel(input.civic?.decision, "Decision withheld");
  claims.push(
    createClaim(
      "claim.public-decision.value",
      `Public decision: ${decisionLabel}.`,
      "presented-source-truth",
      [makeSourceRef("runtimeSubset.civic.decision", "runtimeSubset.civic", true)],
      confidenceTier
    )
  );

  const reasonLabel = translateDecisionReason(input.civic?.reason);
  if (reasonLabel) {
    claims.push(
      createClaim(
        "claim.public-decision.reason",
        `Public decision reason: ${reasonLabel}.`,
        "label-translation",
        [makeSourceRef("runtimeSubset.civic.reason", "runtimeSubset.civic", true)],
        confidenceTier
      )
    );
  } else {
    absences.push(
      createAbsence(
        "absence.public-decision.reason-held",
        "civic.reason",
        "Public disclosure hold: decision reason detail is not release-ready for public text.",
        [makeSourceRef("runtimeSubset.civic.reason", "runtimeSubset.civic", true)]
      )
    );
  }

  let rationaleLine = "Rationale detail is withheld under the public disclosure boundary.";
  if (isSafePublicText(input.civic?.rationale, redLineTokens)) {
    const rationaleText = `Public rationale: ${input.civic.rationale}`;
    claims.push(
      createClaim(
        "claim.public-decision.rationale",
        `${rationaleText}.`,
        "presented-source-truth",
        [makeSourceRef("runtimeSubset.civic.rationale", "runtimeSubset.civic", true)],
        confidenceTier
      )
    );
    rationaleLine = rationaleText + ".";
  } else if (isNonEmptyString(input.civic?.rationale)) {
    redactions.push(
      createDisclosureRedaction("civic.rationale", "free-form-text-redacted", [
        makeSourceRef("runtimeSubset.civic.rationale", "runtimeSubset.civic", true),
      ])
    );
    absences.push(
      createAbsence(
        "absence.public-rationale.held",
        "civic.rationale",
        "Public disclosure hold: free-form rationale detail is withheld.",
        [makeSourceRef("runtimeSubset.civic.rationale", "runtimeSubset.civic", true)]
      )
    );
    rationaleLine = `Rationale detail: ${PUBLIC_REDACTION_MARKERS["free-form-text-redacted"]}.`;
  }

  const roleLabel = translateLabel(
    request.authority_context?.requested_by_role,
    "Role detail withheld"
  );
  claims.push(
    createClaim(
      "claim.public-role.requested-by",
      `Public requester role: ${roleLabel}.`,
      "label-translation",
      [makeSourceRef("authority_context.requested_by_role", "authorityContext", false)],
      confidenceTier
    )
  );

  const authorityClaims = [];
  for (const approval of Array.isArray(request.authority_context?.required_approvals)
    ? request.authority_context.required_approvals
    : []) {
    authorityClaims.push(
      createClaim(
        `claim.public-required-approval.${normalizeIdentifier(approval)}`,
        `Required approval named in source: ${translateLabel(approval)}.`,
        "label-translation",
        [makeSourceRef("authority_context.required_approvals", "authorityContext", false)],
        confidenceTier
      )
    );
  }

  for (const approval of Array.isArray(request.authority_context?.resolved_approvals)
    ? request.authority_context.resolved_approvals
    : []) {
    authorityClaims.push(
      createClaim(
        `claim.public-resolved-approval.${normalizeIdentifier(approval)}`,
        `Resolved approval named in source: ${translateLabel(approval)}.`,
        "label-translation",
        [makeSourceRef("authority_context.resolved_approvals", "authorityContext", false)],
        confidenceTier
      )
    );
  }

  for (const approval of Array.isArray(request.authority_context?.missing_approvals)
    ? request.authority_context.missing_approvals
    : []) {
    authorityClaims.push(
      createClaim(
        `claim.public-missing-approval.${normalizeIdentifier(approval)}`,
        `Missing approval named in source: ${translateLabel(approval)}.`,
        "label-translation",
        [makeSourceRef("authority_context.missing_approvals", "authorityContext", false)],
        confidenceTier
      )
    );
  }

  for (const evidenceType of Array.isArray(request.evidence_context?.missing_types)
    ? request.evidence_context.missing_types
    : []) {
    authorityClaims.push(
      createClaim(
        `claim.public-missing-evidence.${normalizeIdentifier(evidenceType)}`,
        `Missing evidence named in source: ${translateLabel(evidenceType)}.`,
        "label-translation",
        [makeSourceRef("evidence_context.missing_types", "rawInput", false)],
        confidenceTier
      )
    );
  }

  claims.push(...authorityClaims);

  claims.push(
    createClaim(
      "claim.public-confidence-tier",
      `Public confidence tier: ${translateLabel(input.civic?.confidence?.tier, "Confidence tier withheld")}.`,
      "derived-runtime-truth",
      [makeSourceRef("runtimeSubset.civic.confidence", "runtimeSubset.civic", true)],
      confidenceTier
    )
  );

  claims.push(
    createClaim(
      "claim.public-promise-status",
      `Promise status count: ${input.civic?.promise_status?.conditions_satisfied ?? 0} of ${input.civic?.promise_status?.conditions_total ?? 0} conditions satisfied.`,
      "derived-runtime-truth",
      [makeSourceRef("runtimeSubset.civic.promise_status", "runtimeSubset.civic", true)],
      confidenceTier
    )
  );

  const revocationActive = input.civic?.revocation?.active === true;
  if (revocationActive) {
    claims.push(
      createClaim(
        "claim.public-revocation.active",
        "Public revocation status: active.",
        "presented-source-truth",
        [makeSourceRef("runtimeSubset.civic.revocation", "runtimeSubset.civic", false)],
        confidenceTier
      )
    );
  }

  const disclosureNoticeIds = redactions.map((entry) => entry.noticeId);

  const decisionAbsenceIds = absences
    .filter((absence) => /^civic\.(decision|reason|rationale|confidence)/.test(absence.path))
    .map((absence) => absence.id);
  const holdNoticeLines =
    absences.length > 0
      ? absences.map((absence) => absence.displayText)
      : ["No disclosure holds are active for this public rendering path."];

  const sections = [
    createSection(
      SECTION_IDS.DECISION_SUMMARY,
      "Public Decision Summary",
      [
        `Decision label: ${decisionLabel}.`,
        reasonLabel
          ? `Reason label: ${reasonLabel}.`
          : "Reason label is held under the public disclosure boundary.",
        rationaleLine,
      ],
      [
        makeSourceRef("runtimeSubset.civic.decision", "runtimeSubset.civic", true),
        makeSourceRef("runtimeSubset.civic.reason", "runtimeSubset.civic", true),
        makeSourceRef("runtimeSubset.civic.rationale", "runtimeSubset.civic", true),
      ],
      claims
        .filter((claim) => claim.id.startsWith("claim.public-decision."))
        .map((claim) => claim.id),
      decisionAbsenceIds,
      []
    ),
    createSection(
      SECTION_IDS.AUTHORITY_CONTEXT,
      "Public Authority Context",
      [
        `Requester role label: ${roleLabel}.`,
        `Required approvals named in source: ${authorityClaims.filter((claim) => claim.id.startsWith("claim.public-required-approval.")).length}.`,
        `Resolved approvals named in source: ${authorityClaims.filter((claim) => claim.id.startsWith("claim.public-resolved-approval.")).length}.`,
        `Missing approvals named in source: ${authorityClaims.filter((claim) => claim.id.startsWith("claim.public-missing-approval.")).length}.`,
        `Missing evidence types named in source: ${authorityClaims.filter((claim) => claim.id.startsWith("claim.public-missing-evidence.")).length}.`,
      ],
      [
        makeSourceRef("authority_context.requested_by_role", "authorityContext", false),
        makeSourceRef("authority_context.required_approvals", "authorityContext", false),
        makeSourceRef("authority_context.resolved_approvals", "authorityContext", false),
        makeSourceRef("authority_context.missing_approvals", "authorityContext", false),
        makeSourceRef("evidence_context.missing_types", "rawInput", false),
      ],
      claims
        .filter(
          (claim) =>
            claim.id.startsWith("claim.public-role.") ||
            claim.id.startsWith("claim.public-required-approval.") ||
            claim.id.startsWith("claim.public-resolved-approval.") ||
            claim.id.startsWith("claim.public-missing-approval.") ||
            claim.id.startsWith("claim.public-missing-evidence.")
        )
        .map((claim) => claim.id),
      [],
      []
    ),
    createSection(
      SECTION_IDS.CONFIDENCE_TIER,
      "Public Confidence Tier",
      [`Confidence tier label: ${translateLabel(input.civic?.confidence?.tier, "Confidence tier withheld")}.`],
      [makeSourceRef("runtimeSubset.civic.confidence", "runtimeSubset.civic", true)],
      ["claim.public-confidence-tier"],
      absences
        .filter((absence) => absence.path === "civic.confidence.tier")
        .map((absence) => absence.id),
      []
    ),
    createSection(
      SECTION_IDS.PROMISE_STATUS,
      "Public Promise Status",
      [
        `Conditions satisfied: ${input.civic?.promise_status?.conditions_satisfied ?? 0}.`,
        `Conditions total: ${input.civic?.promise_status?.conditions_total ?? 0}.`,
        isNonEmptyString(input.civic?.promise_status?.oldest_open_condition_at)
          ? `Oldest open condition date: ${input.civic.promise_status.oldest_open_condition_at}.`
          : "Oldest open condition date is not present in current input.",
      ],
      [makeSourceRef("runtimeSubset.civic.promise_status", "runtimeSubset.civic", true)],
      ["claim.public-promise-status"],
      absences
        .filter((absence) => absence.path.startsWith("civic.promise_status."))
        .map((absence) => absence.id),
      []
    ),
    createSection(
      SECTION_IDS.REVOCATION_NOTICE,
      "Public Revocation Notice",
      revocationActive
        ? [
            "Revocation status: active.",
            input.civic?.revocation?.reason && translateDecisionReason(input.civic.revocation.reason)
              ? `Revocation reason label: ${translateDecisionReason(input.civic.revocation.reason)}.`
              : "Revocation reason label is not present in current input.",
          ]
        : ["No active revocation detail is present in current input."],
      [makeSourceRef("runtimeSubset.civic.revocation", "runtimeSubset.civic", false)],
      revocationActive ? ["claim.public-revocation.active"] : [],
      [],
      []
    ),
    createSection(
      SECTION_IDS.DISCLOSURE_BOUNDARY,
      "Public Disclosure Boundary",
      [
        `Deterministic demo redaction count: ${redactions.length}.`,
        "This TPIA-aware public disclosure boundary is not legal review and not request adjudication.",
      ],
      collectOutputSourceRefs([], [], [], redactions),
      [],
      [],
      disclosureNoticeIds
    ),
    createSection(
      SECTION_IDS.DISCLOSURE_HOLD_NOTICES,
      "Public Disclosure Hold Notices",
      holdNoticeLines,
      absences.flatMap((absence) => absence.sourceRefs),
      [],
      absences.map((absence) => absence.id),
      []
    ),
  ];

  const hasRequiredCanonicalHold = absences.some((absence) =>
    [
      "civic.decision",
      "civic.reason",
      "civic.rationale",
      "civic.confidence.tier",
      "civic.promise_status.conditions_total",
      "civic.promise_status.conditions_satisfied",
    ].includes(absence.path)
  );

  return {
    sections,
    claims,
    absences,
    redactions,
    fallback: hasRequiredCanonicalHold
      ? {
          active: true,
          code: "PUBLIC_DISCLOSURE_HOLD",
          message:
            "Public disclosure hold is active because required canonical truth is missing.",
        }
      : {
          active: false,
          code: null,
          message: null,
        },
    sourceRefs: collectOutputSourceRefs(sections, claims, absences, redactions),
  };
}

const publicSkinDescriptor = Object.freeze({
  skinId: PUBLIC_SKIN_ID,
  title: "Civic Public Transparency Skin",
  supports(input) {
    return isPlainObject(input) && VIEW_TYPES.has(input.viewType);
  },
  render(input) {
    const normalizedInput = normalizeCivicSkinInput(input);
    return buildPublicRenderPayload(normalizedInput);
  },
});

function renderPublicSkin(source, options = {}) {
  const input = buildCivicSkinInput(source, {
    ...(isPlainObject(options) ? options : {}),
    audience: "public",
  });
  const truthFingerprint = buildTruthFingerprint(input);
  const rendered = buildPublicRenderPayload(input);

  return {
    skinId: PUBLIC_SKIN_ID,
    viewType: input.viewType,
    audience: "public",
    truthFingerprint,
    sections: rendered.sections,
    claims: rendered.claims,
    absences: rendered.absences,
    redactions: rendered.redactions,
    fallback: rendered.fallback,
    sourceRefs: rendered.sourceRefs,
  };
}

module.exports = {
  PUBLIC_SKIN_ID,
  publicSkinDescriptor,
  renderPublicSkin,
};
