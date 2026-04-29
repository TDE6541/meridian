import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { MissionRunReceiptPanel } from "../src/components/MissionRunReceiptPanel.tsx";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import { MISSION_STAGE_IDS } from "../src/demo/missionPlaybackPlan.ts";
import { buildMissionPhysicalProjection } from "../src/demo/missionPhysicalProjection.ts";
import { buildMissionRunReceipt } from "../src/demo/missionRunReceipt.ts";
import type { MissionStageReadinessInput } from "../src/demo/missionStageReadiness.ts";
import { renderMarkup, runTests } from "./scenarioTestUtils.ts";

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

function readyInput(
  state: MissionPlaybackState
): Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId"> {
  return {
    activeStageId: state.currentStageId ?? MISSION_STAGE_IDS[0],
    foremanCue: {
      required: false,
      source: "d11.test.foreman",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d11.test.proof",
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
  };
}

function beginGuided(): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState("guided");

  return missionPlaybackReducer(idle, {
    nowMs: 0,
    readiness: readyInput(idle),
    type: "begin_mission",
  });
}

function holdCapture(): MissionPlaybackState {
  return missionPlaybackReducer(beginGuided(), {
    nowMs: 4,
    reason: "d11_test_hold",
    type: "hold",
  });
}

function replaceWindowForPrint(print: () => void): () => void {
  const globalRecord = globalThis as Record<string, unknown>;
  const hadWindow = Object.prototype.hasOwnProperty.call(globalRecord, "window");
  const priorWindow = globalRecord.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { print },
  });

  return () => {
    if (hadWindow) {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: priorWindow,
      });
      return;
    }

    Reflect.deleteProperty(globalThis, "window");
  };
}

await runTests([
  {
    name: "run receipt helper records playback and projection events",
    run() {
      const playbackState = beginGuided();
      const projection = buildMissionPhysicalProjection({ playback_state: playbackState });
      const receipt = buildMissionRunReceipt({ playbackState, projection });
      const kinds = receipt.events.map((event) => event.kind);

      assert.equal(receipt.run_id, "mission-receipt-mission-run-1");
      assert.equal(receipt.mode, "guided");
      assert.equal(receipt.status, "running");
      assert.equal(receipt.active_stage_id, "capture");
      for (const kind of [
        "mission.started",
        "stage.entered",
        "foreman.cue",
        "proof.spotlight",
        "absence.shadow",
      ] as const) {
        assert.equal(kinds.includes(kind), true, kind);
      }
      assert.equal(receipt.events.every((event) => event.legal_audit_claim === false), true);
    },
  },
  {
    name: "run receipt carries holds warnings and boundary flags without closing them",
    run() {
      const playbackState = holdCapture();
      const projection = buildMissionPhysicalProjection({ playback_state: playbackState });
      const receipt = buildMissionRunReceipt({ playbackState, projection });

      assert.equal(receipt.status, "holding");
      assert.equal(receipt.events.some((event) => event.kind === "hold.raised"), true);
      assert.equal(receipt.holds.some((hold) => hold.summary === "d11_test_hold"), true);
      assert.equal(
        receipt.holds.some((hold) => hold.status === "carried_hold"),
        true
      );
      assert.equal(receipt.boundary.no_root_forensic_chain_write, true);
      assert.equal(receipt.boundary.no_legal_sufficiency_claim, true);
    },
  },
  {
    name: "MissionRunReceiptPanel renders run id mode status stages holds warnings and boundary flags",
    run() {
      const playbackState = holdCapture();
      const receipt = buildMissionRunReceipt({
        playbackState,
        projection: buildMissionPhysicalProjection({ playback_state: playbackState }),
      });
      const markup = renderMarkup(<MissionRunReceiptPanel receipt={receipt} />);

      assert.equal(markup.includes('data-mission-run-receipt-panel="true"'), true);
      assert.equal(markup.includes("mission-receipt-mission-run-1"), true);
      assert.equal(markup.includes("guided"), true);
      assert.equal(markup.includes("holding"), true);
      assert.equal(markup.includes("Capture"), true);
      assert.equal(markup.includes("d11_test_hold"), true);
      assert.equal(markup.includes("Full authority choreography and phone smoke proof"), true);
      assert.equal(markup.includes("no-root-forensic-chain-write: true"), true);
      assert.equal(markup.includes("Browser-native print only"), true);
      assert.equal(markup.includes("not a legal audit trail"), true);
    },
  },
  {
    name: "MissionRunReceiptPanel print button calls browser-native window.print only",
    run() {
      const calls: string[] = [];
      const restoreWindow = replaceWindowForPrint(() => calls.push("print"));
      const element = MissionRunReceiptPanel({
        receipt: buildMissionRunReceipt({
          playbackState: beginGuided(),
          projection: buildMissionPhysicalProjection({ playback_state: beginGuided() }),
        }),
      });
      const printButton = collectButtons(element).find(
        (button) => button.props["data-mission-receipt-print"] === "browser-native"
      );

      try {
        assert.ok(printButton);
        printButton.props.onClick();
        assert.deepEqual(calls, ["print"]);
      } finally {
        restoreWindow();
      }
    },
  },
  {
    name: "MissionRunReceiptPanel source has no file generation or request behavior",
    async run() {
      const source = await readFile("src/components/MissionRunReceiptPanel.tsx", "utf8");

      assert.equal(source.includes("window.print()"), true);
      for (const token of [
        "Blob",
        "URL.createObjectURL",
        "fetch(",
        "XMLHttpRequest",
        "createElement(\"a\")",
        "download=",
        "localStorage",
      ]) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
]);
