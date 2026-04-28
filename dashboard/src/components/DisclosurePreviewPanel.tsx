import type {
  DisclosurePreviewActionBundleV1,
  DisclosurePreviewReportV1,
} from "../authority/authorityDashboardTypes.ts";

export interface DisclosurePreviewPanelProps {
  actionBundle?: DisclosurePreviewActionBundleV1 | null;
  foremanHighlighted?: boolean;
  report: DisclosurePreviewReportV1 | null;
}

function renderActionBundle(actionBundle: DisclosurePreviewActionBundleV1 | null | undefined) {
  if (!actionBundle) {
    return (
      <div className="signal-card signal-card--hold">
        <strong>Preview action holding</strong>
        <span>HOLD: disclosure preview action bundle is unavailable.</span>
      </div>
    );
  }

  return (
    <div className="signal-list" data-disclosure-preview-actions="prepared">
      <div className="signal-card">
        <strong>
          {actionBundle.status === "prepared"
            ? "Preview action prepared"
            : "Preview action holding"}
        </strong>
        <span>{actionBundle.contract}</span>
      </div>
      <div className="signal-card">
        <strong>Filename</strong>
        <span>{actionBundle.filename}</span>
      </div>
      <div className="signal-card">
        <strong>MIME type</strong>
        <span>{actionBundle.mime_type}</span>
      </div>
      <div className="signal-card">
        <strong>Print title</strong>
        <span>{actionBundle.print_title}</span>
      </div>
      <div className="signal-card">
        <strong>Role boundary</strong>
        <span>{actionBundle.role_boundary_summary}</span>
      </div>

      {actionBundle.prepared_actions.map((action) => (
        <div className="signal-card" key={action.action}>
          <strong>{action.label}</strong>
          <span>{action.side_effect}</span>
        </div>
      ))}

      {actionBundle.holds.map((hold) => (
        <div className="signal-card signal-card--hold" key={hold}>
          <strong>Action HOLD</strong>
          <span>{hold}</span>
        </div>
      ))}
    </div>
  );
}

function canUseBrowserPrint(): boolean {
  return typeof window !== "undefined" && typeof window.print === "function";
}

export function DisclosurePreviewPanel({
  actionBundle = null,
  foremanHighlighted = false,
  report,
}: DisclosurePreviewPanelProps) {
  const printAvailable = canUseBrowserPrint();

  function handlePrintDisclosurePreview() {
    if (!printAvailable) {
      return;
    }

    window.print();
  }

  if (!report) {
    return (
      <section
        className={`panel governance-card${foremanHighlighted ? " foreman-panel-highlight" : ""}`}
        data-disclosure-preview-panel="true"
        data-foreman-panel-id="disclosure-preview"
        data-foreman-highlighted={foremanHighlighted ? "true" : "false"}
      >
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {actionBundle?.contract ?? "meridian.v2.disclosurePreviewReport.v1"}
            </p>
            <h2>Disclosure preview</h2>
          </div>
          <span className="live-status-badge live-status-badge--holding">
            holding
          </span>
        </div>

        <p className="empty-state">
          HOLD: disclosure preview report is unavailable.
        </p>

        {renderActionBundle(actionBundle)}
      </section>
    );
  }

  return (
    <section
      className={`panel governance-card${foremanHighlighted ? " foreman-panel-highlight" : ""}`}
      data-disclosure-preview-panel="true"
      data-foreman-panel-id="disclosure-preview"
      data-foreman-highlighted={foremanHighlighted ? "true" : "false"}
      data-print-surface="disclosure-receipt"
    >
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

      <section
        className="disclosure-receipt"
        data-disclosure-receipt="demo-public-boundary"
      >
        <p>Demo disclosure preview receipt</p>
        <div>
          <span>non-official</span>
          <span>non-legal</span>
          <span>public-boundary aware</span>
        </div>
      </section>

      <div className="disclosure-preview-print-control">
        <button
          aria-label="Save disclosure preview using your browser print dialog"
          className="control-button control-button--primary"
          disabled={!printAvailable}
          onClick={handlePrintDisclosurePreview}
          type="button"
        >
          Save Disclosure
        </button>
        <span>
          {printAvailable
            ? "Opens your browser print dialog. Save as PDF from there if needed."
            : "Browser print is unavailable in this environment."}
        </span>
      </div>

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

      {renderActionBundle(actionBundle)}
    </section>
  );
}
