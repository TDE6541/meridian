import {
  MISSION_STAGE_FOREMAN_MODE,
  MISSION_STAGE_IDS,
  type MissionForemanModeId,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";

export const FOREMAN_MISSION_CUE_VERSION =
  "meridian.v2d.foremanMissionCue.v1" as const;

export interface ForemanMissionCue {
  attentionTargetHint: string;
  boundaryNote: string;
  cueId: string;
  foremanMode: MissionForemanModeId;
  line: string;
  proofIntent: string;
  proofIntentRequired: boolean;
  required: boolean;
  stageId: MissionStageId;
  typedFallbackText: string;
  version: typeof FOREMAN_MISSION_CUE_VERSION;
}

export interface ForemanMissionCueManifestValidation {
  holds: readonly string[];
  ok: boolean;
}

export const FOREMAN_MISSION_CUE_MANIFEST: readonly ForemanMissionCue[] = [
  {
    attentionTargetHint: "mission.capture.snapshot",
    boundaryNote: "Committed demo evidence only; no external municipal source is implied.",
    cueId: "foreman-cue-capture",
    foremanMode: MISSION_STAGE_FOREMAN_MODE.capture,
    line: "Permit #4471 starts from committed demo evidence, not guesswork.",
    proofIntent: "Anchor later views to the committed demo evidence path.",
    proofIntentRequired: false,
    required: true,
    stageId: "capture",
    typedFallbackText: "Permit #4471 starts from committed demo evidence, not guesswork.",
    version: FOREMAN_MISSION_CUE_VERSION,
  },
  {
    attentionTargetHint: "mission.authority.panel",
    boundaryNote: "The cue describes local demo role posture only; it does not approve anything.",
    cueId: "foreman-cue-authority",
    foremanMode: MISSION_STAGE_FOREMAN_MODE.authority,
    line: "The inspector can request; an authorized role must approve.",
    proofIntent: "Point at the bounded authority handoff posture already present in the demo.",
    proofIntentRequired: false,
    required: true,
    stageId: "authority",
    typedFallbackText: "The inspector can request; an authorized role must approve.",
    version: FOREMAN_MISSION_CUE_VERSION,
  },
  {
    attentionTargetHint: "mission.governance.hold",
    boundaryNote: "The cue explains HOLD behavior without creating a new governance result.",
    cueId: "foreman-cue-governance",
    foremanMode: MISSION_STAGE_FOREMAN_MODE.governance,
    line: "A broken chain becomes a governed HOLD, not a guessed approval.",
    proofIntent: "Keep the audience on the governed HOLD path instead of implied clearance.",
    proofIntentRequired: false,
    required: true,
    stageId: "governance",
    typedFallbackText: "A broken chain becomes a governed HOLD, not a guessed approval.",
    version: FOREMAN_MISSION_CUE_VERSION,
  },
  {
    attentionTargetHint: "mission.absence.shadow",
    boundaryNote: "The cue keeps missing evidence visible without inventing missing facts.",
    cueId: "foreman-cue-absence",
    foremanMode: MISSION_STAGE_FOREMAN_MODE.absence,
    line: "The missing evidence stays visible as a shadow until resolved.",
    proofIntent: "Preserve absence visibility as a local demo signal.",
    proofIntentRequired: false,
    required: true,
    stageId: "absence",
    typedFallbackText: "The missing evidence stays visible as a shadow until resolved.",
    version: FOREMAN_MISSION_CUE_VERSION,
  },
  {
    attentionTargetHint: "mission.chain.receipt",
    boundaryNote: "The cue records demo display posture only; it does not certify audit status.",
    cueId: "foreman-cue-chain",
    foremanMode: MISSION_STAGE_FOREMAN_MODE.chain,
    line: "The demo records what it showed without claiming audit status.",
    proofIntent: "Point at the local receipt posture without creating a chain write.",
    proofIntentRequired: false,
    required: true,
    stageId: "chain",
    typedFallbackText: "The demo records what it showed without claiming audit status.",
    version: FOREMAN_MISSION_CUE_VERSION,
  },
  {
    attentionTargetHint: "mission.public.disclosure",
    boundaryNote: "The cue describes bounded disclosure preview posture only.",
    cueId: "foreman-cue-public",
    foremanMode: MISSION_STAGE_FOREMAN_MODE.public,
    line: "The public view is bounded and disclosure-aware.",
    proofIntent: "Keep the final view inside disclosure-aware demo boundaries.",
    proofIntentRequired: false,
    required: true,
    stageId: "public",
    typedFallbackText: "The public view is bounded and disclosure-aware.",
    version: FOREMAN_MISSION_CUE_VERSION,
  },
] as const;

export function getForemanMissionCueForStage(
  stageId: MissionStageId,
  manifest: readonly ForemanMissionCue[] = FOREMAN_MISSION_CUE_MANIFEST
): ForemanMissionCue | null {
  return manifest.find((cue) => cue.stageId === stageId) ?? null;
}

export function validateForemanMissionCueManifest(
  manifest: readonly ForemanMissionCue[] = FOREMAN_MISSION_CUE_MANIFEST
): ForemanMissionCueManifestValidation {
  const holds: string[] = [];
  const cueIds = new Set<string>();

  for (const stageId of MISSION_STAGE_IDS) {
    const cue = getForemanMissionCueForStage(stageId, manifest);

    if (!cue) {
      holds.push(`stage_cue_missing:${stageId}`);
      continue;
    }

    if (cue.foremanMode !== MISSION_STAGE_FOREMAN_MODE[stageId]) {
      holds.push(`stage_mode_mismatch:${stageId}`);
    }

    if (!cue.typedFallbackText.trim()) {
      holds.push(`typed_fallback_missing:${stageId}`);
    }

    if (!cue.attentionTargetHint.trim()) {
      holds.push(`attention_target_hint_missing:${stageId}`);
    }
  }

  for (const cue of manifest) {
    if (cueIds.has(cue.cueId)) {
      holds.push(`duplicate_cue_id:${cue.cueId}`);
      continue;
    }

    cueIds.add(cue.cueId);
  }

  return {
    holds,
    ok: holds.length === 0,
  };
}
