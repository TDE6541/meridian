import assert from "node:assert/strict";
import React from "react";
import {
  adaptStepSkinPayloads,
  getDashboardSkinView,
} from "../src/adapters/skinPayloadAdapter.ts";
import { SkinPanel } from "../src/components/SkinPanel.tsx";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const STRUCTURE_EXPECTATIONS = {
  permitting: ["permitting-ledger", "Approval signals", "Permit ledger"],
  council: ["council-briefing", "Oversight queue", "Decision and impact"],
  operations: ["operations-board", "Execution board", "Constraint queue"],
  dispatch: ["dispatch-console", "Coordination queue", "Routing notes"],
  public: ["public-bulletin", "Disclosure boundary", "Visible absence cues"],
} as const;

const tests = [
  {
    name: "five audience views stay structurally distinct over the same active-step truth",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const views = adaptStepSkinPayloads(record.scenario.steps[0]);
      const renderedStructures = new Set<string>();

      for (const [key, snippets] of Object.entries(STRUCTURE_EXPECTATIONS)) {
        const view = getDashboardSkinView(views, key as keyof typeof STRUCTURE_EXPECTATIONS);

        assert.ok(view?.payload);

        const markup = renderMarkup(
          <SkinPanel
            activeStepLabel="R1 (1/4)"
            skinView={view}
            status="ready"
          />
        );
        const structureMatch = markup.match(/data-skin-structure="([^"]+)"/);

        assert.ok(structureMatch);
        renderedStructures.add(structureMatch[1]);

        for (const snippet of snippets) {
          assert.equal(markup.includes(snippet), true);
        }
      }

      assert.equal(renderedStructures.size, 5);
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
