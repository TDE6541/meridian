const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const MERIDIAN_GOVERNANCE_CONFIG = require("../src/governance/runtime/meridian-governance-config");
const {
  FORT_WORTH_AUTHORITY_TOPOLOGY,
  FORT_WORTH_CIVIC_DOMAIN_IDS,
  FORT_WORTH_PORTFOLIO_ORG_IDS,
  FORT_WORTH_ROLE_IDS,
  getFortWorthOrganization,
  getFortWorthRoleDomainDeclaration,
  resolveFortWorthJurisdiction,
} = require("../src/governance/runtime/fortWorthAuthorityTopology");

test("authority topology: exports a static local Fort Worth pack and config alignment", () => {
  assert.equal(
    FORT_WORTH_AUTHORITY_TOPOLOGY.version,
    "wave5-packet1-fort-worth-authority-topology-v1"
  );
  assert.equal(FORT_WORTH_AUTHORITY_TOPOLOGY.source.mode, "static_local_module");
  assert.equal(FORT_WORTH_AUTHORITY_TOPOLOGY.source.wave, "5");
  assert.equal(FORT_WORTH_AUTHORITY_TOPOLOGY.source.packet, "1");
  assert.equal(
    MERIDIAN_GOVERNANCE_CONFIG.authorityTopology.fortWorth,
    FORT_WORTH_AUTHORITY_TOPOLOGY
  );
  assert.deepEqual(
    MERIDIAN_GOVERNANCE_CONFIG.authorityTopology.alignedDomainIds,
    Object.keys(MERIDIAN_GOVERNANCE_CONFIG.domains)
  );
});

test("authority topology: freezes the stable org ids and office-holder snapshot metadata", () => {
  assert.deepEqual(FORT_WORTH_PORTFOLIO_ORG_IDS, [
    "fw_city_manager",
    "fw_acm_public_space_planning",
    "fw_acm_environment_aviation_property",
    "fw_acm_development_infrastructure",
    "fw_acm_public_safety",
    "fw_acm_enterprise_services",
  ]);

  assert.deepEqual(
    FORT_WORTH_AUTHORITY_TOPOLOGY.organizations.fw_city_manager.office_holder_snapshot,
    {
      name: "Jay Chapa",
      title: "City Manager",
    }
  );
  assert.deepEqual(
    FORT_WORTH_AUTHORITY_TOPOLOGY.organizations.fw_acm_enterprise_services.office_holder_snapshot,
    {
      name: "Dianna Giordano",
      title: "Assistant City Manager",
    }
  );
});

test("authority topology: preserves the full 5-ACM department mapping", () => {
  assert.equal(
    FORT_WORTH_AUTHORITY_TOPOLOGY.departments.library.portfolio_org_id,
    "fw_acm_public_space_planning"
  );
  assert.equal(
    FORT_WORTH_AUTHORITY_TOPOLOGY.departments.office_of_the_medical_director.portfolio_org_id,
    "fw_acm_environment_aviation_property"
  );
  assert.equal(
    FORT_WORTH_AUTHORITY_TOPOLOGY.departments.water_department.portfolio_org_id,
    "fw_acm_development_infrastructure"
  );
  assert.equal(
    FORT_WORTH_AUTHORITY_TOPOLOGY.departments.emergency_management_communications_911.portfolio_org_id,
    "fw_acm_public_safety"
  );
  assert.equal(
    FORT_WORTH_AUTHORITY_TOPOLOGY.departments.information_technology_solutions.portfolio_org_id,
    "fw_acm_enterprise_services"
  );
});

test("authority topology: role catalog keys off stable ids and stable org references", () => {
  assert.deepEqual(FORT_WORTH_ROLE_IDS, [
    "city_manager",
    "acm_public_space_planning",
    "acm_environment_aviation_property",
    "acm_development_infrastructure",
    "acm_public_safety",
    "acm_enterprise_services",
  ]);

  for (const roleId of FORT_WORTH_ROLE_IDS) {
    const role = FORT_WORTH_AUTHORITY_TOPOLOGY.roles[roleId];
    assert.equal(typeof role.display_name, "string");
    assert.ok(role.display_name.length > 0);
    assert.ok(FORT_WORTH_PORTFOLIO_ORG_IDS.includes(role.org_id));
  }
});

test("authority topology: role-domain matrix covers every role across the five shipped civic domains", () => {
  assert.deepEqual(FORT_WORTH_CIVIC_DOMAIN_IDS, [
    "permit_authorization",
    "inspection_resolution",
    "utility_corridor_action",
    "decision_closure",
    "public_notice_action",
  ]);

  for (const roleId of FORT_WORTH_ROLE_IDS) {
    const matrix = FORT_WORTH_AUTHORITY_TOPOLOGY.role_domain_matrix[roleId];
    assert.deepEqual(Object.keys(matrix), FORT_WORTH_CIVIC_DOMAIN_IDS);

    for (const domainId of FORT_WORTH_CIVIC_DOMAIN_IDS) {
      assert.match(matrix[domainId].declaration_mode, /^(city_manager_final|portfolio_review)$/);
      assert.deepEqual(matrix[domainId].jurisdiction_ids, ["city", "franchise"]);
    }
  }
});

test("authority topology: city and franchise jurisdiction resolver stays bounded to the shipped domains", () => {
  assert.deepEqual(resolveFortWorthJurisdiction("city"), {
    jurisdiction_id: "city",
    display_name: "City-managed municipal action",
    permit_owner: "municipal_lane",
    escalation_role_id: "city_manager",
    supported_domain_ids: FORT_WORTH_CIVIC_DOMAIN_IDS,
  });

  assert.deepEqual(resolveFortWorthJurisdiction("franchise"), {
    jurisdiction_id: "franchise",
    display_name: "Franchise action with city oversight",
    permit_owner: "franchise_lane_with_city_oversight",
    escalation_role_id: "city_manager",
    supported_domain_ids: FORT_WORTH_CIVIC_DOMAIN_IDS,
  });
});

test("authority topology: helper lookups resolve by stable ids and fail closed on unknown ids", () => {
  assert.equal(
    getFortWorthOrganization("fw_acm_public_safety").office_holder_snapshot.name,
    "William Johnson"
  );
  assert.deepEqual(
    getFortWorthRoleDomainDeclaration("acm_development_infrastructure", "utility_corridor_action"),
    {
      declaration_mode: "portfolio_review",
      jurisdiction_ids: ["city", "franchise"],
    }
  );
  assert.equal(getFortWorthOrganization("jay-chapa"), null);
  assert.equal(getFortWorthRoleDomainDeclaration("Jay Chapa", "utility_corridor_action"), null);
  assert.equal(resolveFortWorthJurisdiction("county"), null);
});

test("authority topology: source file stays static-local with no env, fetch, or filesystem reads", () => {
  const source = readFileSync(
    path.join(__dirname, "../src/governance/runtime/fortWorthAuthorityTopology.js"),
    "utf8"
  );

  assert.equal(source.includes("process.env"), false);
  assert.equal(/fetch\s*\(/.test(source), false);
  assert.equal(
    /require\(["']fs["']\)|readFileSync\s*\(|readFile\s*\(/.test(source),
    false
  );
});
