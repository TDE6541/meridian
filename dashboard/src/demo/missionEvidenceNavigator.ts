import type { MissionPhysicalProjectionV1 } from "./missionPhysicalProjection.ts";
import type {
  JudgeProofSurfaceTargetKind,
  JudgeTouchboardCard,
} from "./judgeTouchboardDeck.ts";

export const MISSION_EVIDENCE_NAVIGATOR_VERSION =
  "meridian.v2d.missionEvidenceNavigator.v1" as const;

export interface MissionEvidenceSurfaceDefinition {
  fallback_text: string;
  kind: JudgeProofSurfaceTargetKind;
  label: string;
  route_instruction: string;
  source_ref: string;
  summary: string;
}

export interface MissionEvidenceNavigatorTarget
  extends MissionEvidenceSurfaceDefinition {
  card_target_id: string;
  card_target_label: string;
  card_target_source_ref: string;
  card_target_summary: string;
  proof_tools_grouping: "preserve_collapsed";
}

export interface MissionEvidenceNavigatorView {
  boundary_copy: string;
  card_label: string;
  card_question_id: string | null;
  dom_poking: false;
  imperative_clicks: false;
  mutation: false;
  selected: boolean;
  source_mode: "selected_judge_card" | "safe_fallback";
  status_label: string;
  targets: readonly MissionEvidenceNavigatorTarget[];
  version: typeof MISSION_EVIDENCE_NAVIGATOR_VERSION;
}

export const MISSION_EVIDENCE_SURFACES: Record<
  JudgeProofSurfaceTargetKind,
  MissionEvidenceSurfaceDefinition
> = {
  absence_lens: {
    fallback_text: "Use the existing Absence Lens toggle in grouped Proof Tools.",
    kind: "absence_lens",
    label: "Absence Lens",
    route_instruction: "Look at the existing source-bounded absence lens.",
    source_ref: "dashboard/src/demo/missionAbsenceLens.ts",
    summary: "Displays existing absence signals without computing new findings.",
  },
  absence_shadow_map: {
    fallback_text: "Use the visible Absence Shadow Map.",
    kind: "absence_shadow_map",
    label: "Absence Shadow Map",
    route_instruction: "Look at the carried proof slots and missing-proof shadows.",
    source_ref: "dashboard/src/components/AbsenceShadowMap.tsx",
    summary: "Maps D7 absence-shadow slots already present in projection data.",
  },
  audit_wall: {
    fallback_text: "Use the user-controlled Audit Wall button in Proof Tools.",
    kind: "audit_wall",
    label: "Demo Audit Wall",
    route_instruction: "Look at existing source rows and decision counters.",
    source_ref: "dashboard/src/demo/demoAudit.ts",
    summary: "Displays existing scenario decision rows and refs only.",
  },
  authority_handoff: {
    fallback_text: "Use the visible Authority Handoff Theater.",
    kind: "authority_handoff",
    label: "Authority Handoff Theater",
    route_instruction: "Look at the role cards, token state, and non-claims.",
    source_ref: "dashboard/src/components/AuthorityHandoffTheater.tsx",
    summary: "Routes attention to D8 local authority handoff posture.",
  },
  current_focal_card: {
    fallback_text: "Use the current decision/HOLD focal card.",
    kind: "current_focal_card",
    label: "Current focal card",
    route_instruction: "Look at the current decision, why, and next proof row.",
    source_ref: "dashboard/src/components/MissionPresentationShell.tsx",
    summary: "Keeps the active step and decision boundary visible.",
  },
  disclosure_preview: {
    fallback_text: "Use the existing disclosure preview in Engineer Mode.",
    kind: "disclosure_preview",
    label: "Disclosure preview",
    route_instruction: "Look at the dashboard-local disclosure preview.",
    source_ref: "dashboard/src/components/DisclosurePreviewPanel.tsx",
    summary: "Shows public disclosure posture over committed skin outputs.",
  },
  foreman_avatar: {
    fallback_text: "Use the visible Foreman Avatar Bay.",
    kind: "foreman_avatar",
    label: "Foreman Avatar Bay",
    route_instruction: "Look at the challenged Judge Mode posture.",
    source_ref: "dashboard/src/components/ForemanAvatarBay.tsx",
    summary: "Shows bounded Foreman posture without open-ended answers.",
  },
  garp_authority_panel: {
    fallback_text: "Use existing GARP access through the grouped proof path.",
    kind: "garp_authority_panel",
    label: "GARP authority panel",
    route_instruction: "Look at dashboard-local authority state and HOLD copy.",
    source_ref: "dashboard/src/components/AuthorityResolutionPanel.tsx",
    summary: "Displays local authority runway state without external approval claims.",
  },
  hold_wall: {
    fallback_text: "Use the existing HOLD Wall path when source fields are present.",
    kind: "hold_wall",
    label: "HOLD Wall",
    route_instruction: "Look at unresolved source-bounded HOLD fields.",
    source_ref: "dashboard/src/demo/holdWall.ts",
    summary: "Carries refusal and missing-proof posture without writing truth.",
  },
  mission_rail: {
    fallback_text: "Use the visible six-stage mission rail.",
    kind: "mission_rail",
    label: "Mission rail",
    route_instruction: "Look at the preserved stage and mode path.",
    source_ref: "dashboard/src/components/MissionRail.tsx",
    summary: "Shows stage orientation without emitting new stage events.",
  },
  proof_spotlight: {
    fallback_text: "Use the visible Evidence Beam.",
    kind: "proof_spotlight",
    label: "Proof Spotlight",
    route_instruction: "Look at the source-bounded proof target summary.",
    source_ref: "dashboard/src/components/ProofSpotlight.tsx",
    summary: "Points at existing proof targets without creating proof facts.",
  },
  proof_tools: {
    fallback_text: "Use the grouped Proof Tools only when the operator opens them.",
    kind: "proof_tools",
    label: "Grouped Proof Tools",
    route_instruction: "Leave Proof Tools collapsed until a user opens them.",
    source_ref: "dashboard/src/components/MissionPresentationShell.tsx",
    summary: "Preserves the collapsed grouping for advanced proof surfaces.",
  },
  public_boundary: {
    fallback_text: "Use the public skin/disclosure boundary summary.",
    kind: "public_boundary",
    label: "Public boundary",
    route_instruction: "Look at public disclosure posture, not portal behavior.",
    source_ref: "dashboard/src/adapters/skinPayloadAdapter.ts",
    summary: "Keeps public view bounded to committed step.skins.outputs.",
  },
  run_boundary: {
    fallback_text: "Use the mission boundary copy and carried HOLD list.",
    kind: "run_boundary",
    label: "Run boundary",
    route_instruction: "Look at demo-only, dashboard-local boundary posture.",
    source_ref: "dashboard/src/demo/missionPhysicalProjection.ts",
    summary: "Shows the current run is projection-only and demo-local.",
  },
};

function toNavigatorTarget(
  cardTarget: JudgeTouchboardCard["proof_surface_targets"][number]
): MissionEvidenceNavigatorTarget {
  const surface = MISSION_EVIDENCE_SURFACES[cardTarget.kind];

  return {
    ...surface,
    card_target_id: cardTarget.target_id,
    card_target_label: cardTarget.label,
    card_target_source_ref: cardTarget.source_ref,
    card_target_summary: cardTarget.summary,
    fallback_text: cardTarget.fallback_text || surface.fallback_text,
    proof_tools_grouping: "preserve_collapsed",
    source_ref: cardTarget.source_ref || surface.source_ref,
    summary: cardTarget.summary || surface.summary,
  };
}

export function buildMissionEvidenceNavigatorView(
  card: JudgeTouchboardCard | null | undefined
): MissionEvidenceNavigatorView {
  if (!card) {
    return {
      boundary_copy:
        "Select a judge challenge to route attention toward existing proof surfaces. No panel is clicked or opened automatically.",
      card_label: "No judge challenge selected",
      card_question_id: null,
      dom_poking: false,
      imperative_clicks: false,
      mutation: false,
      selected: false,
      source_mode: "safe_fallback",
      status_label: "Ready",
      targets: [],
      version: MISSION_EVIDENCE_NAVIGATOR_VERSION,
    };
  }

  return {
    boundary_copy:
      "Navigator routes attention through data/state labels only; it does not click, scroll, ungroup, or mutate proof surfaces.",
    card_label: card.label,
    card_question_id: card.question_id,
    dom_poking: false,
    imperative_clicks: false,
    mutation: false,
    selected: true,
    source_mode: "selected_judge_card",
    status_label: "Targeting existing proof",
    targets: card.proof_surface_targets.map(toNavigatorTarget),
    version: MISSION_EVIDENCE_NAVIGATOR_VERSION,
  };
}

export function buildJudgeModeProjection(
  projection: MissionPhysicalProjectionV1 | null | undefined,
  card: JudgeTouchboardCard | null | undefined
): MissionPhysicalProjectionV1 | null {
  if (!projection || !card) {
    return projection ?? null;
  }

  return {
    ...projection,
    foreman: {
      ...projection.foreman,
      current_line: `Judge Mode: ${card.safe_claim}`,
      embodied_state: "challenged",
      paused: true,
    },
    judge_touchboard: {
      active: true,
      selected_question_id: card.question_id,
    },
  };
}
