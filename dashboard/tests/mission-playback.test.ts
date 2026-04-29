import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FOREMAN_AUTONOMOUS_PLAYBACK_POLICY } from "../src/demo/foremanAutonomousPolicy.ts";
import {
  createInitialMissionPlaybackState,
  getMissionStagePlaybackStates,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  getForemanModeForMissionStage,
  MISSION_PLAYBACK_PLAN,
  MISSION_STAGE_IDS,
  type MissionStageId,
} from "../src/demo/missionPlaybackPlan.ts";
import {
  evaluateMissionStageReadiness,
  type MissionStageReadinessInput,
} from "../src/demo/missionStageReadiness.ts";
import { MISSION_RAIL_LABELS } from "../src/demo/missionRail.ts";
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
      source: "d1.foreman.cue",
      status: "ready",
    },
    modeConsistent: true,
    nowMs: 0,
    presenterCockpitReady: true,
    proofCue: {
      required: false,
      source: "d1.proof.cue",
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

function beginGuided(clock = new FakeMissionClock()): MissionPlaybackState {
  const idle = createInitialMissionPlaybackState("guided");
  return missionPlaybackReducer(idle, {
    nowMs: clock.now(),
    readiness: readyInput({ ...idle, currentStageId: "capture" }),
    type: "begin_mission",
  });
}

function advanceGuided(
  state: MissionPlaybackState,
  clock: FakeMissionClock
): MissionPlaybackState {
  return missionPlaybackReducer(state, {
    nowMs: clock.now(),
    readiness: readyInput(state),
    type: "advance_stage",
  });
}

function eventTypes(state: MissionPlaybackState): readonly string[] {
  return state.events.map((event) => event.type);
}

await runTests([
  {
    name: "mission plan exposes exactly six stages in locked order",
    run() {
      assert.deepEqual(MISSION_PLAYBACK_PLAN.stageOrder, [
        "capture",
        "authority",
        "governance",
        "absence",
        "chain",
        "public",
      ]);
      assert.equal(MISSION_PLAYBACK_PLAN.stages.length, 6);
      assert.deepEqual(
        MISSION_PLAYBACK_PLAN.stages.map((stage) => stage.id),
        MISSION_STAGE_IDS
      );
    },
  },
  {
    name: "stage labels align to the existing mission rail labels",
    run() {
      assert.deepEqual(
        MISSION_PLAYBACK_PLAN.stages.map((stage) => stage.label),
        MISSION_RAIL_LABELS
      );
      assert.deepEqual(
        MISSION_PLAYBACK_PLAN.stages.map((stage) => stage.foremanMode),
        ["walk", "challenge", "challenge", "absence", "walk", "public"]
      );
      assert.equal(
        MISSION_PLAYBACK_PLAN.stages
          .map((stage) => String(stage.foremanMode))
          .includes("judge"),
        false
      );
    },
  },
  {
    name: "guided mode starts idle and begins correctly",
    run() {
      const clock = new FakeMissionClock(100);
      const idle = createInitialMissionPlaybackState("guided");

      assert.equal(idle.status, "idle");
      assert.equal(idle.mode, "guided");

      const running = beginGuided(clock);

      assert.equal(running.status, "running");
      assert.equal(running.currentStageId, "capture");
      assert.equal(running.activeForemanMode, "walk");
      assert.deepEqual(eventTypes(running), ["mission_begin", "stage_enter"]);
    },
  },
  {
    name: "guided mode advances only by explicit command",
    run() {
      const clock = new FakeMissionClock();
      const running = beginGuided(clock);
      const unchanged = { ...running };

      clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs * 2);
      assert.equal(unchanged.currentStageId, "capture");

      const advanced = advanceGuided(running, clock);
      assert.equal(advanced.currentStageId, "authority");
      assert.deepEqual(advanced.completedStageIds, ["capture"]);
      assert.equal(advanced.activeForemanMode, "challenge");
    },
  },
  {
    name: "guided mode can pause and resume without duplicate stage enter",
    run() {
      const clock = new FakeMissionClock();
      const running = beginGuided(clock);
      const paused = missionPlaybackReducer(running, {
        nowMs: clock.advance(50),
        type: "pause",
      });
      const resumed = missionPlaybackReducer(paused, {
        nowMs: clock.advance(250),
        type: "resume",
      });

      assert.equal(resumed.status, "running");
      assert.equal(
        resumed.events.filter((event) => event.type === "stage_enter").length,
        1
      );
      assert.deepEqual(eventTypes(resumed), [
        "mission_begin",
        "stage_enter",
        "mission_pause",
        "mission_resume",
      ]);
    },
  },
  {
    name: "guided reset returns to clean idle lobby state",
    run() {
      const clock = new FakeMissionClock();
      const running = beginGuided(clock);
      const advanced = advanceGuided(running, clock);
      const reset = missionPlaybackReducer(advanced, {
        nowMs: clock.advance(10),
        type: "reset_mission",
      });

      assert.equal(reset.status, "idle");
      assert.equal(reset.currentStageId, null);
      assert.deepEqual(reset.completedStageIds, []);
      assert.deepEqual(reset.events, []);
      assert.equal(reset.hold, null);
      assert.notEqual(reset.runId, running.runId);
    },
  },
  {
    name: "guided second run after reset behaves like first run",
    run() {
      const clock = new FakeMissionClock();
      const first = beginGuided(clock);
      const reset = missionPlaybackReducer(first, {
        nowMs: clock.advance(20),
        type: "reset_mission",
      });
      const second = missionPlaybackReducer(reset, {
        nowMs: clock.advance(5),
        readiness: readyInput({ ...reset, currentStageId: "capture" }),
        type: "begin_mission",
      });

      assert.notEqual(second.runId, first.runId);
      assert.equal(second.currentStageId, "capture");
      assert.deepEqual(eventTypes(second), ["mission_begin", "stage_enter"]);
      assert.deepEqual(getMissionStagePlaybackStates(second).map((stage) => stage.state), [
        "active",
        "pending",
        "pending",
        "pending",
        "pending",
        "pending",
      ]);
    },
  },
  {
    name: "guided policy cannot switch mode mid-run",
    run() {
      const running = beginGuided();
      const switched = missionPlaybackReducer(running, {
        mode: "foreman_autonomous",
        nowMs: 10,
        type: "select_mode",
      });

      assert.equal(switched.mode, "guided");
      assert.equal(switched.warnings.at(-1)?.message, "mode_switch_ignored_mid_run");
    },
  },
  {
    name: "mode can switch after reset",
    run() {
      const running = beginGuided();
      const reset = missionPlaybackReducer(running, {
        nowMs: 10,
        type: "reset_mission",
      });
      const switched = missionPlaybackReducer(reset, {
        mode: "foreman_autonomous",
        nowMs: 11,
        type: "select_mode",
      });

      assert.equal(switched.status, "idle");
      assert.equal(switched.mode, "foreman_autonomous");
    },
  },
  {
    name: "invalid stage id produces HOLD readiness",
    run() {
      const result = evaluateMissionStageReadiness({
        ...readyInput(createInitialMissionPlaybackState("guided")),
        activeStageId: null,
        enteredAtMs: null,
        minDwellMs: 0,
        mode: "guided",
        stageId: "not-a-stage",
      });

      assert.equal(result.status, "hold");
      assert.deepEqual(result.holds, ["invalid_stage_id"]);
    },
  },
  {
    name: "missing required substrate produces HOLD readiness",
    run() {
      const result = evaluateMissionStageReadiness({
        ...readyInput({
          ...createInitialMissionPlaybackState("guided"),
          currentStageId: "authority",
        }),
        activeStageId: "authority",
        enteredAtMs: 0,
        minDwellMs: 0,
        mode: "guided",
        stageId: "authority",
        substrate: {
          capture_snapshot: true,
        },
      });

      assert.equal(result.status, "hold");
      assert.equal(result.holds.includes("authority_panel_readiness_missing"), true);
    },
  },
  {
    name: "optional cue failure warns and continues",
    run() {
      const result = evaluateMissionStageReadiness({
        ...readyInput({
          ...createInitialMissionPlaybackState("guided"),
          currentStageId: "public",
        }),
        activeStageId: "public",
        enteredAtMs: 0,
        minDwellMs: 0,
        mode: "guided",
        proofCue: {
          required: false,
          source: "local-muted-proof-cue",
          status: "failed",
        },
        stageId: "public",
      });

      assert.equal(result.ready, true);
      assert.equal(result.status, "ready");
      assert.equal(result.warnings[0]?.includes("optional_proof_cue_failed"), true);
    },
  },
  {
    name: "required cue failure holds",
    run() {
      const result = evaluateMissionStageReadiness({
        ...readyInput({
          ...createInitialMissionPlaybackState("guided"),
          currentStageId: "capture",
        }),
        activeStageId: "capture",
        enteredAtMs: 0,
        foremanCue: {
          required: true,
          source: "foreman-required",
          status: "failed",
        },
        minDwellMs: 0,
        mode: "guided",
        stageId: "capture",
      });

      assert.equal(result.status, "hold");
      assert.equal(result.holds.includes("required_foreman_cue_failed"), true);
    },
  },
  {
    name: "repeated advance after completed does not duplicate completion",
    run() {
      const clock = new FakeMissionClock();
      let state = beginGuided(clock);

      for (const _stage of MISSION_STAGE_IDS) {
        state = advanceGuided(state, clock);
      }

      assert.equal(state.status, "completed");
      const completionEventCount = state.events.filter(
        (event) => event.type === "mission_complete"
      ).length;
      const repeated = advanceGuided(state, clock);

      assert.equal(repeated.events.length, state.events.length);
      assert.equal(
        repeated.events.filter((event) => event.type === "mission_complete").length,
        completionEventCount
      );
    },
  },
  {
    name: "D1 source avoids stale skin render root import and model behavior strings",
    async run() {
      const files = [
        "src/demo/missionPlaybackPlan.ts",
        "src/demo/missionPlaybackController.ts",
        "src/demo/foremanAutonomousPolicy.ts",
        "src/demo/missionStageReadiness.ts",
      ];
      const contents = (
        await Promise.all(files.map((file) => readFile(file, "utf8")))
      ).join("\n");
      const forbidden = [
        ["step", "skins", "renders"].join("."),
        ["src", "skins"].join("/"),
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        ["production", "city"].join(" "),
        ["legal", "sufficiency"].join(" "),
        ["official", "Fort Worth", "workflow"].join(" "),
        ["https:", "", "api.openai"].join("/"),
        ["https:", "", "api.anthropic"].join("/"),
      ];

      for (const token of forbidden) {
        assert.equal(contents.includes(token), false, token);
      }
    },
  },
  {
    name: "skin payload adapter continues to use canonical skin outputs",
    async run() {
      const source = await readFile("src/adapters/skinPayloadAdapter.ts", "utf8");

      assert.equal(source.includes(["step", "skins", "outputs"].join(".")), true);
      assert.equal(source.includes(["step", "skins", "renders"].join(".")), false);
    },
  },
]);
