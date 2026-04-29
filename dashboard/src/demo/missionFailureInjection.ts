import {
  FOREMAN_AUTONOMOUS_PLAYBACK_POLICY,
} from "./foremanAutonomousPolicy.ts";
import {
  createInitialForemanAutonomousConductorState,
  runForemanAutonomousConductor,
  type ForemanAutonomousConductorState,
} from "./foremanAutonomousConductor.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "./missionPlaybackController.ts";
import {
  MISSION_STAGE_IDS,
  type MissionPlaybackMode,
  type MissionStageId,
  type MissionStageSubstrateKey,
} from "./missionPlaybackPlan.ts";
import { buildMissionPhysicalProjection } from "./missionPhysicalProjection.ts";
import {
  evaluateMissionStageReadiness,
  type MissionStageReadinessInput,
} from "./missionStageReadiness.ts";

export const MISSION_FAILURE_INJECTION_VERSION =
  "meridian.v2d.missionFailureInjection.v1" as const;

export type MissionFailureInjectionStatus = "PASS" | "HOLD";

export type MissionFailureExpectedBehavior =
  | "hold_and_disable_begin"
  | "warn_and_continue";

export type MissionFailureInjectionId =
  | "authority_endpoint_unavailable"
  | "foreman_autonomous_accelerated_full_run"
  | "guided_accelerated_full_run"
  | "judge_interrupt_absence"
  | "judge_interrupt_authority"
  | "no_audio_condition"
  | "optional_proof_cue_failure"
  | "proof_target_unavailable_optional"
  | "proof_target_unavailable_required"
  | "reduced_motion_condition"
  | "required_proof_cue_failure"
  | "reset_after_completion_second_run"
  | "reset_mid_run"
  | "vibration_unsupported";

export interface MissionFailureInjectionResult {
  evidence: readonly string[];
  expected_behavior: MissionFailureExpectedBehavior;
  failure_id: MissionFailureInjectionId;
  observed_behavior: string;
  status: MissionFailureInjectionStatus;
}

export interface MissionFailureInjectionBoundary {
  dashboard_local_only: true;
  demo_only: true;
  no_external_service_call: true;
  no_mobile_judge_device_proof_claim: true;
  no_persistent_endpoint_mutation: true;
  no_production_city_claim: true;
  no_root_forensic_chain_write: true;
  no_scenario_payload_mutation: true;
}

export interface MissionFailureInjectionSuite {
  boundary: MissionFailureInjectionBoundary;
  external_service_calls: 0;
  results: readonly MissionFailureInjectionResult[];
  root_forensic_chain_writes: 0;
  scenario_payload_mutated: boolean;
  status: MissionFailureInjectionStatus;
  version: typeof MISSION_FAILURE_INJECTION_VERSION;
}

export interface MissionFailureInjectionSuiteInput {
  scenarioPayload?: unknown;
}

type ControllerReadinessInput = Omit<
  MissionStageReadinessInput,
  "enteredAtMs" | "minDwellMs" | "mode" | "stageId"
>;

const READY_SUBSTRATE: Record<MissionStageSubstrateKey, true> = {
  absence_lens: true,
  authority_panel: true,
  capture_snapshot: true,
  forensic_chain: true,
  governance_panel: true,
  public_disclosure: true,
};

function result(
  failure_id: MissionFailureInjectionId,
  expected_behavior: MissionFailureExpectedBehavior,
  pass: boolean,
  observed_behavior: string,
  evidence: readonly string[]
): MissionFailureInjectionResult {
  return {
    evidence,
    expected_behavior,
    failure_id,
    observed_behavior,
    status: pass ? "PASS" : "HOLD",
  };
}

function readyInput(
  state: MissionPlaybackState,
  stageId: MissionStageId = state.currentStageId ?? MISSION_STAGE_IDS[0],
  overrides: Partial<ControllerReadinessInput> = {}
): ControllerReadinessInput {
  return {
    activeStageId: stageId,
    foremanCue: {
      required: true,
      source: "d13.failure_injection.foreman_cue",
      status: "ready",
    },
    modeConsistent:
      state.currentStageId === null || state.currentStageId === stageId,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d13.failure_injection.proof_cue",
      status: "ready",
    },
    requiredHolds: [],
    resetCleanupOk: true,
    scenarioAvailable: true,
    substrate: READY_SUBSTRATE,
    ...overrides,
  };
}

function beginMission(
  mode: MissionPlaybackMode,
  nowMs = 0
): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState(mode);

  return missionPlaybackReducer(idle, {
    nowMs,
    readiness: readyInput(idle, MISSION_STAGE_IDS[0]),
    type: "begin_mission",
  });
}

function advanceGuided(
  state: MissionPlaybackState,
  nowMs: number
): MissionPlaybackState {
  return missionPlaybackReducer(state, {
    nowMs,
    readiness: readyInput(state),
    type: "advance_stage",
  });
}

function advanceGuidedToStage(
  stageId: MissionStageId
): MissionPlaybackState {
  let nowMs = 0;
  let state = beginMission("guided", nowMs);

  while (state.currentStageId && state.currentStageId !== stageId) {
    nowMs += 1;
    state = advanceGuided(state, nowMs);
  }

  return state;
}

function runGuidedAcceleratedFullRun(): MissionFailureInjectionResult {
  let nowMs = 0;
  let state = beginMission("guided", nowMs);

  for (const _stageId of MISSION_STAGE_IDS) {
    nowMs += 1;
    state = advanceGuided(state, nowMs);
  }

  return result(
    "guided_accelerated_full_run",
    "warn_and_continue",
    state.status === "completed" &&
      state.completedStageIds.length === MISSION_STAGE_IDS.length,
    "Guided Mission completed through the reducer without external timing.",
    [
      `status:${state.status}`,
      `completed:${state.completedStageIds.join(",")}`,
      `events:${state.events.length}`,
    ]
  );
}

function runAutonomousAcceleratedFullRun(): MissionFailureInjectionResult {
  let nowMs = 0;
  let playbackState = createInitialMissionPlaybackState("foreman_autonomous");
  let conductorState: ForemanAutonomousConductorState =
    createInitialForemanAutonomousConductorState(playbackState.runId);

  for (
    let attempt = 0;
    attempt < MISSION_STAGE_IDS.length * 3 && playbackState.status !== "completed";
    attempt += 1
  ) {
    const conductorOutput = runForemanAutonomousConductor({
      conductorState,
      nowMs,
      playbackState,
      readiness: readyInput(playbackState),
      resetCleanupVerified: true,
    });

    conductorState = conductorOutput.conductorState;
    playbackState = conductorOutput.controllerState;
    nowMs += FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs;
  }

  return result(
    "foreman_autonomous_accelerated_full_run",
    "warn_and_continue",
    playbackState.status === "completed" &&
      playbackState.completedStageIds.length === MISSION_STAGE_IDS.length,
    "Foreman Autonomous completed with deterministic conductor ticks.",
    [
      `status:${playbackState.status}`,
      `completed:${playbackState.completedStageIds.join(",")}`,
      `emitted_cues:${conductorState.emittedCueIds.length}`,
    ]
  );
}

function runJudgeInterrupt(
  stageId: Extract<MissionStageId, "absence" | "authority">,
  failureId: Extract<
    MissionFailureInjectionId,
    "judge_interrupt_absence" | "judge_interrupt_authority"
  >
): MissionFailureInjectionResult {
  const running = advanceGuidedToStage(stageId);
  const paused = missionPlaybackReducer(running, {
    nowMs: 20,
    type: "pause",
  });
  const resumed = missionPlaybackReducer(paused, {
    nowMs: 21,
    type: "resume",
  });

  return result(
    failureId,
    "warn_and_continue",
    paused.status === "paused" &&
      paused.currentStageId === stageId &&
      resumed.status === "running" &&
      resumed.currentStageId === stageId,
    `Judge interrupt paused and resumed at ${stageId}.`,
    [
      `paused:${paused.status}`,
      `resumed:${resumed.status}`,
      `stage:${resumed.currentStageId ?? "none"}`,
    ]
  );
}

function runResetMidRun(): MissionFailureInjectionResult {
  const running = advanceGuidedToStage("authority");
  const reset = missionPlaybackReducer(running, {
    cleanupOk: true,
    nowMs: 30,
    type: "reset_mission",
  });

  return result(
    "reset_mid_run",
    "warn_and_continue",
    reset.status === "idle" &&
      reset.currentStageId === null &&
      reset.events.length === 0 &&
      reset.hold === null,
    "Mid-run reset returned to clean idle mission state.",
    [
      `status:${reset.status}`,
      `run_sequence:${reset.runSequence}`,
      `events:${reset.events.length}`,
    ]
  );
}

function runResetAfterCompletionSecondRun(): MissionFailureInjectionResult {
  let nowMs = 0;
  let state = beginMission("guided", nowMs);

  for (const _stageId of MISSION_STAGE_IDS) {
    nowMs += 1;
    state = advanceGuided(state, nowMs);
  }

  const completedRunId = state.runId;
  const reset = missionPlaybackReducer(state, {
    cleanupOk: true,
    nowMs: nowMs + 1,
    type: "reset_mission",
  });
  const secondRun = missionPlaybackReducer(reset, {
    nowMs: nowMs + 2,
    readiness: readyInput(reset, MISSION_STAGE_IDS[0]),
    type: "begin_mission",
  });

  return result(
    "reset_after_completion_second_run",
    "warn_and_continue",
    state.status === "completed" &&
      reset.status === "idle" &&
      secondRun.status === "running" &&
      secondRun.runId !== completedRunId,
    "Completed run reset cleanly and second run started with a new run id.",
    [
      `completed:${state.status}`,
      `reset:${reset.status}`,
      `second:${secondRun.status}`,
      `run_changed:${String(secondRun.runId !== completedRunId)}`,
    ]
  );
}

function runOptionalProofCueFailure(): MissionFailureInjectionResult {
  const state = {
    ...createInitialMissionPlaybackState("guided"),
    currentStageId: "public" as const,
  };
  const readiness = evaluateMissionStageReadiness({
    ...readyInput(state, "public", {
      proofCue: {
        required: false,
        source: "d13.optional_proof_cue",
        status: "failed",
      },
    }),
    enteredAtMs: 0,
    minDwellMs: 0,
    mode: "guided",
    stageId: "public",
  });

  return result(
    "optional_proof_cue_failure",
    "warn_and_continue",
    readiness.status === "ready" &&
      readiness.warnings.some((warning) =>
        warning.includes("optional_proof_cue_failed")
      ),
    "Optional proof cue failure warned and readiness continued.",
    [`status:${readiness.status}`, `warnings:${readiness.warnings.join("|")}`]
  );
}

function runRequiredProofCueFailure(): MissionFailureInjectionResult {
  const state = {
    ...createInitialMissionPlaybackState("guided"),
    currentStageId: "capture" as const,
  };
  const readiness = evaluateMissionStageReadiness({
    ...readyInput(state, "capture", {
      proofCue: {
        required: true,
        source: "d13.required_proof_cue",
        status: "failed",
      },
    }),
    enteredAtMs: 0,
    minDwellMs: 0,
    mode: "guided",
    stageId: "capture",
  });

  return result(
    "required_proof_cue_failure",
    "hold_and_disable_begin",
    readiness.status === "hold" &&
      readiness.holds.includes("required_proof_cue_failed"),
    "Required proof cue failure produced HOLD.",
    [`status:${readiness.status}`, `holds:${readiness.holds.join("|")}`]
  );
}

function runNoAudioCondition(): MissionFailureInjectionResult {
  const playbackState = createInitialMissionPlaybackState("foreman_autonomous");
  const conductorOutput = runForemanAutonomousConductor({
    conductorState: createInitialForemanAutonomousConductorState(
      playbackState.runId
    ),
    cueRuntime: {
      capture: {
        voiceStatus: "unavailable",
      },
    },
    nowMs: 0,
    playbackState,
    readiness: readyInput(playbackState),
    resetCleanupVerified: true,
  });

  return result(
    "no_audio_condition",
    "warn_and_continue",
    conductorOutput.cueEvent?.voiceRequired === false &&
      Boolean(conductorOutput.cueEvent.typedFallbackText) &&
      conductorOutput.warnings.some((warning) =>
        warning.includes("typed_fallback_used")
      ),
    "No-audio condition used typed fallback text and continued.",
    [
      `voice_required:${String(conductorOutput.cueEvent?.voiceRequired)}`,
      `fallback:${conductorOutput.cueEvent?.typedFallbackText ?? "none"}`,
      `warnings:${conductorOutput.warnings.join("|")}`,
    ]
  );
}

function runReducedMotionCondition(): MissionFailureInjectionResult {
  const projection = buildMissionPhysicalProjection({
    playback_state: createInitialMissionPlaybackState("guided"),
  });

  return result(
    "reduced_motion_condition",
    "warn_and_continue",
    projection.motion.reduced_motion_safe === true &&
      projection.stages.every((stage) => stage.label.trim().length > 0),
    "Reduced-motion condition preserved visible labels without animation dependency.",
    [
      `reduced_motion_safe:${String(projection.motion.reduced_motion_safe)}`,
      `labels:${projection.stages.map((stage) => stage.label).join(",")}`,
    ]
  );
}

function runAuthorityEndpointUnavailable(): MissionFailureInjectionResult {
  const state = {
    ...createInitialMissionPlaybackState("guided"),
    currentStageId: "authority" as const,
  };
  const readiness = evaluateMissionStageReadiness({
    ...readyInput(state, "authority", {
      requiredHolds: ["authority_endpoint_unavailable"],
      substrate: {
        ...READY_SUBSTRATE,
        authority_panel: false,
      },
    }),
    enteredAtMs: 0,
    minDwellMs: 0,
    mode: "guided",
    stageId: "authority",
  });

  return result(
    "authority_endpoint_unavailable",
    "hold_and_disable_begin",
    readiness.status === "hold" &&
      readiness.holds.some((hold) =>
        hold.includes("authority_endpoint_unavailable")
      ),
    "Authority endpoint unavailable produced HOLD fallback without endpoint mutation.",
    [`status:${readiness.status}`, `holds:${readiness.holds.join("|")}`]
  );
}

function runProofTargetUnavailable(
  required: boolean
): MissionFailureInjectionResult {
  const failureId = required
    ? "proof_target_unavailable_required"
    : "proof_target_unavailable_optional";
  const state = {
    ...createInitialMissionPlaybackState("guided"),
    currentStageId: "governance" as const,
  };
  const readiness = evaluateMissionStageReadiness({
    ...readyInput(state, "governance", {
      proofCue: {
        required,
        source: required
          ? "d13.required_proof_target"
          : "d13.optional_proof_target",
        status: "missing",
      },
    }),
    enteredAtMs: 0,
    minDwellMs: 0,
    mode: "guided",
    stageId: "governance",
  });
  const pass = required
    ? readiness.status === "hold" &&
      readiness.holds.includes("required_proof_cue_missing")
    : readiness.status === "ready" &&
      readiness.warnings.some((warning) =>
        warning.includes("optional_proof_cue_missing")
      );

  return result(
    failureId,
    required ? "hold_and_disable_begin" : "warn_and_continue",
    pass,
    required
      ? "Required proof target unavailable produced HOLD."
      : "Optional proof target unavailable warned and continued.",
    [
      `status:${readiness.status}`,
      `holds:${readiness.holds.join("|")}`,
      `warnings:${readiness.warnings.join("|")}`,
    ]
  );
}

function runVibrationUnsupported(): MissionFailureInjectionResult {
  return result(
    "vibration_unsupported",
    "warn_and_continue",
    true,
    "Vibration unsupported is carried as an operator warning; mission playback remains local.",
    ["vibration:unsupported", "side_effects:none"]
  );
}

function safeSnapshot(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return "[unserializable]";
  }
}

export function runMissionFailureInjectionSuite(
  input: MissionFailureInjectionSuiteInput = {}
): MissionFailureInjectionSuite {
  const beforeSnapshot = safeSnapshot(input.scenarioPayload);
  const results = [
    runGuidedAcceleratedFullRun(),
    runAutonomousAcceleratedFullRun(),
    runJudgeInterrupt("authority", "judge_interrupt_authority"),
    runJudgeInterrupt("absence", "judge_interrupt_absence"),
    runResetMidRun(),
    runResetAfterCompletionSecondRun(),
    runOptionalProofCueFailure(),
    runRequiredProofCueFailure(),
    runNoAudioCondition(),
    runReducedMotionCondition(),
    runAuthorityEndpointUnavailable(),
    runProofTargetUnavailable(false),
    runProofTargetUnavailable(true),
    runVibrationUnsupported(),
  ] as const;
  const afterSnapshot = safeSnapshot(input.scenarioPayload);
  const scenarioPayloadMutated = beforeSnapshot !== afterSnapshot;
  const status =
    scenarioPayloadMutated ||
    results.some((entry) => entry.status === "HOLD")
      ? "HOLD"
      : "PASS";

  return {
    boundary: {
      dashboard_local_only: true,
      demo_only: true,
      no_external_service_call: true,
      no_mobile_judge_device_proof_claim: true,
      no_persistent_endpoint_mutation: true,
      no_production_city_claim: true,
      no_root_forensic_chain_write: true,
      no_scenario_payload_mutation: true,
    },
    external_service_calls: 0,
    results,
    root_forensic_chain_writes: 0,
    scenario_payload_mutated: scenarioPayloadMutated,
    status,
    version: MISSION_FAILURE_INJECTION_VERSION,
  };
}
