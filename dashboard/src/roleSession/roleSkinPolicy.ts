import {
  DASHBOARD_SKIN_ORDER,
  type DashboardSkinKey,
} from "../adapters/skinPayloadAdapter.ts";
import {
  AUTH0_EVAL_ROLE_IDS,
  type Auth0EvalRoleId,
  MERIDIAN_DASHBOARD_ROLES,
  type MeridianDashboardRole,
} from "./roleSessionTypes.ts";

const ALL_SKINS = [...DASHBOARD_SKIN_ORDER] as readonly DashboardSkinKey[];

export const ROLE_SKIN_POLICY: Record<
  MeridianDashboardRole,
  readonly DashboardSkinKey[]
> = {
  city_attorney: ["council", "public"],
  council_member: ["council", "public"],
  dispatch: ["dispatch", "operations"],
  fire_marshal: ["operations"],
  judge_demo_operator: ALL_SKINS,
  permitting_staff: ["permitting", "operations"],
  public: ["public"],
  public_works_director: ["operations", "permitting", "council"],
};

export const AUTH0_EVAL_ROLE_TO_DASHBOARD_ROLE: Record<
  Auth0EvalRoleId,
  MeridianDashboardRole
> = {
  council_member: "council_member",
  department_director: "public_works_director",
  field_inspector: "permitting_staff",
  operations_lead: "public_works_director",
  public_viewer: "public",
};

export function isAuth0EvalRoleId(value: unknown): value is Auth0EvalRoleId {
  return (
    typeof value === "string" &&
    (AUTH0_EVAL_ROLE_IDS as readonly string[]).includes(value)
  );
}

export function mapAuth0EvalRoleToDashboardRole(
  role: Auth0EvalRoleId
): MeridianDashboardRole {
  return AUTH0_EVAL_ROLE_TO_DASHBOARD_ROLE[role];
}

export function isMeridianDashboardRole(
  value: unknown
): value is MeridianDashboardRole {
  return (
    typeof value === "string" &&
    (MERIDIAN_DASHBOARD_ROLES as readonly string[]).includes(value)
  );
}

export function getAllowedSkinsForRole(
  role: MeridianDashboardRole
): readonly DashboardSkinKey[] {
  return ROLE_SKIN_POLICY[role] ?? ROLE_SKIN_POLICY.public;
}

export function getFirstAllowedSkin(
  allowedSkins: readonly DashboardSkinKey[]
): DashboardSkinKey {
  return allowedSkins[0] ?? "public";
}

export function isSkinAllowedForRole(
  skinKey: DashboardSkinKey,
  allowedSkins: readonly DashboardSkinKey[]
): boolean {
  return allowedSkins.includes(skinKey);
}
