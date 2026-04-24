import type { DirectorCueCardView } from "../../director/directorScript.ts";

export interface DirectorCueCardProps {
  cue: DirectorCueCardView;
}

export function DirectorCueCard({ cue }: DirectorCueCardProps) {
  return (
    <section className="panel director-card" aria-labelledby="director-cue-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Director cue</p>
        <h2 id="director-cue-title">{cue.title}</h2>
      </div>

      <p className="director-card__eyebrow">{cue.eyebrow}</p>
      <p className="director-card__summary">{cue.summary}</p>

      <ul className="director-card__list">
        {cue.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <p className="director-card__citation">{cue.citation}</p>
    </section>
  );
}
