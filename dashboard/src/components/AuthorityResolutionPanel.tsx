import { useState } from "react";
import type {
  AuthorityDashboardStateV1,
  AuthorityResolutionItem,
  AuthorityDashboardSourceRef,
} from "../authority/authorityDashboardTypes.ts";
import {
  buildSharedAuthorityDisplayState,
  buildSharedAuthorityRequestDraft,
  getSharedAuthorityPermissions,
} from "../authority/sharedAuthorityEvents.ts";
import type {
  SharedAuthorityHold,
  SharedAuthorityResolution,
} from "../authority/sharedAuthorityClient.ts";
import {
  useSharedAuthorityRequests,
  type UseSharedAuthorityRequestsResult,
} from "../authority/useSharedAuthorityRequests.ts";

export interface AuthorityResolutionPanelProps {
  foremanHighlighted?: boolean;
  sharedAuthority?: UseSharedAuthorityRequestsResult;
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

function isSharedAuthorityItem(item: AuthorityResolutionItem): boolean {
  return item.source_refs.some(
    (ref) => ref.source_kind === "dashboard.shared_authority"
  );
}

function renderHoldCard(hold: SharedAuthorityHold) {
  return (
    <div className="signal-card signal-card--hold" key={hold.code}>
      <strong>HOLD: {hold.code}</strong>
      <span>{hold.message}</span>
    </div>
  );
}

function sharedStatusClass(status: string): string {
  return status === "unavailable" ? "disconnected" : status;
}

export function AuthorityResolutionPanel({
  foremanHighlighted = false,
  sharedAuthority,
  state,
}: AuthorityResolutionPanelProps) {
  const [actionHold, setActionHold] = useState<SharedAuthorityHold | null>(null);
  const hookSharedAuthority = useSharedAuthorityRequests({
    enabled: sharedAuthority === undefined,
    pollIntervalMs: 5000,
  });
  const shared = sharedAuthority ?? hookSharedAuthority;
  const sharedView = buildSharedAuthorityDisplayState(state, shared);
  const displayState = sharedView.state;
  const hasRequests = displayState.requests.length > 0;
  const permissions = getSharedAuthorityPermissions(state.role_session);
  const sharedUnavailable = shared.endpointStatus === "unavailable";
  const actionDisabled = shared.loading || sharedUnavailable;

  async function handleSubmitSharedRequest() {
    const request = buildSharedAuthorityRequestDraft(displayState);
    const result = await shared.createRequest(request);

    setActionHold(result.ok ? null : result.hold);
  }

  async function handleResolveSharedRequest(
    requestId: string,
    resolution: SharedAuthorityResolution
  ) {
    const result = await shared.resolveRequest({
      reason: `Dashboard-local AUTH-3 demo ${resolution}.`,
      request_id: requestId,
      resolution,
      resolved_by: state.role_session.role,
    });

    setActionHold(result.ok ? null : result.hold);
  }

  function renderSharedActions(item: AuthorityResolutionItem) {
    if (!isSharedAuthorityItem(item)) {
      return null;
    }

    if (item.status !== "pending") {
      return (
        <p className="detail-copy">
          Shared endpoint returned {item.status} for this dashboard-local request.
        </p>
      );
    }

    if (!permissions.canResolve) {
      return (
        <p className="detail-copy">
          {permissions.canReview
            ? "Review-only for this dashboard-local role."
            : "No shared authority action is available for this dashboard-local role."}
        </p>
      );
    }

    return (
      <div className="playback-controls__buttons">
        <button
          className="control-button control-button--primary"
          disabled={actionDisabled}
          type="button"
          aria-label={`Approve dashboard-local authority request ${item.request_id}`}
          onClick={() => {
            void handleResolveSharedRequest(item.request_id, "approved");
          }}
        >
          Approve
        </button>
        <button
          className="control-button"
          disabled={actionDisabled}
          type="button"
          aria-label={`Deny dashboard-local authority request ${item.request_id}`}
          onClick={() => {
            void handleResolveSharedRequest(item.request_id, "denied");
          }}
        >
          Deny
        </button>
      </div>
    );
  }

  return (
    <section
      className={`panel governance-card${foremanHighlighted ? " foreman-panel-highlight" : ""}`}
      data-authority-resolution-panel="true"
      data-foreman-panel-id="authority-resolution"
      data-foreman-highlighted={foremanHighlighted ? "true" : "false"}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Dashboard-local authority cockpit</p>
          <h2>Authority Resolution Panel</h2>
        </div>
        <span
          className={`live-status-badge live-status-badge--${sharedStatusClass(sharedView.endpointStatus)}`}
        >
          Shared endpoint {sharedView.endpointStatusLabel}
        </span>
      </div>

      <div className="playback-controls__buttons" data-shared-authority-actions="true">
        <button
          className="control-button"
          disabled={shared.loading}
          type="button"
          aria-label="Refresh dashboard-local shared authority endpoint"
          onClick={() => {
            void shared.refresh();
          }}
        >
          Refresh shared endpoint
        </button>
        <button
          className="control-button control-button--primary"
          disabled={!permissions.canSubmit || actionDisabled}
          type="button"
          aria-label="Submit dashboard-local shared authority request"
          onClick={() => {
            void handleSubmitSharedRequest();
          }}
        >
          Submit shared request
        </button>
      </div>
      <p className="detail-copy">{permissions.reason}</p>

      {displayState.advisories.length > 0 ||
      sharedView.advisory ||
      actionHold ? (
        <div className="signal-list">
          {displayState.advisories.map((advisory) => (
            <div className="signal-card signal-card--hold" key={advisory.code}>
              <strong>{advisory.severity}: {advisory.code}</strong>
              <span>{advisory.message}</span>
            </div>
          ))}
          {sharedView.advisory
            ? renderHoldCard({
                code: sharedView.advisory.code,
                message: sharedView.advisory.message,
                severity: "HOLD",
                source_ref: sharedView.advisory.source_ref,
              })
            : null}
          {actionHold ? renderHoldCard(actionHold) : null}
        </div>
      ) : null}

      {!hasRequests ? (
        <p className="empty-state">
          No authority requests or active authority resolutions are present in the selected dashboard input.
        </p>
      ) : (
        <div className="forensic-list">
          {displayState.requests.map((item) => (
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

              {renderSharedActions(item)}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
