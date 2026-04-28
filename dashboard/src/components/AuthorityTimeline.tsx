import type {
  AuthorityDashboardSourceRef,
  AuthorityDashboardStateV1,
} from "../authority/authorityDashboardTypes.ts";
import { buildSharedAuthorityDisplayState } from "../authority/sharedAuthorityEvents.ts";
import {
  useSharedAuthorityRequests,
  type UseSharedAuthorityRequestsResult,
} from "../authority/useSharedAuthorityRequests.ts";

export interface AuthorityTimelineProps {
  foremanHighlighted?: boolean;
  sharedAuthority?: UseSharedAuthorityRequestsResult;
  state: AuthorityDashboardStateV1;
}

function formatTime(value: string | null): string {
  return value ?? "time not supplied";
}

function displaySourceRef(ref: AuthorityDashboardSourceRef): string {
  return [ref.source_kind, ref.path, ref.evidence_id].filter(Boolean).join(":");
}

export function AuthorityTimeline({
  foremanHighlighted = false,
  sharedAuthority,
  state,
}: AuthorityTimelineProps) {
  const hookSharedAuthority = useSharedAuthorityRequests({
    enabled: sharedAuthority === undefined,
    pollIntervalMs: 5000,
  });
  const shared = sharedAuthority ?? hookSharedAuthority;
  const sharedView = buildSharedAuthorityDisplayState(state, shared);
  const displayState = sharedView.state;

  return (
    <section
      className={`panel timeline-panel${foremanHighlighted ? " foreman-panel-highlight" : ""}`}
      data-authority-timeline="true"
      data-foreman-panel-id="authority-timeline"
      data-foreman-highlighted={foremanHighlighted ? "true" : "false"}
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{displayState.timeline.contract}</p>
          <h2>Authority Timeline</h2>
        </div>
      </div>

      {sharedView.advisory ? (
        <div className="signal-card signal-card--hold">
          <strong>HOLD: {sharedView.advisory.code}</strong>
          <span>{sharedView.advisory.message}</span>
        </div>
      ) : null}

      {displayState.timeline.records.length === 0 ? (
        <p className="empty-state">
          No lifecycle records are available from explicit authority inputs.
        </p>
      ) : (
        <ol className="timeline-list">
          {displayState.timeline.records.map((record) => (
            <li className="timeline-step" key={record.record_id}>
              <div className="timeline-step__marker" />
              <div className="timeline-step__body">
                <div className="timeline-step__header">
                  <strong>{record.action}</strong>
                  <span>{formatTime(record.occurred_at)}</span>
                </div>
                <p>
                  {displayState.redaction_mode === "public"
                    ? "Public-safe lifecycle summary."
                    : record.detail ?? record.summary}
                </p>
                <p className="detail-copy">{record.summary}</p>

                {record.forensic_refs.length > 0 ? (
                  <div className="source-ref-list">
                    <span>Forensic refs: {record.forensic_refs.join(", ")}</span>
                  </div>
                ) : null}

                {record.source_refs.length > 0 ? (
                  <div className="source-ref-list">
                    {record.source_refs.map((ref) => (
                      <span key={displaySourceRef(ref)}>{displaySourceRef(ref)}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
