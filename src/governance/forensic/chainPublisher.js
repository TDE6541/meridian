const {
  buildEvidenceSubject,
} = require("../../config/constellation");
const {
  MERIDIAN_PUBLICATION_STREAMS,
} = require("../../bridge/subjectCatalog");
const { cloneValue } = require("./civicForensicChain");

const FORENSIC_EVIDENCE_EVENT = "linked";
const SUPPORTED_PUBLICATION_ENTRY_TYPES = Object.freeze([
  "GOVERNANCE_DECISION",
  "AUTHORITY_EVALUATION",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function normalizeWarn(warn) {
  if (warn === undefined) {
    return (message) => {
      console.warn(message);
    };
  }

  if (typeof warn !== "function") {
    throw new TypeError("warn must be a function");
  }

  return warn;
}

function emitWarning(warn, message) {
  try {
    warn(message);
  } catch (error) {
    // Warning handlers must not become blocking behavior.
  }
}

function emitPublication(transport, publication) {
  if (transport === null) {
    return Promise.resolve(publication);
  }

  if (typeof transport.publishPublication === "function") {
    return Promise.resolve(transport.publishPublication(publication)).then(
      () => publication
    );
  }

  if (typeof transport.publish === "function") {
    return Promise.resolve(
      transport.publish(publication.subject, publication.payload)
    ).then(() => publication);
  }

  throw new TypeError(
    "transport.publish or transport.publishPublication must be a function"
  );
}

function buildEntryMap(entries) {
  const entryMap = new Map();

  for (const entry of entries) {
    if (isPlainObject(entry) && isNonEmptyString(entry.entry_id)) {
      entryMap.set(entry.entry_id, entry);
    }
  }

  return entryMap;
}

function resolveLinkedGovernanceEntry(entry, entryMap, chain) {
  const linkedGovernanceEntryId =
    entry.refs?.governance_entry_id || entry.linked_entry_ids?.[0];

  if (!isNonEmptyString(linkedGovernanceEntryId)) {
    return null;
  }

  if (entryMap.has(linkedGovernanceEntryId)) {
    return entryMap.get(linkedGovernanceEntryId);
  }

  if (chain && typeof chain.getEntry === "function") {
    return chain.getEntry(linkedGovernanceEntryId);
  }

  return null;
}

function resolveSubjectRefs(entry, entryMap, chain) {
  const directOrgId = entry.refs?.org_id;
  const directEntityId = entry.refs?.entity_id;
  const directRawSubject = entry.refs?.raw_subject;

  if (isNonEmptyString(directOrgId) && isNonEmptyString(directEntityId)) {
    return {
      orgId: directOrgId,
      entityId: directEntityId,
      rawSubject: isNonEmptyString(directRawSubject) ? directRawSubject : null,
    };
  }

  const governanceEntry = resolveLinkedGovernanceEntry(entry, entryMap, chain);
  const linkedOrgId = governanceEntry?.refs?.org_id;
  const linkedEntityId = governanceEntry?.refs?.entity_id;
  const linkedRawSubject = governanceEntry?.refs?.raw_subject;

  if (isNonEmptyString(linkedOrgId) && isNonEmptyString(linkedEntityId)) {
    return {
      orgId: linkedOrgId,
      entityId: linkedEntityId,
      rawSubject: isNonEmptyString(linkedRawSubject) ? linkedRawSubject : null,
    };
  }

  return null;
}

function buildPublicationPayload(entry, subjectRefs) {
  const publicationPayload = {
    evidence_status: FORENSIC_EVIDENCE_EVENT,
    forensic_entry: {
      entry_id: entry.entry_id,
      entry_type: entry.entry_type,
      occurred_at: entry.occurred_at,
      linked_entry_ids: cloneValue(entry.linked_entry_ids || []),
      refs: cloneValue(entry.refs || {}),
      payload: cloneValue(entry.payload || {}),
    },
  };

  if (subjectRefs.rawSubject !== null) {
    publicationPayload.raw_subject = subjectRefs.rawSubject;
  }

  return publicationPayload;
}

function normalizeEntries(input, chain, warn) {
  if (!isPlainObject(input)) {
    throw new TypeError("input must be a plain object");
  }

  if (input.entries !== undefined) {
    if (!Array.isArray(input.entries)) {
      throw new TypeError("input.entries must be an array");
    }

    return input.entries.filter((entry) => isPlainObject(entry));
  }

  if (input.entryRefs !== undefined) {
    if (!Array.isArray(input.entryRefs)) {
      throw new TypeError("input.entryRefs must be an array");
    }

    if (!chain || typeof chain.getEntry !== "function") {
      throw new TypeError(
        "chain.getEntry is required when publishing by entryRefs"
      );
    }

    return input.entryRefs.flatMap((entryRef) => {
      if (!isNonEmptyString(entryRef)) {
        emitWarning(warn, "forensic_publication_skipped:invalid_entry_ref");
        return [];
      }

      const entry = chain.getEntry(entryRef);
      if (!entry) {
        emitWarning(warn, `forensic_publication_skipped:missing_entry:${entryRef}`);
        return [];
      }

      return [entry];
    });
  }

  return [];
}

class ChainPublisher {
  constructor(options = {}) {
    if (!isPlainObject(options)) {
      throw new TypeError("options must be a plain object");
    }

    this.chain = options.chain || null;
    this.transport = options.transport || null;
    this.warn = normalizeWarn(options.warn);

    if (
      this.chain !== null &&
      (typeof this.chain.getEntry !== "function" ||
        typeof this.chain.getEntries !== "function")
    ) {
      throw new TypeError("chain must expose getEntry(entryId) and getEntries()");
    }
  }

  async publishAppendedEntries(input = {}) {
    const entries = normalizeEntries(input, this.chain, this.warn);
    const entryMap = buildEntryMap(entries);
    const publications = [];

    for (const entry of entries) {
      if (!SUPPORTED_PUBLICATION_ENTRY_TYPES.includes(entry.entry_type)) {
        emitWarning(
          this.warn,
          `forensic_publication_skipped:unsupported_entry_type:${entry.entry_type}`
        );
        continue;
      }

      const subjectRefs = resolveSubjectRefs(entry, entryMap, this.chain);
      if (subjectRefs === null) {
        emitWarning(
          this.warn,
          `forensic_publication_skipped:subject_refs_absent:${entry.entry_id}`
        );
        continue;
      }

      const publication = {
        stream: MERIDIAN_PUBLICATION_STREAMS.EVIDENCE,
        subject: buildEvidenceSubject(
          subjectRefs.orgId,
          subjectRefs.entityId,
          FORENSIC_EVIDENCE_EVENT
        ),
        payload: buildPublicationPayload(entry, subjectRefs),
      };

      try {
        publications.push(
          await emitPublication(this.transport, publication)
        );
      } catch (error) {
        emitWarning(
          this.warn,
          `forensic_publication_failed:${entry.entry_id}:${error.message}`
        );
      }
    }

    return publications;
  }
}

module.exports = {
  ChainPublisher,
  FORENSIC_EVIDENCE_EVENT,
  SUPPORTED_PUBLICATION_ENTRY_TYPES,
};
