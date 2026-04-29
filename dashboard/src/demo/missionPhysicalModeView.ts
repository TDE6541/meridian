export const MISSION_PHYSICAL_MODE_VIEW_CONTRACT =
  "meridian.v2d.missionPhysicalModeView.v1" as const;

export type MissionPhysicalLayoutDensity = "presenter" | "stage";
export type MissionPhysicalControlScale = "standard" | "large";

export type MissionPhysicalPromotedSurface =
  | "Foreman Avatar Bay"
  | "Mission Playback Controls"
  | "Proof Spotlight"
  | "Judge Touchboard"
  | "Civic Twin Diorama"
  | "Forensic Receipt Ribbon"
  | "Current decision/HOLD focal card"
  | "Mission Rail";

export interface MissionPhysicalSurfacePriority {
  priority: number;
  surface: MissionPhysicalPromotedSurface;
}

export interface MissionPhysicalModeView {
  boundary: readonly string[];
  control_scale: MissionPhysicalControlScale;
  contract: typeof MISSION_PHYSICAL_MODE_VIEW_CONTRACT;
  hidden_engineer_surfaces: readonly string[];
  layout_density: MissionPhysicalLayoutDensity;
  physical_mode: boolean;
  promoted_surfaces: readonly MissionPhysicalPromotedSurface[];
  proof_tools_grouping: "grouped_collapsed_by_default";
  reduced_motion_safe: boolean;
  reset_behavior: "toggle_may_remain_on_transient_judge_and_proof_state_resets";
  surface_priority: readonly MissionPhysicalSurfacePriority[];
}

const PROMOTED_SURFACES: readonly MissionPhysicalPromotedSurface[] = [
  "Foreman Avatar Bay",
  "Mission Playback Controls",
  "Proof Spotlight",
  "Judge Touchboard",
  "Civic Twin Diorama",
  "Forensic Receipt Ribbon",
  "Current decision/HOLD focal card",
  "Mission Rail",
];

const HIDDEN_ENGINEER_SURFACES = [
  "Engineer cockpit detail grid",
  "Raw scenario selectors",
  "Keyboard shortcut legend",
  "Detailed authority sidecars",
  "Raw forensic chain table",
] as const;

const BOUNDARY_FLAGS = [
  "demo-only",
  "stage-facing layout only",
  "no mobile/judge-device proof claim",
  "no production city claim",
  "no legal sufficiency claim",
  "no official-workflow claim",
  "no live Fort Worth claim",
  "no OpenFGA/CIBA claim",
  "no delivered notification claim",
  "no model/API Foreman claim",
  "no root ForensicChain write claim",
] as const;

export function buildMissionPhysicalModeView({
  physicalMode = false,
}: {
  physicalMode?: boolean;
} = {}): MissionPhysicalModeView {
  return {
    boundary: BOUNDARY_FLAGS,
    control_scale: physicalMode ? "large" : "standard",
    contract: MISSION_PHYSICAL_MODE_VIEW_CONTRACT,
    hidden_engineer_surfaces: physicalMode ? HIDDEN_ENGINEER_SURFACES : [],
    layout_density: physicalMode ? "stage" : "presenter",
    physical_mode: physicalMode,
    promoted_surfaces: PROMOTED_SURFACES,
    proof_tools_grouping: "grouped_collapsed_by_default",
    reduced_motion_safe: true,
    reset_behavior: "toggle_may_remain_on_transient_judge_and_proof_state_resets",
    surface_priority: PROMOTED_SURFACES.map((surface, index) => ({
      priority: index + 1,
      surface,
    })),
  };
}
