const test = require("node:test");
const assert = require("node:assert/strict");
const constellation = require("../src/config/constellation.js");
const subjectCatalog = require("../src/bridge/subjectCatalog.js");

test("subject catalog locks the approved Wave 3 upstream streams and subjects", () => {
  assert.deepEqual(subjectCatalog.UPSTREAM_STREAMS, {
    ENTITIES: "CONSTELLATION_ENTITIES",
    EVENTS: "CONSTELLATION_EVENTS",
    TELEMETRY: "CONSTELLATION_TELEMETRY",
    COMMANDS: "CONSTELLATION_COMMANDS",
  });

  assert.deepEqual(subjectCatalog.UPSTREAM_SUBJECTS, {
    EVENTS_ALL: "constellation.events.>",
    TELEMETRY_ENTITY: "constellation.telemetry.*.*",
    COMMAND_ENTITY_OR_BROADCAST: "constellation.commands.*.*",
    COMMAND_BROADCAST: "constellation.commands.*.broadcast",
  });

  assert.deepEqual(subjectCatalog.MERIDIAN_PUBLICATION_STREAMS, {
    GOVERNANCE: "CONSTELLATION_GOVERNANCE",
    EVIDENCE: "CONSTELLATION_EVIDENCE",
    DISCLOSURES: "CONSTELLATION_DISCLOSURES",
  });
});

test("subject catalog delegates Meridian publication builders to constellation config", () => {
  assert.deepEqual(subjectCatalog.CONNECTION_CONFIG, constellation.CONNECTION_CONFIG);
  assert.deepEqual(subjectCatalog.GOVERNANCE_EVENTS, constellation.GOVERNANCE_EVENTS);
  assert.deepEqual(subjectCatalog.EVIDENCE_EVENTS, constellation.EVIDENCE_EVENTS);
  assert.deepEqual(subjectCatalog.DISCLOSURE_EVENTS, constellation.DISCLOSURE_EVENTS);
  assert.equal(
    subjectCatalog.buildGovernanceSubject("org", "entity", "hold"),
    constellation.buildGovernanceSubject("org", "entity", "hold")
  );
  assert.equal(
    subjectCatalog.buildEvidenceSubject("org", "entity", "missing"),
    constellation.buildEvidenceSubject("org", "entity", "missing")
  );
  assert.equal(
    subjectCatalog.buildDisclosureSubject("org", "entity", "notice-required"),
    constellation.buildDisclosureSubject("org", "entity", "notice-required")
  );
});
