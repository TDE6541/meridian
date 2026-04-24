export type DashboardMode = "snapshot" | "live";

export interface LiveModeToggleProps {
  mode: DashboardMode;
  onModeChange: (mode: DashboardMode) => void;
}

export function LiveModeToggle({ mode, onModeChange }: LiveModeToggleProps) {
  return (
    <section className="panel live-mode-toggle" aria-labelledby="live-mode-title">
      <div className="panel-heading">
        <p className="panel-eyebrow">Dashboard mode</p>
        <h2 id="live-mode-title">Snapshot / Live</h2>
      </div>
      <div className="live-mode-toggle__controls" role="group" aria-label="Dashboard mode">
        <button
          type="button"
          className={[
            "control-button",
            mode === "snapshot" ? "control-button--primary" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={mode === "snapshot"}
          onClick={() => onModeChange("snapshot")}
        >
          Snapshot
        </button>
        <button
          type="button"
          className={[
            "control-button",
            mode === "live" ? "control-button--primary" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-pressed={mode === "live"}
          onClick={() => onModeChange("live")}
        >
          Live
        </button>
      </div>
      <p className="live-mode-toggle__copy">
        Snapshot remains the default stable path. Live Mode reads a local demo
        projection when one is available.
      </p>
    </section>
  );
}
