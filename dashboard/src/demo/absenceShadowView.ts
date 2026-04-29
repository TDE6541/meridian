import type {
  AbsenceShadowPresenceStatus,
  AbsenceShadowSlot,
} from "./absenceShadowSlots.ts";
import type { MissionPhysicalProjectionV1 } from "./missionPhysicalProjection.ts";
import {
  getMissionStageDefinition,
  MISSION_STAGE_IDS,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";

export const ABSENCE_SHADOW_MAP_VIEW_VERSION =
  "meridian.v2d.absenceShadowMapView.v1" as const;

export const ABSENCE_SHADOW_BOUNDARY_COPY =
  "Shadow slots show expected evidence. Missing slots stay visible instead of being guessed. This map reads existing D4 projection state; it does not create new truth, does not resolve holds, and does not certify legal sufficiency." as const;

export const ABSENCE_SHADOW_STATUS_ORDER = [
  "present",
  "absent",
  "carried_hold",
  "blocked",
  "not_applicable",
] as const satisfies readonly AbsenceShadowPresenceStatus[];

export const REQUIRED_ABSENCE_SHADOW_STAGE_SLOT_LABELS: Record<
  MissionStageId,
  string
> = {
  absence: "Explicit missing-evidence explanation",
  authority: "Valid role session or local authority proof",
  capture: "Source evidence for Permit #4471",
  chain: "Receipt or audit event reference",
  governance: "Governed refusal or HOLD rationale",
  public: "Disclosure boundary and redaction posture",
};

export type AbsenceShadowMapStatus = "holding" | "ready" | "unavailable";

export type AbsenceShadowMapSourceMode =
  | "d4_projection_slots"
  | "d4_projection_slots_incomplete"
  | "projection_unavailable";

export interface AbsenceShadowStatusDisplay {
  description: string;
  label: string;
  shadow_label: string;
}

export interface AbsenceShadowSlotView {
  closure_hint: string;
  expected_kind: AbsenceShadowSlot["expected_kind"];
  expected_label: string;
  hold_ref: string | null;
  presence_status: AbsenceShadowPresenceStatus;
  reduced_motion_label: string;
  shadow_label: string;
  slot_id: string;
  source_ref: string | null;
  stage_id: MissionStageId;
  status_description: string;
  status_label: string;
  target_id: string;
  target_label: string;
}

export interface AbsenceShadowStageGroup {
  label: string;
  missing_required_labels: readonly string[];
  required_label: string;
  slots: readonly AbsenceShadowSlotView[];
  stage_id: MissionStageId;
  status: "holding" | "ready";
}

export interface AbsenceShadowMapView {
  boundary_copy: typeof ABSENCE_SHADOW_BOUNDARY_COPY;
  carried_manual_hold_count: number;
  groups: readonly AbsenceShadowStageGroup[];
  missing_required_count: number;
  motion_label: string;
  source_mode: AbsenceShadowMapSourceMode;
  status: AbsenceShadowMapStatus;
  status_displays: Readonly<
    Record<AbsenceShadowPresenceStatus, AbsenceShadowStatusDisplay>
  >;
  status_label: string;
  version: typeof ABSENCE_SHADOW_MAP_VIEW_VERSION;
}

export const ABSENCE_SHADOW_STATUS_DISPLAYS: Readonly<
  Record<AbsenceShadowPresenceStatus, AbsenceShadowStatusDisplay>
> = {
  absent: {
    description: "Expected item is missing and remains visible as a shadow.",
    label: "Absent",
    shadow_label: "Missing evidence shadow",
  },
  blocked: {
    description: "Absence can stop or hold the mission.",
    label: "Blocking HOLD",
    shadow_label: "Blocking shadow",
  },
  carried_hold: {
    description: "Unresolved gap remains visible without blocking the current demo flow.",
    label: "Carried HOLD",
    shadow_label: "Carried HOLD shadow",
  },
  not_applicable: {
    description: "Slot does not apply for the current projected state.",
    label: "Not applicable",
    shadow_label: "Not applicable shadow",
  },
  present: {
    description: "Evidence is visible in the demo proof surface.",
    label: "Present evidence visible",
    shadow_label: "Evidence present",
  },
};

function stageLabel(stageId: MissionStageId): string {
  return getMissionStageDefinition(stageId).label;
}

function toSlotView(slot: AbsenceShadowSlot): AbsenceShadowSlotView {
  const stage = stageLabel(slot.stage_id);
  const statusDisplay = ABSENCE_SHADOW_STATUS_DISPLAYS[slot.presence_status];

  return {
    closure_hint: slot.closure_hint,
    expected_kind: slot.expected_kind,
    expected_label: slot.expected_label,
    hold_ref: slot.hold_ref,
    presence_status: slot.presence_status,
    reduced_motion_label: `Reduced motion safe: ${statusDisplay.label} for ${slot.expected_label}.`,
    shadow_label: statusDisplay.shadow_label,
    slot_id: slot.slot_id,
    source_ref: slot.source_ref,
    stage_id: slot.stage_id,
    status_description: statusDisplay.description,
    status_label: statusDisplay.label,
    target_id: slot.slot_id,
    target_label: `${stage}: ${slot.expected_label}`,
  };
}

function buildStageGroup(
  stageId: MissionStageId,
  slots: readonly AbsenceShadowSlot[]
): AbsenceShadowStageGroup {
  const requiredLabel = REQUIRED_ABSENCE_SHADOW_STAGE_SLOT_LABELS[stageId];
  const stageSlots = slots.filter((slot) => slot.stage_id === stageId).map(toSlotView);
  const missingRequiredLabels = stageSlots.some(
    (slot) => slot.expected_label === requiredLabel
  )
    ? []
    : [requiredLabel];
  const hasBlockingSlot = stageSlots.some(
    (slot) => slot.presence_status === "blocked"
  );

  return {
    label: stageLabel(stageId),
    missing_required_labels: missingRequiredLabels,
    required_label: requiredLabel,
    slots: stageSlots,
    stage_id: stageId,
    status:
      missingRequiredLabels.length > 0 || hasBlockingSlot ? "holding" : "ready",
  };
}

export function deriveAbsenceShadowMapView(
  projection?: MissionPhysicalProjectionV1 | null
): AbsenceShadowMapView {
  const slots = projection?.absence_shadow_slots ?? [];
  const groups = MISSION_STAGE_IDS.map((stageId) => buildStageGroup(stageId, slots));
  const missingRequiredCount = groups.reduce(
    (count, group) => count + group.missing_required_labels.length,
    0
  );

  if (!projection) {
    return {
      boundary_copy: ABSENCE_SHADOW_BOUNDARY_COPY,
      carried_manual_hold_count: 0,
      groups,
      missing_required_count: missingRequiredCount,
      motion_label: "Reduced motion safe: stage labels, statuses, refs, and closure hints remain visible.",
      source_mode: "projection_unavailable",
      status: "unavailable",
      status_displays: ABSENCE_SHADOW_STATUS_DISPLAYS,
      status_label: "HOLD: projection unavailable",
      version: ABSENCE_SHADOW_MAP_VIEW_VERSION,
    };
  }

  const hasBlockingSlot = slots.some((slot) => slot.presence_status === "blocked");
  const status: AbsenceShadowMapStatus =
    missingRequiredCount > 0 || hasBlockingSlot ? "holding" : "ready";

  return {
    boundary_copy: ABSENCE_SHADOW_BOUNDARY_COPY,
    carried_manual_hold_count: slots.filter(
      (slot) =>
        slot.expected_kind === "manual_proof" &&
        slot.presence_status === "carried_hold"
    ).length,
    groups,
    missing_required_count: missingRequiredCount,
    motion_label: "Reduced motion safe: stage labels, statuses, refs, and closure hints remain visible.",
    source_mode:
      missingRequiredCount > 0
        ? "d4_projection_slots_incomplete"
        : "d4_projection_slots",
    status,
    status_displays: ABSENCE_SHADOW_STATUS_DISPLAYS,
    status_label:
      status === "holding"
        ? "HOLD: required shadow slot missing or blocked"
        : "Projection slots mapped",
    version: ABSENCE_SHADOW_MAP_VIEW_VERSION,
  };
}
