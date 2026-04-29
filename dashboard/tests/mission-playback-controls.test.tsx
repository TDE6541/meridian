import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { MissionPlaybackControls } from "../src/components/MissionPlaybackControls.tsx";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  runForemanAutonomousConductor,
  type ForemanConductorReadinessInput,
} from "../src/demo/foremanAutonomousConductor.ts";
import {
  MISSION_STAGE_IDS,
  type MissionPlaybackMode,
} from "../src/demo/missionPlaybackPlan.ts";
import type { MissionStageReadinessInput } from "../src/demo/missionStageReadiness.ts";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { loadAllScenarioRecords, renderMarkup, runTests } from "./scenarioTestUtils.ts";

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

function readyControllerInput(
  state: MissionPlaybackState
): Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId"> {
  return {
    activeStageId: state.currentStageId ?? MISSION_STAGE_IDS[0],
    foremanCue: {
      required: false,
      source: "d3.test.foreman",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d3.test.proof",
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

function readyConductorInput(): ForemanConductorReadinessInput {
  return {
    modeConsistent: true,
    presenterCockpitReady: true,
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
    readiness: readyControllerInput(idle),
    type: "begin_mission",
  });
}

function eventCount(state: MissionPlaybackState, type: string): number {
  return state.events.filter((event) => event.type === type).length;
}

const tests = [
  {
    name: "Presenter Cockpit shows lobby state before mission start",
    run: () => {
      const markup = renderMarkup(<MissionPlaybackControls />);

      assert.equal(markup.includes('data-mission-playback-controls="lobby"'), true);
      assert.equal(markup.includes("Ready for guided walkthrough"), true);
      assert.equal(markup.includes("Choose how the proof theater runs."), true);
      assert.equal(markup.includes("Begin Mission"), true);
      assert.equal(markup.includes("Lobby"), true);
    },
  },
  {
    name: "mode toggle renders both Guided and Foreman Autonomous with selected mode visible",
    run: () => {
      const markup = renderMarkup(<MissionPlaybackControls />);

      assert.equal(markup.includes("Guided Mission"), true);
      assert.equal(markup.includes("Foreman Autonomous"), true);
      assert.equal(markup.includes('data-mission-selected-mode-visible="true"'), true);
      assert.equal(markup.includes("Selected mode"), true);
      assert.equal(markup.includes('data-selected-mission-mode="guided"'), true);
    },
  },
  {
    name: "mode can switch while idle",
    run: () => {
      const selectedModes: MissionPlaybackMode[] = [];
      const element = MissionPlaybackControls({
        onModeChange: (mode) => selectedModes.push(mode),
        playbackState: createInitialMissionPlaybackState("guided"),
      });
      const autoButton = collectButtons(element).find(
        (button) => button.props["data-mission-mode-option"] === "foreman_autonomous"
      );

      assert.ok(autoButton);
      assert.equal(autoButton.props.disabled, false);
      autoButton.props.onClick();
      assert.deepEqual(selectedModes, ["foreman_autonomous"]);
    },
  },
  {
    name: "mode cannot switch mid-run",
    run: () => {
      const running = beginGuided();
      const switched = missionPlaybackReducer(running, {
        mode: "foreman_autonomous",
        nowMs: 5,
        type: "select_mode",
      });
      const markup = renderMarkup(<MissionPlaybackControls playbackState={running} />);

      assert.equal(switched.mode, "guided");
      assert.equal(switched.warnings.at(-1)?.message, "mode_switch_ignored_mid_run");
      assert.equal(markup.includes("Mode locked during run"), true);
      assert.equal(markup.includes('disabled=""'), true);
    },
  },
  {
    name: "Begin Mission starts Guided mode",
    run: () => {
      const running = beginGuided();

      assert.equal(running.mode, "guided");
      assert.equal(running.status, "running");
      assert.equal(running.currentStageId, "capture");
      assert.deepEqual(
        running.events.map((event) => event.type),
        ["mission_begin", "stage_enter"]
      );
    },
  },
  {
    name: "Guided mode exposes running status and capture stage",
    run: () => {
      const running = beginGuided();
      const markup = renderMarkup(<MissionPlaybackControls playbackState={running} />);

      assert.equal(markup.includes('data-playback-status="running"'), true);
      assert.equal(markup.includes('data-active-mission-stage="capture"'), true);
      assert.equal(markup.includes("Running"), true);
      assert.equal(markup.includes("Capture"), true);
      assert.equal(markup.includes("Stage 1/6"), true);
    },
  },
  {
    name: "Begin Mission starts Foreman Autonomous mode",
    run: () => {
      const idle = createInitialMissionPlaybackState("foreman_autonomous");
      const output = runForemanAutonomousConductor({
        nowMs: 0,
        playbackState: idle,
        readiness: readyConductorInput(),
      });

      assert.equal(output.controllerState.mode, "foreman_autonomous");
      assert.equal(output.controllerState.status, "running");
      assert.equal(output.controllerState.currentStageId, "capture");
      assert.equal(output.currentCueId, "foreman-cue-capture");
      assert.equal(output.nextControllerCommand.type, "begin_mission");
    },
  },
  {
    name: "Foreman Autonomous exposes running status, capture stage, and deterministic conductor copy",
    run: () => {
      const idle = createInitialMissionPlaybackState("foreman_autonomous");
      const output = runForemanAutonomousConductor({
        nowMs: 0,
        playbackState: idle,
        readiness: readyConductorInput(),
      });
      const markup = renderMarkup(
        <MissionPlaybackControls
          conductorOutput={output}
          playbackState={output.controllerState}
        />
      );
      const lowerMarkup = markup.toLowerCase();

      assert.equal(markup.includes('data-selected-mission-mode="foreman_autonomous"'), true);
      assert.equal(markup.includes('data-playback-status="running"'), true);
      assert.equal(markup.includes('data-active-mission-stage="capture"'), true);
      assert.equal(markup.includes("Permit #4471 starts from committed demo evidence"), true);
      assert.equal(lowerMarkup.includes("deterministic conductor"), true);
      assert.equal(lowerMarkup.includes(["ai", "agent"].join(" ")), false);
      assert.equal(lowerMarkup.includes(["live", "model"].join(" ")), false);
    },
  },
  {
    name: "Pause preserves current stage",
    run: () => {
      const running = beginGuided();
      const paused = missionPlaybackReducer(running, {
        nowMs: 10,
        type: "pause",
      });
      const markup = renderMarkup(<MissionPlaybackControls playbackState={paused} />);

      assert.equal(paused.status, "paused");
      assert.equal(paused.currentStageId, "capture");
      assert.equal(markup.includes("Resume"), true);
      assert.equal(markup.includes('data-active-mission-stage="capture"'), true);
    },
  },
  {
    name: "Resume preserves current stage and does not duplicate cue or stage enter",
    run: () => {
      const first = runForemanAutonomousConductor({
        nowMs: 0,
        playbackState: createInitialMissionPlaybackState("foreman_autonomous"),
        readiness: readyConductorInput(),
      });
      const paused = missionPlaybackReducer(first.controllerState, {
        nowMs: 10,
        type: "pause",
      });
      const resumed = missionPlaybackReducer(paused, {
        nowMs: 20,
        type: "resume",
      });
      const afterResume = runForemanAutonomousConductor({
        conductorState: first.conductorState,
        nowMs: 25,
        playbackState: resumed,
        readiness: readyConductorInput(),
      });

      assert.equal(resumed.currentStageId, "capture");
      assert.equal(eventCount(resumed, "stage_enter"), 1);
      assert.equal(afterResume.cueEvent, null);
      assert.deepEqual(afterResume.conductorState.emittedCueIds, ["foreman-cue-capture"]);
    },
  },
  {
    name: "Reset returns to lobby",
    run: () => {
      const running = beginGuided();
      const reset = missionPlaybackReducer(running, {
        cleanupOk: true,
        nowMs: 30,
        type: "reset_mission",
      });
      const markup = renderMarkup(<MissionPlaybackControls playbackState={reset} />);

      assert.equal(reset.status, "idle");
      assert.equal(reset.currentStageId, null);
      assert.equal(markup.includes('data-mission-playback-controls="lobby"'), true);
      assert.equal(markup.includes("Ready for guided walkthrough"), true);
    },
  },
  {
    name: "Reset allows mode switch",
    run: () => {
      const running = beginGuided();
      const reset = missionPlaybackReducer(running, {
        cleanupOk: true,
        nowMs: 30,
        type: "reset_mission",
      });
      const switched = missionPlaybackReducer(reset, {
        mode: "foreman_autonomous",
        nowMs: 31,
        type: "select_mode",
      });

      assert.equal(switched.status, "idle");
      assert.equal(switched.mode, "foreman_autonomous");
    },
  },
  {
    name: "second Begin Mission after reset creates clean run behavior",
    run: () => {
      const first = beginGuided();
      const reset = missionPlaybackReducer(first, {
        cleanupOk: true,
        nowMs: 30,
        type: "reset_mission",
      });
      const second = missionPlaybackReducer(reset, {
        nowMs: 40,
        readiness: readyControllerInput(reset),
        type: "begin_mission",
      });

      assert.notEqual(second.runId, first.runId);
      assert.equal(second.currentStageId, "capture");
      assert.deepEqual(
        second.events.map((event) => event.type),
        ["mission_begin", "stage_enter"]
      );
    },
  },
  {
    name: "Proof Tools remain grouped and collapsed by default",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-proof-tools="collapsed-by-default"'), true);
      assert.equal(markup.includes("<summary>Proof Tools</summary>"), true);
      assert.equal(markup.includes("Mission controls"), true);
    },
  },
  {
    name: "Permit anchor and six-stage rail remain visible",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);
      const stageLabels = [...markup.matchAll(/data-mission-stage-label="([^"]+)"/g)];

      assert.equal(markup.includes("Permit #4471"), true);
      assert.equal(stageLabels.length, 6);
    },
  },
  {
    name: "current decision HOLD focal card remains visible",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-current-decision-card="true"'), true);
      assert.equal(markup.includes("Current decision / HOLD"), true);
      assert.equal(markup.includes("Why it matters"), true);
    },
  },
  {
    name: "carried HOLD and non-claim copy is not contradicted",
    run: () => {
      const markup = renderMarkup(<MissionPlaybackControls />);

      assert.equal(markup.includes("Manual proof HOLDs remain unresolved"), true);
      assert.equal(markup.includes("mobile/judge device proof"), true);
      assert.equal(markup.includes("OpenFGA/CIBA"), true);
      assert.equal(markup.includes("delivered notifications"), true);
      assert.equal(markup.includes("voice/audio"), true);
      assert.equal(markup.includes("PASS"), false);
    },
  },
  {
    name: "D3 controls avoid model, exposed credential, and stale skin render strings",
    run: async () => {
      const source = await readFile("src/components/MissionPlaybackControls.tsx", "utf8");
      const markup = renderMarkup(<MissionPlaybackControls />);
      const combined = `${source}\n${markup}`;
      const forbidden = [
        ["live", "model"].join(" "),
        ["open", "ended"].join("-"),
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        ["step", "skins", "renders"].join("."),
      ];

      for (const token of forbidden) {
        assert.equal(combined.includes(token), false, token);
      }
    },
  },
  {
    name: "D3 controls avoid root skin imports and root chain-write behavior",
    run: async () => {
      const files = [
        "src/components/MissionPlaybackControls.tsx",
        "src/components/MissionPresentationShell.tsx",
        "src/components/ControlRoomShell.tsx",
      ];
      const combined = (await Promise.all(files.map((file) => readFile(file, "utf8"))))
        .join("\n");
      const forbidden = [
        ["..", "..", "src", "skins"].join("/"),
        ["src", "skins"].join("/"),
        ["write", "ForensicChain"].join(""),
        ["production", "city"].join(" "),
        ["legal", "sufficiency"].join(" "),
        ["official", "Fort Worth", "workflow"].join(" "),
      ];

      for (const token of forbidden) {
        assert.equal(combined.includes(token), false, token);
      }
    },
  },
];

await runTests(tests);
