const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CHAIN_WRITE_STATUSES,
  CivicForensicChain,
  GovernanceChainWriter,
} = require("../src/governance/forensic");

const INHERITED_BASE_ENTRY_TYPES = Object.freeze([
  "PLUGIN_BASE_ALPHA",
  "PLUGIN_BASE_BETA",
  "PLUGIN_BASE_GAMMA",
  "PLUGIN_BASE_DELTA",
  "PLUGIN_BASE_EPSILON",
]);

function createRequest(overrides = {}) {
  return {
    kind: "command_request",
    org_id: "fortworth-dev",
    entity_ref: {
      entity_id: "permit-wave6-1000",
      entity_type: "permit_application",
    },
    authority_context: {
      requested_by_role: "city_manager",
      domain_context: {
        domain_id: "permit_authorization",
        requester_org_id: "fw_city_manager",
        subject_department_id: "water_department",
        jurisdiction_id: "city",
        authority_grant: {
          granted_by_entity_id: "decision-record-permit-1",
        },
      },
      actor_context: {
        actor_id: "actor:manager",
        target_id: "authority:permit_authorization",
      },
    },
    raw_subject: "constellation.commands.fortworth-dev.permit-wave6-1000",
    ...overrides,
  };
}

function createGovernanceResult(decision, overrides = {}) {
  return {
    decision,
    reason: `${decision.toLowerCase()}_reason`,
    runtimeSubset: {
      civic: {
        authority_resolution: {
          active: false,
          decision: null,
          reason: "authority_not_requested",
        },
        revocation: {
          active: false,
          reason: null,
        },
      },
    },
    ...overrides,
  };
}

function createWriter(options = {}) {
  return new GovernanceChainWriter({
    chain:
      options.chain ||
      new CivicForensicChain({
        baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
      }),
    persistence: options.persistence || null,
    now: options.now || (() => "2026-04-18T18:10:00.000Z"),
  });
}

test("chain writer: records ALLOW governance results", () => {
  const writer = createWriter();

  const sidecar = writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("ALLOW"),
    stableRefs: {
      governanceEntryId: "gov-allow-1",
    },
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.RECORDED);
  assert.deepEqual(sidecar.entryRefs, ["gov-allow-1"]);
  assert.deepEqual(sidecar.warnings, []);
  assert.equal(writer.chain.getEntries()[0].payload.governance_result.decision, "ALLOW");
});

test("chain writer: records SUPERVISE governance results", () => {
  const writer = createWriter();

  const sidecar = writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("SUPERVISE"),
    stableRefs: {
      governanceEntryId: "gov-supervise-1",
    },
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.RECORDED);
  assert.deepEqual(sidecar.entryRefs, ["gov-supervise-1"]);
  assert.equal(writer.chain.getEntry("gov-supervise-1").payload.governance_result.decision, "SUPERVISE");
});

test("chain writer: records HOLD governance results", () => {
  const writer = createWriter();

  const sidecar = writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("HOLD"),
    stableRefs: {
      governanceEntryId: "gov-hold-1",
    },
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.RECORDED);
  assert.deepEqual(sidecar.entryRefs, ["gov-hold-1"]);
  assert.equal(writer.chain.getEntry("gov-hold-1").payload.governance_result.decision, "HOLD");
});

test("chain writer: records BLOCK governance results", () => {
  const writer = createWriter();

  const sidecar = writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("BLOCK"),
    stableRefs: {
      governanceEntryId: "gov-block-1",
    },
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.RECORDED);
  assert.deepEqual(sidecar.entryRefs, ["gov-block-1"]);
  assert.equal(writer.chain.getEntry("gov-block-1").payload.governance_result.decision, "BLOCK");
});

test("chain writer: appends linked authority evaluation entries when stable authority evidence exists", () => {
  const writer = createWriter();

  const sidecar = writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("ALLOW", {
      runtimeSubset: {
        civic: {
          authority_resolution: {
            active: true,
            decision: "ALLOW",
            reason: "authority_domain_resolved",
          },
          revocation: {
            active: false,
            reason: null,
          },
        },
      },
    }),
    stableRefs: {
      governanceEntryId: "gov-authority-1",
      authorityEntryId: "authority-summary-1",
    },
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.RECORDED);
  assert.deepEqual(sidecar.entryRefs, ["gov-authority-1", "authority-summary-1"]);
  assert.deepEqual(
    writer.chain.getEntry("authority-summary-1").linked_entry_ids,
    ["gov-authority-1"]
  );
});

test("chain writer: skips when governance stable refs are absent", () => {
  let saveCalls = 0;
  const writer = createWriter({
    persistence: {
      saveChain() {
        saveCalls += 1;
      },
    },
  });

  const sidecar = writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("ALLOW"),
    stableRefs: {},
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.SKIPPED);
  assert.deepEqual(sidecar.entryRefs, []);
  assert.deepEqual(sidecar.warnings, ["missing_stable_ref:governanceEntryId"]);
  assert.equal(writer.chain.getEntries().length, 0);
  assert.equal(saveCalls, 0);
});

test("chain writer: warns and records only governance entries when authority entry ids are absent", () => {
  const writer = createWriter();

  const sidecar = writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("ALLOW", {
      runtimeSubset: {
        civic: {
          authority_resolution: {
            active: true,
            decision: "ALLOW",
            reason: "authority_domain_resolved",
          },
          revocation: {
            active: false,
            reason: null,
          },
        },
      },
    }),
    stableRefs: {
      governanceEntryId: "gov-warning-1",
    },
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.RECORDED);
  assert.deepEqual(sidecar.entryRefs, ["gov-warning-1"]);
  assert.deepEqual(sidecar.warnings, ["missing_stable_ref:authorityEntryId"]);
});

test("chain writer: warns and skips authority summaries when stable authority refs are absent", () => {
  const writer = createWriter();

  const sidecar = writer.recordGovernanceResult({
    request: createRequest({
      authority_context: {},
    }),
    governanceResult: createGovernanceResult("ALLOW", {
      runtimeSubset: {
        civic: {
          authority_resolution: {
            active: true,
            decision: "ALLOW",
            reason: "authority_domain_resolved",
          },
          revocation: {
            active: false,
            reason: null,
          },
        },
      },
    }),
    stableRefs: {
      governanceEntryId: "gov-warning-2",
      authorityEntryId: "authority-warning-2",
    },
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.RECORDED);
  assert.deepEqual(sidecar.entryRefs, ["gov-warning-2"]);
  assert.deepEqual(sidecar.warnings, ["authority_evidence_stable_refs_absent"]);
});

test("chain writer: does not mutate the input governance result", () => {
  const writer = createWriter();
  const governanceResult = createGovernanceResult("ALLOW", {
    runtimeSubset: {
      civic: {
        authority_resolution: {
          active: true,
          decision: "ALLOW",
          reason: "authority_domain_resolved",
        },
        revocation: {
          active: false,
          reason: null,
        },
      },
    },
  });
  const original = JSON.parse(JSON.stringify(governanceResult));

  writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult,
    stableRefs: {
      governanceEntryId: "gov-immutability-1",
      authorityEntryId: "authority-immutability-1",
    },
  });

  assert.deepEqual(governanceResult, original);
});

test("chain writer: surfaces persistence failures without blocking recorded entries", () => {
  const writer = createWriter({
    persistence: {
      saveChain() {
        throw new Error("disk_offline");
      },
    },
  });

  const sidecar = writer.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("ALLOW"),
    stableRefs: {
      governanceEntryId: "gov-failed-1",
    },
  });

  assert.equal(sidecar.status, CHAIN_WRITE_STATUSES.FAILED);
  assert.deepEqual(sidecar.entryRefs, ["gov-failed-1"]);
  assert.deepEqual(sidecar.warnings, ["persistence_failed:disk_offline"]);
  assert.equal(writer.chain.getEntries().length, 1);
});

test("chain writer: persists through injected persistence and per-instance chains stay isolated", () => {
  let savedChain = null;
  const writerA = createWriter({
    persistence: {
      saveChain(chain) {
        savedChain = chain;
      },
    },
  });
  const writerB = new GovernanceChainWriter({
    baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    now: () => "2026-04-18T18:10:30.000Z",
  });

  writerA.recordGovernanceResult({
    request: createRequest(),
    governanceResult: createGovernanceResult("ALLOW"),
    stableRefs: {
      governanceEntryId: "gov-isolated-1",
    },
  });

  assert.equal(savedChain, writerA.chain);
  assert.equal(writerA.chain.getEntries().length, 1);
  assert.equal(writerB.chain.getEntries().length, 0);
});
