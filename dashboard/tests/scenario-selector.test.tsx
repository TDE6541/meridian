import assert from "node:assert/strict";
import React from "react";
import { ScenarioSelector } from "../src/components/ScenarioSelector.tsx";
import {
  createErrorScenarioRecord,
  createInitialControlRoomState,
  selectScenario,
} from "../src/state/controlRoomState.ts";
import { scenarioRegistry } from "../src/data/scenarioRegistry.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "scenario selector switches routine, contested, and emergency deterministically",
    run: async () => {
      const initialState = {
        ...createInitialControlRoomState("routine"),
        activeStepIndex: 2,
        playbackState: "playing" as const,
      };

      const contestedState = selectScenario(initialState, "contested");
      assert.equal(contestedState.selectedScenarioKey, "contested");
      assert.equal(contestedState.activeStepIndex, 0);
      assert.equal(contestedState.playbackState, "paused");

      const emergencyState = selectScenario(contestedState, "emergency");
      assert.equal(emergencyState.selectedScenarioKey, "emergency");
      assert.equal(emergencyState.activeStepIndex, 0);
      assert.equal(emergencyState.playbackState, "paused");
    },
  },
  {
    name: "scenario selector markup renders all three scenario options and visible errors",
    run: async () => {
      const routine = await loadScenarioRecord("routine");
      const contested = await loadScenarioRecord("contested");
      const emergencyError = createErrorScenarioRecord(
        scenarioRegistry[2],
        "emergency.json failed validation: transition step missing"
      );

      const markup = renderMarkup(
        <ScenarioSelector
          records={[routine, contested, emergencyError]}
          selectedScenarioKey="emergency"
          onSelect={() => undefined}
        />
      );

      assert.equal(markup.includes("Routine"), true);
      assert.equal(markup.includes("Contested"), true);
      assert.equal(markup.includes("Emergency"), true);
      assert.equal(markup.includes('data-scenario-key="routine"'), true);
      assert.equal(markup.includes('data-scenario-key="contested"'), true);
      assert.equal(markup.includes('data-scenario-key="emergency"'), true);
      assert.equal(markup.includes("emergency.json failed validation"), true);
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
