import {
  createMissionRunRecorder,
  type MissionRunReceipt,
} from "../demo/missionRunRecorder.ts";

export interface MissionRunReceiptPanelProps {
  receipt?: MissionRunReceipt | null;
}

function formatFlagName(name: string): string {
  return name.replace(/_/g, "-");
}

function printMissionReceipt() {
  if (typeof window !== "undefined" && typeof window.print === "function") {
    window.print();
  }
}

export function MissionRunReceiptPanel({
  receipt = null,
}: MissionRunReceiptPanelProps) {
  const activeReceipt = receipt ?? createMissionRunRecorder();
  const boundaryFlags = Object.entries(activeReceipt.boundary);

  return (
    <section
      aria-labelledby="mission-run-receipt-title"
      className="mission-run-receipt-panel"
      data-mission-run-receipt-panel="true"
      data-mission-run-receipt-status={activeReceipt.status}
    >
      <div className="mission-run-receipt-panel__header">
        <div>
          <p className="mission-run-receipt-panel__eyebrow">Mission Run Receipt</p>
          <h2 id="mission-run-receipt-title">Run receipt panel</h2>
          <p>
            Browser-native print only; no PDF library is loaded. This is a demo
            mission receipt and not a legal audit trail.
          </p>
        </div>
        <button
          className="mission-run-receipt-panel__print"
          data-mission-receipt-print="browser-native"
          onClick={printMissionReceipt}
          type="button"
        >
          Print receipt
        </button>
      </div>

      <div className="mission-run-receipt-panel__facts">
        <div>
          <span>Run id</span>
          <strong>{activeReceipt.run_id}</strong>
        </div>
        <div>
          <span>Selected mode</span>
          <strong>{activeReceipt.mode}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{activeReceipt.status}</strong>
        </div>
        <div>
          <span>Active stage</span>
          <strong>{activeReceipt.active_stage_id ?? "none"}</strong>
        </div>
        <div>
          <span>Started</span>
          <strong>{activeReceipt.started_at ?? "not started"}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{activeReceipt.completed_at ?? "not completed"}</strong>
        </div>
      </div>

      <div className="mission-run-receipt-panel__stages">
        {activeReceipt.stages.map((stage) => (
          <article
            className={`mission-run-receipt-stage mission-run-receipt-stage--${stage.status}`}
            data-mission-run-receipt-stage={stage.stage_id}
            data-mission-run-receipt-stage-status={stage.status}
            key={stage.stage_id}
          >
            <span>{stage.label}</span>
            <strong>{stage.status}</strong>
            <em>{stage.source_ref}</em>
          </article>
        ))}
      </div>

      <div className="mission-run-receipt-panel__lists">
        <section>
          <h3>Holds</h3>
          {activeReceipt.holds.length > 0 ? (
            <ul>
              {activeReceipt.holds.map((hold) => (
                <li data-mission-run-hold={hold.status} key={hold.hold_id}>
                  <strong>{hold.summary}</strong>
                  <span>{hold.source_ref ?? "source pending"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recorder HOLDs raised in this run.</p>
          )}
        </section>
        <section>
          <h3>Warnings</h3>
          {activeReceipt.warnings.length > 0 ? (
            <ul>
              {activeReceipt.warnings.map((warning) => (
                <li data-mission-run-warning="true" key={warning.warning_id}>
                  <strong>{warning.summary}</strong>
                  <span>{warning.source_ref ?? "source pending"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recorder warnings raised in this run.</p>
          )}
        </section>
      </div>

      <div className="mission-run-receipt-panel__boundary">
        <span>Boundary flags</span>
        <div>
          {boundaryFlags.map(([flag, value]) => (
            <small data-mission-run-boundary-flag={flag} key={flag}>
              {formatFlagName(flag)}: {String(value)}
            </small>
          ))}
        </div>
      </div>
    </section>
  );
}
