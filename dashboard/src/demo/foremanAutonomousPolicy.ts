import {
  MISSION_STAGE_IDS,
  type MissionPlaybackMode,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";

export const FOREMAN_AUTONOMOUS_POLICY_VERSION =
  "meridian.v2d.foremanAutonomousPolicy.v1" as const;

export interface ForemanAutonomousPlaybackPolicy {
  maxStageDwellMs: number;
  minStageDwellMs: number;
  mode: Extract<MissionPlaybackMode, "foreman_autonomous">;
  operatorCanPause: true;
  operatorCanReset: true;
  optionalCueFailureBehavior: "warn_and_continue";
  requiredCueFailureBehavior: "hold";
  requiredReadinessSignals: readonly string[];
  stageOrder: readonly MissionStageId[];
  version: typeof FOREMAN_AUTONOMOUS_POLICY_VERSION;
  voiceIsOptional: true;
}

export const FOREMAN_AUTONOMOUS_PLAYBACK_POLICY: ForemanAutonomousPlaybackPolicy =
  {
    maxStageDwellMs: 8000,
    minStageDwellMs: 1200,
    mode: "foreman_autonomous",
    operatorCanPause: true,
    operatorCanReset: true,
    optionalCueFailureBehavior: "warn_and_continue",
    requiredCueFailureBehavior: "hold",
    requiredReadinessSignals: [
      "scenario_data",
      "presenter_cockpit",
      "stage_substrate",
      "foreman_cue",
    ],
    stageOrder: MISSION_STAGE_IDS,
    version: FOREMAN_AUTONOMOUS_POLICY_VERSION,
    voiceIsOptional: true,
  };
