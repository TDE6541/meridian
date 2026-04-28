import type { DemoDecisionCounterView } from "../demo/demoAudit.ts";

export interface DecisionCounterProps {
  view: DemoDecisionCounterView;
}

export function DecisionCounter({ view }: DecisionCounterProps) {
  return (
    <section className="decision-counter" data-decision-counter={view.label}>
      <div className="decision-counter__header">
        <p>Demo Run</p>
        <h2>Decision Counter</h2>
        <span>{view.sourceSummary}</span>
      </div>
      <div className="decision-counter__grid">
        {view.items.map((item) => (
          <article
            className="decision-counter__item"
            data-decision-counter-category={item.category}
            key={item.category}
          >
            <span>{item.label}</span>
            <strong>{item.count}</strong>
            <em>{item.sourceNote}</em>
          </article>
        ))}
      </div>
    </section>
  );
}
