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
import { MissionControlPhysicalMode } from "../src/components/MissionControlPhysicalMode.tsx";
import { MissionPresentationShell } from "../src/components/MissionPresentationShell.tsx";
import { buildDemoAuditWallView } from "../src/demo/demoAudit.ts";
import { buildHoldWallView } from "../src/demo/holdWall.ts";
import { getJudgeTouchboardCard } from "../src/demo/judgeTouchboardDeck.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
} from "../src/demo/missionPlaybackController.ts";
import { buildMissionPhysicalModeView } from "../src/demo/missionPhysicalModeView.ts";
import { buildMissionPhysicalProjection } from "../src/demo/missionPhysicalProjection.ts";
import { buildMissionRailStages } from "../src/demo/missionRail.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import {
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
    onEngineerModeChange: () => undefined,
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

const tests = [
  {
    name: "mission physical mode helper returns the dashboard-local D12 contract",
    run: () => {
      const view = buildMissionPhysicalModeView({ physicalMode: true });

      assert.equal(view.contract, "meridian.v2d.missionPhysicalModeView.v1");
      assert.equal(view.physical_mode, true);
      assert.equal(view.layout_density, "stage");
      assert.equal(view.control_scale, "large");
      assert.equal(view.reduced_motion_safe, true);
      assert.equal(view.proof_tools_grouping, "grouped_collapsed_by_default");
      for (const surface of [
        "Foreman Avatar Bay",
        "Mission Playback Controls",
        "Proof Spotlight",
        "Judge Touchboard",
        "Civic Twin Diorama",
        "Forensic Receipt Ribbon",
        "Current decision/HOLD focal card",
        "Mission Rail",
      ] as const) {
        assert.equal(view.promoted_surfaces.includes(surface), true, surface);
      }
      for (const boundary of [
        "demo-only",
        "no mobile/judge-device proof claim",
        "no production city claim",
        "no legal sufficiency claim",
        "no live Fort Worth claim",
        "no OpenFGA/CIBA claim",
        "no delivered notification claim",
        "no model/API Foreman claim",
        "no root ForensicChain write claim",
      ] as const) {
        assert.equal(view.boundary.includes(boundary), true, boundary);
      }
    },
  },
  {
    name: "MissionControlPhysicalMode renders an off toggle and safe stage-facing copy",
    run: () => {
      const toggles: boolean[] = [];
      const element = MissionControlPhysicalMode({
        enabled: false,
        onEnabledChange: (enabled) => toggles.push(enabled),
      });
      const markup = renderMarkup(element);
      const toggle = collectButtons(element).find(
        (button) => button.props["data-mission-physical-toggle"] === "true"
      );

      assert.equal(markup.includes('data-mission-control-physical-mode="off"'), true);
      assert.equal(markup.includes("Mission Control Physical Mode"), true);
      assert.equal(markup.includes("Stage-facing layout for projector/touchscreen demos"), true);
      assert.equal(markup.includes("does not prove mobile/judge-device smoke"), true);
      assert.equal(markup.includes("Reduced-motion-safe labels visible"), true);
      assert.ok(toggle);
      assert.equal(toggle.props["aria-pressed"], false);
      toggle.props.onClick();
      assert.deepEqual(toggles, [true]);
    },
  },
  {
    name: "MissionControlPhysicalMode can disable physical mode",
    run: () => {
      const toggles: boolean[] = [];
      const element = MissionControlPhysicalMode({
        enabled: true,
        onEnabledChange: (enabled) => toggles.push(enabled),
      });
      const markup = renderMarkup(element);
      const toggle = collectButtons(element).find(
        (button) => button.props["data-mission-physical-toggle"] === "true"
      );

      assert.equal(markup.includes('data-mission-control-physical-mode="on"'), true);
      assert.equal(markup.includes('data-control-scale="large"'), true);
      assert.ok(toggle);
      assert.equal(toggle.props["aria-pressed"], true);
      toggle.props.onClick();
      assert.deepEqual(toggles, [false]);
    },
  },
  {
    name: "Presenter Cockpit includes the physical mode toggle while defaulting to Presenter mode",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-presentation-mode="mission"'), true);
      assert.equal(markup.includes('data-presenter-view-default="true"'), true);
      assert.equal(markup.includes('data-mission-physical-mode="off"'), true);
      assert.equal(markup.includes('data-mission-control-physical-mode="off"'), true);
      assert.equal(markup.includes('data-mission-physical-toggle="true"'), true);
      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes("<summary>Proof Tools</summary>"), true);
      assert.equal(markup.includes("Presenter Cockpit"), true);
    },
  },
  {
    name: "physical mode applies stage layout state and keeps D5-D11 proof surfaces visible",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(
        <ControlRoomShell records={records} initialMissionPhysicalModeEnabled={true} />
      );

      assert.equal(markup.includes('mission-presentation--physical'), true);
      assert.equal(markup.includes('data-mission-physical-mode="on"'), true);
      assert.equal(markup.includes('data-mission-physical-layout="stage"'), true);
      assert.equal(markup.includes('data-mission-physical-control-scale="large"'), true);
      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(/<details[^>]*class="mission-proof-tools"[^>]* open/.test(markup), false);
      for (const marker of [
        'data-foreman-avatar-bay="true"',
        'data-proof-spotlight="true"',
        'data-absence-shadow-map="true"',
        'data-authority-handoff-theater="true"',
        'data-judge-touchboard="true"',
        'data-mission-evidence-navigator="true"',
        'data-civic-twin-diorama="true"',
        'data-forensic-receipt-ribbon="true"',
        'data-mission-run-receipt-panel="true"',
        'data-current-decision-card="true"',
      ]) {
        assert.equal(markup.includes(marker), true, marker);
      }
      assert.equal(markup.includes("Permit #4471"), true);
      assert.equal([...markup.matchAll(/data-mission-stage-label="/g)].length, 6);
    },
  },
  {
    name: "physical mode renders boundary copy without closing carried manual HOLDs",
    run: async () => {
      const props = await buildSnapshotMissionFixture();
      const markup = renderMarkup(
        <MissionPresentationShell
          {...props}
          engineerMode={false}
          missionPhysicalModeEnabled={true}
        />
      );
      const lowerMarkup = markup.toLowerCase();

      assert.equal(markup.includes("stage-facing layout only"), true);
      assert.equal(markup.includes("no mobile/judge-device proof claim"), true);
      assert.equal(markup.includes("no production city claim"), true);
      assert.equal(markup.includes("no legal sufficiency claim"), true);
      assert.equal(markup.includes("no official-workflow claim"), true);
      assert.equal(markup.includes("no OpenFGA/CIBA claim"), true);
      assert.equal(markup.includes("no delivered notification claim"), true);
      assert.equal(markup.includes("no model/API Foreman claim"), true);
      assert.equal(markup.includes("no root ForensicChain write claim"), true);
      for (const forbidden of [
        "mobile/judge-device smoke passed",
        "production city operation",
        "certifies legal",
        "official fort worth workflow is active",
        "live openfga is active",
        "delivered notification behavior is active",
      ]) {
        assert.equal(lowerMarkup.includes(forbidden), false, forbidden);
      }
    },
  },
  {
    name: "mission reset posture clears transient judge and proof target state while physical mode may remain on",
    run: async () => {
      const props = await buildSnapshotMissionFixture();
      const card = getJudgeTouchboardCard("production_system");
      const started = missionPlaybackReducer(createInitialMissionPlaybackState("guided"), {
        nowMs: 0,
        readiness: {
          activeStageId: "capture",
          foremanCue: {
            required: false,
            source: "d12.reset.test.foreman",
            status: "ready",
          },
          modeConsistent: true,
          nowMs: 0,
          presenterCockpitReady: true,
          proofCue: {
            required: false,
            source: "d12.reset.test.proof",
            status: "ready",
          },
          requiredHolds: [],
          resetCleanupOk: true,
          scenarioAvailable: true,
          substrate: {
            absence_lens: true,
            authority_panel: true,
            capture_snapshot: true,
            forensic_chain: true,
            governance_panel: true,
            public_disclosure: true,
          },
        },
        type: "begin_mission",
      });
      const reset = missionPlaybackReducer(started, {
        cleanupOk: true,
        nowMs: 10,
        type: "reset_mission",
      });
      const before = renderMarkup(
        <MissionPresentationShell
          {...props}
          engineerMode={false}
          judgeCard={card}
          missionPhysicalModeEnabled={true}
          missionPhysicalProjection={buildMissionPhysicalProjection({
            playback_state: started,
          })}
        />
      );
      const after = renderMarkup(
        <MissionPresentationShell
          {...props}
          engineerMode={false}
          judgeCard={null}
          missionPhysicalModeEnabled={true}
          missionPhysicalProjection={buildMissionPhysicalProjection({
            playback_state: reset,
          })}
        />
      );

      assert.equal(before.includes('data-judge-answer-card="production_system"'), true);
      assert.equal(before.includes('data-proof-spotlight-status="ready"'), true);
      assert.equal(after.includes('data-mission-physical-mode="on"'), true);
      assert.equal(after.includes('data-judge-answer-card="production_system"'), false);
      assert.equal(after.includes('data-proof-spotlight-source-mode="d4_projection_safe_lobby"'), true);
      assert.equal(after.includes('data-proof-target-id="safe-fallback"'), true);
      assert.equal(
        after.includes("selected judge cards and proof targets clear with mission state"),
        true
      );
    },
  },
  {
    name: "D12 source stays dashboard-local with no package config auth model or root-contract widening",
    run: async () => {
      const d12Files = [
        "src/components/MissionControlPhysicalMode.tsx",
        "src/components/MissionPresentationShell.tsx",
        "src/components/ControlRoomShell.tsx",
        "src/components/MissionPlaybackControls.tsx",
        "src/demo/missionPhysicalModeView.ts",
      ];
      const source = (await Promise.all(d12Files.map((file) => readFile(file, "utf8"))))
        .join("\n");
      const adapterSource = await readFile("src/adapters/skinPayloadAdapter.ts", "utf8");

      for (const token of [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "api.openai.com",
        "api.anthropic.com",
        "browser-exposed-key",
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "package.json",
        "vite.config",
        "vercel",
        "process.env",
        "../src/skins",
        "../../src/skins",
        ["src", "skins"].join("/"),
        ["step", "skins", "renders"].join("."),
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
        "<input",
        "<textarea",
      ]) {
        assert.equal(source.includes(token), false, token);
      }
      assert.equal(adapterSource.includes(["step", "skins", "outputs"].join(".")), true);
      assert.equal(adapterSource.includes(["step", "skins", "renders"].join(".")), false);
    },
  },
];

await runTests(tests);
