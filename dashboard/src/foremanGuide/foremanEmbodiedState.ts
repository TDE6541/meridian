import type {
  MissionForemanEmbodiedState,
  MissionPhysicalProjectionV1,
} from "../demo/missionPhysicalProjection.ts";
import type {
  MissionForemanModeId,
  MissionPlaybackMode,
  MissionStageId,
} from "../demo/missionPlaybackPlan.ts";
import type {
  ForemanConductorVoiceStatus,
} from "../demo/foremanAutonomousConductor.ts";
import type { ProofSpotlightTarget } from "../demo/proofSpotlightTargets.ts";

export const FOREMAN_EMBODIED_STATE_VERSION =
  "meridian.v2d.foremanEmbodiedState.v1" as const;

export const FOREMAN_EMBODIED_STATES: readonly MissionForemanEmbodiedState[] = [
  "idle",
  "ready",
  "conducting",
  "explaining",
  "challenged",
  "holding",
  "warning",
  "blocked",
  "authority_wait",
  "proofing",
  "public_boundary",
  "resetting",
  "complete",
] as const;

export interface ForemanEmbodiedStateDisplay {
  ariaLabel: string;
  className: string;
  label: string;
  state: MissionForemanEmbodiedState;
  tone: "active" | "blocked" | "complete" | "hold" | "idle" | "warning";
}

export interface ForemanProjectionDisplay {
  activeHoldSummary: string | null;
  attentionTargetId: string | null;
  attentionTargetLabel: string;
  boundarySummary: string;
  conductorPosture: "Foreman is conducting" | "Operator-guided";
  currentLine: string;
  embodied: ForemanEmbodiedStateDisplay;
  guideModeLabel: string;
  hasActiveHold: boolean;
  hasCarriedHolds: boolean;
  missionModeLabel: "Foreman Autonomous" | "Guided Mission";
  motionLabel: "Reduced motion safe";
  proofTarget: ProofSpotlightTarget | null;
  stageLabel: string;
  stageId: MissionStageId | null;
  typedFallbackLabel: string;
  version: typeof FOREMAN_EMBODIED_STATE_VERSION;
  voiceLabel: string;
}

export const FOREMAN_EMBODIED_STATE_DISPLAY: Record<
  MissionForemanEmbodiedState,
  ForemanEmbodiedStateDisplay
> = {
  authority_wait: {
    ariaLabel: "Foreman is waiting on bounded authority posture.",
    className: "authority-wait",
    label: "Authority wait",
    state: "authority_wait",
    tone: "hold",
  },
  blocked: {
    ariaLabel: "Foreman is blocked by a boundary condition.",
    className: "blocked",
    label: "Blocked",
    state: "blocked",
    tone: "blocked",
  },
  challenged: {
    ariaLabel: "Foreman is in a challenged proof posture.",
    className: "challenged",
    label: "Challenged",
    state: "challenged",
    tone: "warning",
  },
  complete: {
    ariaLabel: "Foreman has completed the scripted mission path.",
    className: "complete",
    label: "Complete",
    state: "complete",
    tone: "complete",
  },
  conducting: {
    ariaLabel: "Foreman is conducting the scripted proof sequence.",
    className: "conducting",
    label: "Conducting",
    state: "conducting",
    tone: "active",
  },
  explaining: {
    ariaLabel: "Foreman is explaining existing proof.",
    className: "explaining",
    label: "Explaining",
    state: "explaining",
    tone: "active",
  },
  holding: {
    ariaLabel: "Foreman is holding because proof is missing or bounded.",
    className: "holding",
    label: "Holding",
    state: "holding",
    tone: "hold",
  },
  idle: {
    ariaLabel: "Foreman is idle.",
    className: "idle",
    label: "Idle",
    state: "idle",
    tone: "idle",
  },
  proofing: {
    ariaLabel: "Foreman is pointing at proof already present in the dashboard.",
    className: "proofing",
    label: "Proofing",
    state: "proofing",
    tone: "active",
  },
  public_boundary: {
    ariaLabel: "Foreman is explaining the public disclosure boundary.",
    className: "public-boundary",
    label: "Public boundary",
    state: "public_boundary",
    tone: "warning",
  },
  ready: {
    ariaLabel: "Foreman is ready for the scripted mission.",
    className: "ready",
    label: "Ready",
    state: "ready",
    tone: "idle",
  },
  resetting: {
    ariaLabel: "Foreman is resetting the local mission state.",
    className: "resetting",
    label: "Resetting",
    state: "resetting",
    tone: "warning",
  },
  warning: {
    ariaLabel: "Foreman is warning that proof posture needs attention.",
    className: "warning",
    label: "Warning",
    state: "warning",
    tone: "warning",
  },
};

const MISSION_MODE_LABELS: Record<MissionPlaybackMode, ForemanProjectionDisplay["missionModeLabel"]> = {
  foreman_autonomous: "Foreman Autonomous",
  guided: "Guided Mission",
};

const GUIDE_MODE_LABELS: Record<MissionForemanModeId, string> = {
  absence: "Absence",
  challenge: "Challenge",
  public: "Public",
  walk: "Walk",
};

function displayStageLabel(
  projection: MissionPhysicalProjectionV1 | null | undefined
): string {
  if (!projection) {
    return "No active mission";
  }

  if (!projection.active_stage_id) {
    return "No active mission";
  }

  const stage = projection.stages.find(
    (entry) => entry.stage_id === projection.active_stage_id
  );

  return stage
    ? `${stage.label} (${stage.stage_id})`
    : projection.active_stage_id;
}

function displayGuideMode(
  projection: MissionPhysicalProjectionV1 | null | undefined
): string {
  const mode = projection?.foreman.mode;

  return mode ? GUIDE_MODE_LABELS[mode] : "No active guide mode";
}

function displayVoiceStatus(
  projection: MissionPhysicalProjectionV1 | null | undefined
): string {
  if (!projection) {
    return "Not started";
  }

  if (projection.foreman.paused) {
    return "Muted";
  }

  const labels: Record<ForemanConductorVoiceStatus, string> = {
    available: "Available",
    blocked: "Blocked",
    not_started: "Not started",
    unavailable: "Typed fallback",
  };

  return labels[projection.foreman.voice_status];
}

function typedFallbackLabel(
  projection: MissionPhysicalProjectionV1 | null | undefined
): string {
  if (!projection) {
    return "Typed fallback visible: no active mission line is available.";
  }

  if (projection.foreman.voice_status === "available" && !projection.foreman.paused) {
    return "Typed fallback remains visible even when voice is available.";
  }

  return "Typed fallback visible for this Foreman line.";
}

function proofTargetFor(
  projection: MissionPhysicalProjectionV1 | null | undefined
): ProofSpotlightTarget | null {
  const attentionTargetId = projection?.foreman.attention_target_id;

  if (!attentionTargetId) {
    return projection?.spotlight.active_targets[0] ?? null;
  }

  return (
    projection?.spotlight.active_targets.find(
      (target) => target.target_id === attentionTargetId
    ) ??
    projection?.spotlight.all_targets.find(
      (target) => target.target_id === attentionTargetId
    ) ??
    null
  );
}

export function getForemanEmbodiedStateDisplay(
  state: MissionForemanEmbodiedState
): ForemanEmbodiedStateDisplay {
  return FOREMAN_EMBODIED_STATE_DISPLAY[state];
}

export function deriveForemanProjectionDisplay(
  projection?: MissionPhysicalProjectionV1 | null
): ForemanProjectionDisplay {
  const embodiedState = projection?.foreman.embodied_state ?? "ready";
  const proofTarget = proofTargetFor(projection);
  const activeHold =
    projection?.holds.find((hold) => hold.status === "active_hold") ?? null;
  const hasCarriedHolds =
    projection?.holds.some((hold) => hold.status === "carried_hold") ?? false;
  const attentionTargetId =
    projection?.foreman.attention_target_id ?? proofTarget?.target_id ?? null;

  return {
    activeHoldSummary: activeHold?.summary ?? null,
    attentionTargetId,
    attentionTargetLabel:
      proofTarget?.label ??
      attentionTargetId ??
      "No proof target selected",
    boundarySummary:
      "Foreman conducts the scripted proof sequence. It does not create governance truth.",
    conductorPosture:
      projection?.mode === "foreman_autonomous"
        ? "Foreman is conducting"
        : "Operator-guided",
    currentLine:
      projection?.foreman.current_line ??
      "Mission physical projection is ready.",
    embodied: getForemanEmbodiedStateDisplay(embodiedState),
    guideModeLabel: displayGuideMode(projection),
    hasActiveHold: Boolean(activeHold),
    hasCarriedHolds,
    missionModeLabel: MISSION_MODE_LABELS[projection?.mode ?? "guided"],
    motionLabel: "Reduced motion safe",
    proofTarget,
    stageId: projection?.active_stage_id ?? null,
    stageLabel: displayStageLabel(projection),
    typedFallbackLabel: typedFallbackLabel(projection),
    version: FOREMAN_EMBODIED_STATE_VERSION,
    voiceLabel: displayVoiceStatus(projection),
  };
}
