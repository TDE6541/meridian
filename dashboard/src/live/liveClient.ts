import {
  DASHBOARD_LIVE_PROJECTION_VERSION,
  type DashboardLiveProjectionV1,
  type LiveConnectionStatus,
} from "./liveTypes.ts";

export interface FetchLiveProjectionInput {
  fetcher?: typeof fetch;
  path?: string;
  sessionId?: string;
}

export interface LiveProjectionConnectionResult {
  holdMessage: string | null;
  status: LiveConnectionStatus;
}

export interface LiveProjectionClientResult {
  connection: LiveProjectionConnectionResult;
  ok: boolean;
  projection: DashboardLiveProjectionV1 | null;
}

export type LiveProjectionClient = (
  input?: FetchLiveProjectionInput
) => Promise<LiveProjectionClientResult>;

const DEFAULT_SESSION_ID = "latest";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExternalScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

export function buildLiveProjectionPath(
  sessionId: string = DEFAULT_SESSION_ID
): string {
  return `/live/sessions/${encodeURIComponent(sessionId)}/dashboard`;
}

export function isLocalLiveProjectionPath(path: string): boolean {
  if (path.trim().length === 0 || path.startsWith("//")) {
    return false;
  }

  return !hasExternalScheme(path);
}

export function createDisconnectedLiveResult(
  holdMessage: string,
  status: LiveConnectionStatus = "disconnected"
): LiveProjectionClientResult {
  return {
    connection: {
      holdMessage,
      status,
    },
    ok: false,
    projection: null,
  };
}

function isDashboardLiveProjectionV1(
  value: unknown
): value is DashboardLiveProjectionV1 {
  return (
    isRecord(value) &&
    value.version === DASHBOARD_LIVE_PROJECTION_VERSION &&
    isRecord(value.connection) &&
    typeof value.connection.status === "string" &&
    Array.isArray(value.events) &&
    isRecord(value.latest) &&
    isRecord(value.skins) &&
    isRecord(value.skins.outputs)
  );
}

function getConnectionHoldMessage(
  projection: DashboardLiveProjectionV1
): string | null {
  if (projection.connection.status === "connected") {
    return null;
  }

  return (
    projection.connection.hold_reason ??
    "HOLD: Live projection reported a non-connected state."
  );
}

export async function fetchLiveProjection(
  input: FetchLiveProjectionInput = {}
): Promise<LiveProjectionClientResult> {
  const path = input.path ?? buildLiveProjectionPath(input.sessionId);

  if (!isLocalLiveProjectionPath(path)) {
    return createDisconnectedLiveResult(
      "HOLD: external Live Mode URL rejected."
    );
  }

  const fetcher = input.fetcher ?? globalThis.fetch;
  if (typeof fetcher !== "function") {
    return createDisconnectedLiveResult(
      "HOLD: Live projection fetch is unavailable in this runtime."
    );
  }

  try {
    const response = await fetcher(path, {
      headers: {
        accept: "application/json",
      },
      method: "GET",
    });

    if (!response.ok) {
      return createDisconnectedLiveResult(
        `HOLD: Live projection unavailable (${response.status} ${response.statusText}).`
      );
    }

    const payload = await response.json();
    if (!isDashboardLiveProjectionV1(payload)) {
      return createDisconnectedLiveResult(
        "HOLD: Live projection response did not match the dashboard contract.",
        "holding"
      );
    }

    return {
      connection: {
        holdMessage: getConnectionHoldMessage(payload),
        status: payload.connection.status,
      },
      ok: payload.connection.status === "connected",
      projection: payload,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown failure";
    return createDisconnectedLiveResult(
      `HOLD: Live projection request failed closed (${message}).`
    );
  }
}
