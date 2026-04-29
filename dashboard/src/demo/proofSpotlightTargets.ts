import {
  MISSION_STAGE_IDS,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";

export const PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION =
  "meridian.v2d.proofSpotlightTargets.v1" as const;

export type ProofSpotlightTargetKind =
  | "absence_lens"
  | "audit_wall"
  | "authority_panel"
  | "civic_diorama"
  | "current_focal_card"
  | "disclosure_receipt"
  | "foreman_avatar"
  | "hold_wall"
  | "mission_rail_node"
  | "proof_tools"
  | "receipt_ribbon";

export interface ProofSpotlightTarget {
  fallback_text: string;
  label: string;
  required: boolean;
  source_ref: string;
  stage_id: MissionStageId;
  summary: string;
  target_id: string;
  target_kind: ProofSpotlightTargetKind;
  version: typeof PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION;
}

export const PROOF_SPOTLIGHT_TARGETS: readonly ProofSpotlightTarget[] = [
  {
    fallback_text: "Show the current focal card for the committed Permit #4471 demo anchor.",
    label: "Permit #4471 source card",
    required: true,
    source_ref: "dashboard/src/demo/fictionalPermitAnchor.ts",
    stage_id: "capture",
    summary: "Anchors capture to committed demo evidence and the fictional permit frame.",
    target_id: "proof-target-capture-source-card",
    target_kind: "current_focal_card",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Use the mission rail capture node when the focal card is unavailable.",
    label: "Capture rail node",
    required: false,
    source_ref: "dashboard/src/demo/missionPlaybackPlan.ts:stage:capture",
    stage_id: "capture",
    summary: "Keeps the audience oriented on the first mission stage.",
    target_id: "proof-target-capture-rail",
    target_kind: "mission_rail_node",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Show the local authority panel posture without implying external approval.",
    label: "Authority handoff panel",
    required: true,
    source_ref: "dashboard/src/demo/foremanMissionCues.ts:foreman-cue-authority",
    stage_id: "authority",
    summary: "Points to the bounded requester-to-approver handoff posture.",
    target_id: "proof-target-authority-panel",
    target_kind: "authority_panel",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Show the Foreman avatar target when the authority panel is not mounted.",
    label: "Foreman authority cue",
    required: false,
    source_ref: "dashboard/src/demo/foremanMissionCues.ts:authority",
    stage_id: "authority",
    summary: "Lets the later avatar packet point at the same local authority cue.",
    target_id: "proof-target-authority-foreman",
    target_kind: "foreman_avatar",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Show the HOLD wall for governed refusal posture.",
    label: "Governed HOLD wall",
    required: true,
    source_ref: "dashboard/src/demo/holdWall.ts",
    stage_id: "governance",
    summary: "Keeps challenged governance posture visible as an existing HOLD display.",
    target_id: "proof-target-governance-hold-wall",
    target_kind: "hold_wall",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Use proof tools when the HOLD wall is unavailable.",
    label: "Governance proof tools",
    required: false,
    source_ref: "dashboard/src/demo/missionStageReadiness.ts",
    stage_id: "governance",
    summary: "Surfaces the existing readiness and proof cue posture without recomputing it.",
    target_id: "proof-target-governance-tools",
    target_kind: "proof_tools",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Show the absence lens for explicit missing-evidence explanation.",
    label: "Absence shadow lens",
    required: true,
    source_ref: "dashboard/src/demo/missionAbsenceLens.ts",
    stage_id: "absence",
    summary: "Maps existing absence visibility into the physical shadow slot.",
    target_id: "proof-target-absence-lens",
    target_kind: "absence_lens",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Show the civic diorama absence node if the absence lens is unavailable.",
    label: "Absence diorama node",
    required: false,
    source_ref: "dashboard/src/demo/civicTwinDiorama.ts:absence-hold-node",
    stage_id: "absence",
    summary: "Provides a data-only fallback target for later diorama rendering.",
    target_id: "proof-target-absence-diorama-node",
    target_kind: "civic_diorama",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Show the demo audit wall receipt posture without writing a chain entry.",
    label: "Audit wall receipt",
    required: true,
    source_ref: "dashboard/src/demo/demoAudit.ts",
    stage_id: "chain",
    summary: "Points to existing audit rows and receipt posture only.",
    target_id: "proof-target-chain-audit-wall",
    target_kind: "audit_wall",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Reserve the receipt ribbon target until the later ribbon packet renders it.",
    label: "Receipt ribbon placeholder",
    required: false,
    source_ref: "dashboard/src/demo/missionPhysicalProjection.ts:receipt_ribbon",
    stage_id: "chain",
    summary: "Preserves the later ribbon target without creating receipt behavior.",
    target_id: "proof-target-chain-receipt-ribbon",
    target_kind: "receipt_ribbon",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Show the disclosure receipt boundary for the public stage.",
    label: "Disclosure receipt",
    required: true,
    source_ref: "docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md#shipped-demo-surfaces",
    stage_id: "public",
    summary: "Keeps the public stage bounded to disclosure-aware demo posture.",
    target_id: "proof-target-public-disclosure-receipt",
    target_kind: "disclosure_receipt",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
  {
    fallback_text: "Use the public mission rail node if the disclosure receipt is unavailable.",
    label: "Public rail node",
    required: false,
    source_ref: "dashboard/src/demo/missionPlaybackPlan.ts:stage:public",
    stage_id: "public",
    summary: "Keeps the final stage visibly inside the demo boundary.",
    target_id: "proof-target-public-rail",
    target_kind: "mission_rail_node",
    version: PROOF_SPOTLIGHT_TARGET_REGISTRY_VERSION,
  },
] as const;

export function getProofSpotlightTargetsForStage(
  stageId: MissionStageId
): readonly ProofSpotlightTarget[] {
  return PROOF_SPOTLIGHT_TARGETS.filter((target) => target.stage_id === stageId);
}

export function getProofSpotlightStageCoverage(): Record<MissionStageId, number> {
  return MISSION_STAGE_IDS.reduce(
    (coverage, stageId) => ({
      ...coverage,
      [stageId]: getProofSpotlightTargetsForStage(stageId).length,
    }),
    {} as Record<MissionStageId, number>
  );
}
