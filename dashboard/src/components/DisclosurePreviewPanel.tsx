import type { DisclosurePreviewReportV1 } from "../authority/authorityDashboardTypes.ts";

export interface DisclosurePreviewPanelProps {
  report: DisclosurePreviewReportV1;
}

export function DisclosurePreviewPanel({ report }: DisclosurePreviewPanelProps) {
  return (
    <section className="governance-card" data-disclosure-preview-panel="true">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{report.contract}</p>
          <h2>Disclosure preview</h2>
        </div>
        <span className={`live-status-badge live-status-badge--${report.status}`}>
          {report.status}
        </span>
      </div>

      <p className="detail-copy">{report.disclaimer}</p>

      <div className="fact-grid fact-grid--compact">
        <div>
          <span className="fact-label">Scenario</span>
          <strong>{report.scenario_label ?? "not supplied"}</strong>
        </div>
        <div>
          <span className="fact-label">Session</span>
          <strong>{report.session_label ?? "not supplied"}</strong>
        </div>
        <div>
          <span className="fact-label">Generated</span>
          <strong>{report.generated_at ?? "HOLD: timestamp not supplied"}</strong>
        </div>
      </div>

      <div className="signal-list">
        <div className="signal-card">
          <strong>Public-safe summary</strong>
          <span>{report.public_safe_summary}</span>
        </div>
        <div className="signal-card">
          <strong>Redaction summary</strong>
          <span>{report.redaction_summary.join(" ")}</span>
        </div>
      </div>

      {report.unresolved_holds.length > 0 ? (
        <div className="signal-list">
          {report.unresolved_holds.map((hold) => (
            <div className="signal-card signal-card--hold" key={hold}>
              <strong>Unresolved HOLD</strong>
              <span>{hold}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="source-ref-list">
        {report.restricted_fields_excluded.map((field) => (
          <span key={field}>{field}</span>
        ))}
      </div>

      {report.source_refs.length > 0 ? (
        <div className="source-ref-list">
          {report.source_refs.map((ref) => (
            <span key={`${ref.id}-${ref.label}`}>{ref.id}: {ref.label}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
