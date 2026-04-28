import type { DashboardForensicChainView } from "../adapters/forensicAdapter.ts";
import type { DashboardSkinView } from "../adapters/skinPayloadAdapter.ts";
import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";
import type { AbsenceLensView } from "../adapters/absenceSignalAdapter.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import { fictionalPermitAnchor } from "../demo/fictionalPermitAnchor.ts";
import type { HoldWallView } from "../demo/holdWall.ts";
import { buildMissionAbsenceLensOverlay } from "../demo/missionAbsenceLens.ts";
import type { MissionRailStage } from "../demo/missionRail.ts";
import { HoldWall } from "./HoldWall.tsx";
import { MissionRail } from "./MissionRail.tsx";

export interface MissionPresentationShellProps {
  absenceLens: AbsenceLensView;
  absenceLensEnabled: boolean;
  activeSkinLabel: string;
  activeStepLabel: string;
  authorityState: AuthorityDashboardStateV1;
  currentStep: ControlRoomTimelineStep | null;
  dashboardMode: "live" | "snapshot";
  dataVersion: string | null;
  engineerMode: boolean;
  errorCount: number;
  forensicChain: DashboardForensicChainView;
  holdWallOpen: boolean;
  holdWallView: HoldWallView;
  missionRailStages: readonly MissionRailStage[];
  onAbsenceLensToggle: () => void;
  onEngineerModeChange: (enabled: boolean) => void;
  onHoldWallDismiss: () => void;
  onHoldWallOpen: () => void;
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
  absenceLensEnabled,
  activeSkinLabel,
  activeStepLabel,
  authorityState,
  currentStep,
  dashboardMode,
  dataVersion,
  engineerMode,
  errorCount,
  forensicChain,
  holdWallOpen,
  holdWallView,
  missionRailStages,
  onAbsenceLensToggle,
  onEngineerModeChange,
  onHoldWallDismiss,
  onHoldWallOpen,
  publicSkinView,
  readyCount,
  roleSession,
  scenarioDescription,
  scenarioLabel,
  scenarioStatus,
  totalSteps,
}: MissionPresentationShellProps) {
  const activeDecision = currentStep?.decision ?? "pending";
  const missionAbsenceLens = buildMissionAbsenceLensOverlay(absenceLens);
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

        <div className="mission-presentation__actions">
          <button
            aria-label={engineerMode ? "Return to Mission view" : "Reveal Engineer Mode cockpit"}
            aria-pressed={engineerMode}
            className="mission-presentation__mode-toggle"
            onClick={() => onEngineerModeChange(!engineerMode)}
            type="button"
          >
            {engineerMode ? "Mission View" : "Engineer Mode"}
          </button>
          <button
            aria-label="Toggle Absence Lens"
            aria-pressed={absenceLensEnabled}
            className="mission-presentation__mode-toggle mission-presentation__mode-toggle--lens"
            onClick={onAbsenceLensToggle}
            type="button"
          >
            Absence Lens
          </button>
          <button
            aria-label="Open HOLD Wall"
            className="mission-presentation__mode-toggle mission-presentation__mode-toggle--hold"
            data-hold-wall-trigger-state={holdWallView.triggered ? "available" : "unavailable"}
            disabled={!holdWallView.triggered}
            onClick={onHoldWallOpen}
            type="button"
          >
            HOLD Wall
          </button>
        </div>
      </div>

      <section
        className="mission-permit-anchor"
        data-fictional-permit-anchor={fictionalPermitAnchor.title}
      >
        <div className="mission-permit-anchor__story">
          <p>{fictionalPermitAnchor.fictionLabel}</p>
          <h2>{fictionalPermitAnchor.title}</h2>
          <span>{fictionalPermitAnchor.context}</span>
          <em>{fictionalPermitAnchor.boundary}</em>
          <small>{fictionalPermitAnchor.foremanReference}</small>
        </div>
        <div className="mission-permit-anchor__roles">
          {fictionalPermitAnchor.roleFrames.map((frame) => (
            <article data-fictional-permit-role={frame.label} key={frame.label}>
              <span>{frame.label}</span>
              <strong>{frame.summary}</strong>
            </article>
          ))}
        </div>
      </section>

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

      {absenceLensEnabled ? (
        <section
          className="mission-absence-lens mission-absence-lens--active"
          data-mission-absence-lens="active"
          data-mission-absence-source-mode={missionAbsenceLens.sourceMode}
          data-mission-absence-treatment="dims-existing-highlights-missing"
        >
          <div className="mission-absence-lens__baseline">
            <span>Existing proof</span>
            <strong>{activeStepLabel}</strong>
            <em>{missionAbsenceLens.activeStepId ?? "HOLD: step unavailable"}</em>
          </div>
          <div className="mission-absence-lens__findings">
            {missionAbsenceLens.findings.length > 0 ? (
              missionAbsenceLens.findings.map((finding) => (
                <article
                  data-mission-absence-category={finding.category}
                  data-mission-absence-finding={finding.id}
                  key={finding.id}
                >
                  <span>{finding.category}</span>
                  <strong>{finding.title}</strong>
                  <em>{finding.summary}</em>
                  <small>{finding.sourcePath}</small>
                </article>
              ))
            ) : (
              <article
                data-mission-absence-category="evidence"
                data-mission-absence-finding="unresolved"
              >
                <span>evidence</span>
                <strong>HOLD: no existing absence output</strong>
                <em>No dashboard-side absence truth is computed here.</em>
                <small>absenceLens.signals</small>
              </article>
            )}
          </div>
          {missionAbsenceLens.truncatedCount > 0 ? (
            <p className="mission-absence-lens__cap">
              {formatCount(missionAbsenceLens.truncatedCount, "additional source-backed finding")}
            </p>
          ) : null}
        </section>
      ) : null}

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

      <HoldWall
        onDismiss={onHoldWallDismiss}
        open={holdWallOpen}
        view={holdWallView}
      />
    </section>
  );
}
