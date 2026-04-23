import assert from "node:assert/strict";
import React from "react";
import { adaptCascadeChoreography } from "../src/adapters/cascadeChoreographyAdapter.ts";
import { adaptForensicChain } from "../src/adapters/forensicAdapter.ts";
import { adaptStepSkinPayloads } from "../src/adapters/skinPayloadAdapter.ts";
import { CascadeChoreography } from "../src/components/CascadeChoreography.tsx";
import {
  buildTimelineSteps,
  createInitialControlRoomState,
  getActiveTimelineStep,
  selectStep,
} from "../src/state/controlRoomState.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "cascade choreography renders governance authority forensic skin update order",
    run: async () => {
      const record = await loadScenarioRecord("contested");
      const timelineSteps = buildTimelineSteps(record.scenario);
      const state = selectStep(
        createInitialControlRoomState("contested"),
        3,
        timelineSteps.length
      );
      const activeStep = getActiveTimelineStep(timelineSteps, state);
      assert.ok(activeStep);

      const forensicChain = adaptForensicChain(timelineSteps, state.activeStepIndex);
      const skinViews = adaptStepSkinPayloads(activeStep.step);
      const view = adaptCascadeChoreography(activeStep, forensicChain, skinViews);

      assert.deepEqual(
        view.stages.map((stage) => stage.label),
        ["governance", "authority", "forensic", "skin update"]
      );
      assert.equal(view.stages[0].value, "REVOKE");
      assert.equal(view.stages[2].detail.includes("2 current-step entries"), true);
      assert.equal(view.stages[3].value, "5 frozen outputs");

      const markup = renderMarkup(
        <CascadeChoreography status="ready" view={view} />
      );
      const governanceIndex = markup.indexOf("governance");
      const authorityIndex = markup.indexOf("authority");
      const forensicIndex = markup.indexOf("forensic");
      const skinIndex = markup.indexOf("skin update");

      assert.equal(governanceIndex >= 0, true);
      assert.equal(authorityIndex > governanceIndex, true);
      assert.equal(forensicIndex > authorityIndex, true);
      assert.equal(skinIndex > forensicIndex, true);
    },
  },
  {
    name: "cascade choreography uses actual step data without live broker implication language",
    run: async () => {
      const record = await loadScenarioRecord("emergency");
      const timelineSteps = buildTimelineSteps(record.scenario);
      const state = selectStep(
        createInitialControlRoomState("emergency"),
        1,
        timelineSteps.length
      );
      const activeStep = getActiveTimelineStep(timelineSteps, state);
      assert.ok(activeStep);

      const view = adaptCascadeChoreography(
        activeStep,
        adaptForensicChain(timelineSteps, state.activeStepIndex),
        adaptStepSkinPayloads(activeStep.step)
      );
      const markup = renderMarkup(
        <CascadeChoreography status="ready" view={view} />
      );
      const lowerMarkup = markup.toLowerCase();

      assert.equal(markup.includes("authority_and_evidence_resolved"), true);
      assert.equal(markup.includes("AUTHORITY_EVALUATION"), true);
      assert.equal(lowerMarkup.includes("broker"), false);
      assert.equal(lowerMarkup.includes("nats"), false);
      assert.equal(lowerMarkup.includes("streaming"), false);
      assert.equal(lowerMarkup.includes("daemon"), false);
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
