import assert from "node:assert/strict";
import React from "react";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
} from "../src/adapters/skinPayloadAdapter.ts";
import { SkinPanel } from "../src/components/SkinPanel.tsx";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "public panel surfaces actual redactions, disclosure holds, and fallback text",
    run: async () => {
      const record = await loadScenarioRecord("contested");
      const publicView = getDashboardSkinView(
        adaptStepSkinPayloads(record.scenario.steps[3]),
        "public"
      );

      assert.ok(publicView?.payload);
      assert.equal(publicView?.redactions.length > 0, true);
      assert.equal(publicView?.absences.length > 0, true);
      assert.equal(publicView?.isFallbackActive, true);

      const markup = renderMarkup(
        <SkinPanel
          activeStepLabel="C4 (4/5)"
          skinView={publicView}
          status="ready"
        />
      );
      const lowerMarkup = markup.toLowerCase();

      assert.equal(markup.includes(publicView?.redactions[0]?.marker ?? ""), true);
      assert.equal(markup.includes(publicView?.redactions[0]?.text ?? ""), true);
      assert.equal(markup.includes(publicView?.absences[0]?.displayText ?? ""), true);
      assert.equal(markup.includes(publicView?.fallback?.message ?? ""), true);
      assert.equal(lowerMarkup.includes("legal sufficiency"), false);
      assert.equal(lowerMarkup.includes("attorney review"), false);
      assert.equal(lowerMarkup.includes("compliance certified"), false);
    },
  },
  {
    name: "public panel does not invent disclosure holds when the snapshot has none",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const publicView = getDashboardSkinView(
        adaptStepSkinPayloads(record.scenario.steps[0]),
        "public"
      );

      assert.ok(publicView?.payload);
      assert.equal(publicView?.absences.length, 0);
      assert.equal(publicView?.isFallbackActive, false);

      const markup = renderMarkup(
        <SkinPanel
          activeStepLabel="R1 (1/4)"
          skinView={publicView}
          status="ready"
        />
      );

      assert.equal(markup.includes("No disclosure holds are present on this step."), true);
      assert.equal(markup.includes("Fallback visible."), false);
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
