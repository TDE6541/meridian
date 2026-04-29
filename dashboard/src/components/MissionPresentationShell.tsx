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
import { buildMissionPhysicalModeView } from "../demo/missionPhysicalModeView.ts";
import type { MissionRehearsalCertificationV1 } from "../demo/missionRehearsalCertification.ts";
import { DecisionCounter } from "./DecisionCounter.tsx";
import { DemoAuditWall } from "./DemoAuditWall.tsx";
import { DoctrineCard } from "./DoctrineCard.tsx";
import { HoldWall } from "./HoldWall.tsx";
import { MissionControlPhysicalMode } from "./MissionControlPhysicalMode.tsx";
import {
  MissionPlaybackControls,
  type MissionPlaybackControlsProps,
} from "./MissionPlaybackControls.tsx";
import type { MissionStageId } from "../demo/missionPlaybackPlan.ts";
import type { MissionPhysicalProjectionV1 } from "../demo/missionPhysicalProjection.ts";
import type { JudgeQuestionId, JudgeTouchboardCard } from "../demo/judgeTouchboardDeck.ts";
import { buildJudgeModeProjection } from "../demo/missionEvidenceNavigator.ts";
import { buildMissionRunReceipt } from "../demo/missionRunReceipt.ts";
import { AbsenceShadowMap } from "./AbsenceShadowMap.tsx";
import { AuthorityHandoffTheater } from "./AuthorityHandoffTheater.tsx";
import { CivicTwinDiorama } from "./CivicTwinDiorama.tsx";
import { ForensicReceiptRibbon } from "./ForensicReceiptRibbon.tsx";
import { ForemanAvatarBay } from "./ForemanAvatarBay.tsx";
import { JudgeTouchboard } from "./JudgeTouchboard.tsx";
import { MissionEvidenceNavigator } from "./MissionEvidenceNavigator.tsx";
import { MissionRail } from "./MissionRail.tsx";
import { MissionRehearsalPanel } from "./MissionRehearsalPanel.tsx";
import { ProofSpotlight } from "./ProofSpotlight.tsx";
import { MissionRunReceiptPanel } from "./MissionRunReceiptPanel.tsx";
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
  judgeCard?: JudgeTouchboardCard | null;
  judgeInterruptStatus?: "idle" | "interrupted" | "paused";
  missionPhysicalModeEnabled?: boolean;
  missionPhysicalProjection?: MissionPhysicalProjectionV1 | null;
  missionPlaybackControls?: MissionPlaybackControlsProps;
  missionRailStages: readonly MissionRailStage[];
  rehearsalCertification?: MissionRehearsalCertificationV1 | null;
  onDirectorModeOpen?: () => void;
  onAbsenceLensToggle: () => void;
  onAuditWallDismiss: () => void;
  onAuditWallOpen: () => void;
  onEngineerModeChange: (enabled: boolean) => void;
  onHoldWallDismiss: () => void;
  onHoldWallOpen: () => void;
  onMissionPhysicalModeChange?: (enabled: boolean) => void;
  onJudgeResetForNextJudge?: () => void;
  onJudgeResumeMission?: () => void;
  onJudgeSelectQuestion?: (questionId: JudgeQuestionId) => void;
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

type MissionSurfaceName =
  | "absence"
  | "authority"
  | "capture"
  | "chain"
  | "foreman"
  | "governance"
  | "presenter"
  | "public"
  | "review";

function buildMissionSurfaceClassName({
  active = false,
  complete = false,
  name,
  reviewVisible = false,
  visible = false,
}: {
  active?: boolean;
  complete?: boolean;
  name: MissionSurfaceName;
  reviewVisible?: boolean;
  visible?: boolean;
}) {
  return [
    "mission-surface",
    `mission-surface--${name}`,
    visible ? "is-visible" : null,
    reviewVisible ? "is-review-visible" : null,
    active ? "is-active" : null,
    complete ? "is-complete" : null,
  ]
    .filter((className): className is string => className !== null)
    .join(" ");
}

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
  judgeCard = null,
  judgeInterruptStatus = judgeCard ? "interrupted" : "idle",
  missionPhysicalModeEnabled = false,
  missionPhysicalProjection = null,
  missionPlaybackControls,
  missionRailStages,
  rehearsalCertification = null,
  onDirectorModeOpen,
  onAbsenceLensToggle,
  onAuditWallDismiss,
  onAuditWallOpen,
  onEngineerModeChange,
  onHoldWallDismiss,
  onHoldWallOpen,
  onMissionPhysicalModeChange,
  onJudgeResetForNextJudge,
  onJudgeResumeMission,
  onJudgeSelectQuestion,
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
  const focalDecision = holdWallView.triggered ? "HOLD" : activeDecision;
  const governanceState =
    normalizeStatus(currentStep?.step.governance?.status) ??
    normalizeStatus(currentStep?.step.status) ??
    "HOLD: step unavailable";
  const decisionTone = getDecisionTone(currentStep, focalDecision, authorityState);
  const currentDecisionWhy = getCurrentDecisionWhy({
    authorityState,
    currentStep,
    decision: focalDecision,
    holdWallView,
  });
  const proofNext = getProofNext({
    absenceLens,
    authorityState,
    forensicChain,
    holdWallView,
    publicSkinView,
  });
  const focalDecisionReason =
    focalDecision === "HOLD"
      ? "Missing authority and evidence prevent safe civic action."
      : currentDecisionWhy;
  const missionAbsenceLens = buildMissionAbsenceLensOverlay(absenceLens);
  const presentationProjection = buildJudgeModeProjection(
    missionPhysicalProjection,
    judgeCard
  );
  const missionRunReceipt = buildMissionRunReceipt({
    conductorOutput: missionPlaybackControls?.conductorOutput ?? null,
    judgeCard,
    judgeInterruptStatus,
    playbackState: missionPlaybackControls?.playbackState ?? null,
    projection: presentationProjection,
  });
  const publicPayloadStatus = publicSkinView?.hasPayload
    ? "public skin payload present"
    : "public skin payload pending";
  const primaryPlaybackAction =
    playbackState === "playing" ? onPausePlayback : onPlayPlayback;
  const physicalModeView = buildMissionPhysicalModeView({
    physicalMode: missionPhysicalModeEnabled,
  });
  const missionPlaybackState = missionPlaybackControls?.playbackState ?? null;
  const missionHasStarted = Boolean(
    missionPlaybackState && missionPlaybackState.status !== "idle"
  );
  const canBeginMission =
    !missionHasStarted && (missionPlaybackControls?.canStart ?? canDrive);
  const activeMissionStage =
    missionPlaybackState?.currentStageId ??
    presentationProjection?.active_stage_id ??
    null;
  const completedMissionStageIds =
    missionPlaybackState?.completedStageIds ?? [];
  const isReviewMode = Boolean(
    missionPlaybackState &&
      (missionPlaybackState.status === "completed" ||
        missionPlaybackState.completedAtMs !== null)
  );
  const isMissionSurfaceActive = (stageId: MissionStageId) =>
    activeMissionStage === stageId;
  const isMissionSurfaceComplete = (stageId: MissionStageId) =>
    completedMissionStageIds.includes(stageId);
  const getMissionStageSurfaceClassName = (
    name: MissionSurfaceName,
    stageId: MissionStageId
  ) =>
    buildMissionSurfaceClassName({
      active: isMissionSurfaceActive(stageId),
      complete: isMissionSurfaceComplete(stageId),
      name,
      reviewVisible: isReviewMode,
      visible: isMissionSurfaceActive(stageId),
    });
  const foremanSurfaceClassName = buildMissionSurfaceClassName({
    active: activeMissionStage !== null,
    complete: isReviewMode,
    name: "foreman",
    reviewVisible: isReviewMode,
    visible: activeMissionStage !== null && activeMissionStage !== "public",
  });
  const presenterSurfaceClassName = buildMissionSurfaceClassName({
    name: "presenter",
    reviewVisible: isReviewMode,
    visible: missionHasStarted || isReviewMode,
  });
  const reviewSurfaceClassName = buildMissionSurfaceClassName({
    active: Boolean(judgeCard),
    complete: isReviewMode,
    name: "review",
    reviewVisible: isReviewMode,
    visible: Boolean(judgeCard),
  });

  return (
    <section
      className={`mission-presentation mission-shell${
        missionPhysicalModeEnabled ? " mission-presentation--physical" : ""
      }`}
      data-mission-presentation={engineerMode ? "engineer" : "active"}
      data-mission-physical-control-scale={physicalModeView.control_scale}
      data-mission-physical-layout={physicalModeView.layout_density}
      data-mission-physical-mode={missionPhysicalModeEnabled ? "on" : "off"}
      data-presenter-view-default={engineerMode ? "false" : "true"}
    >
      <section
        className="mission-hero mission-surface mission-surface--hero is-visible"
        data-default-product-wrapper="true"
        data-mission-surface="hero"
      >
        <div className="mission-hero__main">
          <div className="mission-presentation__header mission-hero__title">
            <p className="mission-presentation__eyebrow">
              Governed civic intelligence dashboard
            </p>
            <h1>Meridian</h1>
            <p className="mission-presentation__deck-label">
              Presenter Cockpit
            </p>
            <p className="mission-presentation__summary">
              Fictional demo permit proof cockpit. Deterministic governance before AI
              action.
            </p>
            <p className="mission-presentation__scenario-line">{scenarioDescription}</p>
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

          <section
            className={`mission-current-card decision-card decision-card--${decisionTone} mission-current-card--${decisionTone}`}
            data-current-decision-card="true"
            data-current-decision-state={focalDecision}
            data-current-decision-tone={decisionTone}
          >
            <div className="mission-current-card__headline">
              <p>Current decision / HOLD</p>
              <h2>Current Decision: {focalDecision}</h2>
              <span>{currentStep?.stepId ?? "HOLD: active step unavailable"}</span>
            </div>
            <dl className="mission-current-card__facts">
              <div>
                <dt>Why it matters</dt>
                <dd>Reason: {focalDecisionReason}</dd>
              </div>
              <div>
                <dt>Current step</dt>
                <dd>{activeStepLabel}</dd>
              </div>
              <div>
                <dt>Governance state</dt>
                <dd>{governanceState}</dd>
              </div>
              <div>
                <dt>Proof available next</dt>
                <dd>{proofNext}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="mission-hero__side" aria-label="Mission readiness">
          <section
            className="foreman-compact"
            data-foreman-compact="ready"
            data-foreman-presenter-note="guide-only"
          >
            <span>Foreman ready</span>
            <strong>Foreman ready. Governance walkthrough armed.</strong>
            <em>
              Explains the HOLD and the missing proof path. It does not create truth.
            </em>
          </section>

          <section className="governance-card mission-safety-card" data-safety-card="compact">
            <p className="mission-safety-card__eyebrow">Why This Is Safe</p>
            <h2>Missing inputs become HOLDs, not guesses.</h2>
            <ul>
              <li>Authority required before action</li>
              <li>Evidence required before action</li>
              <li>The chain remains inspectable</li>
            </ul>
          </section>

          <div className="mission-begin-card" data-begin-mission-cta="true">
            <span>What to click</span>
            <button
              className="mission-begin-card__button"
              disabled={!canBeginMission}
              onClick={
                canBeginMission ? missionPlaybackControls?.onBeginMission : undefined
              }
              type="button"
            >
              Begin Mission
            </button>
            <em>
              Starts the existing guided mission playback without creating new proof truth.
            </em>
          </div>
        </aside>
      </section>

      <section
        className={`${reviewSurfaceClassName} mission-internal-controls`}
        data-internal-proof-controls="true"
        data-mission-surface="review"
      >
        <div className="mission-presentation__header-tools">
          <p className="mission-presentation__summary">
            Show the scenario, current decision, safety logic, and proof path without
            turning the first screen into the full control room.
          </p>
          <MissionControlPhysicalMode
            enabled={missionPhysicalModeEnabled}
            onEnabledChange={onMissionPhysicalModeChange}
            view={physicalModeView}
          />

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
            {rehearsalCertification ? (
              <MissionRehearsalPanel certification={rehearsalCertification} />
            ) : null}
          </details>
        </div>
      </section>

      <section
        className={`${reviewSurfaceClassName} mission-status-strip`}
        data-demo-status-strip="presenter"
        data-mission-surface="review"
      >
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
      </section>

      <section
        className={getMissionStageSurfaceClassName("chain", "chain")}
        data-mission-surface="chain"
      >
        <ForensicReceiptRibbon receipt={missionRunReceipt} />
      </section>

      <section className={reviewSurfaceClassName} data-mission-surface="review">
        <JudgeTouchboard
          card={judgeCard}
          interruptStatus={judgeInterruptStatus}
          missionModeLabel={
            presentationProjection?.mode === "foreman_autonomous"
              ? "Foreman Autonomous"
              : "Guided Mission"
          }
          onResetForNextJudge={onJudgeResetForNextJudge}
          onResumeMission={onJudgeResumeMission}
          onSelectQuestion={onJudgeSelectQuestion}
          stageLabel={presentationProjection?.active_stage_id ?? "No active mission"}
        />
      </section>

      <section className={foremanSurfaceClassName} data-mission-surface="foreman">
        <ForemanAvatarBay
          judgeChallenge={judgeCard}
          projection={presentationProjection}
        />
      </section>

      <section className={reviewSurfaceClassName} data-mission-surface="review">
        <MissionEvidenceNavigator card={judgeCard} />
      </section>

      <section
        className={getMissionStageSurfaceClassName("capture", "capture")}
        data-mission-surface="capture"
      >
        <CivicTwinDiorama projection={presentationProjection} />
      </section>

      <section
        className={getMissionStageSurfaceClassName("authority", "authority")}
        data-mission-surface="authority"
      >
        <AuthorityHandoffTheater projection={presentationProjection} />
      </section>

      <section
        className={getMissionStageSurfaceClassName("governance", "governance")}
        data-mission-surface="governance"
      >
        <ProofSpotlight projection={presentationProjection} />
      </section>

      <section
        className={getMissionStageSurfaceClassName("absence", "absence")}
        data-mission-surface="absence"
      >
        <AbsenceShadowMap projection={presentationProjection} />
      </section>

      <section className={presenterSurfaceClassName} data-mission-surface="presenter">
        <MissionPlaybackControls {...missionPlaybackControls} />
      </section>

      <section
        className={getMissionStageSurfaceClassName("public", "public")}
        data-mission-surface="public"
      >
        <MissionRunReceiptPanel receipt={missionRunReceipt} />
      </section>

      <MissionRail stages={missionRailStages} />

      <div
        className={`mission-primary-actions${
          missionHasStarted || isReviewMode ? " is-visible" : ""
        }`}
        data-primary-action-row="presenter"
      >
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

      <section
        className={getMissionStageSurfaceClassName("public", "public")}
        data-mission-surface="public"
      >
        <SyncPill vibrationStatus={vibrationStatus} view={syncChoreography} />
      </section>

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

      <section
        className={`${reviewSurfaceClassName} mission-secondary-proof`}
        data-mission-surface="review"
        data-secondary-proof-summary="true"
      >
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
