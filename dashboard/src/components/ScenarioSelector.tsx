import {
  getScenarioRecord,
  getScenarioStepCount,
} from "../state/controlRoomState.ts";
import type {
  ControlRoomScenarioRecord,
} from "../state/controlRoomState.ts";
import type { ScenarioKey } from "../types/scenario.ts";

export interface ScenarioSelectorProps {
  onSelect: (key: ScenarioKey) => void;
  records: readonly ControlRoomScenarioRecord[];
  selectedScenarioKey: ScenarioKey;
}

function getStatusLabel(record: ControlRoomScenarioRecord): string {
  switch (record.status) {
    case "ready":
      return record.scenario.status;
    case "error":
      return "ERROR";
    default:
      return "LOADING";
  }
}

function getStatusMessage(record: ControlRoomScenarioRecord | undefined): string {
  if (!record) {
    return "Scenario snapshot is unavailable.";
  }

  if (record.status === "error") {
    return record.error;
  }

  if (record.status === "loading") {
    return "Loading committed snapshot payload.";
  }

  return `${record.scenario.scenarioId} · ${getScenarioStepCount(record)} steps · ${record.payload.contractVersion}`;
}

export function ScenarioSelector({
  onSelect,
  records,
  selectedScenarioKey,
}: ScenarioSelectorProps) {
  const selectedRecord = getScenarioRecord(records, selectedScenarioKey);

  return (
    <section className="panel scenario-selector" aria-labelledby="scenario-selector-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Scenario selector</p>
        <h2 id="scenario-selector-title">Frozen Wave 8 scenarios</h2>
      </div>

      <div className="scenario-selector__options" role="tablist" aria-label="Scenario selector">
        {records.map((record) => (
          <button
            type="button"
            key={record.entry.key}
            className={[
              "selector-button",
              `selector-button--${record.status}`,
              record.entry.key === selectedScenarioKey ? "selector-button--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-scenario-key={record.entry.key}
            aria-pressed={record.entry.key === selectedScenarioKey}
            onClick={() => onSelect(record.entry.key)}
          >
            <span className="selector-button__key">{record.entry.key}</span>
            <strong>{record.entry.label}</strong>
            <span className="selector-button__status">{getStatusLabel(record)}</span>
          </button>
        ))}
      </div>

      <p className="selector-note">
        Scenario switching resets the active step to the first frozen cascade step.
      </p>

      <p
        className={
          selectedRecord?.status === "error"
            ? "selector-message selector-message--error"
            : "selector-message"
        }
        role={selectedRecord?.status === "error" ? "alert" : undefined}
      >
        {getStatusMessage(selectedRecord)}
      </p>
    </section>
  );
}
