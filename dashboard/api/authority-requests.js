const AUTHORITY_REQUEST_STORE_CONTRACT =
  "meridian.v2.authorityRequestStore.v1";

const ALLOWED_METHODS = "GET, POST, OPTIONS";
const CORS_HEADERS = Object.freeze({
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": ALLOWED_METHODS,
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
});
const VALID_RESOLUTIONS = Object.freeze(["approved", "denied"]);

let nextSequence = 1;
const store = [];

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}

function cloneJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function readNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function setResponseHeaders(res, extraHeaders = {}) {
  for (const [name, value] of Object.entries({
    ...CORS_HEADERS,
    ...extraHeaders,
  })) {
    if (typeof res.setHeader === "function") {
      res.setHeader(name, value);
    }
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  setResponseHeaders(res, extraHeaders);

  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(payload);
  }

  res.statusCode = statusCode;
  const body = JSON.stringify(payload);

  if (typeof res.end === "function") {
    return res.end(body);
  }

  res.body = body;
  return undefined;
}

async function readRawRequestBody(req) {
  if (typeof req?.[Symbol.asyncIterator] !== "function") {
    return null;
  }

  let raw = "";
  for await (const chunk of req) {
    raw += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
  }

  return raw;
}

async function parseJsonBody(req) {
  if (Object.prototype.hasOwnProperty.call(req, "body")) {
    if (isPlainObject(req.body)) {
      return { ok: true, body: req.body };
    }

    if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
      const raw = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : req.body;

      return parseRawJson(raw);
    }

    return { ok: false, issue: "POST body must be a JSON object." };
  }

  const raw = await readRawRequestBody(req);
  return parseRawJson(raw);
}

function parseRawJson(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, issue: "POST body is required." };
  }

  try {
    const body = JSON.parse(raw);

    if (!isPlainObject(body)) {
      return { ok: false, issue: "POST body must be a JSON object." };
    }

    return { ok: true, body };
  } catch {
    return { ok: false, issue: "POST body must be valid JSON." };
  }
}

function listRequests() {
  return store
    .slice()
    .sort((left, right) => left.sequence - right.sequence)
    .map((entry) => cloneJsonValue(entry.request));
}

function findStoredEntry(requestId) {
  return store.find((entry) => entry.request_id === requestId) ?? null;
}

function resetStore() {
  const clearedCount = store.length;
  store.length = 0;
  nextSequence = 1;
  return clearedCount;
}

function buildStorePayload() {
  const requests = listRequests();

  return {
    count: requests.length,
    ok: true,
    requests,
    store: {
      cold_start_reset: "accepted",
      contract: AUTHORITY_REQUEST_STORE_CONTRACT,
      persistence: "module_memory_only",
      transport: "polling",
    },
  };
}

function buildEventPayload(type, entry, extra = {}) {
  return {
    event_payload_only: true,
    request: cloneJsonValue(entry.request),
    request_id: entry.request_id,
    sequence: entry.sequence,
    side_effects: {
      ciba: false,
      forensic_chain_write: false,
      notification_delivery: false,
      openfga: false,
    },
    type,
    ...extra,
  };
}

function createRequest(body) {
  if (!isPlainObject(body.request)) {
    return {
      payload: {
        error: "invalid_request",
        issue: "request must be a JSON object.",
        ok: false,
      },
      statusCode: 400,
    };
  }

  const requestId = readNonEmptyString(body.request.request_id);
  if (!requestId) {
    return {
      payload: {
        error: "invalid_request",
        issue: "request.request_id must be a non-empty string.",
        ok: false,
      },
      statusCode: 400,
    };
  }

  if (findStoredEntry(requestId)) {
    return {
      payload: {
        error: "duplicate_request",
        issue: `request_id already exists: ${requestId}`,
        ok: false,
      },
      statusCode: 400,
    };
  }

  const entry = {
    request: cloneJsonValue(body.request),
    request_id: requestId,
    sequence: nextSequence,
  };
  nextSequence += 1;
  store.push(entry);

  return {
    payload: {
      event: buildEventPayload("AUTHORITY_RESOLUTION_REQUESTED", entry),
      ok: true,
      request: cloneJsonValue(entry.request),
    },
    statusCode: 201,
  };
}

function resolveRequest(body) {
  const requestId = readNonEmptyString(body.request_id);
  if (!requestId) {
    return {
      payload: {
        error: "invalid_request_id",
        issue: "request_id must be a non-empty string.",
        ok: false,
      },
      statusCode: 400,
    };
  }

  if (!VALID_RESOLUTIONS.includes(body.resolution)) {
    return {
      payload: {
        error: "invalid_resolution",
        issue: "resolution must be approved or denied.",
        ok: false,
      },
      statusCode: 400,
    };
  }

  const entry = findStoredEntry(requestId);
  if (!entry) {
    return {
      payload: {
        error: "request_not_found",
        issue: `request_id not found: ${requestId}`,
        ok: false,
      },
      statusCode: 404,
    };
  }

  const previousRequest = cloneJsonValue(entry.request);
  entry.request = {
    ...entry.request,
    status: body.resolution,
  };
  const resolution = {
    reason: readNonEmptyString(body.reason),
    resolution: body.resolution,
    resolved_by: readNonEmptyString(body.resolved_by),
  };
  const eventType =
    body.resolution === "approved" ? "AUTHORITY_APPROVED" : "AUTHORITY_DENIED";

  return {
    payload: {
      event: buildEventPayload(eventType, entry, {
        resolution: cloneJsonValue(resolution),
      }),
      ok: true,
      previous_request: previousRequest,
      request: cloneJsonValue(entry.request),
      resolution,
    },
    statusCode: 200,
  };
}

function resetRequests() {
  const clearedCount = resetStore();

  return {
    payload: {
      cleared_count: clearedCount,
      ok: true,
      requests: [],
      reset: true,
      store: {
        contract: AUTHORITY_REQUEST_STORE_CONTRACT,
        persistence: "module_memory_only",
      },
    },
    statusCode: 200,
  };
}

async function handlePost(req, res) {
  const parsed = await parseJsonBody(req);

  if (!parsed.ok) {
    return sendJson(res, 400, {
      error: "malformed_or_missing_body",
      issue: parsed.issue,
      ok: false,
    });
  }

  const action = readNonEmptyString(parsed.body.action);
  let result;

  if (action === "create") {
    result = createRequest(parsed.body);
  } else if (action === "resolve") {
    result = resolveRequest(parsed.body);
  } else if (action === "reset") {
    result = resetRequests();
  } else {
    result = {
      payload: {
        error: "invalid_action",
        issue: "action must be create, resolve, or reset.",
        ok: false,
      },
      statusCode: 400,
    };
  }

  return sendJson(res, result.statusCode, result.payload);
}

export default async function handler(req, res) {
  const method = String(req?.method ?? "").toUpperCase();

  if (method === "OPTIONS") {
    return sendJson(res, 200, {
      allow: ALLOWED_METHODS,
      ok: true,
    });
  }

  if (method === "GET") {
    return sendJson(res, 200, buildStorePayload());
  }

  if (method === "POST") {
    return handlePost(req, res);
  }

  return sendJson(
    res,
    405,
    {
      allow: ALLOWED_METHODS,
      error: "method_not_allowed",
      ok: false,
    },
    { Allow: ALLOWED_METHODS }
  );
}
