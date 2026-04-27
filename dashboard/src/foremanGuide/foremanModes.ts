import {
  answerAuthorityNarration,
  type AuthorityNarrationKind,
} from "./authorityNarration.ts";
import type {
  ForemanGuideContextV1,
  ForemanGuideHold,
  ForemanGuideSourceRef,
} from "./foremanGuideTypes.ts";
import {
  getForemanPanel,
  getForemanPanelReference,
  type ForemanPanelId,
} from "./panelRegistry.ts";
import {
  FOREMAN_GUIDE_RESPONSE_VERSION,
  type ForemanGuideResponseKind,
  type ForemanGuideResponseV1,
} from "./offlineNarration.ts";

export const FOREMAN_GUIDE_MODE_VERSION =
  "meridian.v2.foremanGuideMode.v1" as const;

export const FOREMAN_GUIDE_MODE_IDS = [
  "walk",
  "absence",
  "challenge",
  "public",
  "judge",
] as const;

export type ForemanGuideModeId = (typeof FOREMAN_GUIDE_MODE_IDS)[number];

export interface ForemanGuideModeV1 {
  disabled_reason: string | null;
  eligible: boolean;
  label: string;
  mode_id: ForemanGuideModeId;
  primary_panel_id: ForemanPanelId;
  quick_prompt: string;
  required_context: readonly string[];
  source_refs: readonly ForemanGuideSourceRef[];
  summary: string;
  version: typeof FOREMAN_GUIDE_MODE_VERSION;
}

interface ForemanGuideModeDefinition {
  label: string;
  mode_id: ForemanGuideModeId;
  primary_panel_id: ForemanPanelId;
  quick_prompt: string;
  required_context: readonly string[];
  summary: string;
}

interface ModeResolution {
  disabledReason: string | null;
  eligible: boolean;
  sourceRefs: readonly ForemanGuideSourceRef[];
}

const MODE_DEFINITIONS: readonly ForemanGuideModeDefinition[] = [
  {
    label: "Walk",
    mode_id: "walk",
    primary_panel_id: "control-room",
    quick_prompt: "Walk the current proof path.",
    required_context: ["scenario/session identity", "active step or event"],
    summary: "Explain what happened in the current scenario or session.",
  },
  {
    label: "Absence",
    mode_id: "absence",
    primary_panel_id: "absence-lens",
    quick_prompt: "Explain what is missing.",
    required_context: ["absence refs or latest absence state"],
    summary: "Explain missing evidence without inventing approvals or facts.",
  },
  {
    label: "Challenge",
    mode_id: "challenge",
    primary_panel_id: "authority-resolution",
    quick_prompt: "Pressure-test this authority decision.",
    required_context: ["authority refs, GARP handoff, or source-backed HOLDs"],
    summary: "Pressure-test the current authority and governance posture.",
  },
  {
    label: "Public",
    mode_id: "public",
    primary_panel_id: "disclosure-preview",
    quick_prompt: "Explain the public boundary.",
    required_context: ["public boundary or disclosure preview context"],
    summary: "Explain what the public can see and what is redacted.",
  },
  {
    label: "Judge",
    mode_id: "judge",
    primary_panel_id: "foreman-guide",
    quick_prompt: "Explain Meridian from this state in 60 seconds.",
    required_context: ["visible source refs or current proof path"],
    summary: "Give a concise demo-ready explanation of the current dashboard.",
  },
] as const;

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

function makeModeResponse({
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

function summarizeRecord(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const firstString = [
    record.summary,
    record.public_summary,
    record.finding_id,
    record.id,
    record.status,
    record.decision,
  ].find((entry): entry is string => typeof entry === "string" && entry.length > 0);

  return firstString ?? fallback;
}

function sourceCountLabel(count: number): string {
  return count === 1 ? "1 source ref" : `${count} source refs`;
}

function modeHold(
  modeId: ForemanGuideModeId,
  reason: string,
  sourceRef: string | null,
  proofNeeded: readonly string[]
): ForemanGuideResponseV1 {
  return makeModeResponse({
    answer: `HOLD - ${reason}`,
    holds: [
      makeHold(
        `foreman_${modeId}_mode_unavailable`,
        `HOLD: ${reason}`,
        sourceRef,
        proofNeeded
      ),
    ],
    responseKind: "hold",
    sourceRefs: [],
  });
}

function hasScenarioSessionContext(context: ForemanGuideContextV1): boolean {
  return Boolean(
    context.current.scenario_id &&
      context.current.session_id &&
      (context.current.step_id || context.current.event_id)
  );
}

function hasAbsenceContext(context: ForemanGuideContextV1): boolean {
  return Boolean(
    context.state.latest_absence || context.sources.absence_refs.length > 0
  );
}

function hasAuthorityChallengeContext(context: ForemanGuideContextV1): boolean {
  return Boolean(
    context.sources.authority_refs.length > 0 ||
      context.sources.garp_refs.length > 0 ||
      context.state.latest_authority ||
      context.state.garp_handoff ||
      context.state.disclosure_preview?.unresolved_holds.length
  );
}

function hasPublicContext(context: ForemanGuideContextV1): boolean {
  return Boolean(
    context.state.public_boundary ||
      context.state.disclosure_preview ||
      context.sources.disclosure_refs.length > 0
  );
}

function hasJudgeContext(context: ForemanGuideContextV1): boolean {
  return Boolean(
    context.source_refs.length > 0 ||
      context.current.scenario_id ||
      context.current.session_id ||
      context.current.step_id ||
      context.current.event_id
  );
}

function modeResolution(
  modeId: ForemanGuideModeId,
  context: ForemanGuideContextV1 | null
): ModeResolution {
  if (!context) {
    return {
      disabledReason: "HOLD: Foreman Guide context is unavailable.",
      eligible: false,
      sourceRefs: [],
    };
  }

  if (modeId === "walk") {
    return {
      disabledReason: hasScenarioSessionContext(context)
        ? null
        : "HOLD: Walk Mode needs scenario/session context and an active proof anchor.",
      eligible: hasScenarioSessionContext(context),
      sourceRefs: context.source_refs,
    };
  }

  if (modeId === "absence") {
    return {
      disabledReason: hasAbsenceContext(context)
        ? null
        : "HOLD: Absence Mode needs absence refs or latest absence state.",
      eligible: hasAbsenceContext(context),
      sourceRefs: context.sources.absence_refs,
    };
  }

  if (modeId === "challenge") {
    return {
      disabledReason: hasAuthorityChallengeContext(context)
        ? null
        : "HOLD: Challenge Mode needs authority refs, GARP context, or source-backed HOLDs.",
      eligible: hasAuthorityChallengeContext(context),
      sourceRefs: uniqueSourceRefs([
        ...context.sources.authority_refs,
        ...context.sources.garp_refs,
        ...context.sources.disclosure_refs,
      ]),
    };
  }

  if (modeId === "public") {
    return {
      disabledReason: hasPublicContext(context)
        ? null
        : "HOLD: Public Mode needs public boundary or disclosure preview context.",
      eligible: hasPublicContext(context),
      sourceRefs: uniqueSourceRefs([
        ...context.sources.disclosure_refs,
        ...context.sources.garp_refs,
      ]),
    };
  }

  return {
    disabledReason: hasJudgeContext(context)
      ? null
      : "HOLD: Judge Mode needs a visible proof path before summarizing the dashboard.",
    eligible: hasJudgeContext(context),
    sourceRefs: context.source_refs,
  };
}

export function resolveForemanGuideModes(
  context: ForemanGuideContextV1 | null
): ForemanGuideModeV1[] {
  return MODE_DEFINITIONS.map((definition) => {
    const resolution = modeResolution(definition.mode_id, context);

    return {
      ...definition,
      disabled_reason: resolution.disabledReason,
      eligible: resolution.eligible,
      source_refs: resolution.sourceRefs,
      version: FOREMAN_GUIDE_MODE_VERSION,
    };
  });
}

export function getForemanGuideMode(
  modeId: ForemanGuideModeId
): ForemanGuideModeDefinition {
  return (
    MODE_DEFINITIONS.find((mode) => mode.mode_id === modeId) ??
    MODE_DEFINITIONS[0]
  );
}

function panelLead(panelId: ForemanPanelId): string | null {
  return getForemanPanel(panelId) ? getForemanPanelReference(panelId) : null;
}

function answerWalkMode(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  if (!hasScenarioSessionContext(context)) {
    return modeHold(
      "walk",
      "Walk Mode needs scenario/session context and an active proof anchor.",
      "foreman.mode.walk",
      ["scenario id", "session id", "active step id or live event id"]
    );
  }

  const mode = getForemanGuideMode("walk");
  const proofAnchor = context.current.step_id ?? context.current.event_id;
  const answer = [
    panelLead(mode.primary_panel_id),
    `Walk Mode is reading ${context.source_mode} context for scenario ${context.current.scenario_id} and session ${context.current.session_id}.`,
    `The current proof anchor is ${proofAnchor}; active skin is ${context.current.active_skin ?? "HOLD: active skin unavailable"}.`,
    context.state.latest_governance
      ? `Governance state is present: ${summarizeRecord(context.state.latest_governance, "source-bounded governance proof")}.`
      : "Governance state is not present in this mode context.",
    context.state.latest_authority
      ? `Authority state is present: ${summarizeRecord(context.state.latest_authority, "source-bounded authority proof")}.`
      : "Authority state is not present in this mode context.",
    "Foreman is guiding, not deciding.",
  ].filter((entry): entry is string => Boolean(entry)).join(" ");

  return makeModeResponse({
    answer,
    holds: context.holds,
    responseKind: "walk_mode",
    sourceRefs: context.source_refs,
  });
}

function answerAbsenceMode(
  context: ForemanGuideContextV1
): ForemanGuideResponseV1 {
  if (!hasAbsenceContext(context)) {
    return modeHold(
      "absence",
      "Absence Mode needs absence refs or latest absence state.",
      "foreman.mode.absence",
      ["absence source refs", "latest absence state", "absence HOLD context"]
    );
  }

  const mode = getForemanGuideMode("absence");
  const refs = context.sources.absence_refs;
  const answer = [
    panelLead(mode.primary_panel_id),
    "Absence Mode explains only the missing-state evidence already present in context.",
    summarizeRecord(
      context.state.latest_absence,
      "Absence refs are present, but no richer absence summary is supplied."
    ),
    `The mode has ${sourceCountLabel(refs.length)} and does not invent missing approvals, evidence, deadlines, or facts beyond those refs.`,
    "HOLD > GUESS remains active for unsupported absence families.",
  ].filter((entry): entry is string => Boolean(entry)).join(" ");

  return makeModeResponse({
    answer,
    responseKind: "absence_mode",
    sourceRefs: refs,
  });
}

function answerAuthorityMode(
  kind: AuthorityNarrationKind,
  responseKind: ForemanGuideResponseKind,
  context: ForemanGuideContextV1
): ForemanGuideResponseV1 {
  const draft = answerAuthorityNarration(kind, context);

  return makeModeResponse({
    answer: draft.answer,
    holds: draft.holds,
    responseKind,
    sourceRefs: draft.sourceRefs,
  });
}

function answerChallengeMode(
  context: ForemanGuideContextV1
): ForemanGuideResponseV1 {
  if (!hasAuthorityChallengeContext(context)) {
    return modeHold(
      "challenge",
      "Challenge Mode needs authority refs, GARP context, or source-backed HOLDs.",
      "foreman.mode.challenge",
      ["authority source refs", "GARP handoff context", "source-backed HOLDs"]
    );
  }

  return answerAuthorityMode("authority_challenge", "challenge_mode", context);
}

function answerPublicMode(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  if (!hasPublicContext(context)) {
    return modeHold(
      "public",
      "Public Mode needs public boundary or disclosure preview context.",
      "foreman.mode.public",
      ["public boundary context", "disclosure preview report or refs"]
    );
  }

  return answerAuthorityMode("public_boundary", "public_mode", context);
}

function availableClause(
  enabled: boolean,
  text: string
): string | null {
  return enabled ? text : null;
}

function answerJudgeMode(context: ForemanGuideContextV1): ForemanGuideResponseV1 {
  if (!hasJudgeContext(context)) {
    return modeHold(
      "judge",
      "Judge Mode needs a visible proof path before summarizing the dashboard.",
      "foreman.mode.judge",
      ["source refs", "scenario/session identity", "active step or event"]
    );
  }

  const clauses = [
    `Meridian is governed city intelligence reading ${context.source_mode} dashboard proof.`,
    availableClause(
      Boolean(context.current.scenario_id || context.current.session_id),
      `Current state is ${context.current.scenario_id ?? "scenario unavailable"} / ${context.current.session_id ?? "session unavailable"} with proof anchor ${context.current.step_id ?? context.current.event_id ?? "HOLD"}.`
    ),
    availableClause(
      Boolean(context.state.latest_governance),
      "Governance proof is visible in the current context."
    ),
    availableClause(
      context.sources.authority_refs.length > 0 || Boolean(context.state.garp_handoff),
      "Authority runway context is visible and remains dashboard-local."
    ),
    availableClause(
      hasAbsenceContext(context),
      "Absence signals are explained only from supplied source refs."
    ),
    availableClause(
      context.sources.forensic_refs.length > 0 || Boolean(context.state.latest_forensic),
      "Forensic refs are shown only when current context supplies them."
    ),
    availableClause(
      hasPublicContext(context),
      "Public boundary context shows what can be previewed safely."
    ),
    "Foreman is the guide and explainer for this state; it does not decide, deliver, or certify anything.",
  ].filter((entry): entry is string => Boolean(entry));

  return makeModeResponse({
    answer: clauses.join(" "),
    holds: context.holds,
    responseKind: "judge_mode",
    sourceRefs: context.source_refs,
  });
}

export function answerForemanGuideMode(
  modeId: ForemanGuideModeId,
  context: ForemanGuideContextV1 | null
): ForemanGuideResponseV1 {
  if (!context) {
    return modeHold(
      modeId,
      "Foreman Guide context is unavailable.",
      "foreman.mode.context",
      ["meridian.v2.foremanGuideContext.v1 context"]
    );
  }

  if (modeId === "walk") {
    return answerWalkMode(context);
  }

  if (modeId === "absence") {
    return answerAbsenceMode(context);
  }

  if (modeId === "challenge") {
    return answerChallengeMode(context);
  }

  if (modeId === "public") {
    return answerPublicMode(context);
  }

  return answerJudgeMode(context);
}
