import {
  getSkinClaimText,
  getSkinSectionLines,
  type DashboardResolvedSkinView,
} from "../../adapters/skinPayloadAdapter.ts";

export interface OperationsViewProps {
  skin: DashboardResolvedSkinView;
}

function renderSection(section: DashboardResolvedSkinView["sections"][number]) {
  const lines = getSkinSectionLines(section);

  return (
    <article key={section.id ?? section.title} className="skin-subsection">
      <h4>{section.title ?? section.id ?? "Untitled section"}</h4>
      {lines.length > 0 ? (
        lines.map((line, index) => <p key={`${section.id ?? section.title}-${index}`}>{line}</p>)
      ) : (
        <p className="skin-empty-copy">No section body lines were present in the payload.</p>
      )}
    </article>
  );
}

function isExecutionSection(title: string | undefined): boolean {
  return (
    typeof title === "string" &&
    ["Work Order", "Corridor", "Asset", "Maintenance", "Responsible"].some((needle) =>
      title.includes(needle)
    )
  );
}

export function OperationsView({ skin }: OperationsViewProps) {
  const executionSections = skin.sections.filter((section) =>
    isExecutionSection(section.title)
  );
  const queueSections = skin.sections.filter(
    (section) => !isExecutionSection(section.title)
  );
  const executionClaims = skin.claims
    .map((claim) => getSkinClaimText(claim))
    .filter((value): value is string => Boolean(value));

  return (
    <div
      className="skin-view skin-view--operations"
      data-skin-structure="operations-board"
    >
      <div className="skin-view__hero">
        <article className="skin-card skin-card--accent">
          <p className="skin-card__eyebrow">Execution posture</p>
          <h3>{executionSections[0]?.title ?? "Work Order Summary"}</h3>
          {(executionSections[0]
            ? getSkinSectionLines(executionSections[0])
            : ["No operations summary was present."]).map((line, index) => (
            <p key={`operations-hero-${index}`}>{line}</p>
          ))}
        </article>

        <article className="skin-card">
          <p className="skin-card__eyebrow">Operational signals</p>
          <h3>Execution cues</h3>
          {executionClaims.length > 0 ? (
            <ul className="skin-list">
              {executionClaims.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : (
            <p className="skin-empty-copy">No operations claims were present.</p>
          )}
        </article>
      </div>

      <div className="skin-view__columns skin-view__columns--operations">
        <article className="skin-card">
          <p className="skin-card__eyebrow">Execution board</p>
          <h3>Work order sequence</h3>
          <div className="skin-stack">
            {executionSections.length > 0 ? (
              executionSections.map((section) => renderSection(section))
            ) : (
              <p className="skin-empty-copy">No execution sections were present.</p>
            )}
          </div>
        </article>

        <article className="skin-card skin-card--muted">
          <p className="skin-card__eyebrow">Constraint queue</p>
          <h3>Gaps and escalation</h3>
          <div className="skin-stack">
            {queueSections.map((section) => renderSection(section))}
            {skin.absences.length > 0 ? (
              <ul className="skin-list">
                {skin.absences.map((absence) => (
                  <li key={absence.id ?? absence.displayText}>
                    {absence.displayText ?? absence.id ?? "Absence present without display text."}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}
