import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import {
  DISCLOSURE_PREVIEW_ACTION_BUNDLE_CONTRACT,
  DISCLOSURE_PREVIEW_DEMO_DISCLAIMER,
  type DisclosurePreviewActionBundleV1,
  type DisclosurePreviewActionContent,
  type DisclosurePreviewPreparedAction,
  type DisclosurePreviewReportV1,
  type GarpHandoffContextV1,
} from "./authorityDashboardTypes.ts";

export interface BuildDisclosurePreviewActionBundleInput {
  garpHandoffContext?: GarpHandoffContextV1 | null;
  report?: DisclosurePreviewReportV1 | null;
  roleSession: DashboardRoleSessionProofV1;
}

function slug(value: string | null | undefined): string {
  const normalized = value
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized && normalized.length > 0 ? normalized : "disclosure-preview";
}

function roleBoundarySummary(
  roleSession: DashboardRoleSessionProofV1,
  garpHandoffContext: GarpHandoffContextV1 | null | undefined
): string {
  const boundary = garpHandoffContext?.public_boundary;
  const redactionMode = boundary?.redaction_mode ?? "public";
  const safeMode = boundary?.public_safe ?? roleSession.role === "public";

  return `role=${roleSession.role}; redaction=${redactionMode}; public_safe=${String(safeMode)}`;
}

function buildPreparedActions(status: "holding" | "prepared"): DisclosurePreviewPreparedAction[] {
  return [
    {
      action: "copy",
      label: "Copy payload prepared",
      payload_kind: "json",
      side_effect: "prepared_only",
      status,
    },
    {
      action: "download",
      label: "Download payload prepared",
      payload_kind: "json",
      side_effect: "prepared_only",
      status,
    },
    {
      action: "print",
      label: "Print view prepared",
      payload_kind: "view",
      side_effect: "prepared_only",
      status,
    },
  ];
}

function buildContent({
  garpHandoffContext,
  holds,
  report,
  roleBoundary,
  roleSession,
}: {
  garpHandoffContext?: GarpHandoffContextV1 | null;
  holds: readonly string[];
  report?: DisclosurePreviewReportV1 | null;
  roleBoundary: string;
  roleSession: DashboardRoleSessionProofV1;
}): DisclosurePreviewActionContent {
  const canIncludeDemoDetail =
    roleSession.role === "judge_demo_operator" &&
    garpHandoffContext?.public_boundary.redaction_mode === "judge_demo";
  const explicitDemoDetails = canIncludeDemoDetail
    ? garpHandoffContext.explicit_demo_details.map((detail) => detail.detail)
    : [];

  return {
    contract: DISCLOSURE_PREVIEW_ACTION_BUNDLE_CONTRACT,
    disclaimer: DISCLOSURE_PREVIEW_DEMO_DISCLAIMER,
    ...(explicitDemoDetails.length > 0 ? { explicit_demo_details: explicitDemoDetails } : {}),
    holds,
    ...(report
      ? {
          public_safe_summary: report.public_safe_summary,
          redaction_summary: report.redaction_summary,
          source_refs: report.source_refs,
          visible_facts: report.visible_facts,
        }
      : {}),
    role_boundary_summary: roleBoundary,
  };
}

export function buildDisclosurePreviewActionBundle({
  garpHandoffContext = null,
  report = null,
  roleSession,
}: BuildDisclosurePreviewActionBundleInput): DisclosurePreviewActionBundleV1 {
  const roleBoundary = roleBoundarySummary(roleSession, garpHandoffContext);
  const holds = [
    ...(report ? report.unresolved_holds : ["HOLD: disclosure preview report unavailable for prepared actions."]),
    ...(garpHandoffContext ? garpHandoffContext.unresolved_holds : []),
  ];
  const status = holds.length > 0 ? "holding" : "prepared";
  const content = buildContent({
    garpHandoffContext,
    holds,
    report,
    roleBoundary,
    roleSession,
  });
  const filenameBase = slug(report?.scenario_label ?? report?.session_label);

  return {
    contract: DISCLOSURE_PREVIEW_ACTION_BUNDLE_CONTRACT,
    disclaimer: DISCLOSURE_PREVIEW_DEMO_DISCLAIMER,
    filename: `${filenameBase}-disclosure-preview.json`,
    holds,
    json_content: content,
    mime_type: "application/json",
    prepared_actions: buildPreparedActions(status),
    print_title: report?.scenario_label
      ? `${report.scenario_label} disclosure preview`
      : "Disclosure preview",
    role_boundary_summary: roleBoundary,
    status,
    text_content: JSON.stringify(content, null, 2),
  };
}
