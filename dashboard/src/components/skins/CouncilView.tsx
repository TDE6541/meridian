import {
  getSkinClaimText,
  getSkinSectionLines,
  type DashboardResolvedSkinView,
} from "../../adapters/skinPayloadAdapter.ts";

export interface CouncilViewProps {
  skin: DashboardResolvedSkinView;
}

function isOversightSection(title: string | undefined): boolean {
  return (
    typeof title === "string" &&
    ["Public Hearing", "Voting", "Authority", "Absence"].some((needle) =>
      title.includes(needle)
    )
  );
}

function renderSection(section: DashboardResolvedSkinView["sections"][number]) {
  return (
    <article key={section.id ?? section.title} className="skin-subsection">
      <h4>{section.title ?? section.id ?? "Untitled section"}</h4>
      {getSkinSectionLines(section).map((line, index) => (
        <p key={`${section.id ?? section.title}-${index}`}>{line}</p>
      ))}
    </article>
  );
}

export function CouncilView({ skin }: CouncilViewProps) {
  const briefingSections = skin.sections.filter(
    (section) => !isOversightSection(section.title)
  );
  const oversightSections = skin.sections.filter((section) =>
    isOversightSection(section.title)
  );
  const oversightClaims = skin.claims
    .map((claim) => getSkinClaimText(claim))
    .filter((value): value is string => Boolean(value));

  return (
    <div className="skin-view skin-view--council" data-skin-structure="council-briefing">
      <div className="skin-briefing">
        <article className="skin-card skin-card--accent">
          <p className="skin-card__eyebrow">Resolution brief</p>
          <h3>{briefingSections[0]?.title ?? "Resolution Summary"}</h3>
          {(briefingSections[0]
            ? getSkinSectionLines(briefingSections[0])
            : ["No council resolution summary was present."]).map((line, index) => (
            <p key={`council-brief-${index}`}>{line}</p>
          ))}
        </article>

        <article className="skin-card">
          <p className="skin-card__eyebrow">Oversight focus</p>
          <h3>Decision and obligation cues</h3>
          {oversightClaims.length > 0 ? (
            <ul className="skin-list">
              {oversightClaims.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          ) : (
            <p className="skin-empty-copy">No council claims were present on this step.</p>
          )}
        </article>
      </div>

      <div className="skin-view__columns skin-view__columns--council">
        <article className="skin-card">
          <p className="skin-card__eyebrow">Decision and impact</p>
          <h3>Briefing sections</h3>
          <div className="skin-stack">
            {briefingSections.map((section) => renderSection(section))}
          </div>
        </article>

        <article className="skin-card skin-card--muted">
          <p className="skin-card__eyebrow">Oversight queue</p>
          <h3>Review surfaces</h3>
          <div className="skin-stack">
            {oversightSections.length > 0 ? (
              oversightSections.map((section) => renderSection(section))
            ) : (
              <p className="skin-empty-copy">No oversight-specific sections were present.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
