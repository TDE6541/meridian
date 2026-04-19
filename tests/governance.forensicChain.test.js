const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ACTIVE_CIVIC_ENTRY_TYPES,
  CivicForensicChain,
} = require("../src/governance/forensic");

const INHERITED_BASE_ENTRY_TYPES = Object.freeze([
  "PLUGIN_BASE_ALPHA",
  "PLUGIN_BASE_BETA",
  "PLUGIN_BASE_GAMMA",
  "PLUGIN_BASE_DELTA",
  "PLUGIN_BASE_EPSILON",
]);

function createChain() {
  return new CivicForensicChain({
    baseEntryTypes: [...INHERITED_BASE_ENTRY_TYPES],
  });
}

function createGovernanceEntry(overrides = {}) {
  return {
    entry_id: "gov-entry-1",
    entry_type: "GOVERNANCE_DECISION",
    occurred_at: "2026-04-18T18:00:00.000Z",
    linked_entry_ids: [],
    refs: {
      org_id: "fortworth-dev",
      entity_id: "permit-100",
    },
    payload: {
      decision: "ALLOW",
      reason: "authority_and_evidence_resolved",
    },
    ...overrides,
  };
}

test("forensic chain: exposes active civic entry vocabulary", () => {
  assert.deepEqual(ACTIVE_CIVIC_ENTRY_TYPES, [
    "GOVERNANCE_DECISION",
    "AUTHORITY_EVALUATION",
  ]);
});

test("forensic chain: accepts governance decision entries", () => {
  const chain = createChain();
  const entry = chain.append(createGovernanceEntry());

  assert.equal(entry.entry_type, "GOVERNANCE_DECISION");
  assert.equal(chain.getEntries().length, 1);
});

test("forensic chain: accepts linked authority evaluation entries", () => {
  const chain = createChain();
  chain.append(createGovernanceEntry());

  const authorityEntry = chain.append({
    entry_id: "authority-entry-1",
    entry_type: "AUTHORITY_EVALUATION",
    occurred_at: "2026-04-18T18:00:01.000Z",
    linked_entry_ids: ["gov-entry-1"],
    refs: {
      requested_by_role: "city_manager",
    },
    payload: {
      decision: "ALLOW",
      reason: "authority_domain_resolved",
    },
  });

  assert.deepEqual(authorityEntry.linked_entry_ids, ["gov-entry-1"]);
  assert.equal(chain.getEntries().length, 2);
});

test("forensic chain: supports inherited base entry types supplied by the caller", () => {
  const chain = createChain();
  const entry = chain.append({
    entry_id: "base-entry-1",
    entry_type: "PLUGIN_BASE_GAMMA",
    occurred_at: "2026-04-18T18:01:00.000Z",
    payload: {
      label: "legacy compatibility",
    },
  });

  assert.equal(entry.entry_type, "PLUGIN_BASE_GAMMA");
  assert.equal(chain.allowedEntryTypes.length, 7);
});

test("forensic chain: rejects unknown entry types", () => {
  const chain = createChain();

  assert.throws(
    () =>
      chain.append({
        entry_id: "unknown-entry-1",
        entry_type: "UNKNOWN_TYPE",
        occurred_at: "2026-04-18T18:02:00.000Z",
        payload: {},
      }),
    /unknown_forensic_chain_entry_type:UNKNOWN_TYPE/
  );
});

test("forensic chain: rejects deferred meeting decision types", () => {
  const chain = createChain();

  assert.throws(
    () =>
      chain.append({
        entry_id: "meeting-entry-1",
        entry_type: "MEETING_DECISION",
        occurred_at: "2026-04-18T18:03:00.000Z",
        payload: {},
      }),
    /deferred_civic_entry_type:MEETING_DECISION/
  );
});

test("forensic chain: rejects deferred permit action types", () => {
  const chain = createChain();

  assert.throws(
    () =>
      chain.append({
        entry_id: "permit-entry-1",
        entry_type: "PERMIT_ACTION",
        occurred_at: "2026-04-18T18:04:00.000Z",
        payload: {},
      }),
    /deferred_civic_entry_type:PERMIT_ACTION/
  );
});

test("forensic chain: rejects deferred inspection result types", () => {
  const chain = createChain();

  assert.throws(
    () =>
      chain.append({
        entry_id: "inspection-entry-1",
        entry_type: "INSPECTION_RESULT",
        occurred_at: "2026-04-18T18:05:00.000Z",
        payload: {},
      }),
    /deferred_civic_entry_type:INSPECTION_RESULT/
  );
});

test("forensic chain: rejects deferred obligation types", () => {
  const chain = createChain();

  assert.throws(
    () =>
      chain.append({
        entry_id: "obligation-entry-1",
        entry_type: "OBLIGATION_CREATED",
        occurred_at: "2026-04-18T18:06:00.000Z",
        payload: {},
      }),
    /deferred_civic_entry_type:OBLIGATION_CREATED/
  );
});

test("forensic chain: rejects self links", () => {
  const chain = createChain();

  assert.throws(
    () =>
      chain.append({
        entry_id: "self-linked-entry",
        entry_type: "GOVERNANCE_DECISION",
        occurred_at: "2026-04-18T18:07:00.000Z",
        linked_entry_ids: ["self-linked-entry"],
        payload: {},
      }),
    /forensic_chain_self_link:self-linked-entry/
  );
});

test("forensic chain: rejects duplicate link refs", () => {
  const chain = createChain();
  chain.append(createGovernanceEntry());

  assert.throws(
    () =>
      chain.append({
        entry_id: "dup-link-entry",
        entry_type: "AUTHORITY_EVALUATION",
        occurred_at: "2026-04-18T18:08:00.000Z",
        linked_entry_ids: ["gov-entry-1", "gov-entry-1"],
        payload: {},
      }),
    /forensic_chain_duplicate_link_ref/
  );
});

test("forensic chain: rejects dangling link refs", () => {
  const chain = createChain();

  assert.throws(
    () =>
      chain.append({
        entry_id: "dangling-link-entry",
        entry_type: "AUTHORITY_EVALUATION",
        occurred_at: "2026-04-18T18:09:00.000Z",
        linked_entry_ids: ["missing-governance-entry"],
        payload: {},
      }),
    /forensic_chain_dangling_link:missing-governance-entry/
  );
});

test("forensic chain: deep clones refs and payload on append", () => {
  const chain = createChain();
  const originalEntry = createGovernanceEntry({
    refs: {
      org_id: "fortworth-dev",
      entity_id: "permit-100",
    },
    payload: {
      nested: {
        decision: "ALLOW",
      },
    },
  });

  chain.append(originalEntry);
  originalEntry.refs.org_id = "mutated-org";
  originalEntry.payload.nested.decision = "BLOCK";

  const storedEntry = chain.getEntry("gov-entry-1");
  assert.equal(storedEntry.refs.org_id, "fortworth-dev");
  assert.equal(storedEntry.payload.nested.decision, "ALLOW");
});

test("forensic chain: deeply freezes stored entries after append", () => {
  const chain = createChain();
  const storedEntry = chain.append(
    createGovernanceEntry({
      payload: {
        nested: {
          decision: "ALLOW",
        },
      },
    })
  );

  assert.equal(Object.isFrozen(storedEntry), true);
  assert.equal(Object.isFrozen(storedEntry.refs), true);
  assert.equal(Object.isFrozen(storedEntry.payload), true);
  assert.equal(Object.isFrozen(storedEntry.payload.nested), true);
  storedEntry.payload.nested.decision = "BLOCK";
  assert.equal(storedEntry.payload.nested.decision, "ALLOW");
});

test("forensic chain: rejects duplicate entry ids", () => {
  const chain = createChain();
  chain.append(createGovernanceEntry());

  assert.throws(
    () => chain.append(createGovernanceEntry()),
    /duplicate_entry_id:gov-entry-1/
  );
});
