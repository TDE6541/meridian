import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createSharedAuthorityClient,
  type SharedAuthorityClient,
  type SharedAuthorityClientOptions,
  type SharedAuthorityClientResult,
  type SharedAuthorityEndpointStatus,
  type SharedAuthorityEventPayload,
  type SharedAuthorityHold,
  type SharedAuthorityListPayload,
  type SharedAuthorityMutationPayload,
  type SharedAuthorityRequest,
  type SharedAuthorityResolution,
  type SharedAuthorityResolveInput,
} from "./sharedAuthorityClient.ts";

export interface SharedAuthorityRequestsState {
  endpointStatus: SharedAuthorityEndpointStatus;
  events: readonly SharedAuthorityEventPayload[];
  hold: SharedAuthorityHold | null;
  loading: boolean;
  requests: readonly SharedAuthorityRequest[];
}

export interface UseSharedAuthorityRequestsInput
  extends SharedAuthorityClientOptions {
  client?: SharedAuthorityClient;
  enabled?: boolean;
  pollIntervalMs?: number;
}

export interface UseSharedAuthorityRequestsResult
  extends SharedAuthorityRequestsState {
  createRequest: (
    request: SharedAuthorityRequest
  ) => Promise<SharedAuthorityClientResult<SharedAuthorityMutationPayload>>;
  refresh: () => Promise<void>;
  resetRequests: () => Promise<void>;
  resolveRequest: (
    input: SharedAuthorityResolveInput
  ) => Promise<SharedAuthorityClientResult<SharedAuthorityMutationPayload>>;
}

export interface SharedAuthorityPollingController {
  refresh: () => Promise<void>;
  stop: () => void;
}

export interface SharedAuthorityTimers {
  clearInterval: (interval: unknown) => void;
  setInterval: (handler: () => void, timeout: number) => unknown;
}

export const SHARED_AUTHORITY_DISABLED_STATE: SharedAuthorityRequestsState = {
  endpointStatus: "holding",
  events: [],
  hold: {
    code: "shared_authority_polling_disabled",
    message: "HOLD: Shared authority endpoint polling is disabled.",
    severity: "HOLD",
    source_ref: "dashboard.shared_authority.polling",
  },
  loading: false,
  requests: [],
};

export const SHARED_AUTHORITY_INITIAL_STATE: SharedAuthorityRequestsState = {
  endpointStatus: "holding",
  events: [],
  hold: {
    code: "shared_authority_not_refreshed",
    message: "HOLD: Shared authority endpoint has not refreshed yet.",
    severity: "HOLD",
    source_ref: "dashboard.shared_authority.refresh",
  },
  loading: false,
  requests: [],
};

const DEFAULT_TIMERS: SharedAuthorityTimers = {
  clearInterval: (interval) => {
    globalThis.clearInterval(interval as ReturnType<typeof setInterval>);
  },
  setInterval: (handler, timeout) => globalThis.setInterval(handler, timeout),
};

function getClient(
  input: UseSharedAuthorityRequestsInput
): SharedAuthorityClient {
  return (
    input.client ??
    createSharedAuthorityClient({
      endpointPath: input.endpointPath,
      fetcher: input.fetcher,
    })
  );
}

function toState(
  result: SharedAuthorityClientResult<SharedAuthorityListPayload>,
  events: readonly SharedAuthorityEventPayload[] = [],
  loading = false
): SharedAuthorityRequestsState {
  if (!result.ok) {
    return {
      endpointStatus: result.endpointStatus,
      events,
      hold: result.hold,
      loading,
      requests: [],
    };
  }

  return {
    endpointStatus: result.endpointStatus,
    events,
    hold: null,
    loading,
    requests: result.data.requests,
  };
}

function updateRequestList(
  requests: readonly SharedAuthorityRequest[],
  request: SharedAuthorityRequest
): SharedAuthorityRequest[] {
  const next = new Map<string, SharedAuthorityRequest>();

  requests.forEach((entry) => {
    next.set(entry.request_id, entry);
  });
  next.set(request.request_id, request);

  return [...next.values()];
}

function appendEvent(
  events: readonly SharedAuthorityEventPayload[],
  event: SharedAuthorityEventPayload
): SharedAuthorityEventPayload[] {
  const key = `${event.request_id}:${event.type}:${String(event.sequence ?? "local")}`;
  const existing = new Set(
    events.map((entry) =>
      `${entry.request_id}:${entry.type}:${String(entry.sequence ?? "local")}`
    )
  );

  return existing.has(key) ? [...events] : [...events, event];
}

export async function resolveSharedAuthorityOnce(
  input: UseSharedAuthorityRequestsInput
): Promise<SharedAuthorityRequestsState> {
  if (input.enabled === false) {
    return SHARED_AUTHORITY_DISABLED_STATE;
  }

  const result = await getClient(input).listRequests();

  return toState(result);
}

export function startSharedAuthorityPolling(
  input: UseSharedAuthorityRequestsInput,
  onState: (state: SharedAuthorityRequestsState) => void,
  timers: SharedAuthorityTimers = DEFAULT_TIMERS
): SharedAuthorityPollingController {
  if (input.enabled === false) {
    onState(SHARED_AUTHORITY_DISABLED_STATE);
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
      ...SHARED_AUTHORITY_INITIAL_STATE,
      loading: true,
    });
    const nextState = await resolveSharedAuthorityOnce(input);

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

export function useSharedAuthorityRequests(
  input: UseSharedAuthorityRequestsInput = {}
): UseSharedAuthorityRequestsResult {
  const [state, setState] = useState<SharedAuthorityRequestsState>(() =>
    input.enabled === false
      ? SHARED_AUTHORITY_DISABLED_STATE
      : SHARED_AUTHORITY_INITIAL_STATE
  );
  const controllerInput = useMemo(
    () => ({
      client: input.client,
      enabled: input.enabled,
      endpointPath: input.endpointPath,
      fetcher: input.fetcher,
      pollIntervalMs: input.pollIntervalMs,
    }),
    [
      input.client,
      input.enabled,
      input.endpointPath,
      input.fetcher,
      input.pollIntervalMs,
    ]
  );
  const client = useMemo(() => getClient(controllerInput), [controllerInput]);

  useEffect(() => {
    const controller = startSharedAuthorityPolling(controllerInput, (next) => {
      setState((current) => ({
        ...next,
        events: current.events,
      }));
    });

    return () => {
      controller.stop();
    };
  }, [controllerInput]);

  const refresh = useCallback(async () => {
    if (controllerInput.enabled === false) {
      setState(SHARED_AUTHORITY_DISABLED_STATE);
      return;
    }

    setState((current) => ({
      ...current,
      loading: true,
    }));
    const next = await resolveSharedAuthorityOnce({
      ...controllerInput,
      client,
    });

    setState((current) => ({
      ...next,
      events: current.events,
    }));
  }, [client, controllerInput]);

  const createRequest = useCallback(
    async (request: SharedAuthorityRequest) => {
      setState((current) => ({
        ...current,
        loading: true,
      }));
      const result = await client.createRequest(request);

      setState((current) => {
        if (!result.ok) {
          return {
            ...current,
            endpointStatus: result.endpointStatus,
            hold: result.hold,
            loading: false,
          };
        }

        return {
          endpointStatus: "connected",
          events: appendEvent(current.events, result.data.event),
          hold: null,
          loading: false,
          requests: updateRequestList(current.requests, result.data.request),
        };
      });

      return result;
    },
    [client]
  );

  const resolveRequest = useCallback(
    async (inputValue: SharedAuthorityResolveInput) => {
      setState((current) => ({
        ...current,
        loading: true,
      }));
      const result = await client.resolveRequest(inputValue);

      setState((current) => {
        if (!result.ok) {
          return {
            ...current,
            endpointStatus: result.endpointStatus,
            hold: result.hold,
            loading: false,
          };
        }

        return {
          endpointStatus: "connected",
          events: appendEvent(current.events, result.data.event),
          hold: null,
          loading: false,
          requests: updateRequestList(current.requests, result.data.request),
        };
      });

      return result;
    },
    [client]
  );

  const resetRequests = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
    }));
    const result = await client.resetRequests();

    setState((current) =>
      result.ok
        ? {
            endpointStatus: "connected",
            events: [],
            hold: null,
            loading: false,
            requests: [],
          }
        : {
            ...current,
            endpointStatus: result.endpointStatus,
            hold: result.hold,
            loading: false,
          }
    );
  }, [client]);

  return {
    ...state,
    createRequest,
    refresh,
    resetRequests,
    resolveRequest,
  };
}
