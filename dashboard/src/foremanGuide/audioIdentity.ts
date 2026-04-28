import {
  FOREMAN_AVATAR_STATES,
  type ForemanAvatarStateId,
} from "./avatarState.ts";

export const FOREMAN_AUDIO_CUE_IDENTITIES = [
  "idle",
  "explaining",
  "holding",
  "warning",
  "blocked",
  "public-boundary",
] as const;

export type ForemanAudioCueIdentity =
  (typeof FOREMAN_AUDIO_CUE_IDENTITIES)[number];

export interface ForemanAudioCue {
  identity: ForemanAudioCueIdentity;
  source: `/audio/foreman/${ForemanAudioCueIdentity}.wav`;
  state: ForemanAvatarStateId;
}

export const DEFAULT_FOREMAN_AUDIO_VOLUME = 0.18;
export const MAX_FOREMAN_AUDIO_VOLUME = 0.35;

const FOREMAN_AUDIO_SOURCE_BY_IDENTITY: Record<
  ForemanAudioCueIdentity,
  ForemanAudioCue["source"]
> = {
  blocked: "/audio/foreman/blocked.wav",
  explaining: "/audio/foreman/explaining.wav",
  holding: "/audio/foreman/holding.wav",
  idle: "/audio/foreman/idle.wav",
  "public-boundary": "/audio/foreman/public-boundary.wav",
  warning: "/audio/foreman/warning.wav",
};

const FOREMAN_AUDIO_STATE_FALLBACKS: Record<
  ForemanAvatarStateId,
  ForemanAudioCueIdentity
> = {
  blocked: "blocked",
  explaining: "explaining",
  holding: "holding",
  idle: "idle",
  live: "idle",
  "public-boundary": "public-boundary",
  warning: "warning",
};

export function isForemanAudioCueIdentity(
  value: unknown
): value is ForemanAudioCueIdentity {
  return FOREMAN_AUDIO_CUE_IDENTITIES.includes(
    value as ForemanAudioCueIdentity
  );
}

export function getForemanAudioCueForPresenceState(
  state: ForemanAvatarStateId
): ForemanAudioCue {
  const identity = FOREMAN_AUDIO_STATE_FALLBACKS[state];

  return {
    identity,
    source: FOREMAN_AUDIO_SOURCE_BY_IDENTITY[identity],
    state,
  };
}

export function getForemanAudioCueSources(): readonly ForemanAudioCue["source"][] {
  return FOREMAN_AUDIO_CUE_IDENTITIES.map(
    (identity) => FOREMAN_AUDIO_SOURCE_BY_IDENTITY[identity]
  );
}

export function foremanAudioCueIdentitiesAreStateBound(): boolean {
  return FOREMAN_AUDIO_CUE_IDENTITIES.every((identity) =>
    FOREMAN_AVATAR_STATES.includes(identity)
  );
}

export function isLocalForemanAudioSource(source: string | null): boolean {
  return Boolean(
    source &&
      source.startsWith("/audio/foreman/") &&
      source.endsWith(".wav") &&
      !source.includes("://") &&
      !source.startsWith("//")
  );
}

export function normalizeForemanAudioVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_FOREMAN_AUDIO_VOLUME;
  }

  return Math.min(MAX_FOREMAN_AUDIO_VOLUME, Math.max(0, value));
}

export function shouldAttemptForemanAudioPlayback({
  muted,
  previousSource,
  source,
}: {
  muted: boolean;
  previousSource: string | null;
  source: string | null;
}): boolean {
  return (
    !muted &&
    isLocalForemanAudioSource(source) &&
    source !== previousSource
  );
}
