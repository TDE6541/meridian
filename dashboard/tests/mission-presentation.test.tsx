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
import { MissionPresentationShell } from "../src/components/MissionPresentationShell.tsx";
import { MissionRail } from "../src/components/MissionRail.tsx";
import {
  buildMissionRailStages,
  MISSION_RAIL_LABELS,
} from "../src/demo/missionRail.ts";
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

  return {
    absenceLens,
    activeSkinLabel: publicSkinView?.label ?? "Public",
    activeStepLabel: `${currentStep.stepId} (${activeStepIndex + 1}/${timelineSteps.length})`,
    authorityState,
    currentStep,
    dashboardMode: "snapshot" as const,
    dataVersion: record.payload.contractVersion,
    errorCount: 0,
    forensicChain,
    missionRailStages,
    publicSkinView,
    readyCount: 3,
    roleSession,
    scenarioDescription: "Contested authority fixture.",
    scenarioLabel: "Contested authority",
    scenarioStatus: record.scenario.status,
    totalSteps: timelineSteps.length,
  };
}

const tests = [
  {
    name: "mission presentation is the default view and Engineer Mode keeps the cockpit behind it",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-presentation-mode="mission"'), true);
      assert.equal(markup.includes('data-mission-presentation="active"'), true);
      assert.equal(markup.includes('data-engineer-cockpit="hidden"'), true);
      assert.equal(markup.includes("Mission Control"), true);
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
      assert.equal(markup.includes("Mission View"), true);
      assert.equal(markup.includes("Local demo control room"), true);
      assert.equal(markup.includes("Snapshot remains the default stable path"), true);
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
    name: "mission rail transitions from existing scenario step state",
    run: async () => {
      const first = await buildSnapshotMissionFixture(0);
      const final = await buildSnapshotMissionFixture(4);
      const firstActive = first.missionRailStages.find((stage) => stage.state === "active");
      const finalActive = final.missionRailStages.find((stage) => stage.state === "active");

      assert.equal(firstActive?.label, "Capture");
      assert.equal(finalActive?.label, "Public");
      assert.equal(
        final.missionRailStages.filter((stage) => stage.state === "complete").length,
        5
      );
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
        "src/components/MissionPresentationShell.tsx",
        "src/components/MissionRail.tsx",
        "src/demo/missionRail.ts",
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
