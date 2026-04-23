import type { EntityRelationshipView } from "../adapters/entityRelationshipAdapter.ts";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

export interface EntityRelationshipGraphProps {
  message?: string;
  status: ControlRoomScenarioRecord["status"];
  view: EntityRelationshipView;
}

export function EntityRelationshipGraph({
  message,
  status,
  view,
}: EntityRelationshipGraphProps) {
  return (
    <section className="panel relationship-graph" aria-labelledby="relationship-graph-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Relationship graph</p>
        <h2 id="relationship-graph-title">Sparse linked-entity view</h2>
      </div>

      {status !== "ready" ? (
        <div className="empty-state">
          <p>{message ?? "Entity relationship graph is unavailable."}</p>
        </div>
      ) : !view.hasGraph ? (
        <div className="empty-state">
          <p>{view.fallbackMessage}</p>
        </div>
      ) : (
        <div className="relationship-graph__canvas" data-relationship-graph="sparse">
          <div className="relationship-graph__nodes" aria-label="Relationship nodes">
            {view.nodes.map((node) => (
              <div
                key={node.id}
                className={`relationship-node relationship-node--${node.kind}`}
                data-node-kind={node.kind}
              >
                <p>{node.kind}</p>
                <strong>{node.label}</strong>
                {node.detail ? <span>{node.detail}</span> : null}
                <small>{node.sourcePath}</small>
              </div>
            ))}
          </div>

          <ol className="relationship-graph__edges" aria-label="Relationship edges">
            {view.edges.map((edge) => {
              const from = view.nodes.find((node) => node.id === edge.from);
              const to = view.nodes.find((node) => node.id === edge.to);

              return (
                <li key={`${edge.from}-${edge.to}-${edge.label}`}>
                  <strong>{edge.label}</strong>
                  <span>
                    {from?.label ?? edge.from} to {to?.label ?? edge.to}
                  </span>
                  <small>{edge.sourcePath}</small>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
