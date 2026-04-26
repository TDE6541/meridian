const {
  AUTHORITY_RESOLUTION_EVALUATION_CONTRACT_VERSION,
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
  DEFAULT_AUTHORITY_RESOLUTION_THRESHOLD,
  G2_GENERATED_AUTHORITY_REQUEST_STATUS,
  cloneJsonValue,
  createAuthorityHold,
  isSeverityAtLeast,
  isValidDateTimeString,
  validateAuthorityResolutionEvaluationV1,
  validateAuthorityResolutionRequestV1,
  validateAuthoritySeverity,
} = require("./authorityContracts");
const {
  resolveCivicAuthorityForAbsence,
} = require("./civicAuthorityModel");
const { isNonEmptyString, isPlainObject } = require("../contracts");

const DEFAULT_REQUEST_ID_PREFIX = "ARR";
const DEFAULT_EXPIRY_MINUTES = 60;

function createEmptyEvaluation(input = {}) {
  return {
    contract: AUTHORITY_RESOLUTION_EVALUATION_CONTRACT_VERSION,
    session_id: isNonEmptyString(input.session_id) ? input.session_id : null,
    generated_requests: [],
    skipped_findings: [],
    holds: [],
    counts: {
      input_findings: 0,
      generated_requests: 0,
      skipped_findings: 0,
      holds: 0,
      existing_requests: 0,
    },
  };
}

function finalizeEvaluation(evaluation) {
  evaluation.counts = {
    input_findings: evaluation.counts.input_findings,
    generated_requests: evaluation.generated_requests.length,
    skipped_findings: evaluation.skipped_findings.length,
    holds: evaluation.holds.length,
    existing_requests: evaluation.counts.existing_requests,
  };
  evaluation.status = evaluation.holds.length > 0 ? "HOLD" : "PASS";
  evaluation.ok = evaluation.holds.length === 0;
  evaluation.valid = validateAuthorityResolutionEvaluationV1(evaluation).valid;

  return evaluation;
}

function getSourceAbsenceId(finding) {
  if (!isPlainObject(finding)) {
    return null;
  }

  return finding.finding_id || finding.absence_id || finding.id || null;
}

function getGovernanceRef(finding, governanceState) {
  if (!isPlainObject(finding)) {
    return null;
  }

  return (
    finding.source_governance_evaluation ||
    finding.governance_ref ||
    finding.governance_evaluation_id ||
    finding.refs?.governance_ref ||
    governanceState?.source_governance_evaluation ||
    governanceState?.governance_ref ||
    governanceState?.evaluation_id ||
    null
  );
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.filter(isNonEmptyString);
  }

  if (isNonEmptyString(value)) {
    return [value];
  }

  return [];
}

function resolveCurrentTime(input, options, evaluation) {
  const inputTime = input.current_time;
  const optionTime = options.currentTime;

  if (isNonEmptyString(inputTime) && isNonEmptyString(optionTime)) {
    if (inputTime !== optionTime) {
      evaluation.holds.push(
        createAuthorityHold({
          code: "current_time_conflict",
          reason:
            "input.current_time and options.currentTime conflict; G2 will not choose silently.",
          field: "current_time",
          resolution_path:
            "Provide one explicit current time, or provide matching time values.",
        })
      );
      return null;
    }

    return inputTime;
  }

  if (isNonEmptyString(inputTime)) {
    return inputTime;
  }

  if (isNonEmptyString(optionTime)) {
    return optionTime;
  }

  return null;
}

function computeExpiry(currentTime, expiryMinutes) {
  const expiry = new Date(Date.parse(currentTime) + expiryMinutes * 60 * 1000);
  return expiry.toISOString();
}

function normalizePositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function createRequestIdGenerator(existingRequests, options = {}) {
  const prefix = isNonEmptyString(options.requestIdPrefix)
    ? options.requestIdPrefix
    : DEFAULT_REQUEST_ID_PREFIX;
  let sequence = normalizePositiveInteger(options.startingSequence, 1);
  const usedIds = new Set(
    existingRequests
      .map((request) => request?.request_id)
      .filter(isNonEmptyString)
  );

  return {
    next() {
      let requestId = `${prefix}-${String(sequence).padStart(4, "0")}`;
      while (usedIds.has(requestId)) {
        sequence += 1;
        requestId = `${prefix}-${String(sequence).padStart(4, "0")}`;
      }

      usedIds.add(requestId);
      sequence += 1;
      return requestId;
    },
  };
}

function hasPendingRequestForAbsence(existingRequests, sourceAbsenceId) {
  return existingRequests.some(
    (request) =>
      request?.source_absence_id === sourceAbsenceId &&
      request?.status === G2_GENERATED_AUTHORITY_REQUEST_STATUS
  );
}

function buildBindingContext({ finding, absenceType, governanceRef }) {
  return {
    source_absence_id: getSourceAbsenceId(finding),
    absence_type: absenceType,
    session_id: finding.session_id || null,
    entity_refs: normalizeStringArray(finding.entity_refs),
    source_refs: normalizeStringArray(finding.source_refs),
    governance_ref: governanceRef,
    severity: finding.severity || null,
    expected_signal: finding.expected_signal || null,
    missing_evidence: cloneJsonValue(finding.missing_evidence || []),
    origin: finding.origin || null,
  };
}

function skipFinding(evaluation, finding, reason, extra = {}) {
  evaluation.skipped_findings.push({
    source_absence_id: getSourceAbsenceId(finding),
    reason,
    ...extra,
  });
}

function holdFinding(evaluation, finding, hold) {
  evaluation.holds.push({
    ...hold,
    source_absence_id: hold.source_absence_id || getSourceAbsenceId(finding),
  });
}

function evaluateAuthorityResolutions(input = {}, options = {}) {
  const inputObject = isPlainObject(input) ? input : {};
  const optionsObject = isPlainObject(options) ? options : {};
  const evaluation = createEmptyEvaluation(inputObject);

  if (!isPlainObject(input)) {
    evaluation.holds.push(
      createAuthorityHold({
        code: "malformed_input",
        reason: "input must be a plain object.",
        field: "input",
      })
    );
    return finalizeEvaluation(evaluation);
  }

  const absenceFindings = Array.isArray(inputObject.absence_findings)
    ? inputObject.absence_findings
    : null;
  const existingRequests = Array.isArray(inputObject.existing_requests)
    ? inputObject.existing_requests
    : [];
  const governanceState = isPlainObject(inputObject.governance_state)
    ? inputObject.governance_state
    : {};

  evaluation.counts.input_findings = Array.isArray(absenceFindings)
    ? absenceFindings.length
    : 0;
  evaluation.counts.existing_requests = existingRequests.length;

  if (!Array.isArray(absenceFindings)) {
    evaluation.holds.push(
      createAuthorityHold({
        code: "absence_findings_required",
        reason: "absence_findings must be an array.",
        field: "absence_findings",
      })
    );
    return finalizeEvaluation(evaluation);
  }

  const threshold =
    inputObject.resolution_threshold ||
    optionsObject.resolutionThreshold ||
    DEFAULT_AUTHORITY_RESOLUTION_THRESHOLD;
  const thresholdValidation = validateAuthoritySeverity(
    threshold,
    "resolution_threshold"
  );
  if (!thresholdValidation.valid) {
    evaluation.holds.push(
      createAuthorityHold({
        code: "invalid_resolution_threshold",
        reason: thresholdValidation.issues.join("; "),
        field: "resolution_threshold",
      })
    );
    return finalizeEvaluation(evaluation);
  }

  const currentTime = resolveCurrentTime(inputObject, optionsObject, evaluation);
  if (currentTime !== null && !isValidDateTimeString(currentTime)) {
    evaluation.holds.push(
      createAuthorityHold({
        code: "invalid_current_time",
        reason: "current_time must be a valid date-time string.",
        field: "current_time",
      })
    );
    return finalizeEvaluation(evaluation);
  }

  if (evaluation.holds.length > 0) {
    return finalizeEvaluation(evaluation);
  }

  const expiryMinutes = normalizePositiveInteger(
    optionsObject.expiryMinutes,
    DEFAULT_EXPIRY_MINUTES
  );
  const idGenerator = createRequestIdGenerator(existingRequests, optionsObject);
  const generatedAsExisting = [...existingRequests];

  for (const finding of absenceFindings) {
    if (!isPlainObject(finding)) {
      evaluation.holds.push(
        createAuthorityHold({
          code: "malformed_finding",
          reason: "absence finding must be a plain object.",
          field: "absence_findings",
        })
      );
      continue;
    }

    const sourceAbsenceId = getSourceAbsenceId(finding);
    if (!isNonEmptyString(sourceAbsenceId)) {
      evaluation.holds.push(
        createAuthorityHold({
          code: "source_absence_id_required",
          reason:
            "finding_id, absence_id, or id is required to bind an authority request.",
          field: "finding_id",
        })
      );
      continue;
    }

    const severityValidation = validateAuthoritySeverity(finding.severity);
    if (!severityValidation.valid) {
      holdFinding(
        evaluation,
        finding,
        createAuthorityHold({
          code: "invalid_absence_severity",
          reason: severityValidation.issues.join("; "),
          source_absence_id: sourceAbsenceId,
          field: "severity",
        })
      );
      continue;
    }

    if (!isSeverityAtLeast(finding.severity, threshold)) {
      skipFinding(evaluation, finding, "below_resolution_threshold", {
        severity: finding.severity,
        resolution_threshold: threshold,
      });
      continue;
    }

    const authority = resolveCivicAuthorityForAbsence(finding);
    if (authority.status === "not_resolvable") {
      skipFinding(evaluation, finding, authority.reason, {
        absence_type: authority.absence_type,
      });
      continue;
    }

    if (authority.status === "HOLD") {
      holdFinding(evaluation, finding, authority.hold);
      continue;
    }

    if (hasPendingRequestForAbsence(generatedAsExisting, sourceAbsenceId)) {
      skipFinding(evaluation, finding, "duplicate_pending_request", {
        absence_type: authority.absence_type,
      });
      continue;
    }

    if (currentTime === null) {
      holdFinding(
        evaluation,
        finding,
        createAuthorityHold({
          code: "current_time_required",
          reason:
            "current_time is required to compute deterministic G2 request expiry.",
          source_absence_id: sourceAbsenceId,
          field: "current_time",
        })
      );
      continue;
    }

    const governanceRef = getGovernanceRef(finding, governanceState);
    const request = {
      contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT_VERSION,
      request_id: idGenerator.next(),
      source_absence_id: sourceAbsenceId,
      source_governance_evaluation: governanceRef,
      required_authority_role: authority.required_authority_role,
      required_authority_department: authority.required_authority_department,
      resolution_type: authority.resolution_type,
      binding_context: buildBindingContext({
        finding,
        absenceType: authority.absence_type,
        governanceRef,
      }),
      expiry: computeExpiry(currentTime, expiryMinutes),
      status: G2_GENERATED_AUTHORITY_REQUEST_STATUS,
      forensic_receipt_id: null,
    };
    const validation = validateAuthorityResolutionRequestV1(request);
    if (!validation.valid) {
      holdFinding(
        evaluation,
        finding,
        createAuthorityHold({
          code: "generated_request_invalid",
          reason: validation.issues.join("; "),
          source_absence_id: sourceAbsenceId,
          field: "authority_request",
        })
      );
      continue;
    }

    evaluation.generated_requests.push(request);
    generatedAsExisting.push(request);
  }

  return finalizeEvaluation(evaluation);
}

module.exports = {
  DEFAULT_EXPIRY_MINUTES,
  DEFAULT_REQUEST_ID_PREFIX,
  evaluateAuthorityResolutions,
};
