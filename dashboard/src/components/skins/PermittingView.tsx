import {
  getSkinClaimText,
  getSkinSectionLines,
  type DashboardResolvedSkinView,
} from "../../adapters/skinPayloadAdapter.ts";

export interface PermittingViewProps {
  skin: DashboardResolvedSkinView;
}

function matchesNeedle(value: string | undefined, needles: readonly string[]): boolean {
  return typeof value === "string" && needles.some((needle) => value.includes(needle));
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

function renderClaimList(
  claims: DashboardResolvedSkinView["claims"],
  emptyText: string
) {
  const texts = claims
    .map((claim) => getSkinClaimText(claim))
    .filter((value): value is string => Boolean(value));

  return texts.length > 0 ? (
    <ul className="skin-list">
      {texts.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  ) : (
    <p className="skin-empty-copy">{emptyText}</p>
  );
}

export function PermittingView({ skin }: PermittingViewProps) {
  const leadSection = skin.sections[0] ?? null;
  const approvalClaims = skin.claims.filter((claim) =>
    matchesNeedle(claim.id, ["approval", "authority", "revocation"])
  );
  const statusClaims = skin.claims.filter((claim) =>
    matchesNeedle(claim.id, ["decision", "confidence", "promise"])
  );
  const remainingSections = leadSection ? skin.sections.slice(1) : skin.sections;

  return (
    <div
      className="skin-view skin-view--permitting"
      data-skin-structure="permitting-ledger"
    >
      <div className="skin-view__hero">
        <article className="skin-card skin-card--accent">
          <p className="skin-card__eyebrow">Permit posture</p>
          <h3>{leadSection?.title ?? "Permit Status"}</h3>
          {leadSection ? (
            getSkinSectionLines(leadSection).map((line, index) => (
              <p key={`permit-hero-${index}`}>{line}</p>
            ))
          ) : (
            <p className="skin-empty-copy">No lead permitting section was present.</p>
          )}
        </article>

        <article className="skin-card">
          <p className="skin-card__eyebrow">Approval signals</p>
          <h3>Required approvals and authority trail</h3>
          {renderClaimList(
            approvalClaims,
            "No approval or authority claims were present on this step."
          )}
        </article>
      </div>

      <div className="skin-view__columns skin-view__columns--permit">
        <article className="skin-card">
          <p className="skin-card__eyebrow">Status trace</p>
          <h3>Decision framing</h3>
          {renderClaimList(statusClaims, "No status claims were present on this step.")}
        </article>

        <article className="skin-card">
          <p className="skin-card__eyebrow">Permit ledger</p>
          <h3>Section sequence</h3>
          <div className="skin-stack">
            {remainingSections.length > 0 ? (
              remainingSections.map((section) => renderSection(section))
            ) : (
              <p className="skin-empty-copy">No additional permitting sections were present.</p>
            )}
          </div>
        </article>
      </div>

      {skin.absences.length > 0 ? (
        <article className="skin-card skin-card--muted">
          <p className="skin-card__eyebrow">Absence cues</p>
          <h3>Deterministic gaps</h3>
          <ul className="skin-list">
            {skin.absences.map((absence) => (
              <li key={absence.id ?? absence.displayText}>
                {absence.displayText ?? absence.id ?? "Absence present without display text."}
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}
