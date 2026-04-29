import {
  runMissionFailureInjectionSuite,
  type MissionFailureInjectionResult,
} from "./missionFailureInjection.ts";

export const MISSION_REHEARSAL_CERTIFICATION_VERSION =
  "meridian.v2d.missionRehearsalCertification.v1" as const;

export type MissionRehearsalCertificationStatus = "PASS" | "HOLD";

export type MissionRehearsalCheckId =
  | "absence_shadow_map"
  | "authority_handoff_theater"
  | "boundary_non_claim_posture"
  | "civic_twin_diorama"
  | "current_decision_hold_focal_card"
  | "evidence_navigator"
  | "foreman_autonomous_conductor"
  | "foreman_autonomous_policy"
  | "foreman_mount_avatar_bay"
  | "forensic_receipt_ribbon"
  | "guided_policy"
  | "judge_touchboard"
  | "mission_control_physical_mode"
  | "mission_playback_controller"
  | "mission_rail"
  | "mission_run_receipt_panel"
  | "nonblocking_warning_policy"
  | "permit_4471_anchor"
  | "presenter_cockpit"
  | "proof_spotlight"
  | "proof_tools_disclosure"
  | "required_scenario_demo_data_posture"
  | "reset_behavior";

export interface MissionRehearsalBoundary {
  demo_only: true;
  no_delivered_notification_claim: true;
  no_legal_sufficiency_claim: true;
  no_live_fort_worth_claim: true;
  no_mobile_judge_device_proof_claim: true;
  no_model_api_foreman_claim: true;
  no_openfga_ciba_claim: true;
  no_production_city_claim: true;
  no_root_forensic_chain_write_claim: true;
}

export interface MissionRehearsalCheck {
  blocking: boolean;
  check_id: MissionRehearsalCheckId;
  evidence: readonly string[];
  label: string;
  status: MissionRehearsalCertificationStatus;
}

export interface MissionRehearsalModeTested {
  evidence: readonly string[];
  label: string;
  mode_id: "foreman_autonomous" | "guided";
  status: MissionRehearsalCertificationStatus;
}

export interface MissionRehearsalManualHold {
  display_label: string;
  hold_id: string;
  label: string;
  status: "HOLD";
}

export interface MissionRehearsalCertificationV1 {
  boundary: MissionRehearsalBoundary;
  certification_id: string;
  checks: readonly MissionRehearsalCheck[];
  created_at: string;
  injected_failures: readonly MissionFailureInjectionResult[];
  modes_tested: readonly MissionRehearsalModeTested[];
  remaining_manual_holds: readonly MissionRehearsalManualHold[];
  status: MissionRehearsalCertificationStatus;
  version: typeof MISSION_REHEARSAL_CERTIFICATION_VERSION;
}

export interface BuildMissionRehearsalCertificationInput {
  certificationId?: string;
  createdAt?: string;
  surfaces?: Partial<Record<MissionRehearsalCheckId, boolean>>;
}

interface CheckDefinition {
  blocking: boolean;
  check_id: MissionRehearsalCheckId;
  label: string;
}

const CHECK_DEFINITIONS: readonly CheckDefinition[] = [
  {
    blocking: true,
    check_id: "presenter_cockpit",
    label: "Presenter Cockpit",
  },
  {
    blocking: true,
    check_id: "mission_rail",
    label: "Mission Rail",
  },
  {
    blocking: true,
    check_id: "permit_4471_anchor",
    label: "Permit #4471 anchor",
  },
  {
    blocking: true,
    check_id: "current_decision_hold_focal_card",
    label: "current decision/HOLD focal card",
  },
  {
    blocking: true,
    check_id: "proof_tools_disclosure",
    label: "Proof Tools disclosure",
  },
  {
    blocking: true,
    check_id: "foreman_mount_avatar_bay",
    label: "Foreman mount / Foreman Avatar Bay",
  },
  {
    blocking: true,
    check_id: "guided_policy",
    label: "Guided policy",
  },
  {
    blocking: true,
    check_id: "foreman_autonomous_policy",
    label: "Foreman Autonomous policy",
  },
  {
    blocking: true,
    check_id: "mission_playback_controller",
    label: "mission playback controller",
  },
  {
    blocking: true,
    check_id: "foreman_autonomous_conductor",
    label: "Foreman autonomous conductor",
  },
  {
    blocking: true,
    check_id: "mission_control_physical_mode",
    label: "Mission Control Physical Mode",
  },
  {
    blocking: true,
    check_id: "proof_spotlight",
    label: "Proof Spotlight",
  },
  {
    blocking: true,
    check_id: "absence_shadow_map",
    label: "Absence Shadow Map",
  },
  {
    blocking: true,
    check_id: "authority_handoff_theater",
    label: "Authority Handoff Theater",
  },
  {
    blocking: true,
    check_id: "judge_touchboard",
    label: "Judge Touchboard",
  },
  {
    blocking: true,
    check_id: "evidence_navigator",
    label: "Evidence Navigator",
  },
  {
    blocking: true,
    check_id: "civic_twin_diorama",
    label: "Civic Twin Diorama",
  },
  {
    blocking: true,
    check_id: "forensic_receipt_ribbon",
    label: "Forensic Receipt Ribbon",
  },
  {
    blocking: true,
    check_id: "mission_run_receipt_panel",
    label: "Mission Run Receipt Panel",
  },
  {
    blocking: true,
    check_id: "reset_behavior",
    label: "reset behavior",
  },
  {
    blocking: true,
    check_id: "required_scenario_demo_data_posture",
    label: "required scenario/demo data posture",
  },
  {
    blocking: true,
    check_id: "boundary_non_claim_posture",
    label: "boundary/non-claim posture",
  },
  {
    blocking: false,
    check_id: "nonblocking_warning_policy",
    label: "nonblocking warning policy",
  },
] as const;

const DEFAULT_SURFACES: Record<MissionRehearsalCheckId, boolean> =
  Object.fromEntries(
    CHECK_DEFINITIONS.map((definition) => [definition.check_id, true])
  ) as Record<MissionRehearsalCheckId, boolean>;

export const MISSION_REHEARSAL_MANUAL_HOLDS: readonly MissionRehearsalManualHold[] =
  [
    {
      display_label: "mobile / judge-device proof",
      hold_id: "mobile_judge_device_proof",
      label: "mobile / judge-device proof",
      status: "HOLD",
    },
    {
      display_label: "authority choreography screenshots",
      hold_id: "full_authority_choreography_screenshot_proof",
      label: "full authority choreography screenshot proof",
      status: "HOLD",
    },
    {
      display_label: "clean logout proof",
      hold_id: "clean_logout_proof",
      label: "clean logout proof",
      status: "HOLD",
    },
    {
      display_label: "deploy-hook cleanup proof",
      hold_id: "deploy_hook_cleanup_proof",
      label: "deploy-hook cleanup proof",
      status: "HOLD",
    },
    {
      display_label: "final V2-B closeout",
      hold_id: "final_v2b_closeout",
      label: "final V2-B closeout",
      status: "HOLD",
    },
    {
      display_label: "Walk-mode MP4 proof",
      hold_id: "walk_mode_mp4_proof",
      label: "Walk-mode MP4 proof",
      status: "HOLD",
    },
    {
      display_label: "phone smoke",
      hold_id: "phone_smoke",
      label: "phone smoke",
      status: "HOLD",
    },
    {
      display_label: "production city status",
      hold_id: "production_city_status",
      label: "production city status",
      status: "HOLD",
    },
    {
      display_label: "official FW workflow",
      hold_id: "official_fort_worth_workflow",
      label: "official Fort Worth workflow",
      status: "HOLD",
    },
    {
      display_label: "TPIA/TRAIGA review",
      hold_id: "legal_tpia_traiga_sufficiency",
      label: "legal/TPIA/TRAIGA sufficiency",
      status: "HOLD",
    },
    {
      display_label: "public portal behavior",
      hold_id: "public_portal_behavior",
      label: "public portal behavior",
      status: "HOLD",
    },
    {
      display_label: "live OpenFGA",
      hold_id: "live_openfga",
      label: "live OpenFGA",
      status: "HOLD",
    },
    {
      display_label: "CIBA",
      hold_id: "ciba",
      label: "CIBA",
      status: "HOLD",
    },
    {
      display_label: "delivered notifications",
      hold_id: "delivered_notifications",
      label: "delivered notifications",
      status: "HOLD",
    },
    {
      display_label: "model/API-backed Foreman",
      hold_id: "model_api_backed_foreman",
      label: "model/API-backed Foreman",
      status: "HOLD",
    },
    {
      display_label: "external voice service",
      hold_id: "external_voice_service",
      label: "external voice service",
      status: "HOLD",
    },
    {
      display_label: "Whisper/audio transcription",
      hold_id: "whisper_audio_upload_transcription",
      label: "Whisper/audio upload/transcription",
      status: "HOLD",
    },
    {
      display_label: "root ForensicChain writes",
      hold_id: "root_forensic_chain_writes",
      label: "root ForensicChain writes",
      status: "HOLD",
    },
  ] as const;

export const MISSION_REHEARSAL_BOUNDARY: MissionRehearsalBoundary = {
  demo_only: true,
  no_delivered_notification_claim: true,
  no_legal_sufficiency_claim: true,
  no_live_fort_worth_claim: true,
  no_mobile_judge_device_proof_claim: true,
  no_model_api_foreman_claim: true,
  no_openfga_ciba_claim: true,
  no_production_city_claim: true,
  no_root_forensic_chain_write_claim: true,
};

function checkEvidence(label: string, ready: boolean, blocking: boolean): readonly string[] {
  if (ready) {
    return [`${label} available for dashboard-local rehearsal.`];
  }

  return [
    `HOLD: ${label} unavailable in dashboard-local rehearsal.`,
    blocking ? "blocking:true" : "blocking:false",
  ];
}

function buildChecks(
  surfaces: Partial<Record<MissionRehearsalCheckId, boolean>>
): readonly MissionRehearsalCheck[] {
  const merged = {
    ...DEFAULT_SURFACES,
    ...surfaces,
  };

  return CHECK_DEFINITIONS.map((definition) => {
    const ready = merged[definition.check_id] === true;

    return {
      blocking: definition.blocking,
      check_id: definition.check_id,
      evidence: checkEvidence(definition.label, ready, definition.blocking),
      label: definition.label,
      status: ready ? "PASS" : "HOLD",
    };
  });
}

function buildModesTested(
  failures: readonly MissionFailureInjectionResult[]
): readonly MissionRehearsalModeTested[] {
  const guided = failures.find(
    (entry) => entry.failure_id === "guided_accelerated_full_run"
  );
  const autonomous = failures.find(
    (entry) => entry.failure_id === "foreman_autonomous_accelerated_full_run"
  );

  return [
    {
      evidence: guided?.evidence ?? ["guided run evidence unavailable"],
      label: "Guided Mission",
      mode_id: "guided",
      status: guided?.status ?? "HOLD",
    },
    {
      evidence: autonomous?.evidence ?? ["autonomous run evidence unavailable"],
      label: "Foreman Autonomous",
      mode_id: "foreman_autonomous",
      status: autonomous?.status ?? "HOLD",
    },
  ];
}

export function buildMissionRehearsalCertification(
  input: BuildMissionRehearsalCertificationInput = {}
): MissionRehearsalCertificationV1 {
  const createdAt = input.createdAt ?? "dashboard-local-rehearsal";
  const certificationId =
    input.certificationId ?? "mission-rehearsal-dashboard-local";
  const checks = buildChecks(input.surfaces ?? {});
  const failureSuite = runMissionFailureInjectionSuite();
  const modesTested = buildModesTested(failureSuite.results);
  const blockingHold = checks.some(
    (check) => check.blocking && check.status === "HOLD"
  );
  const failureHold = failureSuite.status === "HOLD";

  return {
    boundary: MISSION_REHEARSAL_BOUNDARY,
    certification_id: certificationId,
    checks,
    created_at: createdAt,
    injected_failures: failureSuite.results,
    modes_tested: modesTested,
    remaining_manual_holds: MISSION_REHEARSAL_MANUAL_HOLDS,
    status: blockingHold || failureHold ? "HOLD" : "PASS",
    version: MISSION_REHEARSAL_CERTIFICATION_VERSION,
  };
}
