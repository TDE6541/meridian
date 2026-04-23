export interface PlaybackControlsProps {
  activeStepIndex: number;
  canInteract: boolean;
  isPlaying: boolean;
  onNext: () => void;
  onPause: () => void;
  onPlay: () => void;
  onPrevious: () => void;
  onReset: () => void;
  totalSteps: number;
}

export function PlaybackControls({
  activeStepIndex,
  canInteract,
  isPlaying,
  onNext,
  onPause,
  onPlay,
  onPrevious,
  onReset,
  totalSteps,
}: PlaybackControlsProps) {
  const atFirstStep = activeStepIndex <= 0;
  const atLastStep = totalSteps === 0 || activeStepIndex >= totalSteps - 1;

  return (
    <section className="panel playback-controls" aria-labelledby="playback-controls-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Playback</p>
        <h2 id="playback-controls-title">Deterministic local navigation</h2>
      </div>

      <p className="playback-controls__position">
        Step {totalSteps === 0 ? 0 : activeStepIndex + 1} / {totalSteps}
      </p>

      <div className="playback-controls__buttons">
        <button
          type="button"
          className="control-button"
          onClick={onPrevious}
          disabled={!canInteract || atFirstStep}
        >
          Previous
        </button>
        <button
          type="button"
          className="control-button"
          onClick={onNext}
          disabled={!canInteract || atLastStep}
        >
          Next
        </button>
        {isPlaying ? (
          <button
            type="button"
            className="control-button control-button--primary"
            onClick={onPause}
            disabled={!canInteract}
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            className="control-button control-button--primary"
            onClick={onPlay}
            disabled={!canInteract || totalSteps === 0}
          >
            Play
          </button>
        )}
        <button
          type="button"
          className="control-button"
          onClick={onReset}
          disabled={!canInteract || (activeStepIndex === 0 && !isPlaying)}
        >
          Reset
        </button>
      </div>

      <p className="playback-controls__note">
        Play advances through frozen steps only and stops when the final step is reached.
      </p>
    </section>
  );
}
