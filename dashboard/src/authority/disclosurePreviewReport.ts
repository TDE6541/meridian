import type { DashboardSkinView } from "../adapters/skinPayloadAdapter.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import {
  DISCLOSURE_PREVIEW_DEMO_DISCLAIMER,
  DISCLOSURE_PREVIEW_REPORT_CONTRACT,
  type AuthorityDashboardStateV1,
  type DisclosurePreviewReportV1,
  type DisclosurePreviewSourceRef,
} from "./authorityDashboardTypes.ts";

export interface BuildDisclosurePreviewReportInput {
  authorityState: AuthorityDashboardStateV1;
  generatedAt?: string | null;
  publicSkinView?: DashboardSkinView | null;
  roleSession: DashboardRoleSessionProofV1;
  scenarioLabel?: string | null;
  sessionLabel?: string | null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function sourceRef(id: string, label: string): DisclosurePreviewSourceRef {
  return { id, label };
}

function uniqueSourceRefs(
  refs: readonly DisclosurePreviewSourceRef[]
): DisclosurePreviewSourceRef[] {
  const seen = new Set<string>();

  return refs.filter((ref) => {
    const key = `${ref.id}:${ref.label}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function publicSkinSourceRefs(
  publicSkinView: DashboardSkinView | null | undefined
): DisclosurePreviewSourceRef[] {
  if (!publicSkinView) {
    return [];
  }

  return [
    sourceRef("skin.output.public", "public skin output"),
    ...publicSkinView.sourceRefs.map((ref) =>
      sourceRef(
        ref.path ?? `${ref.sourceKind ?? "public_skin"}:source_ref`,
        ref.sourceKind ?? "public skin source"
      )
    ),
  ];
}

function buildVisibleFacts(
  publicSkinView: DashboardSkinView | null | undefined,
  authorityState: AuthorityDashboardStateV1
): string[] {
  const facts: string[] = [];
  const publicClaims = publicSkinView?.claims ?? [];

  for (const claim of publicClaims) {
    const text = asString(claim.text);

    if (text) {
      facts.push(text);
    }
  }

  if (authorityState.counts.pending > 0) {
    facts.push(`${authorityState.counts.pending} authority request pending in dashboard-local state.`);
  }

  if (authorityState.counts.approved > 0) {
    facts.push(`${authorityState.counts.approved} authority request approved in dashboard-local state.`);
  }

  if (authorityState.counts.denied > 0) {
    facts.push(`${authorityState.counts.denied} authority request denied in dashboard-local state.`);
  }

  if (authorityState.counts.expired > 0) {
    facts.push(`${authorityState.counts.expired} authority request expired in dashboard-local state.`);
  }

  return facts.length > 0
    ? facts
    : ["No public-safe authority facts are available for this preview."];
}

function buildRedactionSummary(
  publicSkinView: DashboardSkinView | null | undefined,
  authorityState: AuthorityDashboardStateV1
): string[] {
  const redactions =
    publicSkinView?.redactions
      .map((redaction) => asString(redaction.text))
      .filter((entry): entry is string => entry !== null) ?? [];
  const summary = [...redactions];

  if (authorityState.redaction_mode === "public") {
    summary.push("Authority binding context and restricted lifecycle details are excluded for public view.");
  }

  if (summary.length === 0) {
    summary.push("No explicit redactions were supplied by the current public skin output.");
  }

  return summary;
}

export function buildDisclosurePreviewReport({
  authorityState,
  generatedAt = null,
  publicSkinView = null,
  roleSession,
  scenarioLabel = null,
  sessionLabel = null,
}: BuildDisclosurePreviewReportInput): DisclosurePreviewReportV1 {
  const unresolvedHolds = [
    ...authorityState.advisories
      .filter((advisory) => advisory.severity === "HOLD")
      .map((advisory) => advisory.message),
    ...authorityState.requests
      .filter((request) => request.status === "pending" || request.status === "holding")
      .map((request) => request.public_summary),
  ];

  if (!generatedAt) {
    unresolvedHolds.push("HOLD: disclosure preview generated timestamp requires explicit input.");
  }

  if (!publicSkinView) {
    unresolvedHolds.push("HOLD: public skin output is unavailable for disclosure preview.");
  }

  const visibleFacts = buildVisibleFacts(publicSkinView, authorityState);
  const sourceRefs = uniqueSourceRefs([
    sourceRef("role.session", `role session ${roleSession.role}`),
    ...publicSkinSourceRefs(publicSkinView),
    ...authorityState.source_refs.map((ref) =>
      sourceRef(
        [ref.source_kind, ref.path, ref.evidence_id].filter(Boolean).join(":"),
        "authority dashboard state"
      )
    ),
  ]);

  return {
    contract: DISCLOSURE_PREVIEW_REPORT_CONTRACT,
    disclaimer: DISCLOSURE_PREVIEW_DEMO_DISCLAIMER,
    generated_at: generatedAt,
    public_safe_summary: visibleFacts[0],
    redaction_summary: buildRedactionSummary(publicSkinView, authorityState),
    restricted_fields_excluded: [
      "authority binding_context",
      "authority actor decision_trace",
      "raw action tokens",
      "restricted live authority payload fields",
      `role boundary: ${authorityState.redaction_mode}`,
    ],
    scenario_label: scenarioLabel,
    session_label: sessionLabel,
    source_refs: sourceRefs,
    status: unresolvedHolds.length > 0 ? "holding" : "ready",
    unresolved_holds: unresolvedHolds,
    visible_facts: visibleFacts,
  };
}
