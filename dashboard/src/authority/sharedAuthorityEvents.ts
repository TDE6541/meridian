import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import {
  AUTHORITY_DASHBOARD_STATE_CONTRACT,
  AUTHORITY_TIMELINE_VIEW_CONTRACT,
  type AuthorityDashboardAdvisory,
  type AuthorityDashboardSourceRef,
  type AuthorityDashboardStateV1,
  type AuthorityDashboardStatus,
  type AuthorityResolutionItem,
  type AuthorityTimelineRecord,
} from "./authorityDashboardTypes.ts";
import { sortAuthorityTimelineRecords } from "./authorityTimeline.ts";
import {
  AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
  SHARED_AUTHORITY_REQUESTS_ENDPOINT,
  type SharedAuthorityEndpointStatus,
  type SharedAuthorityEventPayload,
  type SharedAuthorityEventType,
  type SharedAuthorityHold,
  type SharedAuthorityRequest,
} from "./sharedAuthorityClient.ts";

export interface SharedAuthorityDisplayInput {
  endpointStatus: SharedAuthorityEndpointStatus;
  events: readonly SharedAuthorityEventPayload[];
  hold: SharedAuthorityHold | null;
  loading: boolean;
  requests: readonly SharedAuthorityRequest[];
}

export interface SharedAuthorityDisplayView {
  advisory: AuthorityDashboardAdvisory | null;
  endpointStatus: SharedAuthorityEndpointStatus;
  endpointStatusLabel: string;
  state: AuthorityDashboardStateV1;
}

export interface SharedAuthorityPermissions {
  canResolve: boolean;
  canReview: boolean;
  canSubmit: boolean;
  reason: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function sourceRef(
  sourceKind: string,
  path: string,
  evidenceId: string | null = null,
  label?: string
): AuthorityDashboardSourceRef {
  return {
    evidence_id: evidenceId,
    label,
    path,
    source_kind: sourceKind,
  };
}

function uniqueSourceRefs(
  refs: readonly AuthorityDashboardSourceRef[]
): AuthorityDashboardSourceRef[] {
  const seen = new Set<string>();
  const next: AuthorityDashboardSourceRef[] = [];

  refs.forEach((ref) => {
    const key = `${ref.source_kind}:${ref.path}:${ref.evidence_id ?? ""}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    next.push(ref);
  });

  return next;
}

function uniqueRecords(
  records: readonly AuthorityTimelineRecord[]
): AuthorityTimelineRecord[] {
  const seen = new Set<string>();
  const next: AuthorityTimelineRecord[] = [];

  records.forEach((record) => {
    if (seen.has(record.record_id)) {
      return;
    }

    seen.add(record.record_id);
    next.push(record);
  });

  return next;
}

function uniqueRequests(
  requests: readonly AuthorityResolutionItem[]
): AuthorityResolutionItem[] {
  const byId = new Map<string, AuthorityResolutionItem>();

  requests.forEach((request) => {
    byId.set(request.request_id, request);
  });

  return [...byId.values()];
}

function mapRequestStatus(status: string | null): AuthorityDashboardStatus {
  if (status === "pending") {
    return "pending";
  }

  if (status === "approved") {
    return "approved";
  }

  if (status === "denied") {
    return "denied";
  }

  if (status === "expired") {
    return "expired";
  }

  return "holding";
}

function statusFromEventType(type: SharedAuthorityEventType): AuthorityDashboardStatus {
  if (type === "AUTHORITY_APPROVED") {
    return "approved";
  }

  if (type === "AUTHORITY_DENIED") {
    return "denied";
  }

  return "pending";
}

function eventSummary(type: SharedAuthorityEventType): string {
  if (type === "AUTHORITY_APPROVED") {
    return "Shared authority request approved.";
  }

  if (type === "AUTHORITY_DENIED") {
    return "Shared authority request denied.";
  }

  return "Shared authority request submitted.";
}

function eventAction(type: SharedAuthorityEventType): string {
  if (type === "AUTHORITY_APPROVED") {
    return "AUTHORITY_APPROVED";
  }

  if (type === "AUTHORITY_DENIED") {
    return "AUTHORITY_DENIED";
  }

  return "AUTHORITY_RESOLUTION_REQUESTED";
}

function sourceRefsFromBindingContext(
  request: SharedAuthorityRequest
): AuthorityDashboardSourceRef[] {
  const bindingContext = isRecord(request.binding_context)
    ? request.binding_context
    : null;
  const rawRefs = Array.isArray(bindingContext?.source_refs)
    ? bindingContext.source_refs
    : [];

  return rawRefs
    .map((entry) =>
      typeof entry === "string" && entry.length > 0
        ? sourceRef("dashboard.shared_authority.binding_context", entry, request.request_id)
        : null
    )
    .filter((entry): entry is AuthorityDashboardSourceRef => entry !== null);
}

export function sharedAuthorityRequestToItem(
  request: SharedAuthorityRequest
): AuthorityResolutionItem {
  const status = mapRequestStatus(asString(request.status));
  const requiredDepartment = asString(request.required_authority_department);
  const requiredRole = asString(request.required_authority_role);
  const bindingContext = isRecord(request.binding_context)
    ? request.binding_context
    : null;
  const sourceAbsenceId = asString(request.source_absence_id);
  const sourceGovernanceEvaluation = asString(
    request.source_governance_evaluation
  );
  const refs = uniqueSourceRefs([
    sourceRef(
      "dashboard.shared_authority",
      SHARED_AUTHORITY_REQUESTS_ENDPOINT,
      request.request_id,
      "shared authority endpoint"
    ),
    sourceAbsenceId
      ? sourceRef("dashboard.shared_authority", "source_absence_id", sourceAbsenceId)
      : null,
    sourceGovernanceEvaluation
      ? sourceRef(
          "dashboard.shared_authority",
          "source_governance_evaluation",
          sourceGovernanceEvaluation
        )
      : null,
    ...sourceRefsFromBindingContext(request),
  ].filter((entry): entry is AuthorityDashboardSourceRef => entry !== null));

  return {
    detail: [requiredDepartment, requiredRole].filter(Boolean).join(" / ") || null,
    expiry: asString(request.expiry) ?? asString(request.expires_at),
    item_type: "authority_request",
    public_summary: `Shared authority request ${status}.`,
    request_id: request.request_id,
    required_authority_department: requiredDepartment,
    required_authority_role: requiredRole,
    resolution_type: asString(request.resolution_type),
    restricted_detail: bindingContext
      ? `Shared binding context keys: ${Object.keys(bindingContext)
          .sort()
          .join(", ")}.`
      : null,
    source_absence_id: sourceAbsenceId,
    source_governance_evaluation: sourceGovernanceEvaluation,
    source_refs: refs,
    status,
    title: "Shared authority request",
  };
}

export function sharedAuthorityEventToTimelineRecord(
  event: SharedAuthorityEventPayload
): AuthorityTimelineRecord {
  const request = event.request;
  const resolution = isRecord(event.resolution) ? event.resolution : null;
  const reason = asString(resolution?.reason);
  const resolvedBy = asString(resolution?.resolved_by);
  const action = eventAction(event.type);
  const status = statusFromEventType(event.type);
  const sequence =
    typeof event.sequence === "number" ? String(event.sequence) : "local";

  return {
    action,
    detail: [reason, resolvedBy ? `resolved by ${resolvedBy}` : null]
      .filter(Boolean)
      .join(" - ") || null,
    forensic_refs: [],
    from_status: null,
    occurred_at: null,
    record_id: `shared-authority:${event.request_id}:${action}:${sequence}`,
    request_id: event.request_id,
    restricted_detail: request ? asString(request.restricted_detail) : null,
    source_refs: uniqueSourceRefs([
      sourceRef(
        "dashboard.shared_authority.event",
        SHARED_AUTHORITY_REQUESTS_ENDPOINT,
        event.request_id,
        action
      ),
    ]),
    summary: eventSummary(event.type),
    to_status: status,
  };
}

export function buildSharedAuthorityEventsFromRequests(
  requests: readonly SharedAuthorityRequest[]
): SharedAuthorityEventPayload[] {
  return requests.flatMap((request) => {
    const status = mapRequestStatus(asString(request.status));
    const requested: SharedAuthorityEventPayload = {
      event_payload_only: true,
      request,
      request_id: request.request_id,
      type: "AUTHORITY_RESOLUTION_REQUESTED",
    };

    if (status === "approved") {
      return [
        requested,
        {
          event_payload_only: true,
          request,
          request_id: request.request_id,
          type: "AUTHORITY_APPROVED",
        } satisfies SharedAuthorityEventPayload,
      ];
    }

    if (status === "denied") {
      return [
        requested,
        {
          event_payload_only: true,
          request,
          request_id: request.request_id,
          type: "AUTHORITY_DENIED",
        } satisfies SharedAuthorityEventPayload,
      ];
    }

    return [requested];
  });
}

function countItems(items: readonly AuthorityResolutionItem[]) {
  return items.reduce(
    (counts, item) => ({
      ...counts,
      [item.status]: counts[item.status] + 1,
      total: counts.total + 1,
    }),
    {
      approved: 0,
      denied: 0,
      expired: 0,
      holding: 0,
      pending: 0,
      total: 0,
      unavailable: 0,
      empty: 0,
    } satisfies Record<AuthorityDashboardStatus | "total", number>
  );
}

function statusFromItems(
  base: AuthorityDashboardStateV1,
  items: readonly AuthorityResolutionItem[]
): AuthorityDashboardStatus {
  if (items.length === 0) {
    return base.status;
  }

  if (base.advisories.some((advisory) => advisory.severity === "HOLD")) {
    return "holding";
  }

  if (items.some((item) => item.status === "pending")) {
    return "pending";
  }

  if (items.some((item) => item.status === "holding")) {
    return "holding";
  }

  if (items.some((item) => item.status === "denied")) {
    return "denied";
  }

  if (items.some((item) => item.status === "expired")) {
    return "expired";
  }

  return "approved";
}

export function createSharedAuthorityAdvisory(
  shared: SharedAuthorityDisplayInput
): AuthorityDashboardAdvisory | null {
  if (!shared.hold) {
    return null;
  }

  return {
    code: shared.hold.code,
    message: shared.hold.message,
    severity: "HOLD",
    source_ref: shared.hold.source_ref,
  };
}

export function buildSharedAuthorityDisplayState(
  base: AuthorityDashboardStateV1,
  shared: SharedAuthorityDisplayInput
): SharedAuthorityDisplayView {
  const advisory = createSharedAuthorityAdvisory(shared);
  const sharedRequestItems =
    shared.endpointStatus === "unavailable"
      ? []
      : shared.requests.map(sharedAuthorityRequestToItem);
  const mergedRequests = uniqueRequests([...base.requests, ...sharedRequestItems]);
  const sharedTimelineRecords =
    shared.endpointStatus === "unavailable"
      ? []
      : uniqueRecords([
          ...shared.events.map(sharedAuthorityEventToTimelineRecord),
          ...buildSharedAuthorityEventsFromRequests(shared.requests).map(
            sharedAuthorityEventToTimelineRecord
          ),
        ]);
  const mergedTimeline = sortAuthorityTimelineRecords(
    uniqueRecords([...base.timeline.records, ...sharedTimelineRecords])
  );
  const counts = countItems(mergedRequests);
  const sourceRefs = uniqueSourceRefs([
    ...base.source_refs,
    ...mergedRequests.flatMap((request) => request.source_refs),
    ...mergedTimeline.flatMap((record) => record.source_refs),
  ]);

  return {
    advisory,
    endpointStatus: shared.endpointStatus,
    endpointStatusLabel: shared.endpointStatus,
    state: {
      ...base,
      contract: AUTHORITY_DASHBOARD_STATE_CONTRACT,
      counts: {
        approved: counts.approved,
        denied: counts.denied,
        expired: counts.expired,
        holding: counts.holding,
        pending: counts.pending,
        total: counts.total,
      },
      requests: mergedRequests,
      source_refs: sourceRefs,
      status: statusFromItems(base, mergedRequests),
      timeline: {
        contract: AUTHORITY_TIMELINE_VIEW_CONTRACT,
        records: mergedTimeline,
      },
    },
  };
}

export function getSharedAuthorityPermissions(
  roleSession: DashboardRoleSessionProofV1
): SharedAuthorityPermissions {
  if (roleSession.auth_status !== "authenticated") {
    return {
      canResolve: false,
      canReview: roleSession.role !== "public",
      canSubmit: false,
      reason: "Shared authority actions require an authenticated dashboard-local eval role.",
    };
  }

  if (roleSession.role === "permitting_staff") {
    return {
      canResolve: false,
      canReview: true,
      canSubmit: true,
      reason: "Mapped field inspector role may submit dashboard-local shared requests.",
    };
  }

  if (roleSession.role === "public_works_director") {
    return {
      canResolve: true,
      canReview: true,
      canSubmit: false,
      reason: "Mapped director or operations lead role may approve or deny dashboard-local shared requests.",
    };
  }

  if (roleSession.role === "council_member") {
    return {
      canResolve: false,
      canReview: true,
      canSubmit: false,
      reason: "Council role is review-only for AUTH-3 shared authority requests.",
    };
  }

  return {
    canResolve: false,
    canReview: roleSession.role !== "public",
    canSubmit: false,
    reason: "Current dashboard-local role is not an AUTH-3 shared authority actor.",
  };
}

function safeIdFragment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildSharedAuthorityRequestDraft(
  state: AuthorityDashboardStateV1
): SharedAuthorityRequest {
  const roleSession = state.role_session;
  const sourceRequest = state.requests[0] ?? null;
  const subject = safeIdFragment(
    roleSession.subject_ref ?? roleSession.display_name ?? roleSession.role
  );
  const requestNumber = state.counts.total + 1;

  return {
    binding_context: {
      demo_day_shared_authority: true,
      role_session_contract: roleSession.contract,
      source_refs: [
        "dashboard.authority.shared_endpoint",
        ...(sourceRequest?.source_refs.map((ref) => ref.path) ?? []),
      ],
      source_role: roleSession.role,
    },
    contract: AUTHORITY_RESOLUTION_REQUEST_CONTRACT,
    request_id: `ARR-SHARED-${subject || "role"}-${requestNumber}`,
    required_authority_department:
      roleSession.department ??
      sourceRequest?.required_authority_department ??
      "public_works",
    required_authority_role: "public_works_director",
    resolution_type: "approval",
    source_absence_id:
      sourceRequest?.source_absence_id ?? "dashboard-shared-authority",
    source_governance_evaluation:
      sourceRequest?.source_governance_evaluation ?? "dashboard-shared-authority",
    status: "pending",
  };
}
