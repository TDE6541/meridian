import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";

export const AUTHORITY_DASHBOARD_STATE_CONTRACT =
  "meridian.v2.authorityDashboardState.v1" as const;

export const AUTHORITY_TIMELINE_VIEW_CONTRACT =
  "meridian.v2.authorityTimelineView.v1" as const;

export const DISCLOSURE_PREVIEW_REPORT_CONTRACT =
  "meridian.v2.disclosurePreviewReport.v1" as const;

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
