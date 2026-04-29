import type {
  ForemanAutonomousConductorOutput,
} from "../demo/foremanAutonomousConductor.ts";
import {
  createInitialMissionPlaybackState,
  type MissionPlaybackState,
} from "../demo/missionPlaybackController.ts";
import {
  getMissionStageDefinition,
  MISSION_STAGE_IDS,
  type MissionPlaybackMode,
} from "../demo/missionPlaybackPlan.ts";

const DEFAULT_PLAYBACK_STATE = createInitialMissionPlaybackState("guided");

const MODE_OPTIONS: readonly {
  description: string;
  label: string;
  mode: MissionPlaybackMode;
}[] = [
  {
    description: "Operator advances the scripted walkthrough.",
    label: "Guided Mission",
    mode: "guided",
  },
  {
    description:
      "Deterministic conductor. Foreman conducts the scripted proof sequence and does not create governance truth.",
    label: "Foreman Autonomous",
    mode: "foreman_autonomous",
  },
];

export interface MissionPlaybackControlsProps {
  canStart?: boolean;
  conductorOutput?: ForemanAutonomousConductorOutput | null;
  onBeginMission?: () => void;
  onModeChange?: (mode: MissionPlaybackMode) => void;
  onPauseMission?: () => void;
  onResetMission?: () => void;
  onResumeMission?: () => void;
  playbackState?: MissionPlaybackState;
}

function noop() {
  return undefined;
}

function noopMode(_mode: MissionPlaybackMode) {
  return undefined;
}

function getModeLabel(mode: MissionPlaybackMode): string {
  return MODE_OPTIONS.find((option) => option.mode === mode)?.label ?? "Guided Mission";
}

function getPlaybackStatusLabel(state: MissionPlaybackState): string {
  if (state.status === "idle") {
    return "Lobby";
  }

  return state.status.slice(0, 1).toUpperCase() + state.status.slice(1);
}

function getActiveStageLabel(state: MissionPlaybackState): string {
  if (!state.currentStageId) {
    return "Lobby";
  }

  return getMissionStageDefinition(state.currentStageId).label;
}

function getStageProgressLabel(state: MissionPlaybackState): string {
  if (!state.currentStageId) {
    return "No active stage";
  }

  const stage = getMissionStageDefinition(state.currentStageId);

  return `Stage ${stage.index + 1}/${MISSION_STAGE_IDS.length}`;
}

function getConductorStatusLabel(
  playbackState: MissionPlaybackState,
  conductorOutput: ForemanAutonomousConductorOutput | null
): string {
  if (playbackState.mode !== "foreman_autonomous") {
    return "Guided operator path";
  }

  if (playbackState.status === "idle") {
    return "Deterministic conductor ready after Begin Mission";
  }

  if (playbackState.status === "paused") {
    return "Paused";
  }

  return conductorOutput?.status.replace(/_/g, " ") ?? "Conductor cue pending";
}

function getConductorLine(
  playbackState: MissionPlaybackState,
  conductorOutput: ForemanAutonomousConductorOutput | null
): string {
  if (playbackState.mode !== "foreman_autonomous") {
    return "Guided Mission keeps the operator in control of mission pacing.";
  }

  return (
    conductorOutput?.cueEvent?.typedFallbackText ??
    "Foreman conducts the scripted proof sequence and does not create governance truth."
  );
}

export function MissionPlaybackControls({
  canStart = true,
  conductorOutput = null,
  onBeginMission = noop,
  onModeChange = noopMode,
  onPauseMission = noop,
  onResetMission = noop,
  onResumeMission = noop,
  playbackState = DEFAULT_PLAYBACK_STATE,
}: MissionPlaybackControlsProps) {
  const idle = playbackState.status === "idle";
  const started = !idle;
  const canSwitchMode = idle;
  const canBegin = idle && canStart;
  const canPauseOrResume =
    playbackState.status === "running" || playbackState.status === "paused";
  const selectedModeLabel = getModeLabel(playbackState.mode);
  const statusLabel = getPlaybackStatusLabel(playbackState);
  const activeStageLabel = getActiveStageLabel(playbackState);
  const stageProgressLabel = getStageProgressLabel(playbackState);
  const conductorStatus = getConductorStatusLabel(playbackState, conductorOutput);
  const conductorLine = getConductorLine(playbackState, conductorOutput);
  const holdMessages = [
    playbackState.hold ? `HOLD: ${playbackState.hold.reason}` : null,
    ...(conductorOutput?.holds ?? []).map((hold) => `HOLD: ${hold}`),
  ].filter((entry): entry is string => entry !== null);
  const warningMessages = [
    ...playbackState.warnings.map((warning) => warning.message),
    ...(conductorOutput?.warnings ?? []),
  ].slice(-3);

  return (
    <section
      className="mission-playback-controls"
      data-active-mission-stage={playbackState.currentStageId ?? "lobby"}
      data-mission-playback-controls={idle ? "lobby" : "started"}
      data-playback-status={playbackState.status}
      data-selected-mission-mode={playbackState.mode}
    >
      <div className="mission-playback-controls__intro">
        <div>
          <p className="mission-playback-controls__eyebrow">Mission controls</p>
          <h2>{idle ? "Ready for guided walkthrough" : "Mission playback active"}</h2>
          <p>Choose how the proof theater runs.</p>
        </div>
        <div
          className="mission-playback-controls__selected"
          data-mission-selected-mode-visible="true"
        >
          <span>Selected mode</span>
          <strong>{selectedModeLabel}</strong>
          <em>{canSwitchMode ? "Mode can change in lobby" : "Mode locked during run"}</em>
        </div>
      </div>

      <div
        aria-label="Mission playback mode"
        className="mission-playback-controls__modes"
        role="group"
      >
        {MODE_OPTIONS.map((option) => (
          <button
            aria-pressed={playbackState.mode === option.mode}
            className="mission-playback-controls__mode"
            data-mission-mode-option={option.mode}
            disabled={!canSwitchMode}
            key={option.mode}
            onClick={canSwitchMode ? () => onModeChange(option.mode) : undefined}
            type="button"
          >
            <span>{option.label}</span>
            <em>{option.description}</em>
          </button>
        ))}
      </div>

      <div className="mission-playback-controls__actions">
        <button
          className="mission-playback-controls__button mission-playback-controls__button--primary"
          disabled={!canBegin}
          onClick={canBegin ? onBeginMission : undefined}
          type="button"
        >
          Begin Mission
        </button>
        <button
          className="mission-playback-controls__button"
          disabled={!canPauseOrResume}
          onClick={
            canPauseOrResume
              ? playbackState.status === "paused"
                ? onResumeMission
                : onPauseMission
              : undefined
          }
          type="button"
        >
          {playbackState.status === "paused" ? "Resume" : "Pause"}
        </button>
        <button
          className="mission-playback-controls__button"
          disabled={!started}
          onClick={started ? onResetMission : undefined}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="mission-playback-controls__status">
        <div>
          <span>Playback</span>
          <strong>{statusLabel}</strong>
          <em>{stageProgressLabel}</em>
        </div>
        <div>
          <span>Stage</span>
          <strong>{activeStageLabel}</strong>
          <em>{playbackState.runId}</em>
        </div>
        <div>
          <span>Conductor</span>
          <strong>{conductorStatus}</strong>
          <em>{conductorLine}</em>
        </div>
      </div>

      <div
        className="mission-playback-controls__hold"
        data-d3-playback-hold-state={holdMessages.length > 0 ? "holding" : "clear"}
      >
        <span>Safe carry-forward</span>
        <strong>
          Manual proof HOLDs remain unresolved: mobile/judge device proof, authority
          choreography, clean logout, deploy cleanup, final V2-B closeout, Walk-mode
          MP4, phone smoke, portal behavior, OpenFGA/CIBA, delivered notifications,
          voice/audio, TPIA/TRAIGA review, and chain-write proof.
        </strong>
        {holdMessages.length > 0 || warningMessages.length > 0 ? (
          <ul>
            {[...holdMessages, ...warningMessages].map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : (
          <em>D1/D2 substrate has surfaced no D3 playback HOLD.</em>
        )}
      </div>
    </section>
  );
}
