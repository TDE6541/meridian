import {
  JUDGE_TOUCHBOARD_CONTROLS,
  JUDGE_TOUCHBOARD_CARDS,
  type JudgeQuestionId,
  type JudgeTouchboardCard,
} from "../demo/judgeTouchboardDeck.ts";

export interface JudgeTouchboardProps {
  card?: JudgeTouchboardCard | null;
  interruptStatus?: "idle" | "interrupted" | "paused";
  missionModeLabel?: string;
  onResetForNextJudge?: () => void;
  onResumeMission?: () => void;
  onSelectQuestion?: (questionId: JudgeQuestionId) => void;
  stageLabel?: string;
}

function renderCard(card: JudgeTouchboardCard | null | undefined) {
  if (!card) {
    return (
      <article
        className="judge-touchboard__answer judge-touchboard__answer--fallback"
        data-judge-answer-card="safe-fallback"
      >
        <span>Ready</span>
        <strong>No judge challenge selected</strong>
        <p>
          Select a preauthored challenge. D9 has no open text input and no live
          Q&A path.
        </p>
      </article>
    );
  }

  return (
    <article
      className="judge-touchboard__answer"
      data-judge-answer-card={card.question_id}
      data-judge-card-category={card.category}
      data-related-stage-id={card.related_stage_id ?? "none"}
    >
      <span>{card.category}</span>
      <strong>{card.label}</strong>

      <section className="judge-touchboard__answer-section">
        <h3>Safe claim</h3>
        <p data-judge-safe-claim="true">{card.safe_claim}</p>
      </section>

      <section className="judge-touchboard__answer-section">
        <h3>Not claimed</h3>
        <ul>
          {card.not_claimed.map((claim) => (
            <li data-judge-non-claim={claim} key={claim}>
              {claim}
            </li>
          ))}
        </ul>
      </section>

      <section className="judge-touchboard__answer-section">
        <h3>Evidence refs</h3>
        <ul>
          {card.evidence_refs.map((ref) => (
            <li data-judge-evidence-ref={ref} key={ref}>
              {ref}
            </li>
          ))}
        </ul>
      </section>

      <section className="judge-touchboard__answer-section">
        <h3>Recovery line</h3>
        <p data-judge-recovery-line="true">{card.recovery_line}</p>
      </section>
    </article>
  );
}

export function JudgeTouchboard({
  card = null,
  interruptStatus = card ? "interrupted" : "idle",
  missionModeLabel = "Guided Mission",
  onResetForNextJudge,
  onResumeMission,
  onSelectQuestion,
  stageLabel = "No active mission",
}: JudgeTouchboardProps) {
  const selectedQuestionId = card?.question_id ?? null;

  return (
    <section
      aria-labelledby="judge-touchboard-title"
      className="judge-touchboard"
      data-judge-touchboard="true"
      data-judge-touchboard-deck-size={JUDGE_TOUCHBOARD_CARDS.length}
      data-judge-touchboard-interrupt={interruptStatus}
      data-no-open-ended-judge-input="true"
    >
      <div className="judge-touchboard__header">
        <div>
          <p className="judge-touchboard__eyebrow">Judge Touchboard</p>
          <h2 id="judge-touchboard-title">Challenge Controls</h2>
          <p>
            Preauthored challenge cards pause the mission and route attention to
            existing proof surfaces.
          </p>
        </div>
        <div className="judge-touchboard__status" data-judge-interrupt-status={interruptStatus}>
          <span>Interrupt</span>
          <strong>{interruptStatus}</strong>
          <em>{missionModeLabel} / {stageLabel}</em>
        </div>
      </div>

      <div className="judge-touchboard__controls" aria-label="Judge challenge controls">
        {JUDGE_TOUCHBOARD_CONTROLS.map((control) => {
          const selected = control.question_id === selectedQuestionId;

          return (
            <button
              aria-label={control.aria_label}
              aria-pressed={control.question_id ? selected : undefined}
              className="judge-touchboard__button"
              data-judge-control={control.control_id}
              data-judge-control-action={control.action ?? "select-card"}
              data-judge-control-question={control.question_id ?? "none"}
              key={control.control_id}
              onClick={() => {
                if (control.action === "reset") {
                  onResetForNextJudge?.();
                  return;
                }

                if (control.question_id) {
                  onSelectQuestion?.(control.question_id);
                }
              }}
              type="button"
            >
              {control.label}
            </button>
          );
        })}
      </div>

      {renderCard(card)}

      <div className="judge-touchboard__actions">
        <button
          aria-label="Resume the interrupted mission"
          className="judge-touchboard__resume"
          data-judge-control="resume-mission"
          disabled={!card}
          onClick={onResumeMission}
          type="button"
        >
          Resume Mission
        </button>
      </div>
    </section>
  );
}
