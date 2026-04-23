import assert from "node:assert/strict";
import React from "react";
import { GovernanceStatePanel } from "../src/components/GovernanceStatePanel.tsx";
import { TimelinePanel } from "../src/components/TimelinePanel.tsx";
import {
  buildTimelineSteps,
  createInitialControlRoomState,
  getActiveTimelineStep,
  selectStep,
} from "../src/state/controlRoomState.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "timeline reflects actual step counts and frozen step ids for all scenarios",
    run: async () => {
      const routine = buildTimelineSteps((await loadScenarioRecord("routine")).scenario);
      const contested = buildTimelineSteps((await loadScenarioRecord("contested")).scenario);
      const emergency = buildTimelineSteps((await loadScenarioRecord("emergency")).scenario);

      assert.deepEqual(routine.map((step) => step.stepId), ["R1", "R2", "R3", "R4"]);
      assert.deepEqual(contested.map((step) => step.stepId), ["C1", "C2", "C3", "C4", "C5"]);
      assert.deepEqual(emergency.map((step) => step.stepId), ["E1", "E2", "E3", "E4", "E5"]);
      assert.equal(routine.length, 4);
      assert.equal(contested.length, 5);
      assert.equal(emergency.length, 5);
    },
  },
  {
    name: "active step changes update the timeline highlight and governance panel truth",
    run: async () => {
      const contestedRecord = await loadScenarioRecord("contested");
      const timelineSteps = buildTimelineSteps(contestedRecord.scenario);
      const activeState = selectStep(
        createInitialControlRoomState("contested"),
        3,
        timelineSteps.length
      );
      const activeStep = getActiveTimelineStep(timelineSteps, activeState);

      assert.equal(activeStep?.stepId, "C4");
      assert.equal(activeStep?.decision, "REVOKE");

      const timelineMarkup = renderMarkup(
        <TimelinePanel
          activeStepIndex={activeState.activeStepIndex}
          onSelectStep={() => undefined}
          status="ready"
          timelineSteps={timelineSteps}
        />
      );
      const governanceMarkup = renderMarkup(
        <GovernanceStatePanel currentStep={activeStep} status="ready" />
      );

      assert.equal(timelineMarkup.includes('data-step-id="C4"'), true);
      assert.equal(timelineMarkup.includes('aria-current="step"'), true);
      assert.equal(governanceMarkup.includes("authority_revoked_mid_action"), true);
      assert.equal(governanceMarkup.includes("REVOKE"), true);
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
