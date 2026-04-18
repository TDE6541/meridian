const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const {
  evaluateGovernanceRequest,
  resolveAuthorityDomain,
} = require("../src/governance/runtime/index.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createPermitDomainRequest() {
  return {
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "permit-wave5-2026-1000",
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
          jurisdiction: "city",
          scope_of_authority: ["permit_authorization"],
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
    raw_subject: "constellation.commands.fortworth-dev.permit-wave5-2026-1000",
  };
}

function createInspectionDomainRequest() {
  return {
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "inspection-wave5-2026-2000",
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
          jurisdiction: "city",
          scope_of_authority: ["inspection_resolution"],
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
    raw_subject: "constellation.commands.fortworth-dev.inspection-wave5-2026-2000",
  };
}

test("authority domain: city manager final permit transition resolves ALLOW", () => {
  const result = resolveAuthorityDomain(createPermitDomainRequest(), {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "authority_domain_resolved");
  assert.equal(result.declaration_mode, "city_manager_final");
  assert.equal(result.portfolio_status, "cross_portfolio_review");
  assert.equal(result.state_transition.valid, true);
});

test("authority domain: ACM portfolio review permit transition resolves SUPERVISE", () => {
  const request = createPermitDomainRequest();
  request.authority_context.requested_by_role = "acm_development_infrastructure";
  request.authority_context.domain_context.requester_org_id =
    "fw_acm_development_infrastructure";
  request.authority_context.domain_context.state_transition.from_state = "submitted";
  request.authority_context.domain_context.state_transition.to_state = "in_review";

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.reason, "authority_portfolio_review_required");
  assert.equal(result.declaration_mode, "portfolio_review");
  assert.equal(result.portfolio_status, "match");
});

test("authority domain: blocks unrecognized role ids", () => {
  const request = createPermitDomainRequest();
  request.authority_context.requested_by_role = "unknown_role";

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_role_unrecognized");
});

test("authority domain: blocks grant scopes that do not authorize the domain", () => {
  const request = createPermitDomainRequest();
  request.authority_context.domain_context.authority_grant.scope_of_authority = [
    "inspection_resolution",
  ];

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_grant_scope_unauthorized_for_domain");
});

test("authority domain: holds portfolio mismatches across ACM portfolios", () => {
  const request = createPermitDomainRequest();
  request.authority_context.requested_by_role = "acm_public_space_planning";
  request.authority_context.domain_context.requester_org_id =
    "fw_acm_public_space_planning";
  request.authority_context.domain_context.subject_department_id = "water_department";
  request.authority_context.domain_context.state_transition.from_state = "submitted";
  request.authority_context.domain_context.state_transition.to_state = "in_review";

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "authority_portfolio_mismatch");
  assert.equal(result.portfolio_status, "mismatch");
});

test("authority domain: records city manager cross-portfolio review without treating it as a mismatch", () => {
  const result = resolveAuthorityDomain(createPermitDomainRequest(), {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.portfolio_status, "cross_portfolio_review");
  assert.equal(result.decision, "ALLOW");
});

test("authority domain: holds expired grants by explicit status", () => {
  const request = createPermitDomainRequest();
  request.authority_context.domain_context.authority_grant.status = "expired";

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "authority_expired_mid_action");
  assert.deepEqual(result.omissions, [
    {
      omission_id: "authority_expired_mid_action",
      reason: "authority_expired_mid_action",
    },
  ]);
});

test("authority domain: holds expired grants by timestamp comparison", () => {
  const request = createPermitDomainRequest();
  request.authority_context.domain_context.authority_grant.expires_at =
    "2026-04-18T14:59:00.000Z";

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "authority_expired_mid_action");
});

test("authority domain: holds jurisdiction mismatches when grants diverge from explicit input", () => {
  const request = createPermitDomainRequest();
  request.authority_context.domain_context.authority_grant.jurisdiction = "franchise";

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "authority_jurisdiction_mismatch");
  assert.deepEqual(result.omissions, [
    {
      omission_id: "authority_jurisdiction_mismatch",
      reason: "authority_jurisdiction_mismatch",
    },
  ]);
});

test("authority domain: blocks invalid portfolio-review permit transitions", () => {
  const request = createPermitDomainRequest();
  request.authority_context.requested_by_role = "acm_development_infrastructure";
  request.authority_context.domain_context.requester_org_id =
    "fw_acm_development_infrastructure";
  request.authority_context.domain_context.state_transition.from_state = "in_review";
  request.authority_context.domain_context.state_transition.to_state = "approved";

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_invalid_state_transition");
});

test("authority domain: blocks malformed domain contexts", () => {
  const request = createPermitDomainRequest();
  request.authority_context.domain_context.authority_grant.scope_of_authority =
    "permit_authorization";

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_domain_context_invalid");
});

test("authority domain: stays inactive when Packet 2 domain context is absent", () => {
  const request = createPermitDomainRequest();
  delete request.authority_context.domain_context;

  const result = resolveAuthorityDomain(request, {
    domainIds: ["permit_authorization"],
  });

  assert.deepEqual(result, {
    active: false,
    decision: null,
    reason: "authority_domain_not_requested",
  });
});

test("authority domain: exposes bounded authority_resolution on an ALLOW-capable inspection path", () => {
  const result = evaluateGovernanceRequest(createInspectionDomainRequest());

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "ALLOW");
  assert.equal(result.runtimeSubset.civic.authority_resolution.domain.decision, "ALLOW");
  assert.equal(
    result.runtimeSubset.civic.authority_resolution.domain.requested_role_id,
    "city_manager"
  );
  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 3,
    conditions_satisfied: 3,
    oldest_open_condition_at: null,
  });
});

test("authority domain: produces HOLD without emitting REVOKE when the authority grant expires", () => {
  const request = createInspectionDomainRequest();
  request.authority_context.domain_context.authority_grant.status = "expired";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "authority_expired_mid_action");
  assert.notEqual(result.decision, "REVOKE");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "HOLD");
  assert.equal(
    result.runtimeSubset.civic.authority_resolution.domain.omissions[0].omission_id,
    "authority_expired_mid_action"
  );
  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 3,
    conditions_satisfied: 2,
    oldest_open_condition_at: null,
  });
});

test("authority domain: keeps authority_resolution additive when the permit lane still blocks on the hard-stop control rod", () => {
  const result = evaluateGovernanceRequest(createPermitDomainRequest());

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "hard_stop_domain_requires_manual_lane");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "ALLOW");
  assert.equal(result.runtimeSubset.civic.authority_resolution.domain.decision, "ALLOW");
});

test("authority domain: preserves bounded authority_resolution shape on HOLD output", () => {
  const request = createInspectionDomainRequest();
  request.authority_context.domain_context.authority_grant.jurisdiction = "franchise";

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "HOLD");
  assert.deepEqual(
    Object.keys(result.runtimeSubset.civic.authority_resolution),
    ["decision", "reason", "conditions_total", "conditions_satisfied", "domain", "actor"]
  );
  assert.equal(result.runtimeSubset.civic.authority_resolution.actor, null);
});

test("authority domain: source stays static local with no env, fetch, or filesystem reads", () => {
  const source = readFileSync(
    path.join(__dirname, "../src/governance/runtime/resolveAuthorityDomain.js"),
    "utf8"
  );

  assert.equal(source.includes("process.env"), false);
  assert.equal(/fetch\s*\(/.test(source), false);
  assert.equal(
    /require\(["']fs["']\)|readFileSync\s*\(|readFile\s*\(/.test(source),
    false
  );
});
