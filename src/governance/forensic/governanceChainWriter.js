const { isGovernanceDecision } = require("../runtime/decisionVocabulary");
const { CivicForensicChain, cloneValue } = require("./civicForensicChain");

const CHAIN_WRITE_STATUSES = Object.freeze({
  RECORDED: "RECORDED",
  SKIPPED: "SKIPPED",
  FAILED: "FAILED",
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function assignStableRef(target, key, value) {
  if (isNonEmptyString(value)) {
    target[key] = value;
  }
}

function collectGovernanceRefs(request, stableRefs) {
  const refs = {};

  assignStableRef(refs, "request_id", stableRefs.requestId || stableRefs.request_id);
  assignStableRef(refs, "org_id", request.org_id);
  assignStableRef(refs, "entity_id", request.entity_ref?.entity_id);
  assignStableRef(refs, "entity_type", request.entity_ref?.entity_type);
  assignStableRef(refs, "raw_subject", request.raw_subject);

  return refs;
}

function collectAuthorityRefs(request) {
  const refs = {};
  const authorityContext = isPlainObject(request.authority_context)
    ? request.authority_context
    : null;
  const domainContext = isPlainObject(authorityContext?.domain_context)
    ? authorityContext.domain_context
    : null;
  const actorContext = isPlainObject(authorityContext?.actor_context)
    ? authorityContext.actor_context
    : null;
  const authorityGrant = isPlainObject(domainContext?.authority_grant)
    ? domainContext.authority_grant
    : null;

  assignStableRef(refs, "requested_by_role", authorityContext?.requested_by_role);
  assignStableRef(refs, "domain_id", domainContext?.domain_id);
  assignStableRef(refs, "role_id", domainContext?.role_id);
  assignStableRef(refs, "requester_org_id", domainContext?.requester_org_id);
  assignStableRef(refs, "subject_department_id", domainContext?.subject_department_id);
  assignStableRef(refs, "subject_org_id", domainContext?.subject_org_id);
  assignStableRef(
    refs,
    "subject_portfolio_org_id",
    domainContext?.subject_portfolio_org_id
  );
  assignStableRef(refs, "jurisdiction_id", domainContext?.jurisdiction_id);
  assignStableRef(refs, "granted_by_entity_id", authorityGrant?.granted_by_entity_id);
  assignStableRef(refs, "actor_id", actorContext?.actor_id);
  assignStableRef(refs, "target_id", actorContext?.target_id);

  return refs;
}

function persistChain(persistence, chain) {
  if (!persistence) {
    return null;
  }

  if (typeof persistence.saveChain === "function") {
    return persistence.saveChain(chain);
  }

  if (typeof persistence.persistChain === "function") {
    return persistence.persistChain(chain);
  }

  throw new TypeError(
    "persistence must expose saveChain(chain) or persistChain(chain)"
  );
}

function buildGovernanceEntry(request, governanceResult, stableRefs, occurredAt) {
  const governanceEntryId =
    stableRefs.governanceEntryId || stableRefs.governance_entry_id;

  if (!isNonEmptyString(governanceEntryId)) {
    return {
      entry: null,
      warning: "missing_stable_ref:governanceEntryId",
    };
  }

  return {
    entry: {
      entry_id: governanceEntryId,
      entry_type: "GOVERNANCE_DECISION",
      occurred_at: occurredAt,
      linked_entry_ids: [],
      refs: collectGovernanceRefs(request, stableRefs),
      payload: {
        request: cloneValue(request),
        governance_result: cloneValue(governanceResult),
      },
    },
    warning: null,
  };
}

function buildAuthorityEntry(request, governanceResult, stableRefs, occurredAt) {
  const authorityResolution =
    governanceResult?.runtimeSubset?.civic?.authority_resolution || null;

  if (!isPlainObject(authorityResolution) || authorityResolution.active !== true) {
    return {
      entry: null,
      warning: null,
    };
  }

  const authorityEntryId =
    stableRefs.authorityEntryId || stableRefs.authority_entry_id;
  if (!isNonEmptyString(authorityEntryId)) {
    return {
      entry: null,
      warning: "missing_stable_ref:authorityEntryId",
    };
  }

  const authorityRefs = collectAuthorityRefs(request);
  if (Object.keys(authorityRefs).length === 0) {
    return {
      entry: null,
      warning: "authority_evidence_stable_refs_absent",
    };
  }

  const governanceEntryId =
    stableRefs.governanceEntryId || stableRefs.governance_entry_id;

  return {
    entry: {
      entry_id: authorityEntryId,
      entry_type: "AUTHORITY_EVALUATION",
      occurred_at: occurredAt,
      linked_entry_ids: [governanceEntryId],
      refs: {
        ...authorityRefs,
        governance_entry_id: governanceEntryId,
      },
      payload: {
        authority_resolution: cloneValue(authorityResolution),
        revocation: cloneValue(governanceResult?.runtimeSubset?.civic?.revocation || null),
      },
    },
    warning: null,
  };
}

class GovernanceChainWriter {
  constructor(options = {}) {
    if (!isPlainObject(options)) {
      throw new TypeError("options must be a plain object");
    }

    this.chain =
      options.chain ||
      new CivicForensicChain({
        baseEntryTypes: options.baseEntryTypes || options.base_entry_types || [],
      });
    this.persistence = options.persistence || null;
    this.now = options.now || (() => new Date().toISOString());

    if (
      !this.chain ||
      typeof this.chain.append !== "function" ||
      typeof this.chain.getEntries !== "function"
    ) {
      throw new TypeError("chain must expose append(entry) and getEntries()");
    }

    if (typeof this.now !== "function") {
      throw new TypeError("now must be a function");
    }
  }

  recordGovernanceResult(input) {
    if (!isPlainObject(input)) {
      throw new TypeError("input must be a plain object");
    }

    const request = input.request;
    const governanceResult = input.governanceResult || input.governance_result;
    const stableRefs = input.stableRefs || input.stable_refs || {};
    const occurredAt = input.occurredAt || input.occurred_at || this.now();

    if (!isPlainObject(request)) {
      throw new TypeError("input.request must be a plain object");
    }

    if (
      !isPlainObject(governanceResult) ||
      !isGovernanceDecision(governanceResult.decision) ||
      !isNonEmptyString(governanceResult.reason)
    ) {
      throw new TypeError(
        "input.governanceResult must contain a valid decision and reason"
      );
    }

    if (!isPlainObject(stableRefs)) {
      throw new TypeError("input.stableRefs must be a plain object");
    }

    if (!isNonEmptyString(occurredAt)) {
      throw new TypeError("input.occurredAt must be a non-empty string");
    }

    const warnings = [];
    const entryRefs = [];

    const governanceEntryOutcome = buildGovernanceEntry(
      request,
      governanceResult,
      stableRefs,
      occurredAt
    );
    if (!governanceEntryOutcome.entry) {
      return {
        status: CHAIN_WRITE_STATUSES.SKIPPED,
        entryRefs,
        warnings: governanceEntryOutcome.warning
          ? [governanceEntryOutcome.warning]
          : warnings,
      };
    }

    const governanceEntry = this.chain.append(governanceEntryOutcome.entry);
    entryRefs.push(governanceEntry.entry_id);

    const authorityEntryOutcome = buildAuthorityEntry(
      request,
      governanceResult,
      stableRefs,
      occurredAt
    );
    if (authorityEntryOutcome.warning) {
      warnings.push(authorityEntryOutcome.warning);
    }

    if (authorityEntryOutcome.entry) {
      const authorityEntry = this.chain.append(authorityEntryOutcome.entry);
      entryRefs.push(authorityEntry.entry_id);
    }

    try {
      persistChain(this.persistence, this.chain);
    } catch (error) {
      warnings.push(`persistence_failed:${error.message}`);

      return {
        status: CHAIN_WRITE_STATUSES.FAILED,
        entryRefs,
        warnings,
      };
    }

    return {
      status: CHAIN_WRITE_STATUSES.RECORDED,
      entryRefs,
      warnings,
    };
  }
}

module.exports = {
  CHAIN_WRITE_STATUSES,
  GovernanceChainWriter,
};
