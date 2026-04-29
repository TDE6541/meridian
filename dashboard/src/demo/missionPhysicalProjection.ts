import type {
  ForemanAutonomousConductorOutput,
  ForemanConductorVoiceStatus,
} from "./foremanAutonomousConductor.ts";
import { getForemanMissionCueForStage } from "./foremanMissionCues.ts";
import {
  getMissionStageDefinition,
  MISSION_STAGE_IDS,
  type MissionForemanModeId,
  type MissionPlaybackMode,
  type MissionPlaybackStatus,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";
import {
  getMissionStagePlaybackStates,
  type MissionPlaybackState,
  type MissionStagePlaybackState,
} from "./missionPlaybackController.ts";
import {
  ABSENCE_SHADOW_SLOTS,
  type AbsenceShadowSlot,
} from "./absenceShadowSlots.ts";
import {
  AUTHORITY_HANDOFF_BEATS,
  getAuthorityHandoffBeatsForStage,
  type AuthorityHandoffBeat,
} from "./authorityHandoffBeats.ts";
import {
  CIVIC_TWIN_DIORAMA,
  type CivicTwinDioramaData,
} from "./civicTwinDiorama.ts";
import {
  getProofSpotlightTargetsForStage,
  PROOF_SPOTLIGHT_TARGETS,
  type ProofSpotlightTarget,
} from "./proofSpotlightTargets.ts";

export const MISSION_PHYSICAL_PROJECTION_VERSION =
  "meridian.v2d.missionPhysicalProjection.v1" as const;

export type MissionPhysicalMode = "projection_only";

export type MissionForemanEmbodiedState =
  | "authority_wait"
  | "blocked"
  | "challenged"
  | "complete"
  | "conducting"
  | "explaining"
  | "holding"
  | "idle"
  | "proofing"
  | "public_boundary"
  | "ready"
  | "resetting"
  | "warning";

export interface MissionPhysicalProjectionBoundary {
  dashboard_local_only: true;
  demo_only: true;
  no_ciba_claim: true;
  no_delivered_notification_claim: true;
  no_legal_sufficiency_claim: true;
  no_live_fort_worth_claim: true;
  no_model_api_foreman_claim: true;
  no_new_absence_truth: true;
  no_new_authority_truth: true;
  no_new_forensic_truth: true;
  no_new_governance_truth: true;
  no_official_workflow_claim: true;
  no_openfga_claim: true;
  no_production_city_claim: true;
  no_root_forensic_chain_write_claim: true;
  no_step_skins_renders: true;
  step_skins_outputs_canonical: true;
}

export interface MissionPhysicalStageProjection {
  foreman_mode: MissionForemanModeId;
  label: string;
  playback_state: MissionStagePlaybackState["state"];
  required_substrate: string;
  stage_id: MissionStageId;
}

export interface MissionPhysicalForemanProjection {
  attention_target_id: string | null;
  current_line: string;
  embodied_state: MissionForemanEmbodiedState;
  mode: MissionForemanModeId | null;
  paused: boolean;
  voice_status: ForemanConductorVoiceStatus;
}

export interface MissionProofSpotlightProjection {
  active_targets: readonly ProofSpotlightTarget[];
  all_targets: readonly ProofSpotlightTarget[];
  source_mode: "bounded_registry";
  target_count: number;
}

export interface MissionAuthorityHandoffProjection {
  active_beats: readonly AuthorityHandoffBeat[];
  beats: readonly AuthorityHandoffBeat[];
  source_mode: "bounded_registry";
}

export interface MissionReceiptRibbonProjection {
  latest_ticket_id: string | null;
  ticket_count: number;
}

export interface MissionJudgeTouchboardProjection {
  active: boolean;
  selected_question_id: string | null;
}

export interface MissionPhysicalProjectionHold {
  hold_id: string;
  source_ref: string | null;
  status: "active_hold" | "carried_hold";
  summary: string;
}

export interface MissionPhysicalMotionMetadata {
  animation_dependency: "none";
  autoplay_required: false;
  external_media_required: false;
  reduced_motion_safe: true;
}

export interface MissionPhysicalProjectionV1 {
  absence_shadow_slots: readonly AbsenceShadowSlot[];
  active_stage_id: MissionStageId | null;
  authority_handoff: MissionAuthorityHandoffProjection;
  boundary: MissionPhysicalProjectionBoundary;
  diorama: CivicTwinDioramaData;
  foreman: MissionPhysicalForemanProjection;
  holds: readonly MissionPhysicalProjectionHold[];
  judge_touchboard: MissionJudgeTouchboardProjection;
  mode: MissionPlaybackMode;
  motion: MissionPhysicalMotionMetadata;
  physical_mode: MissionPhysicalMode;
  playback_status: MissionPlaybackStatus;
  receipt_ribbon: MissionReceiptRibbonProjection;
  run_id: string;
  spotlight: MissionProofSpotlightProjection;
  stages: readonly MissionPhysicalStageProjection[];
  version: typeof MISSION_PHYSICAL_PROJECTION_VERSION;
}

export interface BuildMissionPhysicalProjectionInput {
  conductor_output?: ForemanAutonomousConductorOutput | null;
  playback_state: MissionPlaybackState;
}

export const MISSION_PHYSICAL_PROJECTION_BOUNDARY: MissionPhysicalProjectionBoundary =
  {
    dashboard_local_only: true,
    demo_only: true,
    no_ciba_claim: true,
    no_delivered_notification_claim: true,
    no_legal_sufficiency_claim: true,
    no_live_fort_worth_claim: true,
    no_model_api_foreman_claim: true,
    no_new_absence_truth: true,
    no_new_authority_truth: true,
    no_new_forensic_truth: true,
    no_new_governance_truth: true,
    no_official_workflow_claim: true,
    no_openfga_claim: true,
    no_production_city_claim: true,
    no_root_forensic_chain_write_claim: true,
    no_step_skins_renders: true,
    step_skins_outputs_canonical: true,
  };

export const MISSION_PHYSICAL_MOTION_METADATA: MissionPhysicalMotionMetadata = {
  animation_dependency: "none",
  autoplay_required: false,
  external_media_required: false,
  reduced_motion_safe: true,
};

const STAGE_EMBODIED_STATE: Record<MissionStageId, MissionForemanEmbodiedState> = {
  absence: "explaining",
  authority: "authority_wait",
  capture: "conducting",
  chain: "proofing",
  governance: "proofing",
  public: "public_boundary",
};

function isHolding(
  playbackState: MissionPlaybackState,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): boolean {
  return playbackState.status === "holding" || conductorOutput?.status === "holding";
}

function projectionStageId(
  playbackState: MissionPlaybackState
): MissionStageId | null {
  if (playbackState.currentStageId) {
    return playbackState.currentStageId;
  }

  if (playbackState.status === "idle" || playbackState.status === "resetting") {
    return MISSION_STAGE_IDS[0];
  }

  return null;
}

export function mapMissionForemanEmbodiedState(
  playbackState: MissionPlaybackState,
  conductorOutput?: ForemanAutonomousConductorOutput | null
): MissionForemanEmbodiedState {
  if (playbackState.status === "idle") {
    return "ready";
  }

  if (playbackState.status === "resetting") {
    return "resetting";
  }

  if (playbackState.status === "completed") {
    return "complete";
  }

  if (isHolding(playbackState, conductorOutput)) {
    return "holding";
  }

  const stageId = projectionStageId(playbackState);

  if (!stageId) {
    return playbackState.status === "paused" ? "idle" : "warning";
  }

  return STAGE_EMBODIED_STATE[stageId];
}

function buildStageProjectionStates(
  playbackState: MissionPlaybackState
): readonly MissionPhysicalStageProjection[] {
  return getMissionStagePlaybackStates(playbackState).map((stage) => {
    const definition = getMissionStageDefinition(stage.id);

    return {
      foreman_mode: stage.foremanMode,
      label: definition.label,
      playback_state: stage.state,
      required_substrate: definition.requiredSubstrate,
      stage_id: stage.id,
    };
  });
}

function currentLineFor(
  stageId: MissionStageId | null,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): string {
  if (conductorOutput?.cueEvent?.line) {
    return conductorOutput.cueEvent.line;
  }

  if (stageId) {
    const cue = getForemanMissionCueForStage(stageId);

    if (cue) {
      return cue.line;
    }
  }

  return "Mission physical projection is ready.";
}

function foremanModeFor(
  stageId: MissionStageId | null,
  playbackState: MissionPlaybackState,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): MissionForemanModeId | null {
  return (
    conductorOutput?.foremanGuideMode ??
    playbackState.activeForemanMode ??
    (stageId ? getMissionStageDefinition(stageId).foremanMode : null)
  );
}

function attentionTargetFor(stageId: MissionStageId | null): string | null {
  if (!stageId) {
    return null;
  }

  return getProofSpotlightTargetsForStage(stageId)[0]?.target_id ?? null;
}

function buildForemanProjection(
  playbackState: MissionPlaybackState,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): MissionPhysicalForemanProjection {
  const stageId = projectionStageId(playbackState);

  return {
    attention_target_id: attentionTargetFor(stageId),
    current_line: currentLineFor(stageId, conductorOutput),
    embodied_state: mapMissionForemanEmbodiedState(playbackState, conductorOutput),
    mode: foremanModeFor(stageId, playbackState, conductorOutput),
    paused: playbackState.status === "paused",
    voice_status: conductorOutput?.cueEvent?.voiceStatus ?? "not_started",
  };
}

function buildSpotlightProjection(
  stageId: MissionStageId | null
): MissionProofSpotlightProjection {
  return {
    active_targets: stageId ? getProofSpotlightTargetsForStage(stageId) : [],
    all_targets: PROOF_SPOTLIGHT_TARGETS,
    source_mode: "bounded_registry",
    target_count: PROOF_SPOTLIGHT_TARGETS.length,
  };
}

function buildAuthorityHandoffProjection(
  stageId: MissionStageId | null
): MissionAuthorityHandoffProjection {
  return {
    active_beats: stageId ? getAuthorityHandoffBeatsForStage(stageId) : [],
    beats: AUTHORITY_HANDOFF_BEATS,
    source_mode: "bounded_registry",
  };
}

function buildHolds(
  playbackState: MissionPlaybackState,
  conductorOutput: ForemanAutonomousConductorOutput | null | undefined
): readonly MissionPhysicalProjectionHold[] {
  const activeHolds: MissionPhysicalProjectionHold[] = [];

  if (playbackState.hold) {
    activeHolds.push({
      hold_id: `playback:${playbackState.hold.reason}`,
      source_ref: playbackState.hold.stageId,
      status: "active_hold",
      summary: playbackState.hold.reason,
    });
  }

  for (const hold of conductorOutput?.holds ?? []) {
    activeHolds.push({
      hold_id: `conductor:${hold}`,
      source_ref: conductorOutput?.currentStageId ?? null,
      status: "active_hold",
      summary: hold,
    });
  }

  const carriedHolds = ABSENCE_SHADOW_SLOTS.filter(
    (slot) => slot.presence_status === "carried_hold"
  ).map((slot) => ({
    hold_id: slot.slot_id,
    source_ref: slot.hold_ref,
    status: "carried_hold" as const,
    summary: slot.expected_label,
  }));

  return [...activeHolds, ...carriedHolds];
}

export function buildMissionPhysicalProjection(
  input: BuildMissionPhysicalProjectionInput
): MissionPhysicalProjectionV1 {
  const { conductor_output: conductorOutput, playback_state: playbackState } = input;
  const activeStageId = playbackState.currentStageId;
  const stageForProjection = projectionStageId(playbackState);

  return {
    absence_shadow_slots: ABSENCE_SHADOW_SLOTS,
    active_stage_id: activeStageId,
    authority_handoff: buildAuthorityHandoffProjection(stageForProjection),
    boundary: MISSION_PHYSICAL_PROJECTION_BOUNDARY,
    diorama: CIVIC_TWIN_DIORAMA,
    foreman: buildForemanProjection(playbackState, conductorOutput),
    holds: buildHolds(playbackState, conductorOutput),
    judge_touchboard: {
      active: false,
      selected_question_id: null,
    },
    mode: playbackState.mode,
    motion: MISSION_PHYSICAL_MOTION_METADATA,
    physical_mode: "projection_only",
    playback_status: playbackState.status,
    receipt_ribbon: {
      latest_ticket_id: null,
      ticket_count: 0,
    },
    run_id: playbackState.runId,
    spotlight: buildSpotlightProjection(stageForProjection),
    stages: buildStageProjectionStates(playbackState),
    version: MISSION_PHYSICAL_PROJECTION_VERSION,
  };
}
