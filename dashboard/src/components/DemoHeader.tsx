import { OutcomeBadge } from "./OutcomeBadge.tsx";

export interface DemoHeaderProps {
  activeOutcome: string | null;
  activeSkinLabel: string;
  activeStepLabel: string;
  dataVersion: string | null;
  scenarioDescription: string;
  scenarioLabel: string;
  scenarioStatus: string;
}

export function DemoHeader({
  activeOutcome,
  activeSkinLabel,
  activeStepLabel,
  dataVersion,
  scenarioDescription,
  scenarioLabel,
  scenarioStatus,
}: DemoHeaderProps) {
  return (
    <section className="panel demo-header" data-demo-header="local">
      <div className="demo-header__copy">
        <p className="panel-eyebrow">Wave 9 Packet 6</p>
        <h1 className="demo-header__title">Local demo control room</h1>
        <p className="demo-header__summary">
          Committed Wave 8 snapshots only. Director Mode stays view-only, and no env
          vars, secrets, or live network are required for this run.
        </p>
        <p className="demo-header__description">
          <strong>{scenarioLabel}</strong> {scenarioDescription}
        </p>
      </div>

      <div className="demo-header__status">
        <div className="demo-header__badge">
          <OutcomeBadge decision={activeOutcome} />
        </div>

        <dl className="demo-header__facts">
          <div>
            <dt>scenario</dt>
            <dd>{scenarioLabel}</dd>
          </div>
          <div>
            <dt>scenario status</dt>
            <dd>{scenarioStatus}</dd>
          </div>
          <div>
            <dt>active step</dt>
            <dd>{activeStepLabel}</dd>
          </div>
          <div>
            <dt>active skin</dt>
            <dd>{activeSkinLabel}</dd>
          </div>
          <div>
            <dt>snapshot contract</dt>
            <dd>{dataVersion ?? "Pending"}</dd>
          </div>
          <div>
            <dt>mode</dt>
            <dd>Local-only replay</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
