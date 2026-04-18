const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AUTHORITY_PROVENANCE_DEPTH_CAP,
} = require("../src/governance/runtime/deriveAuthorityRevocation");
const {
  GOVERNANCE_DECISIONS,
  GOVERNANCE_DECISION_VALUES,
  evaluateGovernanceRequest,
} = require("../src/governance/runtime/index.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createInspectionRequest() {
  return {
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "inspection-wave5-packet3-2000",
      entity_type: "inspection",
    },
    authority_context: {
      resolved: true,
      requested_by_role: "city_manager",
      required_approvals: ["fire_department"],
      resolved_approvals: ["fire_department"],
      missing_approvals: [],
      domain_context: {
        domain_id: "inspection_resolution",
        requester_org_id: "fw_city_manager",
        subject_department_id: "fire",
        jurisdiction_id: "city",
        evaluation_time: "2026-04-18T15:00:00.000Z",
        authority_grant: {
          status: "active",
          expires_at: "2026-12-31T00:00:00.000Z",
          revoked_at: null,
          superseded_at: null,
          jurisdiction: "city",
          scope_of_authority: ["inspection_resolution"],
          granted_by_entity_id: "decision-record-inspection-1",
          supersedes_grant_ids: [],
          delegation_chain_ids: ["grant-root", "grant-inspection-1"],
        },
      },
    },
    evidence_context: {
      required_count: 1,
      present_count: 1,
      missing_types: [],
    },
    confidence_context: null,
    candidate_signal_patch: null,
    raw_subject: "constellation.commands.fortworth-dev.inspection-wave5-packet3-2000",
  };
}

function createPermitRequest() {
  return {
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "permit-wave5-packet3-1000",
      entity_type: "permit_application",
    },
    authority_context: {
      resolved: true,
      requested_by_role: "city_manager",
      required_approvals: ["permit_office"],
      resolved_approvals: ["permit_office"],
      missing_approvals: [],
      domain_context: {
        domain_id: "permit_authorization",
        requester_org_id: "fw_city_manager",
        subject_department_id: "water_department",
        jurisdiction_id: "city",
        evaluation_time: "2026-04-18T15:00:00.000Z",
        authority_grant: {
          status: "active",
          expires_at: "2026-12-31T00:00:00.000Z",
          revoked_at: null,
          superseded_at: null,
          jurisdiction: "city",
          scope_of_authority: ["permit_authorization"],
          granted_by_entity_id: "decision-record-permit-1",
          supersedes_grant_ids: [],
          delegation_chain_ids: ["grant-root", "grant-permit-1"],
        },
        state_transition: {
          entity_type: "permit_application",
          from_state: "in_review",
          to_state: "approved",
        },
      },
    },
    evidence_context: {
      required_count: 1,
      present_count: 1,
      missing_types: [],
    },
    confidence_context: null,
    candidate_signal_patch: null,
    raw_subject: "constellation.commands.fortworth-dev.permit-wave5-packet3-1000",
  };
}

function addActorDelegation(request) {
  const next = clone(request);
  next.authority_context.actor_context = {
    actor_id: "actor:inspector_1",
    target_id: "authority:inspection_resolution",
    chain_depth_cap: 4,
    tuples: [
      {
        subject: "actor:inspector_1",
        relation: "member_of",
        object: "org:fire_department",
      },
      {
        subject: "org:fire_department",
        relation: "authorizes",
        object: "authority:inspection_resolution",
      },
    ],
  };

  return next;
}

test("authority revoke: decision vocabulary activates REVOKE", () => {
  assert.equal(GOVERNANCE_DECISIONS.REVOKE, "REVOKE");
  assert.ok(GOVERNANCE_DECISION_VALUES.includes("REVOKE"));
});

test("authority revoke: revoked grants emit REVOKE with additive civic revocation projection", () => {
  const request = createInspectionRequest();
  request.authority_context.domain_context.authority_grant.status = "revoked";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "REVOKE");
  assert.equal(result.reason, "authority_revoked_mid_action");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "ALLOW");
  assert.equal(result.runtimeSubset.civic.revocation.active, true);
  assert.equal(result.runtimeSubset.civic.revocation.reason, "authority_revoked_mid_action");
  assert.equal(result.runtimeSubset.civic.revocation.provenance_status, "valid");
  assert.equal(
    result.runtimeSubset.civic.rationale.decision,
    "Authority was revoked before the action completed."
  );
  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 4,
    conditions_satisfied: 3,
    oldest_open_condition_at: null,
  });
});

test("authority revoke: revoked timestamps emit REVOKE at action time", () => {
  const request = createInspectionRequest();
  request.authority_context.domain_context.authority_grant.revoked_at =
    "2026-04-18T14:59:00.000Z";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "REVOKE");
  assert.equal(result.reason, "authority_revoked_mid_action");
  assert.equal(result.runtimeSubset.civic.confidence.tier, "KILL");
});

test("authority revoke: revoked grants take precedence over supersession and cross-jurisdiction signals", () => {
  const request = createPermitRequest();
  request.authority_context.domain_context.authority_grant.status = "revoked";
  request.authority_context.domain_context.authority_grant.superseded_at =
    "2026-04-18T14:58:00.000Z";
  request.authority_context.domain_context.authority_grant.jurisdiction = "franchise";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "REVOKE");
  assert.equal(result.reason, "authority_revoked_mid_action");
});

test("authority revoke: permit supersession activates the approved overlap REVOKE path", () => {
  const request = createPermitRequest();
  request.authority_context.domain_context.authority_grant.status = "superseded";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "REVOKE");
  assert.equal(result.reason, "permit_superseded_by_overlap");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "ALLOW");
  assert.equal(
    result.runtimeSubset.civic.rationale.decision,
    "Permit authority was superseded by an overlapping grant."
  );
});

test("authority revoke: permit superseded timestamps activate REVOKE on the permit lane", () => {
  const request = createPermitRequest();
  request.authority_context.domain_context.authority_grant.superseded_at =
    "2026-04-18T14:59:00.000Z";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "REVOKE");
  assert.equal(result.reason, "permit_superseded_by_overlap");
});

test("authority revoke: superseded grants outside the permit lane do not emit REVOKE", () => {
  const request = createInspectionRequest();
  request.authority_context.domain_context.authority_grant.status = "superseded";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "authority_and_evidence_resolved");
  assert.equal(result.runtimeSubset.civic.revocation.active, false);
  assert.equal(result.runtimeSubset.civic.revocation.provenance_status, "valid");
});

test("authority revoke: cross-jurisdiction mismatches resolve against the requester", () => {
  const request = addActorDelegation(createInspectionRequest());
  request.authority_context.domain_context.authority_grant.jurisdiction = "franchise";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "REVOKE");
  assert.equal(result.reason, "cross_jurisdiction_resolved_against_requester");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "HOLD");
  assert.equal(result.runtimeSubset.civic.authority_resolution.domain.jurisdiction.matched, false);
});

test("authority revoke: unknown jurisdictions stay HOLD and do not emit REVOKE", () => {
  const request = createInspectionRequest();
  request.authority_context.domain_context.jurisdiction_id = "county";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "authority_jurisdiction_mismatch");
  assert.equal(result.runtimeSubset.civic.revocation.active, false);
  assert.equal(result.runtimeSubset.civic.revocation.provenance_status, "valid");
});

test("authority revoke: expired grants remain HOLD rather than REVOKE", () => {
  const request = createInspectionRequest();
  request.authority_context.domain_context.authority_grant.status = "expired";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "authority_expired_mid_action");
  assert.notEqual(result.decision, "REVOKE");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "HOLD");
});

test("authority revoke: phantom authority is detected separately from role or domain failures", () => {
  const request = createInspectionRequest();
  delete request.authority_context.domain_context.authority_grant;

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "phantom_authority_detected");
  assert.equal(result.runtimeSubset.civic.revocation.active, false);
  assert.equal(result.runtimeSubset.civic.revocation.provenance_status, "phantom");
  assert.equal(
    result.runtimeSubset.civic.rationale.decision,
    "Bounded authority grant provenance is missing."
  );
});

test("authority revoke: invalid provenance blocks when active grants omit bounded lineage", () => {
  const request = createInspectionRequest();
  delete request.authority_context.domain_context.authority_grant.granted_by_entity_id;
  request.authority_context.domain_context.authority_grant.delegation_chain_ids = [];

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_provenance_invalid");
  assert.equal(result.runtimeSubset.civic.revocation.active, false);
  assert.equal(result.runtimeSubset.civic.revocation.provenance_status, "invalid");
  assert.equal(
    result.runtimeSubset.civic.rationale.decision,
    "Bounded authority grant provenance failed validation."
  );
});

test("authority revoke: bounded provenance depth caps block deterministically", () => {
  const request = createInspectionRequest();
  request.authority_context.domain_context.authority_grant.delegation_chain_ids =
    Array.from({ length: AUTHORITY_PROVENANCE_DEPTH_CAP + 1 }, (_, index) => `grant-${index}`);

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_provenance_depth_exceeded");
  assert.equal(result.runtimeSubset.civic.revocation.checked_chain_depth, 5);
});

test("authority revoke: role and domain failures stay differentiated from phantom authority", () => {
  const request = createInspectionRequest();
  request.authority_context.requested_by_role = "unknown_role";
  delete request.authority_context.domain_context.authority_grant;

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_role_unrecognized");
  assert.equal(result.runtimeSubset.civic.revocation, undefined);
});

test("authority revoke: final decision composes domain actor grant and temporal truth without widening authority resolution", () => {
  const request = addActorDelegation(createInspectionRequest());
  request.authority_context.domain_context.authority_grant.status = "revoked";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "REVOKE");
  assert.equal(result.reason, "authority_revoked_mid_action");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "SUPERVISE");
  assert.equal(result.runtimeSubset.civic.authority_resolution.domain.decision, "ALLOW");
  assert.equal(result.runtimeSubset.civic.authority_resolution.actor.decision, "SUPERVISE");
  assert.deepEqual(
    Object.keys(result.runtimeSubset.civic.authority_resolution),
    ["decision", "reason", "conditions_total", "conditions_satisfied", "domain", "actor"]
  );
});
