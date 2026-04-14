const {
  MERIDIAN_PUBLICATION_STREAMS,
  GOVERNANCE_EVENTS,
  EVIDENCE_EVENTS,
  DISCLOSURE_EVENTS,
  buildGovernanceSubject,
  buildEvidenceSubject,
  buildDisclosureSubject,
} = require("./subjectCatalog");

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requirePlainObject(value, fieldName) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${fieldName} must be a plain object`);
  }

  return value;
}

function requireAllowedEvent(allowedEvents, value, fieldName) {
  if (!allowedEvents.includes(value)) {
    throw new TypeError(
      `${fieldName} must be one of ${allowedEvents.join(", ")}`
    );
  }

  return value;
}

function createGovernancePublisher(options = {}) {
  const transport = options.transport || null;

  async function emit(publication) {
    if (transport === null) {
      return publication;
    }

    if (typeof transport.publishPublication === "function") {
      await transport.publishPublication(publication);
      return publication;
    }

    if (typeof transport.publish !== "function") {
      throw new TypeError(
        "transport.publish or transport.publishPublication must be a function"
      );
    }

    await transport.publish(publication.subject, publication.payload);
    return publication;
  }

  async function publishGovernance(orgId, entityId, event, payload) {
    const publication = {
      stream: MERIDIAN_PUBLICATION_STREAMS.GOVERNANCE,
      subject: buildGovernanceSubject(
        orgId,
        entityId,
        requireAllowedEvent(GOVERNANCE_EVENTS, event, "governance event")
      ),
      payload: requirePlainObject(payload, "governance payload"),
    };

    return emit(publication);
  }

  async function publishEvidence(orgId, entityId, event, payload) {
    const publication = {
      stream: MERIDIAN_PUBLICATION_STREAMS.EVIDENCE,
      subject: buildEvidenceSubject(
        orgId,
        entityId,
        requireAllowedEvent(EVIDENCE_EVENTS, event, "evidence event")
      ),
      payload: requirePlainObject(payload, "evidence payload"),
    };

    return emit(publication);
  }

  async function publishDisclosure(orgId, entityId, event, payload) {
    const publication = {
      stream: MERIDIAN_PUBLICATION_STREAMS.DISCLOSURES,
      subject: buildDisclosureSubject(
        orgId,
        entityId,
        requireAllowedEvent(DISCLOSURE_EVENTS, event, "disclosure event")
      ),
      payload: requirePlainObject(payload, "disclosure payload"),
    };

    return emit(publication);
  }

  async function publishOutcome(request, outcome) {
    requirePlainObject(request, "request");
    requirePlainObject(outcome, "outcome");

    const governanceEvent = outcome.decision === "HOLD" ? "hold" : "decision";
    const basePayload = {
      kind: request.kind,
      org_id: request.org_id,
      entity_ref: request.entity_ref,
      raw_subject: request.raw_subject,
      reason: outcome.reason,
      evaluated_at: outcome.evaluated_at,
    };

    return Promise.all([
      publishGovernance(
        request.org_id,
        request.entity_ref.entity_id,
        governanceEvent,
        {
          ...basePayload,
          decision: outcome.decision,
        }
      ),
      publishEvidence(
        request.org_id,
        request.entity_ref.entity_id,
        "missing",
        {
          ...basePayload,
          evidence_status: "missing",
        }
      ),
      publishDisclosure(
        request.org_id,
        request.entity_ref.entity_id,
        "notice-required",
        {
          ...basePayload,
          disclosure_status: "notice-required",
        }
      ),
    ]);
  }

  return {
    publishGovernance,
    publishEvidence,
    publishDisclosure,
    publishOutcome,
  };
}

module.exports = {
  createGovernancePublisher,
};
