import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import {
  GARP_HANDOFF_CONTEXT_CONTRACT,
  type AuthorityDashboardSourceRef,
  type AuthorityDashboardStateV1,
  type DisclosurePreviewReportV1,
  type GarpHandoffContextV1,
  type GarpHandoffExplicitDemoDetail,
  type GarpHandoffLifecycleRef,
  type GarpHandoffRequestRef,
} from "./authorityDashboardTypes.ts";

export interface BuildGarpHandoffContextInput {
  activeSkin?: DashboardRoleSessionProofV1["active_skin"] | null;
  authorityState: AuthorityDashboardStateV1;
  disclosurePreviewReport?: DisclosurePreviewReportV1 | null;
}

function definedString(value: string | null | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    if (seen.has(value)) {
      return;
    }

    seen.add(value);
    next.push(value);
  });

  return next;
}

function sourceRefLabel(ref: AuthorityDashboardSourceRef): string {
  return [ref.source_kind, ref.path, ref.evidence_id].filter(Boolean).join(":");
}

function hasRestrictedDetail(state: AuthorityDashboardStateV1): boolean {
  return (
    state.requests.some((request) => Boolean(request.restricted_detail)) ||
    state.timeline.records.some((record) => Boolean(record.restricted_detail))
  );
}

function buildRoleSessionSummary(
  roleSession: DashboardRoleSessionProofV1,
  canSeeRestricted: boolean
): GarpHandoffContextV1["role_session"] {
  return {
    active_skin: roleSession.active_skin,
    allowed_skins: roleSession.allowed_skins,
    auth_status: roleSession.auth_status,
    contract: roleSession.contract,
    ...(canSeeRestricted && roleSession.department ? { department: roleSession.department } : {}),
    ...(canSeeRestricted && roleSession.display_name ? { display_name: roleSession.display_name } : {}),
    holds: roleSession.holds.map((hold) => hold.message),
    role: roleSession.role,
    source: roleSession.source,
    ...(canSeeRestricted && roleSession.subject_ref ? { subject_ref: roleSession.subject_ref } : {}),
  };
}

function buildRequestRefs(
  state: AuthorityDashboardStateV1
): GarpHandoffRequestRef[] {
  const canSeeDetail = state.redaction_mode !== "public";
  const canSeeRestricted = state.redaction_mode === "judge_demo";

  return state.requests.map((request) => ({
    ...(canSeeDetail ? { detail: definedString(request.detail) } : {}),
    item_type: request.item_type,
    public_summary: request.public_summary,
    request_id: request.request_id,
    ...(canSeeRestricted ? { restricted_detail: definedString(request.restricted_detail) } : {}),
    source_refs: request.source_refs,
    status: request.status,
  }));
}

function buildLifecycleRefs(
  state: AuthorityDashboardStateV1
): GarpHandoffLifecycleRef[] {
  const canSeeDetail = state.redaction_mode !== "public";
  const canSeeRestricted = state.redaction_mode === "judge_demo";

  return state.timeline.records.map((record) => ({
    action: record.action,
    ...(canSeeDetail ? { detail: definedString(record.detail) } : {}),
    forensic_refs: record.forensic_refs,
    ...(record.occurred_at ? { occurred_at: record.occurred_at } : {}),
    record_id: record.record_id,
    ...(record.request_id ? { request_id: record.request_id } : {}),
    ...(canSeeRestricted ? { restricted_detail: definedString(record.restricted_detail) } : {}),
    source_refs: record.source_refs,
    summary: record.summary,
    ...(record.to_status ? { to_status: record.to_status } : {}),
  }));
}

function buildExplicitDemoDetails(
  state: AuthorityDashboardStateV1
): GarpHandoffExplicitDemoDetail[] {
  if (state.redaction_mode !== "judge_demo") {
    return [];
  }

  return [
    ...state.requests.flatMap((request) =>
      [request.detail, request.restricted_detail]
        .filter((detail): detail is string => Boolean(definedString(detail)))
        .map((detail) => ({
          detail,
          detail_kind: "request" as const,
          source_ref: request.source_refs[0] ? sourceRefLabel(request.source_refs[0]) : request.request_id,
        }))
    ),
    ...state.timeline.records.flatMap((record) =>
      [record.detail, record.restricted_detail]
        .filter((detail): detail is string => Boolean(definedString(detail)))
        .map((detail) => ({
          detail,
          detail_kind: "lifecycle" as const,
          source_ref: record.source_refs[0] ? sourceRefLabel(record.source_refs[0]) : record.record_id,
        }))
    ),
  ];
}

export function buildGarpHandoffContext({
  activeSkin = null,
  authorityState,
  disclosurePreviewReport = null,
}: BuildGarpHandoffContextInput): GarpHandoffContextV1 {
  const canSeeRestricted = authorityState.redaction_mode === "judge_demo";
  const restrictedDetailAvailable =
    authorityState.redaction_mode !== "public" && hasRestrictedDetail(authorityState);
  const unresolvedHolds = uniqueStrings([
    ...authorityState.advisories
      .filter((advisory) => advisory.severity === "HOLD")
      .map((advisory) => advisory.message),
    ...authorityState.role_session.holds.map((hold) => hold.message),
    ...(disclosurePreviewReport
      ? disclosurePreviewReport.unresolved_holds
      : ["HOLD: disclosure preview report unavailable for GARP handoff context."]),
  ]);

  return {
    advisories: authorityState.advisories,
    authority_request_refs: buildRequestRefs(authorityState),
    authority_status: authorityState.status,
    contract: GARP_HANDOFF_CONTEXT_CONTRACT,
    counts: {
      approved: authorityState.counts.approved,
      denied: authorityState.counts.denied,
      expired: authorityState.counts.expired,
      holding: authorityState.counts.holding,
      pending: authorityState.counts.pending,
    },
    disclosure_preview_refs: disclosurePreviewReport?.source_refs ?? [],
    explicit_demo_details: buildExplicitDemoDetails(authorityState),
    foreman_gate_reason:
      "Actual Foreman behavior is deferred until the concept/prototype gate is resolved.",
    foreman_ready: false,
    lifecycle_refs: buildLifecycleRefs(authorityState),
    public_boundary: {
      active_skin: activeSkin ?? authorityState.role_session.active_skin,
      public_safe: authorityState.redaction_mode === "public",
      redaction_mode: authorityState.redaction_mode,
      restricted_detail_available: restrictedDetailAvailable,
      role: authorityState.role_session.role,
    },
    role_session: buildRoleSessionSummary(authorityState.role_session, canSeeRestricted),
    source_refs: authorityState.source_refs,
    unresolved_holds: unresolvedHolds,
  };
}
