export const FICTIONAL_DEMO_PERMIT_ANCHOR_TITLE =
  "Fictional Demo Permit #4471" as const;

export interface FictionalPermitRoleFrame {
  label: "Council" | "Permitting" | "Inspection" | "Operations" | "Public";
  summary: string;
}

export interface FictionalPermitAnchor {
  boundary: string;
  context: string;
  fictionLabel: string;
  foremanReference: string;
  roleFrames: readonly FictionalPermitRoleFrame[];
  title: typeof FICTIONAL_DEMO_PERMIT_ANCHOR_TITLE;
}

export const fictionalPermitAnchor: FictionalPermitAnchor = {
  boundary:
    "No private address. No city record. Demo-only framing.",
  context: "Synthetic case.",
  fictionLabel: "Demo anchor",
  foremanReference: "Presenter display reference only.",
  roleFrames: [
    {
      label: "Council",
      summary: "Oversight sees the refusal point before any governed action proceeds.",
    },
    {
      label: "Permitting",
      summary: "Permit posture stays held until the source-supported proof is present.",
    },
    {
      label: "Inspection",
      summary: "Inspection language stays bounded to missing confirmation, not field status.",
    },
    {
      label: "Operations",
      summary: "Operations sees the corridor action as blocked from execution.",
    },
    {
      label: "Public",
      summary: "Public language stays disclosure-safe and demo-labeled.",
    },
  ],
  title: FICTIONAL_DEMO_PERMIT_ANCHOR_TITLE,
};
