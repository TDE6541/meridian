const {
  RESERVED_CONTRACT_VERSIONS,
  createEmptyLiveFeedRefs,
  isNonEmptyString,
  isPlainObject,
} = require("./contracts");
const {
  createLiveFeedEventFromRecordV1,
} = require("./liveFeedEvent");
const {
  validateEntityDeltaV1,
} = require("./liveEntityDelta");
const {
  evaluateGovernanceRequest: defaultEvaluateGovernanceRequest,
} = require("../governance/runtime");

const LIVE_GOVERNANCE_EVALUATION_CONTRACT_VERSION =
  RESERVED_CONTRACT_VERSIONS.LIVE_GOVERNANCE_EVALUATION;

function cloneJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  if (isPlainObject(value)) {
    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        clone[key] = cloneJsonValue(entry);
      }
    }
    return clone;
  }

  return value;
}

function createGatewayResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function buildRefs(overrides = {}) {
  return {
    ...createEmptyLiveFeedRefs(),
    ...cloneJsonValue(overrides),
  };
}

function normalizeSource(source, fallbackRef = "live-governance-gateway") {
  return isPlainObject(source) && isNonEmptyString(source.type)
    ? cloneJsonValue(source)
    : {
        type: "live_gateway",
        ref: fallbackRef,
      };
}

function appendVisibleRecord(store, sessionId, input) {
  const appended = store.appendRecord(sessionId, {
    type: input.kind,
    source: normalizeSource(input.source),
    payload: {
      ...cloneJsonValue(input.payload || {}),
      live_feed_event: {
        kind: input.kind,
        severity: input.severity,
        title: input.title,
        summary: input.summary,
        refs: buildRefs(input.refs),
        visibility: input.visibility || "internal",
        foreman_hints: {
          narration_eligible: false,
          priority: 0,
          reason: "not_requested",
        },
      },
    },
    dashboard_visible: true,
  });

  if (!appended.ok) {
    return {
      ok: false,
      record: null,
      event: null,
      session: appended.session || null,
      issues: appended.issues,
    };
  }

  const eventResult = createLiveFeedEventFromRecordV1(appended.record);
  return {
    ok: eventResult.valid,
    record: appended.record,
    event: eventResult.event,
    session: appended.session,
    issues: eventResult.issues,
  };
}

function getSignalTreeGovernance(delta) {
  return isPlainObject(delta.entity?.signal_tree?.governance)
    ? delta.entity.signal_tree.governance
    : {};
}

function buildDefaultAuthorityContext(delta) {
  const authorityChain = getSignalTreeGovernance(delta).authority_chain || {};
  const authorityContext = {
    resolved:
      Array.isArray(authorityChain.missing_approvals) &&
      authorityChain.missing_approvals.length === 0 &&
      isNonEmptyString(authorityChain.requested_by_role),
    requested_by_role: authorityChain.requested_by_role || "live_gateway",
    required_approvals: Array.isArray(authorityChain.required_approvals)
      ? [...authorityChain.required_approvals]
      : [],
    resolved_approvals: Array.isArray(authorityChain.resolved_approvals)
      ? [...authorityChain.resolved_approvals]
      : [],
    missing_approvals: Array.isArray(authorityChain.missing_approvals)
      ? [...authorityChain.missing_approvals]
      : [],
  };

  return {
    ...authorityContext,
    ...cloneJsonValue(delta.authority_context || {}),
  };
}

function buildDefaultEvidenceContext(delta) {
  const evidence = getSignalTreeGovernance(delta).evidence || {};

  return {
    required_count: Number.isInteger(evidence.required_count)
      ? evidence.required_count
      : 0,
    present_count: Number.isInteger(evidence.present_count)
      ? evidence.present_count
      : 0,
    missing_types: Array.isArray(evidence.missing_types)
      ? [...evidence.missing_types]
      : [],
  };
}

function getGovernanceRequestFromContext(delta) {
  const context = delta.governance_context;
  const request = isPlainObject(context?.request)
    ? context.request
    : isPlainObject(context?.governance_request)
    ? context.governance_request
    : null;

  return request ? cloneJsonValue(request) : {};
}

function buildGovernanceRequest(delta) {
  const context = isPlainObject(delta.governance_context)
    ? delta.governance_context
    : {};
  const request = getGovernanceRequestFromContext(delta);
  const requestAuthorityContext = isPlainObject(request.authority_context)
    ? request.authority_context
    : {};
  const authorityContext = {
    ...buildDefaultAuthorityContext(delta),
    ...cloneJsonValue(requestAuthorityContext),
    ...cloneJsonValue(delta.authority_context || {}),
  };

  return {
    kind: request.kind || "command_request",
    org_id: request.org_id || delta.entity?.org_id || "unknown_org",
    entity_ref: isPlainObject(request.entity_ref)
      ? {
          entity_id: request.entity_ref.entity_id || delta.entity_id,
          entity_type:
            request.entity_ref.entity_type === undefined
              ? delta.entity_type
              : request.entity_ref.entity_type,
        }
      : {
          entity_id: delta.entity_id,
          entity_type: delta.entity_type,
        },
    authority_context: authorityContext,
    evidence_context: isPlainObject(request.evidence_context)
      ? cloneJsonValue(request.evidence_context)
      : buildDefaultEvidenceContext(delta),
    confidence_context:
      request.confidence_context !== undefined
        ? cloneJsonValue(request.confidence_context)
        : isPlainObject(context.confidence_context)
        ? cloneJsonValue(context.confidence_context)
        : null,
    candidate_signal_patch:
      request.candidate_signal_patch !== undefined
        ? cloneJsonValue(request.candidate_signal_patch)
        : isPlainObject(context.candidate_signal_patch)
        ? cloneJsonValue(context.candidate_signal_patch)
        : null,
    raw_subject:
      request.raw_subject ||
      context.raw_subject ||
      `live://${delta.source.type}/${delta.source.ref}/${delta.entity_type}/${delta.entity_id}`,
  };
}

function getAuthorityProjection(governanceResult) {
  const civic = governanceResult?.runtimeSubset?.civic;
  const authorityResolution = isPlainObject(civic?.authority_resolution)
    ? cloneJsonValue(civic.authority_resolution)
    : null;
  const revocation = isPlainObject(civic?.revocation)
    ? cloneJsonValue(civic.revocation)
    : null;

  if (!authorityResolution && !revocation) {
    return null;
  }

  return {
    authority_resolution: authorityResolution,
    revocation,
  };
}

function isAuthorityContextSupported(delta) {
  return (
    isPlainObject(delta.authority_context) &&
    (isPlainObject(delta.authority_context.domain_context) ||
      isPlainObject(delta.authority_context.actor_context) ||
      isPlainObject(delta.governance_context?.request?.authority_context?.domain_context) ||
      isPlainObject(delta.governance_context?.request?.authority_context?.actor_context) ||
      isPlainObject(
        delta.governance_context?.governance_request?.authority_context
          ?.domain_context
      ) ||
      isPlainObject(
        delta.governance_context?.governance_request?.authority_context
          ?.actor_context
      ))
  );
}

function recordForensicReceipt({
  forensicWriter,
  governanceRequest,
  governanceResult,
  stableRefs,
  occurredAt,
}) {
  if (
    !forensicWriter ||
    typeof forensicWriter.recordGovernanceResult !== "function"
  ) {
    return {
      receipt: null,
      warnings: [],
    };
  }

  try {
    const sidecar = forensicWriter.recordGovernanceResult({
      request: governanceRequest,
      governanceResult,
      stableRefs,
      occurredAt,
    });

    if (
      sidecar?.status === "RECORDED" &&
      Array.isArray(sidecar.entryRefs) &&
      sidecar.entryRefs.length > 0
    ) {
      return {
        receipt: {
          status: sidecar.status,
          entryRefs: [...sidecar.entryRefs],
          warnings: Array.isArray(sidecar.warnings)
            ? [...sidecar.warnings]
            : [],
        },
        warnings: Array.isArray(sidecar.warnings) ? [...sidecar.warnings] : [],
      };
    }

    return {
      receipt: null,
      warnings: Array.isArray(sidecar?.warnings) ? [...sidecar.warnings] : [],
    };
  } catch (error) {
    return {
      receipt: null,
      warnings: [`forensic_writer_failed:${error.message}`],
    };
  }
}

function createLiveGovernanceGateway(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError("options must be a plain object");
  }

  const store = options.store || null;
  const evaluateGovernanceRequest =
    options.evaluateGovernanceRequest || defaultEvaluateGovernanceRequest;
  const now = options.now || (() => new Date().toISOString());
  const idGenerator =
    options.idGenerator || ((prefix, id) => `${prefix}-${id}`);
  const forensicWriter = options.forensicWriter || options.chainWriter || null;

  if (!store || typeof store.appendRecord !== "function") {
    throw new TypeError("store.appendRecord is required");
  }

  if (typeof evaluateGovernanceRequest !== "function") {
    throw new TypeError("evaluateGovernanceRequest must be a function");
  }

  function raiseHold(delta, issues, input = {}) {
    const sessionId =
      input.session_id ||
      input.session?.session_id ||
      (isPlainObject(delta) ? delta.session_id : null);
    const events = [];

    if (isNonEmptyString(sessionId)) {
      const appended = appendVisibleRecord(store, sessionId, {
        kind: "error.hold",
        severity: "BLOCK",
        title: "Entity delta held",
        summary: "Malformed entity delta failed closed before governance evaluation.",
        source: normalizeSource(delta?.source),
        refs: buildRefs(),
        payload: {
          hold: {
            posture: "BLOCK",
            reason: "entity_delta_invalid",
            issues: [...issues],
          },
        },
      });

      if (appended.ok) {
        events.push(appended.event);
      }
    }

    return createGatewayResult(
      false,
      {
        decision: "BLOCK",
        reason: "entity_delta_invalid",
        events,
        governance_evaluation: null,
      },
      issues
    );
  }

  function evaluate(delta, input = {}) {
    const validation = validateEntityDeltaV1(delta);
    if (!validation.valid) {
      return raiseHold(delta, validation.issues, input);
    }

    const sessionId = input.session_id || input.session?.session_id || delta.session_id;
    const events = [];
    const records = [];
    let latestSession = null;
    const accepted = appendVisibleRecord(store, sessionId, {
      kind: "entity.delta.accepted",
      severity: "INFO",
      title: "Entity delta accepted",
      summary: `${delta.operation} accepted for ${delta.entity_type}:${delta.entity_id}.`,
      source: delta.source,
      refs: buildRefs({
        entity_ids: [delta.entity_id],
      }),
      payload: {
        delta: cloneJsonValue(delta),
      },
    });

    if (!accepted.ok) {
      return createGatewayResult(
        false,
        {
          decision: "BLOCK",
          reason: "live_session_append_failed",
          events,
          governance_evaluation: null,
        },
        accepted.issues
      );
    }

    events.push(accepted.event);
    records.push(accepted.record);
    latestSession = accepted.session;

    const evaluatedAt = now();
    const governanceRequest = buildGovernanceRequest(delta);
    let governanceResult;
    try {
      governanceResult = evaluateGovernanceRequest(governanceRequest);
    } catch (error) {
      governanceResult = {
        decision: "BLOCK",
        reason: "governance_runtime_error",
        runtime_error: error.message,
      };
    }

    const evaluationId = idGenerator("live-governance-evaluation", delta.delta_id);
    const stableRefs = {
      governanceEntryId: `${evaluationId}:governance`,
      authorityEntryId: `${evaluationId}:authority`,
    };
    const forensic = recordForensicReceipt({
      forensicWriter,
      governanceRequest,
      governanceResult,
      stableRefs,
      occurredAt: evaluatedAt,
    });
    const authorityProjection = getAuthorityProjection(governanceResult);
    const governanceEvaluation = {
      version: LIVE_GOVERNANCE_EVALUATION_CONTRACT_VERSION,
      evaluation_id: evaluationId,
      delta_id: delta.delta_id,
      session_id: sessionId,
      evaluated_at: evaluatedAt,
      governance_request: governanceRequest,
      governance_result: cloneJsonValue(governanceResult),
      authority: authorityProjection,
      forensicReceiptRef: forensic.receipt
        ? forensic.receipt.entryRefs[0] || null
        : null,
      forensic_receipt: forensic.receipt,
      warnings: forensic.warnings,
    };
    const governanceRecord = appendVisibleRecord(store, sessionId, {
      kind: "governance.evaluated",
      severity:
        governanceResult.decision === "BLOCK"
          ? "BLOCK"
          : governanceResult.decision === "HOLD"
          ? "HOLD"
          : governanceResult.decision === "REVOKE"
          ? "REVOKE"
          : "INFO",
      title: "Governance evaluated",
      summary: `Governance returned ${governanceResult.decision}.`,
      source: {
        type: "live_gateway",
        ref: evaluationId,
      },
      refs: buildRefs({
        entity_ids: [delta.entity_id],
        governance_ref: evaluationId,
        authority_ref: authorityProjection ? `${evaluationId}:authority` : null,
        forensic_refs: forensic.receipt ? forensic.receipt.entryRefs : [],
      }),
      payload: {
        governance_evaluation: governanceEvaluation,
        governance_result: cloneJsonValue(governanceResult),
      },
    });

    if (!governanceRecord.ok) {
      return createGatewayResult(
        false,
        {
          decision: "BLOCK",
          reason: "live_session_append_failed",
          events,
          governance_evaluation: governanceEvaluation,
        },
        governanceRecord.issues
      );
    }

    events.push(governanceRecord.event);
    records.push(governanceRecord.record);
    latestSession = governanceRecord.session;

    if (authorityProjection && isAuthorityContextSupported(delta)) {
      const authorityRecord = appendVisibleRecord(store, sessionId, {
        kind: "authority.evaluated",
        severity:
          authorityProjection.authority_resolution?.decision === "BLOCK"
            ? "BLOCK"
            : authorityProjection.authority_resolution?.decision === "HOLD"
            ? "HOLD"
            : "INFO",
        title: "Authority evaluated",
        summary: "Authority projection was preserved from the governance runtime.",
        source: {
          type: "live_gateway",
          ref: `${evaluationId}:authority`,
        },
        refs: buildRefs({
          entity_ids: [delta.entity_id],
          governance_ref: evaluationId,
          authority_ref: `${evaluationId}:authority`,
          forensic_refs: forensic.receipt ? forensic.receipt.entryRefs : [],
        }),
        payload: {
          authority: authorityProjection,
          governance_ref: evaluationId,
        },
      });

      if (!authorityRecord.ok) {
        return createGatewayResult(
          false,
          {
            decision: "BLOCK",
            reason: "live_session_append_failed",
            events,
            governance_evaluation: governanceEvaluation,
          },
          authorityRecord.issues
        );
      }

      events.push(authorityRecord.event);
      records.push(authorityRecord.record);
      latestSession = authorityRecord.session;
    }

    if (forensic.receipt) {
      const forensicRecord = appendVisibleRecord(store, sessionId, {
        kind: "forensic.receipt",
        severity: "INFO",
        title: "Forensic receipt linked",
        summary: "Approved forensic writer produced entry refs.",
        source: {
          type: "live_gateway",
          ref: `${evaluationId}:forensic`,
        },
        refs: buildRefs({
          entity_ids: [delta.entity_id],
          governance_ref: evaluationId,
          authority_ref: authorityProjection ? `${evaluationId}:authority` : null,
          forensic_refs: forensic.receipt.entryRefs,
        }),
        payload: {
          forensic_receipt: forensic.receipt,
        },
      });

      if (!forensicRecord.ok) {
        return createGatewayResult(
          false,
          {
            decision: "BLOCK",
            reason: "live_session_append_failed",
            events,
            governance_evaluation: governanceEvaluation,
          },
          forensicRecord.issues
        );
      }

      events.push(forensicRecord.event);
      records.push(forensicRecord.record);
      latestSession = forensicRecord.session;
    }

    return createGatewayResult(true, {
      decision: governanceResult.decision,
      reason: governanceResult.reason,
      events,
      records,
      governance_evaluation: governanceEvaluation,
      session: latestSession,
    });
  }

  return {
    evaluate,
  };
}

function evaluateLiveEntityDelta(delta, options = {}) {
  return createLiveGovernanceGateway(options).evaluate(delta, options);
}

module.exports = {
  LIVE_GOVERNANCE_EVALUATION_CONTRACT_VERSION,
  buildGovernanceRequest,
  createLiveGovernanceGateway,
  evaluateLiveEntityDelta,
};
