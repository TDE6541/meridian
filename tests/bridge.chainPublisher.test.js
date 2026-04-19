const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ChainPublisher,
  CivicForensicChain,
} = require("../src/governance/forensic");

const INHERITED_BASE_ENTRY_TYPES = Object.freeze([
  "PLUGIN_BASE_ALPHA",
  "PLUGIN_BASE_BETA",
  "PLUGIN_BASE_GAMMA",
  "PLUGIN_BASE_DELTA",
  "PLUGIN_BASE_EPSILON",
]);

function createChain(entries = []) {
  return new CivicForensicChain({
    baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
    entries,
  });
}

function createGovernanceEntry(overrides = {}) {
  return {
    entry_id: "gov-entry-1",
    entry_type: "GOVERNANCE_DECISION",
    occurred_at: "2026-04-18T19:00:00.000Z",
    linked_entry_ids: [],
    refs: {
      org_id: "fortworth-dev",
      entity_id: "permit-wave6-1000",
      entity_type: "permit_application",
      raw_subject: "constellation.commands.fortworth-dev.permit-wave6-1000",
    },
    payload: {
      governance_result: {
        decision: "ALLOW",
        reason: "authority_and_evidence_resolved",
      },
    },
    ...overrides,
  };
}

function createAuthorityEntry(overrides = {}) {
  return {
    entry_id: "authority-entry-1",
    entry_type: "AUTHORITY_EVALUATION",
    occurred_at: "2026-04-18T19:00:01.000Z",
    linked_entry_ids: ["gov-entry-1"],
    refs: {
      governance_entry_id: "gov-entry-1",
      requested_by_role: "city_manager",
      domain_id: "permit_authorization",
    },
    payload: {
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
    ...overrides,
  };
}

test("chain publisher publishes governance decision entries onto the existing linked evidence subject", async () => {
  const chain = createChain([createGovernanceEntry()]);
  const published = [];
  const warnings = [];
  const publisher = new ChainPublisher({
    chain,
    transport: {
      async publish(subject, payload) {
        published.push({ subject, payload });
      },
    },
    warn(message) {
      warnings.push(message);
    },
  });

  const publications = await publisher.publishAppendedEntries({
    entryRefs: ["gov-entry-1"],
  });

  assert.deepEqual(warnings, []);
  assert.equal(publications.length, 1);
  assert.equal(publications[0].stream, "CONSTELLATION_EVIDENCE");
  assert.equal(
    publications[0].subject,
    "constellation.evidence.fortworth-dev.permit-wave6-1000.linked"
  );
  assert.equal(publications[0].payload.evidence_status, "linked");
  assert.equal(publications[0].payload.forensic_entry.entry_id, "gov-entry-1");
  assert.deepEqual(published, [
    {
      subject: publications[0].subject,
      payload: publications[0].payload,
    },
  ]);
});

test("chain publisher resolves authority subjects through linked governance entries", async () => {
  const chain = createChain([
    createGovernanceEntry(),
    createAuthorityEntry(),
  ]);
  const publisher = new ChainPublisher({
    chain,
    warn() {},
  });

  const publications = await publisher.publishAppendedEntries({
    entryRefs: ["authority-entry-1"],
  });

  assert.equal(publications.length, 1);
  assert.equal(
    publications[0].subject,
    "constellation.evidence.fortworth-dev.permit-wave6-1000.linked"
  );
  assert.equal(
    publications[0].payload.forensic_entry.entry_type,
    "AUTHORITY_EVALUATION"
  );
  assert.equal(
    publications[0].payload.raw_subject,
    "constellation.commands.fortworth-dev.permit-wave6-1000"
  );
});

test("chain publisher supports direct appended entries input without chain lookup", async () => {
  const publisher = new ChainPublisher({
    warn() {},
  });

  const publications = await publisher.publishAppendedEntries({
    entries: [createGovernanceEntry({ entry_id: "gov-direct-1" })],
  });

  assert.equal(publications.length, 1);
  assert.equal(
    publications[0].subject,
    "constellation.evidence.fortworth-dev.permit-wave6-1000.linked"
  );
  assert.equal(publications[0].payload.forensic_entry.entry_id, "gov-direct-1");
});

test("chain publisher supports publishPublication transport injection", async () => {
  const chain = createChain([createGovernanceEntry()]);
  let published = null;
  const publisher = new ChainPublisher({
    chain,
    transport: {
      async publishPublication(publication) {
        published = publication;
      },
    },
    warn() {},
  });

  const publications = await publisher.publishAppendedEntries({
    entryRefs: ["gov-entry-1"],
  });

  assert.equal(publications.length, 1);
  assert.deepEqual(publications[0], published);
});

test("chain publisher skips missing entry refs with visible warnings", async () => {
  const warnings = [];
  const publisher = new ChainPublisher({
    chain: createChain(),
    warn(message) {
      warnings.push(message);
    },
  });

  const publications = await publisher.publishAppendedEntries({
    entryRefs: ["missing-entry-1"],
  });

  assert.deepEqual(publications, []);
  assert.deepEqual(warnings, [
    "forensic_publication_skipped:missing_entry:missing-entry-1",
  ]);
});

test("chain publisher skips authority publications when subject refs remain absent", async () => {
  const warnings = [];
  const publisher = new ChainPublisher({
    warn(message) {
      warnings.push(message);
    },
  });

  const publications = await publisher.publishAppendedEntries({
    entries: [
      createAuthorityEntry({
        entry_id: "authority-subjectless-1",
        linked_entry_ids: [],
        refs: {
          governance_entry_id: "",
        },
      }),
    ],
  });

  assert.deepEqual(publications, []);
  assert.deepEqual(warnings, [
    "forensic_publication_skipped:subject_refs_absent:authority-subjectless-1",
  ]);
});

test("chain publisher keeps publish failures visible and non-blocking", async () => {
  const chain = createChain([
    createGovernanceEntry(),
    createGovernanceEntry({
      entry_id: "gov-entry-2",
      refs: {
        org_id: "fortworth-dev",
        entity_id: "permit-wave6-1001",
        raw_subject: "constellation.commands.fortworth-dev.permit-wave6-1001",
      },
    }),
  ]);
  const warnings = [];
  const publisher = new ChainPublisher({
    chain,
    transport: {
      async publish(subject) {
        if (subject.includes("permit-wave6-1000")) {
          throw new Error("nats_offline");
        }
      },
    },
    warn(message) {
      warnings.push(message);
    },
  });

  const publications = await publisher.publishAppendedEntries({
    entryRefs: ["gov-entry-1", "gov-entry-2"],
  });

  assert.equal(publications.length, 1);
  assert.equal(
    publications[0].subject,
    "constellation.evidence.fortworth-dev.permit-wave6-1001.linked"
  );
  assert.deepEqual(warnings, [
    "forensic_publication_failed:gov-entry-1:nats_offline",
  ]);
});

test("chain publisher skips unsupported entry types without widening the evidence vocabulary", async () => {
  const warnings = [];
  const publisher = new ChainPublisher({
    warn(message) {
      warnings.push(message);
    },
  });

  const publications = await publisher.publishAppendedEntries({
    entries: [
      {
        entry_id: "base-entry-1",
        entry_type: "PLUGIN_BASE_ALPHA",
        occurred_at: "2026-04-18T19:00:02.000Z",
        payload: {
          label: "legacy base entry",
        },
      },
    ],
  });

  assert.deepEqual(publications, []);
  assert.deepEqual(warnings, [
    "forensic_publication_skipped:unsupported_entry_type:PLUGIN_BASE_ALPHA",
  ]);
});
