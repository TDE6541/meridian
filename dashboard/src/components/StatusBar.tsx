import { OutcomeBadge } from "./OutcomeBadge.tsx";

export interface StatusBarProps {
  activeOutcome: string | null;
  activeSkinLabel: string;
  activeStepLabel: string;
  dataVersion: string | null;
  scenarioId: string;
}

export function StatusBar({
  activeOutcome,
  activeSkinLabel,
  activeStepLabel,
  dataVersion,
  scenarioId,
}: StatusBarProps) {
  return (
    <section
      className="status-bar"
      data-status-bar-mode="local-demo"
      aria-label="Control room status bar"
    >
      <div className="status-bar__item">
        <p className="status-bar__label">Scenario</p>
        <p className="status-bar__value">{scenarioId}</p>
      </div>
      <div className="status-bar__item">
        <p className="status-bar__label">Step</p>
        <p className="status-bar__value">{activeStepLabel}</p>
      </div>
      <div className="status-bar__item">
        <p className="status-bar__label">Outcome</p>
        <OutcomeBadge decision={activeOutcome} />
      </div>
      <div className="status-bar__item">
        <p className="status-bar__label">Skin</p>
        <p className="status-bar__value">{activeSkinLabel}</p>
      </div>
      <div className="status-bar__item">
        <p className="status-bar__label">Contract</p>
        <p className="status-bar__value">{dataVersion ?? "Unavailable"}</p>
      </div>
    </section>
  );
}
