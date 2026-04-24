const {
  cloneJsonValue,
  isPlainObject,
  validateHoldpointArtifactJson,
} = require("./holdpointArtifactAdapter");
const {
  createActionRequest,
} = require("../../entities/action_request");
const {
  createDecisionRecord,
} = require("../../entities/decision_record");
const {
  createEvidenceArtifact,
} = require("../../entities/evidence_artifact");
const {
  createObligation,
} = require("../../entities/obligation");
const {
  createEntityDeltaV1,
  validateEntityDeltaV1,
} = require("../liveEntityDelta");

const ROW_ENTITY_MAP = Object.freeze({
  decisions: Object.freeze({
    entity_type: "decision_record",
    factory: createDecisionRecord,
  }),
  holds: Object.freeze({
    entity_type: "obligation",
    factory: createObligation,
  }),
  action_requests: Object.freeze({
    entity_type: "action_request",
    factory: createActionRequest,
  }),
});

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function createConversionResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function normalizeIdPart(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown";
}

function getArtifactFromInput(input) {
  if (isPlainObject(input?.artifact)) {
    return {
      artifact: input.artifact,
      artifact_validation: {
        ok: input.ok === true,
        valid: input.valid === true,
        status: input.status || (input.ok === true ? "PASS" : "HOLD"),
        issues: Array.isArray(input.issues) ? [...input.issues] : [],
      },
      row_holds: Array.isArray(input.row_holds)
        ? input.row_holds.map(cloneJsonValue)
        : [],
    };
  }

  if (isPlainObject(input) && Array.isArray(input.rows)) {
    return {
      artifact: input,
      artifact_validation: {
        ok: true,
        valid: true,
        status: "PASS",
        issues: [],
      },
      row_holds: Array.isArray(input.row_holds)
        ? input.row_holds.map(cloneJsonValue)
        : [],
    };
  }

  const validation = validateHoldpointArtifactJson(input);
  return {
    artifact: validation.artifact,
    artifact_validation: {
      ok: validation.ok,
      valid: validation.valid,
      status: validation.status,
      issues: [...validation.issues],
    },
    row_holds: Array.isArray(validation.row_holds)
      ? validation.row_holds.map(cloneJsonValue)
      : [],
  };
}

function buildEntityId(artifact, row, suffix = null) {
  const parts = [
    "holdpoint",
    artifact.artifact_id,
    row.row_kind,
    row.row_id,
  ].map(normalizeIdPart);

  if (suffix) {
    parts.push(normalizeIdPart(suffix));
  }

  return parts.join("-");
}

function getRowStatus(row) {
  return Object.prototype.hasOwnProperty.call(row.optional || {}, "status")
    ? row.optional.status
    : null;
}

function getRowPriority(row) {
  return Object.prototype.hasOwnProperty.call(row.optional || {}, "priority")
    ? row.optional.priority
    : null;
}

function applyRowSignalTree(entity, evidenceEntityId) {
  if (!isPlainObject(entity.signal_tree)) {
    return entity;
  }

  entity.signal_tree.governance.evidence = {
    required_count: 1,
    present_count: 1,
    missing_types: [],
  };
  entity.signal_tree.lineage.evidence_ids = [evidenceEntityId];

  return entity;
}

function createPrimaryEntity(artifact, row, evidenceEntityId) {
  const mapping = ROW_ENTITY_MAP[row.row_kind];
  if (!mapping) {
    return {
      entity: null,
      entity_type: null,
      issues: [`row_kind is not supported: ${String(row.row_kind)}`],
    };
  }

  const entityId = buildEntityId(artifact, row);
  const entity = mapping.factory({
    entity_id: entityId,
    org_id: artifact.project.project_id,
    name: row.summary,
    status: getRowStatus(row),
    priority: getRowPriority(row),
    is_live: false,
  });

  return {
    entity: applyRowSignalTree(entity, evidenceEntityId),
    entity_type: mapping.entity_type,
    issues: [],
  };
}

function createEvidenceEntity(artifact, row) {
  return createEvidenceArtifact({
    entity_id: buildEntityId(artifact, row, "evidence"),
    org_id: artifact.project.project_id,
    name: row.evidence.quote,
    status: null,
    priority: null,
    is_live: false,
  });
}

function getRowAuthorityContext(artifact, row) {
  if (isPlainObject(row.optional?.authority_context)) {
    return cloneJsonValue(row.optional.authority_context);
  }

  if (isPlainObject(artifact.authority_context)) {
    return cloneJsonValue(artifact.authority_context);
  }

  return {};
}

function hasExplicitAuthorityContext(artifact, row) {
  return (
    isPlainObject(row.optional?.authority_context) ||
    isPlainObject(artifact.authority_context)
  );
}

function buildConfidenceContext(row) {
  if (!Object.prototype.hasOwnProperty.call(row.optional || {}, "confidence")) {
    return null;
  }

  return {
    source_confidence: cloneJsonValue(row.optional.confidence),
  };
}

function buildGovernanceRequest(artifact, row, entity) {
  const request = {
    kind: "command_request",
    org_id: artifact.project.project_id,
    entity_ref: {
      entity_id: entity.entity_id,
      entity_type: entity.entity_type,
    },
    evidence_context: {
      required_count: 1,
      present_count: 1,
      missing_types: [],
    },
    confidence_context: buildConfidenceContext(row),
    candidate_signal_patch: null,
    raw_subject: `holdpoint://${artifact.source.ref}/${artifact.meeting.meeting_id}/${row.row_kind}/${row.row_id}`,
  };

  if (hasExplicitAuthorityContext(artifact, row)) {
    request.authority_context = getRowAuthorityContext(artifact, row);
  }

  return request;
}

function buildGovernanceContext(artifact, row, entity, evidenceEntityId) {
  return {
    adapter: {
      name: "holdpointArtifactAdapter",
      artifact_version: artifact.version,
      json_shape: artifact.version,
    },
    artifact: {
      artifact_id: artifact.artifact_id,
      source_ref: artifact.source.ref,
      project_id: artifact.project.project_id,
      meeting_id: artifact.meeting.meeting_id,
      meeting_source_ref: artifact.meeting.source_ref,
    },
    row: {
      row_kind: row.row_kind,
      row_id: row.row_id,
      source_ref: row.source_ref,
      source_refs: cloneJsonValue(row.source_refs),
      evidence_entity_id: evidenceEntityId,
      evidence: cloneJsonValue(row.evidence),
      optional: cloneJsonValue(row.optional),
    },
    request: buildGovernanceRequest(artifact, row, entity),
  };
}

function buildDeltaInput({
  artifact,
  row,
  entity,
  entityType,
  operation,
  sessionId,
  timestamp,
  evidenceEntityId,
}) {
  return {
    delta_id: `${entity.entity_id}-delta`,
    session_id: sessionId,
    timestamp,
    operation,
    entity_type: entityType,
    entity_id: entity.entity_id,
    entity,
    source: cloneJsonValue(row.source),
    governance_context: buildGovernanceContext(
      artifact,
      row,
      entity,
      evidenceEntityId
    ),
    authority_context: getRowAuthorityContext(artifact, row),
  };
}

function createDeltaOrHold(deltaInput, row, role) {
  const created = createEntityDeltaV1(deltaInput);
  if (!created.ok) {
    return {
      delta: null,
      result: {
        status: "HOLD",
        row_kind: row.row_kind,
        row_id: row.row_id,
        role,
        reason: "entity_delta_invalid",
        issues: [...created.issues],
      },
    };
  }

  const validation = validateEntityDeltaV1(created.delta);
  if (!validation.valid) {
    return {
      delta: null,
      result: {
        status: "HOLD",
        row_kind: row.row_kind,
        row_id: row.row_id,
        role,
        reason: "entity_delta_validation_failed",
        issues: [...validation.issues],
      },
    };
  }

  return {
    delta: created.delta,
    result: {
      status: "PASS",
      row_kind: row.row_kind,
      row_id: row.row_id,
      role,
      entity_type: created.delta.entity_type,
      entity_id: created.delta.entity_id,
      validation,
    },
  };
}

function getDeltaTimestamp(artifact, row) {
  return (
    row.evidence.timestamp_start ||
    row.evidence.timestamp_end ||
    artifact.meeting.occurred_at
  );
}

function convertRowToDeltas(artifact, row, sessionId) {
  const rowHolds = [];
  const deltas = [];
  const delta_results = [];
  const evidenceEntity = createEvidenceEntity(artifact, row);
  const primary = createPrimaryEntity(artifact, row, evidenceEntity.entity_id);

  if (primary.issues.length > 0) {
    rowHolds.push({
      status: "HOLD",
      row_kind: row.row_kind,
      row_id: row.row_id,
      reason: "row_mapping_unsupported",
      issues: primary.issues,
    });
  } else {
    const primaryDelta = createDeltaOrHold(
      buildDeltaInput({
        artifact,
        row,
        entity: primary.entity,
        entityType: primary.entity_type,
        operation: "proposed_creation",
        sessionId,
        timestamp: getDeltaTimestamp(artifact, row),
        evidenceEntityId: evidenceEntity.entity_id,
      }),
      row,
      "primary"
    );

    delta_results.push(primaryDelta.result);
    if (primaryDelta.delta) {
      deltas.push(primaryDelta.delta);
    } else {
      rowHolds.push(primaryDelta.result);
    }
  }

  const evidenceDelta = createDeltaOrHold(
    buildDeltaInput({
      artifact,
      row,
      entity: evidenceEntity,
      entityType: "evidence_artifact",
      operation: "evidence_link",
      sessionId,
      timestamp: getDeltaTimestamp(artifact, row),
      evidenceEntityId: evidenceEntity.entity_id,
    }),
    row,
    "evidence"
  );

  delta_results.push(evidenceDelta.result);
  if (evidenceDelta.delta) {
    deltas.push(evidenceDelta.delta);
  } else {
    rowHolds.push(evidenceDelta.result);
  }

  return {
    deltas,
    delta_results,
    row_holds: rowHolds,
  };
}

function convertHoldpointArtifactToEntityDeltas(input, options = {}) {
  const sessionId = options.session_id || options.sessionId;
  const issues = [];
  const normalized = getArtifactFromInput(input);
  const artifact = normalized.artifact;
  const rowHolds = normalized.row_holds.map(cloneJsonValue);
  const deltas = [];
  const deltaResults = [];

  if (!isNonEmptyString(sessionId)) {
    issues.push("session_id is required to create EntityDeltaV1 envelopes.");
  }

  if (!isPlainObject(artifact)) {
    issues.push("valid normalized HoldPoint artifact is required.");
  }

  if (issues.length > 0 || !isPlainObject(artifact)) {
    return createConversionResult(
      false,
      {
        artifact_validation: normalized.artifact_validation,
        deltas,
        delta_results: deltaResults,
        row_holds: rowHolds,
      },
      issues
    );
  }

  for (const row of artifact.rows) {
    const rowResult = convertRowToDeltas(artifact, row, sessionId);
    deltas.push(...rowResult.deltas);
    deltaResults.push(...rowResult.delta_results);
    rowHolds.push(...rowResult.row_holds.map(cloneJsonValue));
  }

  const allIssues = [
    ...issues,
    ...rowHolds.flatMap((hold) => (Array.isArray(hold.issues) ? hold.issues : [])),
  ];

  return createConversionResult(
    allIssues.length === 0,
    {
      artifact_validation: normalized.artifact_validation,
      deltas,
      delta_results: deltaResults,
      row_holds: rowHolds,
      produced_delta_count: deltas.length,
    },
    allIssues
  );
}

module.exports = {
  ROW_ENTITY_MAP,
  convertHoldpointArtifactToEntityDeltas,
};
