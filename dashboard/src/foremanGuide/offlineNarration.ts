import type {
  ForemanGuideContextV1,
  ForemanGuideHold,
  ForemanGuideSourceRef,
} from "./foremanGuideTypes.ts";

export const FOREMAN_GUIDE_RESPONSE_VERSION =
  "meridian.v2.foremanGuideResponse.v1" as const;

export type ForemanGuideResponseKind =
  | "architecture_difference"
  | "authority_summary"
  | "disclosure_boundary"
  | "hold"
  | "hold_doctrine"
  | "role_session"
  | "walk_summary"
  | "absence_summary";

export interface ForemanGuideResponseV1 {
  answer: string;
  holds: readonly ForemanGuideHold[];
  mode: "offline";
  response_kind: ForemanGuideResponseKind;
  source_refs: readonly ForemanGuideSourceRef[];
  version: typeof FOREMAN_GUIDE_RESPONSE_VERSION;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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

function makeResponse({
  answer,
  holds = [],
  responseKind,
  sourceRefs = [],
}: {
  answer: string;
  holds?: readonly ForemanGuideHold[];
  responseKind: ForemanGuideResponseKind;
  sourceRefs?: readonly ForemanGuideSourceRef[];
}): ForemanGuideResponseV1 {
  return {
    answer,
    holds,
    mode: "offline",
    response_kind: responseKind,
    source_refs: uniqueSourceRefs(sourceRefs),
    version: FOREMAN_GUIDE_RESPONSE_VERSION,
  };
}

export function createUnsupportedForemanResponse(
  proofNeeded: readonly string[],
  sourceRef: string | null = "foreman.offline.question"
): ForemanGuideResponseV1 {
  return makeResponse({
    answer:
      "HOLD - I do not have enough source context to answer that safely from the current Meridian state.",
    holds: [
      makeHold(
        "foreman_offline_unsupported_question",
        "HOLD: Foreman offline guide can only answer from the current B1 context and bounded Meridian demo doctrine.",
        sourceRef,
        proofNeeded
      ),
    ],
    responseKind: "hold",
  });
}

function summarizeRecord(value: unknown, fallback: string): string {
  if (!isRecord(value)) {
    return fallback;
  }

  return (
    asString(value.summary) ??
    asString(value.public_summary) ??
    asString(value.finding_id) ??
    asString(value.id) ??
    asString(value.status) ??
    asString(value.decision) ??
    fallback
  );
}

function sourceCountLabel(count: number): string {
  return count === 1 ? "1 source ref" : `${count} source refs`;
}

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase();
}

function isRestrictedQuestion(question: string): boolean {
  return [
    "code line",
    "compliance",
    "deployed",
    "fort worth live",
    "legal",
    "line number",
    "official city",
    "production",
    "source line",
    "tpia",
  ].some((term) => question.includes(term));
}

function includesAny(question: string, terms: readonly string[]): boolean {
  return terms.some((term) => question.includes(term));
}

function classifyQuestion(question: string): ForemanGuideResponseKind | "unsupported" {
  if (question.length === 0 || isRestrictedQuestion(question)) {
    return "unsupported";
  }

  if (includesAny(question, ["walk", "proof", "current", "state", "status"])) {
    return "walk_summary";
  }

  if (includesAny(question, ["hold", "guess", "doctrine"])) {
    return "hold_doctrine";
  }

  if (includesAny(question, ["absence", "missing evidence", "gap"])) {
    return "absence_summary";
  }

  if (includesAny(question, ["authority", "garp", "approval", "resolution"])) {
    return "authority_summary";
  }

  if (includesAny(question, ["public", "disclosure", "redaction", "boundary"])) {
    return "disclosure_boundary";
  }

  if (includesAny(question, ["role", "session", "auth", "login"])) {
    return "role_session";
  }

  if (includesAny(question, ["different", "challenge", "architecture", "prototype"])) {
    return "architecture_difference";
  }

  return "unsupported";
}

function answerWalk(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  const current = context.current;
  const stepOrEvent = current.step_id ?? current.event_id ?? "HOLD: no active step or event";
  const ready = context.foreman_readiness.ready ? "ready" : "holding";
  const answer = [
    `The Foreman is reading ${context.source_mode} context for scenario ${current.scenario_id ?? "HOLD: scenario unavailable"}.`,
    `Current proof anchor is ${stepOrEvent}; active skin is ${current.active_skin ?? "HOLD: active skin unavailable"}.`,
    `B1 readiness is ${ready}: ${context.foreman_readiness.reason}`,
    `I am explaining deterministic engine decisions; I am not making decisions.`,
  ].join(" ");

  return makeResponse({
    answer,
    holds: context.holds,
    responseKind: "walk_summary",
    sourceRefs: context.source_refs,
  });
}

function answerHoldDoctrine(): ForemanGuideResponseV1 {
  return makeResponse({
    answer:
      "HOLD > GUESS means Meridian stops when source proof is missing, ambiguous, or outside the approved lane. The Foreman can explain visible deterministic state, but cannot fill gaps with guesses or model output.",
    responseKind: "hold_doctrine",
  });
}

function answerAbsence(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  const refs = context.sources.absence_refs;
  const latest = context.state.latest_absence;

  if (!latest && refs.length === 0) {
    return createUnsupportedForemanResponse(
      ["current B1 context with absence findings or absence source refs"],
      "foreman.context.absence"
    );
  }

  return makeResponse({
    answer: `The current absence view is source-bounded. ${summarizeRecord(
      latest,
      "Absence refs are present in the B1 context."
    )} I can point to ${sourceCountLabel(refs.length)} and cannot infer absent evidence beyond those refs.`,
    responseKind: "absence_summary",
    sourceRefs: refs,
  });
}

function answerAuthority(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  const authorityRefs = context.sources.authority_refs;
  const garpRefs = context.sources.garp_refs;
  const garp = context.state.garp_handoff;
  const latest = context.state.latest_authority;

  if (!garp && !latest && authorityRefs.length === 0) {
    return createUnsupportedForemanResponse(
      ["current B1 context with GARP handoff, authority state, or authority source refs"],
      "foreman.context.authority"
    );
  }

  const counts = garp
    ? `GARP counts are pending ${garp.counts.pending}, approved ${garp.counts.approved}, denied ${garp.counts.denied}, expired ${garp.counts.expired}, holding ${garp.counts.holding}.`
    : "GARP counts are not present in this context.";

  return makeResponse({
    answer: `Authority is dashboard-local and source-bounded. ${counts} ${summarizeRecord(
      latest,
      "Latest authority state is available only through the supplied B1 context."
    )}`,
    holds: garp?.unresolved_holds.map((hold, index) =>
      makeHold(
        `garp_unresolved_hold_${index + 1}`,
        hold,
        "foreman.context.garp_handoff",
        ["resolved GARP handoff proof"]
      )
    ) ?? [],
    responseKind: "authority_summary",
    sourceRefs: [...authorityRefs, ...garpRefs],
  });
}

function answerDisclosure(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  const refs = context.sources.disclosure_refs;
  const boundary = isRecord(context.state.public_boundary)
    ? context.state.public_boundary
    : null;
  const report = context.state.disclosure_preview;

  if (!boundary && !report && refs.length === 0) {
    return createUnsupportedForemanResponse(
      ["current B1 context with public boundary or disclosure preview refs"],
      "foreman.context.disclosure"
    );
  }

  const boundaryText = boundary
    ? `Public boundary role is ${asString(boundary.role) ?? "unknown"} with redaction mode ${asString(boundary.redaction_mode) ?? asString(boundary.mode) ?? "unknown"}.`
    : "Public boundary is not supplied as a structured object.";
  const reportText = report
    ? `Disclosure preview status is ${report.status}; ${report.disclaimer}`
    : "Disclosure preview report is not present.";

  return makeResponse({
    answer: `${boundaryText} ${reportText}`,
    holds: report?.unresolved_holds.map((hold, index) =>
      makeHold(
        `disclosure_unresolved_hold_${index + 1}`,
        hold,
        "foreman.context.disclosure_preview",
        ["resolved disclosure preview proof"]
      )
    ) ?? [],
    responseKind: "disclosure_boundary",
    sourceRefs: refs,
  });
}

function answerRoleSession(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  const roleSession = context.state.role_session;
  const refs = context.sources.garp_refs.filter((ref) =>
    ref.source_kind.startsWith("role.session")
  );

  if (!roleSession) {
    return createUnsupportedForemanResponse(
      ["current B1 context with meridian.v2.roleSessionProof.v1"],
      "foreman.context.role_session"
    );
  }

  return makeResponse({
    answer: `Role session proof is ${roleSession.contract}. Auth status is ${roleSession.auth_status}; role is ${roleSession.role}; active skin is ${roleSession.active_skin}; allowed skins are ${roleSession.allowed_skins.join(", ")}.`,
    holds: roleSession.holds.map((hold) =>
      makeHold(
        hold.code,
        hold.message,
        hold.source_ref,
        ["recognized role claim or allowed local dashboard skin"]
      )
    ),
    responseKind: "role_session",
    sourceRefs: refs,
  });
}

function answerArchitecture(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  return makeResponse({
    answer:
      "This B2 panel is not the Bronze browser-model prototype. It is a dashboard-local guide over B1 context, static Meridian doctrine, and preserved source refs. It does not call a model, decide governance, compute authority, read secrets, or claim live city state.",
    holds: context.holds,
    responseKind: "architecture_difference",
    sourceRefs: context.source_refs.slice(0, 8),
  });
}

export function answerForemanGuideOffline(
  question: string,
  context: ForemanGuideContextV1 | null
): ForemanGuideResponseV1 {
  if (!context) {
    return createUnsupportedForemanResponse(
      ["meridian.v2.foremanGuideContext.v1 context"],
      "foreman.context"
    );
  }

  const normalized = normalizeQuestion(question);
  const responseKind = classifyQuestion(normalized);

  if (responseKind === "unsupported") {
    return createUnsupportedForemanResponse(
      [
        "supported B2 category",
        "current B1 context source refs",
        "Architect-approved wider source if this is outside B2",
      ],
      "foreman.offline.question"
    );
  }

  if (responseKind === "walk_summary") {
    return answerWalk(context);
  }

  if (responseKind === "hold_doctrine") {
    return answerHoldDoctrine();
  }

  if (responseKind === "absence_summary") {
    return answerAbsence(context);
  }

  if (responseKind === "authority_summary") {
    return answerAuthority(context);
  }

  if (responseKind === "disclosure_boundary") {
    return answerDisclosure(context);
  }

  if (responseKind === "role_session") {
    return answerRoleSession(context);
  }

  return answerArchitecture(context);
}
