import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { adaptAbsenceSignals } from "../src/adapters/absenceSignalAdapter.ts";
import { adaptForensicChain } from "../src/adapters/forensicAdapter.ts";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
} from "../src/adapters/skinPayloadAdapter.ts";
import { buildAuthorityDashboardState } from "../src/authority/authorityStateAdapter.ts";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { DecisionCounter } from "../src/components/DecisionCounter.tsx";
import { DemoAuditWall } from "../src/components/DemoAuditWall.tsx";
import { HoldWall } from "../src/components/HoldWall.tsx";
import {
  MissionPresentationShell,
  type MissionPresentationShellProps,
} from "../src/components/MissionPresentationShell.tsx";
import { MissionRail } from "../src/components/MissionRail.tsx";
import {
  buildDecisionCounter,
  buildDemoAuditWallView,
} from "../src/demo/demoAudit.ts";
import { fictionalPermitAnchor } from "../src/demo/fictionalPermitAnchor.ts";
import {
  buildHoldWallView,
  HOLD_WALL_SILENCE_BEAT_MS,
} from "../src/demo/holdWall.ts";
import { getJudgeTouchboardCard } from "../src/demo/judgeTouchboardDeck.ts";
import { buildMissionAbsenceLensOverlay } from "../src/demo/missionAbsenceLens.ts";
import {
  createInitialMissionPlaybackState,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import { buildMissionPhysicalProjection } from "../src/demo/missionPhysicalProjection.ts";
import { MISSION_STAGE_IDS, type MissionStageId } from "../src/demo/missionPlaybackPlan.ts";
import {
  buildMissionRailStages,
  MISSION_RAIL_LABELS,
} from "../src/demo/missionRail.ts";
import { getMissionActNarration } from "../src/foremanGuide/missionNarration.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import {
  createTestLiveEvent,
  createTestLiveProjection,
  loadAllScenarioRecords,
  loadScenarioRecord,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

function createPublicRoleSession(): DashboardRoleSessionProofV1 {
  return {
    active_skin: "public",
    allowed_skins: ["public"],
    auth_status: "unauthenticated",
    contract: ROLE_SESSION_PROOF_CONTRACT,
    department: null,
    display_name: null,
    holds: [],
    role: "public",
    source: "public_default",
    subject_ref: null,
  };
}

function collectButtons(node: React.ReactNode): React.ReactElement[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const children = React.Children.toArray(
    (node.props as { children?: React.ReactNode }).children
  );
  const nested = children.flatMap((child) => collectButtons(child));

  return node.type === "button" ? [node, ...nested] : nested;
}

function getElementText(element: React.ReactElement): string {
  return React.Children.toArray(
    (element.props as { children?: React.ReactNode }).children
  ).join("");
}

async function buildSnapshotMissionFixture(activeStepIndex = 0) {
  const record = await loadScenarioRecord("contested");
  const timelineSteps = buildTimelineSteps(record.scenario);
  const currentStep = timelineSteps[activeStepIndex] ?? null;

  assert.ok(currentStep);

  const forensicChain = adaptForensicChain(timelineSteps, activeStepIndex);
  const skinViews = adaptStepSkinPayloads(currentStep.step);
  const publicSkinView = getDashboardSkinView(skinViews, "public") ?? null;
  const absenceLens = adaptAbsenceSignals({
    activeSkinView: publicSkinView,
    currentStep,
    forensicChain,
    skinViews,
  });
  const roleSession = createPublicRoleSession();
  const authorityState = buildAuthorityDashboardState({
    currentStep,
    liveProjection: null,
    roleSession,
  });
  const holdWallView = buildHoldWallView({
    absenceLens,
    authorityState,
    currentStep,
    forensicChain,
    publicSkinView,
  });
  const missionRailStages = buildMissionRailStages({
    activeStepIndex,
    authorityState,
    currentStep,
    dashboardMode: "snapshot",
    forensicChain,
    liveProjection: null,
    publicSkinView,
    totalSteps: timelineSteps.length,
  });
  const auditWallView = buildDemoAuditWallView({
    roleSession,
    scenarioLabel: "Contested authority",
    scenarioStatus: record.scenario.status,
    timelineSteps,
  });

  return {
    absenceLens,
    absenceLensEnabled: false,
    activeSkinLabel: publicSkinView?.label ?? "Public",
    activeStepLabel: `${currentStep.stepId} (${activeStepIndex + 1}/${timelineSteps.length})`,
    auditWallOpen: false,
    auditWallView,
    authorityState,
    currentStep,
    dashboardMode: "snapshot" as const,
    dataVersion: record.payload.contractVersion,
    errorCount: 0,
    forensicChain,
    holdWallOpen: false,
    holdWallView,
    missionRailStages,
    onAbsenceLensToggle: () => undefined,
    onAuditWallDismiss: () => undefined,
    onAuditWallOpen: () => undefined,
    onHoldWallDismiss: () => undefined,
    onHoldWallOpen: () => undefined,
    publicSkinView,
    readyCount: 3,
    roleSession,
    scenarioDescription: "Contested authority fixture.",
    scenarioLabel: "Contested authority",
    scenarioStatus: record.scenario.status,
    syncChoreography: {
      animate: false,
      detail: "Existing forensic chain entries are visible on the main screen.",
      directorApprovalPulse: false,
      label: "Snapshot aligned",
      pulse: "idle" as const,
      sourceRef: "forensicChain.totalEntryCount",
      vibrationSignalId: null,
    },
    totalSteps: timelineSteps.length,
    vibrationStatus: {
      reason: "No authority request signal is active.",
      signalId: null,
      status: "idle" as const,
    },
  };
}

function createRunningMissionPlaybackState(
  stageId: MissionStageId,
  runId = "mission-run-f1"
): MissionPlaybackState {
  return {
    ...createInitialMissionPlaybackState("guided"),
    currentStageId: stageId,
    events: [
      {
        atMs: 1,
        eventId: `${runId}:1:stage_enter:${stageId}`,
        runId,
        stageId,
        type: "stage_enter",
      },
    ],
    runId,
    stageEnteredAtMs: 1,
    startedAtMs: 1,
    status: "running",
  };
}

function createCompletedMissionPlaybackState(): MissionPlaybackState {
  const runId = "mission-run-review";

  return {
    ...createInitialMissionPlaybackState("guided"),
    completedAtMs: 12,
    completedStageIds: [...MISSION_STAGE_IDS],
    events: [
      {
        atMs: 12,
        eventId: `${runId}:1:mission_complete:mission`,
        runId,
        stageId: null,
        type: "mission_complete",
      },
    ],
    runId,
    startedAtMs: 1,
    status: "completed",
  };
}

async function renderMissionShellWithPlayback(
  playbackState: MissionPlaybackState,
  overrides: Partial<MissionPresentationShellProps> = {}
) {
  const props = await buildSnapshotMissionFixture();

  return MissionPresentationShell({
    ...props,
    engineerMode: false,
    missionPhysicalProjection: buildMissionPhysicalProjection({
      playback_state: playbackState,
    }),
    missionPlaybackControls: {
      canStart: true,
      onBeginMission: () => undefined,
      onModeChange: () => undefined,
      onPauseMission: () => undefined,
      onResetMission: () => undefined,
      onResumeMission: () => undefined,
      playbackState,
    },
    onEngineerModeChange: () => undefined,
    onMissionAdvance: () => undefined,
    ...overrides,
  });
}

const tests = [
  {
    name: "Presenter View is the default and Engineer Mode keeps the cockpit behind it",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-presentation-mode="mission"'), true);
      assert.equal(markup.includes('data-mission-presentation="active"'), true);
      assert.equal(markup.includes('data-presenter-view-default="true"'), true);
      assert.equal(markup.includes('data-mission-control-physical-mode="off"'), true);
      assert.equal(markup.includes('data-mission-physical-toggle="true"'), true);
      assert.equal(markup.includes('data-engineer-cockpit="hidden"'), true);
      assert.equal(markup.includes("Presenter Cockpit"), true);
      assert.equal(markup.includes("Proof Tools"), true);
      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes('data-current-decision-card="true"'), true);
      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes('data-absence-shadow-map="true"'), true);
      assert.equal(markup.includes('data-authority-handoff-theater="true"'), true);
      assert.equal(markup.includes('data-civic-twin-diorama="true"'), true);
      assert.equal(markup.includes('data-forensic-receipt-ribbon="true"'), true);
      assert.equal(markup.includes('data-mission-run-receipt-panel="true"'), true);
      assert.equal(markup.includes('data-mission-rehearsal-panel="operator-proof"'), true);
      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes('data-judge-touchboard="true"'), true);
      assert.equal(markup.includes('data-mission-evidence-navigator="true"'), true);
      assert.equal(markup.includes("Civic Twin Diorama"), true);
      assert.equal(markup.includes("Evidence Beam"), true);
      assert.equal(markup.includes("Authority Handoff Theater"), true);
      assert.equal(markup.includes("Absence Shadow Map"), true);
      assert.equal(markup.includes("Foreman Avatar Bay"), true);
      assert.equal(markup.includes("Judge Touchboard"), true);
      assert.equal(markup.includes("Evidence Navigator"), true);
      assert.equal(markup.includes("Forensic Receipt Ribbon"), true);
      assert.equal(markup.includes("Mission Run Receipt"), true);
      assert.equal(markup.includes("Rehearsal Certification"), true);
      assert.equal(markup.includes("Engineer Mode"), true);
      assert.equal(markup.includes("Local demo control room"), true);
    },
  },
  {
    name: "Engineer Mode reveals the existing cockpit/default dashboard",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(
        <ControlRoomShell records={records} initialPresentationMode="engineer" />
      );

      assert.equal(markup.includes('data-presentation-mode="engineer"'), true);
      assert.equal(markup.includes('data-engineer-cockpit="visible"'), true);
      assert.equal(markup.includes("Presenter View"), true);
      assert.equal(markup.includes("Local demo control room"), true);
      assert.equal(markup.includes("Snapshot remains the default stable path"), true);
    },
  },
  {
    name: "active mission mode renders one line one focal card rail compact Foreman and mission controls",
    run: async () => {
      const playbackState = createRunningMissionPlaybackState("capture");
      const element = await renderMissionShellWithPlayback(playbackState);
      const markup = renderMarkup(element);
      const visibleButtons = collectButtons(element).filter(
        (button) =>
          String(button.props.className ?? "").includes(
            "mission-primary-actions__button"
          ) && button.props["aria-hidden"] !== true
      );

      assert.equal(markup.includes('data-mission-active-walkthrough="true"'), true);
      assert.equal(markup.includes('data-mission-rail="true"'), true);
      assert.equal(markup.includes('data-mission-compact-foreman="true"'), true);
      assert.equal(
        [...markup.matchAll(/data-mission-active-foreman-line="true"/g)].length,
        1
      );
      assert.equal([...markup.matchAll(/data-mission-focal-card="/g)].length, 1);
      assert.equal(markup.includes(getMissionActNarration("capture").line), true);
      assert.deepEqual(visibleButtons.map((button) => getElementText(button)), [
        "Previous Act",
        "Next Act",
        "Reset",
      ]);
      assert.equal(visibleButtons[0]?.props.disabled, true);
      assert.equal(visibleButtons[1]?.props.disabled, true);
      assert.equal(visibleButtons[2]?.props.disabled, false);
    },
  },
  {
    name: "active mission mode exposes previous act and reset navigation",
    run: async () => {
      const playbackState = createRunningMissionPlaybackState("authority");
      const calls: string[] = [];
      const element = await renderMissionShellWithPlayback(playbackState, {
        onMissionBack: () => calls.push("back"),
      });
      const visibleButtons = collectButtons(element).filter(
        (button) =>
          String(button.props.className ?? "").includes(
            "mission-primary-actions__button"
          ) && button.props["aria-hidden"] !== true
      );
      const previous = visibleButtons.find(
        (button) => getElementText(button) === "Previous Act"
      );
      const reset = visibleButtons.find((button) => getElementText(button) === "Reset");

      assert.equal(previous?.props.disabled, false);
      previous?.props.onClick?.();
      assert.deepEqual(calls, ["back"]);
      assert.equal(reset?.props.disabled, false);
      assert.equal(typeof reset?.props.onClick, "function");
    },
  },
  {
    name: "active mission mode keeps proof cockpit mounted but hidden from judge view",
    run: async () => {
      const playbackState = createRunningMissionPlaybackState("capture");
      const markup = renderMarkup(await renderMissionShellWithPlayback(playbackState));

      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes('data-absence-shadow-map="true"'), true);
      assert.equal(markup.includes('data-authority-handoff-theater="true"'), true);
      assert.equal(markup.includes('data-mission-run-receipt-panel="true"'), true);
      assert.equal(
        markup.includes(
          'class="mission-surface mission-surface--capture is-active" aria-hidden="true" data-mission-act-state="active" data-mission-act-wrapper="capture"'
        ),
        true
      );
      assert.equal(
        markup.includes(
          'aria-hidden="true" class="mission-surface mission-surface--presenter" data-mission-surface="presenter"'
        ),
        true
      );
    },
  },
  {
    name: "active mission mode hides debug labels source refs and secondary controls from judge-facing surface",
    run: async () => {
      const playbackState = createRunningMissionPlaybackState("authority");
      const element = await renderMissionShellWithPlayback(playbackState);
      const markup = renderMarkup(element);
      const activeStart = markup.indexOf('data-mission-active-walkthrough="true"');
      const reviewStart = markup.indexOf('data-mission-review-banner="completion"', activeStart);
      const activeMarkup = markup.slice(activeStart, reviewStart);
      const styles = await readFile("src/styles.css", "utf8");
      const hiddenButtons = collectButtons(element).filter(
        (button) => button.props["aria-hidden"] === true
      );

      assert.notEqual(activeStart, -1);
      assert.notEqual(reviewStart, -1);
      for (const forbidden of [
        "Presenter Cockpit",
        "GUIDED MISSION",
        "WALK",
        "OPERATOR-GUIDED",
        "REDUCED MOTION SAFE",
        "Proof Spotlight",
        "Evidence Beam",
        "source_ref",
        "fallback",
        "ATTENTION TARGET",
        "mission-run-1",
        "current_focal_card",
        "EXISTING MISSION PLAYBACK STATE",
        "AWAITING MISSION PLAYBACK",
        "PROOF AVAILABLE NEXT",
      ]) {
        assert.equal(activeMarkup.includes(forbidden), false, forbidden);
      }
      assert.equal(
        styles.includes(
          ".mission-primary-actions--active-walkthrough .mission-primary-actions__button--secondary"
        ),
        true
      );
      assert.equal(
        styles.includes(
          ".mission-presentation--active-walkthrough .mission-rail__state"
        ),
        true
      );
      assert.equal(hiddenButtons.length, 2);
    },
  },
  {
    name: "Act 4 renders HOLD focal card before absence narration appears",
    run: async () => {
      const playbackState = createRunningMissionPlaybackState("absence");
      const markup = renderMarkup(await renderMissionShellWithPlayback(playbackState));
      const activeStart = markup.indexOf('data-mission-active-walkthrough="true"');
      const reviewStart = markup.indexOf('data-mission-review-banner="completion"', activeStart);
      const activeMarkup = markup.slice(activeStart, reviewStart);

      assert.equal(markup.includes('data-mission-focal-card="absence"'), true);
      assert.equal(markup.includes("Missing evidence boundary"), true);
      assert.equal(activeMarkup.includes('data-mission-narration-phase="speaking"'), false);
      assert.equal(activeMarkup.includes(getMissionActNarration("absence").line), false);
    },
  },
  {
    name: "Review Mode restores full cockpit after mission completion",
    run: async () => {
      const playbackState = createCompletedMissionPlaybackState();
      const element = await renderMissionShellWithPlayback(playbackState, {
        onMissionRestart: () => undefined,
      });
      const markup = renderMarkup(element);
      const visibleButtons = collectButtons(element).filter(
        (button) =>
          String(button.props.className ?? "").includes(
            "mission-primary-actions__button"
          ) && button.props["aria-hidden"] !== true
      );
      const completionAccordionStart = markup.indexOf(
        'data-mission-review-accordion="mission-complete-summary"'
      );
      const completionAccordionSnippet = markup.slice(
        Math.max(0, completionAccordionStart - 120),
        completionAccordionStart + 220
      );

      assert.equal(markup.includes('data-mission-review-mode="visible"'), true);
      assert.equal(markup.includes("Review Mode: full governed chain visible"), true);
      assert.equal(
        markup.includes("Review Mode: the full cockpit is preserved below."),
        true
      );
      assert.equal(markup.includes("inspect the proof."), true);
      assert.equal(markup.includes("Mission Run"), true);
      assert.equal(markup.includes("Proof and Evidence"), true);
      assert.equal(markup.includes("Authority and Public Boundary"), true);
      assert.equal(markup.includes("Foreman and Judge Controls"), true);
      assert.equal(markup.includes("Engineering / Demo Controls"), true);
      assert.notEqual(completionAccordionStart, -1);
      assert.equal(completionAccordionSnippet.includes(" open"), false);
      assert.equal(markup.includes('data-mission-active-walkthrough="true"'), false);
      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes('data-mission-playback-controls="started"'), true);
      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes('data-mission-run-receipt-panel="true"'), true);
      assert.equal(
        visibleButtons.some((button) => getElementText(button) === "Run Again"),
        true
      );
      assert.equal(
        visibleButtons.some((button) => getElementText(button) === "Reset"),
        true
      );
    },
  },
  {
    name: "mission shell mounts judge card navigator and keeps Proof Tools grouped",
    run: async () => {
      const props = await buildSnapshotMissionFixture();
      const card = getJudgeTouchboardCard("production_system");
      const element = MissionPresentationShell({
        ...props,
        engineerMode: false,
        judgeCard: card,
        judgeInterruptStatus: "paused",
        missionPhysicalProjection: buildMissionPhysicalProjection({
          playback_state: createInitialMissionPlaybackState("guided"),
        }),
        onEngineerModeChange: () => undefined,
      });
      const markup = renderMarkup(element);

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes('data-judge-answer-card="production_system"'), true);
      assert.equal(markup.includes('data-mission-evidence-navigator-selected="true"'), true);
      assert.equal(markup.includes('data-foreman-avatar-state="challenged"'), true);
      assert.equal(markup.includes('data-foreman-avatar-card="judge-mode"'), true);
    },
  },
  {
    name: "mission shell toggle requests Engineer Mode without mutating dashboard data",
    run: async () => {
      const props = await buildSnapshotMissionFixture();
      const requestedModes: boolean[] = [];
      const element = MissionPresentationShell({
        ...props,
        engineerMode: false,
        onEngineerModeChange: (enabled) => requestedModes.push(enabled),
      });
      const engineerButton = collectButtons(element).find(
        (button) => getElementText(button) === "Engineer Mode"
      );

      assert.ok(engineerButton);
      engineerButton.props.onClick();
      assert.deepEqual(requestedModes, [true]);
    },
  },
  {
    name: "mission shell opens Demo Audit Wall from grouped Proof Tools",
    run: async () => {
      const props = await buildSnapshotMissionFixture();
      const openRequests: string[] = [];
      const element = MissionPresentationShell({
        ...props,
        engineerMode: false,
        onAuditWallOpen: () => openRequests.push("open"),
        onEngineerModeChange: () => undefined,
      });
      const auditButton = collectButtons(element).find(
        (button) => getElementText(button) === "Audit Wall"
      );

      assert.ok(auditButton);
      auditButton.props.onClick();
      assert.deepEqual(openRequests, ["open"]);
    },
  },
  {
    name: "Decision Counter matches existing source event decisions",
    run: async () => {
      const props = await buildSnapshotMissionFixture(4);
      const counts = Object.fromEntries(
        props.auditWallView.counter.items.map((item) => [item.category, item.count])
      );

      assert.deepEqual(counts, {
        blocked: 0,
        held: 3,
        made: 5,
        revoked: 1,
      });
      assert.equal(props.auditWallView.counter.totalSourceDecisions, 5);
      assert.equal(
        props.auditWallView.counter.sourceSummary,
        "Counts derive from existing scenario governance decision fields only."
      );
    },
  },
  {
    name: "Decision Summary renders unsupported category handling with source note",
    run: () => {
      const view = buildDecisionCounter([]);
      const markup = renderMarkup(<DecisionCounter view={view} />);

      assert.equal(markup.includes('data-decision-summary="secondary"'), true);
      assert.equal(markup.includes("Decision Summary"), true);
      assert.equal(markup.includes('data-decision-counter-category="blocked"'), true);
      assert.equal(markup.includes(">0</strong>"), true);
      assert.equal(
        markup.includes("No source-supported BLOCK outcomes are present in this scenario."),
        true
      );
      assert.equal(
        markup.includes("No source-supported governance decisions are present in this scenario."),
        true
      );
    },
  },
  {
    name: "Demo Audit Wall renders safe source columns and does not mutate chain state",
    run: async () => {
      const props = await buildSnapshotMissionFixture(4);
      const beforeEntryCount = props.forensicChain.totalEntryCount;
      const markup = renderMarkup(
        <DemoAuditWall
          onDismiss={() => undefined}
          open={true}
          view={props.auditWallView}
        />
      );
      const lowerMarkup = markup.toLowerCase();

      assert.equal(props.forensicChain.totalEntryCount, beforeEntryCount);
      assert.equal(markup.includes('data-demo-audit-wall="open"'), true);
      assert.equal(markup.includes('data-demo-audit-ticker="true"'), true);
      for (const column of ["ref/hash", "role", "action", "state/outcome", "timestamp"]) {
        assert.equal(markup.includes(column), true, column);
      }
      assert.equal(markup.includes("Contested authority"), true);
      assert.equal(markup.includes("public"), true);
      assert.equal(markup.includes("REVOKE"), true);
      assert.equal(markup.includes("2026-04-21T12:00:00Z"), true);
      for (const forbidden of [
        "public audit portal",
        "official city audit wall",
        "production audit log",
        "legal record",
        "public portal",
        "restricted-demo-trace",
      ]) {
        assert.equal(lowerMarkup.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "mission rail renders exactly six fixed labels",
    run: async () => {
      const { missionRailStages } = await buildSnapshotMissionFixture();
      const markup = renderMarkup(<MissionRail stages={missionRailStages} />);
      const labels = [...markup.matchAll(/data-mission-stage-label="([^"]+)"/g)].map(
        (match) => match[1]
      );

      assert.deepEqual(labels, [...MISSION_RAIL_LABELS]);
      assert.equal(labels.length, 6);
    },
  },
  {
    name: "mission rail highlights HOLD/REVOKE state from existing scenario step state",
    run: async () => {
      const first = await buildSnapshotMissionFixture(0);
      const final = await buildSnapshotMissionFixture(3);
      const firstActive = first.missionRailStages.find((stage) => stage.state === "active");
      const firstHold = first.missionRailStages.find((stage) => stage.state === "hold");
      const finalRevoke = final.missionRailStages.find((stage) => stage.state === "revoke");

      assert.equal(firstActive?.label, undefined);
      assert.equal(firstHold?.label, "Governance");
      assert.equal(finalRevoke?.label, "Governance");
      assert.equal(final.missionRailStages.some((stage) => stage.state === "complete"), true);
    },
  },
  {
    name: "mission rail transitions from existing live projection event state",
    run: () => {
      const liveProjection = createTestLiveProjection({
        events: [
          createTestLiveEvent({
            event_id: "capture",
            kind: "capture.artifact_ingested",
            sequence: 1,
          }),
          createTestLiveEvent({
            event_id: "governance",
            kind: "governance.evaluated",
            refs: {
              absence_refs: [],
              authority_ref: null,
              entity_ids: [],
              evidence_ids: [],
              forensic_refs: [],
              governance_ref: "governance-ref-1",
              skin_ref: null,
            },
            sequence: 2,
          }),
          createTestLiveEvent({
            event_id: "absence",
            kind: "absence.finding.created",
            refs: {
              absence_refs: ["absence-ref-1"],
              authority_ref: null,
              entity_ids: [],
              evidence_ids: [],
              forensic_refs: [],
              governance_ref: null,
              skin_ref: null,
            },
            sequence: 3,
          }),
        ],
        latest: {
          absence: null,
          authority: null,
          capture: null,
          forensic: null,
          governance: null,
        },
        skins: {
          outputs: {},
        },
      });
      const stages = buildMissionRailStages({
        activeStepIndex: 0,
        authorityState: null,
        currentStep: null,
        dashboardMode: "live",
        forensicChain: null,
        liveProjection,
        publicSkinView: null,
        totalSteps: 0,
      });

      assert.equal(stages.find((stage) => stage.state === "active")?.label, "Absence");
      assert.deepEqual(
        stages.slice(0, 3).map((stage) => stage.state),
        ["complete", "complete", "complete"]
      );
    },
  },
  {
    name: "fictional permit anchor renders demo label role language and no city-record claim",
    run: async () => {
      const props = await buildSnapshotMissionFixture();
      const markup = renderMarkup(
        <MissionPresentationShell
          {...props}
          engineerMode={false}
          onEngineerModeChange={() => undefined}
        />
      );
      const lowerMarkup = markup.toLowerCase();

      assert.equal(markup.includes(fictionalPermitAnchor.title), true);
      assert.equal(markup.includes("Demo anchor"), true);
      assert.equal(markup.includes("Synthetic case."), true);
      assert.equal(lowerMarkup.includes("no private address"), true);
      assert.equal(lowerMarkup.includes("no city record"), true);
      assert.equal(lowerMarkup.includes("demo-only framing"), true);

      for (const label of ["Council", "Permitting", "Inspection", "Operations", "Public"]) {
        assert.equal(markup.includes(`data-fictional-permit-role="${label}"`), true, label);
      }

      assert.equal(lowerMarkup.includes("is an official"), false);
      assert.equal(lowerMarkup.includes("official fort worth"), false);
      assert.equal(lowerMarkup.includes("official workflow"), false);
      assert.equal(lowerMarkup.includes("real permit"), false);
    },
  },
  {
    name: "current decision focal card renders source-bounded proof path and Foreman guide boundary",
    run: async () => {
      const props = await buildSnapshotMissionFixture(0);
      const markup = renderMarkup(
        <MissionPresentationShell
          {...props}
          engineerMode={false}
          onEngineerModeChange={() => undefined}
        />
      );

      assert.equal(markup.includes('data-current-decision-card="true"'), true);
      assert.equal(markup.includes('data-current-decision-state="HOLD"'), true);
      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes('data-absence-shadow-map="true"'), true);
      assert.equal(markup.includes('data-civic-twin-diorama="true"'), true);
      assert.equal(markup.includes('data-forensic-receipt-ribbon="true"'), true);
      assert.equal(markup.includes('data-mission-run-receipt-panel="true"'), true);
      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes('data-judge-touchboard="true"'), true);
      assert.equal(markup.includes('data-mission-evidence-navigator="true"'), true);
      assert.equal(markup.includes("Current decision / HOLD"), true);
      assert.equal(markup.includes("Spotlight shows where the current proof lives"), true);
      assert.equal(markup.includes("Shadow slots show expected evidence"), true);
      assert.equal(markup.includes("Why it matters"), true);
      assert.equal(markup.includes("Proof available next"), true);
      assert.equal(markup.includes('data-foreman-presenter-note="guide-only"'), true);
      assert.equal(markup.includes("It does not create truth."), true);
    },
  },
  {
    name: "advanced proof tools are grouped by default and still expose required proof views",
    run: async () => {
      const props = await buildSnapshotMissionFixture(0);
      const markup = renderMarkup(
        <MissionPresentationShell
          {...props}
          engineerMode={false}
          onEngineerModeChange={() => undefined}
        />
      );

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes("<summary>Proof Tools</summary>"), true);
      for (const label of [
        "Engineer Mode",
        "Director Mode",
        "Absence Lens",
        "Audit Wall",
        "HOLD Wall",
      ]) {
        assert.equal(markup.includes(label), true, label);
      }
    },
  },
  {
    name: "ControlRoomShell mounts Rehearsal Panel inside grouped Proof Tools",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(/<details[^>]*class="mission-proof-tools"[^>]* open/.test(markup), false);
      assert.equal(markup.includes('data-mission-rehearsal-panel="operator-proof"'), true);
      assert.equal(markup.includes("Rehearsal / operator proof"), true);
      assert.equal(markup.includes("Rehearsal Certification"), true);
      assert.equal(markup.includes("does not prove mobile/judge-device smoke"), true);
      assert.equal(markup.includes("Blocking HOLDs:"), true);
      assert.equal(markup.includes('data-rehearsal-failure="authority_endpoint_unavailable"'), true);
      assert.equal(markup.includes('data-rehearsal-manual-hold="final_v2b_closeout"'), true);
      assert.equal(markup.includes('data-rehearsal-boundary="no_model_api_foreman_claim"'), true);
    },
  },
  {
    name: "mission Absence Lens toggle is controlled by dashboard state",
    run: async () => {
      const props = await buildSnapshotMissionFixture();
      const toggleRequests: string[] = [];
      const element = MissionPresentationShell({
        ...props,
        engineerMode: false,
        onAbsenceLensToggle: () => toggleRequests.push("toggle"),
        onEngineerModeChange: () => undefined,
      });
      const lensButton = collectButtons(element).find(
        (button) => getElementText(button) === "Absence Lens"
      );

      assert.ok(lensButton);
      assert.equal(lensButton.props["aria-pressed"], false);
      lensButton.props.onClick();
      assert.deepEqual(toggleRequests, ["toggle"]);
    },
  },
  {
    name: "mission Absence Lens caps display at three source-backed findings",
    run: async () => {
      const props = await buildSnapshotMissionFixture(3);
      const overlay = buildMissionAbsenceLensOverlay(props.absenceLens);
      const markup = renderMarkup(
        <MissionPresentationShell
          {...props}
          absenceLensEnabled={true}
          engineerMode={false}
          onEngineerModeChange={() => undefined}
        />
      );
      const renderedFindings = [
        ...markup.matchAll(/data-mission-absence-finding="([^"]+)"/g),
      ].map((match) => match[1]);

      assert.equal(overlay.sourceMode, "mapped-from-existing-absence-signals");
      assert.equal(overlay.findings.length, 3);
      assert.equal(renderedFindings.length, 3);
      assert.equal(overlay.truncatedCount > 0, true);
      assert.equal(
        overlay.findings.every((finding) => !finding.sourcePath.startsWith("HOLD:")),
        true
      );
      assert.equal(markup.includes('data-mission-absence-category="authority"'), true);
      assert.equal(
        markup.includes('data-mission-absence-treatment="dims-existing-highlights-missing"'),
        true
      );
    },
  },
  {
    name: "mission Absence Lens mapper does not read scenario state or compute absence truth",
    run: async () => {
      const source = await readFile("src/demo/missionAbsenceLens.ts", "utf8");

      assert.equal(source.includes("ControlRoomTimelineStep"), false);
      assert.equal(source.includes("ScenarioStep"), false);
      assert.equal(source.includes("currentStep"), false);
      assert.equal(source.includes(".step."), false);
    },
  },
  {
    name: "HOLD Wall renders takeover from existing state with source-bounded fields",
    run: async () => {
      const props = await buildSnapshotMissionFixture(0);
      const view = props.holdWallView;
      const markup = renderMarkup(
        <HoldWall onDismiss={() => undefined} open={true} view={view} />
      );

      assert.equal(view.triggered, true);
      assert.equal(markup.includes('data-hold-wall="open"'), true);
      assert.equal(markup.includes("Meridian refused the action"), true);
      assert.equal(markup.includes('data-hold-wall-field="missing_authority"'), true);
      assert.equal(markup.includes('data-hold-wall-field="missing_evidence"'), true);
      assert.equal(markup.includes('data-hold-wall-field="missing_public_boundary"'), true);
      assert.equal(markup.includes('data-hold-wall-field="required_next_proof"'), true);
      assert.equal(
        markup.includes(
          'data-hold-wall-field="missing_authority" data-hold-wall-field-status="sourced"'
        ),
        true
      );
      assert.equal(
        markup.includes(
          'data-hold-wall-field="missing_evidence" data-hold-wall-field-status="sourced"'
        ),
        true
      );
      assert.equal(
        view.fields.every((field) => field.status === "sourced" || field.status === "unresolved"),
        true
      );
      assert.equal(markup.includes("step.governance.result.hold.resolutionPath"), true);
    },
  },
  {
    name: "HOLD Wall renders unsupported fields as unresolved HOLD",
    run: async () => {
      const props = await buildSnapshotMissionFixture(0);
      const unresolvedView = {
        ...props.holdWallView,
        fields: props.holdWallView.fields.map((field) =>
          field.key === "missing_public_boundary"
            ? {
                ...field,
                sourceKind: null,
                sourcePath: null,
                status: "unresolved" as const,
                value:
                  "HOLD: Missing public boundary has no source-supported field in the current dashboard state.",
              }
            : field
        ),
      };
      const markup = renderMarkup(
        <HoldWall onDismiss={() => undefined} open={true} view={unresolvedView} />
      );

      assert.equal(
        markup.includes(
          'data-hold-wall-field="missing_public_boundary" data-hold-wall-field-status="unresolved"'
        ),
        true
      );
      assert.equal(markup.includes("HOLD: source unresolved"), true);
      assert.equal(markup.includes("HOLD: Missing public boundary"), true);
    },
  },
  {
    name: "HOLD Wall silence is three timed beats with no audio",
    run: async () => {
      const props = await buildSnapshotMissionFixture(0);
      const markup = renderMarkup(
        <HoldWall onDismiss={() => undefined} open={true} view={props.holdWallView} />
      );

      assert.equal(markup.includes('data-silence-beat-count="3"'), true);
      assert.equal(
        markup.includes(`data-silence-beat-ms="${HOLD_WALL_SILENCE_BEAT_MS}"`),
        true
      );
      assert.equal(markup.includes('data-audio-cue="none"'), true);
      assert.equal(markup.includes("Beat 1"), true);
      assert.equal(markup.includes("Beat 2"), true);
      assert.equal(markup.includes("Beat 3"), true);
    },
  },
  {
    name: "HOLD Wall dismisses without mutating ForensicChain state",
    run: async () => {
      const props = await buildSnapshotMissionFixture(0);
      const beforeEntryCount = props.forensicChain.totalEntryCount;
      const dismissRequests: string[] = [];
      const element = HoldWall({
        onDismiss: () => dismissRequests.push("dismiss"),
        open: true,
        view: props.holdWallView,
      });
      const dismissButton = collectButtons(element).find(
        (button) => getElementText(button) === "Return to Mission"
      );
      const markup = renderMarkup(
        <HoldWall onDismiss={() => undefined} open={true} view={props.holdWallView} />
      );

      assert.ok(dismissButton);
      dismissButton.props.onClick();
      assert.deepEqual(dismissRequests, ["dismiss"]);
      assert.equal(props.forensicChain.totalEntryCount, beforeEntryCount);
      assert.equal(props.holdWallView.chainEntryCount, beforeEntryCount);
      assert.equal(props.holdWallView.chainWriteClaimed, false);
      assert.equal(markup.includes('data-chain-write-claimed="false"'), true);
      assert.equal(markup.includes("HOLD Wall creates no entry"), true);
    },
  },
  {
    name: "mission presentation CSS uses required local tokens and no bundled font rule",
    run: async () => {
      const styles = await readFile("src/styles.css", "utf8");

      for (const token of ["#0A1628", "#E8EDF2", "#F5B547", "#E5484D", "#3DD68C"]) {
        assert.equal(styles.includes(token), true, token);
      }

      assert.equal(styles.includes("JetBrains Mono"), true);
      assert.equal(styles.includes("@font-face"), false);
    },
  },
  {
    name: "mission presentation files do not import the root/shared skin framework",
    run: async () => {
      const sourcePaths = [
        "src/components/ControlRoomShell.tsx",
        "src/components/JudgeTouchboard.tsx",
        "src/components/MissionEvidenceNavigator.tsx",
        "src/components/CivicTwinDiorama.tsx",
        "src/components/AbsenceShadowMap.tsx",
        "src/components/AuthorityHandoffTheater.tsx",
        "src/components/ForemanAvatarBay.tsx",
        "src/components/MissionPresentationShell.tsx",
        "src/components/ProofSpotlight.tsx",
        "src/components/DecisionCounter.tsx",
        "src/components/DemoAuditWall.tsx",
        "src/components/DoctrineCard.tsx",
        "src/components/HoldWall.tsx",
        "src/components/ForensicReceiptRibbon.tsx",
        "src/components/MissionRunReceiptPanel.tsx",
        "src/components/MissionPlaybackControls.tsx",
        "src/demo/demoAudit.ts",
        "src/demo/doctrineCard.ts",
        "src/demo/fictionalPermitAnchor.ts",
        "src/demo/holdWall.ts",
        "src/demo/missionAbsenceLens.ts",
        "src/demo/judgeTouchboardDeck.ts",
        "src/demo/missionEvidenceNavigator.ts",
        "src/demo/civicTwinDioramaView.ts",
        "src/demo/absenceShadowView.ts",
        "src/components/MissionRail.tsx",
        "src/demo/missionRail.ts",
        "src/demo/missionRunRecorder.ts",
        "src/demo/missionRunReceipt.ts",
        "src/demo/missionReceiptRibbon.ts",
        "src/demo/proofSpotlightView.ts",
        "src/demo/authorityHandoffView.ts",
        "src/foremanGuide/foremanEmbodiedState.ts",
      ];

      for (const sourcePath of sourcePaths) {
        const source = await readFile(sourcePath, "utf8");

        assert.equal(source.includes("../src/skins"), false, sourcePath);
        assert.equal(source.includes("../../src/skins"), false, sourcePath);
        assert.equal(source.includes("src/skins"), false, sourcePath);
      }
    },
  },
];

async function main() {
  await runTests(tests);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
