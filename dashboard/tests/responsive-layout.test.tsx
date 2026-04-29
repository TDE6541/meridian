import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { LiveConnectionBanner } from "../src/components/LiveConnectionBanner.tsx";
import {
  LiveModeToggle,
  type DashboardMode,
} from "../src/components/LiveModeToggle.tsx";
import { ControlRoomShell } from "../src/components/ControlRoomShell.tsx";
import { demoShortcutGroups } from "../src/demo/demoShortcuts.ts";
import { demoScenarioOrder, getDemoScenarioMeta } from "../src/demo/demoScenarios.ts";
import { loadAllScenarioRecords, renderMarkup, runTests } from "./scenarioTestUtils.ts";

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
    name: "responsive layout renders demo header, shortcut help, and projector-safe shell markers",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes('data-responsive-shell="projector-safe"'), true);
      assert.equal(markup.includes('data-presenter-view-default="true"'), true);
      assert.equal(markup.includes('data-current-decision-card="true"'), true);
      assert.equal(markup.includes('data-primary-action-row="presenter"'), true);
      assert.equal(markup.includes('data-secondary-proof-summary="true"'), true);
      assert.equal(markup.includes('data-demo-header="local"'), true);
      assert.equal(markup.includes('data-shortcuts-help="visible"'), true);
      assert.equal(markup.includes("Local demo control room"), true);
      assert.equal(markup.includes("Committed Wave 8 snapshots only."), true);
      assert.equal(markup.includes("control-room-driver-stack"), true);
      assert.equal(markup.includes('data-role-session-panel="true"'), true);
      assert.equal(
        markup.includes(
          'aria-label="Auth0 login unavailable; public mode remains active"'
        ),
        true
      );
    },
  },
  {
    name: "responsive CSS protects 375px judge demo panels without package dependencies",
    run: async () => {
      const styles = await readFile("src/styles.css", "utf8");

      assert.equal(styles.includes("@media (max-width: 520px)"), true);
      assert.equal(styles.includes("button:focus-visible"), true);
      assert.equal(styles.includes(".governance-card .panel-heading"), true);
      assert.equal(styles.includes(".source-ref-list span"), true);
      assert.equal(styles.includes(".foreman-guide-panel__input-row input"), true);
      assert.equal(styles.includes(".live-connection-banner"), true);
      assert.equal(styles.includes(".skin-tab"), true);
      assert.equal(styles.includes(".control-button,"), true);
      assert.equal(styles.includes(".mission-current-card__facts"), true);
      assert.equal(styles.includes(".mission-proof-tools"), true);
      assert.equal(styles.includes(".mission-playback-controls__status"), true);
      assert.equal(styles.includes(".mission-primary-actions__button"), true);
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
  {
    name: "snapshot mode is the default and live panels stay unmounted",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(<ControlRoomShell records={records} />);

      assert.equal(markup.includes("Local demo control room"), true);
      assert.equal(markup.includes("Snapshot / Live"), true);
      assert.equal(markup.includes('data-live-mode="enabled"'), false);
      assert.equal(markup.includes("Committed Wave 8 snapshots only."), true);
      assert.equal(markup.includes("routine-lancaster-avenue-corridor-reconstruction"), true);
    },
  },
  {
    name: "live mode toggle renders both modes and can request a mode change",
    run: () => {
      const selectedModes: DashboardMode[] = [];
      const element = LiveModeToggle({
        mode: "snapshot",
        onModeChange: (mode) => selectedModes.push(mode),
      });
      const markup = renderMarkup(element);
      const buttons = collectButtons(element);
      const liveButton = buttons.find((button) => getElementText(button) === "Live");

      assert.equal(markup.includes("Snapshot"), true);
      assert.equal(markup.includes("Live"), true);
      assert.equal(markup.includes('aria-pressed="true"'), true);
      assert.ok(liveButton);
      liveButton.props.onClick();
      assert.deepEqual(selectedModes, ["live"]);
    },
  },
  {
    name: "live mode enabled preserves snapshot shell and renders HOLD banner when unavailable",
    run: async () => {
      const records = await loadAllScenarioRecords();
      const markup = renderMarkup(
        <ControlRoomShell records={records} initialDashboardMode="live" />
      );

      assert.equal(markup.includes('data-live-mode="enabled"'), true);
      assert.equal(markup.includes('data-live-connection-status="disconnected"'), true);
      assert.equal(markup.includes("HOLD:"), true);
      assert.equal(markup.includes("Local demo control room"), true);
      assert.equal(markup.includes("routine-lancaster-avenue-corridor-reconstruction"), true);
    },
  },
  {
    name: "live connection banner displays connected, disconnected, and holding states",
    run: () => {
      const connected = renderMarkup(
        <LiveConnectionBanner status="connected" holdMessage={null} />
      );
      const disconnected = renderMarkup(
        <LiveConnectionBanner
          status="disconnected"
          holdMessage="HOLD: disconnected for test"
        />
      );
      const holding = renderMarkup(
        <LiveConnectionBanner status="holding" holdMessage="HOLD: held for test" />
      );
      const refreshable = renderMarkup(
        <LiveConnectionBanner
          status="disconnected"
          holdMessage="HOLD: disconnected for test"
          onRefresh={() => undefined}
        />
      );

      assert.equal(connected.includes("Live projection connected."), true);
      assert.equal(disconnected.includes('data-live-connection-status="disconnected"'), true);
      assert.equal(disconnected.includes("HOLD: disconnected for test"), true);
      assert.equal(holding.includes('data-live-connection-status="holding"'), true);
      assert.equal(holding.includes("HOLD: held for test"), true);
      assert.equal(
        refreshable.includes('aria-label="Refresh Live Mode projection status"'),
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
