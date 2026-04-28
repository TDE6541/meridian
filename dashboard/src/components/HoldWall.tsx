import type { HoldWallView } from "../demo/holdWall.ts";

export interface HoldWallProps {
  onDismiss: () => void;
  open: boolean;
  view: HoldWallView;
}

export function HoldWall({ onDismiss, open, view }: HoldWallProps) {
  if (!open || !view.triggered) {
    return null;
  }

  return (
    <section
      aria-labelledby="hold-wall-title"
      aria-modal="true"
      className="hold-wall"
      data-audio-cue={view.silence.audioCue}
      data-chain-write-claimed={String(view.chainWriteClaimed)}
      data-hold-wall="open"
      data-hold-wall-source-mode={view.sourceMode}
      role="dialog"
    >
      <div className="hold-wall__chrome" aria-hidden="true">
        <span>&gt;</span>
        <span>&gt;</span>
        <span>&gt;</span>
      </div>

      <div className="hold-wall__header">
        <p className="hold-wall__eyebrow">HOLD Wall</p>
        <h2 id="hold-wall-title">Meridian refused the action</h2>
        <p>
          Triggered by {view.triggerSource}; active proof{" "}
          {view.activeStepId ?? "HOLD: step unavailable"}.
        </p>
      </div>

      <div
        className="hold-wall__silence"
        data-audio-cue={view.silence.audioCue}
        data-silence-beat-count={view.silence.beatCount}
        data-silence-beat-ms={view.silence.beatDurationMs}
      >
        {view.silence.beats.map((beat) => (
          <span data-silence-beat={beat} key={beat}>
            Beat {beat}
          </span>
        ))}
      </div>

      <div className="hold-wall__fields">
        {view.fields.map((field) => (
          <article
            className={`hold-wall__field hold-wall__field--${field.status}`}
            data-hold-wall-field={field.key}
            data-hold-wall-field-status={field.status}
            key={field.key}
          >
            <span>{field.label}</span>
            <strong>{field.value}</strong>
            <em>
              {field.sourcePath
                ? `${field.sourceKind ?? "source"}: ${field.sourcePath}`
                : "HOLD: source unresolved"}
            </em>
          </article>
        ))}
      </div>

      <p className="hold-wall__chain-claim">{view.chainClaim}</p>

      <button className="hold-wall__dismiss" onClick={onDismiss} type="button">
        Return to Mission
      </button>
    </section>
  );
}
