import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";

export interface GARPStatusIndicatorProps {
  state: AuthorityDashboardStateV1;
}

function statusText(state: AuthorityDashboardStateV1): string {
  if (state.status === "unavailable") {
    return "Unavailable";
  }

  if (state.status === "empty") {
    return "Empty";
  }

  return state.status.toUpperCase();
}

export function GARPStatusIndicator({ state }: GARPStatusIndicatorProps) {
  return (
    <section className="live-capture-panel" data-garp-status="dashboard-local">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Local/demo dashboard state only</p>
          <h2>GARP authority state</h2>
        </div>
        <span className={`live-status-badge live-status-badge--${state.status}`}>
          {statusText(state)}
        </span>
      </div>

      <div className="fact-grid fact-grid--compact">
        <div>
          <span className="fact-label">Contract</span>
          <strong>{state.contract}</strong>
        </div>
        <div>
          <span className="fact-label">Role boundary</span>
          <strong>{state.redaction_mode}</strong>
        </div>
        <div>
          <span className="fact-label">Pending</span>
          <strong>{state.counts.pending}</strong>
        </div>
        <div>
          <span className="fact-label">Approved</span>
          <strong>{state.counts.approved}</strong>
        </div>
        <div>
          <span className="fact-label">Denied / expired</span>
          <strong>{state.counts.denied + state.counts.expired}</strong>
        </div>
        <div>
          <span className="fact-label">Holding</span>
          <strong>{state.counts.holding}</strong>
        </div>
      </div>

      {state.status === "unavailable" || state.status === "empty" ? (
        <p className="empty-state">
          No explicit authority request payload is active in the selected dashboard input.
        </p>
      ) : null}
    </section>
  );
}
