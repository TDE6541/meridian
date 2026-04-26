import type { MeridianAuthState } from "../auth/MeridianAuthProvider.tsx";
import {
  AUTH0_DEPARTMENT_CLAIM_FALLBACKS,
  AUTH0_ROLE_CLAIM_FALLBACKS,
} from "../auth/authConfig.ts";
import type { DashboardSkinKey } from "../adapters/skinPayloadAdapter.ts";
import {
  getAllowedSkinsForRole,
  getFirstAllowedSkin,
  isMeridianDashboardRole,
  isSkinAllowedForRole,
} from "./roleSkinPolicy.ts";
import {
  ROLE_SESSION_PROOF_CONTRACT,
  type DashboardRoleSessionProofV1,
  type MeridianDashboardRole,
  type RoleSessionAuthStatus,
  type RoleSessionHold,
} from "./roleSessionTypes.ts";

function unique(values: readonly (string | null)[]): string[] {
  return values.filter(
    (value, index): value is string =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      values.indexOf(value) === index
  );
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readClaim(
  user: Record<string, unknown> | null,
  claimNames: readonly string[]
): { claimName: string; value: string } | null {
  if (!user) {
    return null;
  }

  for (const claimName of claimNames) {
    const value = asString(user[claimName]);

    if (value) {
      return { claimName, value };
    }
  }

  return null;
}

function createHold(
  code: string,
  message: string,
  sourceRef: string
): RoleSessionHold {
  return {
    code,
    message,
    source_ref: sourceRef,
  };
}

function resolveDisplayName(user: Record<string, unknown> | null): string | null {
  return (
    asString(user?.name) ??
    asString(user?.nickname) ??
    asString(user?.email) ??
    null
  );
}

function resolvePublicSession(
  authStatus: RoleSessionAuthStatus,
  activeSkin: DashboardSkinKey,
  holds: readonly RoleSessionHold[],
  source: string,
  subjectRef: string | null = null,
  displayName: string | null = null,
  department: string | null = null
): DashboardRoleSessionProofV1 {
  const allowedSkins = getAllowedSkinsForRole("public");
  const active_skin = isSkinAllowedForRole(activeSkin, allowedSkins)
    ? activeSkin
    : getFirstAllowedSkin(allowedSkins);
  const correctionHolds = active_skin === activeSkin
    ? []
    : [
        createHold(
          "active_skin_not_allowed",
          `HOLD: Active skin ${activeSkin} is outside the local dashboard role boundary; public mode active.`,
          "dashboard.role_session.active_skin"
        ),
      ];

  return {
    active_skin,
    allowed_skins: allowedSkins,
    auth_status: authStatus,
    contract: ROLE_SESSION_PROOF_CONTRACT,
    department,
    display_name: displayName,
    holds: [...holds, ...correctionHolds],
    role: "public",
    source,
    subject_ref: subjectRef,
  };
}

export function resolveDashboardRoleSession({
  activeSkin,
  auth,
}: {
  activeSkin: DashboardSkinKey;
  auth: MeridianAuthState;
}): DashboardRoleSessionProofV1 {
  const authStatus = auth.authStatus;
  const user = auth.user;
  const subjectRef = asString(user?.sub);
  const displayName = resolveDisplayName(user);

  if (!auth.isConfigured || authStatus === "unavailable") {
    return resolvePublicSession(
      "unavailable",
      activeSkin,
      auth.holds.map((message) =>
        createHold("auth0_unavailable", message, "dashboard.auth0.config")
      ),
      "auth0_unavailable",
      subjectRef,
      displayName
    );
  }

  if (authStatus === "error") {
    return resolvePublicSession(
      "error",
      activeSkin,
      auth.holds.map((message) =>
        createHold("auth0_error", message, "dashboard.auth0.session")
      ),
      "auth0_error",
      subjectRef,
      displayName
    );
  }

  if (authStatus !== "authenticated") {
    return resolvePublicSession(
      "unauthenticated",
      activeSkin,
      [],
      "public_default"
    );
  }

  const roleClaim = readClaim(
    user,
    unique([auth.config.roleClaim, ...AUTH0_ROLE_CLAIM_FALLBACKS])
  );
  const departmentClaim = readClaim(
    user,
    unique([auth.config.departmentClaim, ...AUTH0_DEPARTMENT_CLAIM_FALLBACKS])
  );
  const department = departmentClaim?.value ?? null;

  if (!roleClaim) {
    return resolvePublicSession(
      "authenticated",
      activeSkin,
      [
        createHold(
          "role_claim_missing",
          "HOLD: Authenticated session has no recognized role claim; public mode active.",
          "dashboard.role_session.claims"
        ),
      ],
      "auth0_role_claim_missing",
      subjectRef,
      displayName,
      department
    );
  }

  if (!isMeridianDashboardRole(roleClaim.value)) {
    return resolvePublicSession(
      "authenticated",
      activeSkin,
      [
        createHold(
          "role_claim_unrecognized",
          "HOLD: Authenticated role claim is not recognized; public mode active.",
          roleClaim.claimName
        ),
      ],
      "auth0_role_claim_unrecognized",
      subjectRef,
      displayName,
      department
    );
  }

  const role: MeridianDashboardRole = roleClaim.value;
  const allowedSkins = getAllowedSkinsForRole(role);
  const active_skin = isSkinAllowedForRole(activeSkin, allowedSkins)
    ? activeSkin
    : getFirstAllowedSkin(allowedSkins);
  const holds = active_skin === activeSkin
    ? []
    : [
        createHold(
          "active_skin_not_allowed",
          `HOLD: Active skin ${activeSkin} is outside the local dashboard role boundary; switched to ${active_skin}.`,
          "dashboard.role_session.active_skin"
        ),
      ];

  return {
    active_skin,
    allowed_skins: allowedSkins,
    auth_status: "authenticated",
    contract: ROLE_SESSION_PROOF_CONTRACT,
    department,
    display_name: displayName,
    holds,
    role,
    source: "auth0_role_claim",
    subject_ref: subjectRef,
  };
}
