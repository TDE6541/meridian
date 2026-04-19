const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ChainPublisher,
  CivicForensicChain,
  GovernanceChainWriter,
} = require("../src/governance/forensic");
const {
  createGovernanceTransportAdapter,
} = require("../src/bridge/governanceTransportAdapter");

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

function createForensicSidecar(warnings, transport = null) {
  const chain = new CivicForensicChain({
    baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
  });
  const chainWriter = new GovernanceChainWriter({
    chain,
    now: () => "2026-04-18T19:10:00.000Z",
  });
  const chainPublisher = new ChainPublisher({
    chain,
    transport,
    warn(message) {
      warnings.push(message);
    },
  });

  return {
    chain,
    chainWriter,
    chainPublisher,
  };
}

test("forensic integration publishes governance evidence after a recorded adapter evaluation", async () => {
  const warnings = [];
  const published = [];
  const { chain, chainWriter, chainPublisher } = createForensicSidecar(
    warnings,
    {
      async publish(subject, payload) {
        published.push({ subject, payload });
      },
    }
  );
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-18T19:15:00.000Z",
    publisher: {
      async publishOutcome() {
        throw new Error("legacy publisher should not run for ALLOW");
      },
    },
    evaluateGovernanceRequest() {
      return createGovernanceResult("ALLOW", {
        reason: "delegated_allow",
      });
    },
    chainWriter,
    chainPublisher,
    resolveStableRefs() {
      return {
        governanceEntryId: "gov-integration-1",
      };
    },
    warn(message) {
      warnings.push(message);
    },
  });

  const result = await adapter.evaluate(createRequest());

  assert.equal(result.decision, "ALLOW");
  assert.equal(result.reason, "delegated_allow");
  assert.equal(result.evaluated_at, "2026-04-18T19:15:00.000Z");
  assert.equal(result.publications.length, 1);
  assert.equal(
    result.publications[0].subject,
    "constellation.evidence.fortworth-dev.permit-wave6-1000.linked"
  );
  assert.equal(chain.getEntries().length, 1);
  assert.deepEqual(published, [
    {
      subject: result.publications[0].subject,
      payload: result.publications[0].payload,
    },
  ]);
  assert.deepEqual(warnings, []);
});

test("forensic integration publishes linked authority evidence when authority evaluation entries are recorded", async () => {
  const warnings = [];
  const { chain, chainWriter, chainPublisher } = createForensicSidecar(warnings);
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-18T19:16:00.000Z",
    publisher: {
      async publishOutcome() {
        return [];
      },
    },
    evaluateGovernanceRequest() {
      return createGovernanceResult("ALLOW", {
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
    },
    chainWriter,
    chainPublisher,
    resolveStableRefs() {
      return {
        governanceEntryId: "gov-integration-2",
        authorityEntryId: "authority-integration-2",
      };
    },
    warn(message) {
      warnings.push(message);
    },
  });

  const result = await adapter.evaluate(createRequest());

  assert.equal(result.publications.length, 2);
  assert.equal(chain.getEntries().length, 2);
  assert.deepEqual(
    result.publications.map((publication) => publication.payload.forensic_entry.entry_type),
    ["GOVERNANCE_DECISION", "AUTHORITY_EVALUATION"]
  );
  assert.deepEqual(warnings, []);
});

test("forensic integration preserves existing HOLD publications and appends forensic receipts additively", async () => {
  const warnings = [];
  const { chainWriter, chainPublisher } = createForensicSidecar(warnings);
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-18T19:17:00.000Z",
    publisher: {
      async publishOutcome() {
        return [
          {
            stream: "CONSTELLATION_GOVERNANCE",
            subject:
              "constellation.governance.fortworth-dev.permit-wave6-1000.hold",
            payload: {
              decision: "HOLD",
            },
          },
        ];
      },
    },
    evaluateGovernanceRequest() {
      return createGovernanceResult("HOLD");
    },
    chainWriter,
    chainPublisher,
    resolveStableRefs() {
      return {
        governanceEntryId: "gov-integration-3",
      };
    },
    warn(message) {
      warnings.push(message);
    },
  });

  const result = await adapter.evaluate(createRequest());

  assert.equal(result.decision, "HOLD");
  assert.equal(result.publications.length, 2);
  assert.equal(
    result.publications[0].subject,
    "constellation.governance.fortworth-dev.permit-wave6-1000.hold"
  );
  assert.equal(
    result.publications[1].subject,
    "constellation.evidence.fortworth-dev.permit-wave6-1000.linked"
  );
  assert.deepEqual(warnings, []);
});

test("forensic integration skips publication when stable forensic ids are absent and surfaces a warning", async () => {
  const warnings = [];
  const { chain, chainWriter, chainPublisher } = createForensicSidecar(warnings);
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-18T19:18:00.000Z",
    publisher: {
      async publishOutcome() {
        return [];
      },
    },
    evaluateGovernanceRequest() {
      return createGovernanceResult("ALLOW");
    },
    chainWriter,
    chainPublisher,
    resolveStableRefs() {
      return {};
    },
    warn(message) {
      warnings.push(message);
    },
  });

  const result = await adapter.evaluate(createRequest());

  assert.deepEqual(result.publications, []);
  assert.equal(chain.getEntries().length, 0);
  assert.deepEqual(warnings, [
    "forensic_chain_skipped:missing_stable_ref:governanceEntryId",
  ]);
});

test("forensic integration keeps publication failures visible and non-blocking after chain recording", async () => {
  const warnings = [];
  const { chain, chainWriter, chainPublisher } = createForensicSidecar(
    warnings,
    {
      async publish() {
        throw new Error("nats_offline");
      },
    }
  );
  const adapter = createGovernanceTransportAdapter({
    now: () => "2026-04-18T19:19:00.000Z",
    publisher: {
      async publishOutcome() {
        return [];
      },
    },
    evaluateGovernanceRequest() {
      return createGovernanceResult("ALLOW");
    },
    chainWriter,
    chainPublisher,
    resolveStableRefs() {
      return {
        governanceEntryId: "gov-publish-fail-1",
      };
    },
    warn(message) {
      warnings.push(message);
    },
  });

  const result = await adapter.evaluate(createRequest());

  assert.deepEqual(result.publications, []);
  assert.equal(chain.getEntries().length, 1);
  assert.deepEqual(warnings, [
    "forensic_publication_failed:gov-publish-fail-1:nats_offline",
  ]);
});
