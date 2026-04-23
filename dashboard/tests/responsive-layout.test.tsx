import assert from "node:assert/strict";
import React from "react";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { demoShortcutGroups } from "../src/demo/demoShortcuts.ts";
import { demoScenarioOrder, getDemoScenarioMeta } from "../src/demo/demoScenarios.ts";
import { loadAllScenarioRecords, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "responsive layout renders demo header, shortcut help, and projector-safe shell markers",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-responsive-shell="projector-safe"'), true);
      assert.equal(markup.includes('data-demo-header="local"'), true);
      assert.equal(markup.includes('data-shortcuts-help="visible"'), true);
      assert.equal(markup.includes("Local demo control room"), true);
      assert.equal(markup.includes("Committed Wave 8 snapshots only."), true);
      assert.equal(markup.includes("control-room-driver-stack"), true);
    },
  },
  {
    name: "responsive layout exposes truthful scenario flow and local keyboard legend",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      for (const key of demoScenarioOrder) {
        const meta = getDemoScenarioMeta(key);
        assert.equal(markup.includes(`data-scenario-key="${key}"`), true);
        assert.equal(markup.includes(meta.displayLabel), true);
        assert.equal(markup.includes(meta.description), true);
      }

      for (const group of demoShortcutGroups) {
        assert.equal(markup.includes(group.title), true);
        for (const item of group.items) {
          assert.equal(markup.includes(item.label), true);
        }
      }

      assert.equal(
        markup.includes("Suggested flow: Routine -&gt; Contested -&gt; Emergency."),
        true
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
