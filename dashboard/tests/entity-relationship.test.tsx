import assert from "node:assert/strict";
import React from "react";
import { adaptEntityRelationships } from "../src/adapters/entityRelationshipAdapter.ts";
import { EntityRelationshipGraph } from "../src/components/EntityRelationshipGraph.tsx";
import { EntityRelationshipStrip } from "../src/components/EntityRelationshipStrip.tsx";
import {
  buildTimelineSteps,
  createInitialControlRoomState,
  getActiveTimelineStep,
  selectStep,
} from "../src/state/controlRoomState.ts";
import { loadScenarioRecord, renderMarkup, runTests } from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "entity relationship indicators and graph render concrete active-step signals",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const timelineSteps = buildTimelineSteps(record.scenario);
      const state = selectStep(
        createInitialControlRoomState("routine"),
        3,
        timelineSteps.length
      );
      const activeStep = getActiveTimelineStep(timelineSteps, state);
      const view = adaptEntityRelationships(activeStep);

      assert.equal(view.hasGraph, true);
      assert.equal(
        view.nodes.some((node) => node.label === "permit:lancaster-reconstruction-001"),
        true
      );
      assert.equal(
        view.nodes.some((node) => node.label === "corridor-fw-lancaster-avenue"),
        true
      );
      assert.equal(
        view.indicators.some((indicator) =>
          indicator.value.includes("permit:lancaster-reconstruction-001")
        ),
        true
      );

      const markup = renderMarkup(
        <>
          <EntityRelationshipStrip status="ready" view={view} />
          <EntityRelationshipGraph status="ready" view={view} />
        </>
      );

      assert.equal(markup.includes("permit:lancaster-reconstruction-001"), true);
      assert.equal(markup.includes("corridor-fw-lancaster-avenue"), true);
      assert.equal(markup.includes("selected match"), true);
    },
  },
  {
    name: "entity relationship graph falls back gracefully when snapshot signals are sparse",
    run: async () => {
      const record = await loadScenarioRecord("routine");
      const timelineSteps = buildTimelineSteps(record.scenario);
      const activeStep = getActiveTimelineStep(
        timelineSteps,
        createInitialControlRoomState("routine")
      );
      assert.ok(activeStep);

      const sparseStep = {
        ...activeStep,
        selectedClauseText: null,
        step: {
          ...activeStep.step,
          governance: {
            ...activeStep.step.governance,
            request: {},
          },
          matching: {},
          skins: {
            ...activeStep.step.skins,
            outputs: {},
          },
          summary: {},
        },
      };
      const view = adaptEntityRelationships(sparseStep);
      const markup = renderMarkup(
        <>
          <EntityRelationshipStrip status="ready" view={view} />
          <EntityRelationshipGraph status="ready" view={view} />
        </>
      );

      assert.equal(view.hasGraph, false);
      assert.equal(markup.includes("Sparse snapshot"), true);
      assert.equal(markup.includes("entity:unknown"), false);
      assert.equal(markup.includes("fake"), false);
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
