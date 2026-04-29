import type { MissionPhysicalProjectionV1 } from "./missionPhysicalProjection.ts";
import {
  getMissionStageDefinition,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";
import type { ProofSpotlightTarget } from "./proofSpotlightTargets.ts";

export const PROOF_SPOTLIGHT_VIEW_VERSION =
  "meridian.v2d.proofSpotlightView.v1" as const;

export type ProofSpotlightStatus =
  | "holding"
  | "ready"
  | "unavailable"
  | "warning";

export interface ProofSpotlightView {
  activeStageLabel: string;
  beamLabel: string;
  fallbackText: string;
  foremanAttentionLabel: string;
  foremanAttentionTargetId: string | null;
  motionLabel: string;
  postureLabel: string;
  sourceMode:
    | "d4_projection_active_target"
    | "d4_projection_missing_target"
    | "d4_projection_safe_lobby"
    | "projection_unavailable";
  sourceRef: string;
  stageId: MissionStageId | null;
  status: ProofSpotlightStatus;
  statusLabel: string;
  summary: string;
  target: ProofSpotlightTarget | null;
  targetId: string | null;
  targetKind: string;
  targetLabel: string;
  version: typeof PROOF_SPOTLIGHT_VIEW_VERSION;
}

const READY_LOBBY_COPY =
  "Mission is in lobby; spotlight is ready and waiting for a D4 stage target.";

function formatStageLabel(
  projection: MissionPhysicalProjectionV1,
  stageId: MissionStageId
): string {
  const stage = projection.stages.find((entry) => entry.stage_id === stageId);
  const label = stage?.label ?? getMissionStageDefinition(stageId).label;

  return `${label} (${stageId})`;
}

function isTargetComplete(target: ProofSpotlightTarget): boolean {
  return (
    target.label.trim().length > 0 &&
    target.fallback_text.trim().length > 0 &&
    target.source_ref.trim().length > 0 &&
    target.summary.trim().length > 0
  );
}

function selectActiveTarget(
  projection: MissionPhysicalProjectionV1,
  stageId: MissionStageId
): ProofSpotlightTarget | null {
  const stageTargets = projection.spotlight.active_targets.filter(
    (target) => target.stage_id === stageId
  );
  const attentionTargetId = projection.foreman.attention_target_id;

  return (
    stageTargets.find((target) => target.target_id === attentionTargetId) ??
    stageTargets.find((target) => target.required) ??
    stageTargets[0] ??
    null
  );
}

function unavailableView(
  projection: MissionPhysicalProjectionV1,
  stageId: MissionStageId
): ProofSpotlightView {
  const stageLabel = formatStageLabel(projection, stageId);

  return {
    activeStageLabel: stageLabel,
    beamLabel: `Evidence beam: Foreman -> ${stageLabel} -> HOLD target unavailable.`,
    fallbackText:
      "HOLD: no D4 proof spotlight target is active for this valid mission stage.",
    foremanAttentionLabel:
      projection.foreman.attention_target_id ?? "HOLD: attention target unavailable",
    foremanAttentionTargetId: projection.foreman.attention_target_id,
    motionLabel: "Reduced motion safe: target details remain visible.",
    postureLabel: "Required target missing",
    sourceMode: "d4_projection_missing_target",
    sourceRef: "projection.spotlight.active_targets",
    stageId,
    status: "holding",
    statusLabel: "HOLDING",
    summary:
      "A valid mission stage is active, but D4 did not expose an active proof target.",
    target: null,
    targetId: null,
    targetKind: "unavailable",
    targetLabel: "HOLD: proof target unavailable",
    version: PROOF_SPOTLIGHT_VIEW_VERSION,
  };
}

function targetStatus(target: ProofSpotlightTarget): ProofSpotlightStatus {
  if (isTargetComplete(target)) {
    return "ready";
  }

  return target.required ? "holding" : "warning";
}

function targetPostureLabel(
  target: ProofSpotlightTarget,
  status: ProofSpotlightStatus
): string {
  if (status === "holding") {
    return "Required target HOLD";
  }

  if (status === "warning") {
    return "Optional target warning";
  }

  return target.required ? "Required target ready" : "Optional target ready";
}

function targetFallbackText(
  target: ProofSpotlightTarget,
  status: ProofSpotlightStatus
): string {
  if (status === "holding") {
    return `HOLD: required proof target is incomplete. ${target.fallback_text || "Fallback text unavailable."}`;
  }

  if (status === "warning") {
    return `Warning: optional proof target is incomplete. ${target.fallback_text || "Fallback text unavailable."}`;
  }

  return target.fallback_text;
}

export function deriveProofSpotlightView(
  projection?: MissionPhysicalProjectionV1 | null
): ProofSpotlightView {
  if (!projection) {
    return {
      activeStageLabel: "Projection unavailable",
      beamLabel:
        "Evidence beam: Foreman -> projection unavailable -> safe fallback.",
      fallbackText:
        "Mission physical projection is unavailable; Presenter Cockpit remains source-bounded.",
      foremanAttentionLabel: "Projection unavailable",
      foremanAttentionTargetId: null,
      motionLabel: "Reduced motion safe: fallback text remains visible.",
      postureLabel: "Safe fallback",
      sourceMode: "projection_unavailable",
      sourceRef: "projection unavailable",
      stageId: null,
      status: "unavailable",
      statusLabel: "UNAVAILABLE",
      summary:
        "Proof Spotlight is waiting for the D4 mission physical projection.",
      target: null,
      targetId: null,
      targetKind: "safe_fallback",
      targetLabel: "Projection unavailable",
      version: PROOF_SPOTLIGHT_VIEW_VERSION,
    };
  }

  const stageId = projection.active_stage_id;

  if (!stageId) {
    return {
      activeStageLabel: "Lobby / no active stage",
      beamLabel: "Evidence beam: Foreman -> lobby -> safe ready spotlight.",
      fallbackText: READY_LOBBY_COPY,
      foremanAttentionLabel:
        projection.foreman.attention_target_id ?? "No active attention target",
      foremanAttentionTargetId: projection.foreman.attention_target_id,
      motionLabel: "Reduced motion safe: ready state remains visible.",
      postureLabel: "Safe lobby ready",
      sourceMode: "d4_projection_safe_lobby",
      sourceRef: "projection.active_stage_id",
      stageId: null,
      status: "ready",
      statusLabel: "READY",
      summary:
        "Spotlight is armed for the next D4 proof target without selecting one in lobby.",
      target: null,
      targetId: null,
      targetKind: "safe_lobby",
      targetLabel: "Safe lobby spotlight",
      version: PROOF_SPOTLIGHT_VIEW_VERSION,
    };
  }

  const target = selectActiveTarget(projection, stageId);

  if (!target) {
    return unavailableView(projection, stageId);
  }

  const stageLabel = formatStageLabel(projection, stageId);
  const status = targetStatus(target);
  const targetLabel =
    target.label.trim().length > 0
      ? target.label
      : target.required
        ? "HOLD: target label unavailable"
        : "Warning: optional target label unavailable";

  return {
    activeStageLabel: stageLabel,
    beamLabel: `Evidence beam: Foreman -> ${stageLabel} -> ${targetLabel}.`,
    fallbackText: targetFallbackText(target, status),
    foremanAttentionLabel:
      projection.foreman.attention_target_id ?? "No active attention target",
    foremanAttentionTargetId: projection.foreman.attention_target_id,
    motionLabel: "Reduced motion safe: target details remain visible.",
    postureLabel: targetPostureLabel(target, status),
    sourceMode: "d4_projection_active_target",
    sourceRef:
      target.source_ref.trim().length > 0
        ? target.source_ref
        : "HOLD: source ref unavailable",
    stageId,
    status,
    statusLabel: status.toUpperCase(),
    summary:
      target.summary.trim().length > 0
        ? target.summary
        : "HOLD: target summary unavailable",
    target,
    targetId: target.target_id,
    targetKind: target.target_kind,
    targetLabel,
    version: PROOF_SPOTLIGHT_VIEW_VERSION,
  };
}
