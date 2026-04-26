import { useEffect, useState } from "react";
import { adaptAbsenceSignals } from "../adapters/absenceSignalAdapter.ts";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
} from "../adapters/skinPayloadAdapter.ts";
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
import { getDemoScenarioMeta } from "../demo/demoScenarios.ts";
import { CascadeChoreography } from "./CascadeChoreography.tsx";
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
import { PlaybackControls } from "./PlaybackControls.tsx";
import { RoleSessionPanel } from "./RoleSessionPanel.tsx";
import { ScenarioSelector } from "./ScenarioSelector.tsx";
import { SkinPanel } from "./SkinPanel.tsx";
import { SkinSwitcher } from "./SkinSwitcher.tsx";
import { StatusBar } from "./StatusBar.tsx";
import { TimelinePanel } from "./TimelinePanel.tsx";
import { AbsenceLensOverlay } from "./director/AbsenceLensOverlay.tsx";
import { AbsenceSignalRail } from "./director/AbsenceSignalRail.tsx";
import { DirectorCueCard } from "./director/DirectorCueCard.tsx";
import { DirectorModeToggle } from "./director/DirectorModeToggle.tsx";
import { JudgeCuePanel } from "./director/JudgeCuePanel.tsx";
import { PreventedActionCard } from "./director/PreventedActionCard.tsx";
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

export interface ControlRoomShellProps {
  initialControlState?: Partial<ControlRoomState>;
  initialDashboardMode?: DashboardMode;
  initialDirectorModeEnabled?: boolean;
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
  const scenarioMeta = getDemoScenarioMeta(controlState.selectedScenarioKey);
  const activeStepLabel = currentStep
    ? `${currentStep.stepId} (${currentStep.index + 1}/${timelineSteps.length})`
    : totalSteps > 0
      ? `${controlState.activeStepIndex + 1}/${totalSteps}`
      : "Unavailable";
  const activeSkinLabel =
    activeSkinView?.label ?? formatSkinLabel(activeSkinTab);

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

  return (
    <section
      className="control-room-shell control-room-shell--projector"
      data-responsive-shell="projector-safe"
    >
      <DemoHeader
        activeOutcome={currentStep?.decision ?? null}
        activeSkinLabel={activeSkinLabel}
        activeStepLabel={activeStepLabel}
        dataVersion={dataVersion}
        scenarioDescription={scenarioMeta.description}
        scenarioLabel={scenarioMeta.displayLabel}
        scenarioStatus={getScenarioStatusLabel(selectedRecord)}
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
              <LiveEventRail events={liveProjection.projection.events} />
              <LiveCapturePanel projection={liveProjection.projection} />
              <ForemanMountPoint
                foremanContextSeed={liveProjection.projection.foreman_context_seed}
              />
            </>
          ) : null}
        </div>
      ) : null}

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
    </section>
  );
}
