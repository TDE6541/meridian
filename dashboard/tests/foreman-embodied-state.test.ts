import assert from "node:assert/strict";
import {
  runForemanAutonomousConductor,
  type ForemanConductorReadinessInput,
} from "../src/demo/foremanAutonomousConductor.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import type { MissionStageReadinessInput } from "../src/demo/missionStageReadiness.ts";
import {
  buildMissionPhysicalProjection,
  type MissionForemanEmbodiedState,
  type MissionPhysicalProjectionV1,
} from "../src/demo/missionPhysicalProjection.ts";
import {
  deriveForemanProjectionDisplay,
  FOREMAN_EMBODIED_STATE_DISPLAY,
  FOREMAN_EMBODIED_STATE_VERSION,
  FOREMAN_EMBODIED_STATES,
  getForemanEmbodiedStateDisplay,
} from "../src/foremanGuide/foremanEmbodiedState.ts";
import { runTests } from "./scenarioTestUtils.ts";

function readyInput(
  state: MissionPlaybackState,
  overrides: Partial<
    Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId">
  > = {}
): Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId"> {
  return {
    activeStageId: state.currentStageId,
    foremanCue: {
      required: false,
      source: "d5.foreman.avatar",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d5.proof.avatar",
      status: "ready",
    },
    requiredHolds: [],
    resetCleanupOk: true,
    scenarioAvailable: true,
    substrate: {
      absence_lens: true,
      authority_panel: true,
      capture_snapshot: true,
      forensic_chain: true,
      governance_panel: true,
      public_disclosure: true,
    },
    ...overrides,
  };
}

function conductorReadyInput(
  overrides: Partial<ForemanConductorReadinessInput> = {}
): ForemanConductorReadinessInput {
  return {
    modeConsistent: true,
    presenterCockpitReady: true,
    requiredHolds: [],
    resetCleanupOk: true,
    scenarioAvailable: true,
    substrate: {
      absence_lens: true,
      authority_panel: true,
      capture_snapshot: true,
      forensic_chain: true,
      governance_panel: true,
      public_disclosure: true,
    },
    ...overrides,
  };
}

function guidedCaptureProjection(): MissionPhysicalProjectionV1 {
  const idle = createInitialMissionPlaybackState("guided");
  const running = missionPlaybackReducer(idle, {
    nowMs: 0,
    readiness: readyInput({ ...idle, currentStageId: "capture" }),
    type: "begin_mission",
  });

  return buildMissionPhysicalProjection({ playback_state: running });
}

function autonomousCaptureProjection(): MissionPhysicalProjectionV1 {
  const output = runForemanAutonomousConductor({
    nowMs: 0,
    playbackState: createInitialMissionPlaybackState("foreman_autonomous"),
    readiness: conductorReadyInput(),
  });

  return buildMissionPhysicalProjection({
    conductor_output: output,
    playback_state: output.controllerState,
  });
}

function projectionWith(
  overrides: Partial<MissionPhysicalProjectionV1["foreman"]>
): MissionPhysicalProjectionV1 {
  const projection = guidedCaptureProjection();

  return {
    ...projection,
    foreman: {
      ...projection.foreman,
      ...overrides,
    },
  };
}

await runTests([
  {
    name: "embodied state version and D4 vocabulary are pinned",
    run() {
      assert.equal(
        FOREMAN_EMBODIED_STATE_VERSION,
        "meridian.v2d.foremanEmbodiedState.v1"
      );
      assert.deepEqual(FOREMAN_EMBODIED_STATES, [
        "idle",
        "ready",
        "conducting",
        "explaining",
        "challenged",
        "holding",
        "warning",
        "blocked",
        "authority_wait",
        "proofing",
        "public_boundary",
        "resetting",
        "complete",
      ]);
    },
  },
  {
    name: "every D4 embodied state maps to a display label class and aria description",
    run() {
      for (const state of FOREMAN_EMBODIED_STATES) {
        const display = getForemanEmbodiedStateDisplay(state);

        assert.equal(display.state, state);
        assert.equal(display.label.length > 0, true, state);
        assert.equal(display.className.length > 0, true, state);
        assert.equal(display.ariaLabel.length > 0, true, state);
        assert.equal(
          ["active", "blocked", "complete", "hold", "idle", "warning"].includes(
            display.tone
          ),
          true,
          state
        );
      }
    },
  },
  {
    name: "display mapping does not add embodied states outside D4",
    run() {
      assert.deepEqual(
        Object.keys(FOREMAN_EMBODIED_STATE_DISPLAY).sort(),
        [...FOREMAN_EMBODIED_STATES].sort()
      );
    },
  },
  {
    name: "safe fallback projection renders ready demo-only no active mission state",
    run() {
      const display = deriveForemanProjectionDisplay(null);

      assert.equal(display.embodied.state, "ready");
      assert.equal(display.missionModeLabel, "Guided Mission");
      assert.equal(display.stageLabel, "No active mission");
      assert.equal(display.guideModeLabel, "No active guide mode");
      assert.equal(display.voiceLabel, "Not started");
      assert.equal(
        display.currentLine,
        "Mission physical projection is ready."
      );
    },
  },
  {
    name: "guided D4 projection displays Operator-guided mission posture",
    run() {
      const display = deriveForemanProjectionDisplay(guidedCaptureProjection());

      assert.equal(display.missionModeLabel, "Guided Mission");
      assert.equal(display.conductorPosture, "Operator-guided");
      assert.equal(display.stageLabel, "Capture (capture)");
      assert.equal(display.guideModeLabel, "Walk");
      assert.equal(display.embodied.label, "Conducting");
    },
  },
  {
    name: "Foreman Autonomous D4 projection displays conducting posture and bounded line",
    run() {
      const projection = autonomousCaptureProjection();
      const display = deriveForemanProjectionDisplay(projection);

      assert.equal(display.missionModeLabel, "Foreman Autonomous");
      assert.equal(display.conductorPosture, "Foreman is conducting");
      assert.equal(display.currentLine, projection.foreman.current_line);
      assert.equal(display.attentionTargetId, projection.foreman.attention_target_id);
    },
  },
  {
    name: "voice display maps D4 available blocked not-started and typed fallback states",
    run() {
      assert.equal(
        deriveForemanProjectionDisplay(
          projectionWith({ voice_status: "available" })
        ).voiceLabel,
        "Available"
      );
      assert.equal(
        deriveForemanProjectionDisplay(
          projectionWith({ voice_status: "blocked" })
        ).voiceLabel,
        "Blocked"
      );
      assert.equal(
        deriveForemanProjectionDisplay(
          projectionWith({ voice_status: "not_started" })
        ).voiceLabel,
        "Not started"
      );
      assert.equal(
        deriveForemanProjectionDisplay(
          projectionWith({ voice_status: "unavailable" })
        ).voiceLabel,
        "Typed fallback"
      );
    },
  },
  {
    name: "paused projection displays muted posture without requiring audio",
    run() {
      const display = deriveForemanProjectionDisplay(
        projectionWith({ paused: true, voice_status: "available" })
      );

      assert.equal(display.voiceLabel, "Muted");
      assert.equal(
        display.typedFallbackLabel,
        "Typed fallback visible for this Foreman line."
      );
    },
  },
  {
    name: "proof target summary comes from D4 spotlight target registry",
    run() {
      const display = deriveForemanProjectionDisplay(guidedCaptureProjection());

      assert.equal(display.attentionTargetId, "proof-target-capture-source-card");
      assert.equal(display.attentionTargetLabel, "Permit #4471 source card");
      assert.equal(
        display.proofTarget?.source_ref,
        "dashboard/src/demo/fictionalPermitAnchor.ts"
      );
    },
  },
  {
    name: "carried D4 holds remain visible and unresolved",
    run() {
      const display = deriveForemanProjectionDisplay(guidedCaptureProjection());

      assert.equal(display.hasCarriedHolds, true);
      assert.equal(display.hasActiveHold, false);
    },
  },
  {
    name: "active D4 holds display HOLD summary",
    run() {
      const capture = missionPlaybackReducer(createInitialMissionPlaybackState("guided"), {
        nowMs: 0,
        reason: "d5_test_hold",
        type: "hold",
      });
      const display = deriveForemanProjectionDisplay(
        buildMissionPhysicalProjection({ playback_state: capture })
      );

      assert.equal(display.hasActiveHold, true);
      assert.equal(display.activeHoldSummary, "d5_test_hold");
      assert.equal(display.embodied.state, "holding");
    },
  },
  {
    name: "all exported embodied states remain D4 mission states",
    run() {
      const expected = new Set<MissionForemanEmbodiedState>([
        "authority_wait",
        "blocked",
        "challenged",
        "complete",
        "conducting",
        "explaining",
        "holding",
        "idle",
        "proofing",
        "public_boundary",
        "ready",
        "resetting",
        "warning",
      ]);

      assert.equal(
        FOREMAN_EMBODIED_STATES.every((state) => expected.has(state)),
        true
      );
    },
  },
]);
