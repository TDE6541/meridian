import type { DemoAuditWallView } from "../demo/demoAudit.ts";
import { DecisionCounter } from "./DecisionCounter.tsx";

export interface DemoAuditWallProps {
  onDismiss: () => void;
  open: boolean;
  view: DemoAuditWallView;
}

export function DemoAuditWall({ onDismiss, open, view }: DemoAuditWallProps) {
  if (!open) {
    return null;
  }

  return (
    <section
      aria-modal="true"
      className="demo-audit-wall"
      data-demo-audit-wall="open"
      role="dialog"
    >
      <div className="demo-audit-wall__header">
        <div>
          <p className="demo-audit-wall__eyebrow">Current Scenario</p>
          <h2>{view.title}</h2>
          <span>{view.runLabel} · {view.statusLabel}</span>
        </div>
        <button
          className="demo-audit-wall__dismiss"
          onClick={onDismiss}
          type="button"
        >
          Return to Mission
        </button>
      </div>

      <div className="demo-audit-wall__body">
        <DecisionCounter view={view.counter} />

        <section className="demo-audit-wall__ticker" data-demo-audit-ticker="true">
          <div className="demo-audit-wall__ticker-header">
            <span>ref/hash</span>
            <span>role</span>
            <span>action</span>
            <span>state/outcome</span>
            <span>timestamp</span>
          </div>
          <div className="demo-audit-wall__ticker-rows">
            {view.rows.map((row) => (
              <article
                className="demo-audit-wall__ticker-row"
                data-demo-audit-row={row.sourcePath}
                key={`${row.sourcePath}-${row.refHash}`}
              >
                <span>{row.refHash}</span>
                <span>{row.role}</span>
                <span>{row.action}</span>
                <span>{row.outcome}</span>
                <span>{row.timestamp}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="demo-audit-wall__footer">
        <span>{view.sourceNote}</span>
        <span>{view.boundaryNotice}</span>
      </footer>
    </section>
  );
}
