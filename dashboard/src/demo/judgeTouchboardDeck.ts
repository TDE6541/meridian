import type { MissionStageId } from "./missionPlaybackPlan.ts";

export const JUDGE_TOUCHBOARD_DECK_VERSION =
  "meridian.v2d.judgeTouchboardDeck.v1" as const;

export type JudgeQuestionCategory =
  | "audit"
  | "authority"
  | "autonomy"
  | "failure_fallback"
  | "foreman_boundary"
  | "next_ship"
  | "public_boundary"
  | "production_boundary"
  | "remaining_holds";

export type JudgeQuestionId =
  | "audit_trail"
  | "authority_missing"
  | "auth_second_device_failure"
  | "autonomous_safe"
  | "foreman_llm_boundary"
  | "humans_missed"
  | "production_requirements"
  | "production_system"
  | "public_view"
  | "remaining_holds";

export type JudgeProofSurfaceTargetKind =
  | "foreman_avatar"
  | "proof_spotlight"
  | "absence_shadow_map"
  | "authority_handoff"
  | "hold_wall"
  | "absence_lens"
  | "audit_wall"
  | "disclosure_preview"
  | "garp_authority_panel"
  | "mission_rail"
  | "current_focal_card"
  | "proof_tools"
  | "public_boundary"
  | "run_boundary";

export interface JudgeProofSurfaceTargetRef {
  fallback_text: string;
  kind: JudgeProofSurfaceTargetKind;
  label: string;
  source_ref: string;
  summary: string;
  target_id: string;
}

export interface JudgeTouchboardCard {
  category: JudgeQuestionCategory;
  evidence_refs: readonly string[];
  label: string;
  not_claimed: readonly string[];
  proof_surface_targets: readonly JudgeProofSurfaceTargetRef[];
  question_id: JudgeQuestionId;
  recovery_line: string;
  related_stage_id: MissionStageId | null;
  safe_claim: string;
  version: typeof JUDGE_TOUCHBOARD_DECK_VERSION;
}

export type JudgeTouchboardControlAction = "reset";

export interface JudgeTouchboardControl {
  action?: JudgeTouchboardControlAction;
  aria_label: string;
  control_id: string;
  label: string;
  question_id?: JudgeQuestionId;
}

export const JUDGE_REMAINING_HOLDS = [
  "mobile / judge-device proof",
  "full authority choreography screenshot proof",
  "clean logout proof",
  "deploy-hook cleanup proof",
  "final V2-B closeout",
  "Walk-mode MP4 proof",
  "phone smoke",
  "production city status",
  "official Fort Worth workflow",
  "legal/TPIA/TRAIGA sufficiency",
  "public portal behavior",
  "live OpenFGA",
  "CIBA",
  "delivered notifications",
  "model/API-backed Foreman",
  "external voice service",
  "Whisper/audio upload/transcription",
  "root ForensicChain writes",
] as const;

function target(
  kind: JudgeProofSurfaceTargetKind,
  label: string,
  summary: string,
  source_ref: string,
  fallback_text: string
): JudgeProofSurfaceTargetRef {
  return {
    fallback_text,
    kind,
    label,
    source_ref,
    summary,
    target_id: `judge-target-${kind}`,
  };
}

export const JUDGE_TOUCHBOARD_CARDS: readonly JudgeTouchboardCard[] = [
  {
    category: "production_boundary",
    evidence_refs: [
      "dashboard/src/demo/missionPhysicalProjection.ts:MISSION_PHYSICAL_PROJECTION_BOUNDARY",
      "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md",
    ],
    label: "Is this a real Fort Worth production system?",
    not_claimed: [
      "production city system",
      "official Fort Worth workflow",
      "legal/TPIA/TRAIGA sufficiency",
      "live Fort Worth data",
      "public portal behavior",
    ],
    proof_surface_targets: [
      target(
        "run_boundary",
        "Run boundary",
        "Shows that the cockpit is dashboard-local and demo-only.",
        "dashboard/src/demo/missionPhysicalProjection.ts",
        "Use the boundary readout and carried HOLD list if the run boundary is not in focus."
      ),
      target(
        "current_focal_card",
        "Permit #4471 focal card",
        "Keeps the judge anchored to the fictional demo permit.",
        "dashboard/src/demo/fictionalPermitAnchor.ts",
        "Use the Permit #4471 anchor in the Presenter Cockpit."
      ),
    ],
    question_id: "production_system",
    recovery_line:
      "Before production, Meridian would need separate city integration, legal review, operational authority approval, and live-system proof.",
    related_stage_id: "capture",
    safe_claim:
      "This is a demo/proof cockpit over committed scenario data, not a production city system.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "authority",
    evidence_refs: [
      "dashboard/src/components/AuthorityHandoffTheater.tsx",
      "dashboard/src/demo/authorityHandoffView.ts",
      "dashboard/src/demo/authorityHandoffBeats.ts",
    ],
    label: "What happens when authority is missing?",
    not_claimed: [
      "live OpenFGA approval",
      "CIBA approval",
      "live phone approval",
      "delivered notification behavior",
      "production auth behavior",
    ],
    proof_surface_targets: [
      target(
        "authority_handoff",
        "Authority Handoff Theater",
        "Routes attention to the local permission-transfer posture.",
        "dashboard/src/components/AuthorityHandoffTheater.tsx",
        "Use the authority handoff section when the theater is not active."
      ),
      target(
        "garp_authority_panel",
        "GARP authority panel",
        "Shows dashboard-local authority state without external authorization claims.",
        "dashboard/src/authority/authorityStateAdapter.ts",
        "Use the Engineer Mode GARP panel through the existing Proof Tools path."
      ),
    ],
    question_id: "authority_missing",
    recovery_line:
      "The safe next step is to keep the mission held until a separately approved authority path is proven.",
    related_stage_id: "authority",
    safe_claim:
      "When required authority is missing, the cockpit holds or routes to the local Authority Handoff Theater instead of inventing approval.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "audit",
    evidence_refs: [
      "dashboard/src/components/DemoAuditWall.tsx",
      "dashboard/src/demo/demoAudit.ts",
      "dashboard/src/adapters/forensicAdapter.ts",
    ],
    label: "Where is the audit trail?",
    not_claimed: [
      "legal audit record",
      "root ForensicChain write",
      "public audit portal",
      "production audit log",
    ],
    proof_surface_targets: [
      target(
        "audit_wall",
        "Demo Audit Wall",
        "Points to existing scenario decision rows and source refs.",
        "dashboard/src/demo/demoAudit.ts",
        "Use the Proof Tools Audit Wall button; D9 does not open it automatically."
      ),
      target(
        "proof_spotlight",
        "Proof Spotlight",
        "Keeps the current proof target visible without writing a receipt.",
        "dashboard/src/components/ProofSpotlight.tsx",
        "Use the visible Evidence Beam as the stage proof pointer."
      ),
    ],
    question_id: "audit_trail",
    recovery_line:
      "For legal audit posture, Meridian needs a separately shipped receipt and review process.",
    related_stage_id: "chain",
    safe_claim:
      "The demo audit trail is a dashboard-local view over existing scenario and forensic adapter output.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "remaining_holds",
    evidence_refs: [
      "dashboard/src/components/AbsenceShadowMap.tsx",
      "dashboard/src/demo/absenceShadowSlots.ts",
      "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md",
    ],
    label: "What did the system detect that humans missed?",
    not_claimed: [
      "new absence truth",
      "new governance truth",
      "legal sufficiency",
      "official city finding",
    ],
    proof_surface_targets: [
      target(
        "absence_shadow_map",
        "Absence Shadow Map",
        "Shows expected proof slots and carried gaps already present in the D7 surface.",
        "dashboard/src/demo/absenceShadowSlots.ts",
        "Use the visible Absence Shadow Map; D9 does not compute missing evidence."
      ),
      target(
        "absence_lens",
        "Absence Lens",
        "Routes toward existing source-bounded absence signals.",
        "dashboard/src/demo/missionAbsenceLens.ts",
        "Use the existing Proof Tools Absence Lens toggle when needed."
      ),
    ],
    question_id: "humans_missed",
    recovery_line:
      "Any closure requires upstream evidence, authority, and review outside this D9 touchboard.",
    related_stage_id: "absence",
    safe_claim:
      "The cockpit can show source-bounded missing-proof slots that are already present in dashboard state.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "public_boundary",
    evidence_refs: [
      "dashboard/src/adapters/skinPayloadAdapter.ts",
      "dashboard/src/components/DisclosurePreviewPanel.tsx",
      "dashboard/src/authority/disclosurePreviewReport.ts",
    ],
    label: "What can the public see?",
    not_claimed: [
      "public portal behavior",
      "official public release",
      "live publication",
      "legal disclosure sufficiency",
    ],
    proof_surface_targets: [
      target(
        "disclosure_preview",
        "Disclosure preview",
        "Shows the dashboard-local disclosure preview over committed skin outputs.",
        "dashboard/src/components/DisclosurePreviewPanel.tsx",
        "Use Engineer Mode disclosure preview through the existing grouped tools path."
      ),
      target(
        "public_boundary",
        "Public boundary",
        "Keeps the public view inside the committed scenario boundary.",
        "dashboard/src/adapters/skinPayloadAdapter.ts",
        "Use the public skin summary; step.skins.outputs remains canonical."
      ),
    ],
    question_id: "public_view",
    recovery_line:
      "Public-facing release would need approved portal behavior, publication controls, and disclosure review.",
    related_stage_id: "public",
    safe_claim:
      "The public view is a bounded disclosure preview over committed dashboard skin outputs.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "failure_fallback",
    evidence_refs: [
      "dashboard/src/roleSession/resolveRoleSession.ts",
      "dashboard/src/components/AuthorityNotificationDemo.tsx",
      "docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md",
    ],
    label: "What if Auth0 or the second device fails?",
    not_claimed: [
      "clean logout proof",
      "mobile / judge-device proof",
      "live phone dependency",
      "delivered notifications",
      "production auth continuity",
    ],
    proof_surface_targets: [
      target(
        "garp_authority_panel",
        "GARP authority panel",
        "Shows fallback authority posture and missing proof boundaries.",
        "dashboard/src/components/AuthorityResolutionPanel.tsx",
        "Use the existing GARP panel; D9 does not call Auth0 or a phone flow."
      ),
      target(
        "hold_wall",
        "HOLD Wall",
        "Carries unresolved proof gaps without closing them.",
        "dashboard/src/demo/holdWall.ts",
        "Use HOLD Wall only through the existing user-controlled path."
      ),
    ],
    question_id: "auth_second_device_failure",
    recovery_line:
      "If auth, device, phone, or notification proof is unavailable, the safe posture remains HOLD.",
    related_stage_id: "authority",
    safe_claim:
      "Missing Auth0, second-device, phone, or delivered-notification proof remains a fallback/HOLD posture.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "foreman_boundary",
    evidence_refs: [
      "dashboard/src/components/ForemanAvatarBay.tsx",
      "dashboard/src/foremanGuide/foremanEmbodiedState.ts",
      "dashboard/src/demo/foremanMissionCues.ts",
    ],
    label: "Is Foreman using an LLM?",
    not_claimed: [
      "model/API-backed Foreman",
      "live model Q&A",
      "open-ended answers",
      "external voice service",
      "Whisper/audio upload/transcription",
    ],
    proof_surface_targets: [
      target(
        "foreman_avatar",
        "Foreman Avatar Bay",
        "Shows the challenged/Judge Mode posture and bounded answer card.",
        "dashboard/src/components/ForemanAvatarBay.tsx",
        "Use the Foreman Avatar Bay; no text input or live model path exists."
      ),
      target(
        "proof_tools",
        "Grouped Proof Tools",
        "Keeps advanced tools user-controlled and collapsed by default.",
        "dashboard/src/components/MissionPresentationShell.tsx",
        "Proof Tools stay grouped; D9 does not click or ungroup them."
      ),
    ],
    question_id: "foreman_llm_boundary",
    recovery_line:
      "A model-backed Foreman would require a separate approved design, key handling, tests, and proof boundary.",
    related_stage_id: null,
    safe_claim:
      "Foreman responses in D9 are preauthored cards and deterministic display state, not live model Q&A.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "remaining_holds",
    evidence_refs: [
      "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md",
      "dashboard/src/demo/absenceShadowSlots.ts",
    ],
    label: "What is still HOLD?",
    not_claimed: JUDGE_REMAINING_HOLDS,
    proof_surface_targets: [
      target(
        "hold_wall",
        "HOLD Wall",
        "Shows unresolved gaps without claiming closure.",
        "dashboard/src/demo/holdWall.ts",
        "Use the existing HOLD Wall path when source-backed fields are present."
      ),
      target(
        "absence_shadow_map",
        "Absence Shadow Map",
        "Shows carried manual proof slots still unresolved.",
        "dashboard/src/demo/absenceShadowSlots.ts",
        "Use the visible carried-HOLD slots."
      ),
    ],
    question_id: "remaining_holds",
    recovery_line:
      "These HOLDs carry forward until separate proof packets resolve them.",
    related_stage_id: null,
    safe_claim:
      "D9 lists unresolved manual/global proof gaps and does not close any of them.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "autonomy",
    evidence_refs: [
      "dashboard/src/demo/missionPlaybackController.ts",
      "dashboard/src/demo/foremanAutonomousConductor.ts",
      "dashboard/src/components/MissionPlaybackControls.tsx",
    ],
    label: "Why is autonomous safe?",
    not_claimed: [
      "autonomous legal authority",
      "production autonomy",
      "new governance truth",
      "new authority truth",
      "unbounded Foreman behavior",
    ],
    proof_surface_targets: [
      target(
        "mission_rail",
        "Six-stage mission rail",
        "Shows the bounded stage path and current stage preservation.",
        "dashboard/src/components/MissionRail.tsx",
        "Use the visible stage rail; D9 does not emit stage-enter events."
      ),
      target(
        "foreman_avatar",
        "Foreman challenged posture",
        "Shows that the Foreman display is in Judge Mode while interrupted.",
        "dashboard/src/components/ForemanAvatarBay.tsx",
        "Use the Foreman Avatar Bay Judge Mode card."
      ),
    ],
    question_id: "autonomous_safe",
    recovery_line:
      "Autonomy stays demo-local until separate runtime, authority, audit, and operator approvals are proven.",
    related_stage_id: null,
    safe_claim:
      "The autonomous path is bounded to a scripted local mission controller that can pause, resume, and reset.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
  {
    category: "next_ship",
    evidence_refs: [
      "docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md",
      "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md",
    ],
    label: "What would be required before production?",
    not_claimed: [
      "city integration complete",
      "operational authority approved",
      "legal review complete",
      "live-system proof complete",
      "production deployment complete",
    ],
    proof_surface_targets: [
      target(
        "run_boundary",
        "Run boundary",
        "Keeps the before-production answer attached to shipped demo proof limits.",
        "docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md",
        "Use the carried HOLD list as the production-readiness boundary."
      ),
      target(
        "proof_tools",
        "Grouped Proof Tools",
        "Leaves detailed proof access under user control.",
        "dashboard/src/components/MissionPresentationShell.tsx",
        "Proof Tools stay grouped; no forced opening occurs."
      ),
    ],
    question_id: "production_requirements",
    recovery_line:
      "Before production, Meridian would need city integration, legal review, operational authority approval, live-system proof, and deploy/runbook proof.",
    related_stage_id: null,
    safe_claim:
      "Production readiness is outside D9; this packet only routes judges to existing proof and HOLD boundaries.",
    version: JUDGE_TOUCHBOARD_DECK_VERSION,
  },
] as const;

export const JUDGE_TOUCHBOARD_CONTROLS: readonly JudgeTouchboardControl[] = [
  {
    aria_label: "Challenge Foreman with a bounded autonomy question",
    control_id: "challenge-foreman",
    label: "Challenge Foreman",
    question_id: "autonomous_safe",
  },
  {
    aria_label: "Show authority handoff proof posture",
    control_id: "show-authority",
    label: "Show Authority",
    question_id: "authority_missing",
  },
  {
    aria_label: "Show what existing proof says is missing",
    control_id: "what-is-missing",
    label: "What Is Missing?",
    question_id: "humans_missed",
  },
  {
    aria_label: "Show audit trail proof posture",
    control_id: "show-audit-trail",
    label: "Show Audit Trail",
    question_id: "audit_trail",
  },
  {
    aria_label: "Show public disclosure boundary",
    control_id: "show-public-view",
    label: "Show Public View",
    question_id: "public_view",
  },
  {
    aria_label: "Show remaining HOLD proof gaps",
    control_id: "what-is-still-hold",
    label: "What Is Still HOLD?",
    question_id: "remaining_holds",
  },
  {
    aria_label: "Show production boundary answer",
    control_id: "is-this-production",
    label: "Is This Production?",
    question_id: "production_system",
  },
  {
    action: "reset",
    aria_label: "Reset the local mission for the next judge",
    control_id: "reset-for-next-judge",
    label: "Reset For Next Judge",
  },
] as const;

export function getJudgeTouchboardCard(
  questionId: JudgeQuestionId | null | undefined
): JudgeTouchboardCard | null {
  if (!questionId) {
    return null;
  }

  return (
    JUDGE_TOUCHBOARD_CARDS.find((card) => card.question_id === questionId) ??
    null
  );
}
