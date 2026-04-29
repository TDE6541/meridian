import {
  getMissionStageDefinition,
  isMissionStageId,
  type MissionPlaybackMode,
  type MissionStageId,
  type MissionStageSubstrateKey,
} from "./missionPlaybackPlan.ts";

export type MissionCueStatus = "ready" | "missing" | "failed";

export interface MissionCueReadiness {
  required: boolean;
  source: string;
  status: MissionCueStatus;
}

export interface MissionStageReadinessInput {
  activeStageId: MissionStageId | null;
  enteredAtMs: number | null;
  foremanCue: MissionCueReadiness | null;
  minDwellMs: number;
  mode: MissionPlaybackMode;
  modeConsistent: boolean;
  nowMs: number;
  presenterCockpitReady: boolean;
  proofCue: MissionCueReadiness | null;
  requiredHolds: readonly string[];
  resetCleanupOk: boolean;
  scenarioAvailable: boolean;
  stageId: string | null;
  substrate: Partial<Record<MissionStageSubstrateKey, boolean>>;
}

export type MissionStageReadinessStatus = "ready" | "waiting" | "hold";

export interface MissionStageReadinessResult {
  dwellElapsedMs: number;
  holds: readonly string[];
  ready: boolean;
  stageId: MissionStageId | null;
  status: MissionStageReadinessStatus;
  warnings: readonly string[];
}

function evaluateCue(
  cue: MissionCueReadiness | null,
  label: string
): { holds: string[]; warnings: string[] } {
  if (!cue) {
    return {
      holds: [`${label}_readiness_missing`],
      warnings: [],
    };
  }

  if (cue.status === "ready") {
    return { holds: [], warnings: [] };
  }

  if (cue.required) {
    return {
      holds: [`required_${label}_${cue.status}`],
      warnings: [],
    };
  }

  return {
    holds: [],
    warnings: [`optional_${label}_${cue.status}: ${cue.source}`],
  };
}

export function evaluateMissionStageReadiness(
  input: MissionStageReadinessInput
): MissionStageReadinessResult {
  const holds: string[] = [];
  const warnings: string[] = [];

  if (!input.stageId || !isMissionStageId(input.stageId)) {
    return {
      dwellElapsedMs: 0,
      holds: ["invalid_stage_id"],
      ready: false,
      stageId: null,
      status: "hold",
      warnings,
    };
  }

  const stage = getMissionStageDefinition(input.stageId);
  const dwellElapsedMs =
    input.enteredAtMs === null ? 0 : Math.max(0, input.nowMs - input.enteredAtMs);

  if (input.activeStageId !== input.stageId) {
    holds.push("active_stage_mismatch");
  }

  if (!input.scenarioAvailable) {
    holds.push("scenario_data_missing");
  }

  if (!input.presenterCockpitReady) {
    holds.push("presenter_cockpit_readiness_missing");
  }

  if (!input.substrate[stage.requiredSubstrate]) {
    holds.push(`${stage.requiredSubstrate}_readiness_missing`);
  }

  if (input.requiredHolds.length > 0) {
    holds.push(...input.requiredHolds.map((entry) => `required_hold_active:${entry}`));
  }

  if (!input.modeConsistent) {
    holds.push("mode_state_inconsistent");
  }

  if (!input.resetCleanupOk) {
    holds.push("reset_cleanup_failed");
  }

  const foremanCue = evaluateCue(input.foremanCue, "foreman_cue");
  holds.push(...foremanCue.holds);
  warnings.push(...foremanCue.warnings);

  const proofCue = evaluateCue(input.proofCue, "proof_cue");
  holds.push(...proofCue.holds);
  warnings.push(...proofCue.warnings);

  if (holds.length > 0) {
    return {
      dwellElapsedMs,
      holds,
      ready: false,
      stageId: input.stageId,
      status: "hold",
      warnings,
    };
  }

  if (
    input.mode === "foreman_autonomous" &&
    dwellElapsedMs < input.minDwellMs
  ) {
    return {
      dwellElapsedMs,
      holds,
      ready: false,
      stageId: input.stageId,
      status: "waiting",
      warnings,
    };
  }

  return {
    dwellElapsedMs,
    holds,
    ready: true,
    stageId: input.stageId,
    status: "ready",
    warnings,
  };
}
