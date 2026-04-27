import type {
  AuthorityDashboardStateV1,
  DisclosurePreviewReportV1,
  GarpHandoffContextV1,
} from "../authority/authorityDashboardTypes.ts";
import type {
  DashboardLiveProjectionV1,
  LiveEventKind,
  LiveEventSeverity,
} from "../live/liveTypes.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";

export const FOREMAN_GUIDE_CONTEXT_VERSION =
  "meridian.v2.foremanGuideContext.v1" as const;

export type ForemanGuideSourceMode =
  | "snapshot"
  | "live"
  | "mixed"
  | "unknown";

export type ForemanGuideHoldSeverity =
  | "INFO"
  | "WATCH"
  | "GAP"
  | "HOLD"
  | "BLOCK";

export interface ForemanGuideHold {
  id: string;
  proof_needed: readonly string[];
  reason: string;
  severity: ForemanGuideHoldSeverity;
  source_ref: string | null;
}

export interface ForemanGuideSourceRef {
  evidence_id: string | null;
  label: string | null;
  path: string | null;
  source_kind: string;
  source_ref: string;
}

export interface ForemanGuideSnapshotInput {
  activePanel?: string | null;
  activeSkin?: string | null;
  currentStep?: ControlRoomTimelineStep | null;
  scenarioId?: string | null;
  sessionId?: string | null;
  sourceRefs?: readonly ForemanGuideSourceRef[];
}

export interface BuildForemanGuideContextInput {
  activePanel?: string | null;
  authorityState?: AuthorityDashboardStateV1 | null;
  disclosurePreviewReport?: DisclosurePreviewReportV1 | null;
  garpHandoffContext?: GarpHandoffContextV1 | null;
  liveProjection?: DashboardLiveProjectionV1 | null;
  roleSession?: DashboardRoleSessionProofV1 | null;
  snapshot?: ForemanGuideSnapshotInput | null;
}

export interface ForemanGuideLiveEventSummary {
  event_id: string;
  kind: LiveEventKind;
  refs: {
    absence_refs: readonly string[];
    authority_ref: string | null;
    entity_ids: readonly string[];
    evidence_ids: readonly string[];
    forensic_refs: readonly string[];
    governance_ref: string | null;
    skin_ref: string | null;
  };
  sequence: number;
  session_id: string;
  severity: LiveEventSeverity;
  source: {
    ref: string;
    type: string;
  };
  summary: string;
  timestamp: string;
  title: string;
}

export interface ForemanGuideContextV1 {
  current: {
    active_panel: string | null;
    active_skin: string | null;
    event_id: string | null;
    scenario_id: string | null;
    session_id: string | null;
    step_id: string | null;
  };
  foreman_readiness: {
    original_garp_foreman_ready: boolean | null;
    ready: boolean;
    reason: string;
    source: "derived_from_context";
  };
  holds: readonly ForemanGuideHold[];
  source_mode: ForemanGuideSourceMode;
  source_refs: readonly ForemanGuideSourceRef[];
  sources: {
    absence_refs: readonly ForemanGuideSourceRef[];
    authority_refs: readonly ForemanGuideSourceRef[];
    disclosure_refs: readonly ForemanGuideSourceRef[];
    forensic_refs: readonly ForemanGuideSourceRef[];
    garp_refs: readonly ForemanGuideSourceRef[];
    live_refs: readonly ForemanGuideSourceRef[];
    snapshot_refs: readonly ForemanGuideSourceRef[];
  };
  state: {
    disclosure_preview: DisclosurePreviewReportV1 | null;
    garp_handoff: GarpHandoffContextV1 | null;
    latest_absence: unknown | null;
    latest_authority: unknown | null;
    latest_forensic: unknown | null;
    latest_governance: unknown | null;
    live_events: readonly ForemanGuideLiveEventSummary[];
    public_boundary: unknown | null;
    role_session: DashboardRoleSessionProofV1 | null;
    visible_entities: readonly string[];
  };
  version: typeof FOREMAN_GUIDE_CONTEXT_VERSION;
}
