import type { DashboardSkinKey } from "../adapters/skinPayloadAdapter.ts";

export const ROLE_SESSION_PROOF_CONTRACT =
  "meridian.v2.roleSessionProof.v1" as const;

export const MERIDIAN_DASHBOARD_ROLES = [
  "permitting_staff",
  "council_member",
  "public_works_director",
  "fire_marshal",
  "city_attorney",
  "dispatch",
  "judge_demo_operator",
  "public",
] as const;

export type MeridianDashboardRole = (typeof MERIDIAN_DASHBOARD_ROLES)[number];

export const AUTH0_EVAL_ROLE_IDS = [
  "field_inspector",
  "department_director",
  "council_member",
  "operations_lead",
  "public_viewer",
] as const;

export type Auth0EvalRoleId = (typeof AUTH0_EVAL_ROLE_IDS)[number];

export type RoleSessionAuthStatus =
  | "authenticated"
  | "error"
  | "unauthenticated"
  | "unavailable";

export interface RoleSessionHold {
  code: string;
  message: string;
  source_ref: string;
}

export interface DashboardRoleSessionProofV1 {
  active_skin: DashboardSkinKey;
  allowed_skins: readonly DashboardSkinKey[];
  auth_status: RoleSessionAuthStatus;
  contract: typeof ROLE_SESSION_PROOF_CONTRACT;
  department: string | null;
  display_name: string | null;
  holds: readonly RoleSessionHold[];
  role: MeridianDashboardRole;
  source: string;
  subject_ref: string | null;
}
