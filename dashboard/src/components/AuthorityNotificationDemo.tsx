import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";

export interface AuthorityNotificationDemoProps {
  state: AuthorityDashboardStateV1;
}

export function AuthorityNotificationDemo({ state }: AuthorityNotificationDemoProps) {
  const preview = state.notification_preview;
  const tokenHashes = Object.entries(preview.token_hashes);

  return (
    <section className="panel live-capture-panel" data-authority-notification-demo="true">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Dashboard-only payload display</p>
          <h2>Simulated authority-device preview</h2>
        </div>
      </div>

      {preview.status !== "ready" ? (
        <p className="empty-state">
          {preview.advisory?.message ??
            "No explicit simulated authority-device payload is present in this dashboard input."}
        </p>
      ) : (
        <div className="forensic-entry">
          <div className="fact-grid fact-grid--compact">
            <div>
              <span className="fact-label">Channel</span>
              <strong>{preview.channel ?? "not supplied"}</strong>
            </div>
            <div>
              <span className="fact-label">Title</span>
              <strong>{preview.title ?? "not supplied"}</strong>
            </div>
            <div>
              <span className="fact-label">Body</span>
              <strong>{preview.body ?? "not supplied"}</strong>
            </div>
            <div>
              <span className="fact-label">Action URL</span>
              <strong>{preview.payload ? "present in explicit payload" : "redacted or not supplied"}</strong>
            </div>
          </div>

          {preview.actions.length > 0 ? (
            <div className="signal-list">
              {preview.actions.map((action, index) => (
                <div className="signal-card" key={`${action.action}-${index}`}>
                  <strong>{action.action}</strong>
                  <span>{action.response_url ?? "action URL not supplied"}</span>
                  <span>{action.response_token ?? "response token not supplied"}</span>
                </div>
              ))}
            </div>
          ) : null}

          {tokenHashes.length > 0 ? (
            <div className="source-ref-list">
              {tokenHashes.map(([label, hash]) => (
                <span key={`${label}-${hash}`}>{label}: {hash}</span>
              ))}
            </div>
          ) : null}

          {preview.source_refs.length > 0 ? (
            <div className="source-ref-list">
              {preview.source_refs.map((ref) => (
                <span key={`${ref.source_kind}-${ref.path}-${ref.evidence_id ?? ""}`}>
                  {[ref.source_kind, ref.path, ref.evidence_id].filter(Boolean).join(":")}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
