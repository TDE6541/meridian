import type { MissionStageId } from "./missionPlaybackPlan.ts";

export const AUTHORITY_HANDOFF_BEAT_REGISTRY_VERSION =
  "meridian.v2d.authorityHandoffBeats.v1" as const;

export type AuthorityHandoffTokenState =
  | "approved"
  | "denied"
  | "fallback_simulated"
  | "held"
  | "in_review"
  | "not_requested"
  | "request_created";

export interface AuthorityHandoffBeat {
  approver_role: string;
  beat_id: string;
  non_claims: readonly string[];
  requester_role: string;
  source_ref: string;
  stage_id: MissionStageId;
  token_state: AuthorityHandoffTokenState;
  version: typeof AUTHORITY_HANDOFF_BEAT_REGISTRY_VERSION;
  visible_claim: string;
}

const AUTHORITY_NON_CLAIMS = [
  "no_live_phone_claim",
  "no_openfga_claim",
  "no_ciba_claim",
  "no_production_auth_claim",
  "no_delivered_notification_claim",
  "no_public_portal_claim",
] as const;

export const AUTHORITY_HANDOFF_BEATS: readonly AuthorityHandoffBeat[] = [
  {
    approver_role: "director_authorized_approver",
    beat_id: "authority-beat-inspector-to-director",
    non_claims: AUTHORITY_NON_CLAIMS,
    requester_role: "inspector_requester",
    source_ref: "dashboard/src/demo/foremanMissionCues.ts:foreman-cue-authority",
    stage_id: "authority",
    token_state: "fallback_simulated",
    version: AUTHORITY_HANDOFF_BEAT_REGISTRY_VERSION,
    visible_claim: "Inspector request routes to the authorized approver lane in local demo state.",
  },
  {
    approver_role: "authorized_approver_required",
    beat_id: "authority-beat-governance-hold",
    non_claims: AUTHORITY_NON_CLAIMS,
    requester_role: "governed_request",
    source_ref: "dashboard/src/demo/holdWall.ts",
    stage_id: "governance",
    token_state: "held",
    version: AUTHORITY_HANDOFF_BEAT_REGISTRY_VERSION,
    visible_claim: "Missing or challenged authority remains a governed HOLD display.",
  },
  {
    approver_role: "restricted_proof_boundary",
    beat_id: "authority-beat-public-boundary",
    non_claims: AUTHORITY_NON_CLAIMS,
    requester_role: "public_viewer",
    source_ref: "docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md#legal-and-production-boundary",
    stage_id: "public",
    token_state: "held",
    version: AUTHORITY_HANDOFF_BEAT_REGISTRY_VERSION,
    visible_claim: "Public viewer sees a bounded disclosure posture with restricted proof dimming.",
  },
] as const;

export function getAuthorityHandoffBeatsForStage(
  stageId: MissionStageId
): readonly AuthorityHandoffBeat[] {
  return AUTHORITY_HANDOFF_BEATS.filter((beat) => beat.stage_id === stageId);
}
