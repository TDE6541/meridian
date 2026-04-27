import type { DashboardLiveProjectionV1, LiveFeedEventV1 } from "../live/liveTypes.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { ScenarioObject } from "../types/scenario.ts";
import {
  AUTHORITY_DASHBOARD_STATE_CONTRACT,
  AUTHORITY_TIMELINE_VIEW_CONTRACT,
  type AuthorityDashboardAdvisory,
  type AuthorityDashboardRedactionMode,
  type AuthorityDashboardSourceRef,
  type AuthorityDashboardStateV1,
  type AuthorityDashboardStatus,
  type AuthorityNotificationActionPreview,
  type AuthorityNotificationPreview,
  type AuthorityResolutionItem,
  type AuthorityTimelineRecord,
} from "./authorityDashboardTypes.ts";
import { sortAuthorityTimelineRecords } from "./authorityTimeline.ts";

export interface BuildAuthorityDashboardStateInput {
  currentStep: ControlRoomTimelineStep | null;
  liveProjection: DashboardLiveProjectionV1 | null;
  roleSession: DashboardRoleSessionProofV1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
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

function getRedactionMode(
  roleSession: DashboardRoleSessionProofV1
): AuthorityDashboardRedactionMode {
  if (roleSession.role === "judge_demo_operator") {
    return "judge_demo";
  }

  return roleSession.role === "public" ? "public" : "internal";
}

function createAdvisory(
  code: string,
  message: string,
  sourceRef: string,
  severity: AuthorityDashboardAdvisory["severity"] = "HOLD"
): AuthorityDashboardAdvisory {
  return {
    code,
    message,
    severity,
    source_ref: sourceRef,
  };
}

function mapRequestStatus(status: string | null): AuthorityDashboardStatus | null {
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
  if (status === "HOLD" || status === "holding" || status === "error") {
    return "holding";
  }

  return null;
}

function mapDecisionStatus(decision: string | null): AuthorityDashboardStatus {
  if (decision === "ALLOW" || decision === "SUPERVISE" || decision === "approved") {
    return "approved";
  }
  if (decision === "DENY" || decision === "BLOCK" || decision === "REVOKE" || decision === "denied") {
    return "denied";
  }
  if (decision === "expired") {
    return "expired";
  }
  if (decision === "HOLD") {
    return "holding";
  }

  return "holding";
}

function statusFromItems(
  items: readonly AuthorityResolutionItem[],
  advisories: readonly AuthorityDashboardAdvisory[],
  hasAnyInput: boolean
): AuthorityDashboardStatus {
  if (!hasAnyInput) {
    return "unavailable";
  }

  if (advisories.some((advisory) => advisory.severity === "HOLD")) {
    return "holding";
  }

  if (items.length === 0) {
    return "empty";
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

function getRuntimeAuthorityResolution(
  currentStep: ControlRoomTimelineStep
): Record<string, unknown> | null {
  const runtimeResolution =
    currentStep.step.governance?.result?.runtimeSubset?.civic?.authority_resolution;

  if (isRecord(runtimeResolution)) {
    return runtimeResolution;
  }

  return asRecord(currentStep.step.authority?.resolution);
}

function getRuntimeRevocation(
  currentStep: ControlRoomTimelineStep
): Record<string, unknown> | null {
  const runtimeRevocation = currentStep.step.governance?.result?.runtimeSubset?.civic?.revocation;

  if (isRecord(runtimeRevocation)) {
    return runtimeRevocation;
  }

  return asRecord(currentStep.step.authority?.revocation);
}

function getNestedString(record: Record<string, unknown> | null, key: string): string | null {
  return record ? asString(record[key]) : null;
}

function buildSnapshotResolutionItem(
  currentStep: ControlRoomTimelineStep
): AuthorityResolutionItem | null {
  const resolution = getRuntimeAuthorityResolution(currentStep);
  const decision = asString(resolution?.decision);
  const active = resolution?.active === true;

  if (!resolution || (!active && !decision)) {
    return null;
  }

  const actor = asRecord(resolution.actor);
  const actorTrace = asRecord(actor?.decision_trace);
  const domain = asRecord(resolution.domain);
  const jurisdiction = asRecord(domain?.jurisdiction);
  const requiredRole =
    asString(domain?.requested_role_id) ?? asString(actorTrace?.target_id);
  const reason =
    asString(currentStep.step.authority?.reason) ??
    asString(resolution.reason) ??
    "authority resolution present";
  const status = mapDecisionStatus(decision);
  const refs = uniqueSourceRefs([
    sourceRef("snapshot.step", "step.authority.resolution", currentStep.stepId),
    sourceRef(
      "runtimeSubset.civic",
      "step.governance.result.runtimeSubset.civic.authority_resolution",
      currentStep.stepId
    ),
  ]);

  return {
    detail: `${decision ?? "decision unavailable"} - ${reason}`,
    expiry: null,
    item_type: "snapshot_resolution",
    public_summary: status === "holding"
      ? "Authority resolution is held in the selected dashboard input."
      : "Authority resolution is present in the selected dashboard input.",
    request_id: `${currentStep.stepId}:snapshot-authority-resolution`,
    required_authority_department: getNestedString(jurisdiction, "jurisdiction_id"),
    required_authority_role: requiredRole,
    resolution_type: asString(domain?.domain_id) ?? asString(actor?.lane),
    restricted_detail: actorTrace
      ? `Actor trace path count ${String(actorTrace.path_count ?? "unavailable")}.`
      : null,
    source_absence_id: null,
    source_governance_evaluation: currentStep.stepId,
    source_refs: refs,
    status,
    title: "Snapshot authority resolution",
  };
}

function buildSnapshotRevocationItem(
  currentStep: ControlRoomTimelineStep
): AuthorityResolutionItem | null {
  const revocation = getRuntimeRevocation(currentStep);
  const active = revocation?.active === true;
  const decision = asString(revocation?.decision);

  if (!revocation || (!active && decision !== "REVOKE")) {
    return null;
  }

  const reason = asString(revocation.reason) ?? "authority revocation present";
  const refs = uniqueSourceRefs([
    sourceRef("snapshot.step", "step.authority.revocation", currentStep.stepId),
    sourceRef(
      "runtimeSubset.civic",
      "step.governance.result.runtimeSubset.civic.revocation",
      currentStep.stepId
    ),
  ]);

  return {
    detail: asString(revocation.rationale) ?? reason,
    expiry: null,
    item_type: "revocation",
    public_summary: "Authority revocation is present in the selected dashboard input.",
    request_id: `${currentStep.stepId}:snapshot-authority-revocation`,
    required_authority_department: null,
    required_authority_role: null,
    resolution_type: "revocation",
    restricted_detail: `Checked chain depth ${String(revocation.checked_chain_depth ?? "unavailable")}.`,
    source_absence_id: null,
    source_governance_evaluation: currentStep.stepId,
    source_refs: refs,
    status: "denied",
    title: "Authority revocation",
  };
}

function requestFromRecord(
  record: Record<string, unknown>,
  sourcePath: string
): AuthorityResolutionItem | null {
  const requestId = asString(record.request_id);
  const status = mapRequestStatus(asString(record.status));
  const requiredRole = asString(record.required_authority_role);
  const requiredDepartment = asString(record.required_authority_department);

  if (!requestId || !status || !requiredRole || !requiredDepartment) {
    return null;
  }

  const sourceAbsenceId = asString(record.source_absence_id);
  const sourceGovernanceEvaluation = asString(record.source_governance_evaluation);
  const bindingContext = asRecord(record.binding_context);
  const bindingSourceRefs = asStringArray(bindingContext?.source_refs).map((entry) =>
    sourceRef("authority.binding_context", entry, requestId)
  );
  const refs = uniqueSourceRefs([
    sourceRef("authority.request", sourcePath, requestId),
    sourceAbsenceId
      ? sourceRef("authority.request", "source_absence_id", sourceAbsenceId)
      : null,
    sourceGovernanceEvaluation
      ? sourceRef(
          "authority.request",
          "source_governance_evaluation",
          sourceGovernanceEvaluation
        )
      : null,
    ...bindingSourceRefs,
  ].filter((entry): entry is AuthorityDashboardSourceRef => entry !== null));

  return {
    detail: `${requiredDepartment} / ${requiredRole}`,
    expiry: asString(record.expiry),
    item_type: "authority_request",
    public_summary: `Authority request ${status}.`,
    request_id: requestId,
    required_authority_department: requiredDepartment,
    required_authority_role: requiredRole,
    resolution_type: asString(record.resolution_type),
    restricted_detail: bindingContext
      ? `Binding context keys: ${Object.keys(bindingContext).sort().join(", ")}.`
      : null,
    source_absence_id: sourceAbsenceId,
    source_governance_evaluation: sourceGovernanceEvaluation,
    source_refs: refs,
    status,
    title: "Authority request",
  };
}

function collectRequestCandidates(
  value: unknown,
  sourcePath: string
): AuthorityResolutionItem[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const direct = requestFromRecord(record, sourcePath);
  if (direct) {
    return [direct];
  }

  return [
    ...asRecordArray(record.generated_requests).flatMap((entry, index) =>
      collectRequestCandidates(entry, `${sourcePath}.generated_requests[${index}]`)
    ),
    ...asRecordArray(record.requests).flatMap((entry, index) =>
      collectRequestCandidates(entry, `${sourcePath}.requests[${index}]`)
    ),
    ...asRecordArray(record.existing_requests).flatMap((entry, index) =>
      collectRequestCandidates(entry, `${sourcePath}.existing_requests[${index}]`)
    ),
    ...collectRequestCandidates(record.request, `${sourcePath}.request`),
  ];
}

function eventSourceRefs(event: LiveFeedEventV1): AuthorityDashboardSourceRef[] {
  return uniqueSourceRefs([
    sourceRef("live.event", `projection.events.${event.event_id}`, event.event_id),
    event.refs.authority_ref
      ? sourceRef("live.event", "refs.authority_ref", event.refs.authority_ref)
      : null,
    event.refs.governance_ref
      ? sourceRef("live.event", "refs.governance_ref", event.refs.governance_ref)
      : null,
    ...event.refs.absence_refs.map((ref) =>
      sourceRef("live.event", "refs.absence_refs", ref)
    ),
    ...event.refs.forensic_refs.map((ref) =>
      sourceRef("live.event", "refs.forensic_refs", ref)
    ),
  ].filter((entry): entry is AuthorityDashboardSourceRef => entry !== null));
}

function buildLiveEventItems(
  liveProjection: DashboardLiveProjectionV1 | null
): AuthorityResolutionItem[] {
  if (!liveProjection) {
    return [];
  }

  return liveProjection.events
    .filter((event) => event.kind === "authority.evaluated")
    .map((event) => {
      const authorityRef = event.refs.authority_ref ?? event.event_id;
      return {
        detail: event.summary,
        expiry: null,
        item_type: "live_authority_event",
        public_summary: event.visibility === "public_safe"
          ? event.summary
          : "Authority event is present in local dashboard projection.",
        request_id: authorityRef,
        required_authority_department: null,
        required_authority_role: null,
        resolution_type: "authority.evaluated",
        restricted_detail: event.visibility === "restricted" ? event.summary : null,
        source_absence_id: event.refs.absence_refs[0] ?? null,
        source_governance_evaluation: event.refs.governance_ref,
        source_refs: eventSourceRefs(event),
        status: mapDecisionStatus(event.severity === "HOLD" ? "HOLD" : "ALLOW"),
        title: event.title,
      } satisfies AuthorityResolutionItem;
    });
}

function lifecycleFromRecord(
  record: Record<string, unknown>,
  sourcePath: string
): AuthorityTimelineRecord | null {
  const action = asString(record.label) ?? asString(record.action) ?? asString(record.kind);
  const requestId = asString(record.request_id);
  const occurredAt =
    asString(record.occurred_at) ??
    asString(record.approved_at) ??
    asString(record.denied_at) ??
    asString(record.expired_at) ??
    asString(record.built_at);

  if (!action && !requestId && !occurredAt) {
    return null;
  }

  const fromStatus = asString(record.from_status);
  const toStatus = asString(record.to_status);
  const reason = asString(record.reason);
  const tokenHash = asString(record.token_hash);
  const forensicRefs = [
    ...asStringArray(record.forensic_refs),
    asString(record.forensic_receipt_id),
  ].filter((entry): entry is string => entry !== null);

  return {
    action: action ?? "lifecycle_record",
    detail: reason,
    forensic_refs: forensicRefs,
    from_status: fromStatus,
    occurred_at: occurredAt,
    record_id: `${requestId ?? sourcePath}:${action ?? "record"}:${occurredAt ?? "undated"}`,
    request_id: requestId,
    restricted_detail: tokenHash ? `token_hash=${tokenHash}` : null,
    source_refs: uniqueSourceRefs([
      sourceRef("authority.lifecycle", sourcePath, requestId),
      ...forensicRefs.map((ref) =>
        sourceRef("authority.lifecycle", "forensic_refs", ref)
      ),
    ]),
    summary: [action, toStatus ? `to ${toStatus}` : null, reason].filter(Boolean).join(" - "),
    to_status: toStatus,
  };
}

function collectLifecycleRecords(
  value: unknown,
  sourcePath: string
): AuthorityTimelineRecord[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const direct = lifecycleFromRecord(record, sourcePath);
  const nested = [
    ...asRecordArray(record.lifecycle_records).flatMap((entry, index) =>
      collectLifecycleRecords(entry, `${sourcePath}.lifecycle_records[${index}]`)
    ),
    ...asRecordArray(record.lifecycle).flatMap((entry, index) =>
      collectLifecycleRecords(entry, `${sourcePath}.lifecycle[${index}]`)
    ),
    ...asRecordArray(record.history).flatMap((entry, index) =>
      collectLifecycleRecords(entry, `${sourcePath}.history[${index}]`)
    ),
    ...collectLifecycleRecords(record.lifecycle_record, `${sourcePath}.lifecycle_record`),
    ...collectLifecycleRecords(record.denial_record, `${sourcePath}.denial_record`),
  ];

  return [...(direct ? [direct] : []), ...nested];
}

function readTokenHashes(value: unknown): Record<string, string> {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function notificationFromRecord(
  record: Record<string, unknown>,
  sourcePath: string,
  redactionMode: AuthorityDashboardRedactionMode
): AuthorityNotificationPreview | null {
  const notification = asRecord(record.notification) ??
    asRecord(record.notification_payload) ??
    asRecord(record.authority_notification) ??
    (record.kind === "authority_resolution_request_notification" ? record : null);

  if (!notification) {
    return null;
  }

  const channels = asRecordArray(notification.channels);
  const simulatedChannel =
    channels.find((entry) => asString(entry.channel) === "simulated_device") ??
    channels[0] ??
    null;
  const payload =
    asRecord(simulatedChannel?.payload) ??
    asRecord(notification.payload) ??
    notification;
  const actions = asRecordArray(payload?.actions).map((action) => {
    const rawToken = asString(action.response_token);
    const rawUrl = asString(action.response_url) ?? asString(action.url);
    const canShowRaw = redactionMode !== "public";

    return {
      action: asString(action.action) ?? asString(action.label) ?? "action",
      response_token: canShowRaw ? rawToken : null,
      response_url: canShowRaw ? rawUrl : null,
    } satisfies AuthorityNotificationActionPreview;
  });
  const evidence = asRecord(notification.evidence);
  const storage = asRecord(notification.storage);
  const tokenHashes = {
    ...readTokenHashes(evidence?.action_token_hashes),
    ...readTokenHashes(storage?.action_token_hashes),
    ...Object.fromEntries(
      asStringArray(notification.token_hashes).map((hash, index) => [
        `token_hash_${index + 1}`,
        hash,
      ])
    ),
  };
  const request = asRecord(notification.request);
  const requestId = asString(request?.request_id) ?? asString(notification.request_id);

  return {
    actions,
    advisory: null,
    body: asString(payload?.body),
    built_at: asString(notification.built_at),
    channel: asString(simulatedChannel?.channel),
    payload: redactionMode === "public" ? null : payload,
    request_id: requestId,
    source_refs: uniqueSourceRefs([
      sourceRef("authority.notification", sourcePath, requestId),
    ]),
    status: "ready",
    title: asString(payload?.title),
    token_hashes: redactionMode === "public" ? {} : tokenHashes,
  };
}

function collectNotificationPreview(
  values: readonly { path: string; value: unknown }[],
  redactionMode: AuthorityDashboardRedactionMode
): AuthorityNotificationPreview {
  for (const entry of values) {
    const record = asRecord(entry.value);
    if (!record) {
      continue;
    }

    const preview = notificationFromRecord(record, entry.path, redactionMode);
    if (preview) {
      return preview;
    }
  }

  return {
    actions: [],
    advisory: createAdvisory(
      "authority_notification_payload_unavailable",
      "HOLD: No explicit simulated authority-device payload is present in the selected dashboard inputs.",
      "dashboard.authority.notification",
      "INFO"
    ),
    body: null,
    built_at: null,
    channel: null,
    payload: null,
    request_id: null,
    source_refs: [],
    status: "empty",
    title: null,
    token_hashes: {},
  };
}

function hasAuthorityLikeInput(value: unknown): boolean {
  const record = asRecord(value);
  if (!record) {
    return false;
  }

  return [
    "authority_ref",
    "authority_resolution",
    "generated_requests",
    "request",
    "requests",
    "status",
    "decision",
  ].some((key) => Object.prototype.hasOwnProperty.call(record, key));
}

export function buildAuthorityDashboardState({
  currentStep,
  liveProjection,
  roleSession,
}: BuildAuthorityDashboardStateInput): AuthorityDashboardStateV1 {
  const redactionMode = getRedactionMode(roleSession);
  const latestAuthority = liveProjection?.latest.authority ?? null;
  const authorityInputValues = [
    { path: "projection.latest.authority", value: latestAuthority },
    { path: "step.authority", value: currentStep?.step.authority },
  ];
  const snapshotItems = currentStep
    ? [buildSnapshotResolutionItem(currentStep), buildSnapshotRevocationItem(currentStep)]
        .filter((entry): entry is AuthorityResolutionItem => entry !== null)
    : [];
  const explicitRequestItems = authorityInputValues.flatMap((entry) =>
    collectRequestCandidates(entry.value, entry.path)
  );
  const liveEventItems = buildLiveEventItems(liveProjection);
  const requests = [...snapshotItems, ...explicitRequestItems, ...liveEventItems];
  const advisories: AuthorityDashboardAdvisory[] = [];

  if (!currentStep && !liveProjection) {
    advisories.push(
      createAdvisory(
        "authority_inputs_unavailable",
        "HOLD: no snapshot step or live projection is available for dashboard-local authority state.",
        "dashboard.authority.inputs"
      )
    );
  }

  if (
    latestAuthority &&
    hasAuthorityLikeInput(latestAuthority) &&
    collectRequestCandidates(latestAuthority, "projection.latest.authority").length === 0 &&
    liveEventItems.length === 0 &&
    !asString(asRecord(latestAuthority)?.decision)
  ) {
    advisories.push(
      createAdvisory(
        "authority_payload_ambiguous",
        "HOLD: authority payload is present but does not expose a dashboard-safe request, decision, or lifecycle shape.",
        "projection.latest.authority"
      )
    );
  }

  const lifecycleRecords = sortAuthorityTimelineRecords([
    ...authorityInputValues.flatMap((entry) =>
      collectLifecycleRecords(entry.value, entry.path)
    ),
    ...liveEventItems.map((item) => ({
      action: "authority.evaluated",
      detail: item.detail,
      forensic_refs: item.source_refs
        .filter((ref) => ref.path === "refs.forensic_refs" && ref.evidence_id)
        .map((ref) => ref.evidence_id as string),
      from_status: null,
      occurred_at: null,
      record_id: `${item.request_id}:authority.evaluated`,
      request_id: item.request_id,
      restricted_detail: item.restricted_detail,
      source_refs: item.source_refs,
      summary: item.public_summary,
      to_status: item.status,
    })),
  ]);
  const counts = countItems(requests);
  const hasAnyInput = currentStep !== null || liveProjection !== null;
  const notificationPreview = collectNotificationPreview(
    authorityInputValues,
    redactionMode
  );
  const sourceRefs = uniqueSourceRefs([
    ...requests.flatMap((item) => item.source_refs),
    ...lifecycleRecords.flatMap((record) => record.source_refs),
    ...notificationPreview.source_refs,
  ]);

  return {
    advisories,
    contract: AUTHORITY_DASHBOARD_STATE_CONTRACT,
    counts: {
      approved: counts.approved,
      denied: counts.denied,
      expired: counts.expired,
      holding: counts.holding,
      pending: counts.pending,
      total: counts.total,
    },
    notification_preview: notificationPreview,
    public_boundary: {
      mode: redactionMode,
      role: roleSession.role,
    },
    redaction_mode: redactionMode,
    requests,
    role_session: roleSession,
    source_refs: sourceRefs,
    status: statusFromItems(requests, advisories, hasAnyInput),
    timeline: {
      contract: AUTHORITY_TIMELINE_VIEW_CONTRACT,
      records: lifecycleRecords,
    },
  };
}

export function readSnapshotAuthorityDecision(
  stepAuthority: ScenarioObject | undefined
): string | null {
  return asString(asRecord(stepAuthority?.resolution)?.decision);
}
