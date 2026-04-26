const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  CIVIC_AUTHORITY_ROUTING_TABLE,
  extractExplicitAbsenceType,
  resolveCivicAuthorityForAbsence,
} = require("../../src/live/authority/civicAuthorityModel");

const EXPECTED_ROUTES = Object.freeze({
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

test("authority civic model: each authority-resolvable absence maps to expected route", () => {
  for (const [absenceType, expected] of Object.entries(EXPECTED_ROUTES)) {
    assert.deepEqual(CIVIC_AUTHORITY_ROUTING_TABLE[absenceType], expected);

    const result = resolveCivicAuthorityForAbsence({
      finding_id: `finding-${absenceType}`,
      absence_type: absenceType,
    });

    assert.equal(result.status, "resolved", absenceType);
    assert.equal(result.absence_type, absenceType);
    assert.equal(result.required_authority_role, expected.required_authority_role);
    assert.equal(
      result.required_authority_department,
      expected.required_authority_department
    );
    assert.equal(result.resolution_type, expected.resolution_type);
  }
});

test("authority civic model: known non-resolvable absence types return not-resolvable", () => {
  for (const absenceType of [
    "utility_conflict_assessment_missing",
    "data_gap",
    "temporal_coverage_gap",
  ]) {
    const result = resolveCivicAuthorityForAbsence({
      finding_id: `finding-${absenceType}`,
      absence_type: absenceType,
    });

    assert.equal(result.status, "not_resolvable", absenceType);
    assert.equal(result.absence_type, absenceType);
  }
});

test("authority civic model: unknown absence type returns HOLD", () => {
  const result = resolveCivicAuthorityForAbsence({
    finding_id: "finding-unknown",
    absence_type: "permit_or_inspection_authority_evidence_ref",
  });

  assert.equal(result.status, "HOLD");
  assert.equal(result.hold.code, "unknown_absence_type");
  assert.equal(result.hold.source_absence_id, "finding-unknown");
  assert.equal(result.hold.field, "absence_type");
});

test("authority civic model: missing required context returns HOLD where routing cannot be chosen", () => {
  const result = resolveCivicAuthorityForAbsence({
    finding_id: "finding-missing-context",
    entity_refs: ["entity-1"],
  });

  assert.equal(result.status, "HOLD");
  assert.equal(result.hold.code, "missing_absence_type");
  assert.equal(result.hold.field, "absence_type");
});

test("authority civic model: exact enum-like rule_id and missing_evidence are allowed without prose parsing", () => {
  const byRuleId = extractExplicitAbsenceType({
    rule_id: "inspection_signoff_absent",
  });
  const byMissingEvidence = extractExplicitAbsenceType({
    missing_evidence: ["public_notice_missing"],
  });
  const proseOnly = extractExplicitAbsenceType({
    missing_evidence: ["permit_or_inspection_authority_evidence_ref"],
    resolution_path:
      "Attach observed authority evidence to the permit or inspection decision.",
  });

  assert.equal(byRuleId.ok, true);
  assert.equal(byRuleId.type, "inspection_signoff_absent");
  assert.equal(byMissingEvidence.ok, true);
  assert.equal(byMissingEvidence.type, "public_notice_missing");
  assert.equal(proseOnly.ok, false);
  assert.equal(proseOnly.hold.code, "unknown_absence_type");
});

test("authority civic model: no OpenFGA, Auth0, network, dashboard, or Foreman behavior exists", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/authority/civicAuthorityModel.js"),
    "utf8"
  );

  assert.equal(/require\(["'][^"']*(dashboard|nats|src[\\/]skins)/.test(source), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(source), false);
  assert.equal(/OpenFGA|Auth0|Whisper|OpenAI/i.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
});
