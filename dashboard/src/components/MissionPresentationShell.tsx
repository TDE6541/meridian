import type { DashboardForensicChainView } from "../adapters/forensicAdapter.ts";
import type { DashboardSkinView } from "../adapters/skinPayloadAdapter.ts";
import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";
import type { AbsenceLensView } from "../adapters/absenceSignalAdapter.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { MissionRailStage } from "../demo/missionRail.ts";
import { MissionRail } from "./MissionRail.tsx";

export interface MissionPresentationShellProps {
  absenceLens: AbsenceLensView;
  activeSkinLabel: string;
  activeStepLabel: string;
  authorityState: AuthorityDashboardStateV1;
  currentStep: ControlRoomTimelineStep | null;
  dashboardMode: "live" | "snapshot";
  dataVersion: string | null;
  engineerMode: boolean;
  errorCount: number;
  forensicChain: DashboardForensicChainView;
  missionRailStages: readonly MissionRailStage[];
  onEngineerModeChange: (enabled: boolean) => void;
  publicSkinView: DashboardSkinView | null;
  readyCount: number;
  roleSession: DashboardRoleSessionProofV1;
  scenarioDescription: string;
  scenarioLabel: string;
  scenarioStatus: string;
  totalSteps: number;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function MissionPresentationShell({
  absenceLens,
  activeSkinLabel,
  activeStepLabel,
  authorityState,
  currentStep,
  dashboardMode,
  dataVersion,
  engineerMode,
  errorCount,
  forensicChain,
  missionRailStages,
  onEngineerModeChange,
  publicSkinView,
  readyCount,
  roleSession,
  scenarioDescription,
  scenarioLabel,
  scenarioStatus,
  totalSteps,
}: MissionPresentationShellProps) {
  const activeDecision = currentStep?.decision ?? "pending";
  const publicPayloadStatus = publicSkinView?.hasPayload
    ? "public skin payload present"
    : "public skin payload pending";

  return (
    <section
      className="mission-presentation"
      data-mission-presentation={engineerMode ? "engineer" : "active"}
    >
      <div className="mission-presentation__header">
        <div>
          <p className="mission-presentation__eyebrow">Meridian Demo Day</p>
          <h1>Mission Control</h1>
          <p className="mission-presentation__summary">{scenarioDescription}</p>
        </div>

        <button
          aria-label={engineerMode ? "Return to Mission view" : "Reveal Engineer Mode cockpit"}
          aria-pressed={engineerMode}
          className="mission-presentation__mode-toggle"
          onClick={() => onEngineerModeChange(!engineerMode)}
          type="button"
        >
          {engineerMode ? "Mission View" : "Engineer Mode"}
        </button>
      </div>

      <div className="mission-presentation__status-grid">
        <div className="mission-presentation__readout">
          <span>Scenario</span>
          <strong>{scenarioLabel}</strong>
          <em>{scenarioStatus}</em>
        </div>
        <div className="mission-presentation__readout">
          <span>Mode</span>
          <strong>{dashboardMode === "live" ? "Live" : "Snapshot"}</strong>
          <em>{dataVersion ?? "version pending"}</em>
        </div>
        <div className="mission-presentation__readout">
          <span>Step</span>
          <strong>{activeStepLabel}</strong>
          <em>{formatCount(totalSteps, "step")}</em>
        </div>
        <div className="mission-presentation__readout">
          <span>Skin</span>
          <strong>{activeSkinLabel}</strong>
          <em>{roleSession.role} · {roleSession.auth_status}</em>
        </div>
      </div>

      <MissionRail stages={missionRailStages} />

      <div className="mission-presentation__telemetry">
        <div className="mission-presentation__card">
          <span>Authority</span>
          <strong>{authorityState.status}</strong>
          <em>{formatCount(authorityState.counts.total, "request")}</em>
        </div>
        <div className="mission-presentation__card">
          <span>Governance</span>
          <strong>{activeDecision}</strong>
          <em>{currentStep?.stepId ?? "step pending"}</em>
        </div>
        <div className="mission-presentation__card">
          <span>Absence</span>
          <strong>{formatCount(absenceLens.signals.length, "signal")}</strong>
          <em>{absenceLens.activeStepId ?? "step pending"}</em>
        </div>
        <div className="mission-presentation__card">
          <span>Chain</span>
          <strong>{formatCount(forensicChain.totalEntryCount, "entry", "entries")}</strong>
          <em>{forensicChain.activeStepId ?? "step pending"}</em>
        </div>
        <div className="mission-presentation__card">
          <span>Public</span>
          <strong>{publicPayloadStatus}</strong>
          <em>{formatCount(publicSkinView?.redactions.length ?? 0, "redaction")}</em>
        </div>
        <div className="mission-presentation__card">
          <span>Snapshots</span>
          <strong>{formatCount(readyCount, "snapshot")}</strong>
          <em>{formatCount(errorCount, "error")}</em>
        </div>
      </div>
    </section>
  );
}
