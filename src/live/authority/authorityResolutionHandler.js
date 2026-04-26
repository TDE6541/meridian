const {
  createEmptyLiveFeedRefs,
  isNonEmptyString,
  isPlainObject,
  isPositiveInteger,
} = require("../contracts");
const { createEvidenceArtifact } = require("../../entities/evidence_artifact");
const { createEntityDeltaV1 } = require("../liveEntityDelta");
const { createLiveFeedEventV1 } = require("../liveFeedEvent");
const {
  G2_GENERATED_AUTHORITY_REQUEST_STATUS,
  cloneJsonValue,
  isValidDateTimeString,
} = require("./authorityContracts");
const {
  hashAuthorityActionToken,
  verifyAuthorityActionToken,
} = require("./authorityTokens");

const AUTHORITY_RESOLUTION_ACTIONS = Object.freeze([
  "approve",
  "deny",
  "request_info",
  "expire",
]);

const TOKEN_REQUIRED_ACTIONS = Object.freeze([
  "approve",
  "deny",
  "request_info",
]);

function createHandlerResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    holds: Object.freeze(
      issues.map((code) => ({
        code,
        reason: code,
      }))
    ),
    ...extra,
  };
}

function normalizeSecret(options = {}) {
  return isNonEmptyString(options.secret)
    ? options.secret
    : isNonEmptyString(options.tokenSecret)
    ? options.tokenSecret
    : null;
}

function resolveCurrentTime(input = {}, options = {}) {
  const inputTime = input.current_time;
  const optionTime = options.currentTime;

  if (isNonEmptyString(inputTime) && isNonEmptyString(optionTime)) {
    if (inputTime !== optionTime) {
      return {
        current_time: null,
        issues: ["current_time_conflict"],
      };
    }

    return {
      current_time: inputTime,
      issues: [],
    };
  }

  return {
    current_time: isNonEmptyString(inputTime)
      ? inputTime
      : isNonEmptyString(optionTime)
      ? optionTime
      : null,
    issues: [],
  };
}

function getConsumedTokenHashes(request) {
  return Array.isArray(request.consumed_action_token_hashes)
    ? request.consumed_action_token_hashes.filter(isNonEmptyString)
    : [];
}

function appendConsumedTokenHash(request, tokenHash) {
  const consumed = getConsumedTokenHashes(request);

  return consumed.includes(tokenHash) ? consumed : [...consumed, tokenHash];
}

function buildLifecycleRecord({
  request,
  action,
  fromStatus,
  toStatus,
  currentTime,
  tokenHash,
  input,
}) {
  return {
    kind: "authority_resolution_lifecycle",
    request_id: request.request_id,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    occurred_at: currentTime,
    actor_ref: input.actor_ref || null,
    reason: input.reason || null,
    token_hash: tokenHash || null,
    request_info:
      action === "request_info" && input.request_info !== undefined
        ? cloneJsonValue(input.request_info)
        : null,
  };
}

function buildDenialRecord({ request, currentTime, tokenHash, input }) {
  return {
    kind: "authority_denial",
    request_id: request.request_id,
    denied_at: currentTime,
    actor_ref: input.actor_ref || null,
    reason: input.reason || null,
    token_hash: tokenHash,
  };
}

function requiredEvidenceFields(evidenceInput) {
  const requiredStringFields = [
    "delta_id",
    "session_id",
    "entity_id",
    "org_id",
    "name",
    "status",
    "source_type",
    "source_ref",
    "operation",
  ];
  const missing = requiredStringFields.filter(
    (fieldName) => !isNonEmptyString(evidenceInput[fieldName])
  );

  if (typeof evidenceInput.is_live !== "boolean") {
    missing.push("is_live");
  }

  if (!isPlainObject(evidenceInput.governance_context)) {
    missing.push("governance_context");
  }

  if (!isPlainObject(evidenceInput.authority_context)) {
    missing.push("authority_context");
  }

  return missing;
}

function createAuthorityEvidenceHold(reason, extra = {}) {
  return {
    status: "HOLD",
    code: "authority_evidence_delta_unavailable",
    reason,
    ...extra,
  };
}

function prepareAuthorityEvidenceDelta({ request, currentTime, evidenceInput }) {
  if (!isPlainObject(evidenceInput)) {
    return {
      ok: false,
      delta: null,
      hold: createAuthorityEvidenceHold(
        "authority_evidence input is required to prepare EntityDeltaV1 safely."
      ),
    };
  }

  const missing = requiredEvidenceFields(evidenceInput);
  if (missing.length > 0) {
    return {
      ok: false,
      delta: null,
      hold: createAuthorityEvidenceHold(
        "authority_evidence missing required EntityDeltaV1/evidence_artifact fields.",
        { missing_fields: missing }
      ),
    };
  }

  const entity = createEvidenceArtifact({
    entity_id: evidenceInput.entity_id,
    org_id: evidenceInput.org_id,
    name: evidenceInput.name,
    status: evidenceInput.status,
    priority:
      evidenceInput.priority === undefined ? null : evidenceInput.priority,
    is_live: evidenceInput.is_live,
  });
  const created = createEntityDeltaV1({
    delta_id: evidenceInput.delta_id,
    session_id: evidenceInput.session_id,
    timestamp: currentTime,
    operation: evidenceInput.operation,
    entity_type: entity.entity_type,
    entity_id: entity.entity_id,
    entity,
    source: {
      type: evidenceInput.source_type,
      ref: evidenceInput.source_ref,
    },
    governance_context: cloneJsonValue(evidenceInput.governance_context),
    authority_context: {
      ...cloneJsonValue(evidenceInput.authority_context),
      request_id: request.request_id,
    },
  });

  if (!created.ok) {
    return {
      ok: false,
      delta: null,
      hold: createAuthorityEvidenceHold(
        "prepared authority evidence delta failed existing EntityDeltaV1 validation.",
        { issues: [...created.issues] }
      ),
    };
  }

  return {
    ok: true,
    delta: created.delta,
    hold: null,
  };
}

function severityForAction(action) {
  if (action === "deny") {
    return "HOLD";
  }

  if (action === "expire") {
    return "WATCH";
  }

  return "INFO";
}

function createAuthorityLiveEventHold(reason, extra = {}) {
  return {
    status: "HOLD",
    code: "authority_live_event_unavailable",
    reason,
    ...extra,
  };
}

function prepareAuthorityLiveEvent({
  request,
  action,
  currentTime,
  liveEventInput,
  evidenceDelta,
}) {
  if (!isPlainObject(liveEventInput)) {
    return {
      ok: false,
      event: null,
      hold: createAuthorityLiveEventHold(
        "live_event input is required to prepare an authority.evaluated event safely."
      ),
    };
  }

  if (
    !isNonEmptyString(liveEventInput.event_id) ||
    !isNonEmptyString(liveEventInput.session_id) ||
    !isPositiveInteger(liveEventInput.sequence) ||
    !isPlainObject(liveEventInput.source)
  ) {
    return {
      ok: false,
      event: null,
      hold: createAuthorityLiveEventHold(
        "live_event event_id, session_id, sequence, and source are required."
      ),
    };
  }

  const refs = {
    ...createEmptyLiveFeedRefs(),
    ...(isPlainObject(liveEventInput.refs)
      ? cloneJsonValue(liveEventInput.refs)
      : {}),
    evidence_ids: evidenceDelta ? [evidenceDelta.entity_id] : [],
    authority_ref: request.request_id,
    absence_refs: isNonEmptyString(request.source_absence_id)
      ? [request.source_absence_id]
      : [],
  };
  const created = createLiveFeedEventV1({
    event_id: liveEventInput.event_id,
    session_id: liveEventInput.session_id,
    sequence: liveEventInput.sequence,
    timestamp: currentTime,
    kind: "authority.evaluated",
    severity: severityForAction(action),
    title: liveEventInput.title || "Authority evaluated",
    summary:
      liveEventInput.summary ||
      `Authority request ${request.request_id} resolved with ${action}.`,
    source: cloneJsonValue(liveEventInput.source),
    refs,
    visibility: liveEventInput.visibility || "internal",
    foreman_hints: {
      narration_eligible: false,
      priority: 0,
      reason: "not_requested",
    },
  });

  if (!created.ok) {
    return {
      ok: false,
      event: null,
      hold: createAuthorityLiveEventHold(
        "existing LiveFeedEventV1 helper rejected authority.evaluated output.",
        { issues: [...created.issues] }
      ),
    };
  }

  return {
    ok: true,
    event: created.event,
    hold: null,
  };
}

function resolveAuthorityRequestAction(input = {}, options = {}) {
  if (!isPlainObject(input)) {
    return createHandlerResult(false, {}, ["input must be a plain object."]);
  }

  const action = input.action;
  if (!AUTHORITY_RESOLUTION_ACTIONS.includes(action)) {
    return createHandlerResult(false, {}, [
      `action is not allowed: ${String(action)}`,
    ]);
  }

  const store = input.store || options.store;
  if (
    !store ||
    typeof store.getRequestById !== "function" ||
    typeof store.updateRequestById !== "function"
  ) {
    return createHandlerResult(false, {}, [
      "authority request store with updateRequestById is required.",
    ]);
  }

  if (!isNonEmptyString(input.request_id)) {
    return createHandlerResult(false, {}, [
      "request_id must be a non-empty string.",
    ]);
  }

  const current = resolveCurrentTime(input, options);
  if (current.issues.length > 0) {
    return createHandlerResult(false, {}, current.issues);
  }

  if (!isValidDateTimeString(current.current_time)) {
    return createHandlerResult(false, {}, ["current_time_required"]);
  }

  const request = store.getRequestById(input.request_id);
  if (!request) {
    return createHandlerResult(false, {}, [
      `request_id not found: ${input.request_id}`,
    ]);
  }

  if (request.status !== G2_GENERATED_AUTHORITY_REQUEST_STATUS) {
    return createHandlerResult(
      false,
      {
        request,
      },
      ["request_not_pending"]
    );
  }

  if (action === "expire") {
    if (!isValidDateTimeString(request.expiry)) {
      return createHandlerResult(false, { request }, ["request_expiry_required"]);
    }

    if (Date.parse(current.current_time) < Date.parse(request.expiry)) {
      return createHandlerResult(false, { request }, ["request_not_expired"]);
    }

    const lifecycleRecord = buildLifecycleRecord({
      request,
      action,
      fromStatus: request.status,
      toStatus: "expired",
      currentTime: current.current_time,
      tokenHash: null,
      input,
    });
    const updated = store.updateRequestById(request.request_id, (currentRequest) => ({
      ...currentRequest,
      status: "expired",
    }));

    if (!updated.ok) {
      return createHandlerResult(false, { request }, updated.issues);
    }

    return createHandlerResult(true, {
      action,
      lifecycle_record: lifecycleRecord,
      request: updated.request,
      previous_request: updated.previous_request,
    });
  }

  if (!isNonEmptyString(input.token)) {
    return createHandlerResult(false, { request }, ["action_token_required"]);
  }

  const secret = normalizeSecret(options);
  const verified = verifyAuthorityActionToken(
    input.token,
    {
      request_id: request.request_id,
      action,
      current_time: current.current_time,
    },
    { secret }
  );
  if (!verified.ok) {
    return createHandlerResult(false, { request }, verified.issues);
  }

  const tokenHash = verified.token_hash || hashAuthorityActionToken(input.token);
  if (getConsumedTokenHashes(request).includes(tokenHash)) {
    return createHandlerResult(false, { request }, [
      "action_token_already_consumed",
    ]);
  }

  const nextStatus =
    action === "approve" ? "approved" : action === "deny" ? "denied" : request.status;
  const lifecycleRecord = buildLifecycleRecord({
    request,
    action,
    fromStatus: request.status,
    toStatus: nextStatus,
    currentTime: current.current_time,
    tokenHash,
    input,
  });
  const updated = store.updateRequestById(request.request_id, (currentRequest) => ({
    ...currentRequest,
    status: nextStatus,
    consumed_action_token_hashes: appendConsumedTokenHash(
      currentRequest,
      tokenHash
    ),
  }));

  if (!updated.ok) {
    return createHandlerResult(false, { request }, updated.issues);
  }

  const extra = {
    action,
    lifecycle_record: lifecycleRecord,
    request: updated.request,
    previous_request: updated.previous_request,
  };

  if (action === "deny") {
    extra.denial_record = buildDenialRecord({
      request,
      currentTime: current.current_time,
      tokenHash,
      input,
    });
  }

  if (action === "approve") {
    const evidence = prepareAuthorityEvidenceDelta({
      request,
      currentTime: current.current_time,
      evidenceInput: input.authority_evidence,
    });
    const liveEvent = prepareAuthorityLiveEvent({
      request,
      action,
      currentTime: current.current_time,
      liveEventInput: input.live_event,
      evidenceDelta: evidence.delta,
    });

    extra.authority_evidence = evidence.ok
      ? {
          status: "PASS",
          delta: evidence.delta,
        }
      : evidence.hold;
    extra.live_event = liveEvent.ok
      ? {
          status: "PASS",
          event: liveEvent.event,
        }
      : liveEvent.hold;
  }

  return createHandlerResult(true, extra);
}

module.exports = {
  AUTHORITY_RESOLUTION_ACTIONS,
  TOKEN_REQUIRED_ACTIONS,
  prepareAuthorityEvidenceDelta,
  prepareAuthorityLiveEvent,
  resolveAuthorityRequestAction,
};
