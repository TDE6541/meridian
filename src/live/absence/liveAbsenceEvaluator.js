const {
  createEmptyLiveFeedRefs,
  isNonEmptyString,
  isPlainObject,
} = require("../contracts");
const {
  createLiveFeedEventFromRecordV1,
} = require("../liveFeedEvent");
const {
  createDefaultLiveAbsenceProfile,
  validateLiveAbsenceProfile,
} = require("./liveAbsenceProfiles");
const {
  cloneJsonValue,
  evaluateLiveAbsenceRules,
  normalizeCurrentLiveState,
} = require("./liveAbsenceRules");

function createEvaluatorResult(ok, extra = {}, issues = []) {
  return {
    ok,
    valid: ok,
    status: ok ? "PASS" : "HOLD",
    issues: Object.freeze([...issues]),
    ...extra,
  };
}

function normalizeSourceRef(value, fallback) {
  return isNonEmptyString(value) ? value : fallback;
}

function buildRefsForFinding(finding) {
  return {
    ...createEmptyLiveFeedRefs(),
    entity_ids: Array.isArray(finding.entity_refs)
      ? finding.entity_refs.filter(isNonEmptyString)
      : [],
    evidence_ids: [],
    absence_refs: [finding.finding_id].filter(isNonEmptyString),
  };
}

function buildRefsForHold(hold) {
  return {
    ...createEmptyLiveFeedRefs(),
    entity_ids: Array.isArray(hold.entity_refs)
      ? hold.entity_refs.filter(isNonEmptyString)
      : [],
    absence_refs: [hold.hold_id].filter(isNonEmptyString),
  };
}

function appendVisibleAbsenceRecord(store, sessionId, input) {
  const appended = store.appendRecord(sessionId, {
    type: input.kind,
    source: {
      type: "absence_rule",
      ref: input.source_ref,
    },
    payload: {
      ...cloneJsonValue(input.payload),
      live_feed_event: {
        kind: input.kind,
        severity: input.severity,
        title: input.title,
        summary: input.summary,
        refs: input.refs,
        visibility: "internal",
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
      issues: [...appended.issues],
    };
  }

  const eventResult = createLiveFeedEventFromRecordV1(appended.record);
  return {
    ok: eventResult.valid,
    record: appended.record,
    event: eventResult.event,
    session: appended.session,
    issues: [...eventResult.issues],
  };
}

function collectExistingIds(records, payloadField, idField) {
  const ids = new Set();

  for (const record of records) {
    const value = record?.payload?.[payloadField];
    if (isPlainObject(value) && isNonEmptyString(value[idField])) {
      ids.add(value[idField]);
    }
  }

  return ids;
}

function appendFinding(store, sessionId, finding) {
  return appendVisibleAbsenceRecord(store, sessionId, {
    kind: "absence.finding.created",
    severity: finding.severity,
    title: "Live absence finding",
    summary: `${finding.rule_id} missing ${finding.expected_signal}.`,
    source_ref: finding.rule_id,
    refs: buildRefsForFinding(finding),
    payload: {
      absence_finding: finding,
    },
  });
}

function appendHold(store, sessionId, hold) {
  return appendVisibleAbsenceRecord(store, sessionId, {
    kind: "hold.raised",
    severity: "HOLD",
    title: "Live absence evaluation held",
    summary: hold.message,
    source_ref: hold.rule_id,
    refs: buildRefsForHold(hold),
    payload: {
      absence_hold: hold,
    },
  });
}

function loadSession(input) {
  if (isPlainObject(input.session)) {
    return {
      ok: true,
      session: cloneJsonValue(input.session),
      issues: [],
    };
  }

  if (
    input.store &&
    typeof input.store.loadSession === "function" &&
    isNonEmptyString(input.session_id)
  ) {
    const loaded = input.store.loadSession(input.session_id);
    return {
      ok: loaded.ok === true,
      session: loaded.ok === true ? loaded.session : null,
      issues: Array.isArray(loaded.issues) ? [...loaded.issues] : [],
    };
  }

  return {
    ok: false,
    session: null,
    issues: ["store/session_id or session is required."],
  };
}

function evaluateLiveAbsenceSession(input = {}, options = {}) {
  const merged = {
    ...options,
    ...(isPlainObject(input) ? input : {}),
  };
  const store = merged.store || null;
  const profile = merged.profile || createDefaultLiveAbsenceProfile();
  const profileValidation = validateLiveAbsenceProfile(profile);

  if (!profileValidation.valid) {
    return createEvaluatorResult(
      false,
      {
        session_id: merged.session_id || null,
        profile_id: profile?.profile_id || null,
        findings: [],
        holds: [],
        events: [],
        state: null,
      },
      profileValidation.issues
    );
  }

  if (!store || typeof store.appendRecord !== "function") {
    return createEvaluatorResult(
      false,
      {
        session_id: merged.session_id || null,
        profile_id: profile.profile_id,
        findings: [],
        holds: [],
        events: [],
        state: null,
      },
      ["live session store with appendRecord is required."]
    );
  }

  const loaded = loadSession(merged);
  if (!loaded.ok) {
    return createEvaluatorResult(
      false,
      {
        session_id: merged.session_id || null,
        profile_id: profile.profile_id,
        findings: [],
        holds: [],
        events: [],
        state: null,
      },
      loaded.issues
    );
  }

  const sessionId = loaded.session.session_id;
  const state = normalizeCurrentLiveState({
    session: loaded.session,
    records: loaded.session.records,
    session_id: sessionId,
  });
  const evaluated = evaluateLiveAbsenceRules(state, profile);
  const existingFindingIds = collectExistingIds(
    state.records,
    "absence_finding",
    "finding_id"
  );
  const existingHoldIds = collectExistingIds(
    state.records,
    "absence_hold",
    "hold_id"
  );
  const events = [];
  const issues = [...evaluated.issues];
  let latestSession = loaded.session;

  for (const finding of evaluated.findings) {
    if (existingFindingIds.has(finding.finding_id)) {
      continue;
    }

    const appended = appendFinding(store, sessionId, finding);
    if (!appended.ok) {
      issues.push(...appended.issues);
      continue;
    }

    events.push(appended.event);
    latestSession = appended.session;
    existingFindingIds.add(finding.finding_id);
  }

  for (const hold of evaluated.holds) {
    if (existingHoldIds.has(hold.hold_id)) {
      continue;
    }

    const appended = appendHold(store, sessionId, hold);
    if (!appended.ok) {
      issues.push(...appended.issues);
      continue;
    }

    events.push(appended.event);
    latestSession = appended.session;
    existingHoldIds.add(hold.hold_id);
  }

  const hasHold = evaluated.holds.length > 0 || issues.length > 0;

  return createEvaluatorResult(
    !hasHold,
    {
      status: hasHold ? "HOLD" : "PASS",
      session_id: sessionId,
      profile_id: profile.profile_id,
      findings: evaluated.findings.map(cloneJsonValue),
      holds: evaluated.holds.map(cloneJsonValue),
      events: events.map(cloneJsonValue),
      state,
      session: latestSession,
    },
    issues
  );
}

function createLiveAbsenceEvaluator(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError("options must be a plain object");
  }

  return {
    evaluate(input = {}) {
      return evaluateLiveAbsenceSession(input, options);
    },
  };
}

module.exports = {
  evaluateLiveAbsenceSession,
  createLiveAbsenceEvaluator,
  normalizeSourceRef,
};
