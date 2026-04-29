import type { MissionPhysicalProjectionV1 } from "../demo/missionPhysicalProjection.ts";
import { deriveCivicTwinDioramaView } from "../demo/civicTwinDioramaView.ts";

export interface CivicTwinDioramaProps {
  projection?: MissionPhysicalProjectionV1 | null;
}

export function CivicTwinDiorama({ projection = null }: CivicTwinDioramaProps) {
  const view = deriveCivicTwinDioramaView(projection);

  return (
    <section
      aria-labelledby="civic-twin-diorama-title"
      className={`civic-twin-diorama civic-twin-diorama--${view.status}`}
      data-civic-twin-active-stage={view.active_stage_id ?? "none"}
      data-civic-twin-diorama="true"
      data-civic-twin-public-boundary-active={
        view.public_boundary_active ? "true" : "false"
      }
      data-civic-twin-source-mode={view.source_mode}
      data-no-accela="true"
      data-no-live-gis="true"
      data-no-official-city-record="true"
    >
      <div className="civic-twin-diorama__header">
        <div>
          <p className="civic-twin-diorama__eyebrow">Civic Twin Diorama</p>
          <h2 id="civic-twin-diorama-title">Permit #4471 State Model</h2>
          <p className="civic-twin-diorama__boundary">{view.boundary_copy}</p>
        </div>
        <div className="civic-twin-diorama__status">
          <span>Scenario</span>
          <strong>{view.scenario_label}</strong>
          <em>{view.status_label}</em>
        </div>
      </div>

      <div className="civic-twin-diorama__readouts">
        <div>
          <span>Source</span>
          <strong>{view.source_label}</strong>
          <em>{view.source_posture_label}</em>
        </div>
        <div>
          <span>Active stage</span>
          <strong>{view.active_stage_label}</strong>
          <em>{view.source_ref}</em>
        </div>
        <div>
          <span>Nodes / edges</span>
          <strong>
            {view.node_count} / {view.edge_count}
          </strong>
          <em>{view.motion_label}</em>
        </div>
      </div>

      <div
        className="civic-twin-diorama__model"
        data-civic-twin-public-boundary-dimming={
          view.public_boundary_active ? "true" : "false"
        }
      >
        <div
          className="civic-twin-diorama__boundary-region"
          data-civic-twin-public-boundary="visible"
        >
          <span>Public boundary</span>
          <strong>
            Public-safe nodes stay visible; restricted nodes are marked and dimmed
            during public-stage posture.
          </strong>
        </div>

        <div className="civic-twin-diorama__legend" aria-label="Civic twin legend">
          {(["public_safe", "restricted", "internal"] as const).map((visibility) => (
            <span
              className={`civic-twin-diorama__legend-pill civic-twin-diorama__legend-pill--${visibility}`}
              data-civic-twin-legend-visibility={visibility}
              key={visibility}
            >
              {visibility.replace("_", "-")}
            </span>
          ))}
          {(["idle", "active", "holding", "complete", "dimmed"] as const).map(
            (state) => (
              <span
                className={`civic-twin-diorama__legend-pill civic-twin-diorama__legend-pill--${state}`}
                data-civic-twin-legend-state={state}
                key={state}
              >
                {state}
              </span>
            )
          )}
        </div>

        <div className="civic-twin-diorama__nodes">
          {view.nodes.length > 0 ? (
            view.nodes.map((node) => (
              <article
                className={`civic-twin-node civic-twin-node--${node.visibility} civic-twin-node--${node.state} civic-twin-node--kind-${node.display_kind}`}
                data-civic-twin-active-node={node.active ? "true" : "false"}
                data-civic-twin-node={node.node_id}
                data-civic-twin-node-kind={node.display_kind}
                data-civic-twin-node-state={node.state}
                data-civic-twin-node-visibility={node.visibility}
                data-civic-twin-source-node-kind={node.source_kind}
                key={node.node_id}
              >
                <div className="civic-twin-node__header">
                  <span>{node.kind_label}</span>
                  <strong>{node.label}</strong>
                </div>
                <p>{node.summary}</p>
                <dl>
                  <div>
                    <dt>Visibility</dt>
                    <dd>{node.visibility_label}</dd>
                  </div>
                  <div>
                    <dt>State</dt>
                    <dd>{node.state_label}</dd>
                  </div>
                  <div>
                    <dt>Source kind</dt>
                    <dd>{node.source_kind}</dd>
                  </div>
                  <div>
                    <dt>Source</dt>
                    <dd>{node.source_label}</dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <article
              className="civic-twin-node civic-twin-node--holding civic-twin-node--fallback"
              data-civic-twin-node="safe-fallback"
              data-civic-twin-node-state="holding"
              data-civic-twin-node-visibility="restricted"
            >
              <div className="civic-twin-node__header">
                <span>civic node</span>
                <strong>HOLD: diorama unavailable</strong>
              </div>
              <p>{view.fallback_copy}</p>
            </article>
          )}
        </div>
      </div>

      <div className="civic-twin-diorama__edges" aria-label="Civic twin edges">
        {view.edges.length > 0 ? (
          view.edges.map((edge) => (
            <article
              className={`civic-twin-edge civic-twin-edge--${edge.state} civic-twin-edge--${edge.visibility}`}
              data-civic-twin-edge={edge.edge_id}
              data-civic-twin-edge-kind={edge.edge_kind}
              data-civic-twin-edge-posture={edge.state}
              data-civic-twin-edge-visibility={edge.visibility}
              key={edge.edge_id}
            >
              <span>{edge.edge_kind_label}</span>
              <strong>
                {edge.from_label} -&gt; {edge.to_label}
              </strong>
              <p>{edge.label}</p>
              <dl>
                <div>
                  <dt>Posture</dt>
                  <dd>{edge.posture_label}</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>{edge.visibility_label}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{edge.source_label}</dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <article
            className="civic-twin-edge civic-twin-edge--inactive"
            data-civic-twin-edge="safe-fallback"
            data-civic-twin-edge-posture="inactive"
          >
            <span>dependency</span>
            <strong>HOLD: no D4 diorama edges available</strong>
            <p>{view.fallback_copy}</p>
          </article>
        )}
      </div>

      <div className="civic-twin-diorama__footer">
        <span>{view.motion_label}</span>
        <span>{view.fallback_copy}</span>
      </div>
    </section>
  );
}
