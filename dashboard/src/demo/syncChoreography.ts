import type { DashboardForensicChainView } from "../adapters/forensicAdapter.ts";
import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";
import type { SharedAuthorityEventPayload } from "../authority/sharedAuthorityClient.ts";
import type { SharedAuthorityRequestsState } from "../authority/useSharedAuthorityRequests.ts";
import type { DashboardLiveProjectionV1 } from "../live/liveTypes.ts";

export type SyncPillPulse =
  | "idle"
  | "request"
  | "pending"
  | "approved"
  | "denied"
  | "holding"
  | "projection";

export interface SyncChoreographyInput {
  authorityState: AuthorityDashboardStateV1;
  dashboardMode: "live" | "snapshot";
  forensicChain: DashboardForensicChainView;
  liveProjection: DashboardLiveProjectionV1 | null;
  sharedAuthority: SharedAuthorityRequestsState;
}

export interface SyncChoreographyView {
  animate: boolean;
  detail: string;
  directorApprovalPulse: boolean;
  label: string;
  pulse: SyncPillPulse;
  sourceRef: string;
  vibrationSignalId: string | null;
}

function latestSharedAuthorityEvent(
  events: readonly SharedAuthorityEventPayload[]
): SharedAuthorityEventPayload | null {
  return events.length > 0 ? events[events.length - 1] : null;
}

function hasLiveAuthorityEvent(
  liveProjection: DashboardLiveProjectionV1 | null
): boolean {
  return Boolean(
    liveProjection?.events.some((event) => event.kind === "authority.evaluated")
  );
}

function hasProjectionSignal(
  liveProjection: DashboardLiveProjectionV1 | null
): boolean {
  return Boolean(
    liveProjection?.current.active_event_id ||
      liveProjection?.events.length ||
      liveProjection?.latest.authority ||
      liveProjection?.latest.forensic
  );
}

function pendingSharedRequestId(
  sharedAuthority: SharedAuthorityRequestsState
): string | null {
  const pending = sharedAuthority.requests.find(
    (request) => request.status === "pending"
  );

  return pending?.request_id ?? null;
}

function vibrationSignalFromSharedEvent(
  event: SharedAuthorityEventPayload | null
): string | null {
  if (!event || event.type !== "AUTHORITY_RESOLUTION_REQUESTED") {
    return null;
  }

  return `shared-authority-event:${event.request_id}:${String(
    event.sequence ?? "local"
  )}`;
}

function viewFromSharedEvent(
  event: SharedAuthorityEventPayload
): SyncChoreographyView {
  if (event.type === "AUTHORITY_APPROVED") {
    return {
      animate: true,
      detail: "Existing shared authority event reported approval.",
      directorApprovalPulse: true,
      label: "Director approval synced",
      pulse: "approved",
      sourceRef: "sharedAuthority.events.AUTHORITY_APPROVED",
      vibrationSignalId: null,
    };
  }

  if (event.type === "AUTHORITY_DENIED") {
    return {
      animate: true,
      detail: "Existing shared authority event reported denial.",
      directorApprovalPulse: false,
      label: "Director decision synced",
      pulse: "denied",
      sourceRef: "sharedAuthority.events.AUTHORITY_DENIED",
      vibrationSignalId: null,
    };
  }

  return {
    animate: true,
    detail: "Existing shared authority event reported a new request.",
    directorApprovalPulse: false,
    label: "Authority request landed",
    pulse: "request",
    sourceRef: "sharedAuthority.events.AUTHORITY_RESOLUTION_REQUESTED",
    vibrationSignalId: vibrationSignalFromSharedEvent(event),
  };
}

export function buildSyncChoreographyView({
  authorityState,
  dashboardMode,
  forensicChain,
  liveProjection,
  sharedAuthority,
}: SyncChoreographyInput): SyncChoreographyView {
  const latestEvent = latestSharedAuthorityEvent(sharedAuthority.events);
  if (latestEvent) {
    return viewFromSharedEvent(latestEvent);
  }

  const pendingRequestId = pendingSharedRequestId(sharedAuthority);
  if (pendingRequestId) {
    return {
      animate: true,
      detail: "Existing shared authority request is pending.",
      directorApprovalPulse: false,
      label: "Authority request pending",
      pulse: "pending",
      sourceRef: "sharedAuthority.requests.pending",
      vibrationSignalId: `shared-authority-request:${pendingRequestId}`,
    };
  }

  if (authorityState.counts.approved > 0 || authorityState.status === "approved") {
    return {
      animate: true,
      detail: "Existing authority dashboard state includes approval.",
      directorApprovalPulse: true,
      label: "Director approval observed",
      pulse: "approved",
      sourceRef: "authorityState.status.approved",
      vibrationSignalId: null,
    };
  }

  if (authorityState.counts.denied > 0 || authorityState.status === "denied") {
    return {
      animate: true,
      detail: "Existing authority dashboard state includes denial.",
      directorApprovalPulse: false,
      label: "Director decision observed",
      pulse: "denied",
      sourceRef: "authorityState.status.denied",
      vibrationSignalId: null,
    };
  }

  if (authorityState.counts.pending > 0 || authorityState.status === "pending") {
    return {
      animate: true,
      detail: "Existing authority dashboard state includes pending authority.",
      directorApprovalPulse: false,
      label: "Authority pending",
      pulse: "pending",
      sourceRef: "authorityState.status.pending",
      vibrationSignalId: null,
    };
  }

  if (authorityState.status === "holding" || sharedAuthority.hold) {
    return {
      animate: true,
      detail: "Existing authority or shared endpoint state is holding.",
      directorApprovalPulse: false,
      label: "Sync holding",
      pulse: "holding",
      sourceRef: sharedAuthority.hold?.source_ref ?? "authorityState.status.holding",
      vibrationSignalId: null,
    };
  }

  if (dashboardMode === "live" && hasLiveAuthorityEvent(liveProjection)) {
    return {
      animate: true,
      detail: "Existing live projection includes an authority event.",
      directorApprovalPulse: false,
      label: "Projection authority synced",
      pulse: "projection",
      sourceRef: "projection.events.authority.evaluated",
      vibrationSignalId: null,
    };
  }

  if (dashboardMode === "live" && hasProjectionSignal(liveProjection)) {
    return {
      animate: true,
      detail: "Existing live projection event state is active.",
      directorApprovalPulse: false,
      label: "Projection synced",
      pulse: "projection",
      sourceRef: "projection.events",
      vibrationSignalId: null,
    };
  }

  if (forensicChain.totalEntryCount > 0) {
    return {
      animate: false,
      detail: "Existing forensic chain entries are visible on the main screen.",
      directorApprovalPulse: false,
      label: "Snapshot aligned",
      pulse: "idle",
      sourceRef: "forensicChain.totalEntryCount",
      vibrationSignalId: null,
    };
  }

  return {
    animate: false,
    detail: "No authority, projection, or forensic sync cue is active.",
    directorApprovalPulse: false,
    label: "Sync idle",
    pulse: "idle",
    sourceRef: "dashboard.demo.sync.idle",
    vibrationSignalId: null,
  };
}
