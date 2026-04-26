const {
  AUTHORITY_RESOLVABLE_ABSENCE_TYPES,
  AUTHORITY_RESOLUTION_TYPES,
  NON_AUTHORITY_RESOLVABLE_ABSENCE_TYPES,
  cloneJsonValue,
  createAuthorityHold,
} = require("./authorityContracts");
const { isNonEmptyString, isPlainObject } = require("../contracts");

const CIVIC_AUTHORITY_ROLES = Object.freeze([
  "public_works_director",
  "fire_marshal",
  "city_attorney",
  "permitting_staff",
  "council_member",
  "dispatch",
  "judge_demo_operator",
  "public",
]);

const CIVIC_AUTHORITY_DEPARTMENTS = Object.freeze([
  "public_works",
  "fire_department",
  "legal",
  "permitting",
  "city_council",
  "dispatch",
  "public",
]);

const CIVIC_AUTHORITY_ROUTING_TABLE = Object.freeze({
  authority_evidence_missing: Object.freeze({
    required_authority_role: "public_works_director",
    required_authority_department: "public_works",
    resolution_type: "approval",
  }),
  jurisdiction_unresolved: Object.freeze({
    required_authority_role: "public_works_director",
    required_authority_department: "public_works",
    resolution_type: "jurisdiction_clarification",
  }),
  public_notice_missing: Object.freeze({
    required_authority_role: "city_attorney",
    required_authority_department: "legal",
    resolution_type: "public_notice_approval",
  }),
  inspection_signoff_absent: Object.freeze({
    required_authority_role: "permitting_staff",
    required_authority_department: "permitting",
    resolution_type: "signoff",
  }),
  delegation_unverified: Object.freeze({
    required_authority_role: "city_attorney",
    required_authority_department: "legal",
    resolution_type: "delegation_verification",
  }),
  interagency_concurrence_missing: Object.freeze({
    required_authority_role: "council_member",
    required_authority_department: "city_council",
    resolution_type: "concurrence",
  }),
});

const KNOWN_ABSENCE_TYPES = Object.freeze([
  ...AUTHORITY_RESOLVABLE_ABSENCE_TYPES,
  ...NON_AUTHORITY_RESOLVABLE_ABSENCE_TYPES,
]);

function getSourceAbsenceId(absence) {
  if (!isPlainObject(absence)) {
    return null;
  }

  return absence.finding_id || absence.absence_id || absence.id || null;
}

function getKnownType(value) {
  return isNonEmptyString(value) && KNOWN_ABSENCE_TYPES.includes(value)
    ? value
    : null;
}

function collectMissingEvidenceCandidates(value) {
  if (isNonEmptyString(value)) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter(isNonEmptyString);
  }

  return [];
}

function addCandidate(candidates, field, value) {
  const type = getKnownType(value);
  if (type) {
    candidates.push({ field, type });
  }
}

function extractExplicitAbsenceType(absence) {
  if (isNonEmptyString(absence)) {
    const type = getKnownType(absence);
    return type
      ? { ok: true, type, field: "absence_type" }
      : {
          ok: false,
          hold: createAuthorityHold({
            code: "unknown_absence_type",
            reason: `absence type is not recognized: ${absence}`,
            field: "absence_type",
            resolution_path:
              "Provide an explicit GARP authority-resolvable or known non-resolvable absence type.",
          }),
        };
  }

  if (!isPlainObject(absence)) {
    return {
      ok: false,
      hold: createAuthorityHold({
        code: "malformed_absence",
        reason: "absence must be a plain object or explicit absence type string.",
        field: "absence",
      }),
    };
  }

  const candidates = [];
  addCandidate(candidates, "absence_type", absence.absence_type);
  addCandidate(candidates, "missing_evidence_type", absence.missing_evidence_type);
  addCandidate(candidates, "rule_id", absence.rule_id);

  for (const value of collectMissingEvidenceCandidates(absence.missing_evidence)) {
    addCandidate(candidates, "missing_evidence", value);
  }

  const uniqueTypes = [...new Set(candidates.map((candidate) => candidate.type))];
  if (uniqueTypes.length === 1) {
    return {
      ok: true,
      type: uniqueTypes[0],
      field: candidates.find((candidate) => candidate.type === uniqueTypes[0])
        .field,
    };
  }

  if (uniqueTypes.length > 1) {
    return {
      ok: false,
      hold: createAuthorityHold({
        code: "ambiguous_absence_type",
        reason: `multiple explicit absence types were supplied: ${uniqueTypes.join(", ")}`,
        source_absence_id: getSourceAbsenceId(absence),
        field: "absence_type",
        resolution_path:
          "Provide one explicit GARP absence type before authority routing.",
      }),
    };
  }

  for (const field of ["absence_type", "missing_evidence_type", "rule_id"]) {
    if (isNonEmptyString(absence[field])) {
      return {
        ok: false,
        hold: createAuthorityHold({
          code: "unknown_absence_type",
          reason: `${field} is not a recognized GARP absence type: ${absence[field]}`,
          source_absence_id: getSourceAbsenceId(absence),
          field,
          resolution_path:
            "Use an explicit GARP authority-resolvable or known non-resolvable absence type.",
        }),
      };
    }
  }

  const missingEvidenceCandidates = collectMissingEvidenceCandidates(
    absence.missing_evidence
  );
  if (missingEvidenceCandidates.length > 0) {
    return {
      ok: false,
      hold: createAuthorityHold({
        code: "unknown_absence_type",
        reason:
          "missing_evidence did not contain an exact GARP absence type.",
        source_absence_id: getSourceAbsenceId(absence),
        field: "missing_evidence",
        resolution_path:
          "Supply an exact enum-like GARP absence type instead of prose or A4 signal text.",
      }),
    };
  }

  return {
    ok: false,
    hold: createAuthorityHold({
      code: "missing_absence_type",
      reason:
        "absence_type, missing_evidence_type, exact rule_id, or exact missing_evidence is required.",
      source_absence_id: getSourceAbsenceId(absence),
      field: "absence_type",
      resolution_path:
        "Supply an explicit GARP absence type before authority routing.",
    }),
  };
}

function validateRoutingEntry(absenceType, entry) {
  if (!entry) {
    return createAuthorityHold({
      code: "routing_missing",
      reason: `no civic authority route is configured for ${absenceType}`,
      field: "absence_type",
    });
  }

  if (!CIVIC_AUTHORITY_ROLES.includes(entry.required_authority_role)) {
    return createAuthorityHold({
      code: "unknown_authority_role",
      reason: `authority role is not in the G1 role vocabulary: ${entry.required_authority_role}`,
      field: "required_authority_role",
    });
  }

  if (!CIVIC_AUTHORITY_DEPARTMENTS.includes(entry.required_authority_department)) {
    return createAuthorityHold({
      code: "unknown_authority_department",
      reason: `authority department is not recognized: ${entry.required_authority_department}`,
      field: "required_authority_department",
    });
  }

  if (!AUTHORITY_RESOLUTION_TYPES.includes(entry.resolution_type)) {
    return createAuthorityHold({
      code: "unknown_resolution_type",
      reason: `resolution type is not recognized: ${entry.resolution_type}`,
      field: "resolution_type",
    });
  }

  return null;
}

function resolveCivicAuthorityForAbsence(absence) {
  const extracted = extractExplicitAbsenceType(absence);
  if (!extracted.ok) {
    return {
      status: "HOLD",
      absence_type: null,
      hold: extracted.hold,
    };
  }

  if (NON_AUTHORITY_RESOLVABLE_ABSENCE_TYPES.includes(extracted.type)) {
    return {
      status: "not_resolvable",
      absence_type: extracted.type,
      reason: "known_non_authority_resolvable_absence",
    };
  }

  if (!AUTHORITY_RESOLVABLE_ABSENCE_TYPES.includes(extracted.type)) {
    return {
      status: "HOLD",
      absence_type: extracted.type,
      hold: createAuthorityHold({
        code: "unknown_absence_type",
        reason: `absence type is not authority-resolvable in G2: ${extracted.type}`,
        source_absence_id: getSourceAbsenceId(absence),
        field: extracted.field,
      }),
    };
  }

  const entry = CIVIC_AUTHORITY_ROUTING_TABLE[extracted.type];
  const hold = validateRoutingEntry(extracted.type, entry);
  if (hold) {
    return {
      status: "HOLD",
      absence_type: extracted.type,
      hold,
    };
  }

  return {
    status: "resolved",
    absence_type: extracted.type,
    source_field: extracted.field,
    ...cloneJsonValue(entry),
  };
}

module.exports = {
  CIVIC_AUTHORITY_DEPARTMENTS,
  CIVIC_AUTHORITY_ROLES,
  CIVIC_AUTHORITY_ROUTING_TABLE,
  KNOWN_ABSENCE_TYPES,
  extractExplicitAbsenceType,
  resolveCivicAuthorityForAbsence,
};
