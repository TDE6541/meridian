export const DASHBOARD_LIVE_PROJECTION_VERSION =
  "meridian.v2.dashboardLiveProjection.v1" as const;
export const LIVE_FEED_EVENT_VERSION = "meridian.v2.liveFeedEvent.v1" as const;

export const LIVE_EVENT_SEVERITIES = [
  "INFO",
  "WATCH",
  "GAP",
  "HOLD",
  "BLOCK",
  "REVOKE",
] as const;

export const LIVE_EVENT_KINDS = [
  "session.created",
  "capture.artifact_ingested",
  "entity.delta.accepted",
  "governance.evaluated",
  "authority.evaluated",
  "forensic.receipt",
  "absence.finding.created",
  "hold.raised",
  "error.hold",
  "skins.outputs.projected",
  "cityData.seed.loaded",
  "corridor.generated",
  "constellation.replay.received",
] as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type LiveConnectionStatus = "connected" | "disconnected" | "holding";
export type LiveEventSeverity = (typeof LIVE_EVENT_SEVERITIES)[number];
export type KnownLiveEventKind = (typeof LIVE_EVENT_KINDS)[number];
export type LiveEventKind = KnownLiveEventKind | (string & {});

export interface LiveFeedSourceV1 extends JsonObject {
  ref: string;
  type: string;
}

export interface LiveFeedRefsV1 extends JsonObject {
  absence_refs: string[];
  authority_ref: string | null;
  entity_ids: string[];
  evidence_ids: string[];
  forensic_refs: string[];
  governance_ref: string | null;
  skin_ref: string | null;
}

export interface ForemanHintsV1 extends JsonObject {
  narration_eligible: boolean;
  priority: number;
  reason: string;
}

export interface LiveFeedEventV1 extends JsonObject {
  event_id: string;
  foreman_hints: ForemanHintsV1;
  kind: LiveEventKind;
  refs: LiveFeedRefsV1;
  sequence: number;
  session_id: string;
  severity: LiveEventSeverity;
  source: LiveFeedSourceV1;
  summary: string;
  timestamp: string;
  title: string;
  version: typeof LIVE_FEED_EVENT_VERSION;
  visibility: "internal" | "public_safe" | "restricted" | (string & {});
}

export interface ForemanContextSeedV1 extends JsonObject {
  active_event_id: string | null;
  active_session_id: string;
  active_skin: string | null;
  latest_absence_refs: string[];
  latest_forensic_refs: string[];
  latest_governance_ref: string | null;
  public_boundary: JsonObject;
  role_session: JsonObject | null;
  visible_entity_ids: string[];
}

export interface DashboardLiveProjectionLatestV1 extends JsonObject {
  absence: JsonObject | null;
  authority: JsonObject | null;
  capture: JsonObject | null;
  forensic: JsonObject | null;
  governance: JsonObject | null;
}

export interface DashboardLiveProjectionV1 extends JsonObject {
  connection: {
    hold_reason: string | null;
    status: LiveConnectionStatus;
  };
  current: {
    active_event_id: string | null;
    active_skin: string | null;
  };
  entities: {
    changed_entity_ids: string[];
    counts_by_type: Record<string, number>;
  };
  events: LiveFeedEventV1[];
  foreman_context_seed: ForemanContextSeedV1;
  latest: DashboardLiveProjectionLatestV1;
  session: {
    created_at: string;
    session_id: string;
    status: "open" | "holding" | "closed" | (string & {});
    updated_at: string;
  };
  skins: {
    outputs: Record<string, JsonObject>;
  };
  version: typeof DASHBOARD_LIVE_PROJECTION_VERSION;
}

export function isKnownLiveEventKind(kind: string): kind is KnownLiveEventKind {
  return LIVE_EVENT_KINDS.includes(kind as KnownLiveEventKind);
}
