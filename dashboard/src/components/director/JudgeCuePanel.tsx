import type { JudgeCuePanelView } from "../../director/directorScript.ts";

export interface JudgeCuePanelProps {
  panel: JudgeCuePanelView;
}

export function JudgeCuePanel({ panel }: JudgeCuePanelProps) {
  return (
    <section className="panel director-card" aria-labelledby="judge-cue-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Judge-safe panel</p>
        <h2 id="judge-cue-title">Bounded reading</h2>
      </div>

      <ol className="judge-cue-list">
        {panel.lines.map((line) => (
          <li key={`${line.family}-${line.citation}`}>
            <p>{line.text}</p>
            <small>{line.citation}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
