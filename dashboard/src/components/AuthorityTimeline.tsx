import type {
  AuthorityDashboardSourceRef,
  AuthorityDashboardStateV1,
} from "../authority/authorityDashboardTypes.ts";

export interface AuthorityTimelineProps {
  state: AuthorityDashboardStateV1;
}

function formatTime(value: string | null): string {
  return value ?? "time not supplied";
}

function displaySourceRef(ref: AuthorityDashboardSourceRef): string {
  return [ref.source_kind, ref.path, ref.evidence_id].filter(Boolean).join(":");
}

export function AuthorityTimeline({ state }: AuthorityTimelineProps) {
  return (
    <section className="timeline-panel" data-authority-timeline="true">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{state.timeline.contract}</p>
          <h2>Authority Timeline</h2>
        </div>
      </div>

      {state.timeline.records.length === 0 ? (
        <p className="empty-state">
          No lifecycle records are available from explicit authority inputs.
        </p>
      ) : (
        <ol className="timeline-list">
          {state.timeline.records.map((record) => (
            <li className="timeline-step" key={record.record_id}>
              <div className="timeline-step__marker" />
              <div className="timeline-step__body">
                <div className="timeline-step__header">
                  <strong>{record.action}</strong>
                  <span>{formatTime(record.occurred_at)}</span>
                </div>
                <p>
                  {state.redaction_mode === "public"
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
