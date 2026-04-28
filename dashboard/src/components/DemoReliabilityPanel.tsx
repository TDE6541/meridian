import {
  demoReliabilityChecklists,
  demoRunbookCues,
  walkModeFallbackState,
} from "../demo/demoReliability.ts";

export interface DemoReliabilityPanelProps {
  onResetToKnownCleanState: () => void;
  resetAvailable?: boolean;
  sharedEndpointStatus: string;
}

export function DemoReliabilityPanel({
  onResetToKnownCleanState,
  resetAvailable = true,
  sharedEndpointStatus,
}: DemoReliabilityPanelProps) {
  return (
    <section
      className="panel demo-reliability-panel"
      data-demo-reliability-panel="true"
      data-engineer-only="true"
      data-reset-capability={resetAvailable ? "available" : "HOLD"}
    >
      <div className="panel-heading">
        <div>
          <p className="panel-eyebrow">Engineer-only reliability</p>
          <h2>Demo Reset and Failover</h2>
        </div>
        <span className={`live-status-badge live-status-badge--${sharedEndpointStatus}`}>
          Shared endpoint {sharedEndpointStatus}
        </span>
      </div>

      <div className="demo-reliability-panel__reset">
        <button
          aria-label="Reset to known-clean snapshot state"
          className="control-button control-button--primary"
          data-demo-control="engineer-clean-reset"
          disabled={!resetAvailable}
          onClick={onResetToKnownCleanState}
          type="button"
        >
          Reset to clean snapshot
        </button>
        <p>
          {resetAvailable
            ? "Resets scenario, step, playback, presentation overlays, Live Mode, and shared authority request state through existing dashboard-local seams."
            : "HOLD: safe reset is unavailable in this dashboard architecture."}
        </p>
      </div>

      <div className="demo-reliability-panel__runbook">
        {demoRunbookCues.map((cue) => (
          <article data-runbook-cue={cue.key} key={cue.key}>
            <span>{cue.label}</span>
            <strong>{cue.cueSentence}</strong>
          </article>
        ))}
      </div>

      <section
        className="walk-mode-fallback"
        data-walk-mode-fallback-proof={walkModeFallbackState.proofStatus}
        data-walk-mode-fallback-slot="local-panel"
      >
        <div>
          <p className="panel-eyebrow">Walk-mode fallback</p>
          <h3>Fallback media slot</h3>
        </div>
        {walkModeFallbackState.assetPath ? (
          <video
            controls
            data-walk-mode-fallback-media="verified-asset"
            preload="metadata"
            src={walkModeFallbackState.assetPath}
          />
        ) : (
          <p className="empty-state">{walkModeFallbackState.summary}</p>
        )}
        <small>{walkModeFallbackState.checklistRef}</small>
      </section>

      <div className="demo-reliability-panel__checklists">
        {demoReliabilityChecklists.map((checklist) => (
          <article data-demo-checklist={checklist.key} key={checklist.key}>
            <div>
              <span>{checklist.label}</span>
              <strong>{checklist.status}</strong>
            </div>
            <ul>
              {checklist.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
