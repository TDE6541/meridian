const CONNECTION_CONFIG = {
  servers: process.env.NATS_URL || "nats://localhost:4222",
  orgId: process.env.MERIDIAN_ORG_ID || "fortworth-dev",
};

const GOVERNANCE_EVENTS = [
  "decision",
  "hold",
  "absence",
  "revocation",
];

const EVIDENCE_EVENTS = [
  "linked",
  "verified",
  "missing",
];

const DISCLOSURE_EVENTS = [
  "notice-issued",
  "notice-required",
  "notice-closed",
];

function toSubjectSegment(value, fieldName) {
  if (typeof value !== "string" || value === "") {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }

  return value;
}

function buildGovernanceSubject(orgId, entityId, event) {
  return `constellation.governance.${toSubjectSegment(orgId, "orgId")}.${toSubjectSegment(entityId, "entityId")}.${toSubjectSegment(event, "event")}`;
}

function buildEvidenceSubject(orgId, entityId, event) {
  return `constellation.evidence.${toSubjectSegment(orgId, "orgId")}.${toSubjectSegment(entityId, "entityId")}.${toSubjectSegment(event, "event")}`;
}

function buildDisclosureSubject(orgId, entityId, event) {
  return `constellation.disclosures.${toSubjectSegment(orgId, "orgId")}.${toSubjectSegment(entityId, "entityId")}.${toSubjectSegment(event, "event")}`;
}

module.exports = {
  CONNECTION_CONFIG,
  GOVERNANCE_EVENTS,
  EVIDENCE_EVENTS,
  DISCLOSURE_EVENTS,
  buildGovernanceSubject,
  buildEvidenceSubject,
  buildDisclosureSubject,
};
