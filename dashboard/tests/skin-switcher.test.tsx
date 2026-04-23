import assert from "node:assert/strict";
import React from "react";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
} from "../src/adapters/skinPayloadAdapter.ts";
import { SkinPanel } from "../src/components/SkinPanel.tsx";
import { SkinSwitcher } from "../src/components/SkinSwitcher.tsx";
import {
  buildTimelineSteps,
  createInitialControlRoomState,
  getActiveTimelineStep,
  selectSkinTab,
  selectStep,
} from "../src/state/controlRoomState.ts";
import {
  loadAllScenarioRecords,
  loadScenarioRecord,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

const EXPECTED_SKIN_KEYS = [
  "permitting",
  "council",
  "operations",
  "dispatch",
  "public",
] as const;

const tests = [
  {
    name: "skin switcher renders all five tabs across every frozen scenario",
    run: async () => {
      const records = await loadAllScenarioRecords();

      for (const record of records) {
        for (const step of record.scenario.steps) {
          const views = adaptStepSkinPayloads(step);

          assert.deepEqual(
            views.map((view) => view.key),
            EXPECTED_SKIN_KEYS
          );
          assert.equal(
            views.every((view) => view.payload !== null),
            true
          );
        }

        const firstStepViews = adaptStepSkinPayloads(record.scenario.steps[0]);
        const markup = renderMarkup(
          <SkinSwitcher
            activeSkinTab="permitting"
            onSelect={() => undefined}
            status="ready"
            views={firstStepViews}
          />
        );

        for (const key of EXPECTED_SKIN_KEYS) {
          assert.equal(markup.includes(`data-skin-tab="${key}"`), true);
        }
      }
    },
  },
  {
    name: "skin switching preserves the active scenario and step while changing the panel",
    run: async () => {
      const record = await loadScenarioRecord("contested");
      const timelineSteps = buildTimelineSteps(record.scenario);
      const stepState = selectStep(
        createInitialControlRoomState("contested"),
        3,
        timelineSteps.length
      );
      const switchedState = selectSkinTab(stepState, "public");
      const activeStep = getActiveTimelineStep(timelineSteps, switchedState);

      assert.equal(switchedState.selectedScenarioKey, "contested");
      assert.equal(switchedState.activeStepIndex, 3);
      assert.equal(switchedState.activeSkinTab, "public");
      assert.ok(activeStep);

      const views = adaptStepSkinPayloads(activeStep.step);
      const permittingView = getDashboardSkinView(views, "permitting");
      const publicView = getDashboardSkinView(views, "public");

      assert.ok(permittingView?.payload);
      assert.ok(publicView?.payload);

      const permittingMarkup = renderMarkup(
        <SkinPanel
          activeStepLabel="C4 (4/5)"
          skinView={permittingView}
          status="ready"
        />
      );
      const publicMarkup = renderMarkup(
        <SkinPanel
          activeStepLabel="C4 (4/5)"
          skinView={publicView}
          status="ready"
        />
      );

      assert.equal(
        permittingMarkup.includes(permittingView?.sections[0]?.title ?? ""),
        true
      );
      assert.equal(
        publicMarkup.includes(publicView?.redactions[0]?.marker ?? ""),
        true
      );
      assert.notEqual(permittingMarkup, publicMarkup);
      assert.equal(
        permittingView?.truthFingerprint?.digest,
        activeStep.step.skins.outputs?.permitting?.truthFingerprint?.digest
      );
      assert.equal(
        publicView?.truthFingerprint?.digest,
        activeStep.step.skins.outputs?.public?.truthFingerprint?.digest
      );
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
