import assert from "node:assert/strict";
import React from "react";
import { GovernanceStatePanel } from "../src/components/GovernanceStatePanel.tsx";
import { LiveEventRail } from "../src/components/LiveEventRail.tsx";
import { TimelinePanel } from "../src/components/TimelinePanel.tsx";
import { createDisconnectedLiveResult } from "../src/live/liveClient.ts";
import {
  resolveLiveProjectionOnce,
  startLiveProjectionPolling,
} from "../src/live/useLiveProjection.ts";
import {
  buildTimelineSteps,
  createInitialControlRoomState,
  getActiveTimelineStep,
  selectStep,
} from "../src/state/controlRoomState.ts";
import {
  createTestLiveEvent,
  createTestLiveProjection,
  loadScenarioRecord,
  renderMarkup,
  runTests,
} from "./scenarioTestUtils.ts";

const tests = [
  {
    name: "timeline reflects actual step counts and frozen step ids for all scenarios",
    run: async () => {
      const routine = buildTimelineSteps((await loadScenarioRecord("routine")).scenario);
      const contested = buildTimelineSteps((await loadScenarioRecord("contested")).scenario);
      const emergency = buildTimelineSteps((await loadScenarioRecord("emergency")).scenario);

      assert.deepEqual(routine.map((step) => step.stepId), ["R1", "R2", "R3", "R4"]);
      assert.deepEqual(contested.map((step) => step.stepId), ["C1", "C2", "C3", "C4", "C5"]);
      assert.deepEqual(emergency.map((step) => step.stepId), ["E1", "E2", "E3", "E4", "E5"]);
      assert.equal(routine.length, 4);
      assert.equal(contested.length, 5);
      assert.equal(emergency.length, 5);
    },
  },
  {
    name: "active step changes update the timeline highlight and governance panel truth",
    run: async () => {
      const contestedRecord = await loadScenarioRecord("contested");
      const timelineSteps = buildTimelineSteps(contestedRecord.scenario);
      const activeState = selectStep(
        createInitialControlRoomState("contested"),
        3,
        timelineSteps.length
      );
      const activeStep = getActiveTimelineStep(timelineSteps, activeState);

      assert.equal(activeStep?.stepId, "C4");
      assert.equal(activeStep?.decision, "REVOKE");

      const timelineMarkup = renderMarkup(
        <TimelinePanel
          activeStepIndex={activeState.activeStepIndex}
          onSelectStep={() => undefined}
          status="ready"
          timelineSteps={timelineSteps}
        />
      );
      const governanceMarkup = renderMarkup(
        <GovernanceStatePanel currentStep={activeStep} status="ready" />
      );

      assert.equal(timelineMarkup.includes('data-step-id="C4"'), true);
      assert.equal(timelineMarkup.includes('aria-current="step"'), true);
      assert.equal(governanceMarkup.includes("authority_revoked_mid_action"), true);
      assert.equal(governanceMarkup.includes("REVOKE"), true);
    },
  },
  {
    name: "live projection resolver stays disabled until Live Mode is enabled",
    run: async () => {
      let clientCalls = 0;
      const state = await resolveLiveProjectionOnce({
        client: async () => {
          clientCalls += 1;
          return {
            connection: {
              holdMessage: null,
              status: "connected",
            },
            ok: true,
            projection: createTestLiveProjection(),
          };
        },
        enabled: false,
      });

      assert.equal(clientCalls, 0);
      assert.equal(state.projection, null);
      assert.equal(state.connectionStatus, "disconnected");
    },
  },
  {
    name: "live projection resolver fetches projection and reports HOLD failures",
    run: async () => {
      let clientCalls = 0;
      const projection = createTestLiveProjection();
      const connected = await resolveLiveProjectionOnce({
        client: async () => {
          clientCalls += 1;
          return {
            connection: {
              holdMessage: null,
              status: "connected",
            },
            ok: true,
            projection,
          };
        },
        enabled: true,
      });
      const failed = await resolveLiveProjectionOnce({
        client: async () =>
          createDisconnectedLiveResult("HOLD: test disconnect"),
        enabled: true,
      });

      assert.equal(clientCalls, 1);
      assert.equal(connected.projection?.session.session_id, "session-a5");
      assert.equal(connected.connectionStatus, "connected");
      assert.equal(failed.projection, null);
      assert.equal(failed.connectionStatus, "disconnected");
      assert.equal(failed.holdMessage, "HOLD: test disconnect");
    },
  },
  {
    name: "live projection polling registers and clears timers on cleanup",
    run: async () => {
      let setIntervalCount = 0;
      let clearIntervalCount = 0;
      const controller = startLiveProjectionPolling(
        {
          client: async () => ({
            connection: {
              holdMessage: null,
              status: "connected",
            },
            ok: true,
            projection: createTestLiveProjection(),
          }),
          enabled: true,
          pollIntervalMs: 25,
        },
        () => undefined,
        {
          clearInterval: () => {
            clearIntervalCount += 1;
          },
          setInterval: () => {
            setIntervalCount += 1;
            return 7 as unknown as ReturnType<typeof setInterval>;
          },
        }
      );

      assert.equal(setIntervalCount, 1);
      controller.stop();
      assert.equal(clearIntervalCount, 1);
    },
  },
  {
    name: "live event rail renders A1-A4 and future kinds generically",
    run: () => {
      const markup = renderMarkup(
        <LiveEventRail
          events={[
            createTestLiveEvent({
              event_id: "capture",
              kind: "capture.artifact_ingested",
              title: "Capture event",
            }),
            createTestLiveEvent({
              event_id: "governance",
              kind: "governance.evaluated",
              refs: {
                absence_refs: [],
                authority_ref: null,
                entity_ids: ["entity-1"],
                evidence_ids: [],
                forensic_refs: [],
                governance_ref: "governance-ref-1",
                skin_ref: null,
              },
              sequence: 2,
              title: "Governance event",
            }),
            createTestLiveEvent({
              event_id: "absence",
              kind: "absence.finding.created",
              refs: {
                absence_refs: ["absence-ref-1"],
                authority_ref: null,
                entity_ids: ["entity-1"],
                evidence_ids: [],
                forensic_refs: [],
                governance_ref: null,
                skin_ref: null,
              },
              sequence: 3,
              severity: "HOLD",
              title: "Absence event",
            }),
            createTestLiveEvent({
              event_id: "future",
              kind: "constellation.replay.received",
              sequence: 4,
              title: "Replay received",
            }),
            createTestLiveEvent({
              event_id: "unknown",
              kind: "future.kind",
              sequence: 5,
              title: "Unknown projected event",
            }),
          ]}
        />
      );

      assert.equal(markup.includes('data-live-event-kind="capture.artifact_ingested"'), true);
      assert.equal(markup.includes('data-live-event-kind="governance.evaluated"'), true);
      assert.equal(markup.includes('data-live-event-kind="absence.finding.created"'), true);
      assert.equal(markup.includes('data-live-event-kind="constellation.replay.received"'), true);
      assert.equal(markup.includes('data-live-event-generic="true"'), true);
      assert.equal(markup.includes("absence=absence-ref-1"), true);
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
