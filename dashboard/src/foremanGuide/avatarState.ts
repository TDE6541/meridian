import type { ForemanGuideContextV1 } from "./foremanGuideTypes.ts";
import type { ForemanGuideModeId } from "./foremanModes.ts";
import type { ForemanGuideResponseV1 } from "./offlineNarration.ts";
import type { ForemanGuideSignalV1 } from "./foremanSignals.ts";

export const FOREMAN_AVATAR_STATE_VERSION =
  "meridian.v2.foremanAvatarState.v1" as const;

export const FOREMAN_AVATAR_STATES = [
  "idle",
  "explaining",
  "holding",
  "warning",
  "blocked",
  "live",
  "public-boundary",
] as const;

export type ForemanAvatarStateId = (typeof FOREMAN_AVATAR_STATES)[number];

export interface ForemanAvatarStateV1 {
  reason: string;
  state: ForemanAvatarStateId;
  source_ref: string | null;
  version: typeof FOREMAN_AVATAR_STATE_VERSION;
}

export interface DeriveForemanAvatarStateInput {
  activeModeId?: ForemanGuideModeId | null;
  context?: ForemanGuideContextV1 | null;
  latestResponse?: ForemanGuideResponseV1 | null;
  latestSignal?: ForemanGuideSignalV1 | null;
}

function avatarState(
  state: ForemanAvatarStateId,
  reason: string,
  sourceRef: string | null
): ForemanAvatarStateV1 {
  return {
    reason,
    source_ref: sourceRef,
    state,
    version: FOREMAN_AVATAR_STATE_VERSION,
  };
}

function hasSeverity(
  context: ForemanGuideContextV1 | null,
  latestResponse: ForemanGuideResponseV1 | null,
  latestSignal: ForemanGuideSignalV1 | null,
  severity: "BLOCK" | "HOLD"
): boolean {
  return Boolean(
    context?.holds.some((hold) => hold.severity === severity) ||
      latestResponse?.holds.some((hold) => hold.severity === severity) ||
      latestSignal?.holds.some((hold) => hold.severity === severity)
  );
}

function isPublicBoundaryContext({
  activeModeId,
  context,
  latestResponse,
  latestSignal,
}: DeriveForemanAvatarStateInput): boolean {
  if (activeModeId === "public") {
    return true;
  }

  if (
    latestResponse?.response_kind === "public_boundary" ||
    latestResponse?.response_kind === "public_mode" ||
    latestResponse?.response_kind === "disclosure_boundary"
  ) {
    return true;
  }

  if (
    latestSignal?.kind === "disclosure.boundary.observed" ||
    latestSignal?.kind === "public.view.selected"
  ) {
    return true;
  }

  const boundary = context?.state.public_boundary;
  if (boundary && typeof boundary === "object" && !Array.isArray(boundary)) {
    const record = boundary as Record<string, unknown>;
    return record.mode === "public" || record.role === "public";
  }

  return context?.state.role_session?.role === "public";
}

export function deriveForemanAvatarState({
  activeModeId = null,
  context = null,
  latestResponse = null,
  latestSignal = null,
}: DeriveForemanAvatarStateInput = {}): ForemanAvatarStateV1 {
  if (hasSeverity(context, latestResponse, latestSignal, "BLOCK")) {
    return avatarState(
      "blocked",
      "A BLOCK-severity Foreman hold is present in current context.",
      latestSignal?.source_ref ?? latestResponse?.source_refs[0]?.source_ref ?? null
    );
  }

  if (latestSignal?.kind === "endpoint.hold") {
    return avatarState(
      "blocked",
      "Shared authority endpoint state is holding or unavailable.",
      latestSignal.source_ref
    );
  }

  if (
    latestResponse?.response_kind === "hold" ||
    hasSeverity(context, latestResponse, latestSignal, "HOLD")
  ) {
    return avatarState(
      "holding",
      "Foreman response or context has a HOLD that must remain visible.",
      latestResponse?.source_refs[0]?.source_ref ??
        latestSignal?.source_ref ??
        context?.holds[0]?.source_ref ??
        null
    );
  }

  if (isPublicBoundaryContext({ activeModeId, context, latestResponse, latestSignal })) {
    return avatarState(
      "public-boundary",
      "Foreman is explaining public/disclosure boundary context.",
      latestSignal?.source_ref ??
        latestResponse?.source_refs[0]?.source_ref ??
        context?.sources.disclosure_refs[0]?.source_ref ??
        null
    );
  }

  if (latestSignal?.priority === "high") {
    return avatarState(
      "warning",
      "A high-priority Foreman signal is active.",
      latestSignal.source_ref
    );
  }

  if (context?.source_mode === "live" || latestSignal?.kind === "live.event.observed") {
    return avatarState(
      "live",
      "Foreman is reading live-mode context already supplied by the dashboard.",
      latestSignal?.source_ref ?? context?.sources.live_refs[0]?.source_ref ?? null
    );
  }

  if (latestResponse) {
    return avatarState(
      "explaining",
      "Foreman has produced an offline explanation from current context.",
      latestResponse.source_refs[0]?.source_ref ?? null
    );
  }

  return avatarState(
    "idle",
    "Foreman is waiting for typed input, a mode action, or a source-bounded signal.",
    null
  );
}
