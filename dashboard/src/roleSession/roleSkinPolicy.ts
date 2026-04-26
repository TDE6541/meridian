import {
  DASHBOARD_SKIN_ORDER,
  type DashboardSkinKey,
} from "../adapters/skinPayloadAdapter.ts";
import {
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
