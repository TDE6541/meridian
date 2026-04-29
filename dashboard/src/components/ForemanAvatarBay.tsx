import { useState } from "react";
import type { JudgeTouchboardCard } from "../demo/judgeTouchboardDeck.ts";
import type { MissionPhysicalProjectionV1 } from "../demo/missionPhysicalProjection.ts";
import {
  deriveForemanProjectionDisplay,
  type ForemanProjectionDisplay,
} from "../foremanGuide/foremanEmbodiedState.ts";

export type ForemanAvatarCardId = "ask" | "challenge" | "proof";

export interface ForemanAvatarBayProps {
  initialCard?: ForemanAvatarCardId | null;
  judgeChallenge?: JudgeTouchboardCard | null;
  projection?: MissionPhysicalProjectionV1 | null;
}

function stateClass(display: ForemanProjectionDisplay): string {
  return `foreman-avatar-bay foreman-avatar-bay--state-${display.embodied.className} foreman-avatar-bay--tone-${display.embodied.tone}`;
}

function renderStatusNotice(display: ForemanProjectionDisplay) {
  if (display.hasActiveHold) {
    return (
      <p
        className="foreman-avatar-bay__notice foreman-avatar-bay__notice--hold"
        data-foreman-avatar-notice="active-hold"
      >
        HOLD: {display.activeHoldSummary}
      </p>
    );
  }

  if (display.embodied.tone === "blocked" || display.embodied.tone === "warning") {
    return (
      <p
        className="foreman-avatar-bay__notice foreman-avatar-bay__notice--warning"
        data-foreman-avatar-notice={display.embodied.tone}
      >
        Boundary posture visible: {display.embodied.label}.
      </p>
    );
  }

  if (display.hasCarriedHolds) {
    return (
      <p
        className="foreman-avatar-bay__notice foreman-avatar-bay__notice--carried"
        data-foreman-avatar-notice="carried-holds"
      >
        Carried manual proof HOLDs remain open.
      </p>
    );
  }

  return null;
}

function renderCard(
  activeCard: ForemanAvatarCardId | null,
  display: ForemanProjectionDisplay
) {
  if (!activeCard) {
    return null;
  }

  if (activeCard === "ask") {
    return (
      <article
        className="foreman-avatar-bay__control-card"
        data-foreman-avatar-card="ask"
        id="foreman-avatar-card"
      >
        <span>Ask Foreman</span>
        <strong>{display.currentLine}</strong>
        <p>
          {display.boundarySummary} Current mode is {display.missionModeLabel};
          current stage is {display.stageLabel}.
        </p>
      </article>
    );
  }

  if (activeCard === "challenge") {
    return (
      <article
        className="foreman-avatar-bay__control-card"
        data-foreman-avatar-card="challenge"
        id="foreman-avatar-card"
      >
        <span>Challenge Foreman</span>
        <strong>Boundary challenge is deterministic and source-bounded.</strong>
        <p>
          Foreman does not create governance truth, authority truth, absence
          truth, or legal audit records. Foreman is not model/API-backed in this
          demo and does not claim production, live-city, official workflow, public
          portal, delivered notification, CIBA, or OpenFGA behavior.
        </p>
      </article>
    );
  }

  return (
    <article
      className="foreman-avatar-bay__control-card"
      data-foreman-avatar-card="proof"
      id="foreman-avatar-card"
    >
      <span>Show Proof</span>
      <strong>{display.attentionTargetLabel}</strong>
      <p>
        {display.proofTarget?.summary ??
          "No active proof target is selected; the Presenter Cockpit remains source-bounded."}
      </p>
      <p>
        Target: {display.attentionTargetId ?? "HOLD: target unavailable"} / Source:{" "}
        {display.proofTarget?.source_ref ?? "HOLD: source ref unavailable"}.
      </p>
      <p>
        Proof Tools remain grouped; this card does not click or ungroup another
        surface.
      </p>
    </article>
  );
}

export function ForemanAvatarBay({
  initialCard = null,
  judgeChallenge = null,
  projection = null,
}: ForemanAvatarBayProps) {
  const [activeCard, setActiveCard] = useState<ForemanAvatarCardId | null>(
    initialCard
  );
  const display = deriveForemanProjectionDisplay(projection);

  function toggleCard(cardId: ForemanAvatarCardId) {
    setActiveCard((current) => (current === cardId ? null : cardId));
  }

  return (
    <section
      aria-labelledby="foreman-avatar-bay-title"
      className={stateClass(display)}
      data-foreman-avatar-bay="true"
      data-foreman-avatar-motion="reduced-motion-safe"
      data-foreman-avatar-state={display.embodied.state}
      data-foreman-avatar-tone={display.embodied.tone}
      data-no-external-avatar-dependency="true"
    >
      <div className="foreman-avatar-bay__stage">
        <div
          aria-hidden="true"
          className="foreman-avatar-bay__avatar"
          data-foreman-avatar-ring={display.embodied.className}
        >
          <svg
            className="foreman-avatar-bay__glyph"
            focusable="false"
            viewBox="0 0 120 120"
          >
            <circle className="foreman-avatar-bay__ring" cx="60" cy="60" r="52" />
            <circle className="foreman-avatar-bay__core" cx="60" cy="48" r="22" />
            <path
              className="foreman-avatar-bay__shoulders"
              d="M28 96c5-18 17-27 32-27s27 9 32 27"
            />
            <path
              className="foreman-avatar-bay__baton"
              d="M83 27l18-15M86 31l19-3"
            />
          </svg>
        </div>

        <div className="foreman-avatar-bay__identity">
          <p className="foreman-avatar-bay__eyebrow">Embodied Foreman</p>
          <h2 id="foreman-avatar-bay-title">Foreman Avatar Bay</h2>
          <p
            aria-label={display.embodied.ariaLabel}
            className="foreman-avatar-bay__state-label"
          >
            {display.embodied.label}
          </p>
        </div>
      </div>

      <div className="foreman-avatar-bay__badges" aria-label="Foreman mission status">
        <span>{display.missionModeLabel}</span>
        <span>{display.stageLabel}</span>
        <span>{display.guideModeLabel}</span>
        <span>{display.conductorPosture}</span>
        <span>{display.motionLabel}</span>
      </div>

      <div className="foreman-avatar-bay__readout">
        <div>
          <span>Bounded line</span>
          <strong>{display.currentLine}</strong>
        </div>
        <div>
          <span>Voice / fallback</span>
          <strong>{display.voiceLabel}</strong>
          <em>{display.typedFallbackLabel}</em>
        </div>
        <div>
          <span>Attention target</span>
          <strong>{display.attentionTargetLabel}</strong>
          <em>{display.attentionTargetId ?? "HOLD: target unavailable"}</em>
        </div>
      </div>

      {renderStatusNotice(display)}

      <p className="foreman-avatar-bay__boundary-copy">
        Foreman is deterministic and source-bounded. It conducts the proof
        sequence; it does not create governance truth, authority truth, or
        absence truth.
      </p>

      <div className="foreman-avatar-bay__controls" aria-label="Foreman bounded controls">
        {(
          [
            ["ask", "Ask Foreman"],
            ["challenge", "Challenge Foreman"],
            ["proof", "Show Proof"],
          ] as const
        ).map(([cardId, label]) => (
          <button
            aria-controls="foreman-avatar-card"
            aria-expanded={activeCard === cardId}
            aria-label={`${label} bounded card`}
            className="foreman-avatar-bay__button"
            data-foreman-avatar-control={cardId}
            key={cardId}
            onClick={() => toggleCard(cardId)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {renderCard(activeCard, display)}

      {judgeChallenge ? (
        <article
          className="foreman-avatar-bay__control-card foreman-avatar-bay__control-card--judge"
          data-foreman-avatar-card="judge-mode"
          data-foreman-judge-question={judgeChallenge.question_id}
        >
          <span>Judge Mode</span>
          <strong>{judgeChallenge.label}</strong>
          <p>{judgeChallenge.safe_claim}</p>
          <p>{judgeChallenge.recovery_line}</p>
        </article>
      ) : null}
    </section>
  );
}
