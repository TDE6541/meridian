import type { PreventedActionCardView } from "../../director/directorScript.ts";

export interface PreventedActionCardProps {
  card: PreventedActionCardView;
}

export function PreventedActionCard({ card }: PreventedActionCardProps) {
  return (
    <section className="panel director-card" aria-labelledby="prevented-action-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Prevented action</p>
        <h2 id="prevented-action-title">{card.title}</h2>
      </div>

      <p className="director-card__summary">{card.summary}</p>
      <p className={card.empty ? "director-card__detail director-card__detail--empty" : "director-card__detail"}>
        {card.detail}
      </p>
      <p className="director-card__citation">{card.citation}</p>
    </section>
  );
}
