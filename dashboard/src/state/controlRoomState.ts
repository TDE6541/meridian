import type {
  PlaybackStatus,
  ScenarioKey,
  ScenarioRegistryEntry,
  ScenarioResult,
  ScenarioSkinOutputKey,
  ScenarioRunnerReport,
  ScenarioStep,
  ScenarioTransitionEvidenceStep,
} from "../types/scenario.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type ControlRoomScenarioRecord =
  | {
      entry: ScenarioRegistryEntry;
      status: "loading";
    }
  | {
      entry: ScenarioRegistryEntry;
      status: "ready";
      payload: ScenarioRunnerReport;
      scenario: ScenarioResult;
    }
  | {
      entry: ScenarioRegistryEntry;
      status: "error";
      error: string;
    };

export interface ControlRoomState {
  activeStepIndex: number;
  activeSkinTab: ScenarioSkinOutputKey;
  playbackState: PlaybackStatus;
  selectedScenarioKey: ScenarioKey;
}

export interface ControlRoomTimelineStep {
  action: string | null;
  decision: string | null;
  index: number;
  selectedClauseText: string | null;
  step: ScenarioStep;
  stepId: string;
  transition: ScenarioTransitionEvidenceStep | null;
}

export function createInitialControlRoomState(
  selectedScenarioKey: ScenarioKey = "routine"
): ControlRoomState {
  return {
    activeStepIndex: 0,
    activeSkinTab: "permitting",
    playbackState: "paused",
    selectedScenarioKey,
  };
}

export function createLoadingScenarioRecord(
  entry: ScenarioRegistryEntry
): ControlRoomScenarioRecord {
  return {
    entry,
    status: "loading",
  };
}

export function createReadyScenarioRecord(
  entry: ScenarioRegistryEntry,
  payload: ScenarioRunnerReport
): ControlRoomScenarioRecord {
  return {
    entry,
    payload,
    scenario: payload.scenarios[0].result,
    status: "ready",
  };
}

export function createErrorScenarioRecord(
  entry: ScenarioRegistryEntry,
  error: string
): ControlRoomScenarioRecord {
  return {
    entry,
    error,
    status: "error",
  };
}

export function getScenarioRecord(
  records: readonly ControlRoomScenarioRecord[],
  key: ScenarioKey
): ControlRoomScenarioRecord | undefined {
  return records.find((record) => record.entry.key === key);
}

export function clampStepIndex(index: number, totalSteps: number): number {
  if (totalSteps <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), totalSteps - 1);
}

export function getScenarioStepCount(
  record: ControlRoomScenarioRecord | undefined
): number {
  return record?.status === "ready" ? record.scenario.steps.length : 0;
}

export function selectScenario(
  state: ControlRoomState,
  selectedScenarioKey: ScenarioKey
): ControlRoomState {
  return {
    ...state,
    activeStepIndex: 0,
    playbackState: "paused",
    selectedScenarioKey,
  };
}

export function selectStep(
  state: ControlRoomState,
  index: number,
  totalSteps: number
): ControlRoomState {
  return {
    ...state,
    activeStepIndex: clampStepIndex(index, totalSteps),
    playbackState: "paused",
  };
}

export function selectSkinTab(
  state: ControlRoomState,
  activeSkinTab: ScenarioSkinOutputKey
): ControlRoomState {
  return {
    ...state,
    activeSkinTab,
  };
}

export function goToPreviousStep(
  state: ControlRoomState,
  totalSteps: number
): ControlRoomState {
  return {
    ...state,
    activeStepIndex: clampStepIndex(state.activeStepIndex - 1, totalSteps),
    playbackState: "paused",
  };
}

export function goToNextStep(
  state: ControlRoomState,
  totalSteps: number
): ControlRoomState {
  return {
    ...state,
    activeStepIndex: clampStepIndex(state.activeStepIndex + 1, totalSteps),
    playbackState: "paused",
  };
}

export function startPlayback(
  state: ControlRoomState,
  totalSteps: number
): ControlRoomState {
  if (totalSteps <= 0) {
    return {
      ...state,
      playbackState: "paused",
    };
  }

  return {
    ...state,
    playbackState: "playing",
  };
}

export function pausePlayback(state: ControlRoomState): ControlRoomState {
  return {
    ...state,
    playbackState: "paused",
  };
}

export function resetControlRoom(state: ControlRoomState): ControlRoomState {
  return {
    ...state,
    activeStepIndex: 0,
    playbackState: "paused",
  };
}

export function advancePlayback(
  state: ControlRoomState,
  totalSteps: number
): ControlRoomState {
  if (totalSteps <= 0) {
    return {
      ...state,
      playbackState: "paused",
    };
  }

  const nextIndex = clampStepIndex(state.activeStepIndex + 1, totalSteps);
  const reachedEnd = nextIndex >= totalSteps - 1;

  return {
    ...state,
    activeStepIndex: nextIndex,
    playbackState: reachedEnd ? "paused" : "playing",
  };
}

export function getStepDecision(step: ScenarioStep): string | null {
  return isNonEmptyString(step.governance?.result?.decision)
    ? step.governance.result.decision
    : null;
}

export function getStepReason(step: ScenarioStep): string | null {
  if (isNonEmptyString(step.governance?.result?.reason)) {
    return step.governance.result.reason;
  }

  return isNonEmptyString(step.governance?.reason) ? step.governance.reason : null;
}

function resolveStepId(
  transition: ScenarioTransitionEvidenceStep | undefined,
  index: number
): string {
  return isNonEmptyString(transition?.stepId)
    ? transition.stepId
    : `STEP-${index + 1}`;
}

function resolveStepAction(
  transition: ScenarioTransitionEvidenceStep | undefined
): string | null {
  return isNonEmptyString(transition?.action) ? transition.action : null;
}

function resolveSelectedClauseText(
  step: ScenarioStep,
  transition: ScenarioTransitionEvidenceStep | undefined
): string | null {
  if (isNonEmptyString(transition?.selectedClauseText)) {
    return transition.selectedClauseText;
  }

  return isNonEmptyString(step.summary?.selectedClauseText)
    ? step.summary.selectedClauseText
    : null;
}

export function buildTimelineSteps(
  scenario: ScenarioResult
): ControlRoomTimelineStep[] {
  const transitionSteps = scenario.transitionEvidence?.steps ?? [];

  return scenario.steps.map((step, index) => {
    const transition = isRecord(transitionSteps[index])
      ? (transitionSteps[index] as ScenarioTransitionEvidenceStep)
      : undefined;

    return {
      action: resolveStepAction(transition),
      decision: getStepDecision(step),
      index,
      selectedClauseText: resolveSelectedClauseText(step, transition),
      step,
      stepId: resolveStepId(transition, index),
      transition: transition ?? null,
    };
  });
}

export function getActiveTimelineStep(
  timelineSteps: readonly ControlRoomTimelineStep[],
  state: ControlRoomState
): ControlRoomTimelineStep | null {
  return timelineSteps[state.activeStepIndex] ?? null;
}

export function resolveScenarioDataVersion(
  record: ControlRoomScenarioRecord | undefined
): string | null {
  if (!record || record.status !== "ready") {
    return null;
  }

  if (isNonEmptyString(record.payload.contractVersion)) {
    return record.payload.contractVersion;
  }

  return isNonEmptyString(record.scenario.contractVersion)
    ? record.scenario.contractVersion
    : null;
}
