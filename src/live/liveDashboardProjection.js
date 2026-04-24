const {
  RESERVED_CONTRACT_VERSIONS,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  validateLiveSessionStatus,
} = require("./contracts");
const { getLiveFeedEvents } = require("./liveEventBus");

const DASHBOARD_LIVE_PROJECTION_CONTRACT_VERSION =
  RESERVED_CONTRACT_VERSIONS.DASHBOARD_LIVE_PROJECTION;

const LIVE_DASHBOARD_CONNECTION_STATUSES = Object.freeze([
  "connected",
  "disconnected",
  "holding",
]);

function cloneJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  if (isPlainObject(value)) {
    const clone = {};
    for (const [key, entry] of Object.entries(value)) {
      clone[key] = cloneJsonValue(entry);
    }
    return clone;
  }

  return value;
}

function createEmptyLatest() {
  return {
    capture: null,
    governance: null,
    authority: null,
    forensic: null,
    absence: null,
  };
}

function normalizeSession(input) {
  if (isPlainObject(input.session)) {
    return input.session;
  }

  if (
    input.store &&
    typeof input.store.loadSession === "function" &&
    isNonEmptyString(input.session_id)
  ) {
    const loaded = input.store.loadSession(input.session_id);
    return loaded.ok ? loaded.session : null;
  }

  return null;
}

function collectEntitySummary(records) {
  const countsByType = {};
  const changedEntityIds = [];
  const seenEntityIds = new Set();

  for (const record of records) {
    const delta = record?.payload?.delta;
    if (!isPlainObject(delta)) {
      continue;
    }

    if (isNonEmptyString(delta.entity_type)) {
      countsByType[delta.entity_type] =
        (countsByType[delta.entity_type] || 0) + 1;
    }

    if (isNonEmptyString(delta.entity_id) && !seenEntityIds.has(delta.entity_id)) {
      seenEntityIds.add(delta.entity_id);
      changedEntityIds.push(delta.entity_id);
    }
  }

  return {
    counts_by_type: countsByType,
    changed_entity_ids: changedEntityIds,
  };
}

function collectLatest(records) {
  const latest = createEmptyLatest();

  for (const record of records) {
    if (record.type === "capture.artifact_ingested") {
      latest.capture = cloneJsonValue(record.payload.capture || record.payload);
    }

    if (record.type === "governance.evaluated") {
      latest.governance = cloneJsonValue(
        record.payload.governance_evaluation ||
          record.payload.governance_result ||
          record.payload
      );
    }

    if (record.type === "authority.evaluated") {
      latest.authority = cloneJsonValue(
        record.payload.authority || record.payload
      );
    }

    if (record.type === "forensic.receipt") {
      latest.forensic = cloneJsonValue(
        record.payload.forensic_receipt || record.payload
      );
    }

    if (record.type === "absence.finding.created") {
      latest.absence = cloneJsonValue(
        record.payload.absence_finding || record.payload
      );
    }
  }

  return latest;
}

function getLatestEvent(events) {
  return events.length > 0 ? events[events.length - 1] : null;
}

function getLatestEventRef(events, kind, refName) {
  const event = [...events].reverse().find((entry) => entry.kind === kind);
  if (!event) {
    return null;
  }

  return event.refs?.[refName] || event.event_id || null;
}

function getLatestEventRefs(events, kind, refName) {
  const event = [...events].reverse().find((entry) => entry.kind === kind);
  const refs = event?.refs?.[refName];
  return Array.isArray(refs) ? [...refs] : [];
}

function createDashboardLiveProjectionV1(input = {}) {
  const session = normalizeSession(input);
  const issues = [];

  if (!isPlainObject(session)) {
    issues.push("session is required.");
  }

  const records = Array.isArray(session?.records) ? session.records : [];
  const eventResult = Array.isArray(input.events)
    ? {
        events: input.events.map(cloneJsonValue),
        issues: [],
      }
    : getLiveFeedEvents({ records });
  issues.push(...(eventResult.issues || []));

  const connectionStatus = input.connection_status || "connected";
  if (!LIVE_DASHBOARD_CONNECTION_STATUSES.includes(connectionStatus)) {
    issues.push(
      `connection.status is not allowed: ${String(connectionStatus)}`
    );
  }

  if (isPlainObject(session)) {
    issues.push(...validateLiveSessionStatus(session.status).issues);
  }

  if (issues.length > 0) {
    return {
      ok: false,
      valid: false,
      projection: null,
      issues: Object.freeze(issues),
    };
  }

  const events = eventResult.events.map(cloneJsonValue);
  const latestEvent = getLatestEvent(events);
  const activeSkin = input.active_skin || null;
  const activeEventId = input.active_event_id || latestEvent?.event_id || null;
  const entitySummary = collectEntitySummary(records);
  const latest = collectLatest(records);

  const projection = {
    version: DASHBOARD_LIVE_PROJECTION_CONTRACT_VERSION,
    session: {
      session_id: session.session_id,
      status: session.status,
      created_at: session.created_at,
      updated_at: session.updated_at,
    },
    connection: {
      status: connectionStatus,
      hold_reason: input.hold_reason || null,
    },
    current: {
      active_skin: activeSkin,
      active_event_id: activeEventId,
    },
    entities: entitySummary,
    latest,
    events,
    skins: {
      outputs: isPlainObject(input.skins?.outputs)
        ? cloneJsonValue(input.skins.outputs)
        : {},
    },
    foreman_context_seed: {
      active_session_id: session.session_id,
      active_skin: activeSkin,
      active_event_id: activeEventId,
      visible_entity_ids: [...entitySummary.changed_entity_ids],
      latest_governance_ref: getLatestEventRef(
        events,
        "governance.evaluated",
        "governance_ref"
      ),
      latest_absence_refs: getLatestEventRefs(
        events,
        "absence.finding.created",
        "absence_refs"
      ),
      latest_forensic_refs: getLatestEventRefs(
        events,
        "forensic.receipt",
        "forensic_refs"
      ),
      public_boundary: {
        mode: "inert_a2_projection_only",
        no_model_api: true,
      },
      role_session: input.role_session || null,
    },
  };

  return {
    ok: true,
    valid: true,
    projection,
    issues: Object.freeze([]),
  };
}

function validateDashboardLiveProjectionV1(projection) {
  const issues = [];

  if (!isPlainObject(projection)) {
    return createValidationResult([
      "DashboardLiveProjectionV1 must be a plain object.",
    ]);
  }

  if (projection.version !== DASHBOARD_LIVE_PROJECTION_CONTRACT_VERSION) {
    issues.push(
      `version must equal ${DASHBOARD_LIVE_PROJECTION_CONTRACT_VERSION}.`
    );
  }

  if (!isNonEmptyString(projection.session?.session_id)) {
    issues.push("session.session_id must be a non-empty string.");
  }

  issues.push(...validateLiveSessionStatus(projection.session?.status).issues);

  if (
    !LIVE_DASHBOARD_CONNECTION_STATUSES.includes(projection.connection?.status)
  ) {
    issues.push("connection.status is invalid.");
  }

  if (!isPlainObject(projection.entities?.counts_by_type)) {
    issues.push("entities.counts_by_type must be a plain object.");
  }

  if (!Array.isArray(projection.entities?.changed_entity_ids)) {
    issues.push("entities.changed_entity_ids must be an array.");
  }

  if (!isPlainObject(projection.latest)) {
    issues.push("latest must be a plain object.");
  } else if (!Object.prototype.hasOwnProperty.call(projection.latest, "absence")) {
    issues.push("latest.absence is required.");
  }

  if (!Array.isArray(projection.events)) {
    issues.push("events must be an array.");
  }

  if (!isPlainObject(projection.skins?.outputs)) {
    issues.push("skins.outputs must be a plain object.");
  }

  if (!isPlainObject(projection.foreman_context_seed)) {
    issues.push("foreman_context_seed must be a plain object.");
  }

  return createValidationResult(issues);
}

module.exports = {
  DASHBOARD_LIVE_PROJECTION_CONTRACT_VERSION,
  LIVE_DASHBOARD_CONNECTION_STATUSES,
  createDashboardLiveProjectionV1,
  validateDashboardLiveProjectionV1,
};
