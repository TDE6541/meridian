import type { LiveConnectionStatus } from "../live/liveTypes.ts";

export interface LiveConnectionBannerProps {
  holdMessage: string | null;
  loading?: boolean;
  onRefresh?: () => void;
  status: LiveConnectionStatus;
}

function getBannerCopy(status: LiveConnectionStatus, holdMessage: string | null) {
  if (status === "connected") {
    return "Live projection connected.";
  }

  if (status === "holding") {
    return holdMessage ?? "HOLD: Live projection is holding.";
  }

  return holdMessage ?? "HOLD: Live projection is disconnected.";
}

export function LiveConnectionBanner({
  holdMessage,
  loading = false,
  onRefresh,
  status,
}: LiveConnectionBannerProps) {
  const holding = status !== "connected";

  return (
    <section
      className={[
        "panel",
        "live-connection-banner",
        holding ? "live-connection-banner--hold" : "live-connection-banner--connected",
      ].join(" ")}
      data-live-connection-status={status}
      aria-live="polite"
    >
      <div>
        <p className="panel-eyebrow">{holding ? "HOLD" : "Live connection"}</p>
        <h2>{loading ? "Checking live projection" : getBannerCopy(status, holdMessage)}</h2>
      </div>
      {onRefresh ? (
        <button
          type="button"
          className="control-button"
          aria-label="Refresh Live Mode projection status"
          onClick={onRefresh}
        >
          Refresh
        </button>
      ) : null}
    </section>
  );
}
