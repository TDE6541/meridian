const {
  CONNECTION_CONFIG,
  GOVERNANCE_EVENTS,
  EVIDENCE_EVENTS,
  DISCLOSURE_EVENTS,
  buildGovernanceSubject,
  buildEvidenceSubject,
  buildDisclosureSubject,
} = require("../config/constellation.js");

const UPSTREAM_STREAMS = Object.freeze({
  ENTITIES: "CONSTELLATION_ENTITIES",
  EVENTS: "CONSTELLATION_EVENTS",
  TELEMETRY: "CONSTELLATION_TELEMETRY",
  COMMANDS: "CONSTELLATION_COMMANDS",
});

const UPSTREAM_SUBJECTS = Object.freeze({
  EVENTS_ALL: "constellation.events.>",
  TELEMETRY_ENTITY: "constellation.telemetry.*.*",
  COMMAND_ENTITY_OR_BROADCAST: "constellation.commands.*.*",
  COMMAND_BROADCAST: "constellation.commands.*.broadcast",
});

const MERIDIAN_PUBLICATION_STREAMS = Object.freeze({
  GOVERNANCE: "CONSTELLATION_GOVERNANCE",
  EVIDENCE: "CONSTELLATION_EVIDENCE",
  DISCLOSURES: "CONSTELLATION_DISCLOSURES",
});

module.exports = {
  CONNECTION_CONFIG,
  UPSTREAM_STREAMS,
  UPSTREAM_SUBJECTS,
  MERIDIAN_PUBLICATION_STREAMS,
  GOVERNANCE_EVENTS,
  EVIDENCE_EVENTS,
  DISCLOSURE_EVENTS,
  buildGovernanceSubject,
  buildEvidenceSubject,
  buildDisclosureSubject,
};
