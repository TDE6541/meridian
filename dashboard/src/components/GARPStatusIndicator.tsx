import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";
import { buildSharedAuthorityDisplayState } from "../authority/sharedAuthorityEvents.ts";
import {
  useSharedAuthorityRequests,
  type UseSharedAuthorityRequestsResult,
} from "../authority/useSharedAuthorityRequests.ts";

export interface GARPStatusIndicatorProps {
  foremanHighlighted?: boolean;
  sharedAuthority?: UseSharedAuthorityRequestsResult;
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

function sharedStatusClass(status: string): string {
  return status === "unavailable" ? "disconnected" : status;
}

export function GARPStatusIndicator({
  foremanHighlighted = false,
  sharedAuthority,
  state,
}: GARPStatusIndicatorProps) {
  const hookSharedAuthority = useSharedAuthorityRequests({
    enabled: sharedAuthority === undefined,
    pollIntervalMs: 5000,
  });
  const shared = sharedAuthority ?? hookSharedAuthority;
  const sharedView = buildSharedAuthorityDisplayState(state, shared);
  const displayState = sharedView.state;

  return (
    <section
      className={`live-capture-panel${foremanHighlighted ? " foreman-panel-highlight" : ""}`}
      data-garp-status="dashboard-local"
      data-foreman-panel-id="garp-status"
      data-foreman-highlighted={foremanHighlighted ? "true" : "false"}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Local/demo dashboard state only</p>
          <h2>GARP authority state</h2>
        </div>
        <span className={`live-status-badge live-status-badge--${displayState.status}`}>
          {statusText(displayState)}
        </span>
      </div>

      <div className="fact-grid fact-grid--compact">
        <div>
          <span className="fact-label">Contract</span>
          <strong>{displayState.contract}</strong>
        </div>
        <div>
          <span className="fact-label">Role boundary</span>
          <strong>{displayState.redaction_mode}</strong>
        </div>
        <div>
          <span className="fact-label">Shared endpoint</span>
          <strong
            className={`live-status-badge live-status-badge--${sharedStatusClass(sharedView.endpointStatus)}`}
          >
            {sharedView.endpointStatusLabel}
          </strong>
        </div>
        <div>
          <span className="fact-label">Pending</span>
          <strong>{displayState.counts.pending}</strong>
        </div>
        <div>
          <span className="fact-label">Approved</span>
          <strong>{displayState.counts.approved}</strong>
        </div>
        <div>
          <span className="fact-label">Denied / expired</span>
          <strong>{displayState.counts.denied + displayState.counts.expired}</strong>
        </div>
        <div>
          <span className="fact-label">Holding</span>
          <strong>{displayState.counts.holding}</strong>
        </div>
      </div>

      {sharedView.advisory ? (
        <p className="empty-state">{sharedView.advisory.message}</p>
      ) : null}

      {displayState.status === "unavailable" || displayState.status === "empty" ? (
        <p className="empty-state">
          No explicit authority request payload is active in the selected dashboard input.
        </p>
      ) : null}
    </section>
  );
}
