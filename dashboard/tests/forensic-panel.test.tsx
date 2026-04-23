import assert from "node:assert/strict";
import React from "react";
import { adaptForensicChain } from "../src/adapters/forensicAdapter.ts";
import { ForensicChainPanel } from "../src/components/ForensicChainPanel.tsx";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "forensic panel derives cumulative entries through the active step",
    run: async () => {
      const record = await loadScenarioRecord("contested");
      const timelineSteps = buildTimelineSteps(record.scenario);
      const chainView = adaptForensicChain(timelineSteps, 3);

      assert.equal(chainView.activeStepId, "C4");
      assert.equal(chainView.totalEntryCount, 7);
      assert.equal(chainView.stepEntryCount, 2);
      assert.deepEqual([...chainView.entryVocabulary].sort(), [
        "AUTHORITY_EVALUATION",
        "GOVERNANCE_DECISION",
      ]);

      const markup = renderMarkup(
        <ForensicChainPanel chainView={chainView} status="ready" />
      );

      assert.equal(markup.includes("Cumulative through active step"), true);
      assert.equal(markup.includes("contested-revoke-authority:governance"), true);
      assert.equal(markup.includes("contested-revoke-authority:authority"), true);
      assert.equal(markup.includes('data-current-step-entry="true"'), true);
    },
  },
  {
    name: "current-step forensic highlight is a delta against prior step entries",
    run: async () => {
      const record = await loadScenarioRecord("contested");
      const timelineSteps = buildTimelineSteps(record.scenario);
      const chainView = adaptForensicChain(timelineSteps, 3);
      const currentEntries = chainView.cumulativeEntries.filter(
        (entry) => entry.isCurrentStep
      );

      assert.deepEqual(
        currentEntries.map((entry) => entry.entryId),
        [
          "contested-hemphill-street-mixed-use-contested-authority:contested-revoke-authority:governance",
          "contested-hemphill-street-mixed-use-contested-authority:contested-revoke-authority:authority",
        ]
      );
    },
  },
  {
    name: "forensic panel renders truthful sparse fallback without invented vocabulary",
    run: () => {
      const emptyView = adaptForensicChain([], 0);
      const markup = renderMarkup(
        <ForensicChainPanel chainView={emptyView} status="ready" />
      );

      assert.equal(markup.includes("No forensic entries are present"), true);
      assert.equal(markup.includes("SEVERITY"), false);
      assert.equal(markup.includes("MEETING_DECISION"), false);
      assert.equal(markup.includes("PERMIT_ACTION"), false);
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
