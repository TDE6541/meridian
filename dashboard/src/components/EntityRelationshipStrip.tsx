import type { EntityRelationshipView } from "../adapters/entityRelationshipAdapter.ts";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

export interface EntityRelationshipStripProps {
  message?: string;
  status: ControlRoomScenarioRecord["status"];
  view: EntityRelationshipView;
}

export function EntityRelationshipStrip({
  message,
  status,
  view,
}: EntityRelationshipStripProps) {
  return (
    <section className="panel relationship-strip" aria-labelledby="relationship-strip-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Entity relationships</p>
        <h2 id="relationship-strip-title">Active-step indicators</h2>
      </div>

      {status !== "ready" ? (
        <div className="empty-state">
          <p>{message ?? "Entity relationship indicators are unavailable."}</p>
        </div>
      ) : view.indicators.length === 0 ? (
        <div className="empty-state">
          <p>{view.fallbackMessage}</p>
        </div>
      ) : (
        <div className="relationship-strip__items">
          {view.indicators.map((indicator) => (
            <div
              key={`${indicator.label}-${indicator.value}-${indicator.sourcePath}`}
              className="relationship-indicator"
            >
              <p>{indicator.label}</p>
              <strong>{indicator.value}</strong>
              <span>{indicator.sourcePath}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
