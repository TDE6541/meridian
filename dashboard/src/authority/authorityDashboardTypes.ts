import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";

export const AUTHORITY_DASHBOARD_STATE_CONTRACT =
  "meridian.v2.authorityDashboardState.v1" as const;

export const AUTHORITY_TIMELINE_VIEW_CONTRACT =
  "meridian.v2.authorityTimelineView.v1" as const;

export const DISCLOSURE_PREVIEW_REPORT_CONTRACT =
  "meridian.v2.disclosurePreviewReport.v1" as const;

export const GARP_HANDOFF_CONTEXT_CONTRACT =
  "meridian.v2.garpHandoffContext.v1" as const;

export const DISCLOSURE_PREVIEW_ACTION_BUNDLE_CONTRACT =
  "meridian.v2.disclosurePreviewActionBundle.v1" as const;

export const DISCLOSURE_PREVIEW_DEMO_DISCLAIMER =
  "Demo disclosure preview only. Not legal advice, not a TPIA determination, and not an official Fort Worth disclosure workflow." as const;

export type AuthorityDashboardStatus =
  | "unavailable"
  | "empty"
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "holding";

export type AuthorityDashboardRedactionMode = "public" | "internal" | "judge_demo";

export interface AuthorityDashboardSourceRef {
  evidence_id?: string | null;
  label?: string;
  path: string;
  source_kind: string;
}

export interface DisclosurePreviewSourceRef {
  id: string;
  label: string;
}

export interface AuthorityDashboardAdvisory {
  code: string;
  message: string;
  source_ref: string;
  severity: "HOLD" | "INFO" | "WATCH";
}

export interface AuthorityDashboardCounts {
  approved: number;
  denied: number;
  expired: number;
  holding: number;
  pending: number;
  total: number;
}

export type AuthorityResolutionItemType =
  | "authority_request"
  | "snapshot_resolution"
  | "live_authority_event"
  | "revocation";

export interface AuthorityResolutionItem {
  detail: string | null;
  expiry: string | null;
  item_type: AuthorityResolutionItemType;
  public_summary: string;
  request_id: string;
  required_authority_department: string | null;
  required_authority_role: string | null;
  resolution_type: string | null;
  restricted_detail: string | null;
  source_absence_id: string | null;
  source_governance_evaluation: string | null;
  source_refs: readonly AuthorityDashboardSourceRef[];
  status: AuthorityDashboardStatus;
  title: string;
}

export interface AuthorityTimelineRecord {
  action: string;
  detail: string | null;
  forensic_refs: readonly string[];
  from_status: string | null;
  occurred_at: string | null;
  record_id: string;
  request_id: string | null;
  restricted_detail: string | null;
  source_refs: readonly AuthorityDashboardSourceRef[];
  summary: string;
  to_status: string | null;
}

export interface AuthorityNotificationActionPreview {
  action: string;
  response_token: string | null;
  response_url: string | null;
}

export interface AuthorityNotificationPreview {
  actions: readonly AuthorityNotificationActionPreview[];
  advisory: AuthorityDashboardAdvisory | null;
  body: string | null;
  built_at: string | null;
  channel: string | null;
  payload: Record<string, unknown> | null;
  request_id: string | null;
  source_refs: readonly AuthorityDashboardSourceRef[];
  status: "empty" | "holding" | "ready";
  title: string | null;
  token_hashes: Record<string, string>;
}

export interface AuthorityDashboardStateV1 {
  advisories: readonly AuthorityDashboardAdvisory[];
  contract: typeof AUTHORITY_DASHBOARD_STATE_CONTRACT;
  counts: AuthorityDashboardCounts;
  notification_preview: AuthorityNotificationPreview;
  public_boundary: {
    mode: AuthorityDashboardRedactionMode;
    role: DashboardRoleSessionProofV1["role"];
  };
  redaction_mode: AuthorityDashboardRedactionMode;
  requests: readonly AuthorityResolutionItem[];
  role_session: DashboardRoleSessionProofV1;
  source_refs: readonly AuthorityDashboardSourceRef[];
  status: AuthorityDashboardStatus;
  timeline: {
    contract: typeof AUTHORITY_TIMELINE_VIEW_CONTRACT;
    records: readonly AuthorityTimelineRecord[];
  };
}

export interface DisclosurePreviewReportV1 {
  contract: typeof DISCLOSURE_PREVIEW_REPORT_CONTRACT;
  disclaimer: typeof DISCLOSURE_PREVIEW_DEMO_DISCLAIMER;
  generated_at: string | null;
  public_safe_summary: string;
  redaction_summary: readonly string[];
  restricted_fields_excluded: readonly string[];
  scenario_label: string | null;
  session_label: string | null;
  source_refs: readonly DisclosurePreviewSourceRef[];
  status: "holding" | "ready";
  unresolved_holds: readonly string[];
  visible_facts: readonly string[];
}

export interface GarpHandoffCounts {
  approved: number;
  denied: number;
  expired: number;
  holding: number;
  pending: number;
}

export interface GarpHandoffPublicBoundary {
  active_skin: DashboardRoleSessionProofV1["active_skin"];
  public_safe: boolean;
  redaction_mode: AuthorityDashboardRedactionMode;
  restricted_detail_available: boolean;
  role: DashboardRoleSessionProofV1["role"];
}

export interface GarpHandoffRoleSessionSummary {
  active_skin: DashboardRoleSessionProofV1["active_skin"];
  allowed_skins: readonly DashboardRoleSessionProofV1["active_skin"][];
  auth_status: DashboardRoleSessionProofV1["auth_status"];
  contract: DashboardRoleSessionProofV1["contract"];
  department?: string;
  display_name?: string;
  holds: readonly string[];
  role: DashboardRoleSessionProofV1["role"];
  source: string;
  subject_ref?: string;
}

export interface GarpHandoffRequestRef {
  detail?: string;
  item_type: AuthorityResolutionItemType;
  public_summary: string;
  request_id: string;
  restricted_detail?: string;
  source_refs: readonly AuthorityDashboardSourceRef[];
  status: AuthorityDashboardStatus;
}

export interface GarpHandoffLifecycleRef {
  action: string;
  detail?: string;
  forensic_refs: readonly string[];
  occurred_at?: string;
  record_id: string;
  request_id?: string;
  restricted_detail?: string;
  source_refs: readonly AuthorityDashboardSourceRef[];
  summary: string;
  to_status?: string;
}

export interface GarpHandoffDisclosureRef {
  id: string;
  label: string;
}

export interface GarpHandoffExplicitDemoDetail {
  detail: string;
  detail_kind: "request" | "lifecycle";
  source_ref: string;
}

export interface GarpHandoffContextV1 {
  advisories: readonly AuthorityDashboardAdvisory[];
  authority_request_refs: readonly GarpHandoffRequestRef[];
  authority_status: AuthorityDashboardStatus;
  contract: typeof GARP_HANDOFF_CONTEXT_CONTRACT;
  counts: GarpHandoffCounts;
  disclosure_preview_refs: readonly GarpHandoffDisclosureRef[];
  explicit_demo_details: readonly GarpHandoffExplicitDemoDetail[];
  foreman_gate_reason: string;
  foreman_ready: false;
  lifecycle_refs: readonly GarpHandoffLifecycleRef[];
  public_boundary: GarpHandoffPublicBoundary;
  role_session: GarpHandoffRoleSessionSummary;
  source_refs: readonly AuthorityDashboardSourceRef[];
  unresolved_holds: readonly string[];
}

export type DisclosurePreviewPreparedActionKind = "copy" | "download" | "print";

export interface DisclosurePreviewPreparedAction {
  action: DisclosurePreviewPreparedActionKind;
  label: string;
  payload_kind: "json" | "text" | "view";
  side_effect: "prepared_only";
  status: "holding" | "prepared";
}

export interface DisclosurePreviewActionContent {
  contract: typeof DISCLOSURE_PREVIEW_ACTION_BUNDLE_CONTRACT;
  disclaimer: typeof DISCLOSURE_PREVIEW_DEMO_DISCLAIMER;
  explicit_demo_details?: readonly string[];
  holds: readonly string[];
  public_safe_summary?: string;
  redaction_summary?: readonly string[];
  role_boundary_summary: string;
  source_refs?: readonly DisclosurePreviewSourceRef[];
  visible_facts?: readonly string[];
}

export interface DisclosurePreviewActionBundleV1 {
  contract: typeof DISCLOSURE_PREVIEW_ACTION_BUNDLE_CONTRACT;
  disclaimer: typeof DISCLOSURE_PREVIEW_DEMO_DISCLAIMER;
  filename: string;
  holds: readonly string[];
  json_content: DisclosurePreviewActionContent;
  mime_type: "application/json";
  prepared_actions: readonly DisclosurePreviewPreparedAction[];
  print_title: string;
  role_boundary_summary: string;
  status: "holding" | "prepared";
  text_content: string;
}
