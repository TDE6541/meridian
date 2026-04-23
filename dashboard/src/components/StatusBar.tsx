import { OutcomeBadge } from "./OutcomeBadge.tsx";

export interface StatusBarProps {
  activeOutcome: string | null;
  activeStepLabel: string;
  dataVersion: string | null;
  scenarioId: string;
}

export function StatusBar({
  activeOutcome,
  activeStepLabel,
  dataVersion,
  scenarioId,
}: StatusBarProps) {
  return (
    <section className="status-bar" aria-label="Control room status bar">
      <div className="status-bar__item">
        <p className="status-bar__label">Scenario ID</p>
        <p className="status-bar__value">{scenarioId}</p>
      </div>
      <div className="status-bar__item">
        <p className="status-bar__label">Active step</p>
        <p className="status-bar__value">{activeStepLabel}</p>
      </div>
      <div className="status-bar__item">
        <p className="status-bar__label">Active outcome</p>
        <OutcomeBadge decision={activeOutcome} />
      </div>
      <div className="status-bar__item">
        <p className="status-bar__label">Active data version</p>
        <p className="status-bar__value">{dataVersion ?? "Unavailable"}</p>
      </div>
    </section>
  );
}
