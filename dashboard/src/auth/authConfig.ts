export const AUTH0_ROLES_CLAIM_NAMESPACE = "https://meridian.city/roles" as const;

export const AUTH0_ROLE_CLAIM_FALLBACKS = [
  AUTH0_ROLES_CLAIM_NAMESPACE,
  "civic_role",
  "https://meridian.local/civic_role",
  "role",
] as const;

export const AUTH0_DEPARTMENT_CLAIM_FALLBACKS = [
  "department",
  "https://meridian.local/department",
] as const;

export interface Auth0DashboardConfig {
  audience: string | null;
  callbackUrl: string | null;
  clientId: string | null;
  departmentClaim: string | null;
  domain: string | null;
  holds: readonly string[];
  isConfigured: boolean;
  roleClaim: string | null;
}

export type Auth0EnvSource = Record<string, unknown>;

const importMetaWithEnv = import.meta as ImportMeta & {
  env?: Auth0EnvSource;
};

function readEnvString(source: Auth0EnvSource, key: string): string | null {
  const value = source[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export function resolveAuth0DashboardConfig(
  env: Auth0EnvSource = importMetaWithEnv.env ?? {}
): Auth0DashboardConfig {
  const domain = readEnvString(env, "VITE_AUTH0_DOMAIN");
  const clientId = readEnvString(env, "VITE_AUTH0_CLIENT_ID");
  const callbackUrl = readEnvString(env, "VITE_AUTH0_CALLBACK_URL");
  const audience = readEnvString(env, "VITE_AUTH0_AUDIENCE");
  const roleClaim = readEnvString(env, "VITE_AUTH0_ROLE_CLAIM");
  const departmentClaim = readEnvString(env, "VITE_AUTH0_DEPARTMENT_CLAIM");
  const holds: string[] = [];

  if (!domain || !clientId || !callbackUrl) {
    holds.push("HOLD: Auth0 login unavailable; public mode active.");
  }

  return {
    audience,
    callbackUrl,
    clientId,
    departmentClaim,
    domain,
    holds,
    isConfigured: Boolean(domain && clientId && callbackUrl),
    roleClaim,
  };
}
