import {
  getSkinClaimText,
  getSkinSectionLines,
  type DashboardResolvedSkinView,
} from "../../adapters/skinPayloadAdapter.ts";

export interface DispatchViewProps {
  skin: DashboardResolvedSkinView;
}

function renderQueueSection(
  section: DashboardResolvedSkinView["sections"][number],
  index: number
) {
  const lines = getSkinSectionLines(section);

  return (
    <li key={section.id ?? section.title} className="skin-queue-item">
      <span className="skin-queue-item__index">{index + 1}</span>
      <div>
        <h4>{section.title ?? section.id ?? "Untitled section"}</h4>
        {lines.length > 0 ? (
          lines.map((line, lineIndex) => (
            <p key={`${section.id ?? section.title}-${lineIndex}`}>{line}</p>
          ))
        ) : (
          <p className="skin-empty-copy">No section body lines were present in the payload.</p>
        )}
      </div>
    </li>
  );
}

export function DispatchView({ skin }: DispatchViewProps) {
  const leadSection = skin.sections[0] ?? null;
  const queueSections = leadSection ? skin.sections.slice(1) : skin.sections;
  const claimTexts = skin.claims
    .map((claim) => getSkinClaimText(claim))
    .filter((value): value is string => Boolean(value));

  return (
    <div className="skin-view skin-view--dispatch" data-skin-structure="dispatch-console">
      <article className="skin-card skin-card--alert">
        <p className="skin-card__eyebrow">Immediate routing signal</p>
        <h3>{leadSection?.title ?? "Routing exception"}</h3>
        {(leadSection
          ? getSkinSectionLines(leadSection)
          : [
              skin.fallback?.message ??
                "No dispatch section body was present in the payload for this step.",
            ]).map((line, index) => (
          <p key={`dispatch-lead-${index}`}>{line}</p>
        ))}
      </article>

      <div className="skin-view__columns skin-view__columns--dispatch">
        <article className="skin-card">
          <p className="skin-card__eyebrow">Coordination queue</p>
          <h3>Dispatch sequencing</h3>
          {queueSections.length > 0 ? (
            <ol className="skin-queue-list">
              {queueSections.map((section, index) => renderQueueSection(section, index))}
            </ol>
          ) : (
            <p className="skin-empty-copy">No dispatch queue sections were present.</p>
          )}
        </article>

        <article className="skin-card skin-card--muted">
          <p className="skin-card__eyebrow">Routing notes</p>
          <h3>Claims and absences</h3>
          {claimTexts.length > 0 ? (
            <ul className="skin-list">
              {claimTexts.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : null}
          {skin.absences.length > 0 ? (
            <ul className="skin-list skin-list--secondary">
              {skin.absences.map((absence) => (
                <li key={absence.id ?? absence.displayText}>
                  {absence.displayText ?? absence.id ?? "Absence present without display text."}
                </li>
              ))}
            </ul>
          ) : null}
          {claimTexts.length === 0 && skin.absences.length === 0 ? (
            <p className="skin-empty-copy">No dispatch notes were present on this step.</p>
          ) : null}
        </article>
      </div>
    </div>
  );
}
