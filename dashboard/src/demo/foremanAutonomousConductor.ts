import {
  FOREMAN_AUTONOMOUS_PLAYBACK_POLICY,
  type ForemanAutonomousPlaybackPolicy,
} from "./foremanAutonomousPolicy.ts";
import {
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "./missionPlaybackController.ts";
import {
  getForemanModeForMissionStage,
  isMissionStageId,
  MISSION_STAGE_IDS,
  type MissionForemanModeId,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";
import {
  evaluateMissionStageReadiness,
  type MissionCueReadiness,
  type MissionCueStatus,
  type MissionStageReadinessInput,
  type MissionStageReadinessResult,
} from "./missionStageReadiness.ts";
import {
  FOREMAN_MISSION_CUE_MANIFEST,
  getForemanMissionCueForStage,
  validateForemanMissionCueManifest,
  type ForemanMissionCue,
} from "./foremanMissionCues.ts";

export const FOREMAN_AUTONOMOUS_CONDUCTOR_VERSION =
  "meridian.v2d.foremanAutonomousConductor.v1" as const;

export type ForemanAutonomousConductorStatus =
  | "advanced"
  | "completed"
  | "cue_emitted"
  | "holding"
  | "idle"
  | "paused"
  | "waiting";

export type ForemanConductorVoiceStatus =
  | "available"
  | "blocked"
  | "not_started"
  | "unavailable";

export interface ForemanAutonomousBoundaryFlags {
  dashboardLocalOnly: true;
  noAbsenceTruthCreated: true;
  noAuthorityTruthCreated: true;
  noExternalVoiceDependency: true;
  noForensicTruthCreated: true;
  noGovernanceTruthCreated: true;
  noModelApiNetworkKeyBehavior: true;
  noProductionCityClaim: true;
  noRootForensicChainWrite: true;
  noRootSkinImport: true;
  noSharedContractWidening: true;
  noUiSideEffects: true;
  typedFallbackRequired: true;
  voiceOptional: true;
}

export interface ForemanAutonomousConductorState {
  emittedCueIds: readonly string[];
  runId: string | null;
  version: typeof FOREMAN_AUTONOMOUS_CONDUCTOR_VERSION;
}

export interface ForemanMissionCueEvent {
  atMs: number;
  attentionTargetHint: string;
  boundaryNote: string;
  cueId: string;
  eventId: string;
  foremanMode: MissionForemanModeId;
  line: string;
  proofIntent: string;
  runId: string;
  stageId: MissionStageId;
  typedFallbackText: string;
  voiceRequired: false;
  voiceStatus: ForemanConductorVoiceStatus;
}

export type ForemanConductorControllerCommand =
  | { applied: false; reason: string; type: "none" }
  | { applied: true; type: "autonomous_tick" | "begin_mission" }
  | { applied: true; reason: string; type: "hold" };

export interface ForemanCueRuntimeState {
  attentionTargetAvailable?: boolean;
  foremanCueStatus?: MissionCueStatus;
  proofCueStatus?: MissionCueStatus;
  voiceStatus?: ForemanConductorVoiceStatus;
}

export type ForemanConductorReadinessInput = Omit<
  MissionStageReadinessInput,
  | "activeStageId"
  | "enteredAtMs"
  | "foremanCue"
  | "minDwellMs"
  | "mode"
  | "nowMs"
  | "proofCue"
  | "stageId"
>;

export interface RunForemanAutonomousConductorInput {
  conductorState?: ForemanAutonomousConductorState;
  cueManifest?: readonly ForemanMissionCue[];
  cueRuntime?: Partial<Record<MissionStageId, ForemanCueRuntimeState>>;
  nowMs: number;
  playbackState: MissionPlaybackState;
  policy?: ForemanAutonomousPlaybackPolicy | null;
  readiness?: ForemanConductorReadinessInput | null;
  resetCleanupVerified?: boolean;
}

export interface ForemanAutonomousConductorOutput {
  attentionTargetHint: string | null;
  boundaryFlags: ForemanAutonomousBoundaryFlags;
  conductorState: ForemanAutonomousConductorState;
  controllerState: MissionPlaybackState;
  currentCueId: string | null;
  currentStageId: MissionStageId | null;
  cueEvent: ForemanMissionCueEvent | null;
  foremanGuideMode: MissionForemanModeId | null;
  holds: readonly string[];
  nextControllerCommand: ForemanConductorControllerCommand;
  readinessResult: MissionStageReadinessResult | null;
  recommendation: string;
  status: ForemanAutonomousConductorStatus;
  version: typeof FOREMAN_AUTONOMOUS_CONDUCTOR_VERSION;
  warnings: readonly string[];
}

export const FOREMAN_AUTONOMOUS_BOUNDARY_FLAGS: ForemanAutonomousBoundaryFlags =
  {
    dashboardLocalOnly: true,
    noAbsenceTruthCreated: true,
    noAuthorityTruthCreated: true,
    noExternalVoiceDependency: true,
    noForensicTruthCreated: true,
    noGovernanceTruthCreated: true,
    noModelApiNetworkKeyBehavior: true,
    noProductionCityClaim: true,
    noRootForensicChainWrite: true,
    noRootSkinImport: true,
    noSharedContractWidening: true,
    noUiSideEffects: true,
    typedFallbackRequired: true,
    voiceOptional: true,
  };

export function createInitialForemanAutonomousConductorState(
  runId: string | null = null
): ForemanAutonomousConductorState {
  return {
    emittedCueIds: [],
    runId,
    version: FOREMAN_AUTONOMOUS_CONDUCTOR_VERSION,
  };
}

function validatePolicy(
  policy: ForemanAutonomousPlaybackPolicy | null
): readonly string[] {
  const holds: string[] = [];

  if (!policy) {
    return ["autonomous_policy_missing"];
  }

  if (policy.mode !== "foreman_autonomous") {
    holds.push("autonomous_policy_mode_invalid");
  }

  if (policy.optionalCueFailureBehavior !== "warn_and_continue") {
    holds.push("autonomous_policy_optional_cue_behavior_invalid");
  }

  if (policy.requiredCueFailureBehavior !== "hold") {
    holds.push("autonomous_policy_required_cue_behavior_invalid");
  }

  if (policy.voiceIsOptional !== true) {
    holds.push("autonomous_policy_voice_optional_invalid");
  }

  if (
    policy.stageOrder.length !== MISSION_STAGE_IDS.length ||
    policy.stageOrder.some((stageId, index) => stageId !== MISSION_STAGE_IDS[index])
  ) {
    holds.push("autonomous_policy_stage_order_invalid");
  }

  if (policy.minStageDwellMs < 0 || policy.maxStageDwellMs < policy.minStageDwellMs) {
    holds.push("autonomous_policy_dwell_invalid");
  }

  return holds;
}

function alignConductorState(
  conductorState: ForemanAutonomousConductorState | undefined,
  playbackState: MissionPlaybackState
): ForemanAutonomousConductorState {
  const current =
    conductorState ?? createInitialForemanAutonomousConductorState(playbackState.runId);

  if (current.runId !== playbackState.runId) {
    return createInitialForemanAutonomousConductorState(playbackState.runId);
  }

  if (
    playbackState.status === "idle" &&
    playbackState.currentStageId === null &&
    playbackState.completedStageIds.length === 0 &&
    playbackState.events.length === 0 &&
    current.emittedCueIds.length > 0
  ) {
    return createInitialForemanAutonomousConductorState(playbackState.runId);
  }

  return current;
}

function holdControllerState(
  playbackState: MissionPlaybackState,
  reason: string,
  nowMs: number
): MissionPlaybackState {
  return playbackState.status === "holding"
    ? playbackState
    : missionPlaybackReducer(playbackState, {
        nowMs,
        reason,
        type: "hold",
      });
}

function makeOutput({
  attentionTargetHint,
  conductorState,
  controllerState,
  cue,
  cueEvent,
  holds = [],
  nextControllerCommand,
  readinessResult,
  recommendation,
  status,
  warnings = [],
}: {
  attentionTargetHint: string | null;
  conductorState: ForemanAutonomousConductorState;
  controllerState: MissionPlaybackState;
  cue: ForemanMissionCue | null;
  cueEvent: ForemanMissionCueEvent | null;
  holds?: readonly string[];
  nextControllerCommand: ForemanConductorControllerCommand;
  readinessResult: MissionStageReadinessResult | null;
  recommendation: string;
  status: ForemanAutonomousConductorStatus;
  warnings?: readonly string[];
}): ForemanAutonomousConductorOutput {
  return {
    attentionTargetHint,
    boundaryFlags: FOREMAN_AUTONOMOUS_BOUNDARY_FLAGS,
    conductorState,
    controllerState,
    currentCueId: cue?.cueId ?? null,
    currentStageId: cue?.stageId ?? controllerState.currentStageId,
    cueEvent,
    foremanGuideMode: cue?.foremanMode ?? controllerState.activeForemanMode,
    holds,
    nextControllerCommand,
    readinessResult,
    recommendation,
    status,
    version: FOREMAN_AUTONOMOUS_CONDUCTOR_VERSION,
    warnings,
  };
}

function stageForConductor(
  playbackState: MissionPlaybackState
): MissionStageId | null {
  if (playbackState.status === "idle") {
    return MISSION_STAGE_IDS[0];
  }

  if (playbackState.currentStageId && isMissionStageId(playbackState.currentStageId)) {
    return playbackState.currentStageId;
  }

  return null;
}

function validateControllerState(
  playbackState: MissionPlaybackState
): readonly string[] {
  const holds: string[] = [];
  const activeStage = playbackState.currentStageId;

  if (playbackState.status === "resetting") {
    holds.push("reset_cleanup_unverified");
  }

  if (
    playbackState.status === "idle" &&
    (activeStage !== null ||
      playbackState.stageEnteredAtMs !== null ||
      playbackState.completedStageIds.length > 0)
  ) {
    holds.push("controller_state_inconsistent");
  }

  if (activeStage !== null && !isMissionStageId(activeStage)) {
    holds.push("invalid_stage_id");
  }

  for (const completedStageId of playbackState.completedStageIds) {
    if (!isMissionStageId(completedStageId)) {
      holds.push("completed_stage_id_invalid");
    }
  }

  if (
    (playbackState.status === "running" || playbackState.status === "paused") &&
    !activeStage
  ) {
    holds.push("controller_state_inconsistent");
  }

  if (
    (playbackState.status === "running" || playbackState.status === "paused") &&
    activeStage &&
    isMissionStageId(activeStage) &&
    playbackState.activeForemanMode !== getForemanModeForMissionStage(activeStage)
  ) {
    holds.push("mode_state_inconsistent");
  }

  if (
    playbackState.status === "running" &&
    activeStage &&
    playbackState.stageEnteredAtMs === null
  ) {
    holds.push("controller_state_inconsistent");
  }

  return holds;
}

function cueRuntimeFor(
  stageId: MissionStageId,
  cueRuntime: Partial<Record<MissionStageId, ForemanCueRuntimeState>> | undefined
): ForemanCueRuntimeState {
  return cueRuntime?.[stageId] ?? {};
}

function makeCueReadiness(
  cue: ForemanMissionCue,
  runtime: ForemanCueRuntimeState
): { foremanCue: MissionCueReadiness; proofCue: MissionCueReadiness } {
  return {
    foremanCue: {
      required: cue.required,
      source: cue.cueId,
      status: runtime.foremanCueStatus ?? "ready",
    },
    proofCue: {
      required: cue.proofIntentRequired,
      source: `${cue.cueId}:proof_intent`,
      status: runtime.proofCueStatus ?? "ready",
    },
  };
}

function makeReadinessInput({
  cue,
  nowMs,
  playbackState,
  policy,
  readiness,
  runtime,
  stageId,
}: {
  cue: ForemanMissionCue;
  nowMs: number;
  playbackState: MissionPlaybackState;
  policy: ForemanAutonomousPlaybackPolicy;
  readiness: ForemanConductorReadinessInput;
  runtime: ForemanCueRuntimeState;
  stageId: MissionStageId;
}): MissionStageReadinessInput {
  const cueReadiness = makeCueReadiness(cue, runtime);

  return {
    ...readiness,
    activeStageId: stageId,
    enteredAtMs:
      playbackState.status === "idle" ? nowMs : playbackState.stageEnteredAtMs,
    foremanCue: cueReadiness.foremanCue,
    minDwellMs:
      playbackState.status === "idle" ? 0 : policy.minStageDwellMs,
    mode: playbackState.mode,
    nowMs,
    proofCue: cueReadiness.proofCue,
    stageId,
  };
}

function toControllerReadiness(
  readiness: MissionStageReadinessInput
): Omit<
  MissionStageReadinessInput,
  "enteredAtMs" | "minDwellMs" | "mode" | "stageId"
> {
  const { enteredAtMs: _enteredAtMs, minDwellMs: _minDwellMs, mode: _mode, stageId: _stageId, ...controllerReadiness } =
    readiness;

  return controllerReadiness;
}

function voiceWarnings(
  cue: ForemanMissionCue,
  runtime: ForemanCueRuntimeState
): readonly string[] {
  const voiceStatus = runtime.voiceStatus ?? "not_started";

  return voiceStatus === "available"
    ? []
    : [`voice_${voiceStatus}_typed_fallback_used:${cue.cueId}`];
}

function optionalTargetWarnings(
  cue: ForemanMissionCue,
  runtime: ForemanCueRuntimeState
): readonly string[] {
  return runtime.attentionTargetAvailable === false
    ? [`optional_attention_target_unavailable:${cue.attentionTargetHint}`]
    : [];
}

function makeCueEvent({
  cue,
  nowMs,
  playbackState,
  runtime,
}: {
  cue: ForemanMissionCue;
  nowMs: number;
  playbackState: MissionPlaybackState;
  runtime: ForemanCueRuntimeState;
}): ForemanMissionCueEvent {
  const voiceStatus = runtime.voiceStatus ?? "not_started";

  return {
    atMs: nowMs,
    attentionTargetHint: cue.attentionTargetHint,
    boundaryNote: cue.boundaryNote,
    cueId: cue.cueId,
    eventId: `${playbackState.runId}:${cue.cueId}:cue_emitted`,
    foremanMode: cue.foremanMode,
    line: cue.line,
    proofIntent: cue.proofIntent,
    runId: playbackState.runId,
    stageId: cue.stageId,
    typedFallbackText: cue.typedFallbackText,
    voiceRequired: false,
    voiceStatus,
  };
}

function appendCueEmission(
  conductorState: ForemanAutonomousConductorState,
  cueId: string
): ForemanAutonomousConductorState {
  return conductorState.emittedCueIds.includes(cueId)
    ? conductorState
    : {
        ...conductorState,
        emittedCueIds: [...conductorState.emittedCueIds, cueId],
      };
}

export function runForemanAutonomousConductor(
  input: RunForemanAutonomousConductorInput
): ForemanAutonomousConductorOutput {
  const policy =
    input.policy === undefined
      ? FOREMAN_AUTONOMOUS_PLAYBACK_POLICY
      : input.policy;
  const manifest = input.cueManifest ?? FOREMAN_MISSION_CUE_MANIFEST;
  const conductorState = alignConductorState(
    input.conductorState,
    input.playbackState
  );
  const policyHolds = validatePolicy(policy);
  const manifestValidation = validateForemanMissionCueManifest(manifest);
  const modeHolds =
    input.playbackState.mode === "foreman_autonomous"
      ? []
      : ["playback_mode_not_foreman_autonomous"];
  const resetHolds =
    input.resetCleanupVerified === false ? ["reset_cleanup_unverified"] : [];
  const controllerHolds = validateControllerState(input.playbackState);
  const earlyHolds = [
    ...policyHolds,
    ...manifestValidation.holds,
    ...modeHolds,
    ...resetHolds,
    ...controllerHolds,
  ];
  const stageId = stageForConductor(input.playbackState);
  const cue = stageId ? getForemanMissionCueForStage(stageId, manifest) : null;

  if (earlyHolds.length > 0) {
    const reason = earlyHolds[0];
    return makeOutput({
      attentionTargetHint: cue?.attentionTargetHint ?? null,
      conductorState,
      controllerState: holdControllerState(input.playbackState, reason, input.nowMs),
      cue,
      cueEvent: null,
      holds: earlyHolds,
      nextControllerCommand: {
        applied: true,
        reason,
        type: "hold",
      },
      readinessResult: null,
      recommendation: "hold",
      status: "holding",
      warnings: [],
    });
  }

  if (!policy) {
    return makeOutput({
      attentionTargetHint: null,
      conductorState,
      controllerState: input.playbackState,
      cue: null,
      cueEvent: null,
      holds: ["autonomous_policy_missing"],
      nextControllerCommand: {
        applied: false,
        reason: "autonomous_policy_missing",
        type: "none",
      },
      readinessResult: null,
      recommendation: "hold",
      status: "holding",
      warnings: [],
    });
  }

  if (input.playbackState.status === "completed") {
    return makeOutput({
      attentionTargetHint: null,
      conductorState,
      controllerState: input.playbackState,
      cue: null,
      cueEvent: null,
      holds: [],
      nextControllerCommand: {
        applied: false,
        reason: "mission_already_completed",
        type: "none",
      },
      readinessResult: null,
      recommendation: "no_action",
      status: "completed",
      warnings: [],
    });
  }

  if (input.playbackState.status === "paused") {
    return makeOutput({
      attentionTargetHint: cue?.attentionTargetHint ?? null,
      conductorState,
      controllerState: input.playbackState,
      cue,
      cueEvent: null,
      holds: [],
      nextControllerCommand: {
        applied: false,
        reason: "mission_paused",
        type: "none",
      },
      readinessResult: null,
      recommendation: "resume_before_tick",
      status: "paused",
      warnings: [],
    });
  }

  if (input.playbackState.status === "holding") {
    return makeOutput({
      attentionTargetHint: cue?.attentionTargetHint ?? null,
      conductorState,
      controllerState: input.playbackState,
      cue,
      cueEvent: null,
      holds: [input.playbackState.hold?.reason ?? "controller_holding"],
      nextControllerCommand: {
        applied: false,
        reason: "controller_holding",
        type: "none",
      },
      readinessResult: null,
      recommendation: "hold",
      status: "holding",
      warnings: [],
    });
  }

  if (!stageId || !cue) {
    const reason = stageId ? `stage_cue_missing:${stageId}` : "invalid_stage_id";
    return makeOutput({
      attentionTargetHint: null,
      conductorState,
      controllerState: holdControllerState(input.playbackState, reason, input.nowMs),
      cue: null,
      cueEvent: null,
      holds: [reason],
      nextControllerCommand: {
        applied: true,
        reason,
        type: "hold",
      },
      readinessResult: null,
      recommendation: "hold",
      status: "holding",
      warnings: [],
    });
  }

  if (!input.readiness) {
    const reason = "required_readiness_missing";
    return makeOutput({
      attentionTargetHint: cue.attentionTargetHint,
      conductorState,
      controllerState: holdControllerState(input.playbackState, reason, input.nowMs),
      cue,
      cueEvent: null,
      holds: [reason],
      nextControllerCommand: {
        applied: true,
        reason,
        type: "hold",
      },
      readinessResult: null,
      recommendation: "hold",
      status: "holding",
      warnings: [],
    });
  }

  const runtime = cueRuntimeFor(stageId, input.cueRuntime);
  const readinessInput = makeReadinessInput({
    cue,
    nowMs: input.nowMs,
    playbackState: input.playbackState,
    policy,
    readiness: input.readiness,
    runtime,
    stageId,
  });
  const readinessResult = evaluateMissionStageReadiness(readinessInput);
  const warnings = [
    ...readinessResult.warnings,
    ...optionalTargetWarnings(cue, runtime),
    ...voiceWarnings(cue, runtime),
  ];

  if (readinessResult.status === "hold") {
    const reason = readinessResult.holds[0] ?? "readiness_hold";
    return makeOutput({
      attentionTargetHint: cue.attentionTargetHint,
      conductorState,
      controllerState: holdControllerState(input.playbackState, reason, input.nowMs),
      cue,
      cueEvent: null,
      holds: readinessResult.holds,
      nextControllerCommand: {
        applied: true,
        reason,
        type: "hold",
      },
      readinessResult,
      recommendation: "hold",
      status: "holding",
      warnings,
    });
  }

  const cueAlreadyEmitted = conductorState.emittedCueIds.includes(cue.cueId);

  if (!cueAlreadyEmitted) {
    const nextConductorState = appendCueEmission(conductorState, cue.cueId);
    const cueEvent = makeCueEvent({
      cue,
      nowMs: input.nowMs,
      playbackState: input.playbackState,
      runtime,
    });

    if (input.playbackState.status === "idle") {
      const controllerState = missionPlaybackReducer(input.playbackState, {
        nowMs: input.nowMs,
        readiness: toControllerReadiness(readinessInput),
        type: "begin_mission",
      });

      return makeOutput({
        attentionTargetHint: cue.attentionTargetHint,
        conductorState: nextConductorState,
        controllerState,
        cue,
        cueEvent,
        holds: [],
        nextControllerCommand: {
          applied: true,
          type: "begin_mission",
        },
        readinessResult,
        recommendation: "emit_cue",
        status: "cue_emitted",
        warnings,
      });
    }

    return makeOutput({
      attentionTargetHint: cue.attentionTargetHint,
      conductorState: nextConductorState,
      controllerState: input.playbackState,
      cue,
      cueEvent,
      holds: [],
      nextControllerCommand: {
        applied: false,
        reason: "cue_emitted_before_advance",
        type: "none",
      },
      readinessResult,
      recommendation: "autonomous_tick_after_cue",
      status: "cue_emitted",
      warnings,
    });
  }

  if (!readinessResult.ready) {
    return makeOutput({
      attentionTargetHint: cue.attentionTargetHint,
      conductorState,
      controllerState: input.playbackState,
      cue,
      cueEvent: null,
      holds: [],
      nextControllerCommand: {
        applied: false,
        reason: "waiting_for_dwell_or_readiness",
        type: "none",
      },
      readinessResult,
      recommendation: "wait_for_dwell_or_readiness",
      status: "waiting",
      warnings,
    });
  }

  const controllerState = missionPlaybackReducer(input.playbackState, {
    nowMs: input.nowMs,
    readiness: toControllerReadiness(readinessInput),
    type: "autonomous_tick",
  });

  return makeOutput({
    attentionTargetHint: cue.attentionTargetHint,
    conductorState,
    controllerState,
    cue,
    cueEvent: null,
    holds: [],
    nextControllerCommand: {
      applied: true,
      type: "autonomous_tick",
    },
    readinessResult,
    recommendation: controllerState.status === "completed" ? "no_action" : "emit_next_stage_cue",
    status: controllerState.status === "completed" ? "completed" : "advanced",
    warnings,
  });
}
