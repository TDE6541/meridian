const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
} = require("../../src/live/authority/authorityContracts");
const {
  createAuthorityRequestStore,
} = require("../../src/live/authority/authorityRequestStore");

function createValidRequest(overrides = {}) {
  return {
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
    request_id: "ARR-0001",
    source_absence_id: "absence-1",
    source_governance_evaluation: "governance-1",
    required_authority_role: "public_works_director",
    required_authority_department: "public_works",
    resolution_type: "approval",
    binding_context: {
      source_refs: ["record:1"],
    },
    expiry: "2026-04-25T13:00:00.000Z",
    status: "pending",
    forensic_receipt_id: null,
    ...overrides,
  };
}

test("authority request store: adds valid requests", () => {
  const store = createAuthorityRequestStore();
  const added = store.addRequest(createValidRequest());

  assert.equal(added.ok, true, added.issues.join("\n"));
  assert.equal(store.listRequests().length, 1);
  assert.equal(store.getRequestById("ARR-0001").source_absence_id, "absence-1");
});

test("authority request store: rejects invalid requests", () => {
  const store = createAuthorityRequestStore();
  const added = store.addRequest(createValidRequest({ status: "emailed" }));

  assert.equal(added.ok, false);
  assert.match(added.issues.join("\n"), /status is not allowed/);
  assert.equal(store.listRequests().length, 0);
});

test("authority request store: rejects duplicate request ids", () => {
  const store = createAuthorityRequestStore([createValidRequest()]);
  const added = store.addRequest(
    createValidRequest({
      source_absence_id: "absence-2",
    })
  );

  assert.equal(added.ok, false);
  assert.match(added.issues.join("\n"), /request_id already exists/);
});

test("authority request store: rejects duplicate pending request for same absence", () => {
  const store = createAuthorityRequestStore([createValidRequest()]);
  const added = store.addRequest(
    createValidRequest({
      request_id: "ARR-0002",
      source_absence_id: "absence-1",
    })
  );

  assert.equal(added.ok, false);
  assert.match(added.issues.join("\n"), /pending request already exists/);
});

test("authority request store: returns pending by source absence id", () => {
  const store = createAuthorityRequestStore([
    createValidRequest({
      request_id: "ARR-0001",
      source_absence_id: "absence-1",
      status: "approved",
    }),
    createValidRequest({
      request_id: "ARR-0002",
      source_absence_id: "absence-1",
      status: "pending",
    }),
  ]);

  assert.equal(
    store.findPendingRequestBySourceAbsenceId("absence-1").request_id,
    "ARR-0002"
  );
});

test("authority request store: updates request status and consumed token hashes", () => {
  const store = createAuthorityRequestStore([createValidRequest()]);
  const updated = store.updateRequestById("ARR-0001", (request) => ({
    ...request,
    status: "approved",
    consumed_action_token_hashes: ["hash-1"],
  }));

  assert.equal(updated.ok, true, updated.issues.join("\n"));
  assert.equal(updated.previous_request.status, "pending");
  assert.equal(updated.request.status, "approved");
  assert.deepEqual(
    store.getRequestById("ARR-0001").consumed_action_token_hashes,
    ["hash-1"]
  );
});

test("authority request store: update rejects request id mutation", () => {
  const store = createAuthorityRequestStore([createValidRequest()]);
  const updated = store.updateRequestById("ARR-0001", (request) => ({
    ...request,
    request_id: "ARR-0002",
  }));

  assert.equal(updated.ok, false);
  assert.deepEqual(updated.issues, ["request_id cannot be changed."]);
  assert.equal(store.getRequestById("ARR-0001").request_id, "ARR-0001");
});

test("authority request store: exports deterministic snapshot", () => {
  const store = createAuthorityRequestStore([
    createValidRequest({ request_id: "ARR-0001", source_absence_id: "absence-1" }),
    createValidRequest({ request_id: "ARR-0002", source_absence_id: "absence-2" }),
  ]);
  const snapshot = store.exportSnapshot();

  assert.deepEqual(
    snapshot.requests.map((request) => request.request_id),
    ["ARR-0001", "ARR-0002"]
  );
  assert.equal(snapshot.contract, "meridian.v2.authorityRequestStore.v1");
});

test("authority request store: does not mutate inputs or expose mutable internals", () => {
  const request = createValidRequest();
  const before = JSON.parse(JSON.stringify(request));
  const store = createAuthorityRequestStore();

  store.addRequest(request);
  request.binding_context.source_refs.push("record:mutated");
  const listed = store.listRequests();
  listed[0].binding_context.source_refs.push("record:external");

  assert.deepEqual(before, createValidRequest());
  assert.deepEqual(store.getRequestById("ARR-0001").binding_context.source_refs, [
    "record:1",
  ]);
});
