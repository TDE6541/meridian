import assert from "node:assert/strict";
import React from "react";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { ForemanMountPoint } from "../src/foremanGuide/ForemanMountPoint.tsx";
import { resolveDirectorBookmarks } from "../src/director/directorBookmarks.ts";
import { buildTimelineSteps } from "../src/state/controlRoomState.ts";
import {
  createTestLiveProjection,
  loadAllScenarioRecords,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "routine, contested, and emergency each expose at least one source-bounded bookmark",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const bookmarkSummary = records.map((record) => ({
        bookmarks: resolveDirectorBookmarks(
          record.entry.key,
          buildTimelineSteps(record.scenario)
        ),
        key: record.entry.key,
      }));

      assert.equal(bookmarkSummary.every((entry) => entry.bookmarks.length >= 1), true);
      assert.deepEqual(
        bookmarkSummary.map((entry) => [entry.key, entry.bookmarks[0].stepId]),
        [
          ["routine", "R2"],
          ["contested", "C2"],
          ["emergency", "E3"],
        ]
      );
    },
  },
  {
    name: "director mode toggles view-only without changing scenario, step, or skin state",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const initialControlState = {
        activeSkinTab: "public" as const,
        activeStepIndex: 3,
        selectedScenarioKey: "contested" as const,
      };

      const offMarkup = renderMarkup(
        <ControlRoomShell
          records={records}
          initialControlState={initialControlState}
          initialDirectorModeEnabled={false}
        />
      );
      const onMarkup = renderMarkup(
        <ControlRoomShell
          records={records}
          initialControlState={initialControlState}
          initialDirectorModeEnabled={true}
        />
      );

      assert.equal(offMarkup.includes("contested-hemphill-street-mixed-use-contested-authority"), true);
      assert.equal(onMarkup.includes("contested-hemphill-street-mixed-use-contested-authority"), true);
      assert.equal(offMarkup.includes("C4 (4/5)"), true);
      assert.equal(onMarkup.includes("C4 (4/5)"), true);
      assert.equal(offMarkup.includes("Public"), true);
      assert.equal(onMarkup.includes("Public"), true);
      assert.equal(offMarkup.includes("Director mode off"), true);
      assert.equal(onMarkup.includes("Director mode on"), true);
      assert.equal(offMarkup.includes("Active absence signals"), false);
      assert.equal(onMarkup.includes("Active absence signals"), true);
      assert.equal(onMarkup.includes("Authority revoked"), true);
    },
  },
  {
    name: "Foreman mount point accepts context seed and renders inert seam only",
    run: () => {
      const projection = createTestLiveProjection();
      const markup = renderMarkup(
        <ForemanMountPoint
          foremanContextSeed={projection.foreman_context_seed}
        />
      );

      assert.equal(markup.includes('data-foreman-mount="inert"'), true);
      assert.equal(markup.includes("Foreman mount point disabled"), true);
      assert.equal(markup.includes("session-a5"), true);
      assert.equal(markup.includes("Context seam only."), true);
      assert.equal(markup.includes("chat"), false);
      assert.equal(markup.includes(["vo", "ice"].join("")), false);
      assert.equal(markup.includes(["ava", "tar"].join("")), false);
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
