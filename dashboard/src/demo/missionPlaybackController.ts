import { FOREMAN_AUTONOMOUS_PLAYBACK_POLICY } from "./foremanAutonomousPolicy.ts";
import {
  getForemanModeForMissionStage,
  MISSION_STAGE_IDS,
  type MissionForemanModeId,
  type MissionPlaybackMode,
  type MissionPlaybackStatus,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";
import {
  evaluateMissionStageReadiness,
  type MissionStageReadinessInput,
  type MissionStageReadinessResult,
} from "./missionStageReadiness.ts";

export type MissionPlaybackEventType =
  | "mission_begin"
  | "stage_enter"
  | "stage_complete"
  | "mission_complete"
  | "mission_pause"
  | "mission_resume"
  | "mission_hold"
  | "mission_reset";

export interface MissionPlaybackEvent {
  atMs: number;
  eventId: string;
  runId: string;
  stageId: MissionStageId | null;
  type: MissionPlaybackEventType;
}

export interface MissionPlaybackHold {
  atMs: number;
  reason: string;
  stageId: MissionStageId | null;
}

export interface MissionPlaybackWarning {
  atMs: number;
  message: string;
  stageId: MissionStageId | null;
}

export interface MissionStagePlaybackState {
  foremanMode: MissionForemanModeId;
  id: MissionStageId;
  state: "active" | "complete" | "hold" | "pending";
}

export interface MissionPlaybackState {
  activeForemanMode: MissionForemanModeId | null;
  completedAtMs: number | null;
  completedStageIds: readonly MissionStageId[];
  currentStageId: MissionStageId | null;
  events: readonly MissionPlaybackEvent[];
  hold: MissionPlaybackHold | null;
  mode: MissionPlaybackMode;
  pausedAtMs: number | null;
  runId: string;
  runSequence: number;
  stageEnteredAtMs: number | null;
  startedAtMs: number | null;
  status: MissionPlaybackStatus;
  warnings: readonly MissionPlaybackWarning[];
}

export type MissionPlaybackAction =
  | { mode: MissionPlaybackMode; nowMs: number; type: "select_mode" }
  | {
      nowMs: number;
      readiness: Omit<
        MissionStageReadinessInput,
        "enteredAtMs" | "minDwellMs" | "mode" | "stageId"
      >;
      type: "begin_mission";
    }
  | {
      nowMs: number;
      readiness: Omit<
        MissionStageReadinessInput,
        "enteredAtMs" | "minDwellMs" | "mode" | "stageId"
      >;
      type: "advance_stage";
    }
  | {
      nowMs: number;
      readiness: Omit<
        MissionStageReadinessInput,
        "enteredAtMs" | "minDwellMs" | "mode" | "stageId"
      >;
      type: "autonomous_tick";
    }
  | { nowMs: number; type: "pause" }
  | { nowMs: number; type: "resume" }
  | { nowMs: number; reason: string; type: "hold" }
  | { nowMs: number; type: "clear_hold" }
  | { cleanupOk?: boolean; nowMs: number; type: "reset_mission" };

function runIdFor(sequence: number): string {
  return `mission-run-${sequence}`;
}

export function createInitialMissionPlaybackState(
  mode: MissionPlaybackMode = "guided",
  runSequence = 1
): MissionPlaybackState {
  return {
    activeForemanMode: null,
    completedAtMs: null,
    completedStageIds: [],
    currentStageId: null,
    events: [],
    hold: null,
    mode,
    pausedAtMs: null,
    runId: runIdFor(runSequence),
    runSequence,
    stageEnteredAtMs: null,
    startedAtMs: null,
    status: "idle",
    warnings: [],
  };
}

function withWarning(
  state: MissionPlaybackState,
  message: string,
  atMs: number
): MissionPlaybackState {
  return {
    ...state,
    warnings: [
      ...state.warnings,
      {
        atMs,
        message,
        stageId: state.currentStageId,
      },
    ],
  };
}

function appendEvent(
  state: MissionPlaybackState,
  type: MissionPlaybackEventType,
  atMs: number,
  stageId: MissionStageId | null = state.currentStageId
): readonly MissionPlaybackEvent[] {
  return [
    ...state.events,
    {
      atMs,
      eventId: `${state.runId}:${state.events.length + 1}:${type}:${
        stageId ?? "mission"
      }`,
      runId: state.runId,
      stageId,
      type,
    },
  ];
}

function holdState(
  state: MissionPlaybackState,
  reason: string,
  atMs: number
): MissionPlaybackState {
  return {
    ...state,
    events: appendEvent(state, "mission_hold", atMs),
    hold: {
      atMs,
      reason,
      stageId: state.currentStageId,
    },
    status: "holding",
  };
}

function readinessForStage(
  state: MissionPlaybackState,
  stageId: MissionStageId,
  readiness: Omit<
    MissionStageReadinessInput,
    "enteredAtMs" | "minDwellMs" | "mode" | "stageId"
  >,
  nowMs: number,
  minDwellMs: number
): MissionStageReadinessResult {
  return evaluateMissionStageReadiness({
    ...readiness,
    enteredAtMs: state.stageEnteredAtMs,
    minDwellMs,
    mode: state.mode,
    nowMs,
    stageId,
  });
}

function applyReadinessWarnings(
  state: MissionPlaybackState,
  result: MissionStageReadinessResult,
  atMs: number
): MissionPlaybackState {
  if (result.warnings.length === 0) {
    return state;
  }

  return {
    ...state,
    warnings: [
      ...state.warnings,
      ...result.warnings.map((message) => ({
        atMs,
        message,
        stageId: result.stageId,
      })),
    ],
  };
}

function beginMission(
  state: MissionPlaybackState,
  action: Extract<MissionPlaybackAction, { type: "begin_mission" }>
): MissionPlaybackState {
  if (state.status !== "idle") {
    return withWarning(state, "begin_ignored_unless_idle", action.nowMs);
  }

  const firstStage = MISSION_STAGE_IDS[0];
  const draft: MissionPlaybackState = {
    ...state,
    activeForemanMode: getForemanModeForMissionStage(firstStage),
    currentStageId: firstStage,
    hold: null,
    pausedAtMs: null,
    stageEnteredAtMs: action.nowMs,
    startedAtMs: action.nowMs,
  };
  const result = readinessForStage(draft, firstStage, action.readiness, action.nowMs, 0);

  if (result.status === "hold") {
    return holdState(applyReadinessWarnings(draft, result, action.nowMs), result.holds[0], action.nowMs);
  }

  const running: MissionPlaybackState = {
    ...applyReadinessWarnings(draft, result, action.nowMs),
    events: [
      ...appendEvent(draft, "mission_begin", action.nowMs, null),
      {
        atMs: action.nowMs,
        eventId: `${draft.runId}:2:stage_enter:${firstStage}`,
        runId: draft.runId,
        stageId: firstStage,
        type: "stage_enter",
      },
    ],
    status: "running",
  };

  return running;
}

function advanceCurrentStage(
  state: MissionPlaybackState,
  nowMs: number
): MissionPlaybackState {
  const currentStage = state.currentStageId;

  if (!currentStage || state.status === "completed") {
    return state;
  }

  const currentIndex = MISSION_STAGE_IDS.indexOf(currentStage);
  const completedStageIds = state.completedStageIds.includes(currentStage)
    ? state.completedStageIds
    : [...state.completedStageIds, currentStage];
  const stageCompleteEvents = state.completedStageIds.includes(currentStage)
    ? state.events
    : appendEvent(state, "stage_complete", nowMs, currentStage);

  if (currentIndex === MISSION_STAGE_IDS.length - 1) {
    const completedState: MissionPlaybackState = {
      ...state,
      activeForemanMode: null,
      completedAtMs: nowMs,
      completedStageIds,
      currentStageId: null,
      events: [
        ...stageCompleteEvents,
        {
          atMs: nowMs,
          eventId: `${state.runId}:${stageCompleteEvents.length + 1}:mission_complete:mission`,
          runId: state.runId,
          stageId: null,
          type: "mission_complete",
        },
      ],
      hold: null,
      stageEnteredAtMs: null,
      status: "completed",
    };

    return completedState;
  }

  const nextStage = MISSION_STAGE_IDS[currentIndex + 1];

  return {
    ...state,
    activeForemanMode: getForemanModeForMissionStage(nextStage),
    completedStageIds,
    currentStageId: nextStage,
    events: [
      ...stageCompleteEvents,
      {
        atMs: nowMs,
        eventId: `${state.runId}:${stageCompleteEvents.length + 1}:stage_enter:${nextStage}`,
        runId: state.runId,
        stageId: nextStage,
        type: "stage_enter",
      },
    ],
    hold: null,
    stageEnteredAtMs: nowMs,
    status: "running",
  };
}

function readyAdvance(
  state: MissionPlaybackState,
  readiness: Omit<
    MissionStageReadinessInput,
    "enteredAtMs" | "minDwellMs" | "mode" | "stageId"
  >,
  nowMs: number,
  minDwellMs: number
): MissionPlaybackState {
  if (state.status !== "running") {
    return state.status === "completed"
      ? state
      : withWarning(state, "advance_ignored_unless_running", nowMs);
  }

  if (!state.currentStageId) {
    return holdState(state, "mode_state_inconsistent", nowMs);
  }

  const result = readinessForStage(
    state,
    state.currentStageId,
    readiness,
    nowMs,
    minDwellMs
  );
  const warned = applyReadinessWarnings(state, result, nowMs);

  if (result.status === "hold") {
    return holdState(warned, result.holds[0], nowMs);
  }

  if (!result.ready) {
    return warned;
  }

  return advanceCurrentStage(warned, nowMs);
}

export function missionPlaybackReducer(
  state: MissionPlaybackState,
  action: MissionPlaybackAction
): MissionPlaybackState {
  switch (action.type) {
    case "select_mode":
      return state.status === "idle"
        ? { ...state, mode: action.mode }
        : withWarning(state, "mode_switch_ignored_mid_run", action.nowMs);

    case "begin_mission":
      return beginMission(state, action);

    case "advance_stage":
      if (state.mode !== "guided") {
        return withWarning(state, "guided_advance_ignored_for_autonomous_mode", action.nowMs);
      }

      return readyAdvance(state, action.readiness, action.nowMs, 0);

    case "autonomous_tick":
      if (state.mode !== "foreman_autonomous") {
        return withWarning(state, "autonomous_tick_ignored_for_guided_mode", action.nowMs);
      }

      return readyAdvance(
        state,
        action.readiness,
        action.nowMs,
        FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs
      );

    case "pause":
      return state.status === "running"
        ? {
            ...state,
            events: appendEvent(state, "mission_pause", action.nowMs),
            pausedAtMs: action.nowMs,
            status: "paused",
          }
        : state;

    case "resume": {
      if (state.status !== "paused") {
        return state;
      }

      const pausedDurationMs =
        state.pausedAtMs === null ? 0 : Math.max(0, action.nowMs - state.pausedAtMs);

      return {
        ...state,
        events: appendEvent(state, "mission_resume", action.nowMs),
        pausedAtMs: null,
        stageEnteredAtMs:
          state.stageEnteredAtMs === null
            ? null
            : state.stageEnteredAtMs + pausedDurationMs,
        status: "running",
      };
    }

    case "hold":
      return holdState(state, action.reason, action.nowMs);

    case "clear_hold":
      if (state.status !== "holding") {
        return state;
      }

      return {
        ...state,
        hold: null,
        status: state.currentStageId ? "running" : "idle",
      };

    case "reset_mission":
      if (action.cleanupOk === false) {
        return holdState(state, "reset_cleanup_failed", action.nowMs);
      }

      return createInitialMissionPlaybackState(state.mode, state.runSequence + 1);

    default:
      return state;
  }
}

export function getMissionStagePlaybackStates(
  state: MissionPlaybackState
): readonly MissionStagePlaybackState[] {
  return MISSION_STAGE_IDS.map((id) => ({
    foremanMode: getForemanModeForMissionStage(id),
    id,
    state: state.completedStageIds.includes(id)
      ? "complete"
      : state.currentStageId === id && state.status === "holding"
        ? "hold"
        : state.currentStageId === id
          ? "active"
          : "pending",
  }));
}
