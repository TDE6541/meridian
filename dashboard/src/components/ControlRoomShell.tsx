import { useEffect, useState } from "react";
import { GovernanceStatePanel } from "./GovernanceStatePanel.tsx";
import { OutcomeBadge } from "./OutcomeBadge.tsx";
import { PlaybackControls } from "./PlaybackControls.tsx";
import { ScenarioSelector } from "./ScenarioSelector.tsx";
import { StatusBar } from "./StatusBar.tsx";
import { TimelinePanel } from "./TimelinePanel.tsx";
import {
  advancePlayback,
  buildTimelineSteps,
  createInitialControlRoomState,
  getActiveTimelineStep,
  getScenarioRecord,
  getScenarioStepCount,
  goToNextStep,
  goToPreviousStep,
  pausePlayback,
  resetControlRoom,
  resolveScenarioDataVersion,
  selectScenario,
  selectStep,
  startPlayback,
} from "../state/controlRoomState.ts";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

const PLAYBACK_INTERVAL_MS = 2400;

export interface ControlRoomShellProps {
  records: readonly ControlRoomScenarioRecord[];
}

function getScenarioStatusLabel(record: ControlRoomScenarioRecord | undefined): string {
  if (!record) {
    return "UNAVAILABLE";
  }

  if (record.status === "ready") {
    return record.scenario.status;
  }

  return record.status.toUpperCase();
}

function getShellMessage(record: ControlRoomScenarioRecord | undefined): string {
  if (!record) {
    return "Scenario snapshot is unavailable.";
  }

  if (record.status === "loading") {
    return "Loading committed snapshot payload.";
  }

  if (record.status === "error") {
    return record.error;
  }

  return `${record.scenario.steps.length} frozen cascade steps available.`;
}

export function ControlRoomShell({ records }: ControlRoomShellProps) {
  const [controlState, setControlState] = useState(() =>
    createInitialControlRoomState(records[0]?.entry.key ?? "routine")
  );

  const selectedRecord =
    getScenarioRecord(records, controlState.selectedScenarioKey) ?? records[0];
  const readyCount = records.filter((record) => record.status === "ready").length;
  const errorCount = records.filter((record) => record.status === "error").length;
  const totalSteps = getScenarioStepCount(selectedRecord);
  const timelineSteps =
    selectedRecord?.status === "ready" ? buildTimelineSteps(selectedRecord.scenario) : [];
  const currentStep = getActiveTimelineStep(timelineSteps, controlState);
  const dataVersion = resolveScenarioDataVersion(selectedRecord);
  const scenarioId =
    selectedRecord?.status === "ready"
      ? selectedRecord.scenario.scenarioId
      : selectedRecord?.entry.key ?? "unavailable";
  const activeStepLabel = currentStep
    ? `${currentStep.stepId} (${currentStep.index + 1}/${timelineSteps.length})`
    : totalSteps > 0
      ? `${controlState.activeStepIndex + 1}/${totalSteps}`
      : "Unavailable";

  useEffect(() => {
    if (controlState.playbackState !== "playing" || totalSteps === 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setControlState((current) => advancePlayback(current, totalSteps));
    }, PLAYBACK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [controlState.playbackState, totalSteps, controlState.selectedScenarioKey]);

  return (
    <section className="control-room-shell">
      <header className="hero control-room-hero">
        <div className="control-room-hero__copy">
          <p className="eyebrow">Wave 9 Packet 2</p>
          <h1>Control Room Shell</h1>
          <p className="hero-copy">
            Scenario selector, timeline, deterministic playback, governance state, and
            status bar over frozen Wave 8 replay+cascade payloads only.
          </p>
        </div>

        <div className="panel panel--inset control-room-hero__current">
          <div className="control-room-hero__status">
            <div>
              <p className="status-label">Active step</p>
              <p className="control-room-hero__step">{activeStepLabel}</p>
            </div>
            <OutcomeBadge decision={currentStep?.decision} />
          </div>

          <dl className="hero-facts">
            <div>
              <dt>scenario status</dt>
              <dd>{getScenarioStatusLabel(selectedRecord)}</dd>
            </div>
            <div>
              <dt>loaded snapshots</dt>
              <dd>
                {readyCount}/{records.length}
              </dd>
            </div>
            <div>
              <dt>load failures</dt>
              <dd>{errorCount}</dd>
            </div>
            <div>
              <dt>data version</dt>
              <dd>{dataVersion ?? "Pending"}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="control-room-toolbar">
        <ScenarioSelector
          records={records}
          selectedScenarioKey={controlState.selectedScenarioKey}
          onSelect={(scenarioKey) =>
            setControlState((current) => selectScenario(current, scenarioKey))
          }
        />

        <PlaybackControls
          activeStepIndex={controlState.activeStepIndex}
          canInteract={selectedRecord?.status === "ready"}
          isPlaying={controlState.playbackState === "playing"}
          onNext={() =>
            setControlState((current) => goToNextStep(current, totalSteps))
          }
          onPause={() => setControlState((current) => pausePlayback(current))}
          onPlay={() =>
            setControlState((current) => startPlayback(current, totalSteps))
          }
          onPrevious={() =>
            setControlState((current) => goToPreviousStep(current, totalSteps))
          }
          onReset={() => setControlState((current) => resetControlRoom(current))}
          totalSteps={totalSteps}
        />
      </div>

      <div className="control-room-grid">
        <TimelinePanel
          activeStepIndex={controlState.activeStepIndex}
          message={getShellMessage(selectedRecord)}
          onSelectStep={(index) =>
            setControlState((current) => selectStep(current, index, totalSteps))
          }
          status={selectedRecord?.status ?? "loading"}
          timelineSteps={timelineSteps}
        />

        <GovernanceStatePanel
          currentStep={currentStep}
          message={getShellMessage(selectedRecord)}
          status={selectedRecord?.status ?? "loading"}
        />
      </div>

      <StatusBar
        activeOutcome={currentStep?.decision ?? null}
        activeStepLabel={activeStepLabel}
        dataVersion={dataVersion}
        scenarioId={scenarioId}
      />
    </section>
  );
}
