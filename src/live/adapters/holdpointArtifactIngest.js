const {
  cloneJsonValue,
  isPlainObject,
  validateHoldpointArtifactJson,
} = require("./holdpointArtifactAdapter");
const {
  convertHoldpointArtifactToEntityDeltas,
} = require("./captureToEntityDelta");
const {
  createLiveFeedEventFromRecordV1,
} = require("../liveFeedEvent");
const {
  createLiveGovernanceGateway,
} = require("../liveGovernanceGateway");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function createIngestResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    decision: ok ? "PASS" : "BLOCK",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function normalizeInput(input = {}, options = {}) {
  const inputObject = isPlainObject(input) ? input : {};
  return {
    store: inputObject.store || options.store || null,
    session_id:
      inputObject.session_id ||
      inputObject.sessionId ||
      options.session_id ||
      options.sessionId ||
      null,
    artifact:
      Object.prototype.hasOwnProperty.call(inputObject, "artifact")
        ? inputObject.artifact
        : Object.prototype.hasOwnProperty.call(inputObject, "holdpointArtifact")
        ? inputObject.holdpointArtifact
        : Object.prototype.hasOwnProperty.call(inputObject, "holdpoint_artifact")
        ? inputObject.holdpoint_artifact
        : input,
    options,
  };
}

function buildRefsFromDeltas(deltas) {
  const entityIds = [];
  const evidenceIds = [];

  for (const delta of deltas) {
    if (delta.entity_type === "evidence_artifact") {
      evidenceIds.push(delta.entity_id);
    } else {
      entityIds.push(delta.entity_id);
    }
  }

  return {
    entity_ids: entityIds,
    evidence_ids: evidenceIds,
    governance_ref: null,
    authority_ref: null,
    forensic_refs: [],
    absence_refs: [],
    skin_ref: null,
  };
}

function appendCaptureEvent({ store, sessionId, artifact, conversion }) {
  const source = cloneJsonValue(artifact.source);
  const rowSourceRefs = artifact.rows.map((row) => ({
    row_kind: row.row_kind,
    row_id: row.row_id,
    source_ref: row.source_ref,
    evidence_ref: row.evidence.source_ref,
    canonical_ref: row.source_refs.canonical_ref,
  }));
  const appended = store.appendRecord(sessionId, {
    type: "capture.artifact_ingested",
    source,
    dashboard_visible: true,
    payload: {
      capture: {
        adapter: "holdpointArtifactAdapter",
        artifact_id: artifact.artifact_id,
        artifact_version: artifact.version,
        source_ref: artifact.source.ref,
        project_id: artifact.project.project_id,
        meeting_id: artifact.meeting.meeting_id,
        meeting_source_ref: artifact.meeting.source_ref,
        row_count: artifact.rows.length,
        row_source_refs: rowSourceRefs,
        produced_delta_count: conversion.deltas.length,
        row_holds: conversion.row_holds.map(cloneJsonValue),
      },
      live_feed_event: {
        kind: "capture.artifact_ingested",
        severity: conversion.row_holds.length > 0 ? "HOLD" : "INFO",
        title: "HoldPoint artifact ingested",
        summary: `${artifact.rows.length} HoldPoint artifact rows were ingested as JSON.`,
        refs: buildRefsFromDeltas(conversion.deltas),
        visibility: "internal",
        foreman_hints: {
          narration_eligible: false,
          priority: 0,
          reason: "source_refs_only",
        },
      },
    },
  });

  if (!appended.ok) {
    return {
      ok: false,
      record: null,
      event: null,
      issues: [...appended.issues],
    };
  }

  const eventResult = createLiveFeedEventFromRecordV1(appended.record);
  return {
    ok: eventResult.valid,
    record: appended.record,
    event: eventResult.event,
    issues: [...eventResult.issues],
  };
}

function resolveGateway({ store, options }) {
  if (options.gateway && typeof options.gateway.evaluate === "function") {
    return options.gateway;
  }

  return createLiveGovernanceGateway({
    store,
    now: options.now,
    idGenerator: options.idGenerator,
    evaluateGovernanceRequest: options.evaluateGovernanceRequest,
    forensicWriter: options.forensicWriter || options.chainWriter,
  });
}

function ingestHoldpointArtifact(input = {}, options = {}) {
  const normalizedInput = normalizeInput(input, options);
  const issues = [];

  if (
    !normalizedInput.store ||
    typeof normalizedInput.store.appendRecord !== "function"
  ) {
    issues.push("live session store with appendRecord is required.");
  }

  if (!isNonEmptyString(normalizedInput.session_id)) {
    issues.push("session_id is required.");
  }

  if (issues.length > 0) {
    return createIngestResult(
      false,
      {
        reason: "holdpoint_artifact_ingest_unavailable",
        artifact_validation: null,
        capture_event: null,
        capture_record: null,
        produced_delta_count: 0,
        evaluated_delta_count: 0,
        row_holds: [],
        gateway_results: [],
      },
      issues
    );
  }

  const artifactValidation = validateHoldpointArtifactJson(
    normalizedInput.artifact
  );
  if (!artifactValidation.valid) {
    return createIngestResult(
      false,
      {
        reason: "holdpoint_artifact_invalid",
        artifact_validation: {
          ok: artifactValidation.ok,
          valid: artifactValidation.valid,
          status: artifactValidation.status,
          issues: [...artifactValidation.issues],
        },
        capture_event: null,
        capture_record: null,
        produced_delta_count: 0,
        evaluated_delta_count: 0,
        row_holds: artifactValidation.row_holds.map(cloneJsonValue),
        gateway_results: [],
      },
      artifactValidation.issues
    );
  }

  const conversion = convertHoldpointArtifactToEntityDeltas(artifactValidation, {
    session_id: normalizedInput.session_id,
  });
  if (conversion.deltas.length === 0 || conversion.row_holds.length > 0) {
    return createIngestResult(
      false,
      {
        reason: "holdpoint_artifact_delta_mapping_held",
        artifact_validation: conversion.artifact_validation,
        capture_event: null,
        capture_record: null,
        produced_delta_count: conversion.deltas.length,
        evaluated_delta_count: 0,
        row_holds: conversion.row_holds.map(cloneJsonValue),
        gateway_results: [],
      },
      conversion.issues
    );
  }

  const capture = appendCaptureEvent({
    store: normalizedInput.store,
    sessionId: normalizedInput.session_id,
    artifact: artifactValidation.artifact,
    conversion,
  });
  if (!capture.ok) {
    return createIngestResult(
      false,
      {
        reason: "capture_artifact_ingest_event_failed",
        artifact_validation: conversion.artifact_validation,
        capture_event: null,
        capture_record: null,
        produced_delta_count: conversion.deltas.length,
        evaluated_delta_count: 0,
        row_holds: conversion.row_holds.map(cloneJsonValue),
        gateway_results: [],
      },
      capture.issues
    );
  }

  const gateway = resolveGateway({
    store: normalizedInput.store,
    options: normalizedInput.options,
  });
  const gatewayResults = conversion.deltas.map((delta) =>
    gateway.evaluate(delta, { session_id: normalizedInput.session_id })
  );
  const gatewayIssues = gatewayResults.flatMap((result) =>
    Array.isArray(result.issues) ? result.issues : []
  );
  const allGatewayResultsOk = gatewayResults.every((result) => result.ok);

  return createIngestResult(
    allGatewayResultsOk,
    {
      reason: allGatewayResultsOk
        ? "holdpoint_artifact_ingested"
        : "holdpoint_artifact_gateway_held",
      artifact_validation: conversion.artifact_validation,
      capture_event: capture.event,
      capture_record: capture.record,
      produced_delta_count: conversion.deltas.length,
      evaluated_delta_count: gatewayResults.length,
      row_holds: conversion.row_holds.map(cloneJsonValue),
      gateway_results: gatewayResults.map(cloneJsonValue),
    },
    gatewayIssues
  );
}

module.exports = {
  ingestHoldpointArtifact,
};
