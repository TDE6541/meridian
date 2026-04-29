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
import { CivicTwinDiorama } from "../src/components/CivicTwinDiorama.tsx";
import { MissionPresentationShell } from "../src/components/MissionPresentationShell.tsx";
import { buildDemoAuditWallView } from "../src/demo/demoAudit.ts";
import { buildHoldWallView } from "../src/demo/holdWall.ts";
import {
  createInitialMissionPlaybackState,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  getForemanModeForMissionStage,
  type MissionStageId,
} from "../src/demo/missionPlaybackPlan.ts";
import { buildMissionPhysicalProjection } from "../src/demo/missionPhysicalProjection.ts";
import { buildMissionRailStages } from "../src/demo/missionRail.ts";
import { deriveCivicTwinDioramaView } from "../src/demo/civicTwinDioramaView.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
} from "../src/roleSession/roleSessionTypes.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import {
  loadScenarioRecord,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

const D10_SOURCE_FILES = [
  "src/components/CivicTwinDiorama.tsx",
  "src/demo/civicTwinDioramaView.ts",
] as const;

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

function projectionFor(stageId: MissionStageId | null) {
  const idle = createInitialMissionPlaybackState("guided");
  const playbackState: MissionPlaybackState = {
    ...idle,
    activeForemanMode: stageId ? getForemanModeForMissionStage(stageId) : null,
    currentStageId: stageId,
    stageEnteredAtMs: stageId ? 0 : null,
    startedAtMs: stageId ? 0 : null,
    status: stageId ? "running" : "idle",
  };

  return buildMissionPhysicalProjection({ playback_state: playbackState });
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

async function readD10Source(): Promise<string> {
  return (await Promise.all(D10_SOURCE_FILES.map((file) => readFile(file, "utf8")))).join(
    "\n"
  );
}

await runTests([
  {
    name: "CivicTwinDiorama renders safe fallback state",
    run() {
      const view = deriveCivicTwinDioramaView(null);
      const markup = renderMarkup(<CivicTwinDiorama projection={null} />);

      assert.equal(view.source_mode, "projection_unavailable");
      assert.equal(markup.includes('data-civic-twin-diorama="true"'), true);
      assert.equal(markup.includes("HOLD: projection unavailable"), true);
      assert.equal(markup.includes("HOLD: diorama unavailable"), true);
      assert.equal(markup.includes("no civic twin nodes or edges are invented"), true);
    },
  },
  {
    name: "diorama renders D4 projection data",
    run() {
      const projection = projectionFor("capture");
      const view = deriveCivicTwinDioramaView(projection);
      const markup = renderMarkup(<CivicTwinDiorama projection={projection} />);

      assert.equal(view.source_mode, "d4_projection_diorama");
      assert.equal(view.nodes.length, projection.diorama.nodes.length);
      assert.equal(view.edges.length, projection.diorama.edges.length);
      assert.equal(
        markup.includes('data-civic-twin-source-mode="d4_projection_diorama"'),
        true
      );
      assert.equal(markup.includes("projection.diorama"), true);
    },
  },
  {
    name: "Permit 4471 scenario label and source posture render",
    run() {
      const projection = projectionFor("capture");
      const markup = renderMarkup(<CivicTwinDiorama projection={projection} />);

      assert.equal(markup.includes("Permit #4471 State Model"), true);
      assert.equal(markup.includes("Permit #4471 fictional civic state model"), true);
      assert.equal(markup.includes("committed demo scenario"), true);
      assert.equal(markup.includes("snapshot payload"), true);
    },
  },
  {
    name: "node labels kinds visibility and states render",
    run() {
      const projection = projectionFor("public");
      const view = deriveCivicTwinDioramaView(projection);
      const markup = renderMarkup(<CivicTwinDiorama projection={projection} />);

      for (const node of projection.diorama.nodes) {
        assert.equal(markup.includes(node.label), true, node.label);
      }

      for (const label of [
        "permit",
        "corridor",
        "department",
        "proof",
        "public boundary",
        "civic node",
      ]) {
        assert.equal(markup.includes(label), true, label);
      }

      for (const visibility of ["public-safe", "restricted"]) {
        assert.equal(markup.includes(visibility), true, visibility);
      }

      for (const state of ["active", "holding", "dimmed", "idle"]) {
        assert.equal(markup.includes(state), true, state);
      }

      assert.equal(view.nodes.some((node) => node.visibility === "public_safe"), true);
      assert.equal(view.nodes.some((node) => node.visibility === "restricted"), true);
      assert.equal(view.nodes.some((node) => node.state === "dimmed"), true);
    },
  },
  {
    name: "public-safe and restricted nodes are visually distinct",
    run() {
      const projection = projectionFor("public");
      const markup = renderMarkup(<CivicTwinDiorama projection={projection} />);

      assert.equal(markup.includes('data-civic-twin-node-visibility="public_safe"'), true);
      assert.equal(markup.includes('data-civic-twin-node-visibility="restricted"'), true);
      assert.equal(markup.includes("civic-twin-node--public_safe"), true);
      assert.equal(markup.includes("civic-twin-node--restricted"), true);
    },
  },
  {
    name: "public boundary region and dimming posture render",
    run() {
      const projection = projectionFor("public");
      const markup = renderMarkup(<CivicTwinDiorama projection={projection} />);

      assert.equal(markup.includes('data-civic-twin-public-boundary="visible"'), true);
      assert.equal(markup.includes('data-civic-twin-public-boundary-active="true"'), true);
      assert.equal(markup.includes('data-civic-twin-public-boundary-dimming="true"'), true);
      assert.equal(markup.includes("Public boundary"), true);
      assert.equal(markup.includes("restricted nodes are marked and dimmed"), true);
    },
  },
  {
    name: "edge labels kinds and active inactive posture render",
    run() {
      const projection = projectionFor("capture");
      const markup = renderMarkup(<CivicTwinDiorama projection={projection} />);

      for (const edge of projection.diorama.edges) {
        assert.equal(markup.includes(edge.label), true, edge.edge_id);
      }

      for (const kind of ["authority", "dependency", "evidence", "public boundary"]) {
        assert.equal(markup.includes(kind), true, kind);
      }

      assert.equal(markup.includes('data-civic-twin-edge-posture="active"'), true);
      assert.equal(markup.includes('data-civic-twin-edge-posture="inactive"'), true);
      assert.equal(markup.includes("active edge"), true);
      assert.equal(markup.includes("inactive edge"), true);
    },
  },
  {
    name: "active stage posture renders from projection stage state",
    run() {
      const projection = projectionFor("authority");
      const markup = renderMarkup(<CivicTwinDiorama projection={projection} />);

      assert.equal(markup.includes('data-civic-twin-active-stage="authority"'), true);
      assert.equal(markup.includes('data-civic-twin-active-node="true"'), true);
      assert.equal(markup.includes("Authority (authority)"), true);
    },
  },
  {
    name: "source-boundary copy carries non-claims without overclaiming",
    run() {
      const markup = renderMarkup(<CivicTwinDiorama projection={projectionFor("public")} />);
      const lowerMarkup = markup.toLowerCase();

      assert.equal(markup.includes("It is not live GIS"), true);
      assert.equal(markup.includes("Accela"), true);
      assert.equal(markup.includes("official city record"), true);
      assert.equal(markup.includes("does not prove legal sufficiency"), true);
      assert.equal(lowerMarkup.includes("proves legal sufficiency"), false);
      assert.equal(lowerMarkup.includes("live fort worth data"), false);
      assert.equal(lowerMarkup.includes("real fort worth record"), false);
    },
  },
  {
    name: "reduced-motion-safe information remains visible",
    run() {
      const projection = projectionFor("capture");
      const view = deriveCivicTwinDioramaView(projection);
      const markup = renderMarkup(<CivicTwinDiorama projection={projection} />);

      assert.equal(view.motion_label.includes("Reduced motion safe"), true);
      assert.equal(markup.includes("Reduced motion safe"), true);
      assert.equal(markup.includes("labels, states, visibility, edge kinds"), true);
    },
  },
  {
    name: "Presenter Cockpit includes Civic Twin Diorama and preserves proof surfaces",
    async run() {
      const props = await buildSnapshotMissionFixture();
      const markup = renderMarkup(
        <MissionPresentationShell
          {...props}
          engineerMode={false}
          missionPhysicalProjection={projectionFor("public")}
          onEngineerModeChange={() => undefined}
        />
      );

      assert.equal(markup.includes("Presenter Cockpit"), true);
      assert.equal(markup.includes('data-civic-twin-diorama="true"'), true);
      assert.equal(markup.includes("Civic Twin Diorama"), true);
      assert.equal(markup.includes('data-foreman-avatar-bay="true"'), true);
      assert.equal(markup.includes('data-proof-spotlight="true"'), true);
      assert.equal(markup.includes('data-absence-shadow-map="true"'), true);
      assert.equal(markup.includes('data-authority-handoff-theater="true"'), true);
      assert.equal(markup.includes('data-judge-touchboard="true"'), true);
      assert.equal(markup.includes('data-mission-evidence-navigator="true"'), true);
      assert.equal(markup.includes('data-current-decision-card="true"'), true);
    },
  },
  {
    name: "Presenter Cockpit preserves Proof Tools Permit anchor and six-stage rail",
    async run() {
      const props = await buildSnapshotMissionFixture();
      const markup = renderMarkup(
        <MissionPresentationShell
          {...props}
          engineerMode={false}
          missionPhysicalProjection={projectionFor("public")}
          onEngineerModeChange={() => undefined}
        />
      );

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes("<summary>Proof Tools</summary>"), true);
      assert.equal(markup.includes("Permit #4471"), true);
      assert.equal(markup.includes("data-fictional-permit-anchor="), true);
      for (const label of [
        "Capture",
        "Authority",
        "Governance",
        "Absence",
        "Chain",
        "Public",
      ]) {
        assert.equal(markup.includes(label), true, label);
      }
    },
  },
  {
    name: "D10 source avoids map graph model key skin render and chain-write dependencies",
    async run() {
      const source = await readD10Source();
      const forbidden = [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "api.openai.com",
        "api.anthropic.com",
        "browser-exposed-key",
        "fetch(",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "mapbox",
        "leaflet",
        "google.maps",
        "@googlemaps",
        "react-flow",
        "cytoscape",
        "d3-force",
        "<canvas",
        ["step", "skins", "renders"].join("."),
        ["src", "skins"].join("/"),
        ["src", "skins"].join("\\"),
        "appendForensicChain",
        "writeForensicChain",
        "recordForensicChain",
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "D10 source avoids production official portal phone notification and auth claims",
    async run() {
      const source = (await readD10Source()).toLowerCase();
      const forbidden = [
        "production city system",
        "official fort worth workflow",
        "public portal behavior",
        "live openfga",
        "ciba approval",
        "live phone",
        "delivered notification",
        "whisper/audio",
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
]);
