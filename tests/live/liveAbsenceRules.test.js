const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const {
  MINIMUM_LIVE_ABSENCE_RULE_IDS,
  createDefaultLiveAbsenceProfile,
} = require("../../src/live/absence/liveAbsenceProfiles");
const {
  evaluateLiveAbsenceRules,
  normalizeCurrentLiveState,
} = require("../../src/live/absence/liveAbsenceRules");

const RULE_INPUTS = Object.freeze({
  utility_conflict_requires_authority_or_evidence: Object.freeze({
    touches_utility_asset: true,
    authority_or_evidence_present: false,
  }),
  emergency_utility_incident_requires_public_notice_posture: Object.freeze({
    emergency_utility_incident: true,
    public_notice_posture_present: false,
  }),
  permit_or_inspection_decision_requires_authority_evidence: Object.freeze({
    permit_or_inspection_decision_activity: true,
    authority_evidence_present: false,
  }),
  public_disclosure_requires_redaction_boundary: Object.freeze({
    public_facing_output: true,
    redaction_boundary_present: false,
  }),
  franchise_asset_conflict_requires_jurisdiction_clarification: Object.freeze({
    franchise_asset_conflict: true,
    jurisdiction_clarification_present: false,
  }),
  obligation_without_owner_creates_unresolved_obligation_absence: Object.freeze({
    obligation_present: true,
    owner_present: false,
  }),
});

const SATISFIED_FIELDS = Object.freeze({
  utility_conflict_requires_authority_or_evidence:
    "authority_or_evidence_present",
  emergency_utility_incident_requires_public_notice_posture:
    "public_notice_posture_present",
  permit_or_inspection_decision_requires_authority_evidence:
    "authority_evidence_present",
  public_disclosure_requires_redaction_boundary: "redaction_boundary_present",
  franchise_asset_conflict_requires_jurisdiction_clarification:
    "jurisdiction_clarification_present",
  obligation_without_owner_creates_unresolved_obligation_absence: "owner_present",
});

function createState(ruleId, overrides = {}) {
  return {
    session_id: "session-a4-rules",
    absence_inputs: [
      {
        rule_id: ruleId,
        entity_refs: [`entity-${ruleId}`],
        source_refs: [`record:${ruleId}`, `delta:${ruleId}`],
        ...RULE_INPUTS[ruleId],
        ...overrides,
      },
    ],
  };
}

test("live absence rules: each minimum rule can produce a sourced live finding", () => {
  for (const ruleId of MINIMUM_LIVE_ABSENCE_RULE_IDS) {
    const result = evaluateLiveAbsenceRules(createState(ruleId));

    assert.equal(result.status, "PASS", `${ruleId}: ${result.issues.join("\n")}`);
    assert.equal(result.findings.length, 1, ruleId);
    assert.equal(result.findings[0].rule_id, ruleId);
    assert.equal(result.findings[0].origin, "live_computed");
    assert.equal(result.findings[0].source_refs.length > 0, true);
    assert.equal(typeof result.findings[0].why_this_matters, "string");
    assert.equal(result.findings[0].why_this_matters.length > 0, true);
  }
});

test("live absence rules: missing required input emits HOLD, not fabricated finding", () => {
  const result = evaluateLiveAbsenceRules(
    createState("utility_conflict_requires_authority_or_evidence", {
      authority_or_evidence_present: undefined,
    })
  );

  assert.equal(result.status, "HOLD");
  assert.equal(result.findings.length, 0);
  assert.equal(result.holds.length, 1);
  assert.deepEqual(result.holds[0].missing_inputs, [
    "authority_or_evidence_present",
  ]);
});

test("live absence rules: satisfied state produces no finding", () => {
  for (const ruleId of MINIMUM_LIVE_ABSENCE_RULE_IDS) {
    const result = evaluateLiveAbsenceRules(
      createState(ruleId, {
        [SATISFIED_FIELDS[ruleId]]: true,
      })
    );

    assert.equal(result.findings.length, 0, ruleId);
    assert.equal(result.holds.length, 0, ruleId);
    assert.equal(
      result.rule_results.find((entry) => entry.rule_id === ruleId).status,
      "satisfied",
      ruleId
    );
  }
});

test("live absence rules: not-applicable state produces no finding", () => {
  const result = evaluateLiveAbsenceRules({
    session_id: "session-a4-rules",
    absence_inputs: [
      {
        rule_id: "utility_conflict_requires_authority_or_evidence",
        touches_utility_asset: false,
        authority_or_evidence_present: false,
        source_refs: ["record:not-applicable"],
      },
    ],
  });

  assert.equal(result.findings.length, 0);
  assert.equal(result.holds.length, 0);
  assert.equal(
    result.rule_results.find(
      (entry) =>
        entry.rule_id === "utility_conflict_requires_authority_or_evidence"
    ).status,
    "not_applicable"
  );
});

test("live absence rules: input is not mutated", () => {
  const input = createState("public_disclosure_requires_redaction_boundary");
  const before = JSON.parse(JSON.stringify(input));

  evaluateLiveAbsenceRules(input);

  assert.deepEqual(input, before);
});

test("live absence rules: no counterfactual finding is created without source refs", () => {
  const result = evaluateLiveAbsenceRules(
    createState("franchise_asset_conflict_requires_jurisdiction_clarification", {
      source_refs: [],
      source_ref: null,
    })
  );

  assert.equal(result.findings.length, 0);
  assert.equal(result.holds.length, 1);
  assert.deepEqual(result.holds[0].missing_inputs, ["source_refs"]);
});

test("live absence rules: normalized state extracts explicit absence inputs from records", () => {
  const state = normalizeCurrentLiveState({
    records: [
      {
        record_id: "record-a4",
        session_id: "session-a4-rules",
        type: "entity.delta.accepted",
        payload: {
          delta: {
            delta_id: "delta-a4",
            session_id: "session-a4-rules",
            entity_type: "action_request",
            entity_id: "action-a4",
            source: {
              type: "live_gateway",
              ref: "source-a4",
            },
            governance_context: {
              absence_inputs: {
                utility_conflict_requires_authority_or_evidence: {
                  touches_utility_asset: true,
                  authority_or_evidence_present: false,
                },
              },
            },
            authority_context: {},
          },
        },
      },
    ],
  });

  assert.equal(state.absence_inputs.length, 1);
  assert.equal(
    state.absence_inputs[0].rule_id,
    "utility_conflict_requires_authority_or_evidence"
  );
  assert.ok(state.absence_inputs[0].source_refs.includes("record:record-a4"));
});

test("live absence rules: malformed profile fails closed", () => {
  const profile = createDefaultLiveAbsenceProfile();
  profile.rules = [];

  const result = evaluateLiveAbsenceRules(
    createState("utility_conflict_requires_authority_or_evidence"),
    profile
  );

  assert.equal(result.status, "HOLD");
  assert.match(result.issues.join("\n"), /minimum rule missing/);
});

test("live absence rules: no model, API, network, dashboard, skins, or Foreman behavior", () => {
  const source = readFileSync(
    path.join(__dirname, "../../src/live/absence/liveAbsenceRules.js"),
    "utf8"
  );

  assert.equal(/require\(["'][^"']*(dashboard|src[\\/]skins|nats)/.test(source), false);
  assert.equal(/fetch\s*\(|https?:\/\//i.test(source), false);
  assert.equal(/OpenAI|Whisper|Auth0|OpenFGA/i.test(source), false);
  assert.equal(/foreman_api|foreman_model|voice|avatar/i.test(source), false);
});
