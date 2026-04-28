import {
  MISSION_RAIL_LABELS,
  type MissionRailStage,
} from "../demo/missionRail.ts";

export interface MissionRailProps {
  stages: readonly MissionRailStage[];
}

function getStage(
  stages: readonly MissionRailStage[],
  label: MissionRailStage["label"],
  index: number
): MissionRailStage {
  return (
    stages.find((stage) => stage.label === label) ?? {
      index,
      label,
      source: "awaiting existing state",
      state: "pending",
    }
  );
}

export function MissionRail({ stages }: MissionRailProps) {
  return (
    <nav className="mission-rail" aria-label="Mission rail" data-mission-rail="true">
      <ol className="mission-rail__list">
        {MISSION_RAIL_LABELS.map((label, index) => {
          const stage = getStage(stages, label, index);

          return (
            <li
              className={`mission-rail__stage mission-rail__stage--${stage.state}`}
              data-mission-stage-label={stage.label}
              data-mission-stage-state={stage.state}
              key={stage.label}
            >
              <span className="mission-rail__index">{String(index + 1).padStart(2, "0")}</span>
              <span className="mission-rail__label">{stage.label}</span>
              <span className="mission-rail__state">{stage.state}</span>
              <span className="mission-rail__source">{stage.source}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
