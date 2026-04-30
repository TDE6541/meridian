import type { MissionStageId } from "../demo/missionPlaybackPlan.ts";
import {
  speakForemanText,
  stopForemanSpeech,
  type ForemanVoiceBrowserTarget,
} from "./voiceSupport.ts";
import type {
  ForemanLiveVoicePlayback,
  ForemanLiveVoiceTransport,
} from "./liveVoiceTransport.ts";

export const FOREMAN_MISSION_NARRATION_VERSION =
  "meridian.v2f.foremanMissionNarration.v1" as const;

export const MISSION_NARRATION_ABSENCE_SILENCE_MS = 3000 as const;

const MIN_TYPED_FALLBACK_MS = 1800;
const MAX_TYPED_FALLBACK_MS = 7200;
const NARRATION_FAILSAFE_PAD_MS = 1200;

export type ForemanMissionNarrationPhase =
  | "complete"
  | "fallback"
  | "idle"
  | "silence"
  | "speaking";

export type ForemanMissionNarrationCompletionReason =
  | "cancelled"
  | "fallback_complete"
  | "failsafe"
  | "speech_end";

export interface ForemanMissionNarrationView {
  key: string | null;
  line: string | null;
  issue: string | null;
  phase: ForemanMissionNarrationPhase;
}

export const IDLE_FOREMAN_MISSION_NARRATION_VIEW: ForemanMissionNarrationView = {
  issue: null,
  key: null,
  line: null,
  phase: "idle",
};

export interface MissionActNarration {
  index: number;
  line: string;
  lineKey: string;
  stageId: MissionStageId;
  title: string;
}

export interface ForemanMissionNarrationRun {
  cancel: () => void;
  key: string;
  line: string;
}

export const MISSION_ACT_NARRATION: Record<MissionStageId, MissionActNarration> = {
  absence: {
    index: 4,
    line:
      "This is the moat. Meridian detected what is missing. The city cannot act until the absent evidence is present.",
    lineKey: "act-4-absence-moat",
    stageId: "absence",
    title: "Absence",
  },
  authority: {
    index: 2,
    line:
      "The inspector is requesting authority to escalate. Meridian will not let this proceed until a department director approves.",
    lineKey: "act-2-authority-director",
    stageId: "authority",
    title: "Authority",
  },
  capture: {
    index: 1,
    line:
      "This is Permit 4471. A field inspector flagged a concern during a routine corridor walk.",
    lineKey: "act-1-capture-permit-4471",
    stageId: "capture",
    title: "Capture",
  },
  chain: {
    index: 5,
    line:
      "Every decision — made, held, blocked, or revoked — is recorded in the forensic chain. This is the audit trail a city attorney can inspect.",
    lineKey: "act-5-chain-audit-trail",
    stageId: "chain",
    title: "Chain",
  },
  governance: {
    index: 3,
    line:
      "Meridian checked the request against civic rules. One required piece was missing, so it held.",
    lineKey: "act-3-governance-held",
    stageId: "governance",
    title: "Governance",
  },
  public: {
    index: 6,
    line:
      "And this is what the public sees. Redacted. Bounded. Public-safe. The city is transparent without being exposed.",
    lineKey: "act-6-public-safe",
    stageId: "public",
    title: "Public",
  },
};

export function getMissionActNarration(
  stageId: MissionStageId
): MissionActNarration {
  return MISSION_ACT_NARRATION[stageId];
}

export function buildMissionNarrationKey({
  lineKey,
  runId,
  stageId,
}: {
  lineKey: string;
  runId: string;
  stageId: MissionStageId;
}): string {
  return `${runId}:${stageId}:${lineKey}`;
}

export function estimateMissionTypedFallbackMs(line: string): number {
  const estimated = 1200 + line.trim().length * 38;

  return Math.min(
    MAX_TYPED_FALLBACK_MS,
    Math.max(MIN_TYPED_FALLBACK_MS, estimated)
  );
}

export function estimateMissionNarrationFailsafeMs(line: string): number {
  return estimateMissionTypedFallbackMs(line) + NARRATION_FAILSAFE_PAD_MS;
}

export function runForemanMissionNarration({
  clearTimer = clearTimeout,
  line,
  lineKey,
  liveVoiceTransport = null,
  onComplete,
  onIssue,
  onPhase,
  onVisibleLine,
  runId,
  setTimer = setTimeout,
  stageId,
  target,
}: {
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
  line: string;
  lineKey: string;
  liveVoiceTransport?: ForemanLiveVoiceTransport | null;
  onComplete?: (reason: ForemanMissionNarrationCompletionReason) => void;
  onIssue?: (issue: string | null) => void;
  onPhase?: (phase: ForemanMissionNarrationPhase) => void;
  onVisibleLine?: (line: string | null) => void;
  runId: string;
  setTimer?: (
    callback: () => void,
    delayMs: number
  ) => ReturnType<typeof setTimeout>;
  stageId: MissionStageId;
  target?: ForemanVoiceBrowserTarget | null;
}): ForemanMissionNarrationRun {
  const key = buildMissionNarrationKey({ lineKey, runId, stageId });
  const timers: ReturnType<typeof setTimeout>[] = [];
  const safeLine = line.trim();
  let liveVoicePlayback: ForemanLiveVoicePlayback | null = null;
  let complete = false;

  const addTimer = (callback: () => void, delayMs: number) => {
    const timer = setTimer(callback, delayMs);
    timers.push(timer);
  };

  const clearTimers = () => {
    timers.splice(0).forEach((timer) => clearTimer(timer));
  };

  const stopLiveVoice = () => {
    liveVoicePlayback?.cancel();
    liveVoicePlayback = null;
  };

  const finish = (reason: ForemanMissionNarrationCompletionReason) => {
    if (complete) {
      return;
    }

    complete = true;
    clearTimers();
    stopLiveVoice();
    onPhase?.("complete");
    onComplete?.(reason);
  };

  const beginTypedFallback = (issue: string | null) => {
    if (complete) {
      return;
    }

    clearTimers();
    onIssue?.(issue);
    onVisibleLine?.(safeLine);
    onPhase?.("fallback");
    addTimer(
      () => finish("fallback_complete"),
      estimateMissionTypedFallbackMs(safeLine)
    );
    addTimer(
      () => finish("failsafe"),
      estimateMissionNarrationFailsafeMs(safeLine)
    );
  };

  const beginBrowserSpeech = (liveVoiceIssue: string | null = null) => {
    if (complete) {
      return;
    }

    clearTimers();
    onIssue?.(liveVoiceIssue);
    onVisibleLine?.(safeLine);
    onPhase?.("speaking");

    const result = speakForemanText({
      onEnd: () => finish("speech_end"),
      onError: (message) => beginTypedFallback(message),
      target,
      text: safeLine,
    });

    if (!result.ok) {
      beginTypedFallback(liveVoiceIssue ?? result.issue);
      return;
    }

    addTimer(
      () => finish("failsafe"),
      estimateMissionNarrationFailsafeMs(safeLine)
    );
  };

  const beginSpeech = () => {
    if (complete) {
      return;
    }

    onIssue?.(null);
    onVisibleLine?.(safeLine);
    onPhase?.("speaking");

    if (!liveVoiceTransport) {
      beginBrowserSpeech();
      return;
    }

    liveVoicePlayback = liveVoiceTransport.speak({
      onState: (state) => {
        if (complete || state === "requesting" || state === "playing") {
          return;
        }

        onIssue?.(
          state === "unavailable" || state === "failed"
            ? "Voice unavailable - showing typed answer."
            : null
        );
      },
      text: safeLine,
    });

    addTimer(
      () => finish("failsafe"),
      estimateMissionNarrationFailsafeMs(safeLine)
    );

    void liveVoicePlayback.finished.then((result) => {
      if (complete) {
        return;
      }

      liveVoicePlayback = null;

      if (result.ok) {
        finish("speech_end");
        return;
      }

      beginBrowserSpeech(result.issue);
    });
  };

  if (stageId === "absence") {
    onIssue?.(null);
    onVisibleLine?.(null);
    onPhase?.("silence");
    addTimer(beginSpeech, MISSION_NARRATION_ABSENCE_SILENCE_MS);
  } else {
    addTimer(beginSpeech, 0);
  }

  return {
    cancel: () => {
      if (complete) {
        return;
      }

      complete = true;
      clearTimers();
      stopLiveVoice();
      stopForemanSpeech(target);
      onPhase?.("idle");
      onComplete?.("cancelled");
    },
    key,
    line: safeLine,
  };
}
