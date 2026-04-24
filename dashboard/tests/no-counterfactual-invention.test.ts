import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import React from "react";
import { adaptAbsenceSignals } from "../src/adapters/absenceSignalAdapter.ts";
import { adaptForensicChain } from "../src/adapters/forensicAdapter.ts";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
  type DashboardSkinKey,
} from "../src/adapters/skinPayloadAdapter.ts";
import { DirectorCueCard } from "../src/components/director/DirectorCueCard.tsx";
import { JudgeCuePanel } from "../src/components/director/JudgeCuePanel.tsx";
import { PreventedActionCard } from "../src/components/director/PreventedActionCard.tsx";
import { resolveDirectorBookmarks } from "../src/director/directorBookmarks.ts";
import { buildDirectorScene } from "../src/director/directorScript.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import type { ScenarioKey } from "../src/types/scenario.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

async function buildDirectorMarkup(
  scenarioKey: ScenarioKey,
  stepIndex: number,
  activeSkinKey: DashboardSkinKey
) {
  const record = await loadScenarioRecord(scenarioKey);
  const timelineSteps = buildTimelineSteps(record.scenario);
  const currentStep = timelineSteps[stepIndex];
  assert.ok(currentStep);

  const skinViews = adaptStepSkinPayloads(currentStep.step);
  const activeSkinView = getDashboardSkinView(skinViews, activeSkinKey) ?? null;
  const lens = adaptAbsenceSignals({
    activeSkinView,
    currentStep,
    forensicChain: adaptForensicChain(timelineSteps, stepIndex),
    skinViews,
  });
  const scene = buildDirectorScene({
    bookmarks: resolveDirectorBookmarks(scenarioKey, timelineSteps),
    currentStep,
    signals: lens.signals,
  });

  return renderMarkup(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(DirectorCueCard, { cue: scene.cueCard }),
      React.createElement(JudgeCuePanel, { panel: scene.judgePanel }),
      React.createElement(PreventedActionCard, { card: scene.preventedAction })
    )
  );
}

const tests = [
  {
    name: "judge-safe cue text avoids speculative or legal overclaim language",
    run: async () => {
      const markup = (await buildDirectorMarkup("contested", 3, "public")).toLowerCase();

      assert.equal(markup.includes("lawsuit"), false);
      assert.equal(markup.includes("compliance"), false);
      assert.equal(markup.includes("catastrophe"), false);
      assert.equal(markup.includes("prove"), false);
      assert.equal(markup.includes("would have"), false);
      assert.equal(markup.includes("legal sufficiency"), false);
    },
  },
  {
    name: "director cues do not invent revoked or blocked consequences when those signals are absent",
    run: async () => {
      const markup = await buildDirectorMarkup("routine", 0, "public");
      const lowerMarkup = markup.toLowerCase();

      assert.equal(lowerMarkup.includes("authority was revoked"), false);
      assert.equal(lowerMarkup.includes("stayed blocked in this lane"), false);
      assert.equal(lowerMarkup.includes("proposed creation signal"), false);
      assert.equal(lowerMarkup.includes("no prevented-action signal is active on this step"), true);
    },
  },
  {
    name: "rendered director surfaces include source citation paths for active signals",
    run: async () => {
      const markup = await buildDirectorMarkup("contested", 3, "public");

      assert.equal(
        markup.includes("step.governance.result.runtimeSubset.civic.revocation.reason"),
        true
      );
      assert.equal(
        markup.includes(
          "runtimeSubset.civic:step.governance.result.runtimeSubset.civic.revocation.reason"
        ),
        true
      );
    },
  },
  {
    name: "live components render projection fields without root runtime imports",
    run: async () => {
      const files = [
        "src/components/LiveCapturePanel.tsx",
        "src/components/LiveEventRail.tsx",
        "src/components/LiveConnectionBanner.tsx",
        "src/foremanGuide/ForemanMountPoint.tsx",
      ];
      const source = (
        await Promise.all(
          files.map((file) => readFile(path.resolve(process.cwd(), file), "utf8"))
        )
      ).join("\n");
      const rootLiveImport = ["../..", "src", "live"].join("/");
      const rootSkinsImport = ["../..", "src", "skins"].join("/");

      assert.equal(source.includes(rootLiveImport), false);
      assert.equal(source.includes(rootSkinsImport), false);
      assert.equal(source.includes("evaluateGovernanceRequest"), false);
      assert.equal(source.includes("evaluateLiveAbsence"), false);
      assert.equal(source.includes("createLiveGovernanceGateway"), false);
      assert.equal(source.includes("createDashboardLiveProjectionV1"), false);
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
