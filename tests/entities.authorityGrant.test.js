const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AUTHORITY_GRANT_STATUSES,
  createAuthorityGrant,
  validateAuthorityGrant,
} = require("../src/entities/authority_grant");

function createValidGrant(overrides = {}) {
  return createAuthorityGrant({
    entity_id: "grant-1",
    org_id: "fw_city_manager",
    name: "Fort Worth executive grant",
    ...overrides,
  });
}

test("authority_grant: legacy structural floor remains valid when packet fields are omitted", () => {
  const result = validateAuthorityGrant(createValidGrant());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("authority_grant: exports the bounded Wave 5 status allowlist", () => {
  assert.deepEqual(AUTHORITY_GRANT_STATUSES, [
    "active",
    "expired",
    "revoked",
    "superseded",
    "pending",
  ]);
});

test("authority_grant: accepts a fully populated active grant packet shape", () => {
  const result = validateAuthorityGrant(
    createValidGrant({
      status: "active",
      granted_role: "city_manager",
      jurisdiction: "fort_worth_texas",
      scope_of_authority: [
        "permit_authorization",
        "inspection_resolution",
        "public_notice_action",
      ],
      granted_at: "2026-04-18T12:00:00Z",
      expires_at: "2027-04-18T12:00:00Z",
      revoked_at: null,
      superseded_at: null,
      granted_by_entity_id: "decision-record-1",
      supersedes_grant_ids: ["grant-0"],
      delegation_chain_ids: ["grant-root", "grant-1"],
    })
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("authority_grant: accepts pending grants with nullable temporal lineage fields", () => {
  const result = validateAuthorityGrant(
    createValidGrant({
      status: "pending",
      granted_role: "acm_development_infrastructure",
      jurisdiction: "fort_worth_texas",
      scope_of_authority: ["utility_corridor_action"],
      granted_at: null,
      expires_at: null,
      revoked_at: null,
      superseded_at: null,
      granted_by_entity_id: null,
      supersedes_grant_ids: [],
      delegation_chain_ids: [],
    })
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("authority_grant: rejects status values outside the bounded allowlist", () => {
  const result = validateAuthorityGrant(
    createValidGrant({
      status: "draft",
    })
  );

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "entity.status must be null for stateless entities",
  ]);
});

test("authority_grant: rejects a blank granted_role", () => {
  const result = validateAuthorityGrant(
    createValidGrant({
      status: "active",
      granted_role: "  ",
    })
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("entity.granted_role must be a non-empty string"));
});

test("authority_grant: rejects a non-string jurisdiction", () => {
  const result = validateAuthorityGrant(
    createValidGrant({
      status: "active",
      jurisdiction: 42,
    })
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("entity.jurisdiction must be a non-empty string"));
});

test("authority_grant: rejects malformed scope_of_authority arrays", () => {
  const result = validateAuthorityGrant(
    createValidGrant({
      status: "active",
      scope_of_authority: ["permit_authorization", ""],
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "entity.scope_of_authority must be an array of non-empty strings"
    )
  );
});

test("authority_grant: rejects malformed temporal fields", () => {
  const result = validateAuthorityGrant(
    createValidGrant({
      status: "active",
      granted_at: 12345,
      expires_at: {},
      revoked_at: [],
      superseded_at: false,
    })
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("entity.granted_at must be null or a non-empty string"));
  assert.ok(result.errors.includes("entity.expires_at must be null or a non-empty string"));
  assert.ok(result.errors.includes("entity.revoked_at must be null or a non-empty string"));
  assert.ok(result.errors.includes("entity.superseded_at must be null or a non-empty string"));
});

test("authority_grant: rejects malformed lineage and supersession ids", () => {
  const result = validateAuthorityGrant(
    createValidGrant({
      status: "superseded",
      granted_by_entity_id: 99,
      supersedes_grant_ids: ["grant-1", ""],
      delegation_chain_ids: "grant-1",
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "entity.granted_by_entity_id must be null or a non-empty string"
    )
  );
  assert.ok(
    result.errors.includes(
      "entity.supersedes_grant_ids must be an array of non-empty strings"
    )
  );
  assert.ok(
    result.errors.includes(
      "entity.delegation_chain_ids must be an array of non-empty strings"
    )
  );
});
