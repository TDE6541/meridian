import {
  AUTHORITY_DASHBOARD_STATE_CONTRACT,
  type AuthorityDashboardStateV1,
  type AuthorityDashboardStatus,
  type GarpHandoffContextV1,
} from "../authority/authorityDashboardTypes.ts";
import { getSharedAuthorityPermissions } from "../authority/sharedAuthorityEvents.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import type {
  ForemanGuideContextV1,
  ForemanGuideHold,
  ForemanGuideSourceRef,
} from "./foremanGuideTypes.ts";

export type AuthorityNarrationKind =
  | "authority_challenge"
  | "authority_lifecycle"
  | "garp_handoff"
  | "public_boundary"
  | "role_session";

export interface AuthorityNarrationDraft {
  answer: string;
  holds: readonly ForemanGuideHold[];
  responseKind: AuthorityNarrationKind;
  sourceRefs: readonly ForemanGuideSourceRef[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function makeHold(
  id: string,
  reason: string,
  sourceRef: string | null,
  proofNeeded: readonly string[]
): ForemanGuideHold {
  return {
    id,
    proof_needed: proofNeeded,
    reason,
    severity: "HOLD",
    source_ref: sourceRef,
  };
}

function uniqueSourceRefs(
  refs: readonly (ForemanGuideSourceRef | null | undefined)[]
): ForemanGuideSourceRef[] {
  const seen = new Set<string>();
  const next: ForemanGuideSourceRef[] = [];

  refs.forEach((ref) => {
    if (!ref || seen.has(ref.source_ref)) {
      return;
    }

    seen.add(ref.source_ref);
    next.push(ref);
  });

  return next;
}

function toAuthorityState(
  value: unknown
): AuthorityDashboardStateV1 | null {
  if (!isRecord(value) || value.contract !== AUTHORITY_DASHBOARD_STATE_CONTRACT) {
    return null;
  }

  return value as unknown as AuthorityDashboardStateV1;
}

function statusCountText(
  counts: AuthorityDashboardStateV1["counts"] | GarpHandoffContextV1["counts"]
): string {
  return [
    `pending ${counts.pending}`,
    `approved ${counts.approved}`,
    `denied ${counts.denied}`,
    `expired ${counts.expired}`,
    `holding ${counts.holding}`,
  ].join(", ");
}

function roleDisplay(roleSession: DashboardRoleSessionProofV1): string {
  const name = roleSession.display_name
    ? `${roleSession.display_name} (${roleSession.role})`
    : roleSession.role;
  const department = roleSession.department
    ? ` in ${roleSession.department}`
    : "";

  return `${name}${department}`;
}

function roleSourceRefs(context: ForemanGuideContextV1): ForemanGuideSourceRef[] {
  return context.source_refs.filter((ref) =>
    ref.source_kind.startsWith("role.session")
  );
}

function explainRoleCapabilities(
  roleSession: DashboardRoleSessionProofV1
): string {
  const permissions = getSharedAuthorityPermissions(roleSession);
  const submitText = permissions.canSubmit
    ? "may submit dashboard-local shared authority requests"
    : "cannot submit restricted shared authority requests";
  const resolveText = permissions.canResolve
    ? "may approve or deny dashboard-local shared authority requests"
    : "cannot approve or deny dashboard-local shared authority requests";
  const reviewText = permissions.canReview
    ? "may review the visible authority state for this local dashboard role"
    : "is limited to the public view";

  return `${submitText}, ${resolveText}, and ${reviewText}. ${permissions.reason}`;
}

function answerNoRoleSession(): AuthorityNarrationDraft {
  return {
    answer:
      "No role session proof is present in the supplied Foreman context. The safe fallback is public/snapshot posture: public view only, no restricted shared authority submit action, and no approve or deny action.",
    holds: [
      makeHold(
        "role_session_unavailable",
        "HOLD: Foreman needs meridian.v2.roleSessionProof.v1 to explain a logged-in role.",
        "foreman.context.role_session",
        ["meridian.v2.roleSessionProof.v1"]
      ),
    ],
    responseKind: "role_session",
    sourceRefs: [],
  };
}

export function answerRoleSessionNarration(
  context: ForemanGuideContextV1
): AuthorityNarrationDraft {
  const roleSession = context.state.role_session;

  if (!roleSession) {
    return answerNoRoleSession();
  }

  const fallbackText =
    roleSession.auth_status === "authenticated"
      ? "This is an Auth0-backed dashboard-local eval role mapping, not official Fort Worth legal authority."
      : "This is public/snapshot fallback posture because no authenticated mapped role is active.";

  return {
    answer: [
      `You are ${roleDisplay(roleSession)} with auth status ${roleSession.auth_status}.`,
      `Role session proof is ${roleSession.contract}.`,
      `Allowed skins are ${roleSession.allowed_skins.join(", ")}; active skin is ${roleSession.active_skin}.`,
      explainRoleCapabilities(roleSession),
      fallbackText,
    ].join(" "),
    holds: roleSession.holds.map((hold) =>
      makeHold(
        hold.code,
        hold.message,
        hold.source_ref,
        ["recognized Auth0 eval role claim or dashboard-local fallback proof"]
      )
    ),
    responseKind: "role_session",
    sourceRefs: roleSourceRefs(context),
  };
}

function requestStatusSummary(state: AuthorityDashboardStateV1): string {
  if (state.requests.length === 0) {
    return "No authority request refs are present in the supplied authority state.";
  }

  return state.requests
    .slice(0, 3)
    .map((request) => {
      const required = [
        request.required_authority_department,
        request.required_authority_role,
      ].filter(Boolean).join(" / ");
      const target = required ? ` for ${required}` : "";

      return `${request.request_id} is ${request.status}${target}`;
    })
    .join("; ");
}

function lifecycleText(state: AuthorityDashboardStateV1): string {
  const actions = state.timeline.records
    .map((record) => record.action)
    .filter((action) =>
      [
        "AUTHORITY_RESOLUTION_REQUESTED",
        "AUTHORITY_APPROVED",
        "AUTHORITY_DENIED",
      ].includes(action)
    );

  if (actions.length === 0) {
    return "Lifecycle refs use the pending to approved or denied authority path when explicit records are supplied.";
  }

  return `Lifecycle refs include ${[...new Set(actions)].join(", ")}.`;
}

function unresolvedAuthorityHolds(
  state: AuthorityDashboardStateV1 | null,
  garp: GarpHandoffContextV1 | null
): ForemanGuideHold[] {
  return [
    ...(state?.advisories ?? []).filter((advisory) => advisory.severity === "HOLD").map((advisory) =>
      makeHold(
        advisory.code,
        advisory.message,
        advisory.source_ref,
        ["resolved dashboard-local authority advisory"]
      )
    ),
    ...(garp?.unresolved_holds ?? []).map((hold, index) =>
      makeHold(
        `garp_unresolved_hold_${index + 1}`,
        hold,
        "foreman.context.garp_handoff",
        ["resolved GARP handoff proof"]
      )
    ),
  ];
}

export function answerAuthorityLifecycleNarration(
  context: ForemanGuideContextV1
): AuthorityNarrationDraft {
  const state = toAuthorityState(context.state.latest_authority);
  const garp = context.state.garp_handoff;

  if (!state && !garp && context.sources.authority_refs.length === 0) {
    return {
      answer:
        "HOLD - I do not have supplied authority state, GARP handoff refs, or authority source refs to explain the authority lifecycle.",
      holds: [
        makeHold(
          "authority_lifecycle_unavailable",
          "HOLD: authority lifecycle narration requires supplied dashboard-local authority state or GARP handoff context.",
          "foreman.context.authority",
          ["AuthorityDashboardStateV1 or GARP handoff authority refs"]
        ),
      ],
      responseKind: "authority_lifecycle",
      sourceRefs: [],
    };
  }

  const counts = state
    ? statusCountText(state.counts)
    : garp
      ? statusCountText(garp.counts)
      : "counts unavailable";
  const requestText = state
    ? requestStatusSummary(state)
    : "GARP handoff request refs are present, but merged authority state was not supplied.";
  const lifecycle = state
    ? lifecycleText(state)
    : "GARP handoff lifecycle refs are source-bounded to supplied context.";

  return {
    answer: [
      `Authority lifecycle is dashboard-local shared demo state with ${counts}.`,
      requestText,
      lifecycle,
      "A pending request waits for a mapped approver; if approval is not supplied, Foreman can only report pending, denied, or HOLD state from the supplied refs.",
      "Foreman explains the lifecycle and does not resolve authority.",
    ].join(" "),
    holds: unresolvedAuthorityHolds(state, garp),
    responseKind: "authority_lifecycle",
    sourceRefs: uniqueSourceRefs([
      ...context.sources.authority_refs,
      ...context.sources.garp_refs,
    ]),
  };
}

export function answerGarpHandoffNarration(
  context: ForemanGuideContextV1
): AuthorityNarrationDraft {
  const garp = context.state.garp_handoff;

  if (!garp) {
    return {
      answer:
        "HOLD - GARP handoff context is not present, so Foreman cannot explain the authority runway from this context.",
      holds: [
        makeHold(
          "garp_handoff_unavailable",
          "HOLD: GARP handoff narration requires meridian.v2.garpHandoffContext.v1.",
          "foreman.context.garp_handoff",
          ["meridian.v2.garpHandoffContext.v1"]
        ),
      ],
      responseKind: "garp_handoff",
      sourceRefs: context.sources.garp_refs,
    };
  }

  return {
    answer: [
      "GARP gives Foreman a local authority runway: role session posture, authority request refs, lifecycle refs, disclosure refs, and public boundary posture.",
      `GARP authority status is ${garp.authority_status}; counts are ${statusCountText(garp.counts)}.`,
      `The original handoff foreman_ready value is ${String(garp.foreman_ready)}; B1 readiness is context readiness only and does not mutate GARP.`,
      "Foreman is the explainer layer here. It reads source-bounded context and does not make or resolve the authority decision.",
    ].join(" "),
    holds: unresolvedAuthorityHolds(toAuthorityState(context.state.latest_authority), garp),
    responseKind: "garp_handoff",
    sourceRefs: context.sources.garp_refs,
  };
}

export function answerPublicBoundaryNarration(
  context: ForemanGuideContextV1
): AuthorityNarrationDraft {
  const report = context.state.disclosure_preview;
  const boundary = isRecord(context.state.public_boundary)
    ? context.state.public_boundary
    : null;

  if (!report && !boundary && context.sources.disclosure_refs.length === 0) {
    return {
      answer:
        "HOLD - I do not have disclosure preview or public boundary context to explain the public view.",
      holds: [
        makeHold(
          "public_boundary_unavailable",
          "HOLD: public boundary narration requires disclosure preview or GARP public boundary context.",
          "foreman.context.public_boundary",
          ["disclosure preview report or GARP public boundary context"]
        ),
      ],
      responseKind: "public_boundary",
      sourceRefs: [],
    };
  }

  const role = asString(boundary?.role) ?? "unknown";
  const redactionMode =
    asString(boundary?.redaction_mode) ??
    asString(boundary?.mode) ??
    "unknown";
  const visibility = report
    ? `${report.public_safe_summary} Restricted fields excluded: ${report.restricted_fields_excluded.join(", ")}.`
    : "Disclosure preview report is not supplied.";
  const disclaimer = report ? report.disclaimer : "No disclosure preview disclaimer supplied.";

  return {
    answer: [
      `Public boundary role is ${role}; redaction mode is ${redactionMode}.`,
      visibility,
      disclaimer,
      "Foreman can explain the preview boundary but cannot certify legal sufficiency.",
    ].join(" "),
    holds: report?.unresolved_holds.map((hold, index) =>
      makeHold(
        `disclosure_unresolved_hold_${index + 1}`,
        hold,
        "foreman.context.disclosure_preview",
        ["resolved disclosure preview proof"]
      )
    ) ?? [],
    responseKind: "public_boundary",
    sourceRefs: uniqueSourceRefs([
      ...context.sources.disclosure_refs,
      ...context.sources.garp_refs,
    ]),
  };
}

function challengeLineFromStatus(status: AuthorityDashboardStatus): string | null {
  if (status === "pending") {
    return "pending approval remains unresolved";
  }

  if (status === "holding") {
    return "authority state is holding";
  }

  if (status === "denied") {
    return "denial is present and should be treated as the current source state";
  }

  return null;
}

export function answerAuthorityChallengeNarration(
  context: ForemanGuideContextV1
): AuthorityNarrationDraft {
  const state = toAuthorityState(context.state.latest_authority);
  const garp = context.state.garp_handoff;
  const sourceBackedGaps = [
    ...context.holds.map((hold) => hold.reason),
    ...(state?.advisories ?? []).map((advisory) => advisory.message),
    ...(state?.requests ?? [])
      .map((request) => challengeLineFromStatus(request.status))
      .filter((entry): entry is string => Boolean(entry)),
    ...(garp?.unresolved_holds ?? []),
    ...(context.state.disclosure_preview?.unresolved_holds ?? []),
  ];
  const uniqueGaps = [...new Set(sourceBackedGaps)].slice(0, 6);

  if (uniqueGaps.length === 0) {
    uniqueGaps.push(
      "HOLD: no source-backed authority gaps are visible in the supplied context"
    );
  }

  return {
    answer: [
      "Authority challenge is bounded to supplied source refs.",
      `Source-backed gaps/HOLDs: ${uniqueGaps.join(" | ")}.`,
      "B3 does not invent approvals, timelines, laws, people, or city procedures.",
    ].join(" "),
    holds: [
      ...context.holds,
      ...unresolvedAuthorityHolds(state, garp),
    ],
    responseKind: "authority_challenge",
    sourceRefs: uniqueSourceRefs([
      ...context.sources.authority_refs,
      ...context.sources.garp_refs,
      ...context.sources.disclosure_refs,
    ]),
  };
}

export function answerAuthorityNarration(
  kind: AuthorityNarrationKind,
  context: ForemanGuideContextV1
): AuthorityNarrationDraft {
  if (kind === "role_session") {
    return answerRoleSessionNarration(context);
  }

  if (kind === "authority_lifecycle") {
    return answerAuthorityLifecycleNarration(context);
  }

  if (kind === "garp_handoff") {
    return answerGarpHandoffNarration(context);
  }

  if (kind === "public_boundary") {
    return answerPublicBoundaryNarration(context);
  }

  return answerAuthorityChallengeNarration(context);
}
