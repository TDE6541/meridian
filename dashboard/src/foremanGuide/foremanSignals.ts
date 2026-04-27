import type {
  SharedAuthorityEndpointStatus,
  SharedAuthorityEventPayload,
  SharedAuthorityHold,
  SharedAuthorityRequest,
} from "../authority/sharedAuthorityClient.ts";
import type { DisclosurePreviewReportV1 } from "../authority/authorityDashboardTypes.ts";
import type { LiveFeedEventV1 } from "../live/liveTypes.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import {
  answerForemanGuideOffline,
  FOREMAN_GUIDE_RESPONSE_VERSION,
  type ForemanGuideResponseKind,
  type ForemanGuideResponseV1,
} from "./offlineNarration.ts";
import type {
  ForemanGuideContextV1,
  ForemanGuideHold,
  ForemanGuideSourceRef,
} from "./foremanGuideTypes.ts";
import {
  getForemanPanel,
  getForemanPanelReference,
  type ForemanPanelId,
} from "./panelRegistry.ts";

export const FOREMAN_GUIDE_SIGNAL_VERSION =
  "meridian.v2.foremanGuideSignal.v1" as const;

export const FOREMAN_GUIDE_SIGNAL_KINDS = [
  "scenario.changed",
  "cascade.step.changed",
  "skin.changed",
  "live.event.observed",
  "authority.requested",
  "authority.approved",
  "authority.denied",
  "absence.observed",
  "disclosure.boundary.observed",
  "public.view.selected",
  "role.session.changed",
  "endpoint.hold",
] as const;

export type ForemanGuideSignalKind =
  (typeof FOREMAN_GUIDE_SIGNAL_KINDS)[number];

export type ForemanGuideSignalPriority = "low" | "medium" | "high";

export interface ForemanGuideSignalV1 {
  created_at: string;
  dedupe_key: string;
  eligible_for_proactive_narration: boolean;
  event_ref: string | null;
  holds: readonly ForemanGuideHold[];
  kind: ForemanGuideSignalKind;
  panel_id: ForemanPanelId | null;
  priority: ForemanGuideSignalPriority;
  signal_id: string;
  source_ref: string | null;
  source_refs: readonly ForemanGuideSourceRef[];
  summary: string;
  title: string;
  version: typeof FOREMAN_GUIDE_SIGNAL_VERSION;
}

export interface ForemanSharedAuthoritySignalInput {
  endpointStatus: SharedAuthorityEndpointStatus;
  events: readonly SharedAuthorityEventPayload[];
  hold: SharedAuthorityHold | null;
  requests: readonly SharedAuthorityRequest[];
}

export interface ForemanSignalStateInput {
  activePanelId?: string | null;
  activeScenarioId?: string | null;
  activeSkin?: string | null;
  activeStepId?: string | null;
  context?: ForemanGuideContextV1 | null;
  disclosurePreviewReport?: DisclosurePreviewReportV1 | null;
  liveEvents?: readonly LiveFeedEventV1[];
  roleSession?: DashboardRoleSessionProofV1 | null;
  sharedAuthority?: ForemanSharedAuthoritySignalInput | null;
}

export interface ForemanSignalState {
  absence_refs: readonly string[];
  active_panel_id: string | null;
  active_scenario_id: string | null;
  active_skin: string | null;
  active_step_id: string | null;
  authority_events: readonly {
    event_ref: string;
    request_id: string;
    source_ref: string;
    status: "approved" | "denied" | "pending";
    type: SharedAuthorityEventPayload["type"];
  }[];
  authority_requests: readonly {
    request_id: string;
    source_ref: string;
    status: string | null;
  }[];
  disclosure_key: string | null;
  disclosure_source_ref: string | null;
  endpoint_hold: SharedAuthorityHold | null;
  endpoint_status: SharedAuthorityEndpointStatus | null;
  live_events: readonly {
    event_id: string;
    kind: string;
    priority: ForemanGuideSignalPriority;
    source_ref: string;
    summary: string;
    title: string;
  }[];
  role_session_key: string | null;
  source_refs: {
    absence: readonly ForemanGuideSourceRef[];
    authority: readonly ForemanGuideSourceRef[];
    disclosure: readonly ForemanGuideSourceRef[];
    live: readonly ForemanGuideSourceRef[];
    role: readonly ForemanGuideSourceRef[];
    skin: readonly ForemanGuideSourceRef[];
    snapshot: readonly ForemanGuideSourceRef[];
  };
}

export interface BuildForemanGuideSignalsInput {
  createdAt?: string;
  current: ForemanSignalState;
  previous?: ForemanSignalState | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function signalId(dedupeKey: string): string {
  return `foreman-signal-${dedupeKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function uniqueSourceRefs(
  refs: readonly (ForemanGuideSourceRef | null | undefined)[]
): ForemanGuideSourceRef[] {
  const seen = new Set<string>();
  const next: ForemanGuideSourceRef[] = [];

  refs.forEach((ref) => {
    if (!ref || seen.has(ref.source_ref)) {
      return;
    }

    seen.add(ref.source_ref);
    next.push(ref);
  });

  return next;
}

function sourceRefFromString(sourceRef: string): ForemanGuideSourceRef {
  return {
    evidence_id: null,
    label: null,
    path: sourceRef,
    source_kind: "foreman.signal",
    source_ref: sourceRef,
  };
}

function firstSourceRef(
  refs: readonly ForemanGuideSourceRef[],
  fallback: string | null
): string | null {
  return refs[0]?.source_ref ?? fallback;
}

function panelForKind(kind: ForemanGuideSignalKind): ForemanPanelId | null {
  if (
    kind === "authority.requested" ||
    kind === "authority.approved" ||
    kind === "authority.denied"
  ) {
    return "authority-resolution";
  }

  if (kind === "endpoint.hold") {
    return "garp-status";
  }

  if (kind === "disclosure.boundary.observed" || kind === "public.view.selected") {
    return "disclosure-preview";
  }

  if (kind === "absence.observed") {
    return "absence-lens";
  }

  if (kind === "live.event.observed") {
    return "live-event-rail";
  }

  if (kind === "skin.changed") {
    return "skin-view";
  }

  if (kind === "role.session.changed") {
    return "control-room";
  }

  return "control-room";
}

function makeHold(
  id: string,
  reason: string,
  sourceRef: string | null,
  proofNeeded: readonly string[]
): ForemanGuideHold {
  return {
    id,
    proof_needed: proofNeeded,
    reason,
    severity: "HOLD",
    source_ref: sourceRef,
  };
}

function holdFromSharedAuthority(
  hold: SharedAuthorityHold
): ForemanGuideHold {
  return makeHold(hold.code, hold.message, hold.source_ref, [
    "connected dashboard-local shared authority endpoint response",
  ]);
}

function createSignal({
  createdAt,
  dedupeKey,
  eligible = true,
  eventRef = null,
  holds = [],
  kind,
  panelId = panelForKind(kind),
  priority = "medium",
  sourceRef,
  sourceRefs,
  summary,
  title,
}: {
  createdAt: string;
  dedupeKey: string;
  eligible?: boolean;
  eventRef?: string | null;
  holds?: readonly ForemanGuideHold[];
  kind: ForemanGuideSignalKind;
  panelId?: ForemanPanelId | null;
  priority?: ForemanGuideSignalPriority;
  sourceRef: string | null;
  sourceRefs: readonly ForemanGuideSourceRef[];
  summary: string;
  title: string;
}): ForemanGuideSignalV1 {
  const normalizedSourceRefs = uniqueSourceRefs([
    ...sourceRefs,
    sourceRef ? sourceRefFromString(sourceRef) : null,
  ]);

  return {
    created_at: createdAt,
    dedupe_key: dedupeKey,
    eligible_for_proactive_narration: eligible,
    event_ref: eventRef,
    holds,
    kind,
    panel_id: panelId,
    priority,
    signal_id: signalId(dedupeKey),
    source_ref: sourceRef,
    source_refs: normalizedSourceRefs,
    summary,
    title,
    version: FOREMAN_GUIDE_SIGNAL_VERSION,
  };
}

function statusFromAuthorityEvent(
  type: SharedAuthorityEventPayload["type"]
): "approved" | "denied" | "pending" {
  if (type === "AUTHORITY_APPROVED") {
    return "approved";
  }

  if (type === "AUTHORITY_DENIED") {
    return "denied";
  }

  return "pending";
}

function kindFromAuthorityStatus(
  status: string | null
): Extract<
  ForemanGuideSignalKind,
  "authority.approved" | "authority.denied" | "authority.requested"
> | null {
  if (status === "approved") {
    return "authority.approved";
  }

  if (status === "denied") {
    return "authority.denied";
  }

  if (status === "pending") {
    return "authority.requested";
  }

  return null;
}

function titleFromAuthorityKind(kind: ForemanGuideSignalKind): string {
  if (kind === "authority.approved") {
    return "Authority approved";
  }

  if (kind === "authority.denied") {
    return "Authority denied";
  }

  return "Authority requested";
}

function priorityFromAuthorityKind(
  kind: ForemanGuideSignalKind
): ForemanGuideSignalPriority {
  return kind === "authority.denied" ? "high" : "medium";
}

function eventPriority(event: LiveFeedEventV1): ForemanGuideSignalPriority {
  if (
    event.severity === "HOLD" ||
    event.severity === "BLOCK" ||
    event.severity === "REVOKE"
  ) {
    return "high";
  }

  if (event.foreman_hints.priority >= 2) {
    return "high";
  }

  if (event.foreman_hints.narration_eligible || event.severity === "WATCH") {
    return "medium";
  }

  return "low";
}

function sourceRefsForContext(
  context: ForemanGuideContextV1 | null | undefined
): ForemanSignalState["source_refs"] {
  return {
    absence: context?.sources.absence_refs ?? [],
    authority: context?.sources.authority_refs ?? [],
    disclosure: context?.sources.disclosure_refs ?? [],
    live: context?.sources.live_refs ?? [],
    role:
      context?.source_refs.filter((ref) =>
        ref.source_kind.startsWith("role.session")
      ) ?? [],
    skin:
      context?.source_refs.filter(
        (ref) =>
          ref.source_kind === "snapshot.skins" ||
          ref.source_kind === "live.event" && ref.path === "refs.skin_ref"
      ) ?? [],
    snapshot: context?.sources.snapshot_refs ?? [],
  };
}

export function createForemanSignalState({
  activePanelId = null,
  activeScenarioId = null,
  activeSkin = null,
  activeStepId = null,
  context = null,
  disclosurePreviewReport = null,
  liveEvents = [],
  roleSession = null,
  sharedAuthority = null,
}: ForemanSignalStateInput): ForemanSignalState {
  const sourceRefs = sourceRefsForContext(context);
  const authorityEvents =
    sharedAuthority?.events.map((event) => {
      const sequence = String(event.sequence ?? "local");
      return {
        event_ref: `${event.request_id}:${event.type}:${sequence}`,
        request_id: event.request_id,
        source_ref: `dashboard.shared_authority.event:${event.request_id}:${event.type}:${sequence}`,
        status: statusFromAuthorityEvent(event.type),
        type: event.type,
      };
    }) ?? [];
  const authorityRequests =
    sharedAuthority?.requests.map((request) => ({
      request_id: request.request_id,
      source_ref: `dashboard.shared_authority.request:${request.request_id}`,
      status: asString(request.status),
    })) ?? [];
  const liveEventSummaries = liveEvents.map((event) => ({
    event_id: event.event_id,
    kind: event.kind,
    priority: eventPriority(event),
    source_ref: `live.event:${event.event_id}`,
    summary: event.summary,
    title: event.title,
  }));
  const disclosureKey = disclosurePreviewReport
    ? [
        disclosurePreviewReport.status,
        disclosurePreviewReport.public_safe_summary,
        disclosurePreviewReport.generated_at ?? "",
        disclosurePreviewReport.unresolved_holds.join("|"),
      ].join(":")
    : null;
  const roleSessionKey = roleSession
    ? [
        roleSession.auth_status,
        roleSession.role,
        roleSession.active_skin,
        roleSession.subject_ref ?? "",
      ].join(":")
    : null;

  return {
    absence_refs: sourceRefs.absence.map((ref) => ref.source_ref),
    active_panel_id: asString(activePanelId),
    active_scenario_id: asString(activeScenarioId),
    active_skin: asString(activeSkin),
    active_step_id: asString(activeStepId),
    authority_events: authorityEvents,
    authority_requests: authorityRequests,
    disclosure_key: disclosureKey,
    disclosure_source_ref: disclosurePreviewReport
      ? "foreman.context.disclosure_preview"
      : null,
    endpoint_hold: sharedAuthority?.hold ?? null,
    endpoint_status: sharedAuthority?.endpointStatus ?? null,
    live_events: liveEventSummaries,
    role_session_key: roleSessionKey,
    source_refs: sourceRefs,
  };
}

function changed(
  previousValue: string | null | undefined,
  currentValue: string | null
): boolean {
  return Boolean(previousValue && currentValue && previousValue !== currentValue);
}

function requestStatusMap(
  requests: readonly ForemanSignalState["authority_requests"][number][]
): Map<string, string | null> {
  return new Map(requests.map((request) => [request.request_id, request.status]));
}

export function dedupeForemanGuideSignals(
  signals: readonly ForemanGuideSignalV1[],
  seenDedupeKeys: ReadonlySet<string> = new Set()
): ForemanGuideSignalV1[] {
  const seen = new Set(seenDedupeKeys);
  const next: ForemanGuideSignalV1[] = [];

  signals.forEach((signal) => {
    if (seen.has(signal.dedupe_key)) {
      return;
    }

    seen.add(signal.dedupe_key);
    next.push(signal);
  });

  return next;
}

export function buildForemanGuideSignals({
  createdAt = "dashboard-local",
  current,
  previous = null,
}: BuildForemanGuideSignalsInput): ForemanGuideSignalV1[] {
  const signals: ForemanGuideSignalV1[] = [];

  if (changed(previous?.active_scenario_id, current.active_scenario_id)) {
    const sourceRef = firstSourceRef(
      current.source_refs.snapshot,
      "foreman.current.scenario_id"
    );
    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `scenario.changed:${current.active_scenario_id}`,
        kind: "scenario.changed",
        priority: "medium",
        sourceRef,
        sourceRefs: current.source_refs.snapshot,
        summary: `Scenario changed to ${current.active_scenario_id}.`,
        title: "Scenario changed",
      })
    );
  }

  if (changed(previous?.active_step_id, current.active_step_id)) {
    const sourceRef = firstSourceRef(
      current.source_refs.snapshot,
      "foreman.current.step_id"
    );
    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `cascade.step.changed:${current.active_step_id}`,
        kind: "cascade.step.changed",
        priority: "medium",
        sourceRef,
        sourceRefs: current.source_refs.snapshot,
        summary: `Cascade step changed to ${current.active_step_id}.`,
        title: "Cascade step changed",
      })
    );
  }

  if (changed(previous?.active_skin, current.active_skin)) {
    const sourceRef = firstSourceRef(
      current.source_refs.skin,
      "foreman.current.active_skin"
    );
    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `skin.changed:${current.active_skin}`,
        kind: "skin.changed",
        priority: current.active_skin === "public" ? "high" : "medium",
        sourceRef,
        sourceRefs: current.source_refs.skin,
        summary: `Active skin changed to ${current.active_skin}.`,
        title: "Skin changed",
      })
    );

    if (current.active_skin === "public") {
      signals.push(
        createSignal({
          createdAt,
          dedupeKey: "public.view.selected:public",
          kind: "public.view.selected",
          priority: "high",
          sourceRef: firstSourceRef(
            current.source_refs.disclosure,
            "foreman.current.active_skin"
          ),
          sourceRefs: current.source_refs.disclosure,
          summary: "Public view selected; disclosure boundary narration must stay public-safe.",
          title: "Public view selected",
        })
      );
    }
  }

  const previousLiveEvents = new Set(
    previous?.live_events.map((event) => event.event_id) ?? []
  );
  current.live_events.forEach((event) => {
    if (previousLiveEvents.has(event.event_id)) {
      return;
    }

    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `live.event.observed:${event.event_id}`,
        eventRef: event.event_id,
        kind: "live.event.observed",
        priority: event.priority,
        sourceRef: event.source_ref,
        sourceRefs: current.source_refs.live,
        summary: `${event.title}: ${event.summary}`,
        title: "Live event observed",
      })
    );
  });

  const previousAuthorityEvents = new Set(
    previous?.authority_events.map((event) => event.event_ref) ?? []
  );
  current.authority_events.forEach((event) => {
    if (previousAuthorityEvents.has(event.event_ref)) {
      return;
    }

    const kind = kindFromAuthorityStatus(event.status);
    if (!kind) {
      return;
    }

    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `${kind}:${event.event_ref}`,
        eventRef: event.event_ref,
        kind,
        priority: priorityFromAuthorityKind(kind),
        sourceRef: event.source_ref,
        sourceRefs: current.source_refs.authority,
        summary: `${event.request_id} is ${event.status} in dashboard-local shared authority state.`,
        title: titleFromAuthorityKind(kind),
      })
    );
  });

  const previousRequestStatuses = requestStatusMap(previous?.authority_requests ?? []);
  current.authority_requests.forEach((request) => {
    const previousStatus = previousRequestStatuses.get(request.request_id);
    if (previousStatus === request.status) {
      return;
    }

    const kind = kindFromAuthorityStatus(request.status);
    if (!kind || (previous === null && request.status !== "pending")) {
      return;
    }

    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `${kind}:${request.request_id}:${request.status}`,
        eventRef: request.request_id,
        kind,
        priority: priorityFromAuthorityKind(kind),
        sourceRef: request.source_ref,
        sourceRefs: current.source_refs.authority,
        summary: `${request.request_id} is ${request.status} in shared authority requests.`,
        title: titleFromAuthorityKind(kind),
      })
    );
  });

  const previousAbsenceKey = previous?.absence_refs.join("|") ?? "";
  const currentAbsenceKey = current.absence_refs.join("|");
  if (currentAbsenceKey && previousAbsenceKey !== currentAbsenceKey) {
    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `absence.observed:${currentAbsenceKey}`,
        kind: "absence.observed",
        priority: "high",
        sourceRef: current.absence_refs[0] ?? "foreman.context.absence",
        sourceRefs: current.source_refs.absence,
        summary: "An absence source ref is present in the current Foreman context.",
        title: "Absence observed",
      })
    );
  }

  if (current.disclosure_key && previous?.disclosure_key !== current.disclosure_key) {
    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `disclosure.boundary.observed:${current.disclosure_key}`,
        kind: "disclosure.boundary.observed",
        priority: "high",
        sourceRef: firstSourceRef(
          current.source_refs.disclosure,
          current.disclosure_source_ref
        ),
        sourceRefs: current.source_refs.disclosure,
        summary: "Disclosure boundary context changed or became available.",
        title: "Disclosure boundary observed",
      })
    );
  }

  if (current.role_session_key && previous?.role_session_key !== current.role_session_key) {
    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `role.session.changed:${current.role_session_key}`,
        kind: "role.session.changed",
        priority: "medium",
        sourceRef: firstSourceRef(
          current.source_refs.role,
          "foreman.context.role_session"
        ),
        sourceRefs: current.source_refs.role,
        summary: "Role session proof changed or became available.",
        title: "Role session changed",
      })
    );
  }

  if (
    current.endpoint_status &&
    current.endpoint_status !== "connected" &&
    current.endpoint_hold &&
    (!previous ||
      previous.endpoint_status !== current.endpoint_status ||
      previous.endpoint_hold?.code !== current.endpoint_hold.code)
  ) {
    signals.push(
      createSignal({
        createdAt,
        dedupeKey: `endpoint.hold:${current.endpoint_status}:${current.endpoint_hold.code}`,
        holds: [holdFromSharedAuthority(current.endpoint_hold)],
        kind: "endpoint.hold",
        priority: "high",
        sourceRef: current.endpoint_hold.source_ref,
        sourceRefs: current.source_refs.authority,
        summary: current.endpoint_hold.message,
        title: "Endpoint HOLD",
      })
    );
  }

  return dedupeForemanGuideSignals(signals);
}

function promptForSignal(signal: ForemanGuideSignalV1): string {
  if (
    signal.kind === "authority.requested" ||
    signal.kind === "authority.approved" ||
    signal.kind === "authority.denied"
  ) {
    return "Explain authority";
  }

  if (signal.kind === "disclosure.boundary.observed" || signal.kind === "public.view.selected") {
    return "Public view";
  }

  if (signal.kind === "absence.observed") {
    return "Show me an absence";
  }

  if (signal.kind === "role.session.changed") {
    return "What can my role do?";
  }

  return "Walk the proof";
}

function responseKindForSignal(
  signal: ForemanGuideSignalV1,
  fallback: ForemanGuideResponseKind = "walk_summary"
): ForemanGuideResponseKind {
  if (signal.kind === "endpoint.hold") {
    return "hold";
  }

  if (
    signal.kind === "authority.requested" ||
    signal.kind === "authority.approved" ||
    signal.kind === "authority.denied"
  ) {
    return "authority_lifecycle";
  }

  if (signal.kind === "disclosure.boundary.observed") {
    return "disclosure_boundary";
  }

  if (signal.kind === "public.view.selected") {
    return "public_boundary";
  }

  if (signal.kind === "absence.observed") {
    return "absence_summary";
  }

  if (signal.kind === "role.session.changed") {
    return "role_session";
  }

  return fallback;
}

export function createProactiveForemanResponse(
  signal: ForemanGuideSignalV1,
  context: ForemanGuideContextV1 | null
): ForemanGuideResponseV1 {
  const sourceRefs = uniqueSourceRefs(signal.source_refs);
  const missingSourceHold =
    sourceRefs.length === 0
      ? [
          makeHold(
            "foreman_signal_source_unavailable",
            "HOLD: proactive Foreman narration requires a source-bounded signal.",
            signal.source_ref,
            ["ForemanGuideSignalV1.source_ref or source_refs"]
          ),
        ]
      : [];
  const spatialLead = getForemanPanel(signal.panel_id)
    ? getForemanPanelReference(signal.panel_id)
    : null;
  const base =
    context && signal.kind !== "endpoint.hold"
      ? answerForemanGuideOffline(promptForSignal(signal), context)
      : null;
  const answer = [
    spatialLead,
    `${signal.title}: ${signal.summary}`,
    base?.answer ?? null,
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");

  return {
    answer:
      answer ||
      "HOLD - proactive Foreman narration could not be produced from the supplied signal.",
    holds: [...signal.holds, ...missingSourceHold, ...(base?.holds ?? [])],
    mode: "offline",
    response_kind: responseKindForSignal(signal, base?.response_kind),
    source_refs: uniqueSourceRefs([...sourceRefs, ...(base?.source_refs ?? [])]),
    version: FOREMAN_GUIDE_RESPONSE_VERSION,
  };
}
