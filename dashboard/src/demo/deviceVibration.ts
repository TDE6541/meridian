import { useEffect, useRef, useState } from "react";

export type AuthorityVibrationStatus =
  | "idle"
  | "skipped"
  | "unsupported"
  | "vibrated"
  | "declined";

export interface DemoVibrationNavigator {
  vibrate?: (pattern: number | readonly number[]) => boolean;
}

export interface AuthorityVibrationAttempt {
  reason: string;
  signalId: string | null;
  status: AuthorityVibrationStatus;
}

export interface AuthorityVibrationInput {
  enabled: boolean;
  navigatorLike?: DemoVibrationNavigator | null;
  pattern?: readonly number[];
  signalId: string | null;
}

export function requestAuthoritySignalVibration({
  enabled,
  navigatorLike,
  pattern = [80, 40, 80],
  signalId,
}: AuthorityVibrationInput): AuthorityVibrationAttempt {
  if (!signalId) {
    return {
      reason: "No authority request signal is active.",
      signalId,
      status: "idle",
    };
  }

  if (!enabled) {
    return {
      reason: "Judge-phone vibration is disabled for this dashboard-local role.",
      signalId,
      status: "skipped",
    };
  }

  if (!navigatorLike || typeof navigatorLike.vibrate !== "function") {
    return {
      reason: "Browser Vibration API is unavailable; visual SyncPill remains active.",
      signalId,
      status: "unsupported",
    };
  }

  const accepted = navigatorLike.vibrate(pattern);

  return {
    reason: accepted
      ? "Browser accepted the authority request vibration cue."
      : "Browser declined the authority request vibration cue.",
    signalId,
    status: accepted ? "vibrated" : "declined",
  };
}

export function useJudgeAuthorityRequestVibration({
  enabled,
  navigatorLike,
  signalId,
}: AuthorityVibrationInput): AuthorityVibrationAttempt {
  const lastSignalId = useRef<string | null>(null);
  const [attempt, setAttempt] = useState<AuthorityVibrationAttempt>({
    reason: "No authority request signal is active.",
    signalId: null,
    status: "idle",
  });

  useEffect(() => {
    if (!signalId) {
      setAttempt({
        reason: "No authority request signal is active.",
        signalId: null,
        status: "idle",
      });
      return;
    }

    if (lastSignalId.current === signalId) {
      return;
    }

    lastSignalId.current = signalId;
    setAttempt(
      requestAuthoritySignalVibration({
        enabled,
        navigatorLike:
          navigatorLike ??
          (typeof globalThis.navigator === "undefined"
            ? null
            : (globalThis.navigator as DemoVibrationNavigator)),
        signalId,
      })
    );
  }, [enabled, navigatorLike, signalId]);

  return attempt;
}
