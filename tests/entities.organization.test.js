const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createOrganization,
  validateOrganization,
} = require("../src/entities/organization");

function createValidOrganization(overrides = {}) {
  return createOrganization({
    entity_id: "org-1",
    org_id: "fw_acm_public_space_planning",
    name: "Public Space Planning Portfolio",
    ...overrides,
  });
}

test("organization: legacy structural floor remains valid when packet fields are omitted", () => {
  const result = validateOrganization(createValidOrganization());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("organization: accepts the widened packet shape for Fort Worth portfolios", () => {
  const result = validateOrganization(
    createValidOrganization({
      org_type: "assistant_city_manager_portfolio",
      parent_org_id: "fw_city_manager",
      portfolio_org_id: "fw_acm_public_space_planning",
      authorized_domains: [
        "permit_authorization",
        "inspection_resolution",
        "utility_corridor_action",
        "decision_closure",
        "public_notice_action",
      ],
      office_holder_snapshot: {
        name: "Dana Burghdoff",
        title: "Assistant City Manager",
      },
    })
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("organization: accepts null hierarchy references and null office-holder snapshot", () => {
  const result = validateOrganization(
    createValidOrganization({
      org_type: "executive_office",
      parent_org_id: null,
      portfolio_org_id: null,
      authorized_domains: [],
      office_holder_snapshot: null,
    })
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("organization: rejects a blank org_type", () => {
  const result = validateOrganization(
    createValidOrganization({
      org_type: " ",
    })
  );

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("entity.org_type must be a non-empty string"));
});

test("organization: rejects a non-string parent_org_id", () => {
  const result = validateOrganization(
    createValidOrganization({
      parent_org_id: 12,
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes("entity.parent_org_id must be null or a non-empty string")
  );
});

test("organization: rejects a non-string portfolio_org_id", () => {
  const result = validateOrganization(
    createValidOrganization({
      portfolio_org_id: {},
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "entity.portfolio_org_id must be null or a non-empty string"
    )
  );
});

test("organization: rejects malformed authorized_domains", () => {
  const result = validateOrganization(
    createValidOrganization({
      authorized_domains: ["permit_authorization", ""],
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "entity.authorized_domains must be an array of non-empty strings"
    )
  );
});

test("organization: rejects non-object office_holder_snapshot values", () => {
  const result = validateOrganization(
    createValidOrganization({
      office_holder_snapshot: "Dana Burghdoff",
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "entity.office_holder_snapshot must be null or a plain object with optional non-empty string name/title fields"
    )
  );
});

test("organization: rejects office_holder_snapshot keys outside the bounded display shape", () => {
  const result = validateOrganization(
    createValidOrganization({
      office_holder_snapshot: {
        name: "Dana Burghdoff",
        title: "Assistant City Manager",
        captured_at: "2026-04-18",
      },
    })
  );

  assert.equal(result.valid, false);
  assert.ok(
    result.errors.includes(
      "entity.office_holder_snapshot must be null or a plain object with optional non-empty string name/title fields"
    )
  );
});
