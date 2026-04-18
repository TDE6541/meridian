const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const {
  evaluateGovernanceRequest,
  resolveAuthorityActor,
} = require("../src/governance/runtime/index.js");

function createActorRequest() {
  return {
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "inspection-wave5-actor-2000",
      entity_type: "inspection",
    },
    authority_context: {
      resolved: true,
      requested_by_role: "fire_inspector",
      required_approvals: ["fire_department"],
      resolved_approvals: ["fire_department"],
      missing_approvals: [],
      actor_context: {
        actor_id: "actor:inspector_1",
        target_id: "authority:inspection_resolution",
        chain_depth_cap: 4,
        tuples: [
          {
            subject: "actor:inspector_1",
            relation: "authorizes",
            object: "authority:inspection_resolution",
          },
        ],
      },
    },
    evidence_context: {
      required_count: 1,
      present_count: 1,
      missing_types: [],
    },
    confidence_context: null,
    candidate_signal_patch: null,
    raw_subject:
      "constellation.commands.fortworth-dev.inspection-wave5-actor-2000",
  };
}

test("authority actor: direct authorizes tuples resolve ALLOW", () => {
  const result = resolveAuthorityActor(createActorRequest());

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "actor_authority_resolved");
  assert.equal(result.decision_trace.selected_relation_signature, "authorizes");
});

test("authority actor: member_of paths resolve SUPERVISE", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
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
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.reason, "actor_supervision_required");
  assert.equal(result.decision_trace.used_delegation, true);
});

test("authority actor: reports_to paths resolve SUPERVISE", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "reports_to",
      object: "actor:chief",
    },
    {
      subject: "actor:chief",
      relation: "authorizes",
      object: "authority:inspection_resolution",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.decision_trace.selected_relation_signature, "reports_to>authorizes");
});

test("authority actor: grants_to paths resolve SUPERVISE", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "grants_to",
      object: "actor:delegate",
    },
    {
      subject: "actor:delegate",
      relation: "authorizes",
      object: "authority:inspection_resolution",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.reason, "actor_supervision_required");
});

test("authority actor: direct inspects tuples resolve SUPERVISE", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.target_id = "asset:inspection_lane";
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "inspects",
      object: "asset:inspection_lane",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.decision_trace.selected_relation_signature, "inspects");
});

test("authority actor: supersedes chains resolve ALLOW", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "supersedes",
      object: "actor:delegate",
    },
    {
      subject: "actor:delegate",
      relation: "authorizes",
      object: "authority:inspection_resolution",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.decision_trace.selected_relation_signature, "supersedes>authorizes");
});

test("authority actor: precedence prefers direct authorizes over delegated chains", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "grants_to",
      object: "actor:delegate",
    },
    {
      subject: "actor:delegate",
      relation: "authorizes",
      object: "authority:inspection_resolution",
    },
    {
      subject: "actor:inspector_1",
      relation: "authorizes",
      object: "authority:inspection_resolution",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.decision_trace.selected_relation_signature, "authorizes");
});

test("authority actor: precedence prefers supersedes paths over direct authorizes", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "authorizes",
      object: "authority:inspection_resolution",
    },
    {
      subject: "actor:inspector_1",
      relation: "supersedes",
      object: "actor:delegate",
    },
    {
      subject: "actor:delegate",
      relation: "authorizes",
      object: "authority:inspection_resolution",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.decision_trace.selected_relation_signature, "supersedes>authorizes");
});

test("authority actor: cycles in delegation chains block deterministically", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "reports_to",
      object: "actor:chief",
    },
    {
      subject: "actor:chief",
      relation: "reports_to",
      object: "actor:inspector_1",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "actor_delegation_cycle_detected");
  assert.equal(result.decision_trace.cycle_detected, true);
});

test("authority actor: chain depth caps are enforced", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.chain_depth_cap = 2;
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "reports_to",
      object: "actor:manager",
    },
    {
      subject: "actor:manager",
      relation: "reports_to",
      object: "actor:director",
    },
    {
      subject: "actor:director",
      relation: "authorizes",
      object: "authority:inspection_resolution",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "actor_delegation_chain_depth_exceeded");
  assert.equal(result.decision_trace.depth_cap_exceeded, true);
});

test("authority actor: unsupported tuple relations block deterministically", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "delegates",
      object: "authority:inspection_resolution",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "actor_relation_unsupported");
});

test("authority actor: malformed actor contexts block deterministically", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = null;

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "actor_context_invalid");
});

test("authority actor: unresolved authority chains return HOLD", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "member_of",
      object: "org:fire_department",
    },
    {
      subject: "org:fire_department",
      relation: "member_of",
      object: "org:public_safety",
    },
  ];

  const result = resolveAuthorityActor(request);

  assert.equal(result.decision, "HOLD");
  assert.equal(result.reason, "actor_authority_unresolved");
  assert.equal(result.lane, "HOLD");
});

test("authority actor: stays inactive when Packet 2 actor context is absent", () => {
  const request = createActorRequest();
  delete request.authority_context.actor_context;

  const result = resolveAuthorityActor(request);

  assert.deepEqual(result, {
    active: false,
    decision: null,
    reason: "authority_actor_not_requested",
  });
});

test("authority actor: evaluateGovernanceRequest projects delegated traces as bounded authority_resolution", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
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
  ];

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "SUPERVISE");
  assert.equal(result.reason, "actor_supervision_required");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "SUPERVISE");
  assert.equal(result.runtimeSubset.civic.authority_resolution.actor.lane, "SUPERVISE");
  assert.equal(
    result.runtimeSubset.civic.authority_resolution.actor.decision_trace.selected_relation_signature,
    "member_of>authorizes"
  );
  assert.deepEqual(result.runtimeSubset.civic.promise_status, {
    conditions_total: 3,
    conditions_satisfied: 2,
    oldest_open_condition_at: null,
  });
});

test("authority actor: evaluateGovernanceRequest blocks cycle paths without emitting REVOKE", () => {
  const request = createActorRequest();
  request.authority_context.actor_context.tuples = [
    {
      subject: "actor:inspector_1",
      relation: "reports_to",
      object: "actor:chief",
    },
    {
      subject: "actor:chief",
      relation: "reports_to",
      object: "actor:inspector_1",
    },
  ];

  const result = evaluateGovernanceRequest(request);

  assert.equal(result.decision, "BLOCK");
  assert.equal(result.reason, "actor_delegation_cycle_detected");
  assert.notEqual(result.decision, "REVOKE");
  assert.equal(result.runtimeSubset.civic.authority_resolution.decision, "BLOCK");
  assert.equal(
    result.runtimeSubset.civic.authority_resolution.actor.decision_trace.cycle_detected,
    true
  );
});

test("authority actor: source stays static local with no hosted auth or network dependencies", () => {
  const source = readFileSync(
    path.join(__dirname, "../src/governance/runtime/resolveAuthorityActor.js"),
    "utf8"
  );

  assert.equal(source.includes("process.env"), false);
  assert.equal(/fetch\s*\(/.test(source), false);
  assert.equal(/Auth0|OpenFGA/i.test(source), false);
  assert.equal(
    /require\(["']fs["']\)|readFileSync\s*\(|readFile\s*\(/.test(source),
    false
  );
});
