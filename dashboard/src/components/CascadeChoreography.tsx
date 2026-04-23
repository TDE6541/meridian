import type { CascadeChoreographyView } from "../adapters/cascadeChoreographyAdapter.ts";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

export interface CascadeChoreographyProps {
  message?: string;
  status: ControlRoomScenarioRecord["status"];
  view: CascadeChoreographyView;
}

export function CascadeChoreography({
  message,
  status,
  view,
}: CascadeChoreographyProps) {
  return (
    <section className="panel choreography-panel" aria-labelledby="choreography-panel-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Cascade choreography</p>
        <h2 id="choreography-panel-title">Step-local stage sequence</h2>
      </div>

      {status !== "ready" ? (
        <div className="empty-state">
          <p>{message ?? "Cascade choreography is unavailable."}</p>
        </div>
      ) : view.stages.length === 0 ? (
        <div className="empty-state">
          <p>{view.fallbackMessage}</p>
        </div>
      ) : (
        <ol className="choreography-list" data-choreography-step={view.activeStepId ?? ""}>
          {view.stages.map((stage, index) => (
            <li
              key={stage.key}
              className={`choreography-stage choreography-stage--${stage.key}`}
              data-choreography-stage={stage.key}
            >
              <span className="choreography-stage__index">{index + 1}</span>
              <div>
                <p className="choreography-stage__label">{stage.label}</p>
                <h3>{stage.value}</h3>
                <p>{stage.detail}</p>
                <small>
                  {stage.status} · {stage.sourcePath}
                </small>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
