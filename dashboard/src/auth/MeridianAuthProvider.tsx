import {
  Auth0Provider,
  useAuth0,
  type User,
} from "@auth0/auth0-react";
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  resolveAuth0DashboardConfig,
  type Auth0DashboardConfig,
} from "./authConfig.ts";

export type MeridianAuthStatus =
  | "authenticated"
  | "error"
  | "unauthenticated"
  | "unavailable";

export interface MeridianAuthState {
  authStatus: MeridianAuthStatus;
  config: Auth0DashboardConfig;
  errorMessage: string | null;
  holds: readonly string[];
  isAuthenticated: boolean;
  isConfigured: boolean;
  login: () => void;
  logout: () => void;
  user: Record<string, unknown> | null;
}

const defaultConfig = resolveAuth0DashboardConfig({});

const unavailableAuthState: MeridianAuthState = {
  authStatus: "unavailable",
  config: defaultConfig,
  errorMessage: null,
  holds: defaultConfig.holds,
  isAuthenticated: false,
  isConfigured: false,
  login: () => undefined,
  logout: () => undefined,
  user: null,
};

export const MeridianAuthContext =
  createContext<MeridianAuthState>(unavailableAuthState);

function getRedirectUri(): string {
  return typeof window === "undefined"
    ? "http://localhost:5173"
    : window.location.origin;
}

function normalizeUser(user: User | undefined): Record<string, unknown> | null {
  return user && typeof user === "object"
    ? (user as Record<string, unknown>)
    : null;
}

function Auth0SessionBridge({
  children,
  config,
}: {
  children: ReactNode;
  config: Auth0DashboardConfig;
}) {
  const {
    error,
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    logout,
    user,
  } = useAuth0();

  const errorMessage = error instanceof Error ? error.message : null;
  const authStatus: MeridianAuthStatus = errorMessage
    ? "error"
    : isLoading
      ? "unavailable"
      : isAuthenticated
        ? "authenticated"
        : "unauthenticated";
  const holds = errorMessage
    ? [`HOLD: Auth0 session error; public mode active. ${errorMessage}`]
    : config.holds;
  const value: MeridianAuthState = {
    authStatus,
    config,
    errorMessage,
    holds,
    isAuthenticated,
    isConfigured: config.isConfigured,
    login: () => {
      void loginWithRedirect();
    },
    logout: () => {
      void logout({
        logoutParams: {
          returnTo: getRedirectUri(),
        },
      });
    },
    user: normalizeUser(user),
  };

  return (
    <MeridianAuthContext.Provider value={value}>
      {children}
    </MeridianAuthContext.Provider>
  );
}

export function MeridianAuthProvider({
  children,
  config = resolveAuth0DashboardConfig(),
}: {
  children: ReactNode;
  config?: Auth0DashboardConfig;
}) {
  if (!config.isConfigured || !config.domain || !config.clientId) {
    const value: MeridianAuthState = {
      authStatus: "unavailable",
      config,
      errorMessage: null,
      holds: config.holds,
      isAuthenticated: false,
      isConfigured: false,
      login: () => undefined,
      logout: () => undefined,
      user: null,
    };

    return (
      <MeridianAuthContext.Provider value={value}>
        {children}
      </MeridianAuthContext.Provider>
    );
  }

  return (
    <Auth0Provider
      authorizationParams={{
        audience: config.audience ?? undefined,
        redirect_uri: getRedirectUri(),
      }}
      clientId={config.clientId}
      domain={config.domain}
    >
      <Auth0SessionBridge config={config}>{children}</Auth0SessionBridge>
    </Auth0Provider>
  );
}

export function useMeridianAuth(): MeridianAuthState {
  return useContext(MeridianAuthContext);
}
