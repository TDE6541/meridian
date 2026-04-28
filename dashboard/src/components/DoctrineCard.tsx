import {
  DOCTRINE_CARD_DEMO_URL,
  DOCTRINE_CARD_PRINCIPLES,
  DOCTRINE_CARD_QR_NOTE,
} from "../demo/doctrineCard.ts";

export function DoctrineCard() {
  return (
    <section
      className="doctrine-card"
      data-doctrine-card="meridian-demo"
      data-doctrine-card-size="3.5x5"
    >
      <p className="doctrine-card__eyebrow">Meridian Demo Doctrine</p>
      <h2>HOLD &gt; GUESS</h2>
      <ol className="doctrine-card__principles">
        {DOCTRINE_CARD_PRINCIPLES.map((principle) => (
          <li data-doctrine-principle="true" key={principle}>
            {principle}
          </li>
        ))}
      </ol>
      <div className="doctrine-card__url">
        <span>Deployed demo URL</span>
        <strong>{DOCTRINE_CARD_DEMO_URL}</strong>
      </div>
      <p className="doctrine-card__note">{DOCTRINE_CARD_QR_NOTE}</p>
    </section>
  );
}
