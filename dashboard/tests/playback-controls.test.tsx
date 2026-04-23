import assert from "node:assert/strict";
import React from "react";
import { OutcomeBadge } from "../src/components/OutcomeBadge.tsx";
import { PlaybackControls } from "../src/components/PlaybackControls.tsx";
import {
  advancePlayback,
  createInitialControlRoomState,
  goToNextStep,
  goToPreviousStep,
  pausePlayback,
  resetControlRoom,
  startPlayback,
} from "../src/state/controlRoomState.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "playback controls advance, pause, and reset deterministically",
    run: () => {
      const totalSteps = 5;
      const initialState = createInitialControlRoomState("emergency");
      const started = startPlayback(initialState, totalSteps);
      const advancedToSecond = advancePlayback(started, totalSteps);
      const advancedToThird = advancePlayback(
        {
          ...advancedToSecond,
          playbackState: "playing",
        },
        totalSteps
      );
      const advancedToFourth = advancePlayback(
        {
          ...advancedToThird,
          playbackState: "playing",
        },
        totalSteps
      );
      const advancedToFinal = advancePlayback(
        {
          ...advancedToFourth,
          playbackState: "playing",
        },
        totalSteps
      );
      const rewound = goToPreviousStep(advancedToFinal, totalSteps);
      const manualNext = goToNextStep(rewound, totalSteps);
      const paused = pausePlayback(manualNext);
      const reset = resetControlRoom(paused);

      assert.equal(started.playbackState, "playing");
      assert.equal(advancedToSecond.activeStepIndex, 1);
      assert.equal(advancedToThird.activeStepIndex, 2);
      assert.equal(advancedToFourth.activeStepIndex, 3);
      assert.equal(advancedToFinal.activeStepIndex, 4);
      assert.equal(advancedToFinal.playbackState, "paused");
      assert.equal(rewound.activeStepIndex, 3);
      assert.equal(manualNext.activeStepIndex, 4);
      assert.equal(manualNext.playbackState, "paused");
      assert.equal(reset.activeStepIndex, 0);
      assert.equal(reset.playbackState, "paused");
    },
  },
  {
    name: "outcome badges render the observed decision vocabulary without recomputation",
    run: async () => {
      const records = await Promise.all([
        loadScenarioRecord("routine"),
        loadScenarioRecord("contested"),
        loadScenarioRecord("emergency"),
      ]);
      const observedDecisions = new Set(
        records.flatMap((record) =>
          record.scenario.steps.map((step) => step.governance.result.decision)
        )
      );
      const markup = [...observedDecisions]
        .map((decision) => renderMarkup(<OutcomeBadge decision={decision} />))
        .join("\n");

      assert.deepEqual([...observedDecisions].sort(), [
        "ALLOW",
        "BLOCK",
        "HOLD",
        "REVOKE",
        "SUPERVISE",
      ]);
      assert.equal(markup.includes("ALLOW"), true);
      assert.equal(markup.includes("SUPERVISE"), true);
      assert.equal(markup.includes("HOLD"), true);
      assert.equal(markup.includes("BLOCK"), true);
      assert.equal(markup.includes("REVOKE"), true);
    },
  },
  {
    name: "playback controls render play and pause states cleanly",
    run: () => {
      const pausedMarkup = renderMarkup(
        <PlaybackControls
          activeStepIndex={0}
          canInteract={true}
          isPlaying={false}
          onNext={() => undefined}
          onPause={() => undefined}
          onPlay={() => undefined}
          onPrevious={() => undefined}
          onReset={() => undefined}
          totalSteps={4}
        />
      );
      const playingMarkup = renderMarkup(
        <PlaybackControls
          activeStepIndex={2}
          canInteract={true}
          isPlaying={true}
          onNext={() => undefined}
          onPause={() => undefined}
          onPlay={() => undefined}
          onPrevious={() => undefined}
          onReset={() => undefined}
          totalSteps={4}
        />
      );

      assert.equal(pausedMarkup.includes(">Play<"), true);
      assert.equal(playingMarkup.includes(">Pause<"), true);
      assert.equal(pausedMarkup.includes("Step 1 / 4"), true);
      assert.equal(playingMarkup.includes("Step 3 / 4"), true);
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
