import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchLiveProjection,
  type FetchLiveProjectionInput,
  type LiveProjectionClient,
} from "./liveClient.ts";
import type {
  DashboardLiveProjectionV1,
  LiveConnectionStatus,
} from "./liveTypes.ts";

export interface LiveProjectionState {
  connectionStatus: LiveConnectionStatus;
  holdMessage: string | null;
  loading: boolean;
  projection: DashboardLiveProjectionV1 | null;
}

export interface UseLiveProjectionInput extends FetchLiveProjectionInput {
  client?: LiveProjectionClient;
  enabled: boolean;
  pollIntervalMs?: number;
}

export interface UseLiveProjectionResult extends LiveProjectionState {
  refresh: () => Promise<void>;
}

export interface LiveProjectionPollingController {
  refresh: () => Promise<void>;
  stop: () => void;
}

export interface LiveProjectionTimers {
  clearInterval: (interval: unknown) => void;
  setInterval: (handler: () => void, timeout: number) => unknown;
}

export const DISABLED_LIVE_PROJECTION_STATE: LiveProjectionState = {
  connectionStatus: "disconnected",
  holdMessage: null,
  loading: false,
  projection: null,
};

export const LIVE_PROJECTION_CONNECTING_STATE: LiveProjectionState = {
  connectionStatus: "disconnected",
  holdMessage: "HOLD: Live projection is not connected yet.",
  loading: true,
  projection: null,
};

function getClient(input: UseLiveProjectionInput): LiveProjectionClient {
  return input.client ?? fetchLiveProjection;
}

function toState(
  result: Awaited<ReturnType<LiveProjectionClient>>,
  loading = false
): LiveProjectionState {
  return {
    connectionStatus: result.connection.status,
    holdMessage: result.connection.holdMessage,
    loading,
    projection: result.projection,
  };
}

const DEFAULT_TIMERS: LiveProjectionTimers = {
  clearInterval: (interval) => {
    globalThis.clearInterval(interval as ReturnType<typeof setInterval>);
  },
  setInterval: (handler, timeout) => globalThis.setInterval(handler, timeout),
};

export async function resolveLiveProjectionOnce(
  input: UseLiveProjectionInput
): Promise<LiveProjectionState> {
  if (!input.enabled) {
    return DISABLED_LIVE_PROJECTION_STATE;
  }

  const result = await getClient(input)({
    fetcher: input.fetcher,
    path: input.path,
    sessionId: input.sessionId,
  });

  return toState(result);
}

export function startLiveProjectionPolling(
  input: UseLiveProjectionInput,
  onState: (state: LiveProjectionState) => void,
  timers: LiveProjectionTimers = DEFAULT_TIMERS
): LiveProjectionPollingController {
  if (!input.enabled) {
    onState(DISABLED_LIVE_PROJECTION_STATE);
    return {
      refresh: async () => undefined,
      stop: () => undefined,
    };
  }

  let stopped = false;
  let interval: unknown = null;
  const pollIntervalMs = input.pollIntervalMs ?? 0;

  async function refresh() {
    if (stopped) {
      return;
    }

    onState({
      ...LIVE_PROJECTION_CONNECTING_STATE,
      projection: null,
    });
    const nextState = await resolveLiveProjectionOnce(input);

    if (!stopped) {
      onState(nextState);
    }
  }

  void refresh();

  if (pollIntervalMs > 0) {
    interval = timers.setInterval(() => {
      void refresh();
    }, pollIntervalMs);
  }

  return {
    refresh,
    stop: () => {
      stopped = true;
      if (interval !== null) {
        timers.clearInterval(interval);
      }
    },
  };
}

export function useLiveProjection(
  input: UseLiveProjectionInput
): UseLiveProjectionResult {
  const [state, setState] = useState<LiveProjectionState>(() =>
    input.enabled
      ? {
          ...LIVE_PROJECTION_CONNECTING_STATE,
          loading: false,
        }
      : DISABLED_LIVE_PROJECTION_STATE
  );
  const controllerInput = useMemo(
    () => ({
      client: input.client,
      enabled: input.enabled,
      fetcher: input.fetcher,
      path: input.path,
      pollIntervalMs: input.pollIntervalMs,
      sessionId: input.sessionId,
    }),
    [
      input.client,
      input.enabled,
      input.fetcher,
      input.path,
      input.pollIntervalMs,
      input.sessionId,
    ]
  );

  useEffect(() => {
    const controller = startLiveProjectionPolling(controllerInput, setState);
    return () => {
      controller.stop();
    };
  }, [controllerInput]);

  const refresh = useCallback(async () => {
    setState((current) =>
      input.enabled
        ? {
            ...current,
            loading: true,
          }
        : DISABLED_LIVE_PROJECTION_STATE
    );
    setState(await resolveLiveProjectionOnce(controllerInput));
  }, [controllerInput, input.enabled]);

  return {
    ...state,
    refresh,
  };
}
