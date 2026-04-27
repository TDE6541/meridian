import type { GarpHandoffContextV1 } from "../authority/authorityDashboardTypes.ts";
import type { LiveFeedEventV1 } from "../live/liveTypes.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import type { ScenarioObject, ScenarioSkinAbsence } from "../types/scenario.ts";
import {
  FOREMAN_GUIDE_CONTEXT_VERSION,
  type BuildForemanGuideContextInput,
  type ForemanGuideContextV1,
  type ForemanGuideHold,
  type ForemanGuideLiveEventSummary,
  type ForemanGuideSnapshotInput,
  type ForemanGuideSourceMode,
  type ForemanGuideSourceRef,
} from "./foremanGuideTypes.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function hasKeys(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).length > 0;
}

function sourceRef(
  sourceKind: string,
  path: string | null,
  evidenceId: string | null = null,
  label: string | null = null
): ForemanGuideSourceRef {
  const source_ref = [sourceKind, path, evidenceId, label]
    .filter((entry): entry is string => Boolean(entry))
    .join(":");

  return {
    evidence_id: evidenceId,
    label,
    path,
    source_kind: sourceKind,
    source_ref,
  };
}

function sourceRefKey(ref: ForemanGuideSourceRef): string {
  return [
    ref.source_kind,
    ref.path ?? "",
    ref.evidence_id ?? "",
    ref.label ?? "",
    ref.source_ref,
  ].join("\u0000");
}

function uniqueSourceRefs(
  refs: readonly (ForemanGuideSourceRef | null | undefined)[]
): ForemanGuideSourceRef[] {
  const seen = new Set<string>();
  const next: ForemanGuideSourceRef[] = [];

  refs.forEach((ref) => {
    if (!ref) {
      return;
    }

    const key = sourceRefKey(ref);
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    next.push(ref);
  });

  return next;
}

function normalizeSourceRef(
  value: unknown,
  fallbackSourceKind: string
): ForemanGuideSourceRef {
  if (typeof value === "string") {
    return sourceRef(fallbackSourceKind, value);
  }

  const record = isRecord(value) ? value : {};
  const sourceKind =
    asString(record.source_kind) ??
    asString(record.sourceKind) ??
    fallbackSourceKind;
  const path =
    asString(record.path) ??
    asString(record.id) ??
    asString(record.source_ref) ??
    asString(record.sourceRef) ??
    asString(record.label) ??
    "source";
  const evidenceId =
    asString(record.evidence_id) ??
    asString(record.evidenceId) ??
    null;
  const label = asString(record.label);
  const normalized = sourceRef(sourceKind, path, evidenceId, label);
  const sourceRefValue = asString(record.source_ref) ?? asString(record.sourceRef);

  return sourceRefValue
    ? {
        ...normalized,
        source_ref: sourceRefValue,
      }
    : normalized;
}

function normalizeSourceRefs(
  refs: readonly unknown[] | undefined,
  fallbackSourceKind: string
): ForemanGuideSourceRef[] {
  return uniqueSourceRefs(
    (refs ?? []).map((ref) => normalizeSourceRef(ref, fallbackSourceKind))
  );
}

function collectSnapshotRefs(
  snapshot: ForemanGuideSnapshotInput | null | undefined
): ForemanGuideSourceRef[] {
  const currentStep = snapshot?.currentStep ?? null;
  const step = currentStep?.step ?? null;
  const stepId = currentStep?.stepId ?? null;
  const refs: ForemanGuideSourceRef[] = [
    ...normalizeSourceRefs(snapshot?.sourceRefs, "snapshot.source"),
  ];

  if (snapshot?.scenarioId) {
    refs.push(sourceRef("snapshot.scenario", "scenario.scenarioId", snapshot.scenarioId));
  }

  if (stepId) {
    refs.push(sourceRef("snapshot.step", `scenario.steps[${currentStep?.index ?? 0}]`, stepId));
  }

  if (hasKeys(step?.governance?.result)) {
    refs.push(sourceRef("snapshot.governance", "step.governance.result", stepId));
  }

  if (hasKeys(step?.authority)) {
    refs.push(sourceRef("snapshot.authority", "step.authority", stepId));
  }

  if (Array.isArray(step?.forensic?.entries) && step.forensic.entries.length > 0) {
    refs.push(sourceRef("snapshot.forensic", "step.forensic.entries", stepId));
  }

  if (hasKeys(step?.skins?.outputs)) {
    refs.push(sourceRef("snapshot.skins", "step.skins.outputs", stepId));
  }

  return uniqueSourceRefs(refs);
}

function collectLiveRefs(
  events: readonly LiveFeedEventV1[],
  liveSessionId: string | null,
  activeEventId: string | null
): ForemanGuideSourceRef[] {
  const refs: ForemanGuideSourceRef[] = [];

  if (liveSessionId) {
    refs.push(sourceRef("live.session", "projection.session.session_id", liveSessionId));
  }

  if (activeEventId) {
    refs.push(sourceRef("live.current", "projection.current.active_event_id", activeEventId));
  }

  events.forEach((event) => {
    refs.push(
      sourceRef(
        "live.event",
        `projection.events.${event.event_id}`,
        event.event_id,
        event.kind
      ),
      sourceRef("live.event.source", event.source.ref, event.event_id, event.source.type)
    );

    if (event.refs.governance_ref) {
      refs.push(sourceRef("live.event", "refs.governance_ref", event.refs.governance_ref));
    }

    if (event.refs.authority_ref) {
      refs.push(sourceRef("live.event", "refs.authority_ref", event.refs.authority_ref));
    }

    event.refs.forensic_refs.forEach((ref) => {
      refs.push(sourceRef("live.event", "refs.forensic_refs", ref));
    });

    event.refs.absence_refs.forEach((ref) => {
      refs.push(sourceRef("live.event", "refs.absence_refs", ref));
    });

    event.refs.entity_ids.forEach((ref) => {
      refs.push(sourceRef("live.event", "refs.entity_ids", ref));
    });
  });

  return uniqueSourceRefs(refs);
}

function collectGarpRefs({
  garpHandoffContext,
  roleSession,
}: {
  garpHandoffContext: GarpHandoffContextV1 | null;
  roleSession: DashboardRoleSessionProofV1 | null;
}): ForemanGuideSourceRef[] {
  const refs: ForemanGuideSourceRef[] = [];

  if (roleSession) {
    refs.push(
      sourceRef("role.session", "roleSession.contract", roleSession.contract),
      ...roleSession.holds.map((hold) =>
        sourceRef("role.session.hold", hold.source_ref, hold.code)
      )
    );
  }

  if (garpHandoffContext) {
    refs.push(
      sourceRef("garp.handoff", "garpHandoffContext.contract", garpHandoffContext.contract),
      ...normalizeSourceRefs(garpHandoffContext.source_refs, "garp.handoff.source"),
      ...garpHandoffContext.authority_request_refs.flatMap((request) =>
        normalizeSourceRefs(request.source_refs, "garp.handoff.request")
      ),
      ...garpHandoffContext.lifecycle_refs.flatMap((record) =>
        normalizeSourceRefs(record.source_refs, "garp.handoff.lifecycle")
      )
    );
  }

  return uniqueSourceRefs(refs);
}

function collectAuthorityRefs(
  input: BuildForemanGuideContextInput
): ForemanGuideSourceRef[] {
  const refs: ForemanGuideSourceRef[] = [];

  if (input.authorityState) {
    refs.push(
      ...normalizeSourceRefs(input.authorityState.source_refs, "authority.dashboard"),
      ...input.authorityState.requests.flatMap((request) =>
        normalizeSourceRefs(request.source_refs, "authority.request")
      ),
      ...input.authorityState.timeline.records.flatMap((record) =>
        normalizeSourceRefs(record.source_refs, "authority.timeline")
      )
    );
  }

  if (input.garpHandoffContext) {
    refs.push(
      ...input.garpHandoffContext.authority_request_refs.flatMap((request) =>
        normalizeSourceRefs(request.source_refs, "garp.handoff.request")
      )
    );
  }

  input.liveProjection?.events.forEach((event) => {
    if (event.refs.authority_ref) {
      refs.push(sourceRef("live.event", "refs.authority_ref", event.refs.authority_ref));
    }
  });

  if (hasKeys(input.snapshot?.currentStep?.step.authority)) {
    refs.push(
      sourceRef(
        "snapshot.authority",
        "step.authority",
        input.snapshot?.currentStep?.stepId ?? null
      )
    );
  }

  return uniqueSourceRefs(refs);
}

function collectForensicRefs(
  input: BuildForemanGuideContextInput
): ForemanGuideSourceRef[] {
  const refs: ForemanGuideSourceRef[] = [];
  const entries = input.snapshot?.currentStep?.step.forensic?.entries;

  if (Array.isArray(entries)) {
    entries.filter(isRecord).forEach((entry, index) => {
      refs.push(
        sourceRef(
          "snapshot.forensic",
          `step.forensic.entries[${index}]`,
          asString(entry.entry_id) ?? asString(entry.id)
        )
      );
    });
  }

  input.liveProjection?.events.forEach((event) => {
    event.refs.forensic_refs.forEach((ref) => {
      refs.push(sourceRef("live.event", "refs.forensic_refs", ref));
    });
  });

  input.authorityState?.timeline.records.forEach((record) => {
    record.forensic_refs.forEach((ref) => {
      refs.push(sourceRef("authority.timeline", "forensic_refs", ref));
    });
  });

  input.garpHandoffContext?.lifecycle_refs.forEach((record) => {
    record.forensic_refs.forEach((ref) => {
      refs.push(sourceRef("garp.handoff.lifecycle", "forensic_refs", ref));
    });
  });

  return uniqueSourceRefs(refs);
}

function collectAbsenceRefs(
  input: BuildForemanGuideContextInput
): ForemanGuideSourceRef[] {
  const refs: ForemanGuideSourceRef[] = [];
  const outputs = input.snapshot?.currentStep?.step.skins?.outputs;

  if (isRecord(outputs)) {
    Object.entries(outputs).forEach(([skinKey, payload]) => {
      if (!isRecord(payload) || !Array.isArray(payload.absences)) {
        return;
      }

      (payload.absences as ScenarioSkinAbsence[]).forEach((absence, index) => {
        refs.push(
          sourceRef(
            "snapshot.skin.absence",
            `step.skins.outputs.${skinKey}.absences[${index}]`,
            asString(absence.id) ?? asString(absence.path)
          ),
          ...normalizeSourceRefs(absence.sourceRefs, "snapshot.skin.absence.source")
        );
      });
    });
  }

  input.liveProjection?.foreman_context_seed.latest_absence_refs.forEach((ref) => {
    refs.push(sourceRef("live.foreman_context_seed", "latest_absence_refs", ref));
  });

  input.liveProjection?.events.forEach((event) => {
    event.refs.absence_refs.forEach((ref) => {
      refs.push(sourceRef("live.event", "refs.absence_refs", ref));
    });
  });

  return uniqueSourceRefs(refs);
}

function collectDisclosureRefs(
  report: BuildForemanGuideContextInput["disclosurePreviewReport"]
): ForemanGuideSourceRef[] {
  if (!report) {
    return [];
  }

  return uniqueSourceRefs([
    sourceRef("disclosure.preview", "disclosurePreviewReport.contract", report.contract),
    ...normalizeSourceRefs(report.source_refs, "disclosure.preview.source"),
  ]);
}

function summarizeLiveEvents(
  events: readonly LiveFeedEventV1[] | undefined
): ForemanGuideLiveEventSummary[] {
  return (events ?? []).map((event) => ({
    event_id: event.event_id,
    kind: event.kind,
    refs: {
      absence_refs: [...event.refs.absence_refs],
      authority_ref: event.refs.authority_ref,
      entity_ids: [...event.refs.entity_ids],
      evidence_ids: [...event.refs.evidence_ids],
      forensic_refs: [...event.refs.forensic_refs],
      governance_ref: event.refs.governance_ref,
      skin_ref: event.refs.skin_ref,
    },
    sequence: event.sequence,
    session_id: event.session_id,
    severity: event.severity,
    source: {
      ref: event.source.ref,
      type: event.source.type,
    },
    summary: event.summary,
    timestamp: event.timestamp,
    title: event.title,
  }));
}

function uniqueStrings(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    if (!value || seen.has(value)) {
      return;
    }

    seen.add(value);
    next.push(value);
  });

  return next;
}

function collectVisibleEntities(input: BuildForemanGuideContextInput): string[] {
  const snapshotSummary = input.snapshot?.currentStep?.step.summary;
  const liveSeed = input.liveProjection?.foreman_context_seed.visible_entity_ids ?? [];
  const liveChanged = input.liveProjection?.entities.changed_entity_ids ?? [];
  const liveEventEntities =
    input.liveProjection?.events.flatMap((event) => event.refs.entity_ids) ?? [];

  return uniqueStrings([
    asString(snapshotSummary?.selectedEntityId),
    ...liveSeed,
    ...liveChanged,
    ...liveEventEntities,
  ]);
}

function collectSnapshotAbsenceState(
  snapshot: ForemanGuideSnapshotInput | null | undefined
): ScenarioObject | null {
  const outputs = snapshot?.currentStep?.step.skins?.outputs;
  if (!isRecord(outputs)) {
    return null;
  }

  const absences: ScenarioSkinAbsence[] = [];
  Object.values(outputs).forEach((payload) => {
    if (isRecord(payload) && Array.isArray(payload.absences)) {
      absences.push(...(payload.absences as ScenarioSkinAbsence[]));
    }
  });

  return absences.length > 0 ? { absences } : null;
}

function deriveSourceMode({
  garpRefs,
  liveRefs,
  snapshotRefs,
}: {
  garpRefs: readonly ForemanGuideSourceRef[];
  liveRefs: readonly ForemanGuideSourceRef[];
  snapshotRefs: readonly ForemanGuideSourceRef[];
}): ForemanGuideSourceMode {
  const hasSnapshot = snapshotRefs.length > 0;
  const hasLive = liveRefs.length > 0;
  const hasGarp = garpRefs.length > 0;
  const sourceCount = [hasSnapshot, hasLive, hasGarp].filter(Boolean).length;

  if (sourceCount === 0) {
    return "unknown";
  }

  if (hasSnapshot && !hasLive && !hasGarp) {
    return "snapshot";
  }

  if (hasLive && !hasSnapshot && !hasGarp) {
    return "live";
  }

  return "mixed";
}

function hold(
  id: string,
  reason: string,
  source_ref: string | null,
  proof_needed: readonly string[]
): ForemanGuideHold {
  return {
    id,
    proof_needed,
    reason,
    severity: "HOLD",
    source_ref,
  };
}

function buildHolds({
  activeSkin,
  eventId,
  scenarioId,
  sessionId,
  sourceRefs,
  stepId,
}: {
  activeSkin: string | null;
  eventId: string | null;
  scenarioId: string | null;
  sessionId: string | null;
  sourceRefs: readonly ForemanGuideSourceRef[];
  stepId: string | null;
}): ForemanGuideHold[] {
  const holds: ForemanGuideHold[] = [];

  if (!scenarioId) {
    holds.push(
      hold(
        "missing_active_scenario",
        "HOLD: active scenario identity is unavailable for Foreman Guide context.",
        "foreman.current.scenario_id",
        ["snapshot scenario id or explicit scenario identity"]
      )
    );
  }

  if (!sessionId) {
    holds.push(
      hold(
        "missing_active_session",
        "HOLD: active session identity is unavailable for Foreman Guide context.",
        "foreman.current.session_id",
        ["live projection session id or explicit snapshot session id"]
      )
    );
  }

  if (!activeSkin) {
    holds.push(
      hold(
        "missing_active_skin",
        "HOLD: active skin is unavailable for Foreman Guide context.",
        "foreman.current.active_skin",
        ["role session active skin, live projection active skin, or explicit snapshot skin"]
      )
    );
  }

  if (!stepId && !eventId) {
    holds.push(
      hold(
        "missing_active_step_or_event",
        "HOLD: neither an active snapshot step nor an active live event is available.",
        "foreman.current.step_or_event",
        ["active snapshot step id or active live event id"]
      )
    );
  }

  if (sourceRefs.length === 0) {
    holds.push(
      hold(
        "missing_source_data",
        "HOLD: no snapshot, live, or GARP source data was supplied.",
        "foreman.sources",
        ["snapshot source refs", "live projection source refs", "GARP authority or handoff source refs"]
      )
    );
  }

  return holds;
}

function deriveReadiness({
  garpHandoffContext,
  holds,
}: {
  garpHandoffContext: GarpHandoffContextV1 | null;
  holds: readonly ForemanGuideHold[];
}): ForemanGuideContextV1["foreman_readiness"] {
  const original_garp_foreman_ready =
    typeof garpHandoffContext?.foreman_ready === "boolean"
      ? garpHandoffContext.foreman_ready
      : null;
  const blockingHoldIds = holds
    .filter((entry) => entry.severity === "HOLD" || entry.severity === "BLOCK")
    .map((entry) => entry.id);

  if (!garpHandoffContext) {
    return {
      original_garp_foreman_ready,
      ready: false,
      reason: "GARP handoff context is unavailable; Foreman context is not ready for later packet consumption.",
      source: "derived_from_context",
    };
  }

  if (blockingHoldIds.length > 0) {
    return {
      original_garp_foreman_ready,
      ready: false,
      reason: `Foreman context is holding on ${blockingHoldIds.join(", ")}.`,
      source: "derived_from_context",
    };
  }

  return {
    original_garp_foreman_ready,
    ready: true,
    reason:
      "Foreman context substrate is source-bounded and ready for later packet consumption; original GARP handoff remains unchanged.",
    source: "derived_from_context",
  };
}

export function buildForemanGuideContext(
  input: BuildForemanGuideContextInput = {}
): ForemanGuideContextV1 {
  const snapshot = input.snapshot ?? null;
  const liveProjection = input.liveProjection ?? null;
  const roleSession = input.roleSession ?? input.authorityState?.role_session ?? null;
  const garpHandoffContext = input.garpHandoffContext ?? null;
  const disclosurePreviewReport = input.disclosurePreviewReport ?? null;
  const currentStep = snapshot?.currentStep ?? null;
  const scenarioId = asString(snapshot?.scenarioId);
  const sessionId =
    asString(snapshot?.sessionId) ??
    asString(liveProjection?.session.session_id) ??
    asString(liveProjection?.foreman_context_seed.active_session_id);
  const stepId = currentStep?.stepId ?? null;
  const eventId =
    asString(liveProjection?.current.active_event_id) ??
    asString(liveProjection?.foreman_context_seed.active_event_id);
  const activeSkin =
    asString(snapshot?.activeSkin) ??
    asString(liveProjection?.current.active_skin) ??
    asString(roleSession?.active_skin) ??
    asString(garpHandoffContext?.public_boundary.active_skin);
  const activePanel =
    asString(input.activePanel) ??
    asString(snapshot?.activePanel);
  const snapshotRefs = collectSnapshotRefs(snapshot);
  const liveRefs = liveProjection
    ? collectLiveRefs(liveProjection.events, sessionId, eventId)
    : [];
  const garpRefs = collectGarpRefs({ garpHandoffContext, roleSession });
  const authorityRefs = collectAuthorityRefs(input);
  const forensicRefs = collectForensicRefs(input);
  const absenceRefs = collectAbsenceRefs(input);
  const disclosureRefs = collectDisclosureRefs(disclosurePreviewReport);
  const sourceRefs = uniqueSourceRefs([
    ...snapshotRefs,
    ...liveRefs,
    ...garpRefs,
    ...authorityRefs,
    ...forensicRefs,
    ...absenceRefs,
    ...disclosureRefs,
  ]);
  const holds = buildHolds({
    activeSkin,
    eventId,
    scenarioId,
    sessionId,
    sourceRefs,
    stepId,
  });

  return {
    current: {
      active_panel: activePanel,
      active_skin: activeSkin,
      event_id: eventId,
      scenario_id: scenarioId,
      session_id: sessionId,
      step_id: stepId,
    },
    foreman_readiness: deriveReadiness({
      garpHandoffContext,
      holds,
    }),
    holds,
    source_mode: deriveSourceMode({
      garpRefs,
      liveRefs,
      snapshotRefs,
    }),
    source_refs: sourceRefs,
    sources: {
      absence_refs: absenceRefs,
      authority_refs: authorityRefs,
      disclosure_refs: disclosureRefs,
      forensic_refs: forensicRefs,
      garp_refs: garpRefs,
      live_refs: liveRefs,
      snapshot_refs: snapshotRefs,
    },
    state: {
      disclosure_preview: disclosurePreviewReport,
      garp_handoff: garpHandoffContext,
      latest_absence:
        liveProjection?.latest.absence ?? collectSnapshotAbsenceState(snapshot),
      latest_authority:
        input.authorityState ??
        liveProjection?.latest.authority ??
        currentStep?.step.authority ??
        null,
      latest_forensic:
        liveProjection?.latest.forensic ??
        currentStep?.step.forensic ??
        null,
      latest_governance:
        liveProjection?.latest.governance ??
        currentStep?.step.governance?.result ??
        null,
      live_events: summarizeLiveEvents(liveProjection?.events),
      public_boundary:
        garpHandoffContext?.public_boundary ??
        input.authorityState?.public_boundary ??
        liveProjection?.foreman_context_seed.public_boundary ??
        null,
      role_session: roleSession,
      visible_entities: collectVisibleEntities(input),
    },
    version: FOREMAN_GUIDE_CONTEXT_VERSION,
  };
}
