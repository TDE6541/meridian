import type { JudgeTouchboardCard } from "../demo/judgeTouchboardDeck.ts";
import { buildMissionEvidenceNavigatorView } from "../demo/missionEvidenceNavigator.ts";

export interface MissionEvidenceNavigatorProps {
  card?: JudgeTouchboardCard | null;
}

export function MissionEvidenceNavigator({
  card = null,
}: MissionEvidenceNavigatorProps) {
  const view = buildMissionEvidenceNavigatorView(card);

  return (
    <section
      aria-labelledby="mission-evidence-navigator-title"
      className="mission-evidence-navigator"
      data-dom-poking="false"
      data-imperative-clicks="false"
      data-mission-evidence-navigator="true"
      data-mission-evidence-navigator-selected={view.selected ? "true" : "false"}
      data-mission-evidence-source-mode={view.source_mode}
      data-proof-mutation="false"
    >
      <div className="mission-evidence-navigator__header">
        <div>
          <p className="mission-evidence-navigator__eyebrow">
            Evidence Navigator
          </p>
          <h2 id="mission-evidence-navigator-title">Look Here</h2>
          <p>{view.boundary_copy}</p>
        </div>
        <div className="mission-evidence-navigator__status">
          <span>Status</span>
          <strong>{view.status_label}</strong>
          <em>{view.card_label}</em>
        </div>
      </div>

      <div className="mission-evidence-navigator__targets">
        {view.targets.length > 0 ? (
          view.targets.map((target) => (
            <article
              className="mission-evidence-navigator__target"
              data-evidence-navigator-target={target.kind}
              data-proof-tools-grouping={target.proof_tools_grouping}
              key={`${target.kind}:${target.card_target_id}`}
            >
              <span>{target.label}</span>
              <strong>{target.card_target_label}</strong>
              <p>{target.route_instruction}</p>
              <dl>
                <div>
                  <dt>Summary</dt>
                  <dd>{target.card_target_summary || target.summary}</dd>
                </div>
                <div>
                  <dt>Source ref</dt>
                  <dd>{target.card_target_source_ref || target.source_ref}</dd>
                </div>
                <div>
                  <dt>Fallback</dt>
                  <dd>{target.fallback_text}</dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <article
            className="mission-evidence-navigator__target mission-evidence-navigator__target--fallback"
            data-evidence-navigator-target="safe-fallback"
          >
            <span>Ready</span>
            <strong>No proof target selected</strong>
            <p>
              The navigator waits for a judge card and keeps Proof Tools grouped.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
