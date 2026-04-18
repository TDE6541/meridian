const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const {
  evaluateGovernanceRequest,
  projectAuthorityPropagation,
} = require("../src/governance/runtime/index.js");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createInspectionRequest() {
  return {
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "inspection-wave5-propagation-2000",
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
          granted_by_entity_id: "decision-record-inspection-prop-1",
          supersedes_grant_ids: [],
          delegation_chain_ids: ["grant-root", "grant-inspection-prop-1"],
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
    raw_subject: "constellation.commands.fortworth-dev.inspection-wave5-propagation-2000",
  };
}

function createPermitRequest() {
  const request = createInspectionRequest();
  request.entity_ref.entity_id = "permit-wave5-propagation-1000";
  request.entity_ref.entity_type = "permit_application";
  request.authority_context.required_approvals = ["permit_office"];
  request.authority_context.resolved_approvals = ["permit_office"];
  request.authority_context.domain_context.domain_id = "permit_authorization";
  request.authority_context.domain_context.subject_department_id = "water_department";
  request.authority_context.domain_context.authority_grant.scope_of_authority = [
    "permit_authorization",
  ];
  request.authority_context.domain_context.authority_grant.granted_by_entity_id =
    "decision-record-permit-prop-1";
  request.authority_context.domain_context.authority_grant.delegation_chain_ids = [
    "grant-root",
    "grant-permit-prop-1",
  ];
  request.authority_context.domain_context.state_transition = {
    entity_type: "permit_application",
    from_state: "in_review",
    to_state: "approved",
  };
  request.raw_subject =
    "constellation.commands.fortworth-dev.permit-wave5-propagation-1000";

  return request;
}

function createCarrierRequest() {
  return {
    ...createInspectionRequest(),
    authority_context: {
      ...createInspectionRequest().authority_context,
      propagation_context: {
        action_requests: [],
        decision_inputs: [],
      },
    },
  };
}

function addActorContext(request) {
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

test("authority propagation: direct helper projects explicit action requests read-only", () => {
  const revokedRequest = createInspectionRequest();
  revokedRequest.authority_context.domain_context.authority_grant.status = "revoked";
  const expiredRequest = createInspectionRequest();
  expiredRequest.authority_context.domain_context.authority_grant.status = "expired";

  const result = projectAuthorityPropagation(
    {
      action_requests: [
        {
          projection_id: "action-revoked",
          request: revokedRequest,
        },
        {
          projection_id: "action-expired",
          request: expiredRequest,
        },
      ],
    },
    evaluateGovernanceRequest
  );

  assert.equal(result.mode, "projection_only_read_only");
  assert.equal(result.inputMode, "explicit_runtime_inputs");
  assert.equal(result.totalInputs, 2);
  assert.equal(result.affectedCount, 2);
  assert.deepEqual(
    result.actionRequests.map((entry) => [entry.projection_id, entry.decision, entry.reason]),
    [
      ["action-revoked", "REVOKE", "authority_revoked_mid_action"],
      ["action-expired", "HOLD", "authority_expired_mid_action"],
    ]
  );
});

test("authority propagation: nested propagation context projects into runtimeSubset.civic.revocation", () => {
  const carrier = createCarrierRequest();
  const revokedRequest = createInspectionRequest();
  revokedRequest.authority_context.domain_context.authority_grant.status = "revoked";
  carrier.authority_context.propagation_context.action_requests = [
    {
      projection_id: "carrier-action-revoked",
      request: revokedRequest,
    },
  ];

  const result = evaluateGovernanceRequest(carrier);

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.runtimeSubset.civic.revocation.active, false);
  assert.equal(result.runtimeSubset.civic.revocation.propagation.mode, "projection_only_read_only");
  assert.equal(result.runtimeSubset.civic.revocation.propagation.totalInputs, 1);
  assert.equal(
    result.runtimeSubset.civic.revocation.propagation.actionRequests[0].decision,
    "REVOKE"
  );
});

test("authority propagation: revocation projects over supplied action requests", () => {
  const revokedRequest = createInspectionRequest();
  revokedRequest.authority_context.domain_context.authority_grant.status = "revoked";

  const result = projectAuthorityPropagation(
    {
      action_requests: [
        {
          projection_id: "action-revoked-only",
          request: revokedRequest,
        },
      ],
    },
    evaluateGovernanceRequest
  );

  assert.equal(result.actionRequests[0].decision, "REVOKE");
  assert.equal(result.actionRequests[0].reason, "authority_revoked_mid_action");
  assert.equal(result.actionRequests[0].revocation_active, true);
});

test("authority propagation: supersession projects over supplied permit action requests", () => {
  const supersededRequest = createPermitRequest();
  supersededRequest.authority_context.domain_context.authority_grant.status =
    "superseded";

  const result = projectAuthorityPropagation(
    {
      action_requests: [
        {
          projection_id: "permit-superseded",
          request: supersededRequest,
        },
      ],
    },
    evaluateGovernanceRequest
  );

  assert.equal(result.actionRequests[0].decision, "REVOKE");
  assert.equal(result.actionRequests[0].reason, "permit_superseded_by_overlap");
});

test("authority propagation: expiration remains a bounded HOLD projection", () => {
  const expiredRequest = createInspectionRequest();
  expiredRequest.authority_context.domain_context.authority_grant.status = "expired";

  const result = projectAuthorityPropagation(
    {
      action_requests: [
        {
          projection_id: "inspection-expired",
          request: expiredRequest,
        },
      ],
    },
    evaluateGovernanceRequest
  );

  assert.equal(result.actionRequests[0].decision, "HOLD");
  assert.equal(result.actionRequests[0].reason, "authority_expired_mid_action");
  assert.equal(result.actionRequests[0].revocation_active, false);
});

test("authority propagation: cross-jurisdiction projection reuses the bounded runtime resolver", () => {
  const crossJurisdictionRequest = addActorContext(createInspectionRequest());
  crossJurisdictionRequest.authority_context.domain_context.authority_grant.jurisdiction =
    "franchise";

  const result = projectAuthorityPropagation(
    {
      action_requests: [
        {
          projection_id: "inspection-cross-jurisdiction",
          request: crossJurisdictionRequest,
        },
      ],
    },
    evaluateGovernanceRequest
  );

  assert.equal(result.actionRequests[0].decision, "REVOKE");
  assert.equal(
    result.actionRequests[0].reason,
    "cross_jurisdiction_resolved_against_requester"
  );
});

test("authority propagation: decision inputs are projected through the same bounded evaluator", () => {
  const revokedRequest = createInspectionRequest();
  revokedRequest.authority_context.domain_context.authority_grant.status = "revoked";

  const result = projectAuthorityPropagation(
    {
      decision_inputs: [
        {
          projection_id: "decision-revoked",
          request: revokedRequest,
        },
      ],
    },
    evaluateGovernanceRequest
  );

  assert.equal(result.totalInputs, 1);
  assert.equal(result.decisionInputs[0].input_kind, "decision_input");
  assert.equal(result.decisionInputs[0].decision, "REVOKE");
});

test("authority propagation: projection stays read-only and does not mutate supplied requests", () => {
  const inspectionRequest = createInspectionRequest();
  const before = clone(inspectionRequest);

  const result = projectAuthorityPropagation(
    {
      action_requests: [
        {
          projection_id: "inspection-read-only",
          request: inspectionRequest,
        },
      ],
    },
    evaluateGovernanceRequest
  );

  assert.equal(result.actionRequests[0].read_only, true);
  assert.deepEqual(inspectionRequest, before);
});

test("authority propagation: zero-input summaries stay bounded", () => {
  const result = projectAuthorityPropagation({}, evaluateGovernanceRequest);

  assert.equal(result.totalInputs, 0);
  assert.equal(result.affectedCount, 0);
  assert.deepEqual(result.actionRequests, []);
  assert.deepEqual(result.decisionInputs, []);
});

test("authority propagation: malformed nested propagation context blocks deterministically", () => {
  const request = createInspectionRequest();
  request.authority_context.propagation_context = {
    action_requests: "not-an-array",
  };

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "authority_propagation_context_invalid");
});

test("authority propagation: direct helper rejects malformed action-request entries", () => {
  assert.throws(
    () =>
      projectAuthorityPropagation(
        {
          action_requests: [
            {
              projection_id: "",
              request: createInspectionRequest(),
            },
          ],
        },
        evaluateGovernanceRequest
      ),
    /projection_id/
  );
});

test("authority propagation: direct helper rejects malformed decision-input entries", () => {
  assert.throws(
    () =>
      projectAuthorityPropagation(
        {
          decision_inputs: [
            {
              projection_id: "decision-bad",
              request: null,
            },
          ],
        },
        evaluateGovernanceRequest
      ),
    /decision_inputs\[0\]\.request/
  );
});

test("authority propagation: helper source stays free of storage discovery, scheduler logic, and writes", () => {
  const source = readFileSync(
    path.join(__dirname, "../src/governance/runtime/projectAuthorityPropagation.js"),
    "utf8"
  );

  assert.equal(source.includes("process.env"), false);
  assert.equal(/fetch\s*\(/.test(source), false);
  assert.equal(/setInterval|setTimeout|cron|daemon|worker/i.test(source), false);
  assert.equal(/writeFile|appendFile|createWriteStream/.test(source), false);
  assert.equal(
    /require\(["']fs["']\)|readFileSync\s*\(|readFile\s*\(/.test(source),
    false
  );
});
