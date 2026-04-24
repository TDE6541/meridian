const HOLDPOINT_ARTIFACT_JSON_VERSION = "holdpointArtifactJson.v1";
const HOLDPOINT_SOURCE_TYPE = "holdpoint_artifact";

const REQUIRED_ROW_FIELDS = Object.freeze([
  "row_id",
  "summary",
  "source_ref",
  "evidence",
]);

const REQUIRED_EVIDENCE_FIELDS = Object.freeze([
  "quote",
  "source_ref",
  "timestamp_start",
  "timestamp_end",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

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

function createAdapterResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function looksLikeTabularText(value) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0];
  return (
    firstLine.includes(",") ||
    firstLine.includes("\t") ||
    /(^|\r?\n)\s*(row_id|summary|source_ref)\s*[, \t]/i.test(trimmed)
  );
}

function parseJsonOnly(input) {
  if (typeof input !== "string") {
    return {
      parsed: input,
      issues: [],
    };
  }

  const trimmed = input.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return {
      parsed: null,
      issues: [
        looksLikeTabularText(input)
          ? "CSV or tabular text input is not supported; A3 accepts JSON artifacts only."
          : "HoldPoint artifact input must be a JSON object or JSON string.",
      ],
    };
  }

  try {
    return {
      parsed: JSON.parse(trimmed),
      issues: [],
    };
  } catch (error) {
    return {
      parsed: null,
      issues: [`HoldPoint artifact JSON parse failed closed: ${error.message}`],
    };
  }
}

function validateRequiredString(value, fieldName, issues) {
  if (!isNonEmptyString(value)) {
    issues.push(`${fieldName} must be a non-empty string.`);
  }
}

function validateNullableString(value, fieldName, issues) {
  if (value !== null && !isNonEmptyString(value)) {
    issues.push(`${fieldName} must be null or a non-empty string.`);
  }
}

function validateSource(source, fieldName, issues) {
  if (!isPlainObject(source)) {
    issues.push(`${fieldName} must be a plain object.`);
    return;
  }

  if (source.type !== HOLDPOINT_SOURCE_TYPE) {
    issues.push(`${fieldName}.type must equal ${HOLDPOINT_SOURCE_TYPE}.`);
  }

  validateRequiredString(source.ref, `${fieldName}.ref`, issues);
}

function validateProject(project, issues) {
  if (!isPlainObject(project)) {
    issues.push("project must be a plain object.");
    return;
  }

  validateRequiredString(project.project_id, "project.project_id", issues);
  validateRequiredString(project.name, "project.name", issues);
}

function validateMeeting(meeting, issues) {
  if (!isPlainObject(meeting)) {
    issues.push("meeting must be a plain object.");
    return;
  }

  validateRequiredString(meeting.meeting_id, "meeting.meeting_id", issues);
  validateRequiredString(meeting.title, "meeting.title", issues);
  validateRequiredString(meeting.occurred_at, "meeting.occurred_at", issues);
  validateRequiredString(meeting.source_ref, "meeting.source_ref", issues);
}

function validateEvidence(evidence, fieldName, issues) {
  if (!isPlainObject(evidence)) {
    issues.push(`${fieldName} must be a plain object.`);
    return;
  }

  for (const requiredField of REQUIRED_EVIDENCE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(evidence, requiredField)) {
      issues.push(`${fieldName}.${requiredField} is required.`);
    }
  }

  validateRequiredString(evidence.quote, `${fieldName}.quote`, issues);
  validateRequiredString(evidence.source_ref, `${fieldName}.source_ref`, issues);
  validateNullableString(
    evidence.timestamp_start,
    `${fieldName}.timestamp_start`,
    issues
  );
  validateNullableString(
    evidence.timestamp_end,
    `${fieldName}.timestamp_end`,
    issues
  );
}

function validateRows(rows, fieldName, issues) {
  const rowHolds = [];

  if (!Array.isArray(rows)) {
    issues.push(`${fieldName} must be an array.`);
    return rowHolds;
  }

  rows.forEach((row, index) => {
    const rowIssues = [];
    const rowPath = `${fieldName}[${index}]`;

    if (!isPlainObject(row)) {
      rowIssues.push(`${rowPath} must be a plain object.`);
    } else {
      for (const requiredField of REQUIRED_ROW_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(row, requiredField)) {
          rowIssues.push(`${rowPath}.${requiredField} is required.`);
        }
      }

      validateRequiredString(row.row_id, `${rowPath}.row_id`, rowIssues);
      validateRequiredString(row.summary, `${rowPath}.summary`, rowIssues);
      validateRequiredString(row.source_ref, `${rowPath}.source_ref`, rowIssues);
      validateEvidence(row.evidence, `${rowPath}.evidence`, rowIssues);
    }

    if (rowIssues.length > 0) {
      rowHolds.push({
        status: "HOLD",
        row_kind: fieldName,
        row_index: index,
        row_id: isPlainObject(row) && isNonEmptyString(row.row_id) ? row.row_id : null,
        issues: Object.freeze(rowIssues),
      });
      issues.push(...rowIssues);
    }
  });

  return rowHolds;
}

function buildRowSourceRef({ artifact, row, rowKind }) {
  return [
    artifact.source.ref,
    artifact.meeting.source_ref,
    `${rowKind}:${row.row_id}`,
    row.source_ref,
  ].join("#");
}

function pickOptionalRowFields(row) {
  const optional = {};
  for (const fieldName of [
    "owner",
    "status",
    "priority",
    "severity",
    "confidence",
    "notes",
    "authority_context",
  ]) {
    if (Object.prototype.hasOwnProperty.call(row, fieldName)) {
      optional[fieldName] = cloneJsonValue(row[fieldName]);
    }
  }

  return optional;
}

function normalizeRow(artifact, row, rowKind, rowIndex) {
  const sourceRef = buildRowSourceRef({ artifact, row, rowKind });

  return {
    row_kind: rowKind,
    row_index: rowIndex,
    row_id: row.row_id,
    summary: row.summary,
    source_ref: row.source_ref,
    evidence: cloneJsonValue(row.evidence),
    optional: pickOptionalRowFields(row),
    source: {
      type: HOLDPOINT_SOURCE_TYPE,
      ref: sourceRef,
    },
    source_refs: {
      artifact_ref: artifact.source.ref,
      meeting_ref: artifact.meeting.source_ref,
      row_ref: row.source_ref,
      evidence_ref: row.evidence.source_ref,
      canonical_ref: sourceRef,
    },
  };
}

function normalizeArtifact(value, rowHolds) {
  const invalidRows = new Set(
    rowHolds.map((hold) => `${hold.row_kind}:${hold.row_index}`)
  );
  const artifact = {
    version: value.version,
    artifact_id: value.artifact_id,
    source: cloneJsonValue(value.source),
    project: cloneJsonValue(value.project),
    meeting: cloneJsonValue(value.meeting),
    rows: [],
    row_holds: rowHolds.map(cloneJsonValue),
  };

  if (Object.prototype.hasOwnProperty.call(value, "authority_context")) {
    artifact.authority_context = cloneJsonValue(value.authority_context);
  }

  for (const rowKind of ["decisions", "holds", "action_requests"]) {
    const rows = Array.isArray(value[rowKind]) ? value[rowKind] : [];
    rows.forEach((row, rowIndex) => {
      if (invalidRows.has(`${rowKind}:${rowIndex}`) || !isPlainObject(row)) {
        return;
      }

      artifact.rows.push(normalizeRow(artifact, row, rowKind, rowIndex));
    });
  }

  return artifact;
}

function validateHoldpointArtifactJson(input) {
  const parsed = parseJsonOnly(input);
  const issues = [...parsed.issues];
  const rowHolds = [];

  if (issues.length > 0) {
    return createAdapterResult(
      false,
      {
        artifact: null,
        rows: [],
        row_holds: [],
      },
      issues
    );
  }

  const value = parsed.parsed;
  if (!isPlainObject(value)) {
    return createAdapterResult(
      false,
      {
        artifact: null,
        rows: [],
        row_holds: [],
      },
      ["HoldPoint artifact must be a plain JSON object."]
    );
  }

  if (value.version !== HOLDPOINT_ARTIFACT_JSON_VERSION) {
    issues.push(`version must equal ${HOLDPOINT_ARTIFACT_JSON_VERSION}.`);
  }

  validateRequiredString(value.artifact_id, "artifact_id", issues);
  validateSource(value.source, "source", issues);
  validateProject(value.project, issues);
  validateMeeting(value.meeting, issues);

  const topLevelIssueCount = issues.length;

  rowHolds.push(...validateRows(value.decisions, "decisions", issues));
  rowHolds.push(...validateRows(value.holds, "holds", issues));

  if (
    Object.prototype.hasOwnProperty.call(value, "action_requests") &&
    value.action_requests !== undefined
  ) {
    rowHolds.push(
      ...validateRows(value.action_requests, "action_requests", issues)
    );
  }

  const canNormalize = topLevelIssueCount === 0;
  const artifact = canNormalize ? normalizeArtifact(value, rowHolds) : null;

  return createAdapterResult(
    issues.length === 0,
    {
      artifact,
      rows: artifact ? artifact.rows.map(cloneJsonValue) : [],
      row_holds: rowHolds.map(cloneJsonValue),
    },
    issues
  );
}

module.exports = {
  HOLDPOINT_ARTIFACT_JSON_VERSION,
  HOLDPOINT_SOURCE_TYPE,
  cloneJsonValue,
  isPlainObject,
  validateHoldpointArtifactJson,
};
