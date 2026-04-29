import { useEffect, useState } from "react";
import { adaptAbsenceSignals } from "../adapters/absenceSignalAdapter.ts";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
} from "../adapters/skinPayloadAdapter.ts";
import { buildDisclosurePreviewActionBundle } from "../authority/disclosurePreviewActions.ts";
import { buildAuthorityDashboardState } from "../authority/authorityStateAdapter.ts";
import { buildDisclosurePreviewReport } from "../authority/disclosurePreviewReport.ts";
import { buildGarpHandoffContext } from "../authority/garpHandoffContext.ts";
import { buildSharedAuthorityDisplayState } from "../authority/sharedAuthorityEvents.ts";
import { useSharedAuthorityRequests } from "../authority/useSharedAuthorityRequests.ts";
import { buildDirectorScene } from "../director/directorScript.ts";
import { resolveDirectorBookmarks } from "../director/directorBookmarks.ts";
import { DemoHeader } from "./DemoHeader.tsx";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp.tsx";
import { adaptCascadeChoreography } from "../adapters/cascadeChoreographyAdapter.ts";
import { adaptEntityRelationships } from "../adapters/entityRelationshipAdapter.ts";
import { adaptForensicChain } from "../adapters/forensicAdapter.ts";
import {
  resolveScenarioShortcutKey,
  resolveSkinShortcutKey,
  shouldIgnoreDemoShortcutTarget,
} from "../demo/demoShortcuts.ts";
import { buildDemoAuditWallView } from "../demo/demoAudit.ts";
import { useJudgeAuthorityRequestVibration } from "../demo/deviceVibration.ts";
import { getDemoScenarioMeta } from "../demo/demoScenarios.ts";
import { FOREMAN_AUTONOMOUS_PLAYBACK_POLICY } from "../demo/foremanAutonomousPolicy.ts";
import {
  createInitialForemanAutonomousConductorState,
  runForemanAutonomousConductor,
  type ForemanAutonomousConductorOutput,
  type ForemanAutonomousConductorState,
  type ForemanConductorReadinessInput,
} from "../demo/foremanAutonomousConductor.ts";
import { buildHoldWallView } from "../demo/holdWall.ts";
import {
  getJudgeTouchboardCard,
  type JudgeQuestionId,
} from "../demo/judgeTouchboardDeck.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../demo/missionPlaybackController.ts";
import { buildMissionPhysicalProjection } from "../demo/missionPhysicalProjection.ts";
import { buildMissionRehearsalCertification } from "../demo/missionRehearsalCertification.ts";
import {
  MISSION_STAGE_IDS,
  type MissionPlaybackMode,
  type MissionStageId,
  type MissionStageSubstrateKey,
} from "../demo/missionPlaybackPlan.ts";
import { buildMissionRailStages } from "../demo/missionRail.ts";
import type { MissionStageReadinessInput } from "../demo/missionStageReadiness.ts";
import { buildSyncChoreographyView } from "../demo/syncChoreography.ts";
import { CascadeChoreography } from "./CascadeChoreography.tsx";
import { DemoReliabilityPanel } from "./DemoReliabilityPanel.tsx";
import { EntityRelationshipGraph } from "./EntityRelationshipGraph.tsx";
import { EntityRelationshipStrip } from "./EntityRelationshipStrip.tsx";
import { ForensicChainPanel } from "./ForensicChainPanel.tsx";
import { GovernanceStatePanel } from "./GovernanceStatePanel.tsx";
import { LiveCapturePanel } from "./LiveCapturePanel.tsx";
import { LiveConnectionBanner } from "./LiveConnectionBanner.tsx";
import { LiveEventRail } from "./LiveEventRail.tsx";
import {
  LiveModeToggle,
  type DashboardMode,
} from "./LiveModeToggle.tsx";
import { MissionPresentationShell } from "./MissionPresentationShell.tsx";
import { PlaybackControls } from "./PlaybackControls.tsx";
import { RoleSessionPanel } from "./RoleSessionPanel.tsx";
import { ScenarioSelector } from "./ScenarioSelector.tsx";
import { SkinPanel } from "./SkinPanel.tsx";
import { SkinSwitcher } from "./SkinSwitcher.tsx";
import { StatusBar } from "./StatusBar.tsx";
import { TimelinePanel } from "./TimelinePanel.tsx";
import { AbsenceLensOverlay } from "./director/AbsenceLensOverlay.tsx";
import { AbsenceSignalRail } from "./director/AbsenceSignalRail.tsx";
import { AuthorityNotificationDemo } from "./AuthorityNotificationDemo.tsx";
import { AuthorityResolutionPanel } from "./AuthorityResolutionPanel.tsx";
import { AuthorityTimeline } from "./AuthorityTimeline.tsx";
import { DirectorCueCard } from "./director/DirectorCueCard.tsx";
import { DisclosurePreviewPanel } from "./DisclosurePreviewPanel.tsx";
import { DirectorModeToggle } from "./director/DirectorModeToggle.tsx";
import { GARPStatusIndicator } from "./GARPStatusIndicator.tsx";
import { JudgeCuePanel } from "./director/JudgeCuePanel.tsx";
import { PreventedActionCard } from "./director/PreventedActionCard.tsx";
import { buildForemanGuideContext } from "../foremanGuide/foremanGuideContext.ts";
import { ForemanMountPoint } from "../foremanGuide/ForemanMountPoint.tsx";
import { useMeridianAuth } from "../auth/MeridianAuthProvider.tsx";
import type { LiveProjectionClient } from "../live/liveClient.ts";
import { useLiveProjection } from "../live/useLiveProjection.ts";
import { resolveDashboardRoleSession } from "../roleSession/resolveRoleSession.ts";
import {
  advancePlayback,
  buildTimelineSteps,
  createInitialControlRoomState,
  getActiveTimelineStep,
  getScenarioRecord,
  getScenarioStepCount,
  goToNextStep,
  goToPreviousStep,
  pausePlayback,
  resetControlRoom,
  resolveScenarioDataVersion,
  selectScenario,
  type ControlRoomState,
  selectSkinTab,
  selectStep,
  startPlayback,
} from "../state/controlRoomState.ts";
import type { ControlRoomScenarioRecord } from "../state/controlRoomState.ts";

const PLAYBACK_INTERVAL_MS = 2400;

export type ControlRoomPresentationMode = "engineer" | "mission";

type MissionControllerReadinessInput = Omit<
  MissionStageReadinessInput,
  "enteredAtMs" | "minDwellMs" | "mode" | "stageId"
>;

interface MissionPlaybackRuntime {
  conductorOutput: ForemanAutonomousConductorOutput | null;
  conductorState: ForemanAutonomousConductorState;
  playbackState: MissionPlaybackState;
}

interface JudgeInterruptState {
  priorMode: MissionPlaybackMode;
  priorPlaybackStatus: MissionPlaybackState["status"];
  priorStageId: MissionStageId | null;
  questionId: JudgeQuestionId;
}

export interface ControlRoomShellProps {
  initialControlState?: Partial<ControlRoomState>;
  initialDashboardMode?: DashboardMode;
  initialDirectorModeEnabled?: boolean;
  initialMissionPhysicalModeEnabled?: boolean;
  initialPresentationMode?: ControlRoomPresentationMode;
  liveClient?: LiveProjectionClient;
  liveSessionId?: string;
  records: readonly ControlRoomScenarioRecord[];
}

function getScenarioStatusLabel(record: ControlRoomScenarioRecord | undefined): string {
  if (!record) {
    return "UNAVAILABLE";
  }

  if (record.status === "ready") {
    return record.scenario.status;
  }

  return record.status.toUpperCase();
}

function getShellMessage(record: ControlRoomScenarioRecord | undefined): string {
  if (!record) {
    return "Scenario snapshot is unavailable.";
  }

  if (record.status === "loading") {
    return "Loading committed snapshot payload.";
  }

  if (record.status === "error") {
    return record.error;
  }

  return `${record.scenario.steps.length} frozen cascade steps available.`;
}

function formatSkinLabel(skinKey: string): string {
  return skinKey.slice(0, 1).toUpperCase() + skinKey.slice(1);
}

export function ControlRoomShell({
  initialControlState,
  initialDashboardMode = "snapshot",
  initialDirectorModeEnabled = false,
  initialMissionPhysicalModeEnabled = false,
  initialPresentationMode = "mission",
  liveClient,
  liveSessionId = "latest",
  records,
}: ControlRoomShellProps) {
  const [controlState, setControlState] = useState(() => ({
    ...createInitialControlRoomState(records[0]?.entry.key ?? "routine"),
    ...initialControlState,
  }));
  const [dashboardMode, setDashboardMode] =
    useState<DashboardMode>(initialDashboardMode);
  const [directorModeEnabled, setDirectorModeEnabled] = useState(
    initialDirectorModeEnabled
  );
  const [auditWallOpen, setAuditWallOpen] = useState(false);
  const [missionAbsenceLensEnabled, setMissionAbsenceLensEnabled] = useState(false);
  const [missionPhysicalModeEnabled, setMissionPhysicalModeEnabled] = useState(
    initialMissionPhysicalModeEnabled
  );
  const [holdWallOpen, setHoldWallOpen] = useState(false);
  const [judgeInterrupt, setJudgeInterrupt] =
    useState<JudgeInterruptState | null>(null);
  const [presentationMode, setPresentationMode] =
    useState<ControlRoomPresentationMode>(initialPresentationMode);
  const [missionRuntime, setMissionRuntime] = useState<MissionPlaybackRuntime>(() => {
    const playbackState = createInitialMissionPlaybackState("guided");

    return {
      conductorOutput: null,
      conductorState: createInitialForemanAutonomousConductorState(
        playbackState.runId
      ),
      playbackState,
    };
  });
  const [foremanHighlightedPanelId, setForemanHighlightedPanelId] = useState<
    string | null
  >(null);
  const authState = useMeridianAuth();
  const roleSession = resolveDashboardRoleSession({
    activeSkin: controlState.activeSkinTab,
    auth: authState,
  });
  const activeSkinTab = roleSession.active_skin;

  const selectedRecord =
    getScenarioRecord(records, controlState.selectedScenarioKey) ?? records[0];
  const readyCount = records.filter((record) => record.status === "ready").length;
  const errorCount = records.filter((record) => record.status === "error").length;
  const totalSteps = getScenarioStepCount(selectedRecord);
  const timelineSteps =
    selectedRecord?.status === "ready" ? buildTimelineSteps(selectedRecord.scenario) : [];
  const currentStep = getActiveTimelineStep(timelineSteps, controlState);
  const forensicChainView = adaptForensicChain(
    timelineSteps,
    controlState.activeStepIndex
  );
  const skinViews = currentStep ? adaptStepSkinPayloads(currentStep.step) : [];
  const activeSkinView =
    getDashboardSkinView(skinViews, activeSkinTab) ??
    skinViews[0] ??
    null;
  const publicSkinView = getDashboardSkinView(skinViews, "public") ?? null;
  const entityRelationshipView = adaptEntityRelationships(currentStep);
  const choreographyView = adaptCascadeChoreography(
    currentStep,
    forensicChainView,
    skinViews
  );
  const absenceLensView = adaptAbsenceSignals({
    activeSkinView,
    currentStep,
    forensicChain: forensicChainView,
    skinViews,
  });
  const directorBookmarks = resolveDirectorBookmarks(
    controlState.selectedScenarioKey,
    timelineSteps
  );
  const directorScene = buildDirectorScene({
    bookmarks: directorBookmarks,
    currentStep,
    signals: absenceLensView.signals,
  });
  const dataVersion = resolveScenarioDataVersion(selectedRecord);
  const scenarioId =
    selectedRecord?.status === "ready"
      ? selectedRecord.scenario.scenarioId
      : selectedRecord?.entry.key ?? "unavailable";
  const liveProjection = useLiveProjection({
    client: liveClient,
    enabled: dashboardMode === "live",
    pollIntervalMs: 5000,
    sessionId: liveSessionId,
  });
  const sharedAuthority = useSharedAuthorityRequests({
    pollIntervalMs: 5000,
  });
  const scenarioMeta = getDemoScenarioMeta(controlState.selectedScenarioKey);
  const scenarioStatusLabel = getScenarioStatusLabel(selectedRecord);
  const activeStepLabel = currentStep
    ? `${currentStep.stepId} (${currentStep.index + 1}/${timelineSteps.length})`
    : totalSteps > 0
      ? `${controlState.activeStepIndex + 1}/${totalSteps}`
      : "Unavailable";
  const activeSkinLabel =
    activeSkinView?.label ?? formatSkinLabel(activeSkinTab);
  const activeForemanPanelId =
    dashboardMode === "live"
      ? "live-event-rail"
      : directorModeEnabled
        ? "director-mode"
        : activeSkinTab === "public"
          ? "disclosure-preview"
          : "skin-view";
  const baseAuthorityState = buildAuthorityDashboardState({
    currentStep,
    liveProjection: liveProjection.projection,
    roleSession,
  });
  const sharedAuthorityDisplay = buildSharedAuthorityDisplayState(
    baseAuthorityState,
    sharedAuthority
  );
  const authorityState = sharedAuthorityDisplay.state;
  const disclosurePreviewReport = buildDisclosurePreviewReport({
    authorityState,
    generatedAt: liveProjection.projection?.session.updated_at ?? null,
    publicSkinView,
    roleSession,
    scenarioLabel: scenarioMeta.displayLabel,
    sessionLabel: liveProjection.projection?.session.session_id ?? scenarioId,
  });
  const garpHandoffContext = buildGarpHandoffContext({
    activeSkin: activeSkinTab,
    authorityState,
    disclosurePreviewReport,
  });
  const disclosurePreviewActionBundle = buildDisclosurePreviewActionBundle({
    garpHandoffContext,
    report: disclosurePreviewReport,
    roleSession,
  });
  const foremanGuideContext = buildForemanGuideContext({
    activePanel: activeForemanPanelId,
    authorityState,
    disclosurePreviewReport,
    garpHandoffContext,
    liveProjection: liveProjection.projection,
    roleSession,
    snapshot: {
      activePanel: activeForemanPanelId,
      activeSkin: activeSkinTab,
      currentStep,
      scenarioId,
      sessionId:
        selectedRecord?.status === "ready"
          ? `snapshot:${selectedRecord.entry.key}`
          : null,
      sourceRefs:
        selectedRecord?.status === "ready"
          ? [
              {
                evidence_id: scenarioId,
                label: "committed scenario snapshot",
                path: `dashboard/public/scenarios/${selectedRecord.entry.fileName}`,
                source_kind: "snapshot.file",
                source_ref: `snapshot.file:dashboard/public/scenarios/${selectedRecord.entry.fileName}`,
              },
            ]
          : [],
    },
  });
  const missionRailStages = buildMissionRailStages({
    activeStepIndex: controlState.activeStepIndex,
    authorityState,
    currentStep,
    dashboardMode,
    forensicChain: forensicChainView,
    liveProjection: liveProjection.projection,
    publicSkinView,
    totalSteps,
  });
  const holdWallView = buildHoldWallView({
    absenceLens: absenceLensView,
    authorityState,
    currentStep,
    forensicChain: forensicChainView,
    publicSkinView,
  });
  const auditWallView = buildDemoAuditWallView({
    roleSession,
    scenarioLabel: scenarioMeta.displayLabel,
    scenarioStatus: scenarioStatusLabel,
    timelineSteps,
  });
  const syncChoreography = buildSyncChoreographyView({
    authorityState,
    dashboardMode,
    forensicChain: forensicChainView,
    liveProjection: liveProjection.projection,
    sharedAuthority,
  });
  const vibrationStatus = useJudgeAuthorityRequestVibration({
    enabled: roleSession.role === "judge_demo_operator",
    signalId: syncChoreography.vibrationSignalId,
  });
  const missionPhysicalProjection = buildMissionPhysicalProjection({
    conductor_output: missionRuntime.conductorOutput,
    playback_state: missionRuntime.playbackState,
  });
  const rehearsalCertification = buildMissionRehearsalCertification({
    certificationId: `mission-rehearsal-${scenarioId}`,
    createdAt: "dashboard-local-rehearsal",
    surfaces: {
      absence_shadow_map:
        missionPhysicalProjection.absence_shadow_slots.length > 0,
      authority_handoff_theater:
        missionPhysicalProjection.authority_handoff.beats.length > 0,
      boundary_non_claim_posture:
        missionPhysicalProjection.boundary.demo_only &&
        missionPhysicalProjection.boundary.no_production_city_claim &&
        missionPhysicalProjection.boundary.no_root_forensic_chain_write_claim,
      civic_twin_diorama: Boolean(missionPhysicalProjection.diorama),
      current_decision_hold_focal_card: currentStep !== null,
      evidence_navigator: true,
      foreman_autonomous_conductor: true,
      foreman_autonomous_policy:
        FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.mode === "foreman_autonomous",
      foreman_mount_avatar_bay: true,
      forensic_receipt_ribbon: true,
      guided_policy: true,
      judge_touchboard: true,
      mission_control_physical_mode: true,
      mission_playback_controller: Boolean(missionRuntime.playbackState.runId),
      mission_rail: missionRailStages.length === MISSION_STAGE_IDS.length,
      mission_run_receipt_panel: true,
      permit_4471_anchor: true,
      presenter_cockpit: true,
      proof_spotlight: missionPhysicalProjection.spotlight.target_count > 0,
      proof_tools_disclosure: true,
      required_scenario_demo_data_posture:
        selectedRecord?.status === "ready" &&
        totalSteps > 0,
      reset_behavior: true,
    },
  });
  const selectedJudgeCard = getJudgeTouchboardCard(judgeInterrupt?.questionId);
  const missionCompletionReviewVisible =
    missionRuntime.playbackState.status === "completed" ||
    missionRuntime.playbackState.completedAtMs !== null;
  const engineerCockpitVisible =
    presentationMode === "engineer" || missionCompletionReviewVisible;

  function getMissionClockMs(playbackState: MissionPlaybackState): number {
    const lastEventAtMs = playbackState.events.at(-1)?.atMs;
    const lastKnownAtMs =
      lastEventAtMs ??
      playbackState.completedAtMs ??
      playbackState.pausedAtMs ??
      playbackState.stageEnteredAtMs ??
      playbackState.startedAtMs ??
      0;

    return lastKnownAtMs + 1;
  }

  function getMissionActiveStageId(
    playbackState: MissionPlaybackState
  ): MissionStageId {
    return playbackState.currentStageId ?? MISSION_STAGE_IDS[0];
  }

  function buildMissionSubstrateReadiness(): Partial<
    Record<MissionStageSubstrateKey, boolean>
  > {
    return {
      absence_lens: true,
      authority_panel: authorityState.status !== "unavailable",
      capture_snapshot: selectedRecord?.status === "ready",
      forensic_chain: true,
      governance_panel: currentStep !== null,
      public_disclosure: publicSkinView?.hasPayload === true,
    };
  }

  function buildMissionControllerReadiness(
    playbackState: MissionPlaybackState,
    stageId: MissionStageId,
    nowMs: number
  ): MissionControllerReadinessInput {
    return {
      activeStageId: stageId,
      foremanCue: {
        required: false,
        source: "d3.presenter.guided",
        status: "ready",
      },
      modeConsistent:
        playbackState.currentStageId === null ||
        playbackState.currentStageId === stageId,
      nowMs,
      presenterCockpitReady: true,
      proofCue: {
        required: false,
        source: "d3.presenter.guided.proof",
        status: "ready",
      },
      requiredHolds: [],
      resetCleanupOk: true,
      scenarioAvailable: selectedRecord?.status === "ready",
      substrate: buildMissionSubstrateReadiness(),
    };
  }

  function buildForemanConductorReadiness(
    playbackState: MissionPlaybackState
  ): ForemanConductorReadinessInput {
    return {
      modeConsistent: playbackState.mode === "foreman_autonomous",
      presenterCockpitReady: true,
      requiredHolds: [],
      resetCleanupOk: true,
      scenarioAvailable: selectedRecord?.status === "ready",
      substrate: buildMissionSubstrateReadiness(),
    };
  }

  function handleMissionModeChange(mode: MissionPlaybackMode) {
    setMissionRuntime((current) => {
      const nowMs = getMissionClockMs(current.playbackState);
      const playbackState = missionPlaybackReducer(current.playbackState, {
        mode,
        nowMs,
        type: "select_mode",
      });
      const modeChanged = playbackState.mode !== current.playbackState.mode;

      return {
        conductorOutput: modeChanged ? null : current.conductorOutput,
        conductorState: modeChanged
          ? createInitialForemanAutonomousConductorState(playbackState.runId)
          : current.conductorState,
        playbackState,
      };
    });
  }

  function handleMissionBegin() {
    setMissionRuntime((current) => {
      const nowMs = getMissionClockMs(current.playbackState);

      if (current.playbackState.mode === "foreman_autonomous") {
        const conductorOutput = runForemanAutonomousConductor({
          conductorState: current.conductorState,
          nowMs,
          playbackState: current.playbackState,
          readiness: buildForemanConductorReadiness(current.playbackState),
          resetCleanupVerified: true,
        });

        return {
          conductorOutput,
          conductorState: conductorOutput.conductorState,
          playbackState: conductorOutput.controllerState,
        };
      }

      const stageId = getMissionActiveStageId(current.playbackState);
      const playbackState = missionPlaybackReducer(current.playbackState, {
        nowMs,
        readiness: buildMissionControllerReadiness(
          current.playbackState,
          stageId,
          nowMs
        ),
        type: "begin_mission",
      });

      return {
        conductorOutput: null,
        conductorState: createInitialForemanAutonomousConductorState(
          playbackState.runId
        ),
        playbackState,
      };
    });
  }

  function handleMissionPause() {
    setMissionRuntime((current) => {
      const nowMs = getMissionClockMs(current.playbackState);
      const playbackState = missionPlaybackReducer(current.playbackState, {
        nowMs,
        type: "pause",
      });

      return {
        ...current,
        conductorOutput: current.conductorOutput
          ? {
              ...current.conductorOutput,
              controllerState: playbackState,
              status:
                playbackState.status === "paused"
                  ? "paused"
                  : current.conductorOutput.status,
            }
          : null,
        playbackState,
      };
    });
  }

  function handleMissionResume() {
    setMissionRuntime((current) => {
      const nowMs = getMissionClockMs(current.playbackState);
      const playbackState = missionPlaybackReducer(current.playbackState, {
        nowMs,
        type: "resume",
      });
      const conductorStatus =
        current.conductorOutput?.status === "paused"
          ? current.conductorOutput.cueEvent
            ? "cue_emitted"
            : "waiting"
          : current.conductorOutput?.status;

      return {
        ...current,
        conductorOutput: current.conductorOutput
          ? {
              ...current.conductorOutput,
              controllerState: playbackState,
              status: conductorStatus ?? current.conductorOutput.status,
            }
          : null,
        playbackState,
      };
    });
  }

  function handleMissionReset() {
    setJudgeInterrupt(null);
    setMissionRuntime((current) => {
      const nowMs = getMissionClockMs(current.playbackState);
      const playbackState = missionPlaybackReducer(current.playbackState, {
        cleanupOk: true,
        nowMs,
        type: "reset_mission",
      });

      return {
        conductorOutput: null,
        conductorState: createInitialForemanAutonomousConductorState(
          playbackState.runId
        ),
        playbackState,
      };
    });
  }

  function handleJudgeQuestionSelect(questionId: JudgeQuestionId) {
    const priorPlaybackState = missionRuntime.playbackState;

    setJudgeInterrupt({
      priorMode: judgeInterrupt?.priorMode ?? priorPlaybackState.mode,
      priorPlaybackStatus:
        judgeInterrupt?.priorPlaybackStatus ?? priorPlaybackState.status,
      priorStageId: judgeInterrupt?.priorStageId ?? priorPlaybackState.currentStageId,
      questionId,
    });

    setMissionRuntime((current) => {
      if (current.playbackState.status !== "running") {
        return current;
      }

      const nowMs = getMissionClockMs(current.playbackState);
      const playbackState = missionPlaybackReducer(current.playbackState, {
        nowMs,
        type: "pause",
      });

      return {
        ...current,
        conductorOutput: current.conductorOutput
          ? {
              ...current.conductorOutput,
              controllerState: playbackState,
              status:
                playbackState.status === "paused"
                  ? "paused"
                  : current.conductorOutput.status,
            }
          : null,
        playbackState,
      };
    });
  }

  function handleJudgeResumeMission() {
    const shouldResume = judgeInterrupt?.priorPlaybackStatus === "running";

    setJudgeInterrupt(null);

    if (!shouldResume) {
      return;
    }

    setMissionRuntime((current) => {
      if (current.playbackState.status !== "paused") {
        return current;
      }

      const nowMs = getMissionClockMs(current.playbackState);
      const playbackState = missionPlaybackReducer(current.playbackState, {
        nowMs,
        type: "resume",
      });
      const conductorStatus =
        current.conductorOutput?.status === "paused"
          ? current.conductorOutput.cueEvent
            ? "cue_emitted"
            : "waiting"
          : current.conductorOutput?.status;

      return {
        ...current,
        conductorOutput: current.conductorOutput
          ? {
              ...current.conductorOutput,
              controllerState: playbackState,
              status: conductorStatus ?? current.conductorOutput.status,
            }
          : null,
        playbackState,
      };
    });
  }

  function handleJudgeResetForNextJudge() {
    setJudgeInterrupt(null);
    handleMissionReset();
  }

  function handleResetToKnownCleanState() {
    setControlState(
      createInitialControlRoomState(records[0]?.entry.key ?? "routine")
    );
    setDashboardMode("snapshot");
    setDirectorModeEnabled(false);
    setAuditWallOpen(false);
    setMissionAbsenceLensEnabled(false);
    setMissionPhysicalModeEnabled(false);
    setHoldWallOpen(false);
    setJudgeInterrupt(null);
    setForemanHighlightedPanelId(null);
    setMissionRuntime(() => {
      const playbackState = createInitialMissionPlaybackState("guided");

      return {
        conductorOutput: null,
        conductorState: createInitialForemanAutonomousConductorState(
          playbackState.runId
        ),
        playbackState,
      };
    });
    setPresentationMode("mission");
    void sharedAuthority.resetRequests();
  }

  useEffect(() => {
    if (controlState.playbackState !== "playing" || totalSteps === 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setControlState((current) => advancePlayback(current, totalSteps));
    }, PLAYBACK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [controlState.playbackState, totalSteps, controlState.selectedScenarioKey]);

  useEffect(() => {
    if (controlState.activeSkinTab === roleSession.active_skin) {
      return;
    }

    setControlState((current) =>
      current.activeSkinTab === roleSession.active_skin
        ? current
        : selectSkinTab(current, roleSession.active_skin)
    );
  }, [controlState.activeSkinTab, roleSession.active_skin]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        shouldIgnoreDemoShortcutTarget(event.target)
      ) {
        return;
      }

      const selectedShortcutScenario = resolveScenarioShortcutKey(event.key);
      if (selectedShortcutScenario) {
        event.preventDefault();
        setControlState((current) =>
          current.selectedScenarioKey === selectedShortcutScenario
            ? current
            : selectScenario(current, selectedShortcutScenario)
        );
        return;
      }

      const selectedShortcutSkin = resolveSkinShortcutKey(event.key);
      if (selectedShortcutSkin) {
        event.preventDefault();
        if (!roleSession.allowed_skins.includes(selectedShortcutSkin)) {
          return;
        }
        setControlState((current) =>
          current.activeSkinTab === selectedShortcutSkin
            ? current
            : selectSkinTab(current, selectedShortcutSkin)
        );
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setControlState((current) =>
          goToPreviousStep(
            current,
            getScenarioStepCount(getScenarioRecord(records, current.selectedScenarioKey))
          )
        );
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setControlState((current) =>
          goToNextStep(
            current,
            getScenarioStepCount(getScenarioRecord(records, current.selectedScenarioKey))
          )
        );
        return;
      }

      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        setControlState((current) => {
          const currentTotalSteps = getScenarioStepCount(
            getScenarioRecord(records, current.selectedScenarioKey)
          );

          return current.playbackState === "playing"
            ? pausePlayback(current)
            : startPlayback(current, currentTotalSteps);
        });
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        setControlState((current) => resetControlRoom(current));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [records, roleSession.allowed_skins]);

  useEffect(() => {
    if (!foremanHighlightedPanelId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setForemanHighlightedPanelId(null);
    }, 4200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [foremanHighlightedPanelId]);

  return (
    <section
      className="control-room-shell control-room-shell--projector"
      data-mission-review-mode={
        missionCompletionReviewVisible ? "visible" : "hidden"
      }
      data-presentation-mode={presentationMode}
      data-responsive-shell="projector-safe"
    >
      <MissionPresentationShell
        absenceLens={absenceLensView}
        absenceLensEnabled={missionAbsenceLensEnabled}
        activeSkinLabel={activeSkinLabel}
        activeStepLabel={activeStepLabel}
        auditWallOpen={auditWallOpen}
        auditWallView={auditWallView}
        authorityState={authorityState}
        canDrive={selectedRecord?.status === "ready"}
        currentStep={currentStep}
        dashboardMode={dashboardMode}
        dataVersion={dataVersion}
        engineerMode={presentationMode === "engineer"}
        errorCount={errorCount}
        forensicChain={forensicChainView}
        holdWallOpen={holdWallOpen}
        holdWallView={holdWallView}
        judgeCard={selectedJudgeCard}
        judgeInterruptStatus={
          judgeInterrupt
            ? missionRuntime.playbackState.status === "paused"
              ? "paused"
              : "interrupted"
            : "idle"
        }
        missionPhysicalModeEnabled={missionPhysicalModeEnabled}
        missionPhysicalProjection={missionPhysicalProjection}
        missionPlaybackControls={{
          canStart: selectedRecord?.status === "ready",
          conductorOutput: missionRuntime.conductorOutput,
          onBeginMission: handleMissionBegin,
          onModeChange: handleMissionModeChange,
          onPauseMission: handleMissionPause,
          onResetMission: handleMissionReset,
          onResumeMission: handleMissionResume,
          playbackState: missionRuntime.playbackState,
        }}
        missionRailStages={missionRailStages}
        rehearsalCertification={rehearsalCertification}
        onDirectorModeOpen={() => {
          setPresentationMode("engineer");
          setDirectorModeEnabled(true);
        }}
        onAbsenceLensToggle={() =>
          setMissionAbsenceLensEnabled((current) => !current)
        }
        onAuditWallDismiss={() => setAuditWallOpen(false)}
        onAuditWallOpen={() => setAuditWallOpen(true)}
        onEngineerModeChange={(enabled) =>
          setPresentationMode(enabled ? "engineer" : "mission")
        }
        onHoldWallDismiss={() => setHoldWallOpen(false)}
        onHoldWallOpen={() => {
          if (holdWallView.triggered) {
            setHoldWallOpen(true);
          }
        }}
        onMissionPhysicalModeChange={setMissionPhysicalModeEnabled}
        onJudgeResetForNextJudge={handleJudgeResetForNextJudge}
        onJudgeResumeMission={handleJudgeResumeMission}
        onJudgeSelectQuestion={handleJudgeQuestionSelect}
        onNextStep={() =>
          setControlState((current) => goToNextStep(current, totalSteps))
        }
        onPausePlayback={() => setControlState((current) => pausePlayback(current))}
        onPlayPlayback={() =>
          setControlState((current) => startPlayback(current, totalSteps))
        }
        onPreviousStep={() =>
          setControlState((current) => goToPreviousStep(current, totalSteps))
        }
        onResetStep={() => setControlState((current) => resetControlRoom(current))}
        playbackState={controlState.playbackState}
        publicSkinView={publicSkinView}
        readyCount={readyCount}
        roleSession={roleSession}
        scenarioDescription={scenarioMeta.description}
        scenarioLabel={scenarioMeta.displayLabel}
        scenarioStatus={scenarioStatusLabel}
        sharedEndpointStatus={sharedAuthority.endpointStatus}
        syncChoreography={syncChoreography}
        totalSteps={totalSteps}
        vibrationStatus={vibrationStatus}
      />

      <div
        className={`engineer-cockpit${
          missionCompletionReviewVisible ? " engineer-cockpit--review" : ""
        }`}
        data-engineer-cockpit={
          engineerCockpitVisible
            ? missionCompletionReviewVisible
              ? "review"
              : "visible"
            : "hidden"
        }
        data-mission-review-surface={
          missionCompletionReviewVisible ? "technical-stack" : undefined
        }
        hidden={!engineerCockpitVisible}
      >
        {missionCompletionReviewVisible ? (
          <section
            className="mission-review-banner mission-review-banner--technical"
            data-mission-review-banner="technical-stack"
          >
            <div>
              <p className="mission-review-banner__eyebrow">Technical inspection</p>
              <h2>Full proof cockpit visible after mission completion.</h2>
              <p>
                Existing presenter, authority, disclosure, Foreman, absence,
                governance, skin, and chain surfaces are open for review.
              </p>
            </div>
            <dl>
              <div>
                <dt>Playback source</dt>
                <dd>{missionRuntime.playbackState.status}</dd>
              </div>
              <div>
                <dt>Completion timestamp</dt>
                <dd>{missionRuntime.playbackState.completedAtMs ?? "pending"}</dd>
              </div>
              <div>
                <dt>Surface rule</dt>
                <dd>no new review state</dd>
              </div>
            </dl>
          </section>
        ) : null}

        <DemoHeader
          activeOutcome={currentStep?.decision ?? null}
          activeSkinLabel={activeSkinLabel}
          activeStepLabel={activeStepLabel}
          dataVersion={dataVersion}
          scenarioDescription={scenarioMeta.description}
          scenarioLabel={scenarioMeta.displayLabel}
          scenarioStatus={scenarioStatusLabel}
        />

        <LiveModeToggle mode={dashboardMode} onModeChange={setDashboardMode} />

        <RoleSessionPanel auth={authState} roleSession={roleSession} />

        <div className="control-room-toolbar">
        <ScenarioSelector
          records={records}
          selectedScenarioKey={controlState.selectedScenarioKey}
          onSelect={(scenarioKey) =>
            setControlState((current) => selectScenario(current, scenarioKey))
          }
        />

        <div className="control-room-driver-stack">
          <PlaybackControls
            activeStepIndex={controlState.activeStepIndex}
            canInteract={selectedRecord?.status === "ready"}
            isPlaying={controlState.playbackState === "playing"}
            onNext={() =>
              setControlState((current) => goToNextStep(current, totalSteps))
            }
            onPause={() => setControlState((current) => pausePlayback(current))}
            onPlay={() =>
              setControlState((current) => startPlayback(current, totalSteps))
            }
            onPrevious={() =>
              setControlState((current) => goToPreviousStep(current, totalSteps))
            }
            onReset={() => setControlState((current) => resetControlRoom(current))}
            totalSteps={totalSteps}
          />

          <KeyboardShortcutsHelp />

          <DemoReliabilityPanel
            onResetToKnownCleanState={handleResetToKnownCleanState}
            sharedEndpointStatus={sharedAuthority.endpointStatus}
          />
        </div>
      </div>

      <DirectorModeToggle
        bookmarks={directorBookmarks}
        enabled={directorModeEnabled}
        onSelectBookmark={(bookmark) =>
          setControlState((current) => selectStep(current, bookmark.stepIndex, totalSteps))
        }
        onToggle={() => setDirectorModeEnabled((current) => !current)}
        selectedBookmarkId={directorScene.activeBookmark?.id ?? null}
      />

      {dashboardMode === "live" ? (
        <div className="live-mode-grid" data-live-mode="enabled">
          <LiveConnectionBanner
            holdMessage={liveProjection.holdMessage}
            loading={liveProjection.loading}
            onRefresh={() => {
              void liveProjection.refresh();
            }}
            status={liveProjection.connectionStatus}
          />

          {liveProjection.projection ? (
            <>
              <LiveEventRail
                events={liveProjection.projection.events}
                foremanHighlighted={foremanHighlightedPanelId === "live-event-rail"}
              />
              <LiveCapturePanel projection={liveProjection.projection} />
            </>
          ) : null}
        </div>
      ) : null}

      <ForemanMountPoint
        eventBinding={{
          activePanelId: activeForemanPanelId,
          activeScenarioId: scenarioId,
          activeSkin: activeSkinTab,
          activeStepId: currentStep?.stepId ?? null,
          createdAt:
            liveProjection.projection?.session.updated_at ?? "dashboard-local",
          disclosurePreviewReport,
          liveEvents: liveProjection.projection?.events ?? [],
          roleSession,
          sharedAuthority,
        }}
        foremanContextSeed={liveProjection.projection?.foreman_context_seed ?? null}
        guideContext={foremanGuideContext}
        highlightedPanelId={foremanHighlightedPanelId}
        onPanelHighlightChange={setForemanHighlightedPanelId}
      />

      {directorModeEnabled ? (
        <>
          <div className="director-grid">
            <DirectorCueCard cue={directorScene.cueCard} />
            <JudgeCuePanel panel={directorScene.judgePanel} />
            <PreventedActionCard card={directorScene.preventedAction} />
          </div>

          <AbsenceSignalRail
            familyStates={absenceLensView.familyStates}
            signals={absenceLensView.signals}
          />
        </>
      ) : null}

      <div className="packet4-grid" data-authority-cockpit="true">
        <div className="packet4-sidecar">
          <GARPStatusIndicator
            foremanHighlighted={foremanHighlightedPanelId === "garp-status"}
            sharedAuthority={sharedAuthority}
            state={authorityState}
          />
          <AuthorityResolutionPanel
            foremanHighlighted={foremanHighlightedPanelId === "authority-resolution"}
            sharedAuthority={sharedAuthority}
            state={authorityState}
          />
        </div>

        <div className="packet4-sidecar">
          <AuthorityTimeline
            foremanHighlighted={foremanHighlightedPanelId === "authority-timeline"}
            sharedAuthority={sharedAuthority}
            state={authorityState}
          />
          <AuthorityNotificationDemo state={authorityState} />
          <DisclosurePreviewPanel
            actionBundle={disclosurePreviewActionBundle}
            foremanHighlighted={foremanHighlightedPanelId === "disclosure-preview"}
            report={disclosurePreviewReport}
          />
        </div>
      </div>

      <div className="control-room-grid">
        <TimelinePanel
          activeStepIndex={controlState.activeStepIndex}
          message={getShellMessage(selectedRecord)}
          onSelectStep={(index) =>
            setControlState((current) => selectStep(current, index, totalSteps))
          }
          status={selectedRecord?.status ?? "loading"}
          timelineSteps={timelineSteps}
        />

        <div className="control-room-detail">
          <AbsenceLensOverlay
            active={directorModeEnabled}
            highlights={absenceLensView.highlights}
            panel="governance"
          >
            <GovernanceStatePanel
              currentStep={currentStep}
              message={getShellMessage(selectedRecord)}
              status={selectedRecord?.status ?? "loading"}
            />
          </AbsenceLensOverlay>

          <SkinSwitcher
            activeSkinTab={activeSkinTab}
            allowedSkins={roleSession.allowed_skins}
            message={getShellMessage(selectedRecord)}
            onSelect={(skinKey) => {
              if (roleSession.allowed_skins.includes(skinKey)) {
                setControlState((current) => selectSkinTab(current, skinKey));
              }
            }}
            status={selectedRecord?.status ?? "loading"}
            views={skinViews}
          />

          <AbsenceLensOverlay
            active={directorModeEnabled}
            highlights={absenceLensView.highlights}
            panel="skin"
          >
            <SkinPanel
              activeStepLabel={activeStepLabel}
              message={getShellMessage(selectedRecord)}
              skinView={activeSkinView}
              status={selectedRecord?.status ?? "loading"}
            />
          </AbsenceLensOverlay>
        </div>
      </div>

      <div className="packet4-grid">
        <AbsenceLensOverlay
          active={directorModeEnabled}
          highlights={absenceLensView.highlights}
          panel="forensic"
        >
          <ForensicChainPanel
            chainView={forensicChainView}
            message={getShellMessage(selectedRecord)}
            status={selectedRecord?.status ?? "loading"}
          />
        </AbsenceLensOverlay>

        <div className="packet4-sidecar">
          <AbsenceLensOverlay
            active={directorModeEnabled}
            highlights={absenceLensView.highlights}
            panel="relationships"
          >
            <div className="absence-overlay__stack">
              <EntityRelationshipStrip
                message={getShellMessage(selectedRecord)}
                status={selectedRecord?.status ?? "loading"}
                view={entityRelationshipView}
              />

              <EntityRelationshipGraph
                message={getShellMessage(selectedRecord)}
                status={selectedRecord?.status ?? "loading"}
                view={entityRelationshipView}
              />
            </div>
          </AbsenceLensOverlay>

          <AbsenceLensOverlay
            active={directorModeEnabled}
            highlights={absenceLensView.highlights}
            panel="choreography"
          >
            <CascadeChoreography
              message={getShellMessage(selectedRecord)}
              status={selectedRecord?.status ?? "loading"}
              view={choreographyView}
            />
          </AbsenceLensOverlay>
        </div>
      </div>

      <StatusBar
        activeOutcome={currentStep?.decision ?? null}
        activeSkinLabel={activeSkinLabel}
        activeStepLabel={activeStepLabel}
        dataVersion={dataVersion}
        scenarioId={scenarioId}
      />
      </div>
    </section>
  );
}
