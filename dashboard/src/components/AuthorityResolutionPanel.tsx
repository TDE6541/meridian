import type {
  AuthorityDashboardStateV1,
  AuthorityResolutionItem,
  AuthorityDashboardSourceRef,
} from "../authority/authorityDashboardTypes.ts";

export interface AuthorityResolutionPanelProps {
  state: AuthorityDashboardStateV1;
}

function displayValue(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "Not supplied";
}

function displaySourceRef(ref: AuthorityDashboardSourceRef): string {
  return [ref.source_kind, ref.path, ref.evidence_id].filter(Boolean).join(":");
}

function renderInternalDetail(item: AuthorityResolutionItem, redactionMode: string) {
  if (redactionMode === "public") {
    return (
      <p className="detail-copy">
        Restricted authority detail redacted for public dashboard role.
      </p>
    );
  }

  return (
    <div className="forensic-entry__refs">
      <span>{item.restricted_detail ?? "Restricted detail not supplied."}</span>
    </div>
  );
}

export function AuthorityResolutionPanel({ state }: AuthorityResolutionPanelProps) {
  const hasRequests = state.requests.length > 0;

  return (
    <section className="governance-card" data-authority-resolution-panel="true">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Dashboard-local authority cockpit</p>
          <h2>Authority Resolution Panel</h2>
        </div>
      </div>

      {state.advisories.length > 0 ? (
        <div className="signal-list">
          {state.advisories.map((advisory) => (
            <div className="signal-card signal-card--hold" key={advisory.code}>
              <strong>{advisory.severity}: {advisory.code}</strong>
              <span>{advisory.message}</span>
            </div>
          ))}
        </div>
      ) : null}

      {!hasRequests ? (
        <p className="empty-state">
          No authority requests or active authority resolutions are present in the selected dashboard input.
        </p>
      ) : (
        <div className="forensic-list">
          {state.requests.map((item) => (
            <article className="forensic-entry" key={item.request_id}>
              <div className="forensic-entry__header">
                <div>
                  <p className="eyebrow">{item.item_type}</p>
                  <h3>{item.public_summary}</h3>
                </div>
                <span className={`live-event-card__severity live-event-card__severity--${item.status}`}>
                  {item.status}
                </span>
              </div>

              <div className="fact-grid fact-grid--compact">
                <div>
                  <span className="fact-label">Required role</span>
                  <strong>{displayValue(item.required_authority_role)}</strong>
                </div>
                <div>
                  <span className="fact-label">Department</span>
                  <strong>{displayValue(item.required_authority_department)}</strong>
                </div>
                <div>
                  <span className="fact-label">Source absence</span>
                  <strong>{displayValue(item.source_absence_id)}</strong>
                </div>
                <div>
                  <span className="fact-label">Governance ref</span>
                  <strong>{displayValue(item.source_governance_evaluation)}</strong>
                </div>
              </div>

              {renderInternalDetail(item, state.redaction_mode)}

              {item.source_refs.length > 0 ? (
                <div className="source-ref-list">
                  {item.source_refs.map((ref) => (
                    <span key={displaySourceRef(ref)}>{displaySourceRef(ref)}</span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
