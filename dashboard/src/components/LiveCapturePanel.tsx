import type {
  DashboardLiveProjectionLatestV1,
  DashboardLiveProjectionV1,
  JsonObject,
} from "../live/liveTypes.ts";

export interface LiveCapturePanelProps {
  projection: DashboardLiveProjectionV1;
}

const LATEST_FIELDS = [
  ["capture", "Capture"],
  ["governance", "Governance"],
  ["authority", "Authority"],
  ["forensic", "Forensic"],
  ["absence", "Absence"],
] as const satisfies readonly (readonly [keyof DashboardLiveProjectionLatestV1, string])[];

function stringifyPayload(value: JsonObject): string {
  return JSON.stringify(value, null, 2);
}

export function LiveCapturePanel({ projection }: LiveCapturePanelProps) {
  const skinOutputEntries = Object.entries(projection.skins.outputs);

  return (
    <section className="panel live-capture-panel" aria-labelledby="live-capture-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Live projection</p>
        <h2 id="live-capture-title">Latest projected state</h2>
      </div>

      <div className="live-capture-panel__latest">
        {LATEST_FIELDS.map(([fieldName, label]) => {
          const value = projection.latest[fieldName];

          return (
            <article
              key={fieldName}
              className="live-latest-card"
              data-live-latest-field={fieldName}
            >
              <p className="live-latest-card__label">{label}</p>
              {value ? (
                <pre className="live-json">{stringifyPayload(value)}</pre>
              ) : (
                <p className="live-latest-card__empty">
                  No live {fieldName} payload projected.
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="live-capture-panel__skins">
        <p className="panel-eyebrow">Projected skin outputs</p>
        {skinOutputEntries.length === 0 ? (
          <p className="live-latest-card__empty">No live skin outputs projected.</p>
        ) : (
          <ul className="live-skin-output-list">
            {skinOutputEntries.map(([skinKey, payload]) => (
              <li key={skinKey}>
                <strong>{skinKey}</strong>
                <pre className="live-json">{stringifyPayload(payload)}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
