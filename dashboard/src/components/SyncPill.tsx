import type { AuthorityVibrationAttempt } from "../demo/deviceVibration.ts";
import type { SyncChoreographyView } from "../demo/syncChoreography.ts";

export interface SyncPillProps {
  vibrationStatus: AuthorityVibrationAttempt;
  view: SyncChoreographyView;
}

export function SyncPill({ vibrationStatus, view }: SyncPillProps) {
  return (
    <section
      className={[
        "sync-pill",
        `sync-pill--${view.pulse}`,
        view.animate ? "sync-pill--animate" : "",
        view.directorApprovalPulse ? "sync-pill--director-approval" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-director-approval-pulse={view.directorApprovalPulse ? "true" : "false"}
      data-sync-animate={view.animate ? "true" : "false"}
      data-sync-pill="true"
      data-sync-pulse={view.pulse}
      data-sync-source={view.sourceRef}
      data-vibration-signal={view.vibrationSignalId ?? "none"}
      data-vibration-status={vibrationStatus.status}
    >
      <span className="sync-pill__dot" aria-hidden="true" />
      <div className="sync-pill__copy">
        <p>Cross-device sync</p>
        <strong>{view.label}</strong>
        <em>{view.detail}</em>
        <small>{vibrationStatus.reason}</small>
      </div>
    </section>
  );
}
