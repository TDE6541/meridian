import { ForensicEntry } from "./ForensicEntry.tsx";
import type { DashboardForensicChainView } from "../adapters/forensicAdapter.ts";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

export interface ForensicChainPanelProps {
  chainView: DashboardForensicChainView;
  message?: string;
  status: ControlRoomScenarioRecord["status"];
}

export function ForensicChainPanel({
  chainView,
  message,
  status,
}: ForensicChainPanelProps) {
  return (
    <section className="panel forensic-panel" aria-labelledby="forensic-panel-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Forensic chain</p>
        <h2 id="forensic-panel-title">Cumulative through active step</h2>
      </div>

      {status !== "ready" ? (
        <div className="empty-state">
          <p>{message ?? "Forensic entries are unavailable for this scenario."}</p>
        </div>
      ) : !chainView.hasEntries ? (
        <div className="empty-state">
          <p>No forensic entries are present through the active step.</p>
        </div>
      ) : (
        <>
          <div className="forensic-panel__summary">
            <dl>
              <div>
                <dt>active step</dt>
                <dd>{chainView.activeStepId ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>cumulative entries</dt>
                <dd>{chainView.totalEntryCount}</dd>
              </div>
              <div>
                <dt>current-step entries</dt>
                <dd>{chainView.stepEntryCount}</dd>
              </div>
              <div>
                <dt>actual vocabulary</dt>
                <dd>{chainView.entryVocabulary.join(", ") || "None present"}</dd>
              </div>
            </dl>
            <p>
              Derived from step forensic entries in the committed scenario snapshot.
            </p>
          </div>

          <div className="forensic-panel__entries">
            {chainView.cumulativeEntries.map((entry) => (
              <ForensicEntry key={entry.entryId} entry={entry} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
