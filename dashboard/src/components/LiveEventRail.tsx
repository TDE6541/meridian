import {
  isKnownLiveEventKind,
  type LiveEventKind,
  type LiveFeedEventV1,
} from "../live/liveTypes.ts";

export interface LiveEventRailProps {
  events: readonly LiveFeedEventV1[];
  foremanHighlighted?: boolean;
}

const EVENT_KIND_LABELS: Partial<Record<LiveEventKind, string>> = {
  "absence.finding.created": "Absence finding",
  "authority.evaluated": "Authority evaluated",
  "capture.artifact_ingested": "Capture ingested",
  "cityData.seed.loaded": "City seed event",
  "constellation.replay.received": "Replay event",
  "corridor.generated": "Corridor event",
  "entity.delta.accepted": "Entity delta",
  "error.hold": "Error hold",
  "forensic.receipt": "Forensic receipt",
  "governance.evaluated": "Governance evaluated",
  "hold.raised": "Hold raised",
  "session.created": "Session created",
  "skins.outputs.projected": "Skin outputs projected",
};

function getEventLabel(kind: LiveEventKind): string {
  return EVENT_KIND_LABELS[kind] ?? "Generic live event";
}

function getSourceLabel(event: LiveFeedEventV1): string {
  return `${event.source.type}:${event.source.ref}`;
}

function getRefSummary(event: LiveFeedEventV1): string {
  const refs = event.refs;
  return [
    refs.governance_ref ? `governance=${refs.governance_ref}` : null,
    refs.authority_ref ? `authority=${refs.authority_ref}` : null,
    refs.skin_ref ? `skin=${refs.skin_ref}` : null,
    refs.entity_ids.length > 0 ? `entities=${refs.entity_ids.join(",")}` : null,
    refs.evidence_ids.length > 0 ? `evidence=${refs.evidence_ids.join(",")}` : null,
    refs.forensic_refs.length > 0 ? `forensic=${refs.forensic_refs.join(",")}` : null,
    refs.absence_refs.length > 0 ? `absence=${refs.absence_refs.join(",")}` : null,
  ]
    .filter((entry): entry is string => entry !== null)
    .join(" | ");
}

export function LiveEventRail({
  events,
  foremanHighlighted = false,
}: LiveEventRailProps) {
  return (
    <section
      className={`panel live-event-rail${foremanHighlighted ? " foreman-panel-highlight" : ""}`}
      aria-labelledby="live-event-rail-title"
      data-foreman-panel-id="live-event-rail"
      data-foreman-highlighted={foremanHighlighted ? "true" : "false"}
    >
      <div className="panel-heading">
        <p className="panel-eyebrow">Live events</p>
        <h2 id="live-event-rail-title">Projection event rail</h2>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <p>No live events projected.</p>
        </div>
      ) : (
        <ol className="live-event-rail__list">
          {events.map((event) => {
            const generic = !isKnownLiveEventKind(event.kind);

            return (
              <li
                key={event.event_id}
                className="live-event-card"
                data-live-event-kind={event.kind}
                data-live-event-generic={generic ? "true" : "false"}
              >
                <div className="live-event-card__header">
                  <div>
                    <p className="live-event-card__kind">
                      {getEventLabel(event.kind)}
                    </p>
                    <h3>{event.title}</h3>
                  </div>
                  <span className={`live-event-card__severity live-event-card__severity--${event.severity.toLowerCase()}`}>
                    {event.severity}
                  </span>
                </div>
                <p className="live-event-card__summary">{event.summary}</p>
                <dl className="live-event-card__facts">
                  <div>
                    <dt>kind</dt>
                    <dd>{event.kind}</dd>
                  </div>
                  <div>
                    <dt>source</dt>
                    <dd>{getSourceLabel(event)}</dd>
                  </div>
                  <div>
                    <dt>sequence</dt>
                    <dd>{event.sequence}</dd>
                  </div>
                  <div>
                    <dt>refs</dt>
                    <dd>{getRefSummary(event) || "none"}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
