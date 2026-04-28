import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import React from "react";
import { DemoReliabilityPanel } from "../src/components/DemoReliabilityPanel.tsx";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import {
  demoReliabilityChecklists,
  demoRunbookCues,
  walkModeFallbackState,
} from "../src/demo/demoReliability.ts";
import {
  createInitialControlRoomState,
  resetControlRoom,
  selectScenario,
  selectSkinTab,
  startPlayback,
} from "../src/state/controlRoomState.ts";
import {
  loadAllScenarioRecords,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

function collectButtons(node: React.ReactNode): React.ReactElement[] {
  if (!React.isValidElement(node)) {
    return [];
  }

  const children = React.Children.toArray(
    (node.props as { children?: React.ReactNode }).children
  );
  const nested = children.flatMap((child) => collectButtons(child));

  return node.type === "button" ? [node, ...nested] : nested;
}

function getElementText(element: React.ReactElement): string {
  return React.Children.toArray(
    (element.props as { children?: React.ReactNode }).children
  ).join("");
}

const tests = [
  {
    name: "engineer reliability panel renders reset runbook fallback and manual HOLD checklists",
    run: () => {
      const markup = renderMarkup(
        <DemoReliabilityPanel
          onResetToKnownCleanState={() => undefined}
          sharedEndpointStatus="connected"
        />
      );

      assert.equal(markup.includes('data-engineer-only="true"'), true);
      assert.equal(markup.includes('data-demo-control="engineer-clean-reset"'), true);
      assert.equal(markup.includes('data-reset-capability="available"'), true);
      assert.equal(markup.includes("Reset to clean snapshot"), true);

      for (const cue of demoRunbookCues) {
        assert.equal(markup.includes(`data-runbook-cue="${cue.key}"`), true, cue.key);
        assert.equal(markup.includes(cue.cueSentence), true, cue.key);
      }

      for (const checklist of demoReliabilityChecklists) {
        assert.equal(
          markup.includes(`data-demo-checklist="${checklist.key}"`),
          true,
          checklist.key
        );
      }

      assert.equal(markup.includes('data-walk-mode-fallback-slot="local-panel"'), true);
      assert.equal(markup.includes('data-walk-mode-fallback-proof="HOLD"'), true);
      assert.equal(markup.includes(walkModeFallbackState.summary), true);
    },
  },
  {
    name: "engineer reset button invokes known-clean reset callback",
    run: () => {
      const calls: string[] = [];
      const element = DemoReliabilityPanel({
        onResetToKnownCleanState: () => calls.push("reset"),
        sharedEndpointStatus: "connected",
      });
      const resetButton = collectButtons(element).find(
        (button) => getElementText(button) === "Reset to clean snapshot"
      );

      assert.ok(resetButton);
      resetButton.props.onClick();
      assert.deepEqual(calls, ["reset"]);
    },
  },
  {
    name: "known-clean state helpers preserve snapshot-local reset behavior",
    run: () => {
      const dirty = selectSkinTab(
        selectScenario(
          startPlayback(createInitialControlRoomState("contested"), 5),
          "emergency"
        ),
        "public"
      );
      const reset = resetControlRoom(dirty);

      assert.equal(reset.selectedScenarioKey, "emergency");
      assert.equal(reset.activeStepIndex, 0);
      assert.equal(reset.playbackState, "paused");
      assert.equal(reset.activeSkinTab, "public");
    },
  },
  {
    name: "runbook markdown carries cue sentences and manual proof HOLDs",
    run: async () => {
      const runbook = await readFile("public/demo/reliability-runbook.md", "utf8");

      for (const cue of demoRunbookCues) {
        assert.equal(runbook.includes(`"${cue.cueSentence}"`), true, cue.key);
      }

      assert.equal(runbook.includes("Manual proof status: HOLD"), true);
      assert.equal(runbook.includes("No MP4 fallback proof is claimed"), true);
      assert.equal(runbook.includes("Saturday warm-up checklist"), true);
    },
  },
  {
    name: "fallback media proof stays HOLD when no verified MP4 asset exists",
    run: async () => {
      const fileNames = await readdir("public/demo");
      const mp4Files = fileNames.filter((fileName) => fileName.endsWith(".mp4"));

      assert.equal(mp4Files.length, 0);
      assert.equal(walkModeFallbackState.assetPath, null);
      assert.equal(walkModeFallbackState.proofStatus, "HOLD");
    },
  },
  {
    name: "ControlRoomShell keeps reliability controls inside engineer cockpit",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(
        <ControlRoomShell records={records} initialPresentationMode="engineer" />
      );

      assert.equal(markup.includes('data-engineer-cockpit="visible"'), true);
      assert.equal(markup.includes('data-demo-reliability-panel="true"'), true);
      assert.equal(markup.includes('data-engineer-only="true"'), true);
      assert.equal(markup.includes("Demo Reset and Failover"), true);
    },
  },
  {
    name: "reliability sources stay dashboard-local and avoid protected imports",
    run: async () => {
      const sources = (
        await Promise.all([
          readFile("src/components/DemoReliabilityPanel.tsx", "utf8"),
          readFile("src/demo/demoReliability.ts", "utf8"),
          readFile("src/components/ControlRoomShell.tsx", "utf8"),
        ])
      ).join("\n");

      for (const forbidden of [
        "../../src/skins",
        "../../src/governance",
        "../../src/live/authority",
        "Auth0Provider",
        "new WebSocket",
        "EventSource",
        "localStorage",
        "indexedDB",
      ]) {
        assert.equal(sources.includes(forbidden), false, forbidden);
      }
    },
  },
];

await runTests(tests);
