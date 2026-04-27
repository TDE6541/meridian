export const SHARED_AUTHORITY_REQUESTS_ENDPOINT =
  "/api/authority-requests" as const;

export const AUTHORITY_RESOLUTION_REQUEST_CONTRACT =
  "meridian.v2.authorityResolutionRequest.v1" as const;

export const SHARED_AUTHORITY_EVENT_TYPES = [
  "AUTHORITY_RESOLUTION_REQUESTED",
  "AUTHORITY_APPROVED",
  "AUTHORITY_DENIED",
] as const;

export type SharedAuthorityEventType =
  (typeof SHARED_AUTHORITY_EVENT_TYPES)[number];

export type SharedAuthorityEndpointStatus =
  | "connected"
  | "holding"
  | "unavailable";

export type SharedAuthorityResolution = "approved" | "denied";

export interface SharedAuthorityHold {
  code: string;
  message: string;
  severity: "HOLD";
  source_ref: string;
}

export interface SharedAuthorityRequest extends Record<string, unknown> {
  request_id: string;
  status?: string;
}

export interface SharedAuthorityEventPayload extends Record<string, unknown> {
  event_payload_only: true;
  request: SharedAuthorityRequest;
  request_id: string;
  sequence?: number;
  side_effects?: {
    ciba?: boolean;
    forensic_chain_write?: boolean;
    notification_delivery?: boolean;
    openfga?: boolean;
  };
  type: SharedAuthorityEventType;
}

export interface SharedAuthorityListPayload {
  count: number;
  requests: readonly SharedAuthorityRequest[];
  store?: Record<string, unknown>;
}

export interface SharedAuthorityMutationPayload {
  event: SharedAuthorityEventPayload;
  request: SharedAuthorityRequest;
  resolution?: {
    reason: string | null;
    resolution: SharedAuthorityResolution;
    resolved_by: string | null;
  };
}

export interface SharedAuthorityResetPayload {
  cleared_count: number;
  requests: readonly SharedAuthorityRequest[];
  reset: true;
  store?: Record<string, unknown>;
}

export type SharedAuthorityClientResult<T> =
  | {
      data: T;
      endpointStatus: "connected";
      hold: null;
      httpStatus: number;
      ok: true;
    }
  | {
      data: null;
      endpointStatus: "holding" | "unavailable";
      hold: SharedAuthorityHold;
      httpStatus: number | null;
      ok: false;
    };

export type SharedAuthorityFetcher = typeof fetch;

export interface SharedAuthorityClientOptions {
  endpointPath?: string;
  fetcher?: SharedAuthorityFetcher;
}

export interface SharedAuthorityResolveInput {
  reason?: string | null;
  request_id: string;
  resolution: SharedAuthorityResolution;
  resolved_by?: string | null;
}

export interface SharedAuthorityClient {
  createRequest: (
    request: SharedAuthorityRequest
  ) => Promise<SharedAuthorityClientResult<SharedAuthorityMutationPayload>>;
  listRequests: () => Promise<
    SharedAuthorityClientResult<SharedAuthorityListPayload>
  >;
  resetRequests: () => Promise<
    SharedAuthorityClientResult<SharedAuthorityResetPayload>
  >;
  resolveRequest: (
    input: SharedAuthorityResolveInput
  ) => Promise<SharedAuthorityClientResult<SharedAuthorityMutationPayload>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function createHold(
  code: string,
  message: string,
  sourceRef = SHARED_AUTHORITY_REQUESTS_ENDPOINT
): SharedAuthorityHold {
  return {
    code,
    message,
    severity: "HOLD",
    source_ref: sourceRef,
  };
}

function unavailable<T>(
  code: string,
  message: string
): SharedAuthorityClientResult<T> {
  return {
    data: null,
    endpointStatus: "unavailable",
    hold: createHold(code, message),
    httpStatus: null,
    ok: false,
  };
}

function holding<T>(
  code: string,
  message: string,
  httpStatus: number | null = null
): SharedAuthorityClientResult<T> {
  return {
    data: null,
    endpointStatus: "holding",
    hold: createHold(code, message),
    httpStatus,
    ok: false,
  };
}

function connected<T>(data: T, httpStatus: number): SharedAuthorityClientResult<T> {
  return {
    data,
    endpointStatus: "connected",
    hold: null,
    httpStatus,
    ok: true,
  };
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown failure";
}

function getFetcher(fetcher: SharedAuthorityFetcher | undefined) {
  return fetcher ?? globalThis.fetch;
}

function toSharedRequest(value: unknown): SharedAuthorityRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const requestId = asString(value.request_id);
  if (!requestId) {
    return null;
  }

  return {
    ...value,
    request_id: requestId,
    ...(asString(value.status) ? { status: asString(value.status) as string } : {}),
  };
}

function toSharedEvent(value: unknown): SharedAuthorityEventPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = asString(value.type);
  const requestId = asString(value.request_id);
  const request = toSharedRequest(value.request);

  if (
    !type ||
    !SHARED_AUTHORITY_EVENT_TYPES.includes(type as SharedAuthorityEventType) ||
    !requestId ||
    !request ||
    value.event_payload_only !== true
  ) {
    return null;
  }

  return {
    ...value,
    event_payload_only: true,
    request,
    request_id: requestId,
    type: type as SharedAuthorityEventType,
  };
}

function parseListPayload(value: unknown): SharedAuthorityListPayload | null {
  if (!isRecord(value) || value.ok !== true || !Array.isArray(value.requests)) {
    return null;
  }

  const requests = value.requests.map(toSharedRequest);
  if (requests.some((request) => request === null)) {
    return null;
  }

  return {
    count: typeof value.count === "number" ? value.count : requests.length,
    requests: requests as SharedAuthorityRequest[],
    ...(isRecord(value.store) ? { store: value.store } : {}),
  };
}

function parseMutationPayload(
  value: unknown
): SharedAuthorityMutationPayload | null {
  if (!isRecord(value) || value.ok !== true) {
    return null;
  }

  const request = toSharedRequest(value.request);
  const event = toSharedEvent(value.event);
  if (!request || !event) {
    return null;
  }

  const resolution = isRecord(value.resolution)
    ? {
        reason: asString(value.resolution.reason),
        resolution: asString(value.resolution.resolution) as
          | SharedAuthorityResolution
          | null,
        resolved_by: asString(value.resolution.resolved_by),
      }
    : null;

  return {
    event,
    request,
    ...(resolution?.resolution === "approved" || resolution?.resolution === "denied"
      ? { resolution: resolution as SharedAuthorityMutationPayload["resolution"] }
      : {}),
  };
}

function parseResetPayload(value: unknown): SharedAuthorityResetPayload | null {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    value.reset !== true ||
    !Array.isArray(value.requests)
  ) {
    return null;
  }

  return {
    cleared_count:
      typeof value.cleared_count === "number" ? value.cleared_count : 0,
    requests: [],
    reset: true,
    ...(isRecord(value.store) ? { store: value.store } : {}),
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestJson<T>({
  body,
  endpointPath,
  fetcher,
  method,
  parse,
}: {
  body?: Record<string, unknown>;
  endpointPath: string;
  fetcher?: SharedAuthorityFetcher;
  method: "GET" | "POST";
  parse: (value: unknown) => T | null;
}): Promise<SharedAuthorityClientResult<T>> {
  const resolvedFetcher = getFetcher(fetcher);

  if (typeof resolvedFetcher !== "function") {
    return unavailable(
      "shared_authority_fetch_unavailable",
      "HOLD: Shared authority endpoint fetch is unavailable in this runtime."
    );
  }

  try {
    const response = await resolvedFetcher(endpointPath, {
      headers: {
        accept: "application/json",
        ...(method === "POST" ? { "content-type": "application/json" } : {}),
      },
      method,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await readJson(response);

    if (!response.ok) {
      const issue = isRecord(payload)
        ? asString(payload.issue) ?? asString(payload.error)
        : null;
      return holding(
        "shared_authority_endpoint_rejected",
        `HOLD: Shared authority endpoint rejected the request (${response.status}${issue ? `: ${issue}` : ""}).`,
        response.status
      );
    }

    const parsed = parse(payload);
    if (!parsed) {
      return holding(
        "shared_authority_contract_mismatch",
        "HOLD: Shared authority endpoint response did not match the dashboard-local client contract.",
        response.status
      );
    }

    return connected(parsed, response.status);
  } catch (error) {
    return unavailable(
      "shared_authority_network_failure",
      `HOLD: Shared authority endpoint request failed closed (${readErrorMessage(error)}).`
    );
  }
}

export function createSharedAuthorityClient(
  options: SharedAuthorityClientOptions = {}
): SharedAuthorityClient {
  const endpointPath = options.endpointPath ?? SHARED_AUTHORITY_REQUESTS_ENDPOINT;

  return {
    createRequest: (request) =>
      requestJson({
        body: {
          action: "create",
          request,
        },
        endpointPath,
        fetcher: options.fetcher,
        method: "POST",
        parse: parseMutationPayload,
      }),
    listRequests: () =>
      requestJson({
        endpointPath,
        fetcher: options.fetcher,
        method: "GET",
        parse: parseListPayload,
      }),
    resetRequests: () =>
      requestJson({
        body: {
          action: "reset",
        },
        endpointPath,
        fetcher: options.fetcher,
        method: "POST",
        parse: parseResetPayload,
      }),
    resolveRequest: (input) =>
      requestJson({
        body: {
          action: "resolve",
          reason: input.reason ?? null,
          request_id: input.request_id,
          resolution: input.resolution,
          resolved_by: input.resolved_by ?? null,
        },
        endpointPath,
        fetcher: options.fetcher,
        method: "POST",
        parse: parseMutationPayload,
      }),
  };
}

export const sharedAuthorityClient = createSharedAuthorityClient();
