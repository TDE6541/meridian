import type { DashboardForensicChainView } from "../adapters/forensicAdapter.ts";
import type { DashboardSkinView } from "../adapters/skinPayloadAdapter.ts";
import type { AuthorityDashboardStateV1 } from "../authority/authorityDashboardTypes.ts";
import type { AbsenceLensView } from "../adapters/absenceSignalAdapter.ts";
import type { DashboardRoleSessionProofV1 } from "../roleSession/roleSessionTypes.ts";
import type { ControlRoomTimelineStep } from "../state/controlRoomState.ts";
import type { DemoAuditWallView } from "../demo/demoAudit.ts";
import { fictionalPermitAnchor } from "../demo/fictionalPermitAnchor.ts";
import type { HoldWallView } from "../demo/holdWall.ts";
import { buildMissionAbsenceLensOverlay } from "../demo/missionAbsenceLens.ts";
import type { MissionRailStage } from "../demo/missionRail.ts";
import type { AuthorityVibrationAttempt } from "../demo/deviceVibration.ts";
import type { SyncChoreographyView } from "../demo/syncChoreography.ts";
import { DecisionCounter } from "./DecisionCounter.tsx";
import { DemoAuditWall } from "./DemoAuditWall.tsx";
import { DoctrineCard } from "./DoctrineCard.tsx";
import { HoldWall } from "./HoldWall.tsx";
import {
  MissionPlaybackControls,
  type MissionPlaybackControlsProps,
} from "./MissionPlaybackControls.tsx";
import type { MissionPhysicalProjectionV1 } from "../demo/missionPhysicalProjection.ts";
import { AbsenceShadowMap } from "./AbsenceShadowMap.tsx";
import { AuthorityHandoffTheater } from "./AuthorityHandoffTheater.tsx";
import { ForemanAvatarBay } from "./ForemanAvatarBay.tsx";
import { MissionRail } from "./MissionRail.tsx";
import { ProofSpotlight } from "./ProofSpotlight.tsx";
import { SyncPill } from "./SyncPill.tsx";

export interface MissionPresentationShellProps {
  absenceLens: AbsenceLensView;
  absenceLensEnabled: boolean;
  activeSkinLabel: string;
  activeStepLabel: string;
  auditWallOpen: boolean;
  auditWallView: DemoAuditWallView;
  authorityState: AuthorityDashboardStateV1;
  canDrive?: boolean;
  currentStep: ControlRoomTimelineStep | null;
  dashboardMode: "live" | "snapshot";
  dataVersion: string | null;
  engineerMode: boolean;
  errorCount: number;
  forensicChain: DashboardForensicChainView;
  holdWallOpen: boolean;
  holdWallView: HoldWallView;
  missionPhysicalProjection?: MissionPhysicalProjectionV1 | null;
  missionPlaybackControls?: MissionPlaybackControlsProps;
  missionRailStages: readonly MissionRailStage[];
  onDirectorModeOpen?: () => void;
  onAbsenceLensToggle: () => void;
  onAuditWallDismiss: () => void;
  onAuditWallOpen: () => void;
  onEngineerModeChange: (enabled: boolean) => void;
  onHoldWallDismiss: () => void;
  onHoldWallOpen: () => void;
  onNextStep?: () => void;
  onPausePlayback?: () => void;
  onPlayPlayback?: () => void;
  onPreviousStep?: () => void;
  onResetStep?: () => void;
  playbackState?: "paused" | "playing";
  publicSkinView: DashboardSkinView | null;
  readyCount: number;
  roleSession: DashboardRoleSessionProofV1;
  scenarioDescription: string;
  scenarioLabel: string;
  scenarioStatus: string;
  sharedEndpointStatus?: string;
  syncChoreography: SyncChoreographyView;
  totalSteps: number;
  vibrationStatus: AuthorityVibrationAttempt;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

type PresenterDecisionTone =
  | "blocked"
  | "hold"
  | "pending"
  | "ready"
  | "revoke"
  | "unavailable";

function normalizeStatus(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeDecision(value: string | null | undefined): string {
  return normalizeStatus(value)?.toUpperCase() ?? "HOLD";
}

function getDecisionTone(
  currentStep: ControlRoomTimelineStep | null,
  decision: string,
  authorityState: AuthorityDashboardStateV1
): PresenterDecisionTone {
  if (!currentStep) {
    return "unavailable";
  }

  if (decision === "HOLD") {
    return "hold";
  }

  if (decision === "BLOCK") {
    return "blocked";
  }

  if (decision === "REVOKE") {
    return "revoke";
  }

  if (authorityState.status === "holding") {
    return "hold";
  }

  if (authorityState.status === "pending") {
    return "pending";
  }

  return "ready";
}

function getCurrentDecisionWhy({
  authorityState,
  currentStep,
  decision,
  holdWallView,
}: {
  authorityState: AuthorityDashboardStateV1;
  currentStep: ControlRoomTimelineStep | null;
  decision: string;
  holdWallView: HoldWallView;
}): string {
  if (!currentStep) {
    return "HOLD: select a scenario step before claiming an active decision.";
  }

  if (holdWallView.triggered) {
    return `Existing proof triggers ${holdWallView.triggerSource}; open the HOLD Wall for the source-bounded missing proof.`;
  }

  if (decision === "REVOKE") {
    return "Trusted proof contradicts the prior authority path, so the stage stays revoked.";
  }

  if (decision === "BLOCK") {
    return "The action would exceed the current proof boundary, so the stage stays blocked.";
  }

  if (decision === "HOLD") {
    return "Required authority or evidence is missing, so the stage holds instead of guessing.";
  }

  if (authorityState.status === "pending") {
    return "Authority proof is pending in the dashboard-local GARP runway.";
  }

  return "Current snapshot proof is available without creating new dashboard truth.";
}

function getProofNext({
  absenceLens,
  authorityState,
  forensicChain,
  holdWallView,
  publicSkinView,
}: {
  absenceLens: AbsenceLensView;
  authorityState: AuthorityDashboardStateV1;
  forensicChain: DashboardForensicChainView;
  holdWallView: HoldWallView;
  publicSkinView: DashboardSkinView | null;
}): string {
  const proofTargets = [
    holdWallView.triggered ? "HOLD Wall" : null,
    absenceLens.signals.length > 0 ? "Absence Lens" : null,
    authorityState.status !== "unavailable" ? "GARP authority" : null,
    forensicChain.hasEntries ? "Forensic chain" : null,
    publicSkinView?.hasPayload ? "Disclosure preview" : null,
    "Engineer Mode",
  ].filter((entry): entry is string => entry !== null);

  return proofTargets.slice(0, 4).join(" / ");
}

export function MissionPresentationShell({
  absenceLens,
  absenceLensEnabled,
  activeSkinLabel,
  activeStepLabel,
  auditWallOpen,
  auditWallView,
  authorityState,
  canDrive = false,
  currentStep,
  dashboardMode,
  dataVersion,
  engineerMode,
  errorCount,
  forensicChain,
  holdWallOpen,
  holdWallView,
  missionPhysicalProjection = null,
  missionPlaybackControls,
  missionRailStages,
  onDirectorModeOpen,
  onAbsenceLensToggle,
  onAuditWallDismiss,
  onAuditWallOpen,
  onEngineerModeChange,
  onHoldWallDismiss,
  onHoldWallOpen,
  onNextStep,
  onPausePlayback,
  onPlayPlayback,
  onPreviousStep,
  onResetStep,
  playbackState = "paused",
  publicSkinView,
  readyCount,
  roleSession,
  scenarioDescription,
  scenarioLabel,
  scenarioStatus,
  sharedEndpointStatus = "not checked in fixture",
  syncChoreography,
  totalSteps,
  vibrationStatus,
}: MissionPresentationShellProps) {
  const activeDecision = normalizeDecision(
    currentStep?.decision ?? currentStep?.step.governance?.result?.decision
  );
  const governanceState =
    normalizeStatus(currentStep?.step.governance?.status) ??
    normalizeStatus(currentStep?.step.status) ??
    "HOLD: step unavailable";
  const decisionTone = getDecisionTone(currentStep, activeDecision, authorityState);
  const currentDecisionWhy = getCurrentDecisionWhy({
    authorityState,
    currentStep,
    decision: activeDecision,
    holdWallView,
  });
  const proofNext = getProofNext({
    absenceLens,
    authorityState,
    forensicChain,
    holdWallView,
    publicSkinView,
  });
  const missionAbsenceLens = buildMissionAbsenceLensOverlay(absenceLens);
  const publicPayloadStatus = publicSkinView?.hasPayload
    ? "public skin payload present"
    : "public skin payload pending";
  const primaryPlaybackAction =
    playbackState === "playing" ? onPausePlayback : onPlayPlayback;

  return (
    <section
      className="mission-presentation"
      data-mission-presentation={engineerMode ? "engineer" : "active"}
      data-presenter-view-default={engineerMode ? "false" : "true"}
    >
      <div className="mission-presentation__header">
        <div>
          <p className="mission-presentation__eyebrow">Meridian Presenter View</p>
          <h1>Presenter Cockpit</h1>
          <p className="mission-presentation__summary">
            Show the scenario, current decision, safety logic, and proof path without
            turning the first screen into the full control room.
          </p>
          <p className="mission-presentation__scenario-line">{scenarioDescription}</p>
        </div>

        <details className="mission-proof-tools" data-proof-tools="collapsed-by-default">
          <summary>Proof Tools</summary>
          <div className="mission-proof-tools__buttons">
            <button
              aria-label={
                engineerMode ? "Return to Presenter View" : "Reveal Engineer Mode cockpit"
              }
              aria-pressed={engineerMode}
              className="mission-presentation__mode-toggle"
              onClick={() => onEngineerModeChange(!engineerMode)}
              type="button"
            >
              {engineerMode ? "Presenter View" : "Engineer Mode"}
            </button>
            <button
              aria-label="Open Director Mode in Engineer cockpit"
              className="mission-presentation__mode-toggle"
              onClick={onDirectorModeOpen}
              type="button"
            >
              Director Mode
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
              aria-label="Open Demo Audit Wall"
              className="mission-presentation__mode-toggle mission-presentation__mode-toggle--audit"
              onClick={onAuditWallOpen}
              type="button"
            >
              Audit Wall
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
        </details>
      </div>

      <section
        className="mission-demo-anchor"
        data-demo-anchor="compact"
        data-fictional-permit-anchor={fictionalPermitAnchor.title}
      >
        <span>{fictionalPermitAnchor.fictionLabel}</span>
        <strong>{fictionalPermitAnchor.title}</strong>
        <em>{fictionalPermitAnchor.context}</em>
        <em>{fictionalPermitAnchor.boundary}</em>
        <details className="mission-demo-anchor__roles">
          <summary>Audience frames</summary>
          <div>
            {fictionalPermitAnchor.roleFrames.map((frame) => (
              <article data-fictional-permit-role={frame.label} key={frame.label}>
                <span>{frame.label}</span>
                <strong>{frame.summary}</strong>
              </article>
            ))}
          </div>
        </details>
      </section>

      <div className="mission-status-strip" data-demo-status-strip="presenter">
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
          <span>Auth proof</span>
          <strong>{roleSession.auth_status}</strong>
          <em>{roleSession.role} · {roleSession.auth_status}</em>
        </div>
        <div className="mission-presentation__readout">
          <span>GARP endpoint</span>
          <strong>{sharedEndpointStatus}</strong>
          <em>authority state: {authorityState.status}</em>
        </div>
      </div>

      <section
        className={`mission-current-card mission-current-card--${decisionTone}`}
        data-current-decision-card="true"
        data-current-decision-state={activeDecision}
        data-current-decision-tone={decisionTone}
      >
        <div className="mission-current-card__headline">
          <p>Current decision / HOLD</p>
          <h2>{activeDecision}</h2>
          <span>{currentStep?.stepId ?? "HOLD: active step unavailable"}</span>
        </div>
        <dl className="mission-current-card__facts">
          <div>
            <dt>Current step</dt>
            <dd>{activeStepLabel}</dd>
          </div>
          <div>
            <dt>Governance state</dt>
            <dd>{governanceState}</dd>
          </div>
          <div>
            <dt>Why it matters</dt>
            <dd>{currentDecisionWhy}</dd>
          </div>
          <div>
            <dt>Proof available next</dt>
            <dd>{proofNext}</dd>
          </div>
        </dl>
      </section>

      <aside className="mission-foreman-note" data-foreman-presenter-note="guide-only">
        <span>Foreman guide</span>
        <strong>
          Can explain what happened, what is missing, why the system held/blocked/revoked,
          and what the public can see. It does not create truth.
        </strong>
      </aside>

      <ForemanAvatarBay projection={missionPhysicalProjection} />

      <AuthorityHandoffTheater projection={missionPhysicalProjection} />

      <ProofSpotlight projection={missionPhysicalProjection} />

      <AbsenceShadowMap projection={missionPhysicalProjection} />

      <MissionPlaybackControls {...missionPlaybackControls} />

      <MissionRail stages={missionRailStages} />

      <div className="mission-primary-actions" data-primary-action-row="presenter">
        <button
          className="mission-primary-actions__button"
          disabled={!canDrive}
          onClick={onPreviousStep}
          type="button"
        >
          Previous
        </button>
        <button
          className="mission-primary-actions__button mission-primary-actions__button--primary"
          disabled={!canDrive}
          onClick={primaryPlaybackAction}
          type="button"
        >
          {playbackState === "playing" ? "Pause" : "Play"}
        </button>
        <button
          className="mission-primary-actions__button"
          disabled={!canDrive}
          onClick={onNextStep}
          type="button"
        >
          Next Proof
        </button>
        <button
          className="mission-primary-actions__button"
          disabled={!canDrive}
          onClick={onResetStep}
          type="button"
        >
          Reset
        </button>
      </div>

      <SyncPill vibrationStatus={vibrationStatus} view={syncChoreography} />

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

      <section className="mission-secondary-proof" data-secondary-proof-summary="true">
        <DecisionCounter view={auditWallView.counter} />

        <div className="mission-proof-summary-grid" data-proof-summary-grid="secondary">
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

        <DoctrineCard />
      </section>

      <DemoAuditWall
        onDismiss={onAuditWallDismiss}
        open={auditWallOpen}
        view={auditWallView}
      />

      <HoldWall
        onDismiss={onHoldWallDismiss}
        open={holdWallOpen}
        view={holdWallView}
      />
    </section>
  );
}
