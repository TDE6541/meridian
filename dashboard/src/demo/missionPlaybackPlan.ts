import type { ForemanGuideModeId } from "../foremanGuide/foremanModes.ts";
import { MISSION_RAIL_LABELS, type MissionRailLabel } from "./missionRail.ts";

export const MISSION_PLAYBACK_PLAN_VERSION =
  "meridian.v2d.missionPlaybackPlan.v1" as const;

export type MissionPlaybackMode = "guided" | "foreman_autonomous";

export type MissionPlaybackStatus =
  | "idle"
  | "running"
  | "paused"
  | "holding"
  | "completed"
  | "resetting";

export const MISSION_STAGE_IDS = [
  "capture",
  "authority",
  "governance",
  "absence",
  "chain",
  "public",
] as const;

export type MissionStageId = (typeof MISSION_STAGE_IDS)[number];

export type MissionStageSubstrateKey =
  | "capture_snapshot"
  | "authority_panel"
  | "governance_panel"
  | "absence_lens"
  | "forensic_chain"
  | "public_disclosure";

export type MissionForemanModeId = Exclude<ForemanGuideModeId, "judge">;

export const MISSION_STAGE_FOREMAN_MODE: Record<
  MissionStageId,
  MissionForemanModeId
> = {
  absence: "absence",
  authority: "challenge",
  capture: "walk",
  chain: "walk",
  governance: "challenge",
  public: "public",
};

const MISSION_STAGE_SUBSTRATE: Record<MissionStageId, MissionStageSubstrateKey> = {
  absence: "absence_lens",
  authority: "authority_panel",
  capture: "capture_snapshot",
  chain: "forensic_chain",
  governance: "governance_panel",
  public: "public_disclosure",
};

export interface MissionStageDefinition {
  foremanMode: MissionForemanModeId;
  id: MissionStageId;
  index: number;
  label: MissionRailLabel;
  requiredReadinessSignals: readonly string[];
  requiredSubstrate: MissionStageSubstrateKey;
}

export interface MissionPlaybackPlan {
  stageOrder: readonly MissionStageId[];
  stages: readonly MissionStageDefinition[];
  version: typeof MISSION_PLAYBACK_PLAN_VERSION;
}

export const MISSION_PLAYBACK_STAGES: readonly MissionStageDefinition[] =
  MISSION_STAGE_IDS.map((id, index) => ({
    foremanMode: MISSION_STAGE_FOREMAN_MODE[id],
    id,
    index,
    label: MISSION_RAIL_LABELS[index],
    requiredReadinessSignals: [
      "scenario_data",
      "presenter_cockpit",
      MISSION_STAGE_SUBSTRATE[id],
    ],
    requiredSubstrate: MISSION_STAGE_SUBSTRATE[id],
  }));

export const MISSION_PLAYBACK_PLAN: MissionPlaybackPlan = {
  stageOrder: MISSION_STAGE_IDS,
  stages: MISSION_PLAYBACK_STAGES,
  version: MISSION_PLAYBACK_PLAN_VERSION,
};

export function isMissionStageId(value: unknown): value is MissionStageId {
  return (
    typeof value === "string" &&
    MISSION_STAGE_IDS.includes(value as MissionStageId)
  );
}

export function getMissionStageDefinition(
  stageId: MissionStageId
): MissionStageDefinition {
  return MISSION_PLAYBACK_STAGES[
    MISSION_STAGE_IDS.indexOf(stageId)
  ] as MissionStageDefinition;
}

export function getForemanModeForMissionStage(
  stageId: MissionStageId
): MissionForemanModeId {
  return MISSION_STAGE_FOREMAN_MODE[stageId];
}
