import {
  createInitialForemanAutonomousConductorState,
  runForemanAutonomousConductor,
  type ForemanAutonomousConductorOutput,
  type ForemanAutonomousConductorState,
  type ForemanConductorReadinessInput,
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
import {
  evaluateMissionStageReadiness,
  type MissionCueReadiness,
  type MissionStageReadinessInput,
  type MissionStageReadinessResult,
} from "./missionStageReadiness.ts";

export const MISSION_RELIABILITY_GUARDS_VERSION =
  "meridian.v2d.missionReliabilityGuards.v1" as const;

export interface MissionReliabilityRuntime {
  conductorOutput: ForemanAutonomousConductorOutput | null;
  conductorState: ForemanAutonomousConductorState;
  endpointMutationCount: 0;
  optionalWarning: string | null;
  physicalModeEnabled: boolean;
  playbackState: MissionPlaybackState;
  selectedJudgeQuestionId: string | null;
  selectedProofTargetId: string | null;
  version: typeof MISSION_RELIABILITY_GUARDS_VERSION;
}

export interface MissionReliabilityBoundary {
  dashboard_local_only: true;
  no_endpoint_mutation: true;
  no_external_service_call: true;
  no_root_forensic_chain_write: true;
  no_scenario_payload_mutation: true;
}

export const MISSION_RELIABILITY_BOUNDARY: MissionReliabilityBoundary = {
  dashboard_local_only: true,
  no_endpoint_mutation: true,
  no_external_service_call: true,
  no_root_forensic_chain_write: true,
  no_scenario_payload_mutation: true,
};

const READY_SUBSTRATE: Record<MissionStageSubstrateKey, true> = {
  absence_lens: true,
  authority_panel: true,
  capture_snapshot: true,
  forensic_chain: true,
  governance_panel: true,
  public_disclosure: true,
};

export function buildMissionReliabilityReadiness(
  state: MissionPlaybackState,
  overrides: Partial<
    Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId">
  > = {}
): Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId"> {
  const activeStageId = state.currentStageId ?? MISSION_STAGE_IDS[0];

  return {
    activeStageId,
    foremanCue: {
      required: false,
      source: "d14.reliability.foreman_cue",
      status: "ready",
    },
    modeConsistent:
      state.currentStageId === null || state.currentStageId === activeStageId,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d14.reliability.proof_cue",
      status: "ready",
    },
    requiredHolds: [],
    resetCleanupOk: true,
    scenarioAvailable: true,
    substrate: READY_SUBSTRATE,
    ...overrides,
  };
}

export function buildForemanReliabilityReadiness(
  overrides: Partial<ForemanConductorReadinessInput> = {}
): ForemanConductorReadinessInput {
  return {
    modeConsistent: true,
    presenterCockpitReady: true,
    requiredHolds: [],
    resetCleanupOk: true,
    scenarioAvailable: true,
    substrate: READY_SUBSTRATE,
    ...overrides,
  };
}

export function beginReliabilityMission(
  mode: MissionPlaybackMode,
  nowMs = 0
): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState(mode);

  return missionPlaybackReducer(idle, {
    nowMs,
    readiness: buildMissionReliabilityReadiness(idle),
    type: "begin_mission",
  });
}

export function advanceReliabilityGuided(
  state: MissionPlaybackState,
  nowMs: number
): MissionPlaybackState {
  return missionPlaybackReducer(state, {
    nowMs,
    readiness: buildMissionReliabilityReadiness(state),
    type: "advance_stage",
  });
}

export function completeReliabilityGuidedMission(): MissionPlaybackState {
  let state = beginReliabilityMission("guided", 0);

  MISSION_STAGE_IDS.forEach((_stageId, index) => {
    state = advanceReliabilityGuided(state, index + 1);
  });

  return state;
}

export function resetReliabilityPlaybackState(
  state: MissionPlaybackState,
  nowMs = 100
): MissionPlaybackState {
  return missionPlaybackReducer(state, {
    cleanupOk: true,
    nowMs,
    type: "reset_mission",
  });
}

export function createReliabilityRuntime(
  playbackState: MissionPlaybackState,
  overrides: Partial<
    Omit<
      MissionReliabilityRuntime,
      | "conductorOutput"
      | "conductorState"
      | "endpointMutationCount"
      | "playbackState"
      | "version"
    >
  > & {
    conductorOutput?: ForemanAutonomousConductorOutput | null;
    conductorState?: ForemanAutonomousConductorState;
  } = {}
): MissionReliabilityRuntime {
  return {
    conductorOutput: overrides.conductorOutput ?? null,
    conductorState:
      overrides.conductorState ??
      createInitialForemanAutonomousConductorState(playbackState.runId),
    endpointMutationCount: 0,
    optionalWarning: overrides.optionalWarning ?? null,
    physicalModeEnabled: overrides.physicalModeEnabled ?? false,
    playbackState,
    selectedJudgeQuestionId: overrides.selectedJudgeQuestionId ?? null,
    selectedProofTargetId: overrides.selectedProofTargetId ?? null,
    version: MISSION_RELIABILITY_GUARDS_VERSION,
  };
}

export function resetReliabilityRuntime(
  runtime: MissionReliabilityRuntime,
  nowMs = 100
): MissionReliabilityRuntime {
  const playbackState = resetReliabilityPlaybackState(runtime.playbackState, nowMs);

  return {
    ...runtime,
    conductorOutput: null,
    conductorState: createInitialForemanAutonomousConductorState(playbackState.runId),
    optionalWarning: null,
    playbackState,
    selectedJudgeQuestionId: null,
    selectedProofTargetId: null,
  };
}

export function runNoAudioReliabilityConductor(): ForemanAutonomousConductorOutput {
  return runForemanAutonomousConductor({
    cueRuntime: {
      capture: {
        voiceStatus: "unavailable",
      },
    },
    nowMs: 0,
    playbackState: createInitialMissionPlaybackState("foreman_autonomous"),
    readiness: buildForemanReliabilityReadiness(),
    resetCleanupVerified: true,
  });
}

export function evaluateProofTargetReliability(
  required: boolean
): MissionStageReadinessResult {
  const state = {
    ...createInitialMissionPlaybackState("guided"),
    currentStageId: "governance" as const,
  };
  const proofCue: MissionCueReadiness = {
    required,
    source: required
      ? "d14.required.proof_target"
      : "d14.optional.proof_target",
    status: "missing",
  };

  return evaluateMissionStageReadiness({
    ...buildMissionReliabilityReadiness(state, { proofCue }),
    enteredAtMs: 0,
    minDwellMs: 0,
    mode: "guided",
    stageId: "governance",
  });
}

export function evaluateAuthorityEndpointReliability(): MissionStageReadinessResult {
  const state = {
    ...createInitialMissionPlaybackState("guided"),
    currentStageId: "authority" as const,
  };

  return evaluateMissionStageReadiness({
    ...buildMissionReliabilityReadiness(state, {
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
}

export function evaluateMissingScenarioReliability(
  stageId: MissionStageId = "capture"
): MissionStageReadinessResult {
  const state = {
    ...createInitialMissionPlaybackState("guided"),
    currentStageId: stageId,
  };

  return evaluateMissionStageReadiness({
    ...buildMissionReliabilityReadiness(state, {
      scenarioAvailable: false,
      substrate: {
        ...READY_SUBSTRATE,
        capture_snapshot: false,
      },
    }),
    enteredAtMs: 0,
    minDwellMs: 0,
    mode: "guided",
    stageId,
  });
}
