import {
  MISSION_STAGE_IDS,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";

export const ABSENCE_SHADOW_SLOT_REGISTRY_VERSION =
  "meridian.v2d.absenceShadowSlots.v1" as const;

export type AbsenceShadowPresenceStatus =
  | "absent"
  | "blocked"
  | "carried_hold"
  | "not_applicable"
  | "present";

export type AbsenceShadowExpectedKind =
  | "authority_proof"
  | "audit_reference"
  | "disclosure_boundary"
  | "governed_hold"
  | "manual_proof"
  | "missing_evidence"
  | "source_evidence";

export interface AbsenceShadowSlot {
  closure_hint: string;
  expected_kind: AbsenceShadowExpectedKind;
  expected_label: string;
  hold_ref: string | null;
  presence_status: AbsenceShadowPresenceStatus;
  slot_id: string;
  source_ref: string | null;
  stage_id: MissionStageId;
  version: typeof ABSENCE_SHADOW_SLOT_REGISTRY_VERSION;
}

export const ABSENCE_SHADOW_SLOTS: readonly AbsenceShadowSlot[] = [
  {
    closure_hint: "Keep the capture slot tied to the committed demo permit anchor.",
    expected_kind: "source_evidence",
    expected_label: "Source evidence for Permit #4471",
    hold_ref: null,
    presence_status: "present",
    slot_id: "absence-slot-capture-source-evidence-4471",
    source_ref: "dashboard/src/demo/fictionalPermitAnchor.ts",
    stage_id: "capture",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Render as local proof posture only; manual choreography remains separate.",
    expected_kind: "authority_proof",
    expected_label: "Valid role session or local authority proof",
    hold_ref: null,
    presence_status: "present",
    slot_id: "absence-slot-authority-local-proof",
    source_ref: "docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md",
    stage_id: "authority",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Carry until Tim supplies phone and full handoff proof.",
    expected_kind: "manual_proof",
    expected_label: "Full authority choreography and phone smoke proof",
    hold_ref: "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md#manual-proof-status",
    presence_status: "carried_hold",
    slot_id: "absence-slot-authority-manual-proof",
    source_ref: null,
    stage_id: "authority",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Keep governed refusal as a mapped display state, not a fresh decision.",
    expected_kind: "governed_hold",
    expected_label: "Governed refusal or HOLD rationale",
    hold_ref: null,
    presence_status: "present",
    slot_id: "absence-slot-governance-hold-rationale",
    source_ref: "dashboard/src/demo/holdWall.ts",
    stage_id: "governance",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Map existing absence visibility only; do not resolve it here.",
    expected_kind: "missing_evidence",
    expected_label: "Explicit missing-evidence explanation",
    hold_ref: null,
    presence_status: "present",
    slot_id: "absence-slot-absence-missing-evidence",
    source_ref: "dashboard/src/demo/missionAbsenceLens.ts",
    stage_id: "absence",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Keep the MP4 proof gap visible until a verified asset is supplied.",
    expected_kind: "manual_proof",
    expected_label: "Walk-mode MP4 proof",
    hold_ref: "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md#manual-proof-status",
    presence_status: "carried_hold",
    slot_id: "absence-slot-absence-walk-mp4-proof",
    source_ref: null,
    stage_id: "absence",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Use existing audit rows or receipt posture only; do not append anything.",
    expected_kind: "audit_reference",
    expected_label: "Receipt or audit event reference",
    hold_ref: null,
    presence_status: "present",
    slot_id: "absence-slot-chain-audit-reference",
    source_ref: "dashboard/src/demo/demoAudit.ts",
    stage_id: "chain",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Keep clean logout and deploy-hook cleanup proof carried as manual HOLDs.",
    expected_kind: "manual_proof",
    expected_label: "Clean logout and deploy-hook cleanup proof",
    hold_ref: "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md#manual-proof-status",
    presence_status: "carried_hold",
    slot_id: "absence-slot-chain-cleanup-proof",
    source_ref: null,
    stage_id: "chain",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Keep public projection restricted and disclosure-aware.",
    expected_kind: "disclosure_boundary",
    expected_label: "Disclosure boundary and redaction posture",
    hold_ref: null,
    presence_status: "present",
    slot_id: "absence-slot-public-disclosure-boundary",
    source_ref: "docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md#legal-and-production-boundary",
    stage_id: "public",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
  {
    closure_hint: "Carry judge-device proof until a separate proof packet resolves it.",
    expected_kind: "manual_proof",
    expected_label: "Mobile or judge-device proof",
    hold_ref: "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md#manual-proof-status",
    presence_status: "carried_hold",
    slot_id: "absence-slot-public-judge-device-proof",
    source_ref: null,
    stage_id: "public",
    version: ABSENCE_SHADOW_SLOT_REGISTRY_VERSION,
  },
] as const;

export function getAbsenceShadowSlotsForStage(
  stageId: MissionStageId
): readonly AbsenceShadowSlot[] {
  return ABSENCE_SHADOW_SLOTS.filter((slot) => slot.stage_id === stageId);
}

export function getAbsenceShadowStageCoverage(): Record<MissionStageId, number> {
  return MISSION_STAGE_IDS.reduce(
    (coverage, stageId) => ({
      ...coverage,
      [stageId]: getAbsenceShadowSlotsForStage(stageId).length,
    }),
    {} as Record<MissionStageId, number>
  );
}
