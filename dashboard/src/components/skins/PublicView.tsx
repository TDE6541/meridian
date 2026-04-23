import {
  getSkinClaimText,
  getSkinRedactionText,
  getSkinSectionLines,
  type DashboardResolvedSkinView,
} from "../../adapters/skinPayloadAdapter.ts";

export interface PublicViewProps {
  skin: DashboardResolvedSkinView;
}

function isDisclosureSection(title: string | undefined): boolean {
  return typeof title === "string" && title.includes("Disclosure");
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

export function PublicView({ skin }: PublicViewProps) {
  const narrativeSections = skin.sections.filter(
    (section) => !isDisclosureSection(section.title)
  );
  const disclosureSections = skin.sections.filter((section) =>
    isDisclosureSection(section.title)
  );
  const claimTexts = skin.claims
    .map((claim) => getSkinClaimText(claim))
    .filter((value): value is string => Boolean(value));

  return (
    <div className="skin-view skin-view--public" data-skin-structure="public-bulletin">
      <article className="skin-card skin-card--accent">
        <p className="skin-card__eyebrow">Public narrative</p>
        <h3>{narrativeSections[0]?.title ?? "Public Decision Summary"}</h3>
        {(narrativeSections[0]
          ? getSkinSectionLines(narrativeSections[0])
          : ["No public summary section was present."]).map((line, index) => (
          <p key={`public-summary-${index}`}>{line}</p>
        ))}
      </article>

      <div className="skin-view__columns skin-view__columns--public">
        <article className="skin-card">
          <p className="skin-card__eyebrow">Release-safe detail</p>
          <h3>Published sections</h3>
          <div className="skin-stack">
            {narrativeSections.slice(1).map((section) => renderSection(section))}
            {claimTexts.length > 0 ? (
              <ul className="skin-list skin-list--secondary">
                {claimTexts.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>

        <article className="skin-card skin-card--alert">
          <p className="skin-card__eyebrow">Disclosure boundary</p>
          <h3>Redactions and notices</h3>
          <div className="skin-stack">
            {disclosureSections.map((section) => renderSection(section))}
            {skin.redactions.length > 0 ? (
              <ul className="skin-list">
                {skin.redactions.map((redaction) => (
                  <li key={redaction.id ?? redaction.noticeId}>
                    <strong>{redaction.marker ?? "[detail withheld]"}</strong>{" "}
                    {getSkinRedactionText(redaction) ??
                      redaction.noticeId ??
                      "Redaction present without display text."}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="skin-empty-copy">
                No public redactions are present on this step.
              </p>
            )}
          </div>
        </article>
      </div>

      <article className="skin-card skin-card--muted">
        <p className="skin-card__eyebrow">Disclosure hold state</p>
        <h3>Visible absence cues</h3>
        {skin.absences.length > 0 ? (
          <ul className="skin-list">
            {skin.absences.map((absence) => (
              <li key={absence.id ?? absence.displayText}>
                {absence.displayText ?? absence.id ?? "Absence present without display text."}
              </li>
            ))}
          </ul>
        ) : (
          <p className="skin-empty-copy">No disclosure holds are present on this step.</p>
        )}
      </article>
    </div>
  );
}
