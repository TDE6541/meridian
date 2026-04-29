import type {
  AuthorityHandoffBeat,
  AuthorityHandoffTokenState,
} from "./authorityHandoffBeats.ts";
import {
  getMissionStageDefinition,
  type MissionStageId,
} from "./missionPlaybackPlan.ts";
import type { MissionPhysicalProjectionV1 } from "./missionPhysicalProjection.ts";

export const AUTHORITY_HANDOFF_VIEW_VERSION =
  "meridian.v2d.authorityHandoffView.v1" as const;

export const AUTHORITY_HANDOFF_TOKEN_STATES = [
  "not_requested",
  "request_created",
  "in_review",
  "approved",
  "denied",
  "held",
  "fallback_simulated",
] as const satisfies readonly AuthorityHandoffTokenState[];

export type AuthorityHandoffStatus = "holding" | "idle" | "ready" | "unavailable";

export type AuthorityRoleSide =
  | "approver"
  | "observer"
  | "public-boundary"
  | "requester";

export type AuthorityHandoffSourceMode =
  | "d4_projection_active_beat"
  | "d4_projection_idle_stage"
  | "d4_projection_required_beat_missing"
  | "projection_unavailable";

export interface AuthorityTokenStateDisplay {
  description: string;
  label: string;
  state: AuthorityHandoffTokenState;
}

export interface AuthorityRoleCardView {
  can_approve: boolean;
  can_deny: boolean;
  can_request: boolean;
  can_view: boolean;
  capability_label: string;
  current_posture: string;
  role_id: string;
  role_label: string;
  side: AuthorityRoleSide;
  source_note: string;
}

export interface AuthorityNonClaimView {
  claim_id: string;
  label: string;
  posture: string;
}

export interface AuthorityHandoffTheaterView {
  active_stage_label: string;
  beat_id: string | null;
  boundary_copy: string;
  compact: boolean;
  fallback_copy: string;
  live_boundary_copy: string;
  local_proof_copy: string;
  motion_label: string;
  non_claims: readonly AuthorityNonClaimView[];
  role_cards: readonly AuthorityRoleCardView[];
  source_mode: AuthorityHandoffSourceMode;
  source_ref: string;
  stage_id: MissionStageId | null;
  status: AuthorityHandoffStatus;
  status_label: string;
  token_state: AuthorityHandoffTokenState;
  token_state_description: string;
  token_state_label: string;
  token_states: readonly AuthorityTokenStateDisplay[];
  transfer_label: string;
  version: typeof AUTHORITY_HANDOFF_VIEW_VERSION;
  visible_claim: string;
}

const AUTHORITY_STAGE_IDS = ["authority", "governance", "public"] as const;

const SAFE_BOUNDARY_COPY =
  "Authority is displayed as a bounded handoff. Missing or unproven authority remains visible instead of being assumed.";

const LOCAL_PROOF_COPY =
  "Authority handoff is shown as a local deterministic proof. GARP/Auth proof access remains available through the existing grouped Proof Tools.";

const LIVE_BOUNDARY_COPY =
  "This does not claim live OpenFGA, CIBA, phone approval, delivered notifications, production auth, Fort Worth workflow, public portal behavior, or legal sufficiency.";

const CARRIED_HOLD_COPY =
  "Full authority choreography screenshot proof and live phone proof remain carried HOLD.";

export const AUTHORITY_TOKEN_STATE_DISPLAYS: Readonly<
  Record<AuthorityHandoffTokenState, AuthorityTokenStateDisplay>
> = {
  approved: {
    description: "Approved in the local projection only.",
    label: "Approved",
    state: "approved",
  },
  denied: {
    description: "Denied in the local projection only.",
    label: "Denied",
    state: "denied",
  },
  fallback_simulated: {
    description: "Fallback simulated in deterministic demo state.",
    label: "Fallback simulated",
    state: "fallback_simulated",
  },
  held: {
    description: "Governed HOLD remains visible.",
    label: "Held",
    state: "held",
  },
  in_review: {
    description: "Review posture is visible; no live approval is claimed.",
    label: "In review",
    state: "in_review",
  },
  not_requested: {
    description: "No authority request is projected.",
    label: "Not requested",
    state: "not_requested",
  },
  request_created: {
    description: "Request created in projected local state.",
    label: "Request created",
    state: "request_created",
  },
};

const NON_CLAIM_LABELS: Record<string, AuthorityNonClaimView> = {
  no_ciba_claim: {
    claim_id: "no_ciba_claim",
    label: "CIBA",
    posture: "unshipped",
  },
  no_delivered_notification_claim: {
    claim_id: "no_delivered_notification_claim",
    label: "Delivered notifications",
    posture: "unshipped",
  },
  no_live_phone_claim: {
    claim_id: "no_live_phone_claim",
    label: "Phone approval",
    posture: "carried HOLD",
  },
  no_openfga_claim: {
    claim_id: "no_openfga_claim",
    label: "OpenFGA",
    posture: "unshipped",
  },
  no_production_auth_claim: {
    claim_id: "no_production_auth_claim",
    label: "Production auth",
    posture: "unclaimed",
  },
  no_public_portal_claim: {
    claim_id: "no_public_portal_claim",
    label: "Public portal",
    posture: "unclaimed",
  },
};

function isAuthorityStage(stageId: MissionStageId | null): stageId is MissionStageId {
  return (
    stageId !== null &&
    AUTHORITY_STAGE_IDS.includes(stageId as (typeof AUTHORITY_STAGE_IDS)[number])
  );
}

function stageLabel(stageId: MissionStageId | null): string {
  if (!stageId) {
    return "Lobby / no active authority stage";
  }

  return `${getMissionStageDefinition(stageId).label} (${stageId})`;
}

function roleLabel(roleId: string): string {
  const normalized = roleId.toLowerCase();

  if (normalized.includes("inspector")) {
    return "Inspector / requester";
  }

  if (normalized.includes("director")) {
    return "Director / authorized approver";
  }

  if (normalized.includes("operations")) {
    return "Operations observer";
  }

  if (normalized.includes("council")) {
    return "Council observer";
  }

  if (normalized.includes("restricted") || normalized.includes("boundary")) {
    return "Public / restricted proof boundary";
  }

  if (normalized.includes("public")) {
    return "Public viewer";
  }

  if (normalized.includes("authorized") || normalized.includes("approver")) {
    return "Authorized approver";
  }

  if (normalized.includes("governed")) {
    return "Governed requester";
  }

  return roleId
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function roleSide(
  roleId: string,
  sourceSide: "approver" | "requester"
): AuthorityRoleSide {
  const normalized = roleId.toLowerCase();

  if (normalized.includes("restricted") || normalized.includes("boundary")) {
    return "public-boundary";
  }

  if (normalized.includes("public")) {
    return "observer";
  }

  return sourceSide;
}

function postureForToken(tokenState: AuthorityHandoffTokenState): string {
  return AUTHORITY_TOKEN_STATE_DISPLAYS[tokenState].description;
}

function capabilitiesFor(side: AuthorityRoleSide) {
  if (side === "requester") {
    return {
      can_approve: false,
      can_deny: false,
      can_request: true,
      can_view: true,
      capability_label: "Can request; can view",
    };
  }

  if (side === "approver") {
    return {
      can_approve: true,
      can_deny: true,
      can_request: false,
      can_view: true,
      capability_label: "Can approve or deny; can view",
    };
  }

  return {
    can_approve: false,
    can_deny: false,
    can_request: false,
    can_view: true,
    capability_label: "View only",
  };
}

function roleCardFor(
  roleId: string,
  sourceSide: "approver" | "requester",
  tokenState: AuthorityHandoffTokenState
): AuthorityRoleCardView {
  const side = roleSide(roleId, sourceSide);
  const capabilities = capabilitiesFor(side);

  return {
    ...capabilities,
    current_posture: postureForToken(tokenState),
    role_id: roleId,
    role_label: roleLabel(roleId),
    side,
    source_note: `Mapped from D4 authority handoff beat ${sourceSide}_role; no production role binding is claimed.`,
  };
}

function roleCardsFor(beat: AuthorityHandoffBeat): readonly AuthorityRoleCardView[] {
  const cards = [
    roleCardFor(beat.requester_role, "requester", beat.token_state),
    roleCardFor(beat.approver_role, "approver", beat.token_state),
  ];
  const seen = new Set<string>();

  return cards.filter((card) => {
    const key = `${card.side}:${card.role_id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function nonClaimsFor(
  beat: AuthorityHandoffBeat | null
): readonly AuthorityNonClaimView[] {
  const fromBeat =
    beat?.non_claims.map(
      (claimId) =>
        NON_CLAIM_LABELS[claimId] ?? {
          claim_id: claimId,
          label: claimId,
          posture: "unclaimed",
        }
    ) ?? [];

  return [
    ...fromBeat,
    {
      claim_id: "no_fort_worth_workflow_claim",
      label: "Fort Worth workflow",
      posture: "unclaimed",
    },
    {
      claim_id: "no_legal_sufficiency_claim",
      label: "Legal sufficiency",
      posture: "unclaimed",
    },
  ];
}

function tokenDisplay(
  tokenState: AuthorityHandoffTokenState
): AuthorityTokenStateDisplay {
  return AUTHORITY_TOKEN_STATE_DISPLAYS[tokenState];
}

function baseView(
  stageId: MissionStageId | null,
  overrides: Partial<AuthorityHandoffTheaterView>
): AuthorityHandoffTheaterView {
  const token = tokenDisplay(overrides.token_state ?? "not_requested");

  return {
    active_stage_label: stageLabel(stageId),
    beat_id: null,
    boundary_copy: SAFE_BOUNDARY_COPY,
    compact: false,
    fallback_copy: CARRIED_HOLD_COPY,
    live_boundary_copy: LIVE_BOUNDARY_COPY,
    local_proof_copy: LOCAL_PROOF_COPY,
    motion_label:
      "Reduced motion safe: role cards, token state, claim, non-claims, and source refs remain visible.",
    non_claims: nonClaimsFor(null),
    role_cards: [],
    source_mode: "projection_unavailable",
    source_ref: "projection unavailable",
    stage_id: stageId,
    status: "unavailable",
    status_label: "HOLD: projection unavailable",
    token_state: token.state,
    token_state_description: token.description,
    token_state_label: token.label,
    token_states: AUTHORITY_HANDOFF_TOKEN_STATES.map(tokenDisplay),
    transfer_label: "Requester -> approver handoff unavailable",
    version: AUTHORITY_HANDOFF_VIEW_VERSION,
    visible_claim:
      "HOLD: D4 mission physical projection is unavailable for authority handoff display.",
    ...overrides,
  };
}

export function deriveAuthorityHandoffTheaterView(
  projection?: MissionPhysicalProjectionV1 | null
): AuthorityHandoffTheaterView {
  if (!projection) {
    return baseView(null, {});
  }

  const stageId = projection.active_stage_id;

  if (!isAuthorityStage(stageId)) {
    return baseView(stageId, {
      active_stage_label: stageLabel(stageId),
      compact: true,
      source_mode: "d4_projection_idle_stage",
      source_ref: "projection.active_stage_id",
      status: "idle",
      status_label: "READY: no authority handoff active",
      token_state: "not_requested",
      token_state_description: tokenDisplay("not_requested").description,
      token_state_label: tokenDisplay("not_requested").label,
      transfer_label: "No authority transfer active for this stage",
      visible_claim:
        "Authority theater is ready; the active mission stage has no D4 authority handoff beat.",
    });
  }

  const beat =
    projection.authority_handoff.active_beats.find(
      (entry) => entry.stage_id === stageId
    ) ?? null;

  if (!beat) {
    return baseView(stageId, {
      active_stage_label: stageLabel(stageId),
      compact: false,
      source_mode: "d4_projection_required_beat_missing",
      source_ref: "projection.authority_handoff.active_beats",
      status: "holding",
      status_label: "HOLD: required authority beat missing",
      token_state: "held",
      token_state_description: tokenDisplay("held").description,
      token_state_label: tokenDisplay("held").label,
      transfer_label: "Requester -> approver handoff is held",
      visible_claim:
        "HOLD: this authority-relevant stage has no D4 authority handoff beat.",
    });
  }

  const token = tokenDisplay(beat.token_state);

  return baseView(stageId, {
    active_stage_label: stageLabel(stageId),
    beat_id: beat.beat_id,
    compact: false,
    non_claims: nonClaimsFor(beat),
    role_cards: roleCardsFor(beat),
    source_mode: "d4_projection_active_beat",
    source_ref: beat.source_ref,
    status: beat.token_state === "held" ? "holding" : "ready",
    status_label: beat.token_state === "held" ? "HOLDING" : "READY",
    token_state: token.state,
    token_state_description: token.description,
    token_state_label: token.label,
    transfer_label: `${roleLabel(beat.requester_role)} -> ${roleLabel(
      beat.approver_role
    )}`,
    visible_claim: beat.visible_claim,
  });
}
