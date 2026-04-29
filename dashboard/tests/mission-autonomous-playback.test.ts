import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  FOREMAN_AUTONOMOUS_PLAYBACK_POLICY,
} from "../src/demo/foremanAutonomousPolicy.ts";
import {
  createInitialMissionPlaybackState,
  getMissionStagePlaybackStates,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  getForemanModeForMissionStage,
  MISSION_STAGE_IDS,
  type MissionStageId,
} from "../src/demo/missionPlaybackPlan.ts";
import {
  evaluateMissionStageReadiness,
  type MissionStageReadinessInput,
} from "../src/demo/missionStageReadiness.ts";
import { runTests } from "./scenarioTestUtils.ts";

class FakeMissionClock {
  private currentMs: number;

  constructor(startMs = 0) {
    this.currentMs = startMs;
  }

  advance(ms: number): number {
    this.currentMs += ms;
    return this.currentMs;
  }

  now(): number {
    return this.currentMs;
  }
}

function readyInput(
  state: MissionPlaybackState,
  overrides: Partial<
    Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId">
  > = {}
): Omit<MissionStageReadinessInput, "enteredAtMs" | "minDwellMs" | "mode" | "stageId"> {
  return {
    activeStageId: state.currentStageId,
    foremanCue: {
      required: true,
      source: "d1.autonomous.foreman.cue",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d1.autonomous.proof.cue",
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

function beginAutonomous(clock = new FakeMissionClock()): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState("foreman_autonomous");

  return missionPlaybackReducer(idle, {
    nowMs: clock.now(),
    readiness: readyInput({ ...idle, currentStageId: "capture" }),
    type: "begin_mission",
  });
}

function tickAutonomous(
  state: MissionPlaybackState,
  clock: FakeMissionClock
): MissionPlaybackState {
  return missionPlaybackReducer(state, {
    nowMs: clock.now(),
    readiness: readyInput(state),
    type: "autonomous_tick",
  });
}

function eventCount(state: MissionPlaybackState, type: string): number {
  return state.events.filter((event) => event.type === type).length;
}

await runTests([
  {
    name: "autonomous policy exposes bounded deterministic shape",
    run() {
      assert.equal(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.mode, "foreman_autonomous");
      assert.deepEqual(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.stageOrder, MISSION_STAGE_IDS);
      assert.equal(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.optionalCueFailureBehavior, "warn_and_continue");
      assert.equal(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.requiredCueFailureBehavior, "hold");
      assert.equal(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.voiceIsOptional, true);
      assert.equal(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.operatorCanPause, true);
      assert.equal(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.operatorCanReset, true);
    },
  },
  {
    name: "autonomous mode starts idle and begins correctly",
    run() {
      const clock = new FakeMissionClock();
      const idle = createInitialMissionPlaybackState("foreman_autonomous");
      const running = beginAutonomous(clock);

      assert.equal(idle.status, "idle");
      assert.equal(running.status, "running");
      assert.equal(running.currentStageId, "capture");
      assert.equal(running.activeForemanMode, "walk");
      assert.equal(eventCount(running, "stage_enter"), 1);
    },
  },
  {
    name: "autonomous mode advances stages through policy readiness",
    run() {
      const clock = new FakeMissionClock();
      let state = beginAutonomous(clock);

      for (const stageId of MISSION_STAGE_IDS) {
        assert.equal(state.currentStageId, stageId);
        clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs);
        state = tickAutonomous(state, clock);
      }

      assert.equal(state.status, "completed");
      assert.deepEqual(state.completedStageIds, MISSION_STAGE_IDS);
      assert.equal(eventCount(state, "mission_complete"), 1);
    },
  },
  {
    name: "autonomous mode respects minimum dwell under fake timers",
    run() {
      const clock = new FakeMissionClock();
      const running = beginAutonomous(clock);
      const early = tickAutonomous(
        running,
        new FakeMissionClock(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs - 1)
      );

      assert.equal(early.currentStageId, "capture");
      assert.deepEqual(early.completedStageIds, []);

      clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs);
      const advanced = tickAutonomous(running, clock);
      assert.equal(advanced.currentStageId, "authority");
      assert.deepEqual(advanced.completedStageIds, ["capture"]);
    },
  },
  {
    name: "autonomous pause and resume avoid timer drift",
    run() {
      const clock = new FakeMissionClock();
      const running = beginAutonomous(clock);
      const paused = missionPlaybackReducer(running, {
        nowMs: clock.advance(600),
        type: "pause",
      });
      const resumed = missionPlaybackReducer(paused, {
        nowMs: clock.advance(10_000),
        type: "resume",
      });
      const stillWaiting = tickAutonomous(
        resumed,
        new FakeMissionClock(clock.advance(500))
      );

      assert.equal(stillWaiting.currentStageId, "capture");
      assert.deepEqual(stillWaiting.completedStageIds, []);

      const advanced = tickAutonomous(
        resumed,
        new FakeMissionClock(clock.advance(100))
      );
      assert.equal(advanced.currentStageId, "authority");
      assert.equal(eventCount(advanced, "stage_enter"), 2);
    },
  },
  {
    name: "autonomous reset clears timer cue stage and hold state",
    run() {
      const clock = new FakeMissionClock();
      const running = beginAutonomous(clock);
      const held = missionPlaybackReducer(running, {
        nowMs: clock.advance(10),
        reason: "manual_hold",
        type: "hold",
      });
      const reset = missionPlaybackReducer(held, {
        nowMs: clock.advance(10),
        type: "reset_mission",
      });

      assert.equal(reset.status, "idle");
      assert.equal(reset.currentStageId, null);
      assert.equal(reset.stageEnteredAtMs, null);
      assert.equal(reset.hold, null);
      assert.deepEqual(reset.events, []);
      assert.deepEqual(reset.warnings, []);
      assert.notEqual(reset.runId, running.runId);
    },
  },
  {
    name: "autonomous second run after reset behaves like first run",
    run() {
      const clock = new FakeMissionClock();
      const first = beginAutonomous(clock);
      const reset = missionPlaybackReducer(first, {
        nowMs: clock.advance(30),
        type: "reset_mission",
      });
      const second = missionPlaybackReducer(reset, {
        nowMs: clock.advance(5),
        readiness: readyInput({ ...reset, currentStageId: "capture" }),
        type: "begin_mission",
      });

      assert.equal(second.status, "running");
      assert.equal(second.mode, "foreman_autonomous");
      assert.equal(second.currentStageId, "capture");
      assert.notEqual(second.runId, first.runId);
      assert.equal(eventCount(second, "stage_enter"), 1);
    },
  },
  {
    name: "autonomous policy cannot switch mode mid-run",
    run() {
      const running = beginAutonomous();
      const switched = missionPlaybackReducer(running, {
        mode: "guided",
        nowMs: 20,
        type: "select_mode",
      });

      assert.equal(switched.mode, "foreman_autonomous");
      assert.equal(switched.warnings.at(-1)?.message, "mode_switch_ignored_mid_run");
    },
  },
  {
    name: "autonomous active Foreman mode derives from each stage",
    run() {
      const mapping: Record<MissionStageId, string> = {
        absence: "absence",
        authority: "challenge",
        capture: "walk",
        chain: "walk",
        governance: "challenge",
        public: "public",
      };

      for (const stageId of MISSION_STAGE_IDS) {
        assert.equal(getForemanModeForMissionStage(stageId), mapping[stageId]);
      }
    },
  },
  {
    name: "mode inconsistency produces HOLD readiness",
    run() {
      const result = evaluateMissionStageReadiness({
        ...readyInput({
          ...createInitialMissionPlaybackState("foreman_autonomous"),
          currentStageId: "governance",
        }),
        activeStageId: "governance",
        enteredAtMs: 0,
        minDwellMs: 0,
        mode: "foreman_autonomous",
        modeConsistent: false,
        stageId: "governance",
      });

      assert.equal(result.status, "hold");
      assert.equal(result.holds.includes("mode_state_inconsistent"), true);
    },
  },
  {
    name: "reset cleanup failure produces HOLD",
    run() {
      const running = beginAutonomous();
      const failed = missionPlaybackReducer(running, {
        cleanupOk: false,
        nowMs: 10,
        type: "reset_mission",
      });

      assert.equal(failed.status, "holding");
      assert.equal(failed.hold?.reason, "reset_cleanup_failed");
    },
  },
  {
    name: "repeated autonomous tick after completion does not duplicate completion",
    run() {
      const clock = new FakeMissionClock();
      let state = beginAutonomous(clock);

      for (const _stage of MISSION_STAGE_IDS) {
        clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs);
        state = tickAutonomous(state, clock);
      }

      const repeated = tickAutonomous(state, clock);

      assert.equal(repeated.events.length, state.events.length);
      assert.equal(eventCount(repeated, "mission_complete"), 1);
      assert.deepEqual(repeated.completedStageIds, MISSION_STAGE_IDS);
    },
  },
  {
    name: "autonomous stage state projection stays deterministic",
    run() {
      const clock = new FakeMissionClock();
      const running = beginAutonomous(clock);
      const states = getMissionStagePlaybackStates(running);

      assert.deepEqual(
        states.map((stage) => [stage.id, stage.state, stage.foremanMode]),
        [
          ["capture", "active", "walk"],
          ["authority", "pending", "challenge"],
          ["governance", "pending", "challenge"],
          ["absence", "pending", "absence"],
          ["chain", "pending", "walk"],
          ["public", "pending", "public"],
        ]
      );
    },
  },
  {
    name: "autonomous source avoids external behavior tokens",
    async run() {
      const source = await readFile("src/demo/missionPlaybackController.ts", "utf8");
      const policy = await readFile("src/demo/foremanAutonomousPolicy.ts", "utf8");
      const combined = `${source}\n${policy}`;
      const forbidden = [
        ["fetch", "https"].join("("),
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        ["Whisper", "upload"].join(" "),
        ["OpenFGA"].join(""),
        ["CIBA"].join(""),
        ["notification", "delivered"].join(" "),
        ["root", "ForensicChain"].join(" "),
      ];

      for (const token of forbidden) {
        assert.equal(combined.includes(token), false, token);
      }
    },
  },
]);
