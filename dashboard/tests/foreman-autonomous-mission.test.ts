import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  FOREMAN_AUTONOMOUS_PLAYBACK_POLICY,
} from "../src/demo/foremanAutonomousPolicy.ts";
import {
  createInitialMissionPlaybackState,
  missionPlaybackReducer,
  type MissionPlaybackState,
} from "../src/demo/missionPlaybackController.ts";
import {
  runForemanAutonomousConductor,
  type ForemanAutonomousConductorOutput,
  type ForemanConductorReadinessInput,
  type ForemanCueRuntimeState,
} from "../src/demo/foremanAutonomousConductor.ts";
import {
  FOREMAN_MISSION_CUE_MANIFEST,
  validateForemanMissionCueManifest,
} from "../src/demo/foremanMissionCues.ts";
import {
  MISSION_STAGE_FOREMAN_MODE,
  MISSION_STAGE_IDS,
  type MissionStageId,
} from "../src/demo/missionPlaybackPlan.ts";
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

function conduct({
  clock,
  conductor,
  cueRuntime,
  playback,
  readiness = readyInput(),
}: {
  clock: FakeMissionClock;
  conductor?: ForemanAutonomousConductorOutput;
  cueRuntime?: Partial<Record<MissionStageId, ForemanCueRuntimeState>>;
  playback?: MissionPlaybackState;
  readiness?: ForemanConductorReadinessInput | null;
}): ForemanAutonomousConductorOutput {
  return runForemanAutonomousConductor({
    conductorState: conductor?.conductorState,
    cueRuntime,
    nowMs: clock.now(),
    playbackState:
      playback ??
      conductor?.controllerState ??
      createInitialMissionPlaybackState("foreman_autonomous"),
    readiness,
  });
}

function eventCount(state: MissionPlaybackState, type: string): number {
  return state.events.filter((event) => event.type === type).length;
}

async function readD2Source(): Promise<string> {
  return (
    await Promise.all([
      readFile("src/demo/foremanAutonomousConductor.ts", "utf8"),
      readFile("src/demo/foremanMissionCues.ts", "utf8"),
    ])
  ).join("\n");
}

await runTests([
  {
    name: "conductor rejects non-autonomous mode with HOLD",
    run() {
      const output = runForemanAutonomousConductor({
        nowMs: 0,
        playbackState: createInitialMissionPlaybackState("guided"),
        readiness: readyInput(),
      });

      assert.equal(output.status, "holding");
      assert.equal(output.holds.includes("playback_mode_not_foreman_autonomous"), true);
      assert.equal(output.nextControllerCommand.type, "hold");
    },
  },
  {
    name: "cue manifest loads all six locked stages",
    run() {
      assert.equal(validateForemanMissionCueManifest().ok, true);
      assert.deepEqual(
        FOREMAN_MISSION_CUE_MANIFEST.map((cue) => cue.stageId),
        MISSION_STAGE_IDS
      );
    },
  },
  {
    name: "cue ids are unique",
    run() {
      const cueIds = FOREMAN_MISSION_CUE_MANIFEST.map((cue) => cue.cueId);

      assert.equal(new Set(cueIds).size, cueIds.length);
    },
  },
  {
    name: "each stage maps to the correct Foreman guide mode",
    run() {
      for (const cue of FOREMAN_MISSION_CUE_MANIFEST) {
        assert.equal(cue.foremanMode, MISSION_STAGE_FOREMAN_MODE[cue.stageId]);
      }

      assert.deepEqual(
        FOREMAN_MISSION_CUE_MANIFEST.map((cue) => cue.foremanMode),
        ["walk", "challenge", "challenge", "absence", "walk", "public"]
      );
    },
  },
  {
    name: "each stage has typed fallback text",
    run() {
      for (const cue of FOREMAN_MISSION_CUE_MANIFEST) {
        assert.equal(cue.typedFallbackText.trim().length > 0, true);
      }
    },
  },
  {
    name: "each stage has an attention target hint",
    run() {
      for (const cue of FOREMAN_MISSION_CUE_MANIFEST) {
        assert.equal(cue.attentionTargetHint.startsWith("mission."), true);
      }
    },
  },
  {
    name: "conductor emits first cue on autonomous start",
    run() {
      const output = conduct({ clock: new FakeMissionClock() });

      assert.equal(output.status, "cue_emitted");
      assert.equal(output.currentStageId, "capture");
      assert.equal(output.currentCueId, "foreman-cue-capture");
      assert.equal(output.foremanGuideMode, "walk");
      assert.equal((output.cueEvent?.typedFallbackText ?? "").length > 0, true);
      assert.equal(output.controllerState.status, "running");
      assert.equal(output.nextControllerCommand.type, "begin_mission");
    },
  },
  {
    name: "conductor does not duplicate cue on pause and resume",
    run() {
      const clock = new FakeMissionClock();
      const started = conduct({ clock });
      const paused = missionPlaybackReducer(started.controllerState, {
        nowMs: clock.advance(100),
        type: "pause",
      });
      const pausedOutput = conduct({
        clock,
        conductor: started,
        playback: paused,
        readiness: null,
      });
      const resumed = missionPlaybackReducer(pausedOutput.controllerState, {
        nowMs: clock.advance(500),
        type: "resume",
      });
      const resumedOutput = conduct({
        clock,
        conductor: pausedOutput,
        playback: resumed,
      });

      assert.equal(pausedOutput.status, "paused");
      assert.equal(pausedOutput.cueEvent, null);
      assert.equal(resumedOutput.cueEvent, null);
      assert.deepEqual(resumedOutput.conductorState.emittedCueIds, [
        "foreman-cue-capture",
      ]);
    },
  },
  {
    name: "conductor respects paused state",
    run() {
      const clock = new FakeMissionClock();
      const started = conduct({ clock });
      const paused = missionPlaybackReducer(started.controllerState, {
        nowMs: clock.advance(100),
        type: "pause",
      });
      const output = conduct({
        clock,
        conductor: started,
        playback: paused,
        readiness: null,
      });

      assert.equal(output.status, "paused");
      assert.equal(output.nextControllerCommand.type, "none");
      assert.equal(output.controllerState.currentStageId, "capture");
      assert.equal(eventCount(output.controllerState, "stage_complete"), 0);
    },
  },
  {
    name: "conductor advances after dwell and readiness pass",
    run() {
      const clock = new FakeMissionClock();
      const started = conduct({ clock });

      clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs);
      const advanced = conduct({ clock, conductor: started });

      assert.equal(advanced.status, "advanced");
      assert.equal(advanced.controllerState.currentStageId, "authority");
      assert.deepEqual(advanced.controllerState.completedStageIds, ["capture"]);
      assert.equal(advanced.nextControllerCommand.type, "autonomous_tick");
    },
  },
  {
    name: "conductor does not advance before dwell and readiness pass",
    run() {
      const clock = new FakeMissionClock();
      const started = conduct({ clock });

      clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs - 1);
      const waiting = conduct({ clock, conductor: started });

      assert.equal(waiting.status, "waiting");
      assert.equal(waiting.controllerState.currentStageId, "capture");
      assert.deepEqual(waiting.controllerState.completedStageIds, []);
      assert.equal(waiting.nextControllerCommand.type, "none");
    },
  },
  {
    name: "conductor emits warning and continues for optional cue failure",
    run() {
      const clock = new FakeMissionClock();
      const started = conduct({
        clock,
        cueRuntime: {
          capture: {
            voiceStatus: "available",
          },
        },
      });

      clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs);
      const advanced = conduct({
        clock,
        conductor: started,
        cueRuntime: {
          capture: {
            proofCueStatus: "failed",
            voiceStatus: "available",
          },
        },
      });

      assert.equal(advanced.status, "advanced");
      assert.equal(
        advanced.warnings.some((warning) =>
          warning.includes("optional_proof_cue_failed")
        ),
        true
      );
      assert.equal(advanced.holds.length, 0);
    },
  },
  {
    name: "conductor emits HOLD for required cue failure",
    run() {
      const output = conduct({
        clock: new FakeMissionClock(),
        cueRuntime: {
          capture: {
            foremanCueStatus: "failed",
          },
        },
      });

      assert.equal(output.status, "holding");
      assert.equal(output.holds.includes("required_foreman_cue_failed"), true);
      assert.equal(output.cueEvent, null);
    },
  },
  {
    name: "conductor emits HOLD for invalid active stage",
    run() {
      const clock = new FakeMissionClock();
      const started = conduct({ clock });
      const invalid = {
        ...started.controllerState,
        currentStageId: "not-a-stage" as MissionStageId,
      };
      const output = conduct({
        clock,
        conductor: started,
        playback: invalid,
      });

      assert.equal(output.status, "holding");
      assert.equal(output.holds.includes("invalid_stage_id"), true);
    },
  },
  {
    name: "conductor emits HOLD for missing cue manifest entry",
    run() {
      const output = runForemanAutonomousConductor({
        cueManifest: FOREMAN_MISSION_CUE_MANIFEST.filter(
          (cue) => cue.stageId !== "capture"
        ),
        nowMs: 0,
        playbackState: createInitialMissionPlaybackState("foreman_autonomous"),
        readiness: readyInput(),
      });

      assert.equal(output.status, "holding");
      assert.equal(output.holds.includes("stage_cue_missing:capture"), true);
    },
  },
  {
    name: "conductor emits HOLD for missing required readiness",
    run() {
      const output = conduct({
        clock: new FakeMissionClock(),
        readiness: null,
      });

      assert.equal(output.status, "holding");
      assert.deepEqual(output.holds, ["required_readiness_missing"]);
    },
  },
  {
    name: "conductor supports no-audio fallback",
    run() {
      const output = conduct({
        clock: new FakeMissionClock(),
        cueRuntime: {
          capture: {
            voiceStatus: "unavailable",
          },
        },
      });

      assert.equal(output.status, "cue_emitted");
      assert.equal(output.cueEvent?.voiceRequired, false);
      assert.equal(output.cueEvent?.voiceStatus, "unavailable");
      assert.equal(output.cueEvent?.typedFallbackText.length > 0, true);
      assert.equal(
        output.warnings.includes("voice_unavailable_typed_fallback_used:foreman-cue-capture"),
        true
      );
    },
  },
  {
    name: "conductor completes all six stages through D1 substrate",
    run() {
      const clock = new FakeMissionClock();
      let output = conduct({ clock });

      for (const stageId of MISSION_STAGE_IDS) {
        assert.equal(output.controllerState.currentStageId, stageId);
        assert.equal(output.conductorState.emittedCueIds.includes(`foreman-cue-${stageId}`), true);

        clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs);
        output = conduct({ clock, conductor: output });

        if (stageId !== "public") {
          output = conduct({ clock, conductor: output });
        }
      }

      assert.equal(output.status, "completed");
      assert.equal(output.controllerState.status, "completed");
      assert.deepEqual(output.controllerState.completedStageIds, MISSION_STAGE_IDS);
      assert.equal(eventCount(output.controllerState, "mission_complete"), 1);
    },
  },
  {
    name: "repeated conductor tick after completion does not duplicate completion",
    run() {
      const clock = new FakeMissionClock();
      let output = conduct({ clock });

      for (const stageId of MISSION_STAGE_IDS) {
        assert.equal(output.controllerState.currentStageId, stageId);
        clock.advance(FOREMAN_AUTONOMOUS_PLAYBACK_POLICY.minStageDwellMs);
        output = conduct({ clock, conductor: output });

        if (stageId !== "public") {
          output = conduct({ clock, conductor: output });
        }
      }

      const repeated = conduct({ clock, conductor: output });

      assert.equal(repeated.status, "completed");
      assert.equal(repeated.controllerState.events.length, output.controllerState.events.length);
      assert.equal(eventCount(repeated.controllerState, "mission_complete"), 1);
    },
  },
  {
    name: "reset followed by second autonomous run behaves cleanly",
    run() {
      const clock = new FakeMissionClock();
      const first = conduct({ clock });
      const reset = missionPlaybackReducer(first.controllerState, {
        nowMs: clock.advance(50),
        type: "reset_mission",
      });
      const second = conduct({
        clock,
        conductor: first,
        playback: reset,
      });

      assert.equal(reset.status, "idle");
      assert.notEqual(second.controllerState.runId, first.controllerState.runId);
      assert.equal(second.status, "cue_emitted");
      assert.deepEqual(second.conductorState.emittedCueIds, ["foreman-cue-capture"]);
      assert.equal(eventCount(second.controllerState, "stage_enter"), 1);
    },
  },
  {
    name: "conductor HOLDs when reset cleanup cannot be verified",
    run() {
      const output = runForemanAutonomousConductor({
        nowMs: 0,
        playbackState: createInitialMissionPlaybackState("foreman_autonomous"),
        readiness: readyInput(),
        resetCleanupVerified: false,
      });

      assert.equal(output.status, "holding");
      assert.equal(output.holds.includes("reset_cleanup_unverified"), true);
    },
  },
  {
    name: "conductor HOLDs when autonomous policy is missing",
    run() {
      const output = runForemanAutonomousConductor({
        nowMs: 0,
        playbackState: createInitialMissionPlaybackState("foreman_autonomous"),
        policy: null,
        readiness: readyInput(),
      });

      assert.equal(output.status, "holding");
      assert.equal(output.holds.includes("autonomous_policy_missing"), true);
    },
  },
  {
    name: "D2 source avoids model API and key strings",
    async run() {
      const source = await readD2Source();
      const forbidden = [
        ["OPENAI", "API", "KEY"].join("_"),
        ["ANTHROPIC", "API", "KEY"].join("_"),
        ["fetch", "https"].join("("),
        ["browser", "exposed", "key"].join("-"),
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "D2 source avoids stale skin render imports",
    async run() {
      const source = await readD2Source();

      assert.equal(source.includes(["step", "skins", "renders"].join(".")), false);
      assert.equal(source.includes(["src", "skins"].join("/")), false);
    },
  },
  {
    name: "D2 source avoids production and official workflow overclaims",
    async run() {
      const source = await readD2Source();
      const forbidden = [
        ["production", "city"].join(" "),
        ["legal", "sufficiency"].join(" "),
        ["official", "Fort Worth", "workflow"].join(" "),
        ["live", "Fort Worth", "data"].join(" "),
      ];

      for (const token of forbidden) {
        assert.equal(source.includes(token), false, token);
      }
    },
  },
  {
    name: "D2 source avoids forensic chain append behavior",
    async run() {
      const source = await readD2Source();

      assert.equal(source.includes(["root", "ForensicChain", "write"].join(" ")), false);
      assert.equal(source.includes(["append", "Forensic", "Chain"].join("")), false);
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
