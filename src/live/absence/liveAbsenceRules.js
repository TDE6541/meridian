const crypto = require("node:crypto");

const {
  createEmptyLiveFeedRefs,
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");
const {
  LIVE_ABSENCE_FINDING_CONTRACT_VERSION,
  createDefaultLiveAbsenceProfile,
  validateLiveAbsenceProfile,
} = require("./liveAbsenceProfiles");

const RULE_RESULT_STATUSES = Object.freeze([
  "not_applicable",
  "satisfied",
  "finding",
  "hold",
]);

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

function stableHash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

function safeIdPart(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function uniqueStrings(values) {
  const result = [];
  const seen = new Set();

  for (const value of values) {
    if (!isNonEmptyString(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

function flattenSourceRefs(value) {
  if (isNonEmptyString(value)) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenSourceRefs);
  }

  if (isPlainObject(value)) {
    return Object.values(value).flatMap(flattenSourceRefs);
  }

  return [];
}

function normalizeEntityRefs(value, fallbackEntityId) {
  const refs = [];

  if (Array.isArray(value)) {
    refs.push(...value.filter(isNonEmptyString));
  } else if (isNonEmptyString(value)) {
    refs.push(value);
  }

  if (isNonEmptyString(fallbackEntityId)) {
    refs.push(fallbackEntityId);
  }

  return uniqueStrings(refs);
}

function normalizeObservationSourceRefs(observation) {
  return uniqueStrings([
    ...flattenSourceRefs(observation.source_refs),
    ...flattenSourceRefs(observation.source_ref),
    ...flattenSourceRefs(observation.record_ref),
    ...flattenSourceRefs(observation.delta_ref),
    ...flattenSourceRefs(observation.governance_ref),
    ...flattenSourceRefs(observation.capture_ref),
  ]);
}

function hasRuleField(value, rule) {
  return (
    Object.prototype.hasOwnProperty.call(value, rule.trigger_field) ||
    Object.prototype.hasOwnProperty.call(value, rule.satisfied_field) ||
    value.rule_id === rule.rule_id
  );
}

function getRuleInputObjects(value, base = {}) {
  if (Array.isArray(value)) {
    return value
      .filter(isPlainObject)
      .map((entry) => ({
        ...cloneJsonValue(base),
        ...cloneJsonValue(entry),
      }));
  }

  if (!isPlainObject(value)) {
    return [];
  }

  if (
    isNonEmptyString(value.rule_id) ||
    Object.values(value).some(
      (entry) => isPlainObject(entry) && isNonEmptyString(entry.rule_id)
    )
  ) {
    return [
      {
        ...cloneJsonValue(base),
        ...cloneJsonValue(value),
      },
    ];
  }

  return Object.entries(value)
    .filter(([, entry]) => isPlainObject(entry))
    .map(([ruleId, entry]) => ({
      ...cloneJsonValue(base),
      rule_id: ruleId,
      ...cloneJsonValue(entry),
    }));
}

function addAbsenceInputsFromValue(inputs, value, base) {
  inputs.push(...getRuleInputObjects(value, base));
}

function buildDeltaBase(record, delta) {
  const row = delta.governance_context?.row;
  const sourceRefs = [
    record?.record_id ? `record:${record.record_id}` : null,
    delta.delta_id ? `delta:${delta.delta_id}` : null,
    delta.source?.ref || null,
    row?.source_ref || null,
    row?.evidence?.source_ref || null,
    row?.source_refs || null,
  ];

  return {
    session_id: delta.session_id,
    record_ref: record?.record_id ? `record:${record.record_id}` : null,
    delta_ref: delta.delta_id ? `delta:${delta.delta_id}` : null,
    entity_refs: [delta.entity_id].filter(isNonEmptyString),
    source_refs: flattenSourceRefs(sourceRefs),
  };
}

function deriveObligationInput(record, delta) {
  if (delta.entity_type !== "obligation" || !isPlainObject(delta.entity)) {
    return null;
  }

  const ownerFields = [
    delta.entity.owner,
    delta.entity.owner_id,
    delta.entity.responsible_party,
    delta.entity.responsible_party_id,
    delta.governance_context?.row?.optional?.owner,
  ];

  return {
    ...buildDeltaBase(record, delta),
    rule_id: "obligation_without_owner_creates_unresolved_obligation_absence",
    obligation_present: true,
    owner_present: ownerFields.some(isNonEmptyString),
  };
}

function collectDeltaAbsenceInputs(records) {
  const inputs = [];

  for (const record of records) {
    const delta = record?.payload?.delta;
    if (!isPlainObject(delta)) {
      continue;
    }

    const base = buildDeltaBase(record, delta);
    addAbsenceInputsFromValue(inputs, delta.governance_context?.absence_inputs, base);
    addAbsenceInputsFromValue(
      inputs,
      delta.governance_context?.request?.absence_inputs,
      base
    );
    addAbsenceInputsFromValue(
      inputs,
      delta.governance_context?.governance_request?.absence_inputs,
      base
    );
    addAbsenceInputsFromValue(inputs, delta.authority_context?.absence_inputs, base);
    addAbsenceInputsFromValue(inputs, delta.entity?.governance?.absence?.inputs, base);
    addAbsenceInputsFromValue(
      inputs,
      delta.entity?.governance?.absence?.absence_inputs,
      base
    );

    const obligationInput = deriveObligationInput(record, delta);
    if (obligationInput) {
      inputs.push(obligationInput);
    }
  }

  return inputs;
}

function collectRecordPayloadAbsenceInputs(records) {
  const inputs = [];

  for (const record of records) {
    const base = {
      session_id: record?.session_id,
      record_ref: record?.record_id ? `record:${record.record_id}` : null,
      source_refs: [
        record?.record_id ? `record:${record.record_id}` : null,
        record?.source?.ref || null,
      ].filter(isNonEmptyString),
    };
    addAbsenceInputsFromValue(inputs, record?.payload?.absence_inputs, base);
  }

  return inputs;
}

function collectRecordsByPayload(records, payloadField, type = null) {
  return records
    .filter(
      (record) =>
        isPlainObject(record?.payload?.[payloadField]) &&
        (type === null || record.type === type)
    )
    .map((record) => ({
      record_ref: record.record_id ? `record:${record.record_id}` : null,
      payload: cloneJsonValue(record.payload[payloadField]),
    }));
}

function normalizeCurrentLiveState(input = {}) {
  const records = Array.isArray(input.records)
    ? input.records.map(cloneJsonValue)
    : [];
  const sessionId =
    input.session_id ||
    input.session?.session_id ||
    records.find((record) => isNonEmptyString(record?.session_id))?.session_id ||
    null;

  const entityDeltas = Array.isArray(input.entity_deltas)
    ? input.entity_deltas.map(cloneJsonValue)
    : records
        .filter((record) => isPlainObject(record?.payload?.delta))
        .map((record) => cloneJsonValue(record.payload.delta));
  const governanceEvaluations = Array.isArray(input.governance_evaluations)
    ? input.governance_evaluations.map(cloneJsonValue)
    : records
        .filter((record) => isPlainObject(record?.payload?.governance_evaluation))
        .map((record) => cloneJsonValue(record.payload.governance_evaluation));
  const captureEvents = Array.isArray(input.capture_events)
    ? input.capture_events.map(cloneJsonValue)
    : collectRecordsByPayload(records, "capture", "capture.artifact_ingested");
  const authorityEvents = Array.isArray(input.authority_events)
    ? input.authority_events.map(cloneJsonValue)
    : collectRecordsByPayload(records, "authority", "authority.evaluated");
  const forensicEvents = Array.isArray(input.forensic_events)
    ? input.forensic_events.map(cloneJsonValue)
    : collectRecordsByPayload(records, "forensic_receipt", "forensic.receipt");
  const feedEvents = Array.isArray(input.feed_events)
    ? input.feed_events.map(cloneJsonValue)
    : records
        .filter((record) => isPlainObject(record?.payload?.live_feed_event))
        .map((record) => cloneJsonValue(record.payload.live_feed_event));
  const existingAbsenceFindings = Array.isArray(input.existing_absence_findings)
    ? input.existing_absence_findings.map(cloneJsonValue)
    : records
        .filter((record) => isPlainObject(record?.payload?.absence_finding))
        .map((record) => cloneJsonValue(record.payload.absence_finding));

  return {
    session_id: sessionId,
    records,
    entity_deltas: entityDeltas,
    governance_evaluations: governanceEvaluations,
    capture_events: captureEvents,
    authority_events: authorityEvents,
    forensic_events: forensicEvents,
    feed_events: feedEvents,
    absence_inputs: [
      ...collectDeltaAbsenceInputs(records),
      ...collectRecordPayloadAbsenceInputs(records),
      ...(Array.isArray(input.absence_inputs)
        ? input.absence_inputs.map(cloneJsonValue)
        : []),
    ],
    existing_absence_findings: existingAbsenceFindings,
  };
}

function createHoldIssue({ sessionId, rule, observation, missingInputs }) {
  const sourceRefs = normalizeObservationSourceRefs(observation);
  const entityRefs = normalizeEntityRefs(
    observation.entity_refs,
    observation.entity_id
  );
  const holdId = `live-absence-hold-${safeIdPart(sessionId)}-${safeIdPart(
    rule.rule_id
  )}-${stableHash({
    missingInputs,
    sourceRefs,
    entityRefs,
  }).slice(0, 12)}`;

  return {
    status: "HOLD",
    posture: "HOLD",
    hold_id: holdId,
    rule_id: rule.rule_id,
    reason: "missing_required_absence_input",
    missing_inputs: [...missingInputs],
    entity_refs: entityRefs,
    source_refs: sourceRefs,
    message: `${rule.rule_id} missing required input: ${missingInputs.join(", ")}`,
  };
}

function createLiveAbsenceFinding({ sessionId, rule, observation }) {
  const sourceRefs = normalizeObservationSourceRefs(observation);
  const entityRefs = normalizeEntityRefs(
    observation.entity_refs,
    observation.entity_id
  );
  const findingId = `live-absence-${safeIdPart(sessionId)}-${safeIdPart(
    rule.rule_id
  )}-${stableHash({
    sourceRefs,
    entityRefs,
    expected_signal: rule.expected_signal,
  }).slice(0, 12)}`;

  return {
    version: LIVE_ABSENCE_FINDING_CONTRACT_VERSION,
    finding_id: findingId,
    session_id: sessionId,
    rule_id: rule.rule_id,
    expected_signal: rule.expected_signal,
    observed_state: {
      trigger_field: rule.trigger_field,
      trigger_value: observation[rule.trigger_field],
      satisfied_field: rule.satisfied_field,
      satisfied_value: observation[rule.satisfied_field],
      source_bounded: true,
    },
    missing_evidence: [rule.expected_signal],
    severity: rule.severity,
    entity_refs: entityRefs,
    source_refs: sourceRefs,
    resolution_path: rule.resolution_path,
    origin: "live_computed",
    why_this_matters: rule.why_this_matters,
  };
}

function evaluateRule(rule, state) {
  const findings = [];
  const holds = [];
  let sawApplicable = false;
  let sawSatisfied = false;
  let sawCandidate = false;

  const observations = state.absence_inputs.filter((entry) =>
    isPlainObject(entry) && hasRuleField(entry, rule)
  );

  for (const observation of observations) {
    sawCandidate = true;

    if (observation.rule_id && observation.rule_id !== rule.rule_id) {
      continue;
    }

    const missingInputs = [];
    if (typeof observation[rule.trigger_field] !== "boolean") {
      missingInputs.push(rule.trigger_field);
    }

    if (missingInputs.length > 0) {
      holds.push(createHoldIssue({
        sessionId: state.session_id,
        rule,
        observation,
        missingInputs,
      }));
      continue;
    }

    if (observation[rule.trigger_field] !== true) {
      continue;
    }

    sawApplicable = true;

    if (typeof observation[rule.satisfied_field] !== "boolean") {
      holds.push(createHoldIssue({
        sessionId: state.session_id,
        rule,
        observation,
        missingInputs: [rule.satisfied_field],
      }));
      continue;
    }

    if (observation[rule.satisfied_field] === true) {
      sawSatisfied = true;
      continue;
    }

    const sourceRefs = normalizeObservationSourceRefs(observation);
    if (sourceRefs.length === 0) {
      holds.push(createHoldIssue({
        sessionId: state.session_id,
        rule,
        observation,
        missingInputs: ["source_refs"],
      }));
      continue;
    }

    findings.push(createLiveAbsenceFinding({
      sessionId: state.session_id,
      rule,
      observation,
    }));
  }

  let status = "not_applicable";
  if (holds.length > 0) {
    status = "hold";
  } else if (findings.length > 0) {
    status = "finding";
  } else if (sawApplicable && sawSatisfied) {
    status = "satisfied";
  } else if (sawCandidate || observations.length > 0) {
    status = "not_applicable";
  }

  return {
    status,
    rule_id: rule.rule_id,
    findings,
    holds,
  };
}

function dedupeById(entries, idField) {
  const seen = new Set();
  const result = [];

  for (const entry of entries) {
    const id = entry?.[idField];
    if (!isNonEmptyString(id) || seen.has(id)) {
      continue;
    }

    seen.add(id);
    result.push(entry);
  }

  return result;
}

function validateRuleResultStatus(status) {
  return createValidationResult(
    RULE_RESULT_STATUSES.includes(status)
      ? []
      : [`rule result status is not allowed: ${String(status)}`]
  );
}

function evaluateLiveAbsenceRules(input = {}, profile = createDefaultLiveAbsenceProfile()) {
  const profileValidation = validateLiveAbsenceProfile(profile);
  if (!profileValidation.valid) {
    return {
      ok: false,
      valid: false,
      status: "HOLD",
      profile_id: profile?.profile_id || null,
      findings: [],
      holds: [],
      rule_results: [],
      issues: profileValidation.issues,
    };
  }

  const state = normalizeCurrentLiveState(input);
  const issues = [];
  if (!isNonEmptyString(state.session_id)) {
    issues.push("session_id is required.");
  }

  const ruleResults = [];
  for (const rule of profile.rules) {
    const result = evaluateRule(rule, state);
    issues.push(...validateRuleResultStatus(result.status).issues);
    ruleResults.push(result);
  }

  const findings = dedupeById(
    ruleResults.flatMap((result) => result.findings),
    "finding_id"
  );
  const holds = dedupeById(
    ruleResults.flatMap((result) => result.holds),
    "hold_id"
  );

  return {
    ok: issues.length === 0 && holds.length === 0,
    valid: issues.length === 0,
    status: issues.length > 0 || holds.length > 0 ? "HOLD" : "PASS",
    profile_id: profile.profile_id,
    findings,
    holds,
    rule_results: ruleResults.map((result) => ({
      status: result.status,
      rule_id: result.rule_id,
      finding_count: result.findings.length,
      hold_count: result.holds.length,
    })),
    issues: Object.freeze(issues),
    refs: createEmptyLiveFeedRefs(),
  };
}

module.exports = {
  RULE_RESULT_STATUSES,
  cloneJsonValue,
  createLiveAbsenceFinding,
  evaluateLiveAbsenceRules,
  evaluateRule,
  normalizeCurrentLiveState,
};
